/**
 * Validates one or more pack files.
 *
 *   npm run validate -- examples/ciclo-del-agua.pack.json
 *
 * Exits with code 1 if any pack is invalid.
 */
import { readFile } from "node:fs/promises";
import { validatePackJson } from "../pack/validate.js";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: npm run validate -- <pack.json> [more packs...]");
  process.exit(2);
}

let failed = 0;
for (const file of files) {
  const result = validatePackJson(await readFile(file, "utf8"));
  if (result.ok) {
    const games = result.pack.games.map((g) => g.type).join(", ");
    console.log(`✔ ${file} — valid (${games})`);
  } else {
    failed++;
    console.error(`✘ ${file} — ${result.issues.length} problem(s):`);
    for (const issue of result.issues) console.error(`  • ${issue.path}: ${issue.message}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
