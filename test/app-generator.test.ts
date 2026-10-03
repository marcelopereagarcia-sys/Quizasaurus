import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Progress,
  WebGenerationError,
  buildProvider,
  classifyError,
  defaultAiSettings,
  forgetKey,
  generateFromFiles,
  loadAiSettings,
  saveAiSettings,
  scaledSize,
} from "../app/src/generator/pipeline.js";
import { type AIProvider, ProviderConfigError, toBase64 } from "../src/ai/provider.js";
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
function fakeProvider(answers: string[]): AIProvider & { calls: number } {
  const provider = {
    id: "gemini" as const,
    model: "fake",
    local: false,
    calls: 0,
    async complete() {
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

describe("errors a family can understand", () => {
  it("classifies what goes wrong", () => {
    expect(classifyError(new ProviderConfigError("rejected", "key"))).toBe("badKey");
    expect(classifyError(new ProviderConfigError("not found", "model"))).toBe("badModel");
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("unreachable");
    expect(classifyError(new Error("Gemini answered 429: quota"))).toBe("busy");
    expect(classifyError(new GenerationError([], 3))).toBe("invalidPack");
    expect(classifyError(new Error("Invalid PDF structure"))).toBe("unreadable");
    expect(classifyError(new Error("something else"))).toBe("other");
  });
});

describe("generating from the files", () => {
  it("reads a PDF, generates, validates and returns a draft for the adult review", async () => {
    const pdf = await textPdf([exampleLines]);
    const { review, generator, schemaVersion, language, grade, ...answer } = examplePack;
    const provider = fakeProvider([JSON.stringify(answer)]);
    const steps: Progress[] = [];
    const pack = await generateFromFiles({
      files: [{ name: "unidad.pdf", data: pdf }],
      language: "es",
      grade: { stage: "primary", year: 3 },
      provider,
      onProgress: (p) => steps.push(p),
    });
    expect(pack.review.status).toBe("draft");
    expect(pack.generator?.provider).toBe("gemini");
    expect(steps.map((s) => s.step)).toEqual(["read", "read", "generate", "validate", "validate"]);
  });

  it("retries an invalid answer and says which attempt it is on", async () => {
    const pdf = await textPdf([exampleLines]);
    const { review, generator, schemaVersion, language, grade, ...answer } = examplePack;
    const provider = fakeProvider(["not json", JSON.stringify(answer)]);
    const attempts: number[] = [];
    await generateFromFiles({
      files: [{ name: "unidad.pdf", data: pdf }],
      language: "es",
      grade: { stage: "primary", year: 3 },
      provider,
      onProgress: (p) => p.attempt && attempts.push(p.attempt.n),
    });
    expect(provider.calls).toBe(2);
    expect(attempts).toEqual([1, 2]);
  });

  it("explains an unreadable PDF, a unit with too little text, and no files", async () => {
    const provider = fakeProvider(["{}"]);
    const run = (files: { name: string; data: Uint8Array }[]) =>
      generateFromFiles({ files, language: "es", grade: { stage: "primary", year: 3 }, provider, onProgress: () => undefined }).catch(classifyError);
    expect(await run([{ name: "roto.pdf", data: new TextEncoder().encode("this is not a pdf") }])).toBe("unreadable");
    expect(await run([{ name: "corto.pdf", data: await textPdf([["Solo una línea de texto."]]) }])).toBe("tooLittleText");
    expect(await run([])).toBe("noFiles");
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
