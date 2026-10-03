/**
 * The game in progress, kept on the device after every answer: if the page
 * reloads, the tablet closes the app or the child leaves the game, it goes on
 * from the same question with the same order. Cleared when the game ends.
 */
import type { Step } from "./game/steps.js";
import { safeStorage } from "./storage.js";

export interface SavedRun {
  packId: string;
  /** The game's index in the pack, or the infinite mode. */
  game: number | "mix";
  /** The round's questions, in the order they were shuffled. */
  steps: Step[];
  /** The answers given so far, one per question (as the game records them). */
  answers: { topic: string; correct: boolean }[];
}

const RUN_KEY = "quizasaurus.run.v1";

/** The saved run, if it is readable and still has questions to answer. */
export function loadRun(): SavedRun | undefined {
  try {
    const stored: unknown = JSON.parse(safeStorage.get(RUN_KEY) ?? "null");
    if (isRun(stored) && stored.answers.length < stored.steps.length) return stored;
  } catch {
    // Unreadable: start the game again.
  }
  return undefined;
}

export function saveRun(run: SavedRun): boolean {
  return safeStorage.set(RUN_KEY, JSON.stringify(run));
}

export function clearRun(): boolean {
  return safeStorage.set(RUN_KEY, "null");
}

function isRun(value: unknown): value is SavedRun {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<SavedRun>;
  return (
    typeof r.packId === "string" &&
    (r.game === "mix" || (typeof r.game === "number" && Number.isInteger(r.game) && r.game >= 0)) &&
    Array.isArray(r.steps) &&
    r.steps.length > 0 &&
    r.steps.every((s) => typeof s === "object" && s !== null && ["pick", "order", "swipe"].includes((s as Step).kind)) &&
    Array.isArray(r.answers) &&
    r.answers.every((a) => typeof a === "object" && a !== null && typeof a.topic === "string" && typeof a.correct === "boolean")
  );
}
