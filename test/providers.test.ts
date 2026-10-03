/**
 * Every provider is checked against a fake HTTP server (or a fake SDK client):
 * the request it sends, how it reads the answer, and its setup errors.
 * Real calls live in `providers.live.test.ts`.
 */
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anthropicProvider } from "../src/ai/anthropic.js";
import { DEFAULT_OLLAMA_VISION_MODEL, providerFromEnv } from "../src/ai/config.js";
import { geminiProvider } from "../src/ai/gemini.js";
import { ollamaProvider } from "../src/ai/ollama.js";
import { openaiProvider } from "../src/ai/openai.js";
import { type AIProvider, ProviderConfigError, imageMediaType } from "../src/ai/provider.js";
import { pageImage } from "./fixtures.js";

const PNG = pageImage(["a"]);
const KEY = "test-key-not-real";

/** Replaces fetch with one canned answer and records the request. */
function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init, body: JSON.parse(String(init.body)) });
      return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const request = { system: "Be brief.", prompt: "Hola", images: [PNG], json: true, maxTokens: 500 };

describe("common interface", () => {
  it("every provider returns text, token usage and time the same way", async () => {
    const cases: [AIProvider, unknown][] = [
      [ollamaProvider({ model: "m" }), { message: { content: "{}" }, prompt_eval_count: 10, eval_count: 2 }],
      [openaiProvider({ apiKey: KEY, model: "m" }), { choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 10, completion_tokens: 2 } }],
      [geminiProvider({ apiKey: KEY, model: "m" }), { candidates: [{ content: { parts: [{ text: "{}" }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 } }],
    ];
    for (const [provider, body] of cases) {
      fakeFetch(200, body);
      const result = await provider.complete(request);
      expect(result.text, provider.id).toBe("{}");
      expect(result.usage, provider.id).toEqual({ inputTokens: 10, outputTokens: 2 });
      expect(result.seconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("only Ollama is local", () => {
    expect(ollamaProvider({ model: "m" }).local).toBe(true);
    for (const p of [openaiProvider({ apiKey: KEY, model: "m" }), geminiProvider({ apiKey: KEY, model: "m" })]) expect(p.local).toBe(false);
  });

  it("detects image types", () => {
    expect(imageMediaType(PNG)).toBe("image/png");
    expect(imageMediaType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
    expect(() => imageMediaType(new Uint8Array([1, 2, 3]))).toThrow(/PNG, JPEG or WebP/);
  });
});

describe("Ollama", () => {
  it("sends system, prompt, images and JSON mode to /api/chat", async () => {
    const calls = fakeFetch(200, { message: { content: "{}" } });
    await ollamaProvider({ host: "http://box:11434/", model: "gpt-oss:20b" }).complete({ ...request, temperature: 0 });
    expect(calls[0]?.url).toBe("http://box:11434/api/chat");
    expect(calls[0]?.body).toMatchObject({
      model: "gpt-oss:20b",
      format: "json",
      options: { num_predict: 500, temperature: 0 },
      messages: [{ role: "system", content: "Be brief." }, { role: "user", content: "Hola", images: [expect.any(String)] }],
    });
  });

  it("explains a missing model and an unreachable server", async () => {
    fakeFetch(404, { error: "model not found" });
    await expect(ollamaProvider({ model: "x:1b" }).complete(request)).rejects.toThrow("Run: ollama pull x:1b");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(ollamaProvider({ model: "x" }).complete(request)).rejects.toThrow(/Is Ollama running\?/);
  });
});

describe("Claude (official SDK)", () => {
  function fakeClient(result: unknown) {
    const create = vi.fn(async (_params: unknown) => result);
    return { create, client: { beta: { messages: { create } } } as unknown as Pick<Anthropic, "beta"> };
  }
  const message = {
    content: [{ type: "text", text: "{}" }],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 2 },
  };

  it("sends the image as base64 with refusal fallbacks and explicit effort on current models", async () => {
    const { create, client } = fakeClient(message);
    const result = await anthropicProvider({ apiKey: KEY, model: "claude-opus-5-5", client }).complete({ ...request, temperature: 0 });
    expect(result).toMatchObject({ text: "{}", usage: { inputTokens: 10, outputTokens: 2 } });
    const params = create.mock.calls[0]?.[0] as any;
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 500,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/png" } }, { type: "text", text: "Hola" }] }],
    });
    expect(params.system).toContain("JSON");
    expect(params).not.toHaveProperty("temperature");
  });

  it("keeps temperature on older models that accept it", async () => {
    const { create, client } = fakeClient(message);
    await anthropicProvider({ apiKey: KEY, model: "claude-haiku-4-5", client }).complete({ prompt: "Hola", temperature: 0 });
    expect(create.mock.calls[0]?.[0]).toMatchObject({ temperature: 0 });
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("fallbacks");
  });

  it("reports a refusal", async () => {
    const { client } = fakeClient({ ...message, stop_reason: "refusal", stop_details: { category: "bio" } });
    await expect(anthropicProvider({ apiKey: KEY, model: "claude-opus-5-5", client }).complete(request)).rejects.toThrow(/declined.*bio/);
  });

  it("turns a rejected key into a setup message", async () => {
    const error = new Anthropic.AuthenticationError(401, { type: "error" }, "invalid x-api-key", new Headers());
    const client = { beta: { messages: { create: vi.fn().mockRejectedValue(error) } } } as unknown as Pick<Anthropic, "beta">;
    await expect(anthropicProvider({ apiKey: KEY, model: "claude-opus-5-5", client }).complete(request)).rejects.toThrow(
      "ANTHROPIC_API_KEY was rejected",
    );
  });
});

describe("OpenAI", () => {
  it("sends a data-URL image, JSON mode and the bearer key", async () => {
    const calls = fakeFetch(200, { choices: [{ message: { content: "{}" } }] });
    await openaiProvider({ apiKey: KEY, model: "some-model" }).complete(request);
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/chat/completions");
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    expect(calls[0]?.body).toMatchObject({
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
      messages: [{ role: "system" }, { role: "user", content: [{ type: "text" }, { type: "image_url", image_url: { url: expect.stringMatching(/^data:image\/png;base64,/) } }] }],
    });
  });

  it("explains a rejected key and an unknown model", async () => {
    fakeFetch(401, "{}");
    await expect(openaiProvider({ apiKey: KEY, model: "m" }).complete(request)).rejects.toThrow("OPENAI_API_KEY was rejected");
    fakeFetch(404, "{}");
    await expect(openaiProvider({ apiKey: KEY, model: "m" }).complete(request)).rejects.toThrow('OPENAI_MODEL="m" was not found');
  });
});

describe("Gemini", () => {
  it("sends inline image data, JSON mime type and the key header", async () => {
    const calls = fakeFetch(200, { candidates: [{ content: { parts: [{ text: "{" }, { text: "}" }] } }] });
    const result = await geminiProvider({ apiKey: KEY, model: "some-model" }).complete(request);
    expect(result.text).toBe("{}");
    expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/some-model:generateContent");
    expect((calls[0]?.init.headers as Record<string, string>)["x-goog-api-key"]).toBe(KEY);
    expect(calls[0]?.body).toMatchObject({
      systemInstruction: { parts: [{ text: "Be brief." }] },
      contents: [{ parts: [{ inlineData: { mimeType: "image/png" } }, { text: "Hola" }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 500 },
    });
  });

  it("explains an invalid key", async () => {
    fakeFetch(400, { error: { status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } });
    await expect(geminiProvider({ apiKey: KEY, model: "m" }).complete(request)).rejects.toThrow("GEMINI_API_KEY was rejected");
  });
});

describe("configuration from .env", () => {
  it("defaults to local Ollama, with the vision model of ADR-0002", async () => {
    const vision = await providerFromEnv({}, "vision");
    expect([vision.id, vision.model, vision.local]).toEqual(["ollama", DEFAULT_OLLAMA_VISION_MODEL, true]);
  });

  it("picks each provider and its model from the environment", async () => {
    const env = { AI_PROVIDER: "Anthropic", ANTHROPIC_API_KEY: KEY, VISION_PROVIDER: "gemini", GEMINI_API_KEY: KEY, GEMINI_MODEL: "g" };
    expect(await providerFromEnv(env, "text")).toMatchObject({ id: "anthropic", model: "claude-opus-5-5", local: false });
    expect(await providerFromEnv(env, "vision")).toMatchObject({ id: "gemini", model: "g" });
  });

  it.each([
    [{ AI_PROVIDER: "anthropic" }, "AI_PROVIDER=anthropic needs ANTHROPIC_API_KEY in .env"],
    [{ AI_PROVIDER: "openai", OPENAI_API_KEY: KEY }, "AI_PROVIDER=openai needs OPENAI_MODEL in .env"],
    [{ AI_PROVIDER: "gemini", GEMINI_MODEL: "g" }, "AI_PROVIDER=gemini needs GEMINI_API_KEY in .env"],
    [{ AI_PROVIDER: "mistral" }, 'AI_PROVIDER="mistral" is not supported. Use one of: ollama, anthropic, openai, gemini.'],
  ])("says what to configure: %j", async (env, message) => {
    const error = await providerFromEnv(env, "text").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderConfigError);
    expect((error as Error).message).toContain(message);
  });

  it("lists the Gemini models available for the key when GEMINI_MODEL is missing", async () => {
    const models = [
      { name: "models/gemini-a", supportedGenerationMethods: ["generateContent"] },
      { name: "models/embedding-b", supportedGenerationMethods: ["embedContent"] },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ models }))));
    await expect(providerFromEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: KEY }, "text")).rejects.toThrow(
      "Models available for your key: gemini-a.",
    );
  });

  it("lists the installed Ollama models when OLLAMA_MODEL is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "gpt-oss:20b" }, { name: "qwen2.5vl:7b" }] }))));
    await expect(providerFromEnv({}, "text")).rejects.toThrow("Installed models: gpt-oss:20b, qwen2.5vl:7b.");
  });
});
