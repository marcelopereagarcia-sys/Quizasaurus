/**
 * The child's progress (QZS-19), as in the prototype: a diamond per right
 * answer, 1-3 stars per level (the best one is kept) and an egg per level that
 * hatches a dinosaur the first time the level is passed. The dinosaurs go to one
 * collection shared by every unit, so it grows with each new unit.
 *
 * Kept on the device only. If storage fails, progress lives in memory until the
 * app closes.
 */
import { stars } from "./game/steps.js";
import { safeStorage } from "./storage.js";

/** The collection: 24 dinosaurs, hatched in this order. Names live in i18n. */
export const DINOS = [
  "🦕", "🦖", "🦕", "🦕", "🦖", "🦖", "🦕", "🦖", "🦕", "🦕", "🦕", "🦖",
  "🦕", "🦖", "🦕", "🦖", "🦖", "🦖", "🦕", "🦖", "🦕", "🦖", "🦖", "🦕",
] as const;

/** Each dinosaur gets its own colour, as in the prototype. */
export function dinoHue(index: number): string {
  return `hue-rotate(${(index * 61) % 360}deg)`;
}

export interface TopicScore {
  right: number;
  wrong: number;
}

export interface Progress {
  v: 1;
  gems: number;
  /** Best stars per level, by level key. */
  stars: Record<string, 1 | 2 | 3>;
  /** Level keys in the order their eggs hatched: the n-th one is dinosaur n. */
  hatched: string[];
  /** Right and wrong answers per pack and topic, for the family corner. */
  topics: Record<string, Record<string, TopicScore>>;
}

export function emptyProgress(): Progress {
  return { v: 1, gems: 0, stars: {}, hatched: [], topics: {} };
}

export function levelKey(packId: string, game: number): string {
  return `${packId}#${game}`;
}

/** Passing a level always gives at least one star; a boss still standing gives none. */
export function levelStars(correct: number, total: number, passed: boolean): 0 | 1 | 2 | 3 {
  return passed ? (Math.max(1, stars(correct, total)) as 1 | 2 | 3) : 0;
}

/** The dinosaur that hatched from a level's egg, if it did. */
export function dinoOf(progress: Progress, key: string): number | undefined {
  const i = progress.hatched.indexOf(key);
  return i < 0 ? undefined : i % DINOS.length;
}

export interface Outcome {
  packId: string;
  /** The game's index in the pack; undefined for the infinite mode, which keeps no level. */
  game: number | undefined;
  correct: number;
  total: number;
  passed: boolean;
  answers: { topic: string; correct: boolean }[];
}

export interface Reward {
  gems: number;
  stars: 0 | 1 | 2 | 3;
  /** The dinosaur that just hatched, if any. */
  dino: number | undefined;
}

/** A finished game, added to the progress. Pure: returns a new progress. */
export function recordGame(progress: Progress, outcome: Outcome): { progress: Progress; reward: Reward } {
  const next: Progress = {
    ...progress,
    gems: progress.gems + outcome.correct,
    stars: { ...progress.stars },
    hatched: [...progress.hatched],
    topics: { ...progress.topics, [outcome.packId]: { ...progress.topics[outcome.packId] } },
  };
  const packTopics = next.topics[outcome.packId]!;
  for (const a of outcome.answers) {
    const before = packTopics[a.topic] ?? { right: 0, wrong: 0 };
    packTopics[a.topic] = a.correct ? { ...before, right: before.right + 1 } : { ...before, wrong: before.wrong + 1 };
  }

  const earned = levelStars(outcome.correct, outcome.total, outcome.passed);
  let dino: number | undefined;
  if (outcome.game !== undefined && earned > 0) {
    const key = levelKey(outcome.packId, outcome.game);
    next.stars[key] = Math.max(next.stars[key] ?? 1, earned) as 1 | 2 | 3;
    if (!next.hatched.includes(key)) {
      next.hatched.push(key);
      dino = (next.hatched.length - 1) % DINOS.length;
    }
  }
  return { progress: next, reward: { gems: outcome.correct, stars: earned, dino } };
}

const PROGRESS_KEY = "quizasaurus.progress.v1";

/** Stored progress; anything unreadable starts again from zero. */
export function loadProgress(): Progress {
  try {
    const stored: unknown = JSON.parse(safeStorage.get(PROGRESS_KEY) ?? "null");
    if (isProgress(stored)) return stored;
  } catch {
    // Unreadable: start again.
  }
  return emptyProgress();
}

export function saveProgress(progress: Progress): boolean {
  return safeStorage.set(PROGRESS_KEY, JSON.stringify(progress));
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<Progress>;
  return (
    p.v === 1 &&
    typeof p.gems === "number" &&
    p.gems >= 0 &&
    typeof p.stars === "object" &&
    p.stars !== null &&
    Array.isArray(p.hatched) &&
    p.hatched.every((k) => typeof k === "string") &&
    typeof p.topics === "object" &&
    p.topics !== null
  );
}
