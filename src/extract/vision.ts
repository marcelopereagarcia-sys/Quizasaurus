/**
 * Transcribes a photo or scanned page with a vision model (ADR-0002), through
 * any configured provider. Local Ollama is the default for privacy.
 */
import type { AIProvider } from "../ai/provider.js";

export interface VisionTranscriber {
  /** Shown in logs and reports, e.g. "ollama/qwen2.5vl:7b". */
  readonly name: string;
  transcribe(image: Uint8Array): Promise<string>;
}

/** Prompt measured in ADR-0002: ~100 % of the printed words on clean pages. */
export const TRANSCRIBE_PROMPT = `This is a photo of a page from a primary school textbook or worksheet.
Transcribe ONLY the printed text, exactly as written, in its original language. Keep the reading order.
Ignore handwriting, pencil marks, ticks, red-ink corrections and drawings. Do not translate, explain or add anything.
Output plain text only.`;

/** A textbook page is ~300-800 tokens; the cap stops repetition loops early. */
const MAX_PAGE_TOKENS = 2048;

export function visionFromProvider(provider: AIProvider): VisionTranscriber {
  return {
    name: `${provider.id}/${provider.model}`,
    async transcribe(image) {
      const result = await provider.complete({
        prompt: TRANSCRIBE_PROMPT,
        images: [image],
        maxTokens: MAX_PAGE_TOKENS,
        temperature: 0,
      });
      return result.text;
    },
  };
}
