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

/** What a setup problem is about, so the web app can explain it in the family's language. */
export type ConfigProblem = "key" | "model" | "setup";

/** A setting is missing or wrong; the message says what to put in .env. */
export class ProviderConfigError extends Error {
  override name = "ProviderConfigError";
  constructor(
    message: string,
    readonly problem: ConfigProblem = "setup",
  ) {
    super(message);
  }
}

export const DEFAULT_MAX_TOKENS = 16_000;

export function imageMediaType(image: Uint8Array): "image/png" | "image/jpeg" | "image/webp" {
  if (image[0] === 0x89 && image[1] === 0x50) return "image/png";
  if (image[0] === 0xff && image[1] === 0xd8) return "image/jpeg";
  if (image[8] === 0x57 && image[9] === 0x45 && image[10] === 0x42 && image[11] === 0x50) return "image/webp";
  throw new Error("Unsupported image format: use PNG, JPEG or WebP");
}

/** Base64 that works in Node and in the browser (no Buffer). */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Busy or rate-limited: worth trying again (free tiers return these often). */
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * fetch that retries transient errors with a growing wait (2 s, 6 s, 18 s by default),
 * honouring `retry-after` when the server sends it.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { retries = 3, baseDelayMs = 2_000 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (!TRANSIENT_STATUS.has(res.status) || attempt >= retries) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : baseDelayMs * 3 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const elapsedSeconds = (started: number) => Math.round(performance.now() - started) / 1000;
