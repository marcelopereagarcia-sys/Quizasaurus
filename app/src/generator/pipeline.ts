/**
 * The web generator (QZS-21): the F0 code, run in the browser (ADR-0003).
 * Unit files → text (text layer, or the vision model for scans and photos)
 * → pack (AI, validated, retried) → a draft that goes to the adult review.
 *
 * Each family uses its own key, kept only on its device and sent only to the
 * provider it chose. Nothing here has a server.
 */
import { anthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "../../../src/ai/anthropic.js";
import { geminiProvider } from "../../../src/ai/gemini.js";
import { DEFAULT_OLLAMA_HOST, ollamaProvider } from "../../../src/ai/ollama.js";
import { openaiProvider } from "../../../src/ai/openai.js";
import { type AIProvider, type ProviderId, ProviderConfigError, setRetryListener, setRetryPolicy } from "../../../src/ai/provider.js";
import { cleanPageText } from "../../../src/extract/clean.js";
import { extractUnit, type InputFile } from "../../../src/extract/extract.js";
import { visionFromProvider } from "../../../src/extract/vision.js";
import { GenerationError, generatePack, MAX_RETRIES } from "../../../src/generate/generate.js";
import type { Pack } from "../../../src/pack/schema.js";
import { safeStorage } from "../storage.js";

/** Gemini first: it passed gate O1 (98.9 %) and has a free tier. */
export const WEB_PROVIDERS = ["gemini", "anthropic", "openai", "ollama"] as const satisfies readonly ProviderId[];
export type WebProvider = (typeof WEB_PROVIDERS)[number];

/** Suggested models; OpenAI and Ollama have no safe default, the family types one. */
export const DEFAULT_MODELS: Record<WebProvider, string> = {
  gemini: "gemini-3.5-flash",
  anthropic: DEFAULT_ANTHROPIC_MODEL,
  openai: "",
  ollama: "",
};

export interface AiSettings {
  provider: WebProvider;
  models: Record<WebProvider, string>;
  /** Keys per provider, only on this device. Ollama needs none. */
  keys: Partial<Record<WebProvider, string>>;
  ollamaHost: string;
}

const AI_KEY = "quizasaurus.ai.v1";

export function defaultAiSettings(): AiSettings {
  return { provider: "gemini", models: { ...DEFAULT_MODELS }, keys: {}, ollamaHost: DEFAULT_OLLAMA_HOST };
}

export function loadAiSettings(): AiSettings {
  const settings = defaultAiSettings();
  try {
    const stored = JSON.parse(safeStorage.get(AI_KEY) ?? "null") as Partial<AiSettings> | null;
    if (stored && typeof stored === "object") {
      if ((WEB_PROVIDERS as readonly unknown[]).includes(stored.provider)) settings.provider = stored.provider!;
      for (const p of WEB_PROVIDERS) {
        const model = stored.models?.[p];
        if (typeof model === "string") settings.models[p] = model;
        const key = stored.keys?.[p];
        if (typeof key === "string" && key) settings.keys[p] = key;
      }
      if (typeof stored.ollamaHost === "string" && stored.ollamaHost) settings.ollamaHost = stored.ollamaHost;
    }
  } catch {
    // Unreadable: defaults.
  }
  return settings;
}

export function saveAiSettings(settings: AiSettings): boolean {
  return safeStorage.set(AI_KEY, JSON.stringify(settings));
}

/** Removes the key of one provider from this device. */
export function forgetKey(settings: AiSettings, provider: WebProvider): AiSettings {
  const keys = { ...settings.keys };
  delete keys[provider];
  return { ...settings, keys };
}

/** Keys never hold spaces: the ones (and line breaks) that sneak in when copying are dropped. */
export function cleanKey(key: string): string {
  return key.replace(/\s+/g, "");
}

/**
 * The shape of each provider's keys. Gemini's new authorization keys start with
 * "AQ." (the default in Google AI Studio since 28 May 2026) and the older ones
 * with "AIza".
 */
const KEY_SHAPES: Record<Exclude<WebProvider, "ollama">, RegExp> = {
  gemini: /^(AQ\.|AIza)[\w.-]{20,}$/,
  anthropic: /^sk-ant-[\w-]{20,}$/,
  openai: /^sk-[\w-]{20,}$/,
};

/** Whether a key looks like one of the provider's: only a hint, a key that does not may still work. */
export function keyLooksRight(provider: Exclude<WebProvider, "ollama">, key: string): boolean {
  return KEY_SHAPES[provider].test(cleanKey(key));
}

/** Problems the screen explains in the family's language (QZS-21: understandable errors). */
export type GenerationProblem =
  | "noFiles"
  | "noKey"
  | "noModel"
  | "badKey"
  | "badModel"
  | "unreadable"
  | "tooLittleText"
  | "unreachable"
  | "busy"
  | "quota"
  | "invalidPack"
  | "other";

export class WebGenerationError extends Error {
  override name = "WebGenerationError";
  constructor(
    readonly problem: GenerationProblem,
    detail?: string,
  ) {
    super(detail ?? problem);
  }
}

/** The provider the family chose, built in the browser. */
export function buildProvider(settings: AiSettings): AIProvider {
  const id = settings.provider;
  const model = settings.models[id]?.trim();
  if (!model) throw new WebGenerationError("noModel");
  if (id === "ollama") return ollamaProvider({ host: settings.ollamaHost, model });
  const apiKey = settings.keys[id]?.trim();
  if (!apiKey) throw new WebGenerationError("noKey");
  if (id === "gemini") return geminiProvider({ apiKey, model });
  if (id === "anthropic") return anthropicProvider({ apiKey, model });
  return openaiProvider({ apiKey, model });
}

/** Any error from reading or generating, as one of the problems above. */
export function classifyError(error: unknown): GenerationProblem {
  if (error instanceof WebGenerationError) return error.problem;
  if (error instanceof ProviderConfigError) return error.problem === "key" ? "badKey" : error.problem === "model" ? "badModel" : "unreachable";
  if (error instanceof GenerationError) return "invalidPack";
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  // The browser says only "Failed to fetch" when a server cannot be reached (offline, Ollama off, CORS).
  if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED/i.test(message)) return "unreachable";
  // 429: the key's free quota is used up (wait longer); 5xx: the provider is overloaded right now.
  if (/\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) return "quota";
  if (/\b(500|502|503|504)\b|overloaded|UNAVAILABLE|high demand/i.test(message)) return "busy";
  if (/InvalidPDF|Invalid PDF|PDF header|FormatError|password/i.test(message)) return "unreadable";
  return "other";
}

export type StepName = "read" | "generate" | "validate";

export interface Progress {
  step: StepName;
  /** Pages read so far and in total, while reading. */
  page?: { done: number; total: number };
  /** Attempt number, while generating (1 + up to MAX_RETRIES). */
  attempt?: { n: number; max: number };
  /** The AI is busy: the next try is in this many seconds. */
  waitSeconds?: number;
}

/**
 * A family waits more patiently than the terminal: up to 5 tries over ~90 s
 * (2, 6, 18, 30, 30 s), because free tiers are often briefly overloaded.
 */
export const WEB_RETRY = { retries: 5, baseDelayMs: 2_000, maxDelayMs: 30_000 };

export interface GenerationRequest {
  files: InputFile[];
  /** Text of the unit pasted by the family (QZS-28): enough on its own, or added after the files. */
  text?: string | undefined;
  /** ISO 639-1; detected from the text when undefined. */
  language: "ca" | "es" | "en" | undefined;
  /** Age of the children, in years (QZS-37). */
  age: number;
  provider: AIProvider;
  onProgress: (progress: Progress) => void;
}

/** A unit needs at least this many letters to make a pack from it. */
const MIN_UNIT_LETTERS = 300;

/** Whether the pasted text has anything to read (the screen enables "Create" with it). */
export function hasText(text: string | undefined): boolean {
  return /\p{L}/u.test(text ?? "");
}

/** Reads the unit (files and/or pasted text), generates the pack and returns it as a draft for the adult review. */
export async function generateFromFiles(request: GenerationRequest): Promise<Pack> {
  const { files, provider, onProgress } = request;
  const pasted = hasText(request.text) ? cleanPageText(request.text!) : "";
  if (files.length === 0 && !pasted) throw new WebGenerationError("noFiles");

  onProgress({ step: "read" });
  const parts: string[] = [];
  if (files.length > 0) {
    try {
      const pages = await extractUnit(files, {
        vision: visionFromProvider(provider),
        onPage: (page, total) => onProgress({ step: "read", page: { done: page.page, total } }),
      });
      parts.push(...pages.map((p) => p.text));
    } catch (error) {
      // A broken or locked PDF fails inside pdf.js; anything else keeps its own kind.
      const problem = classifyError(error);
      throw problem === "other" ? new WebGenerationError("unreadable", (error as Error).message) : error;
    }
  }
  // Pasted text goes through the same cleaning as a page: "Nom: …" fields are dropped.
  if (pasted) parts.push(pasted);
  const text = parts.join("\n\n");
  if ((text.match(/\p{L}/gu) ?? []).length < MIN_UNIT_LETTERS) throw new WebGenerationError("tooLittleText");

  let attempt = { n: 1, max: MAX_RETRIES + 1 };
  onProgress({ step: "generate", attempt });
  setRetryPolicy(WEB_RETRY);
  setRetryListener(({ delayMs }) => onProgress({ step: "generate", attempt, waitSeconds: Math.round(delayMs / 1000) }));
  try {
    const result = await generatePack(text, {
      provider,
      language: request.language,
      age: request.age,
      onAttempt: (n, issues) => {
        attempt = { n: n + 1, max: MAX_RETRIES + 1 };
        onProgress(issues.length === 0 ? { step: "validate" } : { step: "generate", attempt });
      },
    });
    onProgress({ step: "validate" });
    return result.pack;
  } finally {
    setRetryListener(undefined);
  }
}

/** Photos from a phone or tablet are large: at most this many pixels on the long side is plenty to read. */
export const MAX_PHOTO_SIDE = 2000;

/** Size of a photo once scaled down (pure, so it can be tested). */
export function scaledSize(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A chosen file, ready to read: PDFs as they are, photos scaled down to a JPEG. */
export async function prepareFile(file: File): Promise<InputFile> {
  const data = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return { name: file.name, data };
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height);
  if (width === bitmap.width && /\.(jpe?g|png|webp)$/i.test(file.name)) return { name: file.name, data };
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  return { name: file.name.replace(/\.[^.]*$/, "") + ".jpg", data: new Uint8Array(await blob.arrayBuffer()) };
}
