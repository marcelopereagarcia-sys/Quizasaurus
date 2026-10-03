/**
 * Extracts the text of a school unit, page by page.
 *
 *   npm run extract -- private/unit.pdf
 *   npm run extract -- private/photo-1.jpg private/photo-2.jpg --out private/unit.txt
 *
 * Writes `<first input>.txt` next to the input unless --out is given, so text
 * from private material stays in `private/`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import { extractUnit, joinPages } from "../extract/extract.js";
import { ollamaVision } from "../extract/vision.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" } },
});
if (positionals.length === 0) {
  console.error("Usage: npm run extract -- <unit.pdf | photo.jpg ...> [--out unit.txt]");
  process.exit(2);
}

try {
  process.loadEnvFile();
} catch {
  // No .env file: defaults apply (local Ollama).
}

const vision = ollamaVision({ host: process.env.OLLAMA_HOST, model: process.env.OLLAMA_VISION_MODEL });
const files = await Promise.all(positionals.map(async (path) => ({ name: path, data: await readFile(path) })));

const started = performance.now();
const pages = await extractUnit(files, {
  vision,
  onPage: (p) => {
    const via = p.method === "vision" ? vision.name : "text layer";
    console.log(`page ${p.page}: ${via}, ${p.seconds.toFixed(1)} s, ${p.text.split(/\s+/).filter(Boolean).length} words`);
  },
});

const out = values.out ?? `${positionals[0]}.txt`;
await writeFile(out, joinPages(pages), "utf8");
const total = ((performance.now() - started) / 1000).toFixed(0);
console.log(`✔ ${pages.length} pages in ${total} s → ${basename(out)}`);
