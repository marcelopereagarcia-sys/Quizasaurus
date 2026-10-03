import Anthropic from "@anthropic-ai/sdk";
import {
  type AIProvider,
  type CompletionRequest,
  DEFAULT_MAX_TOKENS,
  ProviderConfigError,
  elapsedSeconds,
  imageMediaType,
  toBase64,
} from "./provider.js";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

/** Models that take `effort` and server-side refusal fallbacks (and reject `temperature`). */
const CURRENT_GENERATION = /^claude-(opus|sonnet|fable)-5/;

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  /** For tests: anything with the SDK's `beta.messages.create`. */
  client?: Pick<Anthropic, "beta">;
}

export function anthropicProvider(options: AnthropicOptions): AIProvider {
  const { model } = options;
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });
  const current = CURRENT_GENERATION.test(model);

  return {
    id: "anthropic",
    model,
    local: false,
    async complete(request: CompletionRequest) {
      const started = performance.now();
      const content: Anthropic.Beta.BetaContentBlockParam[] = [
        ...(request.images ?? []).map(
          (image): Anthropic.Beta.BetaImageBlockParam => ({
            type: "image",
            source: { type: "base64", media_type: imageMediaType(image), data: toBase64(image) },
          }),
        ),
        { type: "text", text: request.prompt },
      ];
      const system = [request.system, request.json ? "Answer with a single JSON object and nothing else." : undefined]
        .filter(Boolean)
        .join("\n\n");

      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await client.beta.messages.create({
          model,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(system ? { system } : {}),
          messages: [{ role: "user", content }],
          ...(current
            ? {
                // Explicit: Claude Opus 5.5 defaults to "medium".
                output_config: { effort: "medium" },
                // On a policy decline, the API retries on a fallback model in the same call.
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default",
              }
            : request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
        });
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          throw new ProviderConfigError("ANTHROPIC_API_KEY was rejected (401). Check the key in .env.");
        }
        if (error instanceof Anthropic.NotFoundError) {
          throw new ProviderConfigError(`ANTHROPIC_MODEL="${model}" does not exist. Use e.g. ${DEFAULT_ANTHROPIC_MODEL}.`);
        }
        throw error;
      }

      if (response.stop_reason === "refusal") {
        throw new Error(`Claude declined the request (${response.stop_details?.category ?? "no category"}).`);
      }
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("");
      return {
        text,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        seconds: elapsedSeconds(started),
      };
    },
  };
}
