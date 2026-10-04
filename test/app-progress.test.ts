import { afterEach, describe, expect, it, vi } from "vitest";
import { UI_LANGS } from "../app/src/i18n.js";
import { DINOS, type Outcome, anyLevelPassed, dinoOf, emptyProgress, levelKey, levelStars, loadProgress, nextLevel, recordGame, saveProgress } from "../app/src/progress.js";

const outcome = (over: Partial<Outcome> = {}): Outcome => ({
  packId: "agua",
  game: 0,
  correct: 5,
  total: 6,
  passed: true,
  answers: [
    { topic: "estados", correct: true },
    { topic: "estados", correct: false },
    { topic: "ciclo", correct: true },
  ],
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe("rewards, as in the prototype", () => {
  it("a diamond per right answer, stars and a dinosaur the first time a level is passed", () => {
    const { progress, reward } = recordGame(emptyProgress(), outcome());
    expect(reward).toEqual({ gems: 5, stars: 2, dino: 0 });
    expect(progress.gems).toBe(5);
    expect(progress.stars[levelKey("agua", 0)]).toBe(2);
    expect(dinoOf(progress, levelKey("agua", 0))).toBe(0);
  });

  it("passing a level always gives a star; a boss still standing gives none and no egg hatches", () => {
    expect(levelStars(0, 6, true)).toBe(1);
    expect(levelStars(6, 6, true)).toBe(3);
    const { progress, reward } = recordGame(emptyProgress(), outcome({ game: 4, correct: 2, total: 5, passed: false }));
    expect(reward).toEqual({ gems: 2, stars: 0, dino: undefined });
    expect(progress.hatched).toEqual([]);
  });

  it("keeps the best stars and hatches each egg only once", () => {
    let p = recordGame(emptyProgress(), outcome({ correct: 6 })).progress;
    const again = recordGame(p, outcome({ correct: 1 }));
    p = again.progress;
    expect(again.reward.dino).toBeUndefined();
    expect(p.stars[levelKey("agua", 0)]).toBe(3);
    expect(p.hatched).toHaveLength(1);
    expect(p.gems).toBe(7);
  });

  it("one collection for every unit: the next level of any unit gives the next dinosaur", () => {
    let p = recordGame(emptyProgress(), outcome()).progress;
    const other = recordGame(p, outcome({ packId: "plantas", game: 2 }));
    expect(other.reward.dino).toBe(1);
    p = other.progress;
    expect(dinoOf(p, levelKey("plantas", 2))).toBe(1);
  });

  it("the infinite mode gives diamonds but no level, stars to keep or egg", () => {
    const { progress, reward } = recordGame(emptyProgress(), outcome({ game: undefined }));
    expect(reward.gems).toBe(5);
    expect(reward.dino).toBeUndefined();
    expect(progress.stars).toEqual({});
  });

  it("counts right and wrong answers per unit and topic, for the family corner", () => {
    const p = recordGame(recordGame(emptyProgress(), outcome()).progress, outcome()).progress;
    expect(p.topics.agua).toEqual({ estados: { right: 2, wrong: 2 }, ciclo: { right: 2, wrong: 0 } });
  });

  it("does not change the progress it was given", () => {
    const before = emptyProgress();
    recordGame(before, outcome());
    expect(before).toEqual(emptyProgress());
  });
});

describe("the level to play next (QZS-32)", () => {
  const play = (progress = emptyProgress(), game: number, passed = true) => recordGame(progress, outcome({ game, passed })).progress;

  it("is level 1 in a new unit, and nothing counts as passed yet", () => {
    expect(nextLevel(emptyProgress(), "agua", 5)).toBe(0);
    expect(anyLevelPassed(emptyProgress(), "agua", 5)).toBe(false);
  });

  it("is the first level not passed, even after playing out of order", () => {
    const p = play(play(emptyProgress(), 0), 2);
    expect(nextLevel(p, "agua", 5)).toBe(1);
    expect(anyLevelPassed(p, "agua", 5)).toBe(true);
  });

  it("stays on a boss that is still standing, and is none once every level is passed", () => {
    let p = [0, 1, 2, 3].reduce((acc, g) => play(acc, g), emptyProgress());
    p = play(p, 4, false);
    expect(nextLevel(p, "agua", 5)).toBe(4);
    p = play(p, 4, true);
    expect(nextLevel(p, "agua", 5)).toBeUndefined();
  });

  it("does not mix units", () => {
    expect(nextLevel(play(emptyProgress(), 0), "otra", 5)).toBe(0);
  });
});

describe("the collection", () => {
  it("has 24 dinosaurs, named in every language", () => {
    expect(DINOS).toHaveLength(24);
    for (const dict of Object.values(UI_LANGS)) {
      expect(dict.dinoNames).toHaveLength(24);
      expect(new Set(dict.dinoNames).size).toBe(24);
    }
  });
});

describe("progress on the device", () => {
  it("is saved and loaded, and starts from zero if it is missing or corrupt", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
    expect(loadProgress()).toEqual(emptyProgress());
    const p = recordGame(emptyProgress(), outcome()).progress;
    expect(saveProgress(p)).toBe(true);
    expect(loadProgress()).toEqual(p);
    for (const raw of ["{broken", "null", "[]", '{"v":2}', '{"v":1,"gems":-3,"stars":{},"hatched":[],"topics":{}}']) {
      data.set("quizasaurus.progress.v1", raw);
      expect(loadProgress()).toEqual(emptyProgress());
    }
  });

  it("keeps working when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadProgress()).toEqual(emptyProgress());
    expect(saveProgress(emptyProgress())).toBe(false);
  });
});
