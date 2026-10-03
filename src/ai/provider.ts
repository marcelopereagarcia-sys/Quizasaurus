/**
 * One interface for every AI provider (ADR-0001): the generator and the page
 * reader never know which one they are talking to.
 */

export const PROVIDER_IDS = ["ollama", "anthropic", "openai", "gemini"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface CompletionRequest {
  system?: string;
  prompt: string;
  /** PNG, JPEG or WebP bytes, for vision requests. */
  images?: Uint8Array[];
  /** Ask for a JSON object as the whole answer. */
  json?: boolean;
  maxTokens?: number;
  /** Ignored by models that do not accept it (current Claude models). */
  temperature?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  text: string;
  usage: TokenUsage | undefined;
  seconds: number;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly model: string;
  /** True when nothing leaves the computer (privacy risk R4). */
  readonly local: boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

/** A setting is missing or wrong; the message says what to put in .env. */
export class ProviderConfigError extends Error {
  override name = "ProviderConfigError";
}

export const DEFAULT_MAX_TOKENS = 16_000;

export function imageMediaType(image: Uint8Array): "image/png" | "image/jpeg" | "image/webp" {
  if (image[0] === 0x89 && image[1] === 0x50) return "image/png";
  if (image[0] === 0xff && image[1] === 0xd8) return "image/jpeg";
  if (image[8] === 0x57 && image[9] === 0x45 && image[10] === 0x42 && image[11] === 0x50) return "image/webp";
  throw new Error("Unsupported image format: use PNG, JPEG or WebP");
}

export const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

export const elapsedSeconds = (started: number) => Math.round(performance.now() - started) / 1000;
