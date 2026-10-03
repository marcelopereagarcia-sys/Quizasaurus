/**
 * Real calls to every provider that has its settings in .env.
 * Not part of `npm test` (it may cost money); run it with `npm run test:live`.
 * Providers without a key are skipped.
 */
import { describe, expect, it } from "vitest";
import { loadEnvFile, providerFromEnv } from "../src/ai/config.js";
import type { ProviderId } from "../src/ai/provider.js";
import { pageImage } from "./fixtures.js";

loadEnvFile();

const configured: Record<ProviderId, boolean> = {
  ollama: Boolean(process.env.OLLAMA_MODEL),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
  gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
};

describe.each(Object.keys(configured) as ProviderId[])("%s", (id) => {
  const env = { ...process.env, AI_PROVIDER: id, VISION_PROVIDER: id };

  it.skipIf(!configured[id])("answers a JSON request", { timeout: 300_000 }, async () => {
    const provider = await providerFromEnv(env, "text");
    const result = await provider.complete({ prompt: 'Answer with this JSON and nothing else: {"ok": true}', json: true, maxTokens: 300 });
    console.log(id, provider.model, result.seconds, "s", result.usage, result.text);
    expect(JSON.parse(result.text)).toEqual({ ok: true });
    expect(result.usage?.outputTokens).toBeGreaterThan(0);
  });

  it.skipIf(!configured[id] && id !== "ollama")("reads a word from an image", { timeout: 300_000 }, async () => {
    const provider = await providerFromEnv(env, "vision");
    const result = await provider.complete({
      prompt: "Which word is written in the image? Answer with the word only.",
      images: [pageImage(["DINOSAURE"])],
      maxTokens: 300,
    });
    console.log(id, provider.model, result.seconds, "s", result.text);
    expect(result.text.toUpperCase()).toContain("DINOSAURE");
  });
});
