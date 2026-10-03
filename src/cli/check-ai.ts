/**
 * Checks that the providers configured in .env answer.
 *
 *   npm run check-ai
 *
 * Sends one short text request (AI_PROVIDER) and one image request
 * (VISION_PROVIDER), and reports model, time and tokens.
 */
import "./node-setup.js";
import { createCanvas } from "@napi-rs/canvas";
import { type ProviderRole, loadEnvFile, providerFromEnv } from "../ai/config.js";
import { ProviderConfigError } from "../ai/provider.js";

loadEnvFile();

const CHECK_WORD = "DINOSAURE";

function wordImage(): Uint8Array {
  const canvas = createCanvas(600, 160);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 600, 160);
  ctx.fillStyle = "#111";
  ctx.font = "64px sans-serif";
  ctx.fillText(CHECK_WORD, 40, 105);
  return canvas.toBuffer("image/png");
}

let failed = false;
for (const role of ["text", "vision"] as ProviderRole[]) {
  try {
    const provider = await providerFromEnv(process.env, role);
    const result = await provider.complete(
      role === "text"
        ? { prompt: 'Answer with this JSON and nothing else: {"ok": true}', json: true, maxTokens: 200 }
        : { prompt: "Which word is written in the image? Answer with the word only.", images: [wordImage()], maxTokens: 200 },
    );
    const answer = result.text.trim();
    const ok = role === "text" ? /"ok"\s*:\s*true/.test(answer) : answer.toUpperCase().includes(CHECK_WORD);
    const tokens = result.usage ? `${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens` : "no token count";
    const where = provider.local ? "local" : "cloud";
    console.log(`${ok ? "✔" : "✘"} ${role}: ${provider.id}/${provider.model} (${where}), ${result.seconds.toFixed(1)} s, ${tokens} → ${JSON.stringify(answer.slice(0, 60))}`);
    failed ||= !ok;
  } catch (error) {
    failed = true;
    const prefix = error instanceof ProviderConfigError ? "setup" : "error";
    console.error(`✘ ${role}: ${prefix}: ${(error as Error).message}`);
  }
}
process.exitCode = failed ? 1 : 0;
