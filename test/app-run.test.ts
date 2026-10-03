import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stepsFor } from "../app/src/game/steps.js";
import { type SavedRun, clearRun, loadRun, saveRun } from "../app/src/run.js";
import type { Pack } from "../src/pack/schema.js";

const pack = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;
const data = new Map<string, string>();

beforeEach(() => {
  data.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());

const run = (over: Partial<SavedRun> = {}): SavedRun => ({
  packId: pack.id,
  game: 0,
  steps: stepsFor(pack.games[0]!),
  answers: [{ topic: "estados", correct: true }],
  ...over,
});

describe("the game in progress", () => {
  it("comes back after a reload with the same questions, in the same order", () => {
    const saved = run();
    expect(saveRun(saved)).toBe(true);
    expect(loadRun()).toEqual(saved);
  });

  it("is forgotten when the game ends or it was already answered to the end", () => {
    saveRun(run());
    clearRun();
    expect(loadRun()).toBeUndefined();
    const steps = stepsFor(pack.games[0]!);
    saveRun(run({ steps, answers: steps.map(() => ({ topic: "estados", correct: true })) }));
    expect(loadRun()).toBeUndefined();
  });

  it("works for the infinite mode too", () => {
    saveRun(run({ game: "mix" }));
    expect(loadRun()?.game).toBe("mix");
  });

  it("ignores anything unreadable or strange", () => {
    for (const raw of ["{broken", "null", "[]", JSON.stringify({ ...run(), game: -1 }), JSON.stringify({ ...run(), steps: [] }), JSON.stringify({ ...run(), steps: [{ kind: "draw" }] })]) {
      data.set("quizasaurus.run.v1", raw);
      expect(loadRun()).toBeUndefined();
    }
  });
});
