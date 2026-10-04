/**
 * Adult review of a pack (QZS-18): the changes an adult can make before the
 * child plays. Pure functions on a copy of the pack; the pack format (Zod)
 * still has the last word when the adult approves it.
 */
import type { Game, Pack } from "../../../src/pack/schema.js";
import { type PackIssue, validatePack } from "../../../src/pack/validate.js";

/** The fewest questions each game needs (the pack format's own minimums). */
export const MIN_QUESTIONS: Record<Game["type"], number> = { classify: 4, order: 1, choice: 3, yesno: 4, boss: 5 };

export function questionCount(game: Game): number {
  switch (game.type) {
    case "classify":
      return game.items.length;
    case "order":
      return game.rounds.length;
    default:
      return game.questions.length;
  }
}

/** A question as the adult reads it: what the child sees and which answers are right. */
export interface QuestionView {
  /** The question, the statement or the item to place. */
  text: string;
  /** Options, bins or steps; `right` marks the correct ones. */
  answers: { label: string; right: boolean }[];
  /** The answers are steps, already in the right order. */
  ordered: boolean;
  explanation: string;
}

const withEmoji = (emoji: string | undefined, label: string) => (emoji ? `${emoji} ${label}` : label);

/** One question of a game, ready to read at a glance (QZS-33). */
export function questionView(game: Game, q: number, yes: string, no: string): QuestionView {
  switch (game.type) {
    case "classify": {
      const item = game.items[q]!;
      return {
        text: withEmoji(item.emoji, item.label),
        answers: game.categories.map((c) => ({ label: withEmoji(c.emoji, c.label), right: c.id === item.category })),
        ordered: false,
        explanation: item.explanation,
      };
    }
    case "order": {
      const round = game.rounds[q]!;
      return { text: round.prompt, answers: round.items.map((i) => ({ label: withEmoji(i.emoji, i.label), right: true })), ordered: true, explanation: round.explanation };
    }
    case "yesno": {
      const question = game.questions[q]!;
      return {
        text: withEmoji(question.emoji, question.statement),
        answers: [
          { label: yes, right: question.answer },
          { label: no, right: !question.answer },
        ],
        ordered: false,
        explanation: question.explanation,
      };
    }
    case "choice":
    case "boss": {
      const question = game.questions[q]!;
      const right = [question.answer, ...(question.alsoAccepted ?? [])];
      return {
        text: withEmoji(question.emoji, question.prompt),
        answers: question.options.map((o) => ({ label: o, right: right.includes(o) })),
        ordered: false,
        explanation: question.explanation,
      };
    }
  }
}

/** Every question of the pack, to tell the adult how much there is to read. */
export function packQuestionCount(pack: Pack): number {
  return pack.games.reduce((n, game) => n + questionCount(game), 0);
}

export function canRemove(game: Game): boolean {
  return questionCount(game) > MIN_QUESTIONS[game.type];
}

/** A copy of the pack without one question (an item, a round or a question). */
export function removeQuestion(pack: Pack, gameIndex: number, question: number): Pack {
  const next = structuredClone(pack);
  const game = next.games[gameIndex]!;
  if (game.type === "classify") game.items.splice(question, 1);
  else if (game.type === "order") game.rounds.splice(question, 1);
  else game.questions.splice(question, 1);
  return next;
}

/** Renames an option, so the answer (stored as a value) follows the new text. */
export function renameOption<Q extends { options: string[]; answer: string; alsoAccepted?: string[] | undefined }>(question: Q, i: number, label: string): Q {
  const old = question.options[i]!;
  const rename = (value: string) => (value === old ? label : value);
  return {
    ...question,
    options: question.options.map((o, k) => (k === i ? label : o)),
    answer: rename(question.answer),
    ...(question.alsoAccepted ? { alsoAccepted: question.alsoAccepted.map(rename) } : {}),
  };
}

/** Moves an item of an order round one place up (-1) or down (+1). Items are stored in the right order. */
export function moveItem<T>(items: readonly T[], i: number, direction: -1 | 1): T[] {
  const j = i + direction;
  if (j < 0 || j >= items.length) return [...items];
  const next = [...items];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export type ReviewResult = { ok: true; pack: Pack } | { ok: false; issues: PackIssue[] };

/** Checks the reviewed pack and, if it is valid, marks it approved (or keeps it as a draft). */
export function finishReview(pack: Pack, approve: boolean, now: Date): ReviewResult {
  const review = approve ? { status: "approved" as const, approvedAt: now.toISOString() } : { status: "draft" as const };
  return validatePack({ ...pack, review });
}

/** Where an issue is, for people: the game and question numbers, counted from 1. */
export function issuePlace(path: string): { game: number; question: number | undefined } | undefined {
  const m = /^games\[(\d+)\](?:\.(?:questions|items|rounds)\[(\d+)\])?/.exec(path);
  if (!m) return undefined;
  return { game: Number(m[1]) + 1, question: m[2] === undefined ? undefined : Number(m[2]) + 1 };
}

/** The problems an edit can cause, so the screen can explain them in the pack's language. */
export type IssueKind =
  | { kind: "empty" }
  | { kind: "tooLong"; max: number }
  | { kind: "repeated" }
  | { kind: "mixYesNo" }
  | { kind: "emptyCategory" }
  | { kind: "unusedTopic" }
  | { kind: "bossTopics" }
  | { kind: "other" };

/** Reads the pack format's message (in English, for developers) as one of the kinds above. */
export function issueKind(message: string): IssueKind {
  const tooLong = /^At most (\d+) characters/.exec(message);
  if (tooLong) return { kind: "tooLong", max: Number(tooLong[1]) };
  if (message.startsWith("Cannot be empty")) return { kind: "empty" };
  if (/must be (different|unique)/.test(message)) return { kind: "repeated" };
  if (message.startsWith("Mix yes and no")) return { kind: "mixYesNo" };
  if (message.startsWith("No item belongs to category")) return { kind: "emptyCategory" };
  if (message.startsWith("No question uses topic")) return { kind: "unusedTopic" };
  if (message.startsWith("The boss must cover")) return { kind: "bossTopics" };
  return { kind: "other" };
}

/** A simple parental gate: a multiplication most 8-year-olds cannot do in their head. */
export function gateQuestion(random: () => number = Math.random): { a: number; b: number; answer: number } {
  const a = 12 + Math.floor(random() * 8); // 12-19
  const b = 6 + Math.floor(random() * 4); // 6-9
  return { a, b, answer: a * b };
}
