import {
  type AIProvider,
  type CompletionRequest,
  DEFAULT_MAX_TOKENS,
  ProviderConfigError,
  elapsedSeconds,
  fetchWithRetry,
  imageMediaType,
  toBase64,
} from "./provider.js";

export const OPENAI_BASE_URL = "https://api.openai.com/v1";

export interface OpenAIOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** OpenAI Chat Completions over HTTP. */
export function openaiProvider(options: OpenAIOptions): AIProvider {
  const { apiKey, model } = options;
  const baseUrl = (options.baseUrl ?? OPENAI_BASE_URL).replace(/\/+$/, "");

  return {
    id: "openai",
    model,
    local: false,
    async complete(request: CompletionRequest) {
      const started = performance.now();
      const userContent = [
        { type: "text", text: request.prompt },
        ...(request.images ?? []).map((image) => ({
          type: "image_url",
          image_url: { url: `data:${imageMediaType(image)};base64,${toBase64(image)}` },
        })),
      ];
      const res = await fetchWithRetry(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            ...(request.system ? [{ role: "system", content: request.system }] : []),
            { role: "user", content: userContent },
          ],
          max_completion_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(request.json ? { response_format: { type: "json_object" } } : {}),
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        }),
      });
      if (res.status === 401) throw new ProviderConfigError("OPENAI_API_KEY was rejected (401). Check the key in .env.");
      if (res.status === 404) throw new ProviderConfigError(`OPENAI_MODEL="${model}" was not found. Check the model name in .env.`);
      if (!res.ok) throw new Error(`OpenAI answered ${res.status}: ${await res.text()}`);

      const json = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        text: json.choices?.[0]?.message?.content ?? "",
        usage: json.usage ? { inputTokens: json.usage.prompt_tokens, outputTokens: json.usage.completion_tokens } : undefined,
        seconds: elapsedSeconds(started),
      };
    },
  };
}
