import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AIProvider, CompletionRequest } from "../src/ai/provider.js";
import { GenerationError, MAX_RETRIES, checkAnswer, detectLanguage, generatePack, sourcesNotInText } from "../src/generate/generate.js";
import { packJsonSchema, systemPrompt } from "../src/generate/prompt.js";
import type { Pack } from "../src/pack/schema.js";

const unitText = readFileSync(new URL("../examples/ciclo-del-agua.txt", import.meta.url), "utf8");
const example = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;

/** What a well-behaved AI would answer: the content, without the fields the program owns. */
function aiAnswer(mutate?: (pack: any) => void): string {
  const { schemaVersion, language, grade, review, ...content } = structuredClone(example) as any;
  mutate?.(content);
  return JSON.stringify(content);
}

/** A provider that replies with the given answers in turn and records the requests. */
function scriptedProvider(...answers: string[]) {
  const requests: CompletionRequest[] = [];
  const provider: AIProvider = {
    id: "ollama",
    model: "fake",
    local: true,
    async complete(request) {
      requests.push(request);
      return { text: answers[Math.min(requests.length - 1, answers.length - 1)] ?? "", usage: { inputTokens: 100, outputTokens: 50 }, seconds: 0 };
    },
  };
  return { provider, requests };
}

const grade = { stage: "primary", year: 3 } as const;

describe("generatePack", () => {
  it("returns a valid draft pack with the fields the program owns", async () => {
    const { provider, requests } = scriptedProvider(aiAnswer());
    const result = await generatePack(unitText, { provider, grade });

    expect(result.attempts).toBe(1);
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
    expect(result.pack).toMatchObject({
      schemaVersion: 1,
      language: "es",
      grade,
      review: { status: "draft" },
      generator: { provider: "ollama", model: "fake" },
    });
    expect(requests[0]).toMatchObject({ json: true });
    expect(requests[0]?.prompt).toContain("El hielo y la nieve son agua en estado sólido.");
  });

  it("sends the problems back and accepts the corrected answer", async () => {
    const broken = aiAnswer((p) => (p.games[2].questions[0].answer = "La Luna llena"));
    const { provider, requests } = scriptedProvider(broken, aiAnswer());
    const attempts: number[][] = [];
    const result = await generatePack(unitText, { provider, grade, onAttempt: (n, issues) => attempts.push([n, issues.length]) });

    expect(result.attempts).toBe(2);
    expect(attempts).toEqual([[1, 1], [2, 0]]);
    expect(requests[1]?.prompt).toContain("games[2].questions[0].answer: The answer must be one of the options");
    expect(requests[1]?.prompt).toContain("La Luna llena");
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 100 });
  });

  it(`gives up after ${MAX_RETRIES} retries with a clear message`, async () => {
    const { provider, requests } = scriptedProvider("this is not JSON");
    const error = await generatePack(unitText, { provider, grade }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GenerationError);
    expect(requests).toHaveLength(MAX_RETRIES + 1);
    expect((error as Error).message).toMatch(/could not produce a valid pack after 3 attempts/);
    expect((error as Error).message).toContain("not valid JSON");
  });

  it("uses the language it is given instead of detecting it", async () => {
    const { provider, requests } = scriptedProvider(aiAnswer());
    const result = await generatePack(unitText, { provider, grade, language: "ca" });
    expect(result.pack.language).toBe("ca");
    expect(requests[0]?.system).toContain("Catalan (català)");
  });
});

describe("checkAnswer", () => {
  const fixed = { language: "es", grade, generator: { provider: "ollama", model: "fake", createdAt: "2026-10-03T12:00:00Z" } };

  it("accepts JSON wrapped in a code fence", () => {
    expect(checkAnswer("```json\n" + aiAnswer() + "\n```", unitText, fixed)).toMatchObject({ ok: true });
  });

  it("rejects a source sentence that is not in the unit", () => {
    const answer = aiAnswer((p) => (p.games[3].questions[0].source = "El vapor de agua es invisible para los humanos."));
    const result = checkAnswer(answer, unitText, fixed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("games[3].questions[0].source");
  });

  it("rejects a classify item that contains its category's name", () => {
    const answer = aiAnswer((p) => {
      p.games[0].categories[1].label = "Conreades";
      p.games[0].items[2].label = "Conreades en camps de conreu";
    });
    const result = checkAnswer(answer, unitText, fixed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.path)).toEqual(["games[0].items[2].label"]);
  });

  it("forces the language, grade and draft status even if the AI sets them", () => {
    const answer = aiAnswer((p) => Object.assign(p, { language: "en", review: { status: "approved", approvedAt: "2026-01-01T00:00:00Z" } }));
    const result = checkAnswer(answer, unitText, fixed);
    expect(result.ok && [result.pack.language, result.pack.review.status]).toEqual(["es", "draft"]);
  });
});

describe("sourcesNotInText", () => {
  it("ignores case, line breaks, punctuation and a trailing ellipsis", () => {
    const pack = structuredClone(example);
    const q = pack.games[4]!.type === "boss" ? pack.games[4]!.questions[0]! : undefined;
    q!.source = "EL AGUA puede estar\n en tres estados: sólido, líquido y gaseoso…";
    expect(sourcesNotInText(pack, unitText)).toEqual([]);
  });

  it("accepts an exact excerpt but not a paraphrase or a cut word", () => {
    const pack = structuredClone(example);
    const q = pack.games[4]!.type === "boss" ? pack.games[4]!.questions[0]! : undefined;
    q!.source = "El agua puede estar en tres estados.";
    expect(sourcesNotInText(pack, unitText)).toEqual([]);
    q!.source = "El agua tiene tres estados.";
    expect(sourcesNotInText(pack, unitText)).toHaveLength(1);
    q!.source = "gua puede estar en tres estados";
    expect(sourcesNotInText(pack, unitText)).toHaveLength(1);
  });
});

describe("prompt", () => {
  it("adapts to the grade and language and carries the schema", () => {
    const prompt = systemPrompt({ language: "ca", grade });
    expect(prompt).toContain("year 3 of primary school, aged 8-9");
    expect(prompt).toContain("Catalan (català)");
    expect(prompt).toContain(packJsonSchema);
  });
});

describe("detectLanguage", () => {
  it("tells Catalan from Spanish", () => {
    expect(detectLanguage(unitText)).toBe("es");
    expect(detectLanguage("L'arrel és la part de la planta que està sota la terra. Les fulles neixen de les branques i també del tronc.")).toBe("ca");
    expect(detectLanguage("La raíz es la parte de la planta que está bajo la tierra. Las hojas nacen de las ramas y también del tronco.")).toBe("es");
  });
});
