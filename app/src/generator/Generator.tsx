import { useState } from "preact/hooks";
import type { InputFile } from "../../../src/extract/extract.js";
import type { Pack } from "../../../src/pack/schema.js";
import type { Dict } from "../i18n.js";
import {
  type AiSettings,
  type GenerationProblem,
  type Progress,
  type StepName,
  WEB_PROVIDERS,
  type WebProvider,
  buildProvider,
  classifyError,
  forgetKey,
  generateFromFiles,
  loadAiSettings,
  prepareFile,
  saveAiSettings,
} from "./pipeline.js";

interface Props {
  t: Dict;
  /** The generated pack, a draft that goes straight to the adult review. */
  onGenerated: (pack: Pack) => void;
  onCancel: () => void;
}

/** Where each provider gives out keys (Gemini's is free). */
const KEY_HELP: Partial<Record<WebProvider, string>> = {
  gemini: "https://aistudio.google.com/apikey",
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

/** Who receives the data, as named in the privacy notes (brand names, the same in every language). */
const RECIPIENT: Record<WebProvider, string> = { gemini: "Google (Gemini)", anthropic: "Anthropic (Claude)", openai: "OpenAI", ollama: "Ollama" };

const GRADES = [
  ...[1, 2, 3, 4, 5, 6].map((year) => ({ stage: "primary" as const, year })),
  ...[1, 2, 3, 4].map((year) => ({ stage: "secondary" as const, year })),
];

const STEPS: StepName[] = ["read", "generate", "validate"];

type Phase = { name: "form" } | { name: "working"; progress: Progress } | { name: "failed"; problem: GenerationProblem; detail: string };

/** The web generator (QZS-21): files, year, language and provider, then three steps with progress. */
export default function Generator({ t, onGenerated, onCancel }: Props) {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings());
  const [files, setFiles] = useState<File[]>([]);
  const [grade, setGrade] = useState(2); // 3.º de primaria
  const [language, setLanguage] = useState<"auto" | "ca" | "es" | "en">("auto");
  const [privacyOk, setPrivacyOk] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "form" });

  const provider = settings.provider;
  const providerName = RECIPIENT[provider];
  const cloud = provider !== "ollama";

  function change(next: AiSettings) {
    setSettings(next);
    saveAiSettings(next);
  }

  async function start(e: Event) {
    e.preventDefault();
    setPhase({ name: "working", progress: { step: "read" } });
    try {
      const ai = buildProvider(settings);
      const inputs: InputFile[] = await Promise.all(files.map(prepareFile));
      const pack = await generateFromFiles({
        files: inputs,
        language: language === "auto" ? undefined : language,
        grade: GRADES[grade]!,
        provider: ai,
        onProgress: (progress) => setPhase({ name: "working", progress }),
      });
      onGenerated(pack);
    } catch (error) {
      setPhase({ name: "failed", problem: classifyError(error), detail: error instanceof Error ? error.message : String(error) });
    }
  }

  if (phase.name === "working") return <Working t={t} progress={phase.progress} />;

  return (
    <form class="generator" onSubmit={start}>
      <header class="panel review-head">
        <h2>{t.genTitle}</h2>
        <p>{t.genIntro}</p>
      </header>

      {phase.name === "failed" && (
        <div class="panel review-issues" role="alert">
          <strong>{t.genProblems[phase.problem]}</strong>
          <details>
            <summary>{t.genDetail}</summary>
            <p class="detail">{phase.detail}</p>
          </details>
        </div>
      )}

      <section class="panel qcard">
        <div class="field">
          <span>{t.genFiles}</span>
          {/* A button like "Load a pack": the browser's own file box forgets the files when the form redraws. */}
          <label class="btn file">
            {t.genPick}
            <input type="file" multiple accept="application/pdf,.pdf,image/*" onChange={(e) => setFiles([...((e.currentTarget as HTMLInputElement).files ?? [])])} />
          </label>
          <small class="hint">{t.genFilesHint}</small>
        </div>
        {files.length > 0 && (
          <ul class="file-list">
            {files.map((f) => (
              <li>{f.name}</li>
            ))}
          </ul>
        )}
        <div class="row">
          <label class="field">
            <span>{t.genGrade}</span>
            <select value={String(grade)} onChange={(e) => setGrade(Number((e.currentTarget as HTMLSelectElement).value))}>
              {GRADES.map((g, i) => (
                <option value={String(i)}>{t.gradeName(g.stage, g.year)}</option>
              ))}
            </select>
          </label>
          <label class="field">
            <span>{t.genLanguage}</span>
            <select value={language} onChange={(e) => setLanguage((e.currentTarget as HTMLSelectElement).value as typeof language)}>
              <option value="auto">{t.genLanguageAuto}</option>
              {(["ca", "es", "en"] as const).map((l) => (
                <option value={l}>{t.langNames[l]}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section class="panel qcard">
        <label class="field">
          <span>{t.genProvider}</span>
          <select
            value={provider}
            onChange={(e) => {
              change({ ...settings, provider: (e.currentTarget as HTMLSelectElement).value as WebProvider });
              setPrivacyOk(false);
            }}
          >
            {WEB_PROVIDERS.map((p) => (
              <option value={p}>{t.providerNames[p]}</option>
            ))}
          </select>
        </label>
        <label class="field">
          <span>{t.genModel}</span>
          <input
            value={settings.models[provider]}
            placeholder={provider === "ollama" ? "gpt-oss:20b" : provider === "openai" ? "gpt-…" : ""}
            onInput={(e) => change({ ...settings, models: { ...settings.models, [provider]: (e.currentTarget as HTMLInputElement).value } })}
          />
        </label>
        {cloud ? (
          <>
            <label class="field">
              <span>{t.genKey}</span>
              <input
                type="password"
                autoComplete="off"
                spellcheck={false}
                value={settings.keys[provider] ?? ""}
                onInput={(e) => change({ ...settings, keys: { ...settings.keys, [provider]: (e.currentTarget as HTMLInputElement).value } })}
              />
              <small class="hint">{t.genKeyNote(providerName)}</small>
            </label>
            <div class="actions">
              {KEY_HELP[provider] && (
                <a class="btn small" href={KEY_HELP[provider]} target="_blank" rel="noopener noreferrer">
                  {t.genKeyHelp} ↗
                </a>
              )}
              {settings.keys[provider] && (
                <button class="btn small" type="button" onClick={() => change(forgetKey(settings, provider))}>
                  {t.genForgetKey}
                </button>
              )}
            </div>
            <label class="row privacy">
              <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk((e.currentTarget as HTMLInputElement).checked)} />
              <span>{t.genPrivacy(providerName)}</span>
            </label>
          </>
        ) : (
          <label class="field">
            <span>{t.genOllamaHost}</span>
            <input value={settings.ollamaHost} onInput={(e) => change({ ...settings, ollamaHost: (e.currentTarget as HTMLInputElement).value })} />
            <small class="hint">{t.genOllamaNote(location.origin)}</small>
          </label>
        )}
      </section>

      <div class="actions">
        <button class="btn prime" type="submit" disabled={files.length === 0 || (cloud && !privacyOk)}>
          {phase.name === "failed" ? t.genTryAgain : t.genStart}
        </button>
        <button class="btn" type="button" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function Working({ t, progress }: { t: Dict; progress: Progress }) {
  const current = STEPS.indexOf(progress.step);
  return (
    <section class="panel gen-progress" aria-live="polite">
      <h2>{t.genTitle}</h2>
      <ol class="gen-steps">
        {STEPS.map((step, i) => (
          <li class={i < current ? "done" : i === current ? "now" : ""}>
            <span class="slot-number">{i < current ? "✓" : i + 1}</span>
            <span>
              <strong>{t.genSteps[step]}</strong>
              {i === current && progress.page && <small>{t.genPage(progress.page.done, progress.page.total)}</small>}
              {i === current && progress.attempt && progress.attempt.n > 1 && <small>{t.genAttempt(progress.attempt.n, progress.attempt.max)}</small>}
            </span>
          </li>
        ))}
      </ol>
      <div class="prog" aria-hidden="true">
        {STEPS.map((_, i) => (
          <i class={i < current ? "ok" : i === current ? "cur" : ""} />
        ))}
      </div>
      <p class="hint">{t.genWorking}</p>
    </section>
  );
}
