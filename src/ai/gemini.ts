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

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** Models this key can use with `generateContent`, to suggest one when GEMINI_MODEL is missing. */
export async function availableGeminiModels(apiKey: string, baseUrl = GEMINI_BASE_URL): Promise<string[]> {
  try {
    const res = await fetchWithRetry(`${baseUrl}/models?pageSize=1000`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (json.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  } catch {
    return [];
  }
}

/** Gemini `generateContent` over HTTP. */
export function geminiProvider(options: GeminiOptions): AIProvider {
  const { apiKey, model } = options;
  const baseUrl = (options.baseUrl ?? GEMINI_BASE_URL).replace(/\/+$/, "");

  return {
    id: "gemini",
    model,
    local: false,
    async complete(request: CompletionRequest) {
      const started = performance.now();
      const parts = [
        ...(request.images ?? []).map((image) => ({
          inlineData: { mimeType: imageMediaType(image), data: toBase64(image) },
        })),
        { text: request.prompt },
      ];
      const res = await fetchWithRetry(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
          contents: [{ role: "user", parts }],
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
            ...(request.json ? { responseMimeType: "application/json" } : {}),
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
          },
        }),
      });
      if (res.status === 401 || res.status === 403 || (res.status === 400 && (await res.clone().text()).includes("API_KEY_INVALID"))) {
        throw new ProviderConfigError("GEMINI_API_KEY was rejected. Check the key in .env.", "key");
      }
      if (res.status === 404) throw new ProviderConfigError(`GEMINI_MODEL="${model}" was not found. Check the model name in .env.`, "model");
      if (!res.ok) throw new Error(`Gemini answered ${res.status}: ${await res.text()}`);

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const usage = json.usageMetadata;
      return {
        text: json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "",
        usage:
          usage?.promptTokenCount !== undefined
            ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount ?? 0 }
            : undefined,
        seconds: elapsedSeconds(started),
      };
    },
  };
}
