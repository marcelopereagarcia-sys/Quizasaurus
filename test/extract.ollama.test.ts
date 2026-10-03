/**
 * Runs against a real local Ollama with the vision model (ADR-0002).
 * Not part of `npm test`; run it with `npm run test:ollama`.
 */
import { describe, expect, it } from "vitest";
import { extractPdf } from "../src/extract/extract.js";
import { ollamaVision } from "../src/extract/vision.js";
import { exampleLines, pageImage, scannedPdf, wordRecall } from "./fixtures.js";

describe("vision model on a scanned page in Spanish", () => {
  it("transcribes ≥ 95 % of the words", { timeout: 300_000 }, async () => {
    const lines = exampleLines.slice(0, 9);
    const pdf = await scannedPdf(pageImage(lines));
    const [page] = await extractPdf(pdf, { vision: ollamaVision({ host: process.env.OLLAMA_HOST }) });

    const recall = wordRecall(lines.join("\n"), page?.text ?? "");
    console.log(`recall ${(recall * 100).toFixed(1)} % in ${page?.seconds} s\n${page?.text}`);
    expect(page?.method).toBe("vision");
    expect(recall).toBeGreaterThanOrEqual(0.95);
  });

  it("explains how to install a missing model", async () => {
    const vision = ollamaVision({ model: "quizasaurus-missing-model:1b" });
    await expect(vision.transcribe(pageImage(["a"]))).rejects.toThrow(/ollama pull quizasaurus-missing-model:1b/);
  });
});
