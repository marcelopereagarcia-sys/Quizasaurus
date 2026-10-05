import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAME_TYPES, validatePack, validatePackJson, formatPath, type Pack } from "../src/index.js";

const examplePath = new URL("../examples/ciclo-del-agua.pack.json", import.meta.url);
const exampleText = readFileSync(new URL("../examples/ciclo-del-agua.txt", import.meta.url), "utf8");
const example = JSON.parse(readFileSync(examplePath, "utf8")) as Pack;

/** A fresh, mutable copy of the example pack. */
const pack = (): any => structuredClone(example);

/** Validates and returns the issues, failing the test if the pack is valid. */
function issuesOf(input: unknown) {
  const result = validatePack(input);
  if (result.ok) throw new Error("Expected the pack to be invalid");
  return result.issues;
}

describe("valid packs", () => {
  it("accepts the example pack", () => {
    const result = validatePack(example);
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it("the example uses all 5 game types", () => {
    expect(example.games.map((g) => g.type).sort()).toEqual([...GAME_TYPES].sort());
  });

  it("every source sentence in the example is quoted from its text", () => {
    const sources = [...JSON.stringify(example).matchAll(/"source":"((?:[^"\\]|\\.)*)"/g)].map(([, s]) => JSON.parse(`"${s}"`));
    expect(sources).toHaveLength(21);
    for (const source of sources) expect(exampleText).toContain(source);
  });

  it("accepts a draft pack with only one game besides the boss", () => {
    const p = pack();
    p.review = { status: "draft" };
    p.games = [p.games[3], p.games[4]];
    p.topics = p.topics.filter((t: any) => t.id !== "ciclo");
    p.games[1].questions = p.games[1].questions.filter((q: any) => q.topic !== "ciclo");
    p.games[1].questions.push(p.games[1].questions[0], p.games[1].questions[1]);
    expect(validatePack(p)).toMatchObject({ ok: true });
  });

  it("gives the age of the children; packs from before QZS-37 give a school year instead", () => {
    expect(example.age).toBe(8);
    const old = pack();
    delete old.age;
    old.grade = { stage: "primary", year: 3 };
    expect(validatePack(old)).toMatchObject({ ok: true });
  });

  it("accepts alternative right answers that are among the options", () => {
    const p = pack();
    p.games[2].questions[0].alsoAccepted = ["La Luna"];
    expect(validatePack(p)).toMatchObject({ ok: true });
  });
});

describe("invalid packs say which field is wrong", () => {
  it("no age (nor an old school year), or an age out of range", () => {
    const p = pack();
    delete p.age;
    expect(issuesOf(p)).toContainEqual({ path: "age", message: "Give the age of the children the pack is for (3-18)" });
    p.age = 2;
    expect(issuesOf(p).map((i) => i.path)).toEqual(["age"]);
    p.age = 8.5;
    expect(issuesOf(p).map((i) => i.path)).toEqual(["age"]);
  });

  it("answer that is not one of the options", () => {
    const p = pack();
    p.games[2].questions[1].answer = "Fusión";
    expect(issuesOf(p)).toContainEqual({
      path: "games[2].questions[1].answer",
      message: "The answer must be one of the options",
    });
  });

  it("question without its source sentence", () => {
    const p = pack();
    delete p.games[3].questions[0].source;
    expect(issuesOf(p).map((i) => i.path)).toContain("games[3].questions[0].source");
  });

  it("empty source sentence", () => {
    const p = pack();
    p.games[0].items[0].source = "   ";
    expect(issuesOf(p)).toContainEqual({ path: "games[0].items[0].source", message: "Cannot be empty" });
  });

  it("topic that the pack does not declare", () => {
    const p = pack();
    p.games[1].rounds[0].topic = "volcanes";
    const [issue] = issuesOf(p);
    expect(issue?.path).toBe("games[1].rounds[0].topic");
    expect(issue?.message).toContain('Unknown topic "volcanes"');
  });

  it("declared topic that no question uses", () => {
    const p = pack();
    p.topics.push({ id: "nubes", name: "Las nubes" });
    expect(issuesOf(p).map((i) => i.path)).toContain("topics[3]");
  });

  it("item in a category that does not exist", () => {
    const p = pack();
    p.games[0].items[5].category = "plasma";
    expect(issuesOf(p).map((i) => i.path)).toContain("games[0].items[5].category");
  });

  it("unknown game type", () => {
    const p = pack();
    p.games[2].type = "memory";
    expect(issuesOf(p).map((i) => i.path)).toContain("games[2].type");
  });

  it("order round with fewer than 3 items", () => {
    const p = pack();
    p.games[1].rounds[1].items.pop();
    expect(issuesOf(p).map((i) => i.path)).toContain("games[1].rounds[1].items");
  });

  it("yes/no game where every answer is the same", () => {
    const p = pack();
    for (const q of p.games[3].questions) q.answer = true;
    expect(issuesOf(p).map((i) => i.path)).toContain("games[3].questions");
  });

  it("repeated options", () => {
    const p = pack();
    p.games[4].questions[0].options = ["3", "3", "4"];
    expect(issuesOf(p).map((i) => i.path)).toContain("games[4].questions[0].options");
  });

  it("no boss, or a boss that is not the last game", () => {
    const noBoss = pack();
    noBoss.games.pop();
    expect(issuesOf(noBoss).map((i) => i.path)).toContain("games");

    const bossFirst = pack();
    bossFirst.games.unshift(bossFirst.games.pop());
    expect(issuesOf(bossFirst).map((i) => i.path)).toContain("games");
  });

  it("boss that does not cover every topic", () => {
    const p = pack();
    p.games[4].questions = p.games[4].questions.filter((q: any) => q.topic !== "cuidado");
    p.games[4].questions.push(p.games[4].questions[0]);
    const issue = issuesOf(p).find((i) => i.path === "games[4].questions");
    expect(issue?.message).toContain("missing topics: cuidado");
  });

  it("unknown fields, e.g. a typo from the AI", () => {
    const p = pack();
    p.games[2].questions[0].anwser = "El Sol";
    expect(issuesOf(p).map((i) => i.path)).toContain("games[2].questions[0]");
  });

  it("approved pack without approval date", () => {
    const p = pack();
    p.review = { status: "approved" };
    expect(issuesOf(p).map((i) => i.path)).toContain("review.approvedAt");
  });

  it("unsupported schema version or language code", () => {
    const p = pack();
    p.schemaVersion = 2;
    p.language = "español";
    expect(issuesOf(p).map((i) => i.path)).toEqual(expect.arrayContaining(["schemaVersion", "language"]));
  });

  it("text that is not JSON", () => {
    const result = validatePackJson("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.message).toMatch(/^Not valid JSON/);
  });
});

describe("formatPath", () => {
  it("formats nested paths", () => {
    expect(formatPath(["games", 2, "questions", 0, "answer"])).toBe("games[2].questions[0].answer");
    expect(formatPath([])).toBe("(root)");
  });
});
