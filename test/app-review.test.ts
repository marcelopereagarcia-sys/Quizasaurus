import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canRemove, finishReview, gateQuestion, issueKind, issuePlace, moveItem, removeQuestion, renameOption } from "../app/src/review/edit.js";
import type { Pack } from "../src/pack/schema.js";

const pack = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;
const draft: Pack = { ...pack, review: { status: "draft" } };
const gameOf = (type: string) => draft.games.findIndex((g) => g.type === type);

describe("adult review", () => {
  it("removes a question without touching the original, and never below the game's minimum", () => {
    const g = gameOf("classify"); // 6 items, at least 4
    const fewer = removeQuestion(draft, g, 0);
    expect((fewer.games[g] as { items: unknown[] }).items).toHaveLength(5);
    expect((draft.games[g] as { items: unknown[] }).items).toHaveLength(6);
    expect(canRemove(draft.games[g]!)).toBe(true);
    expect(canRemove(removeQuestion(fewer, g, 0).games[g]!)).toBe(false);
    expect(canRemove(draft.games[gameOf("choice")]!)).toBe(false); // 3 questions, at least 3
  });

  it("renaming an option keeps the right answer pointing at it", () => {
    const q = { options: ["Sol", "Luna", "Mar"], answer: "Sol", alsoAccepted: ["Luna"] };
    expect(renameOption(q, 0, "El Sol")).toEqual({ options: ["El Sol", "Luna", "Mar"], answer: "El Sol", alsoAccepted: ["Luna"] });
    expect(renameOption(q, 1, "La Luna").alsoAccepted).toEqual(["La Luna"]);
    expect(renameOption(q, 2, "Río").answer).toBe("Sol");
  });

  it("moves order items up and down, and not past the ends", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("approving checks the whole pack against the format and stamps the date", () => {
    const now = new Date("2026-10-04T09:00:00Z");
    const ok = finishReview(draft, true, now);
    expect(ok.ok && ok.pack.review).toEqual({ status: "approved", approvedAt: "2026-10-04T09:00:00.000Z" });
    const kept = finishReview(draft, false, now);
    expect(kept.ok && kept.pack.review).toEqual({ status: "draft" });
  });

  it("does not approve a pack an edit broke, and says where", () => {
    const g = gameOf("yesno");
    const broken = structuredClone(draft);
    for (const q of (broken.games[g] as { questions: { answer: boolean }[] }).questions) q.answer = true;
    const result = finishReview(broken, true, new Date());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(issuePlace(result.issues[0]!.path)).toEqual({ game: g + 1, question: undefined });
    expect(issuePlace("games[2].questions[0].answer")).toEqual({ game: 3, question: 1 });
    expect(issuePlace("title")).toBeUndefined();
  });

  it("explains the format's messages in the pack's language, not in English", () => {
    expect(issueKind("Cannot be empty")).toEqual({ kind: "empty" });
    expect(issueKind("At most 120 characters")).toEqual({ kind: "tooLong", max: 120 });
    expect(issueKind("Options must be different from each other")).toEqual({ kind: "repeated" });
    expect(issueKind("Item labels must be unique")).toEqual({ kind: "repeated" });
    expect(issueKind("Mix yes and no answers, so the game cannot be won by always swiping the same way")).toEqual({ kind: "mixYesNo" });
    expect(issueKind('No item belongs to category "gas"')).toEqual({ kind: "emptyCategory" });
    expect(issueKind('No question uses topic "ciclo"')).toEqual({ kind: "unusedTopic" });
    expect(issueKind("The boss must cover the whole unit; missing topics: ciclo")).toEqual({ kind: "bossTopics" });
    expect(issueKind("Something new")).toEqual({ kind: "other" });
  });

  it("the parental gate asks a multiplication of 12-19 by 6-9", () => {
    expect(gateQuestion(() => 0)).toEqual({ a: 12, b: 6, answer: 72 });
    expect(gateQuestion(() => 0.999)).toEqual({ a: 19, b: 9, answer: 171 });
  });
});
