/**
 * Generates a pack from the text of a unit, with any AI provider.
 *
 * The answer is accepted only if it validates against the pack schema and
 * every "source" sentence is really in the unit text. Otherwise the problems
 * are sent back to the AI, at most twice, before giving up.
 */
import type { AIProvider, TokenUsage } from "../ai/provider.js";
import { PACK_SCHEMA_VERSION, type Pack } from "../pack/schema.js";
import { type PackIssue, validatePack } from "../pack/validate.js";
import { retryPrompt, systemPrompt, unitPrompt } from "./prompt.js";

export const MAX_RETRIES = 2;

/** A pack of ~40 questions with their sources fits well within this. */
const MAX_OUTPUT_TOKENS = 16_000;

export interface GenerateOptions {
  provider: AIProvider;
  /** ISO 639-1 code; detected from the text when not given. */
  language?: string | undefined;
  grade: Pack["grade"];
  onAttempt?: (attempt: number, issues: PackIssue[]) => void;
}

export interface GenerationResult {
  pack: Pack;
  attempts: number;
  seconds: number;
  usage: TokenUsage;
}

export class GenerationError extends Error {
  override name = "GenerationError";
  constructor(
    readonly issues: PackIssue[],
    readonly attempts: number,
  ) {
    super(
      `The AI could not produce a valid pack after ${attempts} attempts. Last problems:\n` +
        issues
          .slice(0, 10)
          .map((i) => `  • ${i.path}: ${i.message}`)
          .join("\n") +
        (issues.length > 10 ? `\n  … and ${issues.length - 10} more` : ""),
    );
  }
}

export async function generatePack(unitText: string, options: GenerateOptions): Promise<GenerationResult> {
  const { provider, grade } = options;
  const text = stripPageMarkers(unitText);
  const language = options.language ?? detectLanguage(text);
  const system = systemPrompt({ language, grade });
  const started = performance.now();
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  let prompt = unitPrompt(text);
  let issues: PackIssue[] = [];
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const result = await provider.complete({ system, prompt, json: true, maxTokens: MAX_OUTPUT_TOKENS });
    usage.inputTokens += result.usage?.inputTokens ?? 0;
    usage.outputTokens += result.usage?.outputTokens ?? 0;

    const checked = checkAnswer(result.text, text, {
      language,
      grade,
      generator: { provider: provider.id, model: provider.model, createdAt: new Date().toISOString() },
    });
    options.onAttempt?.(attempt, checked.ok ? [] : checked.issues);
    if (checked.ok) {
      return { pack: checked.pack, attempts: attempt, seconds: Math.round(performance.now() - started) / 1000, usage };
    }
    issues = checked.issues;
    prompt = retryPrompt(text, result.text, issues.map((i) => `${i.path}: ${i.message}`));
  }
  throw new GenerationError(issues, MAX_RETRIES + 1);
}

type Fixed = Pick<Pack, "language" | "grade"> & { generator: NonNullable<Pack["generator"]> };

/** Parses the AI answer, fills in the fields the program owns and checks everything. */
export function checkAnswer(answer: string, unitText: string, fixed: Fixed): { ok: true; pack: Pack } | { ok: false; issues: PackIssue[] } {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(answer));
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: "(root)", message: `The answer is not valid JSON (${(error as Error).message}). It may have been cut off: keep the pack within the limits.` }],
    };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, issues: [{ path: "(root)", message: "The answer must be one JSON object" }] };
  }

  const candidate = {
    ...data,
    schemaVersion: PACK_SCHEMA_VERSION,
    language: fixed.language,
    grade: fixed.grade,
    review: { status: "draft" },
    generator: fixed.generator,
  };
  const validation = validatePack(candidate);
  if (!validation.ok) return validation;

  const issues = [...sourcesNotInText(validation.pack, unitText), ...answersGivenAway(validation.pack)];
  return issues.length > 0 ? { ok: false, issues } : validation;
}

/** A classify item that contains its category's name can be sorted without knowing anything. */
export function answersGivenAway(pack: Pack): PackIssue[] {
  const issues: PackIssue[] = [];
  pack.games.forEach((game, g) => {
    if (game.type !== "classify") return;
    game.items.forEach((item, i) => {
      const category = game.categories.find((c) => c.id === item.category);
      const words = normalize(category?.label ?? "").split(" ").filter((w) => w.length > 3);
      const label = ` ${normalize(item.label)} `;
      if (words.some((w) => label.includes(` ${w} `) || label.includes(` ${w.slice(0, -1)}`))) {
        issues.push({
          path: `games[${g}].items[${i}].label`,
          message: `"${item.label}" contains its category's name ("${category?.label}"), so it gives the answer away. Use a concrete thing from the unit instead.`,
        });
      }
    });
  });
  return issues;
}

/** Every `source` must be a sentence of the unit, ignoring case, spacing and punctuation. */
export function sourcesNotInText(pack: Pack, unitText: string): PackIssue[] {
  const haystack = ` ${normalize(unitText)} `;
  const issues: PackIssue[] = [];
  const check = (source: string, path: string) => {
    const needle = normalize(source.replace(/(\.\.\.|…)\s*$/u, ""));
    if (!needle || !haystack.includes(` ${needle} `)) {
      issues.push({ path, message: `This source is not copied exactly from the unit text: "${source}"` });
    }
  };
  pack.games.forEach((game, g) => {
    const base = `games[${g}]`;
    switch (game.type) {
      case "classify":
        game.items.forEach((item, i) => check(item.source, `${base}.items[${i}].source`));
        break;
      case "order":
        game.rounds.forEach((round, i) => check(round.source, `${base}.rounds[${i}].source`));
        break;
      default:
        game.questions.forEach((q, i) => check(q.source, `${base}.questions[${i}].source`));
    }
  });
  return issues;
}

/** Lowercase words separated by single spaces: OCR line breaks and punctuation do not matter. */
function normalize(text: string): string {
  return (text.normalize("NFC").toLowerCase().match(/[\p{L}\p{N}·]+/gu) ?? []).join(" ");
}

function stripCodeFence(answer: string): string {
  const fenced = answer.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/u);
  return fenced?.[1] ?? answer.trim();
}

/** Removes the "--- page N ---" lines written by `npm run extract`. */
export function stripPageMarkers(text: string): string {
  return text.replace(/^--- page \d+ ---$/gmu, "").replace(/\n{3,}/g, "\n\n").trim();
}

// Word edges by letter class: `\b` ignores accented letters such as "é".
const CATALAN = /(?<!\p{L})(?:els|les|amb|però|també|què|són|seva|aquest|aquesta|molt|perquè|mateix|fins)(?!\p{L})|(?<!\p{L})[ldn]'(?=\p{L})|l·l/giu;
const SPANISH = /(?<!\p{L})(?:los|las|con|pero|también|qué|son|su|este|esta|muy|porque|hasta|mismo)(?!\p{L})|ñ/giu;

/** "ca" or "es", by counting very common words. */
export function detectLanguage(text: string): "ca" | "es" {
  const ca = text.match(CATALAN)?.length ?? 0;
  const es = text.match(SPANISH)?.length ?? 0;
  return ca >= es ? "ca" : "es";
}
