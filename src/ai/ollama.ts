import {
  type AIProvider,
  type CompletionRequest,
  DEFAULT_MAX_TOKENS,
  ProviderConfigError,
  elapsedSeconds,
  toBase64,
} from "./provider.js";

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

export interface OllamaOptions {
  host?: string | undefined;
  model: string;
  /** Per request. The first request also loads the model, which can take ~40 s. */
  timeoutMs?: number;
}

export function ollamaProvider(options: OllamaOptions): AIProvider {
  const host = (options.host || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const { model } = options;
  const timeoutMs = options.timeoutMs ?? 300_000;

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
        res = await fetch(`${host}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            stream: false,
            messages,
            ...(request.json ? { format: "json" } : {}),
            options: {
              num_predict: request.maxTokens ?? DEFAULT_MAX_TOKENS,
              ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
            },
          }),
        });
      } catch (error) {
        throw new ProviderConfigError(
          `Cannot reach Ollama at ${host} (${(error as Error).message}). ` +
            "Is Ollama running? Set OLLAMA_HOST in .env if it runs elsewhere.",
        );
      }
      if (res.status === 404) {
        throw new ProviderConfigError(`The Ollama model "${model}" is not installed. Run: ollama pull ${model}`);
      }
      if (!res.ok) throw new Error(`Ollama answered ${res.status}: ${await res.text()}`);

      const json = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
      return {
        text: json.message?.content ?? "",
        usage:
          json.prompt_eval_count !== undefined && json.eval_count !== undefined
            ? { inputTokens: json.prompt_eval_count, outputTokens: json.eval_count }
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
