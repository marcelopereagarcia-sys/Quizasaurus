/**
 * Transcribes a photo or scanned page with a vision model (ADR-0002).
 *
 * Only Ollama is implemented here; QZS-13 adds the cloud providers behind the
 * same interface.
 */

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

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export const DEFAULT_OLLAMA_VISION_MODEL = "qwen2.5vl:7b";

export interface OllamaVisionOptions {
  host?: string | undefined;
  model?: string | undefined;
  /** Per page. The first page also loads the model, which can take ~40 s. */
  timeoutMs?: number;
}

export function ollamaVision(options: OllamaVisionOptions = {}): VisionTranscriber {
  const host = (options.host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const model = options.model || DEFAULT_OLLAMA_VISION_MODEL;
  const timeoutMs = options.timeoutMs ?? 180_000;

  return {
    name: `ollama/${model}`,
    async transcribe(image) {
      let res: Response;
      try {
        res = await fetch(`${host}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            stream: false,
            // A textbook page is ~300-800 tokens; the cap stops repetition loops early.
            options: { temperature: 0, num_predict: 2048 },
            messages: [{ role: "user", content: TRANSCRIBE_PROMPT, images: [Buffer.from(image).toString("base64")] }],
          }),
        });
      } catch (error) {
        throw new Error(
          `Cannot reach Ollama at ${host} (${(error as Error).message}). ` +
            "Is Ollama running? Set OLLAMA_HOST in .env if it runs elsewhere.",
        );
      }
      if (res.status === 404) {
        throw new Error(`The vision model "${model}" is not installed. Run: ollama pull ${model}`);
      }
      if (!res.ok) {
        throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);
      }
      const json = (await res.json()) as { message?: { content?: string } };
      return json.message?.content ?? "";
    },
  };
}
