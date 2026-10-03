import { useEffect, useMemo, useState } from "preact/hooks";
import examplePack from "../../examples/ciclo-del-agua.pack.json";
import type { Pack } from "../../src/pack/schema.js";
import { validatePack, validatePackJson } from "../../src/pack/validate.js";
import { type Dict, UI_LANGS, UI_LANG_NAMES, type UiLang, defaultUiLang, isUiLang, packUiLang } from "./i18n.js";
import { GameRunner } from "./game/GameRunner.js";
import { loadSettings } from "./settings.js";
import { SKINS, SKIN_EMOJI, type Skin, applySkin, loadSkin, saveSkin } from "./skins.js";
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

type Screen = { name: "home" } | { name: "pack"; id: string } | { name: "play"; id: string; game: number };

export function App() {
  const [lang, setLang] = useState<UiLang>(() => {
    const saved = safeStorage.get(LANG_KEY);
    return isUiLang(saved) ? saved : defaultUiLang(navigator.languages ?? [navigator.language]);
  });
  const t = UI_LANGS[lang];
  const [packs, setPacks] = useState<Pack[]>(() => loadPacks());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [notice, setNotice] = useState<string>();
  const [settings] = useState(() => loadSettings());
  // Applied before the first paint, so the page never flashes the other skin.
  const [skin, setSkin] = useState<Skin>(() => {
    const saved = loadSkin();
    applySkin(saved);
    return saved;
  });

  const allPacks = useMemo(() => [...BUILT_IN.filter((b) => !packs.some((p) => p.id === b.id)), ...packs], [packs]);

  useEffect(() => {
    safeStorage.set(LANG_KEY, lang);
  }, [lang]);

  function chooseSkin(next: Skin) {
    applySkin(next);
    saveSkin(next);
    setSkin(next);
  }

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

  const current = screen.name !== "home" ? allPacks.find((p) => p.id === screen.id) : undefined;
  const playable = current?.review.status === "approved";
  // Inside a unit everything speaks the pack's language (charter v1.3).
  const screenLang = current ? packUiLang(current.language, lang) : lang;
  const ui = UI_LANGS[screenLang];

  useEffect(() => {
    document.documentElement.lang = screenLang;
  }, [screenLang]);

  return (
    <div class="app">
      {notice && (
        <div class="notice panel" role="status">
          <p>{notice}</p>
          <button class="close" aria-label={ui.close} onClick={() => setNotice(undefined)}>
            ✕
          </button>
        </div>
      )}

      {current && screen.name === "play" && playable ? (
        <main class="screen">
          <GameRunner
            key={`${current.id}-${screen.game}`}
            game={current.games[screen.game]!}
            t={ui}
            bossThreshold={settings.bossThreshold}
            hasNext={screen.game + 1 < current.games.length}
            onFinish={() => undefined}
            onNext={() => setScreen({ name: "play", id: current.id, game: screen.game + 1 })}
            onExit={() => setScreen({ name: "pack", id: current.id })}
          />
        </main>
      ) : current ? (
        <main class="screen">
          <div>
            <button class="btn small" onClick={() => setScreen({ name: "home" })}>
              {ui.back}
            </button>
          </div>
          <header class="sign">
            <h1>{current.title}</h1>
            <p class="sub">{current.subject}</p>
            <div class="sign-row">
              <span class="pill">{ui.games(current.games.length)}</span>
              <span class="pill">
                <StatusBadge pack={current} t={ui} />
              </span>
            </div>
          </header>
          {current.review.status === "draft" && <p class="warning panel">{ui.needsReview}</p>}
          <ol class="levels">
            {current.games.map((game, i) => (
              <li>
                <button class={`lvl t-${game.type}`} disabled={!playable} onClick={() => setScreen({ name: "play", id: current.id, game: i })}>
                  <span class="li" aria-hidden="true">
                    {GAME_ICONS[game.type]}
                  </span>
                  <span class="step-n">{ui.level(i + 1)}</span>
                  <strong class="ln">{game.title}</strong>
                  {/* The template name, unless the pack already titled the game with it. */}
                  {game.title !== ui.gameNames[game.type] && <span class="ls">{ui.gameNames[game.type]}</span>}
                </button>
              </li>
            ))}
          </ol>
          <div class="actions">
            <button class="btn prime" disabled={!playable} onClick={() => setScreen({ name: "play", id: current.id, game: 0 })}>
              {ui.play}
            </button>
            {!BUILT_IN.some((b) => b.id === current.id) && (
              <button class="btn" onClick={() => onRemove(current)}>
                {ui.remove}
              </button>
            )}
          </div>
          <div class="ground" aria-hidden="true" />
        </main>
      ) : (
        <main class="screen">
          <header class="sign">
            <h1>
              <img src="./logo.png" width="56" height="56" alt="" /> Quizasaurus
            </h1>
            <p class="sub">{t.appTagline}</p>
            <div class="sign-row">
              <label class="pill">
                <span class="sr-only">{t.language}</span>
                <select value={lang} onChange={(e) => setLang((e.currentTarget as HTMLSelectElement).value as UiLang)}>
                  {(Object.keys(UI_LANGS) as UiLang[]).map((l) => (
                    <option value={l}>{UI_LANG_NAMES[l]}</option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          <section aria-labelledby="skins-title">
            <div class="sec-h">
              <h2 id="skins-title">{t.skinTitle}</h2>
            </div>
            <div class="worlds">
              {SKINS.map((s) => (
                // Each tab wears its own skin, so the child sees what they pick.
                <button class="wtab" data-skin={s} aria-pressed={s === skin} onClick={() => chooseSkin(s)}>
                  <span class="wi" aria-hidden="true">
                    {SKIN_EMOJI[s]}
                  </span>
                  <span class="wn">{t.skinNames[s]}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="packs-title">
            <div class="sec-h">
              <h2 id="packs-title">{t.myPacks}</h2>
            </div>
            {allPacks.length === 0 && <p>{t.noPacks}</p>}
            <ul class="levels">
              {allPacks.map((pack) => {
                // A unit's card speaks the unit's language, like the unit itself.
                const pt = UI_LANGS[packUiLang(pack.language, lang)];
                return (
                  <li>
                    <button class="lvl" lang={packUiLang(pack.language, lang)} onClick={() => setScreen({ name: "pack", id: pack.id })}>
                      <span class="li" aria-hidden="true">
                        📚
                      </span>
                      <span class="step-n">{pack.subject}</span>
                      <strong class="ln">{pack.title}</strong>
                      <span class="ls">
                        {pt.games(pack.games.length)} · <StatusBadge pack={pack} t={pt} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div>
            <label class="btn prime file">
              {t.loadPack}
              <input type="file" accept="application/json,.json" onChange={onFile} />
            </label>
          </div>
          <div class="ground" aria-hidden="true" />
        </main>
      )}
    </div>
  );
}

function StatusBadge({ pack, t }: { pack: Pack; t: Dict }) {
  const approved = pack.review.status === "approved";
  return <span class={`badge ${approved ? "ok" : "pending"}`}>{approved ? t.approved : t.draft}</span>;
}
