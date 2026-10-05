/**
 * docs/pack-format.md must match src/pack/schema.ts (QZS-29): every table of
 * fields lists exactly the schema's fields, with the same "required" and the
 * same limits, and the minimal pack in the page is valid.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Pack } from "../src/pack/schema.js";
import { validatePack } from "../src/pack/validate.js";

const doc = readFileSync(new URL("../docs/pack-format.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");

interface Node {
  type?: string;
  const?: unknown;
  properties?: Record<string, Node>;
  required?: string[];
  items?: Node;
  oneOf?: Node[];
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
}

const schema = z.toJSONSchema(Pack, { io: "input" }) as Node;
const prop = (node: Node, name: string): Node => node.properties![name]!;
const game = (type: string): Node => prop(schema, "games").items!.oneOf!.find((g) => prop(g, "type").const === type)!;

/** Each table of the page (by its heading) and the part of the schema it describes. */
const TABLES: Record<string, Node> = {
  Pack: schema,
  Grade: prop(schema, "grade"),
  Topic: prop(schema, "topics").items!,
  Review: prop(schema, "review"),
  Generator: prop(schema, "generator"),
  "Classify game": game("classify"),
  Category: prop(game("classify"), "categories").items!,
  "Classify item": prop(game("classify"), "items").items!,
  "Order game": game("order"),
  "Order round": prop(game("order"), "rounds").items!,
  "Order item": prop(prop(game("order"), "rounds").items!, "items").items!,
  "Choice game": game("choice"),
  "Choice question": prop(game("choice"), "questions").items!,
  "Yes/no game": game("yesno"),
  "Yes/no statement": prop(game("yesno"), "questions").items!,
  "Boss game": game("boss"),
};

interface Row {
  field: string;
  type: string;
  required: boolean;
  limits: string;
}

/** The rows of the table under "### <heading>". */
function table(heading: string): Row[] {
  const start = doc.indexOf(`\n### ${heading}\n`);
  if (start < 0) throw new Error(`No "### ${heading}" in docs/pack-format.md`);
  const section = doc.slice(start + 1).split(/\n#{2,3} /)[0]!;
  return section
    .split("\n")
    .filter((line) => /^\| `/.test(line))
    .map((line) => {
      const [field, type, required, limits] = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return { field: field!.replace(/`/g, ""), type: type!, required: required === "yes", limits: limits! };
    });
}

/** "1–80" → [1, 80]; nothing when the cell gives no range. */
function range(text: string): [number, number] | undefined {
  const m = text.match(/(\d+)–(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}

/** The limits the schema sets on a field: length of a text, size of a list, or a number's range. */
function limits(node: Node): [number, number] | undefined {
  if (node.type === "string" && node.maxLength !== undefined) return [node.minLength ?? 0, node.maxLength];
  if (node.type === "array" && node.maxItems !== undefined) return [node.minItems ?? 0, node.maxItems];
  if (node.type === "integer" && node.maximum !== undefined) return [node.minimum ?? 0, node.maximum];
  return undefined;
}

describe("docs/pack-format.md", () => {
  for (const [heading, node] of Object.entries(TABLES)) {
    it(`"${heading}" lists the schema's fields, with the same limits`, () => {
      const rows = table(heading);
      expect(rows.map((r) => r.field).sort()).toEqual(Object.keys(node.properties!).sort());
      for (const row of rows) {
        const field = prop(node, row.field);
        expect({ field: row.field, required: row.required }).toEqual({ field: row.field, required: node.required?.includes(row.field) ?? false });
        expect({ field: row.field, limits: range(row.limits) }).toEqual({ field: row.field, limits: limits(field) });
        // "list of text (each 1–120 characters)": the limit of each element.
        if (/each \d+–\d+/.test(row.type)) expect({ field: row.field, each: range(row.type) }).toEqual({ field: row.field, each: limits(field.items!) });
        if (field.const !== undefined) expect(`${row.type} ${row.limits}`).toContain(`\`${String(field.const)}\``);
      }
    });
  }

  it("covers every game type", () => {
    const types = prop(schema, "games").items!.oneOf!.map((g) => prop(g, "type").const);
    for (const type of types) expect(doc).toContain(`"type": "${type}"\``);
  });

  it("shows a minimal pack that is valid", () => {
    const json = doc.match(/## A minimal pack[\s\S]*?```json\n([\s\S]*?)\n```/)?.[1];
    expect(json).toBeDefined();
    const result = validatePack(JSON.parse(json!));
    expect(result.ok ? [] : result.issues).toEqual([]);
  });
});
