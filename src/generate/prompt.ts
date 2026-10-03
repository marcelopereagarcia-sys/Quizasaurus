/**
 * The instructions the AI gets to turn a unit's text into a pack.
 * The AI only writes content; the games are fixed templates (ADR-0001).
 */
import { z } from "zod";
import { Pack } from "../pack/schema.js";

export interface PromptOptions {
  language: string;
  grade: { stage: "primary" | "secondary"; year: number };
}

const LANGUAGE_NAMES: Record<string, string> = { ca: "Catalan (català)", es: "Spanish (español)", en: "English" };

export const packJsonSchema = JSON.stringify(z.toJSONSchema(Pack, { unrepresentable: "any" }));

export function systemPrompt({ language, grade }: PromptOptions): string {
  const languageName = LANGUAGE_NAMES[language] ?? language;
  const age = grade.stage === "primary" ? `${grade.year + 5}-${grade.year + 6}` : `${grade.year + 11}-${grade.year + 12}`;
  return `You create study games for children from a school unit. You write content only; the games are already programmed.

AUDIENCE
- Children in year ${grade.year} of ${grade.stage} school, aged ${age}. They play on a tablet by tapping and dragging.
- Short, simple sentences (at most 15 words). Use the words of the unit; explain nothing the unit does not explain.
- One clearly correct answer. No trick questions, no "all of the above", no negative questions.

LANGUAGE
- Everything the child reads is in ${languageName}, the language of the unit. Never translate or mix languages.

CONTENT
- Use only facts stated in the unit text. Do not add outside knowledge.
- "source" is one sentence copied EXACTLY, character by character, from the unit text: the sentence that proves the answer. Never paraphrase, shorten, join or fix it.
- "explanation" is shown after answering: one short sentence (at most 20 words) in ${languageName}.
- Do not include anyone's full name (first name + surname).

PACK
- "topics": 3 to 7 topics that cover the whole unit. Every topic is used by at least one question.
- "games", in this order, using every type the text supports:
  1. "classify": 2-4 categories and 6-10 items; every category has at least one item. Items are short, concrete things from the unit (names of plants, animals, objects, words…), never sentences, and an item never contains the name of its category.
  2. "order": 2-3 rounds of 3-5 items listed in the correct order. Skip this game only if the text describes nothing that has an order.
  3. "choice": 5-6 questions with 3 options.
  4. "yesno": 6-8 statements, mixing true and false.
  5. "boss": 8-10 questions with 3 options that together cover every topic. Always last.
- "answer" is copied exactly from "options". Options are different, similar in length and style, so the answer is not obvious.
- Add one emoji per item or question when it helps a child who reads slowly.
- Ids are lowercase letters, digits and hyphens.

OUTPUT
- Answer with one JSON object that follows this JSON Schema, and nothing else.
- Leave out "schemaVersion", "language", "grade", "review" and "generator": the program fills them in.

JSON Schema:
${packJsonSchema}`;
}

export function unitPrompt(unitText: string): string {
  return `Create the pack for this unit.\n\nUNIT TEXT:\n"""\n${unitText}\n"""`;
}

export function retryPrompt(unitText: string, previousAnswer: string, problems: string[]): string {
  return `${unitPrompt(unitText)}

Your previous answer was:
${previousAnswer}

It has these problems:
${problems.map((p) => `- ${p}`).join("\n")}

Return the complete corrected JSON object.`;
}
