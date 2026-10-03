import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Game } from "../../../src/pack/schema.js";
import type { Dict } from "../i18n.js";
import { type Answer, DEFAULT_BOSS_THRESHOLD, type Step, bossBeaten, isCorrect, rightAnswerLabel, stars, stepsFor } from "./steps.js";

export interface AnswerRecord {
  topic: string;
  correct: boolean;
}

export interface GameResult {
  type: Game["type"];
  correct: number;
  total: number;
  answers: AnswerRecord[];
  won: boolean;
}

interface Props {
  game: Game;
  t: Dict;
  bossThreshold?: number;
  hasNext: boolean;
  onFinish: (result: GameResult) => void;
  onNext: () => void;
  onExit: () => void;
}

type Phase = { name: "ask" } | { name: "feedback"; ok: boolean } | { name: "done" };

/** How long a right answer is celebrated before moving on. */
const PRAISE_MS = 1100;

export function GameRunner({ game, t, bossThreshold = DEFAULT_BOSS_THRESHOLD, hasNext, onFinish, onNext, onExit }: Props) {
  const [round, setRound] = useState(0);
  // A new shuffle every time the game is (re)started.
  const steps = useMemo(() => stepsFor(game), [game, round]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "ask" });
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [praise, setPraise] = useState(0);
  const [chosen, setChosen] = useState<Answer | undefined>(undefined);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = steps[index];
  const correct = answers.filter((a) => a.correct).length;
  const isBoss = game.type === "boss";
  const needed = Math.ceil(steps.length * bossThreshold);

  function answer(value: Answer) {
    if (!step || phase.name !== "ask") return;
    const ok = isCorrect(step, value);
    setChosen(value);
    setAnswers((prev) => [...prev, { topic: step.topic, correct: ok }]);
    setPraise(Math.floor(Math.random() * t.right.length));
    setPhase({ name: "feedback", ok });
  }

  function advance() {
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      setChosen(undefined);
      setPhase({ name: "ask" });
    } else {
      setPhase({ name: "done" });
    }
  }

  useEffect(() => {
    if (phase.name === "feedback" && phase.ok) {
      const timer = setTimeout(advance, PRAISE_MS);
      return () => clearTimeout(timer);
    }
    if (phase.name === "feedback") {
      // On a phone the explanation and "Next" fall below the screen: bring them
      // into view. `autofocus` does not work here, the option keeps the focus.
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
      nextRef.current?.focus({ preventScroll: true });
    }
    if (phase.name === "done") {
      onFinish({ type: game.type, correct, total: steps.length, answers, won: !isBoss || bossBeaten(correct, steps.length, bossThreshold) });
    }
    return undefined;
  }, [phase]);

  function restart() {
    setRound(round + 1);
    setIndex(0);
    setAnswers([]);
    setChosen(undefined);
    setPhase({ name: "ask" });
  }

  if (phase.name === "done") {
    const won = !isBoss || bossBeaten(correct, steps.length, bossThreshold);
    // Losing to the boss never shows more than one star, whatever the threshold.
    const starCount = won ? stars(correct, steps.length) : Math.min(stars(correct, steps.length), 1);
    return (
      <section class="results panel" aria-live="polite">
        <h2>{t.results}</h2>
        <p class="stars" role="img" aria-label={t.starsLabel(starCount)}>
          {"⭐".repeat(starCount)}
          <span class="stars-empty">{"☆".repeat(3 - starCount)}</span>
        </p>
        <p class="score">{t.score(correct, steps.length)}</p>
        {isBoss && <p class={won ? "boss-win" : "boss-lose"}>{won ? t.bossWin : t.bossLose(needed)}</p>}
        <div class="actions">
          {hasNext && won && (
            <button class="btn prime" onClick={onNext}>
              {t.nextGame}
            </button>
          )}
          <button class={hasNext && won ? "btn" : "btn prime"} onClick={restart}>
            {t.playAgain}
          </button>
          <button class="btn" onClick={onExit}>
            {t.finish}
          </button>
        </div>
      </section>
    );
  }

  if (!step) return null;

  return (
    <section class={`game-screen game-${game.type}`}>
      <div class="hud">
        <button class="btn small" onClick={onExit}>
          {t.exitGame}
        </button>
        <div class="ht">
          <h2>{game.title}</h2>
          {game.title !== t.gameNames[game.type] && <span>{t.gameNames[game.type]}</span>}
        </div>
      </div>
      {/* One block per question: right, wrong, the current one, and those to come. */}
      <div class="prog" role="progressbar" aria-label={t.questionOf(index + 1, steps.length)} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
        {steps.map((_, i) => (
          <i class={i < answers.length ? (answers[i]!.correct ? "ok" : "bad") : i === index ? "cur" : ""} />
        ))}
      </div>

      {isBoss && (
        <div class="boss-bar" role="meter" aria-label={t.bossLife} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={steps.length - correct}>
          <span class="boss-face" aria-hidden="true">
            🦖
          </span>
          <span class="boss-life">
            <span style={{ width: `${((steps.length - correct) / steps.length) * 100}%` }} />
          </span>
        </div>
      )}

      <div class="stage panel">
        {step.kind === "pick" && (
          <PickView step={step} t={t} disabled={phase.name !== "ask"} chosen={phase.name === "feedback" ? chosen : undefined} onAnswer={answer} />
        )}
        {step.kind === "order" && <OrderView key={`${round}-${index}`} step={step} t={t} disabled={phase.name !== "ask"} onAnswer={answer} />}
        {step.kind === "swipe" && <SwipeView key={`${round}-${index}`} step={step} t={t} disabled={phase.name !== "ask"} onAnswer={answer} />}

        {phase.name === "feedback" && (
          <div ref={feedbackRef} class={`feedback ${phase.ok ? "ok" : "ko"}`} role="status" aria-live="assertive">
            {phase.ok ? (
              <p class="praise">{t.right[praise]}</p>
            ) : (
              <>
                <p class="feedback-title">{t.wrong}</p>
                <p>
                  {t.rightAnswer}: <strong>{rightAnswerLabel(step, t.yes, t.no)}</strong>
                </p>
                <p>{step.explanation}</p>
                <blockquote class="book-quote">
                  <span>{t.bookSays}:</span> {t.quote(step.source)}
                </blockquote>
                <button ref={nextRef} class="btn prime" onClick={advance}>
                  {t.next}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type ViewProps<K extends Step["kind"]> = { step: Extract<Step, { kind: K }>; t: Dict; disabled: boolean; onAnswer: (a: Answer) => void };

/** After answering, the right option turns green and a wrong choice red. */
function revealClass(step: Extract<Step, { kind: "pick" }>, id: string, chosen: Answer | undefined): string {
  if (chosen === undefined) return "";
  if (step.correct.includes(id)) return "is-correct";
  return id === chosen ? "is-wrong" : "is-dimmed";
}

function PickView({ step, t, disabled, chosen, onAnswer }: ViewProps<"pick"> & { chosen: Answer | undefined }) {
  return (
    <div class="pick">
      {step.card && (
        <div class="card">
          {step.card.emoji && <span class="card-emoji">{step.card.emoji}</span>}
          {step.card.text && <span class="card-text">{step.card.text}</span>}
        </div>
      )}
      <p class="prompt">{step.layout === "bins" ? t.whereDoesItGo : step.prompt}</p>
      <div class={`options ${step.layout}`}>
        {step.options.map((o) => (
          <button class={`option ${revealClass(step, o.id, chosen)}`} disabled={disabled} onClick={() => onAnswer(o.id)}>
            {o.emoji && <span class="option-emoji">{o.emoji}</span>}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderView({ step, t, disabled, onAnswer }: ViewProps<"order">) {
  const [chosen, setChosen] = useState<string[]>([]);
  const byId = (id: string) => step.items.find((i) => i.id === id)!;
  return (
    <div class="order">
      <p class="prompt">{step.prompt}</p>
      <ol class="slots" aria-label={t.tapInOrder}>
        {step.items.map((_, i) => {
          const id = chosen[i];
          const item = id === undefined ? undefined : byId(id);
          return (
            <li class={`slot ${item ? "filled" : ""}`}>
              <span class="slot-number">{i + 1}</span>
              {item && (
                <button class="chip" disabled={disabled} onClick={() => setChosen(chosen.filter((c) => c !== id))}>
                  {item.emoji} {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p class="hint">{t.tapInOrder}</p>
      <div class="chips">
        {step.shuffled
          .filter((c) => !chosen.includes(c.id))
          .map((c) => (
            <button class="chip" disabled={disabled} onClick={() => setChosen([...chosen, c.id])}>
              {c.emoji} {c.label}
            </button>
          ))}
      </div>
      <div class="actions">
        <button class="btn" disabled={disabled || chosen.length === 0} onClick={() => setChosen(chosen.slice(0, -1))}>
          {t.undo}
        </button>
        <button class="btn prime" disabled={disabled || chosen.length !== step.items.length} onClick={() => onAnswer(chosen)}>
          {t.check}
        </button>
      </div>
    </div>
  );
}

/** Drag distance (px) that counts as a swipe. */
const SWIPE_PX = 90;

function SwipeView({ step, t, disabled, onAnswer }: ViewProps<"swipe">) {
  const [dx, setDx] = useState(0);
  const start = useRef<number | undefined>(undefined);

  function onPointerDown(e: PointerEvent) {
    if (disabled) return;
    start.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (start.current !== undefined) setDx(e.clientX - start.current);
  }
  function onPointerUp() {
    if (start.current === undefined) return;
    start.current = undefined;
    if (Math.abs(dx) >= SWIPE_PX) onAnswer(dx > 0);
    setDx(0);
  }

  return (
    <div class="swipe">
      <div
        class="card swipe-card"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 20}deg)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = undefined;
          setDx(0);
        }}
      >
        {step.card.emoji && <span class="card-emoji">{step.card.emoji}</span>}
        <span class="card-text">{step.card.text}</span>
      </div>
      <p class="hint">{t.swipeHint}</p>
      <div class="options duo">
        <button class="option no" disabled={disabled} onClick={() => onAnswer(false)}>
          ❌ {t.no}
        </button>
        <button class="option yes" disabled={disabled} onClick={() => onAnswer(true)}>
          ✅ {t.yes}
        </button>
      </div>
    </div>
  );
}
