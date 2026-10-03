/**
 * Generates a draft pack from the text of a unit.
 *
 *   npm run generate -- private/unit.pdf.txt --grade 3
 *   npm run generate -- private/unit.pdf.txt --grade 3 --lang ca --out private/unit.pack.json
 *
 * The input is the text written by `npm run extract`. The pack is written next
 * to it (inside private/) as a draft: an adult must review it before playing.
 */
import "./node-setup.js";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import { loadEnvFile, providerFromEnv } from "../ai/config.js";
import { GenerationError, detectLanguage, generatePack, stripPageMarkers } from "../generate/generate.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    grade: { type: "string", default: "3" },
    stage: { type: "string", default: "primary" },
    lang: { type: "string" },
    out: { type: "string" },
  },
});
const input = positionals[0];
const stage = values.stage === "secondary" ? "secondary" : "primary";
const year = Number(values.grade);
if (!input || !Number.isInteger(year) || year < 1 || year > 6) {
  console.error("Usage: npm run generate -- <unit.txt> [--grade 1-6] [--stage primary|secondary] [--lang ca|es|en] [--out pack.json]");
  process.exit(2);
}

loadEnvFile();
const provider = await providerFromEnv(process.env, "text");
const text = await readFile(input, "utf8");
const language = values.lang ?? detectLanguage(stripPageMarkers(text));
const where = provider.local ? "local" : "cloud: the unit text is sent to this provider";
console.log(`Generating with ${provider.id}/${provider.model} (${where}), language ${language}, ${stage} year ${year}…`);

try {
  const result = await generatePack(text, {
    provider,
    language,
    grade: { stage, year },
    onAttempt: (n, issues) =>
      console.log(issues.length ? `attempt ${n}: ${issues.length} problem(s), e.g. ${issues[0]?.path}: ${issues[0]?.message}` : `attempt ${n}: valid`),
  });
  const out = values.out ?? input.replace(/(\.pdf)?\.txt$/u, "") + ".pack.json";
  await writeFile(out, JSON.stringify(result.pack, null, 2) + "\n", "utf8");
  const games = result.pack.games.map((g) => `${g.type}(${"items" in g ? g.items.length : "rounds" in g ? g.rounds.length : g.questions.length})`);
  console.log(
    `✔ ${basename(out)}: ${games.join(", ")}; ${result.pack.topics.length} topics; ` +
      `${result.attempts} attempt(s), ${result.seconds.toFixed(0)} s, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens`,
  );
  console.log("It is a draft: review it before a child plays it.");
} catch (error) {
  // Generation and provider failures (busy service, bad key…) are explained, not dumped as a stack trace.
  console.error(`✘ ${(error as Error).message}`);
  if (!(error instanceof GenerationError)) {
    console.error(`  If the provider is busy, try again later or set another model in .env (${provider.id}).`);
  }
  process.exitCode = 1;
}
