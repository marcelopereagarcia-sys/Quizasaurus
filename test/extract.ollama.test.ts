/**
 * Runs against a real local Ollama with the vision model (ADR-0002).
 * Not part of `npm test`; run it with `npm run test:ollama`.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_OLLAMA_VISION_MODEL } from "../src/ai/config.js";
import { ollamaProvider } from "../src/ai/ollama.js";
import { extractPdf } from "../src/extract/extract.js";
import { visionFromProvider } from "../src/extract/vision.js";
import { exampleLines, pageImage, scannedPdf, wordRecall } from "./fixtures.js";

const host = process.env.OLLAMA_HOST;

describe("vision model on a scanned page in Spanish", () => {
  it("transcribes ≥ 95 % of the words", { timeout: 300_000 }, async () => {
    const lines = exampleLines.slice(0, 9);
    const pdf = await scannedPdf(pageImage(lines));
    const vision = visionFromProvider(ollamaProvider({ host, model: DEFAULT_OLLAMA_VISION_MODEL }));
    const [page] = await extractPdf(pdf, { vision });

    const recall = wordRecall(lines.join("\n"), page?.text ?? "");
    console.log(`recall ${(recall * 100).toFixed(1)} % in ${page?.seconds} s\n${page?.text}`);
    expect(page?.method).toBe("vision");
    expect(recall).toBeGreaterThanOrEqual(0.95);
  });

  it("explains how to install a missing model", async () => {
    const provider = ollamaProvider({ host, model: "quizasaurus-missing-model:1b" });
    await expect(provider.complete({ prompt: "hi" })).rejects.toThrow(/ollama pull quizasaurus-missing-model:1b/);
  });
});
