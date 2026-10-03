import { useEffect, useMemo, useState } from "preact/hooks";
import examplePack from "../../examples/ciclo-del-agua.pack.json";
import type { Pack } from "../../src/pack/schema.js";
import { validatePack, validatePackJson } from "../../src/pack/validate.js";
import { UI_LANGS, UI_LANG_NAMES, type UiLang, defaultUiLang, isUiLang } from "./i18n.js";
import { loadPacks, removePack, safeStorage, savePack } from "./storage.js";

const LANG_KEY = "quizasaurus.uiLang";

/** Packs that ship with the app: our own content, always available offline. */
const BUILT_IN: Pack[] = [examplePack].flatMap((p) => {
  const result = validatePack(p);
  return result.ok ? [result.pack] : [];
});

const GAME_ICONS: Record<Pack["games"][number]["type"], string> = {
  classify: "🧺",
  order: "🔢",
  choice: "🤔",
  yesno: "👍",
  boss: "🦖",
};

type Screen = { name: "home" } | { name: "pack"; id: string };

export function App() {
  const [lang, setLang] = useState<UiLang>(() => {
    const saved = safeStorage.get(LANG_KEY);
    return isUiLang(saved) ? saved : defaultUiLang(navigator.languages ?? [navigator.language]);
  });
  const t = UI_LANGS[lang];
  const [packs, setPacks] = useState<Pack[]>(() => loadPacks());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [notice, setNotice] = useState<string>();

  const allPacks = useMemo(() => [...BUILT_IN.filter((b) => !packs.some((p) => p.id === b.id)), ...packs], [packs]);

  useEffect(() => {
    document.documentElement.lang = lang;
    safeStorage.set(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    const ready = () => setNotice(t.offlineReady);
    document.addEventListener("quizasaurus:offline-ready", ready);
    return () => document.removeEventListener("quizasaurus:offline-ready", ready);
  }, [t]);

  async function onFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const result = validatePackJson(await file.text());
    if (!result.ok) {
      setNotice(t.loadError(result.issues.length));
      return;
    }
    const persisted = savePack(result.pack);
    setPacks(loadPacks());
    setNotice(persisted ? t.loaded(result.pack.title) : t.notSaved);
  }

  function onRemove(pack: Pack) {
    if (!confirm(t.removeConfirm(pack.title))) return;
    removePack(pack.id);
    setPacks(loadPacks());
    setScreen({ name: "home" });
  }

  const current = screen.name === "pack" ? allPacks.find((p) => p.id === screen.id) : undefined;

  return (
    <div class="app">
      <header class="topbar">
        <h1 class="logo">
          <span aria-hidden="true">🦖</span> Quizasaurus
        </h1>
        <label class="lang">
          <span class="sr-only">{t.language}</span>
          <select value={lang} onChange={(e) => setLang((e.currentTarget as HTMLSelectElement).value as UiLang)}>
            {(Object.keys(UI_LANGS) as UiLang[]).map((l) => (
              <option value={l}>{UI_LANG_NAMES[l]}</option>
            ))}
          </select>
        </label>
      </header>

      {notice && (
        <p class="notice" role="status" onClick={() => setNotice(undefined)}>
          {notice}
        </p>
      )}

      {current ? (
        <main class="screen">
          <button class="link" onClick={() => setScreen({ name: "home" })}>
            {t.back}
          </button>
          <h2>{current.title}</h2>
          <p class="meta">
            {current.subject} · <StatusBadge pack={current} t={t} />
          </p>
          {current.review.status === "draft" && <p class="warning">{t.needsReview}</p>}
          <ol class="games">
            {current.games.map((game) => (
              <li class={`game game-${game.type}`}>
                <span class="game-icon" aria-hidden="true">
                  {GAME_ICONS[game.type]}
                </span>
                <span>
                  <strong>{game.title}</strong>
                  <small>{t.gameNames[game.type]}</small>
                </span>
              </li>
            ))}
          </ol>
          <div class="actions">
            <button class="primary" disabled={current.review.status !== "approved"}>
              {t.play}
            </button>
            {!BUILT_IN.some((b) => b.id === current.id) && (
              <button class="secondary" onClick={() => onRemove(current)}>
                {t.remove}
              </button>
            )}
          </div>
        </main>
      ) : (
        <main class="screen">
          <p class="tagline">{t.appTagline}</p>
          <h2>{t.myPacks}</h2>
          {allPacks.length === 0 && <p>{t.noPacks}</p>}
          <ul class="packs">
            {allPacks.map((pack) => (
              <li>
                <button class="pack-card" onClick={() => setScreen({ name: "pack", id: pack.id })}>
                  <strong>{pack.title}</strong>
                  <span>{pack.subject}</span>
                  <span>
                    {t.games(pack.games.length)} · <StatusBadge pack={pack} t={t} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <label class="primary file">
            {t.loadPack}
            <input type="file" accept="application/json,.json" onChange={onFile} />
          </label>
        </main>
      )}
    </div>
  );
}

function StatusBadge({ pack, t }: { pack: Pack; t: (typeof UI_LANGS)[UiLang] }) {
  const approved = pack.review.status === "approved";
  return <span class={`badge ${approved ? "ok" : "pending"}`}>{approved ? t.approved : t.draft}</span>;
}
