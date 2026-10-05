import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Progress,
  WebGenerationError,
  buildProvider,
  classifyError,
  cleanKey,
  defaultAiSettings,
  forgetKey,
  generateFromFiles,
  hasText,
  keyLooksRight,
  loadAiSettings,
  saveAiSettings,
  scaledSize,
} from "../app/src/generator/pipeline.js";
import { type AIProvider, type CompletionRequest, ProviderConfigError, fetchWithRetry, setRetryListener, toBase64 } from "../src/ai/provider.js";
import { extensionOf } from "../src/extract/extract.js";
import { GenerationError } from "../src/generate/generate.js";
import { exampleLines, textPdf } from "./fixtures.js";

const examplePack = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8"));
const data = new Map<string, string>();

beforeEach(() => {
  data.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());

/** A provider that answers with the example pack, as a model would. */
function fakeProvider(answers: string[]): AIProvider & { calls: number; prompts: string[] } {
  const provider = {
    id: "gemini" as const,
    model: "fake",
    local: false,
    calls: 0,
    prompts: [] as string[],
    async complete(request: CompletionRequest) {
      provider.prompts.push(request.prompt);
      const text = answers[Math.min(provider.calls, answers.length - 1)]!;
      provider.calls++;
      return { text, usage: { inputTokens: 1, outputTokens: 1 }, seconds: 0 };
    },
  };
  return provider;
}

describe("the family's AI settings", () => {
  it("are kept on the device, with Gemini by default, and a key can be forgotten", () => {
    expect(loadAiSettings()).toEqual(defaultAiSettings());
    const settings = { ...defaultAiSettings(), keys: { gemini: "test-key-123" } };
    saveAiSettings(settings);
    expect(loadAiSettings().keys.gemini).toBe("test-key-123");
    saveAiSettings(forgetKey(loadAiSettings(), "gemini"));
    expect(loadAiSettings().keys.gemini).toBeUndefined();
    data.set("quizasaurus.ai.v1", "{broken");
    expect(loadAiSettings()).toEqual(defaultAiSettings());
  });

  it("asks for a key or a model before calling anything", () => {
    expect(() => buildProvider(defaultAiSettings())).toThrow(WebGenerationError);
    expect(classifyError(catchError(() => buildProvider(defaultAiSettings())))).toBe("noKey");
    const noModel = { ...defaultAiSettings(), provider: "openai" as const, keys: { openai: "k" } };
    expect(classifyError(catchError(() => buildProvider(noModel)))).toBe("noModel");
    expect(buildProvider({ ...defaultAiSettings(), keys: { gemini: "k" } }).id).toBe("gemini");
    expect(buildProvider({ ...defaultAiSettings(), provider: "ollama", models: { ...defaultAiSettings().models, ollama: "m" } }).local).toBe(true);
  });
});

describe("a pasted key (QZS-27)", () => {
  // Made-up keys with the right shape: never a real one in the tests.
  const newGemini = `AQ.${"Ab3_-.".repeat(8)}`;
  const oldGemini = `AIza${"x".repeat(35)}`;

  it("loses the spaces and line breaks that sneak in when copying", () => {
    expect(cleanKey(`  ${newGemini}
`)).toBe(newGemini);
    expect(cleanKey("AQ.abc def	ghi")).toBe("AQ.abcdefghi");
  });

  it("is recognised in Gemini's new and old shapes, and in the other providers'", () => {
    expect(keyLooksRight("gemini", newGemini)).toBe(true);
    expect(keyLooksRight("gemini", oldGemini)).toBe(true);
    expect(keyLooksRight("gemini", ` ${newGemini} `)).toBe(true);
    expect(keyLooksRight("anthropic", `sk-ant-${"a".repeat(30)}`)).toBe(true);
    expect(keyLooksRight("openai", `sk-proj-${"a".repeat(30)}`)).toBe(true);
  });

  it("is flagged when it is cut short, from another provider or not a key at all", () => {
    expect(keyLooksRight("gemini", "AQ.abc")).toBe(false);
    expect(keyLooksRight("gemini", `sk-ant-${"a".repeat(30)}`)).toBe(false);
    expect(keyLooksRight("gemini", "https://aistudio.google.com/apikey")).toBe(false);
    expect(keyLooksRight("anthropic", oldGemini)).toBe(false);
  });
});

describe("errors a family can understand", () => {
  it("classifies what goes wrong", () => {
    expect(classifyError(new ProviderConfigError("rejected", "key"))).toBe("badKey");
    expect(classifyError(new ProviderConfigError("not found", "model"))).toBe("badModel");
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("unreachable");
    expect(classifyError(new Error("Gemini answered 429: quota"))).toBe("quota");
    expect(classifyError(new Error('Gemini answered 503: {"status": "UNAVAILABLE", "message": "high demand"}'))).toBe("busy");
    expect(classifyError(new GenerationError([], 3))).toBe("invalidPack");
    expect(classifyError(new Error("Invalid PDF structure"))).toBe("unreadable");
    expect(classifyError(new Error("something else"))).toBe("other");
  });
});

describe("generating from the files", () => {
  it("reads a PDF, generates, validates and returns a draft for the adult review", async () => {
    const pdf = await textPdf([exampleLines]);
    const { review, generator, schemaVersion, language, age, ...answer } = examplePack;
    const provider = fakeProvider([JSON.stringify(answer)]);
    const steps: Progress[] = [];
    const pack = await generateFromFiles({
      files: [{ name: "unidad.pdf", data: pdf }],
      language: "es",
      age: 8,
      provider,
      onProgress: (p) => steps.push(p),
    });
    expect(pack.review.status).toBe("draft");
    expect(pack.generator?.provider).toBe("gemini");
    expect(steps.map((s) => s.step)).toEqual(["read", "read", "generate", "validate", "validate"]);
  });

  it("retries an invalid answer and says which attempt it is on", async () => {
    const pdf = await textPdf([exampleLines]);
    const { review, generator, schemaVersion, language, age, ...answer } = examplePack;
    const provider = fakeProvider(["not json", JSON.stringify(answer)]);
    const attempts: number[] = [];
    await generateFromFiles({
      files: [{ name: "unidad.pdf", data: pdf }],
      language: "es",
      age: 8,
      provider,
      onProgress: (p) => p.attempt && attempts.push(p.attempt.n),
    });
    expect(provider.calls).toBe(2);
    expect(attempts).toEqual([1, 2]);
  });

  it("explains an unreadable PDF, a unit with too little text, and no files", async () => {
    const provider = fakeProvider(["{}"]);
    const run = (files: { name: string; data: Uint8Array }[]) =>
      generateFromFiles({ files, language: "es", age: 8, provider, onProgress: () => undefined }).catch(classifyError);
    expect(await run([{ name: "roto.pdf", data: new TextEncoder().encode("this is not a pdf") }])).toBe("unreadable");
    expect(await run([{ name: "corto.pdf", data: await textPdf([["Solo una línea de texto."]]) }])).toBe("tooLittleText");
    expect(await run([])).toBe("noFiles");
  });
});

describe("generating from pasted text (QZS-28)", () => {
  const { review, generator, schemaVersion, language, age, ...answer } = examplePack;
  const run = (request: { files?: { name: string; data: Uint8Array }[]; text?: string }, provider = fakeProvider([JSON.stringify(answer)])) =>
    generateFromFiles({ files: request.files ?? [], text: request.text, language: "es", age: 8, provider, onProgress: () => undefined });

  it("needs no file: the pasted text is enough, and the pack still goes to the adult review", async () => {
    const pack = await run({ text: exampleLines.join("\n") });
    expect(pack.review.status).toBe("draft");
  });

  it("sends the cleaned text to the AI, after the files when there are both", async () => {
    const provider = fakeProvider([JSON.stringify(answer)]);
    await run({ files: [{ name: "unidad.pdf", data: await textPdf([["Página del libro sobre las personas y sus etapas."]]) }], text: `Nombre: Ana López\n${exampleLines.join("\n")}` }, provider);
    const prompt = provider.prompts.join("\n");
    expect(prompt).toContain("Página del libro");
    expect(prompt).toContain(exampleLines[0]!);
    expect(prompt.indexOf("Página del libro")).toBeLessThan(prompt.indexOf(exampleLines[0]!));
    expect(prompt).not.toContain("Ana López");
  });

  it("gives the same warnings as a nearly empty PDF, or as no files at all", async () => {
    expect(await run({ text: "Solo una línea de texto." }).catch(classifyError)).toBe("tooLittleText");
    expect(await run({ text: "  \n 123 " }).catch(classifyError)).toBe("noFiles");
    expect(hasText("  \n 123 ")).toBe(false);
    expect(hasText("Les persones")).toBe(true);
  });
});

describe("a busy AI", () => {
  it("tells the screen how long it waits before each retry, never more than the cap", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => new Response("busy", { status: calls++ < 3 ? 503 : 200, headers: { "retry-after": "999" } }));
    const waits: number[] = [];
    setRetryListener(({ delayMs }) => waits.push(delayMs));
    try {
      const res = await fetchWithRetry("https://x", {}, { retries: 5, baseDelayMs: 1, maxDelayMs: 5 });
      expect(res.status).toBe(200);
      expect(waits).toEqual([5, 5, 5]); // retry-after asked for 999 s; the cap wins
    } finally {
      setRetryListener(undefined);
    }
  });
});

describe("browser-safe helpers", () => {
  it("base64 without Buffer gives the same result", () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });

  it("file extensions without node:path", () => {
    expect(extensionOf("Unitat 1.PDF")).toBe(".pdf");
    expect(extensionOf("C:\\fotos.v2\\pagina")).toBe("");
    expect(extensionOf("foto.jpeg")).toBe(".jpeg");
  });

  it("photos are scaled down to 2000 px on the long side, never up", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledSize(1200, 1600)).toEqual({ width: 1200, height: 1600 });
  });
});

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}
