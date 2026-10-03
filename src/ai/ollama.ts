import {
  type AIProvider,
  type CompletionRequest,
  DEFAULT_MAX_TOKENS,
  ProviderConfigError,
  elapsedSeconds,
  fetchWithRetry,
  toBase64,
} from "./provider.js";

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

export interface OllamaOptions {
  host?: string | undefined;
  model: string;
  /** Whole request. Local packs on a modest GPU can take many minutes. */
  timeoutMs?: number;
}

/** Ollama's default context (4096 tokens) cuts off a pack; size it to the request instead. */
const MIN_CONTEXT = 8_192;
const MAX_CONTEXT = 65_536;
/** Rough cost of one image in a vision model's context. */
const TOKENS_PER_IMAGE = 1_500;

export function contextSize(request: CompletionRequest): number {
  const promptTokens = Math.ceil(((request.system?.length ?? 0) + request.prompt.length) / 3);
  const needed = promptTokens + (request.images?.length ?? 0) * TOKENS_PER_IMAGE + (request.maxTokens ?? DEFAULT_MAX_TOKENS);
  return Math.min(MAX_CONTEXT, Math.max(MIN_CONTEXT, Math.ceil(needed / 2_048) * 2_048));
}

interface OllamaChunk {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

export function ollamaProvider(options: OllamaOptions): AIProvider {
  const host = (options.host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const { model } = options;
  const timeoutMs = options.timeoutMs ?? 30 * 60_000;

  return {
    id: "ollama",
    model,
    local: true,
    async complete(request: CompletionRequest) {
      const started = performance.now();
      const messages = [
        ...(request.system ? [{ role: "system", content: request.system }] : []),
        { role: "user", content: request.prompt, images: request.images?.map(toBase64) },
      ];
      let res: Response;
      try {
        res = await fetchWithRetry(`${host}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            // Streaming: long local generations would otherwise hit fetch's 5-minute header timeout.
            stream: true,
            messages,
            ...(request.json ? { format: "json" } : {}),
            options: {
              num_ctx: contextSize(request),
              num_predict: request.maxTokens ?? DEFAULT_MAX_TOKENS,
              ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            },
          }),
        });
      } catch (error) {
        const err = error as Error & { cause?: { code?: string } };
        if (err.name === "TimeoutError") {
          throw new Error(`Ollama (${model}) did not finish within ${Math.round(timeoutMs / 60_000)} min. Try a smaller model.`);
        }
        if (err.cause?.code === "ECONNREFUSED") {
          throw new ProviderConfigError(
            `Cannot reach Ollama at ${host}. Is Ollama running? Set OLLAMA_HOST in .env if it runs elsewhere.`,
          );
        }
        throw new Error(`Ollama request failed (${err.cause?.code ?? err.message}).`);
      }
      if (res.status === 404) {
        throw new ProviderConfigError(`The Ollama model "${model}" is not installed. Run: ollama pull ${model}`, "model");
      }
      if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);

      // Newline-delimited JSON: one chunk per line, the last one with the token counts.
      let text = "";
      let last: OllamaChunk = {};
      let buffer = "";
      const decoder = new TextDecoder();
      const handle = (line: string) => {
        if (!line.trim()) return;
        const chunk = JSON.parse(line) as OllamaChunk;
        if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
        text += chunk.message?.content ?? "";
        last = chunk;
      };
      for await (const part of res.body) {
        buffer += decoder.decode(part, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handle);
      }
      handle(buffer + decoder.decode());

      return {
        text,
        usage:
          last.prompt_eval_count !== undefined && last.eval_count !== undefined
            ? { inputTokens: last.prompt_eval_count, outputTokens: last.eval_count }
            : undefined,
        seconds: elapsedSeconds(started),
      };
    },
  };
}

/** Installed models, to suggest one when OLLAMA_MODEL is missing. Empty if Ollama is not reachable. */
export async function installedOllamaModels(host?: string): Promise<string[]> {
  try {
    const res = await fetch(`${(host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    const json = (await res.json()) as { models?: { name: string }[] };
    return json.models?.map((m) => m.name) ?? [];
  } catch {
    return [];
  }
}
