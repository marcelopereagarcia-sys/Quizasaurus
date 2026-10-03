import { useEffect, useMemo, useState } from "preact/hooks";
import examplePack from "../../examples/ciclo-del-agua.pack.json";
import type { Pack } from "../../src/pack/schema.js";
import { validatePack, validatePackJson } from "../../src/pack/validate.js";
import { type Dict, UI_LANGS, UI_LANG_NAMES, type UiLang, defaultUiLang, isUiLang, packUiLang } from "./i18n.js";
import { type AnswerRecord, type GameResult, GameRunner } from "./game/GameRunner.js";
import { type Step, mixedSteps, stepsFor } from "./game/steps.js";
import { DINOS, type Progress, dinoHue, dinoOf, emptyProgress, levelKey, loadProgress, recordGame, saveProgress } from "./progress.js";
import { Review } from "./review/Review.js";
import { type SavedRun, clearRun, loadRun, saveRun } from "./run.js";
import { BOSS_THRESHOLD_CHOICES, loadSettings, saveSettings } from "./settings.js";
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

/** `game` is the game's index in the pack, or the infinite mode. */
type Screen =
  | { name: "home" }
  | { name: "pack"; id: string }
  | { name: "play"; id: string; game: number | "mix" }
  | { name: "review"; id: string };

export function App() {
  const [lang, setLang] = useState<UiLang>(() => {
    const saved = safeStorage.get(LANG_KEY);
    return isUiLang(saved) ? saved : defaultUiLang(navigator.languages ?? [navigator.language]);
  });
  const t = UI_LANGS[lang];
  const [packs, setPacks] = useState<Pack[]>(() => loadPacks());
  // A game left halfway opens again where it was (reload, the tablet closed the app).
  const [run, setRun] = useState<SavedRun | undefined>(() => loadRun());
  const [screen, setScreen] = useState<Screen>(() => {
    const pack = run && [...BUILT_IN, ...loadPacks()].find((p) => p.id === run.packId);
    const gameExists = run && (run.game === "mix" || run.game < (pack?.games.length ?? 0));
    return pack?.review.status === "approved" && gameExists ? { name: "play", id: pack.id, game: run.game } : { name: "home" };
  });
  const [notice, setNotice] = useState<string>();
  const [settings, setSettings] = useState(() => loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
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

  // Every screen is a step in the browser history, so the phone's back button
  // goes from a game to its unit and from the unit home, without leaving the app.
  useEffect(() => {
    const home: Screen = { name: "home" };
    history.replaceState({ screen: home }, "");
    if (screen.name !== "home") {
      history.pushState({ screen: { name: "pack", id: screen.id } }, "");
      if (screen.name === "play") history.pushState({ screen }, "");
    }
    const onPop = (e: PopStateEvent) => setScreen((e.state as { screen?: Screen } | null)?.screen ?? home);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  /** Moves between screens through the browser history (see above). */
  function go(next: Screen) {
    const depth = (s: Screen) => ({ home: 0, pack: 1, play: 2, review: 2 })[s.name];
    const back = depth(screen) - depth(next);
    if (back > 0) {
      history.go(-back); // popstate shows the screen
    } else if (back === 0) {
      history.replaceState({ screen: next }, "");
      setScreen(next);
    } else {
      history.pushState({ screen: next }, "");
      setScreen(next);
    }
  }

  function onRunProgress(packId: string, game: number | "mix", state: { steps: Step[]; answers: AnswerRecord[] } | undefined) {
    if (!state) {
      setRun(undefined);
      clearRun();
    } else if (state.answers.length > 0) {
      const next = { packId, game, ...state };
      setRun(next);
      saveRun(next);
    }
  }

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
    go({ name: "home" });
  }

  function onFinish(packId: string, game: number | "mix", result: GameResult) {
    const recorded = recordGame(progress, {
      packId,
      game: game === "mix" ? undefined : game,
      correct: result.correct,
      total: result.total,
      passed: result.won,
      answers: result.answers,
    });
    setProgress(recorded.progress);
    saveProgress(recorded.progress);
    return recorded.reward;
  }

  /** The adult approved the pack, or kept their changes as a draft. */
  function onReviewed(pack: Pack, approved: boolean, texts: Dict) {
    const persisted = savePack(pack);
    setPacks(loadPacks());
    // A half-played game of the old questions would not match the new ones.
    if (run?.packId === pack.id) onRunProgress(pack.id, run.game, undefined);
    setNotice(persisted ? (approved ? texts.savedApproved : texts.savedDraft) : texts.notSaved);
    go({ name: "pack", id: pack.id });
  }

  function onBossThreshold(value: number) {
    const next = { ...settings, bossThreshold: value };
    setSettings(next);
    saveSettings(next);
  }

  function onResetProgress(question: string) {
    if (!confirm(question)) return;
    setProgress(emptyProgress());
    saveProgress(emptyProgress());
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

      {current && screen.name === "review" ? (
        <main class="screen">
          <Review pack={current} t={ui} onDone={(pack, approved) => onReviewed(pack, approved, ui)} onCancel={() => go({ name: "pack", id: current.id })} />
        </main>
      ) : current && screen.name === "play" && playable ? (
        <main class="screen">
          {screen.game === "mix" ? (
            <GameRunner
              key={`${current.id}-mix`}
              kind="mix"
              title={ui.infinite}
              makeSteps={() => mixedSteps(current.games)}
              resume={run?.packId === current.id && run.game === "mix" ? run : undefined}
              onProgress={(state) => onRunProgress(current.id, "mix", state)}
              gems={progress.gems}
              t={ui}
              hasNext={false}
              onFinish={(result) => onFinish(current.id, "mix", result)}
              onNext={() => undefined}
              onExit={() => go({ name: "pack", id: current.id })}
            />
          ) : (
            <GameRunner
              key={`${current.id}-${screen.game}`}
              kind={current.games[screen.game]!.type}
              title={current.games[screen.game]!.title}
              makeSteps={() => stepsFor(current.games[screen.game as number]!)}
              resume={run?.packId === current.id && run.game === screen.game ? run : undefined}
              onProgress={(state) => onRunProgress(current.id, screen.game, state)}
              gems={progress.gems}
              t={ui}
              bossThreshold={settings.bossThreshold}
              hasNext={screen.game + 1 < current.games.length}
              onFinish={(result) => onFinish(current.id, screen.game, result)}
              onNext={() => go({ name: "play", id: current.id, game: (screen.game as number) + 1 })}
              onExit={() => go({ name: "pack", id: current.id })}
            />
          )}
        </main>
      ) : current ? (
        <main class="screen">
          <div>
            <button class="btn small" onClick={() => go({ name: "home" })}>
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
              <span class="pill">💎 {ui.gemsPill(progress.gems)}</span>
            </div>
          </header>
          {current.review.status === "draft" && (
            <div class="warning panel">
              <p>{ui.needsReview}</p>
              <button class="btn prime" onClick={() => go({ name: "review", id: current.id })}>
                {ui.reviewOpen}
              </button>
            </div>
          )}
          <ol class="levels">
            {current.games.map((game, i) => (
              <li>
                <button class={`lvl t-${game.type}`} disabled={!playable} onClick={() => go({ name: "play", id: current.id, game: i })}>
                  <span class="li" aria-hidden="true">
                    {GAME_ICONS[game.type]}
                  </span>
                  <span class="step-n">{ui.level(i + 1)}</span>
                  <strong class="ln">{game.title}</strong>
                  {/* The template name, unless the pack already titled the game with it. */}
                  {game.title !== ui.gameNames[game.type] && <span class="ls">{ui.gameNames[game.type]}</span>}
                  <LevelFooter progress={progress} levelKey={levelKey(current.id, i)} t={ui} />
                </button>
              </li>
            ))}
            <li>
              <button class="lvl t-mix" disabled={!playable} onClick={() => go({ name: "play", id: current.id, game: "mix" })}>
                <span class="li" aria-hidden="true">
                  ♾️
                </span>
                <span class="step-n">{ui.infinite}</span>
                <strong class="ln">{ui.infiniteHint}</strong>
              </button>
            </li>
          </ol>
          <div class="actions">
            <button class="btn prime" disabled={!playable} onClick={() => go({ name: "play", id: current.id, game: 0 })}>
              {ui.play}
            </button>
            {!BUILT_IN.some((b) => b.id === current.id) && (
              <button class="btn" onClick={() => onRemove(current)}>
                {ui.remove}
              </button>
            )}
          </div>
          <FamilyCorner
            pack={current}
            scores={progress.topics[current.id] ?? {}}
            bossThreshold={settings.bossThreshold}
            t={ui}
            onBossThreshold={onBossThreshold}
            onReset={() => onResetProgress(ui.resetConfirm)}
            onEdit={() => go({ name: "review", id: current.id })}
          />
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
              <span class="pill">💎 {t.gemsPill(progress.gems)}</span>
              <span class="pill">🦖 {t.dinosPill(Math.min(progress.hatched.length, DINOS.length), DINOS.length)}</span>
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
                    <button class="lvl" lang={packUiLang(pack.language, lang)} onClick={() => go({ name: "pack", id: pack.id })}>
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

          <Collection progress={progress} t={t} />

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

/** Stars and the egg, or the dinosaur that hatched from it. */
function LevelFooter({ progress, levelKey: key, t }: { progress: Progress; levelKey: string; t: Dict }) {
  const got = progress.stars[key] ?? 0;
  const dino = dinoOf(progress, key);
  return (
    <span class="lf">
      <span class="stars" role="img" aria-label={t.starsLabel(got)}>
        {"★".repeat(got)}
        <span class="stars-empty">{"★".repeat(3 - got)}</span>
      </span>
      {dino === undefined ? (
        <span class="egg" role="img" aria-label={t.eggHint}>
          🥚
        </span>
      ) : (
        <span class="egg" role="img" aria-label={t.dinoNames[dino]} style={{ filter: dinoHue(dino) }}>
          {DINOS[dino]}
        </span>
      )}
    </span>
  );
}

function Collection({ progress, t }: { progress: Progress; t: Dict }) {
  return (
    <section class="panel collection" aria-labelledby="collection-title">
      <div class="sec-h">
        <h2 id="collection-title">{t.collectionTitle}</h2>
        <p>{t.collectionHint}</p>
      </div>
      <ul class="dinos">
        {DINOS.map((emoji, i) => {
          const got = i < progress.hatched.length;
          return (
            <li class={`dslot ${got ? "" : "locked"}`}>
              <span class="de" style={got ? { filter: dinoHue(i) } : undefined} aria-hidden="true">
                {got ? emoji : "🥚"}
              </span>
              <span class="dn">{got ? t.dinoNames[i] : "???"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FamilyCorner(props: {
  pack: Pack;
  scores: Record<string, { right: number; wrong: number }>;
  bossThreshold: number;
  t: Dict;
  onBossThreshold: (value: number) => void;
  onReset: () => void;
  onEdit: () => void;
}) {
  const { pack, scores, bossThreshold, t } = props;
  const answered = pack.topics.filter((topic) => scores[topic.id]);
  return (
    <details class="panel parents">
      <summary>{t.familyCorner}</summary>
      <div class="pbody">
        <h3>{t.topicsTitle}</h3>
        {answered.length === 0 ? (
          <p>{t.noAnswersYet}</p>
        ) : (
          <ul class="topics">
            {answered.map((topic) => {
              const { right, wrong } = scores[topic.id]!;
              const total = right + wrong;
              return (
                <li class="topic">
                  <span>{topic.name}</span>
                  <span class="bar" aria-hidden="true">
                    <i style={{ width: `${(right / total) * 100}%` }} />
                  </span>
                  <span class="tn">{t.topicScore(right, total)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <label class="row">
          {t.bossThresholdLabel}
          <select class="pill" value={String(bossThreshold)} onChange={(e) => props.onBossThreshold(Number((e.currentTarget as HTMLSelectElement).value))}>
            {BOSS_THRESHOLD_CHOICES.map((c) => (
              <option value={String(c)}>{Math.round(c * 100)} %</option>
            ))}
          </select>
        </label>
        <div class="actions">
          <button class="btn small" onClick={props.onEdit}>
            {t.reviewEdit}
          </button>
          <button class="btn small" onClick={props.onReset}>
            {t.resetProgress}
          </button>
        </div>
      </div>
    </details>
  );
}

function StatusBadge({ pack, t }: { pack: Pack; t: Dict }) {
  const approved = pack.review.status === "approved";
  return <span class={`badge ${approved ? "ok" : "pending"}`}>{approved ? t.approved : t.draft}</span>;
}
