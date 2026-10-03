/**
 * Turns any game of a pack into the steps the player shows, as the prototype
 * did: every template is one of three interactions, all by tapping or dragging.
 *
 * - "pick": tap one option (classify bins, multiple choice, boss).
 * - "order": tap the items in the right order.
 * - "swipe": yes or no, by swiping the card or tapping a button.
 */
import type { Game } from "../../../src/pack/schema.js";

export interface Choice {
  id: string;
  label: string;
  emoji?: string | undefined;
}

interface Traced {
  topic: string;
  source: string;
  explanation: string;
}

export type Step =
  | (Traced & {
      kind: "pick";
      /** "bins": fixed categories (classify); "list": shuffled options. */
      layout: "bins" | "list";
      prompt: string;
      card?: { text: string; emoji?: string | undefined } | undefined;
      options: Choice[];
      correct: string[];
    })
  | (Traced & { kind: "order"; prompt: string; items: Choice[]; shuffled: Choice[] })
  | (Traced & { kind: "swipe"; card: { text: string; emoji?: string | undefined }; answer: boolean });

export type Random = () => number;

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Shuffles the options so the right answer does not sit where it sat in the
 * previous question (a child would learn "always the first one").
 */
export function shuffleAvoiding(options: readonly string[], answer: string, previousIndex: number | undefined, random: Random = Math.random): string[] {
  let out = shuffle(options, random);
  for (let tries = 0; tries < 20 && options.length > 1 && out.indexOf(answer) === previousIndex; tries++) {
    out = shuffle(options, random);
  }
  if (options.length > 1 && out.indexOf(answer) === previousIndex) {
    // Still unlucky: swap the answer with its neighbour.
    const i = out.indexOf(answer);
    const j = (i + 1) % out.length;
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Which position the next right answer must avoid. With 3 or more options,
 * the previous one. With 2, forbidding it would make the answers alternate
 * (A, B, A, B…) and the child could guess them all after the first, so they
 * only avoid a third time in a row.
 */
export function positionToAvoid(previous: readonly number[], optionCount: number): number | undefined {
  const last = previous.at(-1);
  if (optionCount > 2) return last;
  return previous.length >= 2 && previous.at(-2) === last ? last : undefined;
}

/** An order round never starts already solved. */
function shuffleUnsolved(items: readonly Choice[], random: Random): Choice[] {
  let out = shuffle(items, random);
  for (let tries = 0; tries < 20 && out.every((c, i) => c.id === items[i]!.id); tries++) out = shuffle(items, random);
  if (out.every((c, i) => c.id === items[i]!.id)) out = [...out.slice(1), out[0]!];
  return out;
}

export function stepsFor(game: Game, random: Random = Math.random): Step[] {
  switch (game.type) {
    case "classify": {
      const bins = game.categories.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }));
      return shuffle(game.items, random).map((item) => ({
        kind: "pick",
        layout: "bins",
        prompt: game.instructions ?? game.title,
        card: { text: item.label, emoji: item.emoji },
        options: bins,
        correct: [item.category],
        topic: item.topic,
        source: item.source,
        explanation: item.explanation,
      }));
    }
    case "order":
      return shuffle(game.rounds, random).map((round) => {
        const items = round.items.map((it, i) => ({ id: String(i), label: it.label, emoji: it.emoji }));
        return {
          kind: "order",
          prompt: round.prompt,
          items,
          shuffled: shuffleUnsolved(items, random),
          topic: round.topic,
          source: round.source,
          explanation: round.explanation,
        };
      });
    case "yesno":
      return shuffle(game.questions, random).map((q) => ({
        kind: "swipe",
        card: { text: q.statement, emoji: q.emoji },
        answer: q.answer,
        topic: q.topic,
        source: q.source,
        explanation: q.explanation,
      }));
    case "choice":
    case "boss": {
      const positions: number[] = [];
      return shuffle(game.questions, random).map((q) => {
        const order = shuffleAvoiding(q.options, q.answer, positionToAvoid(positions, q.options.length), random);
        positions.push(order.indexOf(q.answer));
        return {
          kind: "pick",
          layout: "list",
          prompt: q.prompt,
          card: q.emoji ? { text: "", emoji: q.emoji } : undefined,
          options: order.map((o) => ({ id: o, label: o })),
          correct: [q.answer, ...(q.alsoAccepted ?? [])],
          topic: q.topic,
          source: q.source,
          explanation: q.explanation,
        };
      });
    }
  }
}

/** Questions per round of the infinite mode. */
export const MIX_SIZE = 10;

/** The infinite mode: questions from every game of the unit, mixed up; a new mix each round. */
export function mixedSteps(games: readonly Game[], count = MIX_SIZE, random: Random = Math.random): Step[] {
  return shuffle(
    games.flatMap((g) => stepsFor(g, random)),
    random,
  ).slice(0, count);
}

/** The answer the child gave: an option id, an order of ids, or yes/no. */
export type Answer = string | string[] | boolean;

export function isCorrect(step: Step, answer: Answer): boolean {
  switch (step.kind) {
    case "pick":
      return typeof answer === "string" && step.correct.includes(answer);
    case "order":
      return Array.isArray(answer) && answer.length === step.items.length && answer.every((id, i) => id === step.items[i]!.id);
    case "swipe":
      return answer === step.answer;
  }
}

/** What to show as the right answer after a mistake. */
export function rightAnswerLabel(step: Step, yes: string, no: string): string {
  switch (step.kind) {
    case "pick":
      return step.options.filter((o) => step.correct.includes(o.id)).map((o) => o.label).join(" / ");
    case "order":
      return step.items.map((i) => i.label).join(" → ");
    case "swipe":
      return step.answer ? yes : no;
  }
}

export const DEFAULT_BOSS_THRESHOLD = 0.7;

/** The boss is beaten when the share of right answers reaches the threshold. */
export function bossBeaten(correct: number, total: number, threshold = DEFAULT_BOSS_THRESHOLD): boolean {
  return total > 0 && correct / total >= threshold;
}

/** 0-3 stars for the results screen. */
export function stars(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const share = correct / total;
  return share >= 0.9 ? 3 : share >= 0.7 ? 2 : share >= 0.4 ? 1 : 0;
}
