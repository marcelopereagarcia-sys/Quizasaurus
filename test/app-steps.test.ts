import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bossBeaten, isCorrect, positionToAvoid, rightAnswerLabel, shuffleAvoiding, stars, stepsFor } from "../app/src/game/steps.js";
import type { Pack } from "../src/pack/schema.js";

const pack = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;
const game = (type: string) => pack.games.find((g) => g.type === type)!;

/** Deterministic random numbers for repeatable tests. */
function seeded(seed: number) {
  return () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);
}

describe("steps from every template", () => {
  it("classify: one step per item, categories as fixed bins", () => {
    const steps = stepsFor(game("classify"), seeded(1));
    expect(steps).toHaveLength(6);
    for (const s of steps) {
      expect(s.kind).toBe("pick");
      if (s.kind === "pick") expect(s.options.map((o) => o.id)).toEqual(["solido", "liquido", "gas"]);
    }
  });

  it("order: rounds never start already solved", () => {
    for (let seed = 1; seed < 50; seed++) {
      for (const s of stepsFor(game("order"), seeded(seed))) {
        if (s.kind !== "order") throw new Error("expected order");
        expect(s.shuffled.map((c) => c.id)).not.toEqual(s.items.map((c) => c.id));
        expect([...s.shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(s.items);
      }
    }
  });

  it("yes/no: one swipe card per statement", () => {
    const steps = stepsFor(game("yesno"), seeded(3));
    expect(steps.map((s) => s.kind)).toEqual(Array(5).fill("swipe"));
  });

  it("every step keeps topic, source sentence and explanation", () => {
    for (const g of pack.games) {
      for (const s of stepsFor(g, seeded(4))) {
        expect(s.topic && s.source && s.explanation).toBeTruthy();
      }
    }
  });
});

const answerPositions = (steps: ReturnType<typeof stepsFor>) =>
  steps.map((s) => (s.kind === "pick" ? s.options.findIndex((o) => s.correct[0] === o.id) : -1));

describe("the right answer changes position", () => {
  it("never in the same place twice in a row with 3+ options, nor three times with 2", () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const type of ["choice", "boss"]) {
        const steps = stepsFor(game(type), seeded(seed));
        const positions = answerPositions(steps);
        positions.slice(1).forEach((p, i) => {
          const options = steps[i + 1]!.kind === "pick" ? (steps[i + 1] as { options: unknown[] }).options.length : 0;
          if (options > 2) expect(p).not.toBe(positions[i]);
          else expect(i > 0 && p === positions[i] && p === positions[i - 1]).toBe(false);
        });
      }
    }
  });

  it("with 2 options, the answers do not simply alternate", () => {
    const twoOptions = {
      type: "boss",
      title: "Two options",
      questions: Array.from({ length: 8 }, (_, i) => ({ ...(game("boss") as any).questions[0], prompt: `Q${i}`, options: ["Yes", "No"], answer: "Yes" })),
    } as any;
    const patterns = new Set<string>();
    for (let seed = 1; seed < 50; seed++) patterns.add(answerPositions(stepsFor(twoOptions, seeded(seed))).join(""));
    // Only "01010101" and "10101010" would mean the child can guess every answer after the first.
    expect(patterns.size).toBeGreaterThan(2);
    expect(positionToAvoid([0, 0], 2)).toBe(0);
    expect(positionToAvoid([1, 0], 2)).toBeUndefined();
    expect(positionToAvoid([1, 0], 3)).toBe(0);
  });

  it("works even with an unlucky random source", () => {
    const always0 = () => 0;
    const first = shuffleAvoiding(["A", "B", "C"], "A", undefined, always0);
    const second = shuffleAvoiding(["A", "B", "C"], "A", first.indexOf("A"), always0);
    expect(second.indexOf("A")).not.toBe(first.indexOf("A"));
  });
});

describe("checking answers", () => {
  it("pick, with alternative right answers", () => {
    const [step] = stepsFor({ ...game("choice"), questions: [{ ...(game("choice") as any).questions[0], alsoAccepted: ["La Luna"] }] } as any, seeded(5));
    expect(isCorrect(step!, "El Sol")).toBe(true);
    expect(isCorrect(step!, "La Luna")).toBe(true);
    expect(isCorrect(step!, "El viento")).toBe(false);
  });

  it("order and swipe", () => {
    const [round] = stepsFor(game("order"), seeded(6));
    if (round?.kind !== "order") throw new Error("expected order");
    expect(isCorrect(round, round.items.map((i) => i.id))).toBe(true);
    expect(isCorrect(round, round.shuffled.map((i) => i.id))).toBe(false);
    expect(rightAnswerLabel(round, "Sí", "No")).toContain(" → ");

    const [card] = stepsFor(game("yesno"), seeded(6));
    if (card?.kind !== "swipe") throw new Error("expected swipe");
    expect(isCorrect(card, card.answer)).toBe(true);
    expect(isCorrect(card, !card.answer)).toBe(false);
  });
});

describe("boss and results", () => {
  it("the boss is beaten from the threshold up, and the threshold is configurable", () => {
    expect(bossBeaten(7, 10)).toBe(true);
    expect(bossBeaten(6, 10)).toBe(false);
    expect(bossBeaten(6, 10, 0.5)).toBe(true);
    expect(bossBeaten(0, 0)).toBe(false);
  });

  it("stars", () => {
    expect([stars(10, 10), stars(7, 10), stars(4, 10), stars(1, 10)]).toEqual([3, 2, 1, 0]);
  });
});
