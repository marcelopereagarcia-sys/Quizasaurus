/**
 * Builds the configured providers from environment variables (`.env`).
 * Keys are only ever read from the environment, never from code.
 */
import { DEFAULT_ANTHROPIC_MODEL, anthropicProvider } from "./anthropic.js";
import { availableGeminiModels, geminiProvider } from "./gemini.js";
import { installedOllamaModels, ollamaProvider } from "./ollama.js";
import { openaiProvider } from "./openai.js";
import { type AIProvider, PROVIDER_IDS, type ProviderId, ProviderConfigError } from "./provider.js";

export const DEFAULT_OLLAMA_VISION_MODEL = "qwen2.5vl:7b";

/** "text" writes the packs; "vision" reads scans and photos (local by default, ADR-0002). */
export type ProviderRole = "text" | "vision";

type Env = Record<string, string | undefined>;

export async function providerFromEnv(env: Env, role: ProviderRole): Promise<AIProvider> {
  const variable = role === "text" ? "AI_PROVIDER" : "VISION_PROVIDER";
  const id = (env[variable]?.trim() || "ollama").toLowerCase();
  if (!(PROVIDER_IDS as readonly string[]).includes(id)) {
    throw new ProviderConfigError(`${variable}="${id}" is not supported. Use one of: ${PROVIDER_IDS.join(", ")}.`);
  }

  switch (id as ProviderId) {
    case "ollama": {
      const model =
        role === "vision" ? env.OLLAMA_VISION_MODEL?.trim() || DEFAULT_OLLAMA_VISION_MODEL : env.OLLAMA_MODEL?.trim();
      if (!model) {
        const installed = await installedOllamaModels(env.OLLAMA_HOST);
        throw new ProviderConfigError(
          "Set OLLAMA_MODEL in .env to the local model that writes the packs." +
            (installed.length ? ` Installed models: ${installed.join(", ")}.` : " Run `ollama list` to see your models."),
        );
      }
      return ollamaProvider({ host: env.OLLAMA_HOST, model });
    }
    case "anthropic":
      return anthropicProvider({
        apiKey: required(env, "ANTHROPIC_API_KEY", variable, id),
        model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
      });
    case "openai":
      return openaiProvider({ apiKey: required(env, "OPENAI_API_KEY", variable, id), model: required(env, "OPENAI_MODEL", variable, id) });
    case "gemini": {
      const apiKey = required(env, "GEMINI_API_KEY", variable, id);
      const model = env.GEMINI_MODEL?.trim();
      if (!model) {
        const available = await availableGeminiModels(apiKey);
        throw new ProviderConfigError(
          `${variable}=gemini needs GEMINI_MODEL in .env (see .env.example).` +
            (available.length ? ` Models available for your key: ${available.join(", ")}.` : ""),
        );
      }
      return geminiProvider({ apiKey, model });
    }
  }
}

function required(env: Env, name: string, variable: string, id: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ProviderConfigError(`${variable}=${id} needs ${name} in .env (see .env.example).`);
  return value;
}

/** Loads `.env` from the working directory into process.env, if the file exists. */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: defaults apply (local Ollama).
  }
}
