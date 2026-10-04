import { useState } from "preact/hooks";
import type { Game, Pack } from "../../../src/pack/schema.js";
import type { PackIssue } from "../../../src/pack/validate.js";
import type { Dict } from "../i18n.js";
import {
  MIN_QUESTIONS,
  canRemove,
  finishReview,
  gateQuestion,
  issueKind,
  issuePlace,
  moveItem,
  packQuestionCount,
  questionView,
  removeQuestion,
  renameOption,
} from "./edit.js";

interface Props {
  pack: Pack;
  t: Dict;
  /** The adult already passed the gate (they just generated this pack). */
  unlocked?: boolean | undefined;
  /** The reviewed pack, valid; approved or still a draft. */
  onDone: (pack: Pack, approved: boolean) => void;
  onCancel: () => void;
}

/** Adult review of a pack (QZS-18), behind a simple parental gate. */
export function Review(props: Props) {
  const [unlocked, setUnlocked] = useState(props.unlocked ?? false);
  return unlocked ? <ReviewForm {...props} /> : <ParentGate t={props.t} onPass={() => setUnlocked(true)} onCancel={props.onCancel} />;
}

export function ParentGate({ t, onPass, onCancel }: { t: Dict; onPass: () => void; onCancel: () => void }) {
  const [q, setQ] = useState(() => gateQuestion());
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function submit(e: Event) {
    e.preventDefault();
    if (Number(value) === q.answer) return onPass();
    setWrong(true);
    setValue("");
    setQ(gateQuestion());
  }

  return (
    <form class="panel gate" onSubmit={submit}>
      <h2>🔒 {t.gateTitle}</h2>
      <label class="field">
        <span>{t.gateQuestion(q.a, q.b)}</span>
        <input inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={value} onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)} />
      </label>
      {wrong && <p class="gate-wrong">{t.gateWrong}</p>}
      <div class="actions">
        <button class="btn prime" type="submit" disabled={value.trim() === ""}>
          {t.gateEnter}
        </button>
        <button class="btn" type="button" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function ReviewForm({ pack, t, onDone, onCancel }: Props) {
  const [draft, setDraft] = useState<Pack>(() => structuredClone(pack));
  const [issues, setIssues] = useState<PackIssue[]>([]);
  // Questions open for fixing, as "game-question"; the rest are read at a glance (QZS-33).
  const [fixing, setFixing] = useState<Set<string>>(new Set());

  function toggleFix(id: string) {
    setFixing((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** Changes one game of the draft. */
  function edit(gameIndex: number, change: (game: Game) => void) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      change(next.games[gameIndex]!);
      return next;
    });
  }

  function finish(approve: boolean) {
    const result = finishReview(draft, approve, new Date());
    if (result.ok) return onDone(result.pack, approve);
    setIssues(result.issues);
    // The questions with a problem open for fixing.
    setFixing((prev) => {
      const next = new Set(prev);
      for (const issue of result.issues) {
        const place = issuePlace(issue.path);
        if (place?.question !== undefined) next.add(`${place.game - 1}-${place.question - 1}`);
      }
      return next;
    });
    window.scrollTo({ top: 0 });
  }

  return (
    <div class="review">
      <header class="panel review-head">
        <h2>{t.reviewTitle}</h2>
        <p>{t.reviewIntro}</p>
        <p class="pill review-count">{t.reviewCount(packQuestionCount(draft), draft.games.length)}</p>
      </header>

      {issues.length > 0 && (
        <div class="panel review-issues" role="alert">
          <strong>{t.reviewInvalid}</strong>
          <ul>
            {issues.map((issue) => {
              const place = issuePlace(issue.path);
              const kind = issueKind(issue.message);
              return (
                // The format's own message, in English, stays as a tooltip for whoever debugs it.
                <li title={issue.message}>
                  {place ? `${t.issueAt(place.game, place.question)}: ` : ""}
                  {kind.kind === "tooLong" ? t.issueText.tooLong(kind.max) : t.issueText[kind.kind]}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {draft.games.map((game, g) => (
        <section class="review-game">
          <h3>
            {g + 1}. {game.title} {game.title !== t.gameNames[game.type] && <small>· {t.gameNames[game.type]}</small>}
          </h3>
          <ol class="qcards">
            {questionsOf(game).map((_, q) => {
              const id = `${g}-${q}`;
              const open = fixing.has(id);
              return (
                <li class="panel qcard">
                  <div class="qcard-head">
                    <strong>{t.questionN(q + 1)}</strong>
                    <div class="actions">
                      <button class="btn small fix" aria-expanded={open} onClick={() => toggleFix(id)}>
                        {open ? t.reviewFixDone : t.reviewFix}
                      </button>
                      <button
                        class="btn small"
                        disabled={!canRemove(game)}
                        title={canRemove(game) ? undefined : t.minQuestions(MIN_QUESTIONS[game.type])}
                        onClick={() => {
                          setDraft((prev) => removeQuestion(prev, g, q));
                          // The questions below move up one place: nothing stays open by mistake.
                          setFixing(new Set());
                        }}
                      >
                        {t.removeQuestion}
                      </button>
                    </div>
                  </div>
                  {open ? <QuestionFields game={game} g={g} q={q} t={t} onEdit={(change) => edit(g, change)} /> : <QuestionRead game={game} q={q} t={t} />}
                  <blockquote class="book-quote">
                    <span>{t.bookSays}:</span> {t.quote(sourceOf(game, q))}
                  </blockquote>
                </li>
              );
            })}
          </ol>
          {!canRemove(game) && <p class="hint">{t.minQuestions(MIN_QUESTIONS[game.type])}</p>}
        </section>
      ))}

      <div class="actions review-actions">
        <button class="btn prime" onClick={() => finish(true)}>
          {t.approve}
        </button>
        <button class="btn" onClick={() => finish(false)}>
          {t.saveDraft}
        </button>
        <button class="btn" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

function questionsOf(game: Game): unknown[] {
  return game.type === "classify" ? game.items : game.type === "order" ? game.rounds : game.questions;
}

function sourceOf(game: Game, q: number): string {
  return game.type === "classify" ? game.items[q]!.source : game.type === "order" ? game.rounds[q]!.source : game.questions[q]!.source;
}

/** A question read at a glance: the right answers ticked, the steps numbered. */
function QuestionRead({ game, q, t }: { game: Game; q: number; t: Dict }) {
  const view = questionView(game, q, t.yes, t.no);
  const answers = view.answers.map((a) => (
    <li class={a.right && !view.ordered ? "is-right" : ""}>
      {!view.ordered && <span aria-hidden="true">{a.right ? "✅" : "▫️"}</span>}
      <span>
        {a.label}
        {a.right && !view.ordered && <span class="sr-only"> ({t.fieldAnswer})</span>}
      </span>
    </li>
  ));
  return (
    <div class="qread">
      <p class="qread-text">{view.text}</p>
      {view.ordered ? <ol class="qread-answers steps">{answers}</ol> : <ul class="qread-answers">{answers}</ul>}
      <p class="qread-why">
        <span>{t.fieldExplanation}:</span> {view.explanation}
      </p>
    </div>
  );
}

const value = (e: Event) => (e.currentTarget as HTMLInputElement).value;

function TextField({ label, text, multiline, onChange }: { label: string; text: string; multiline?: boolean; onChange: (v: string) => void }) {
  return (
    <label class="field">
      <span>{label}</span>
      {multiline ? <textarea rows={2} value={text} onInput={(e) => onChange(value(e))} /> : <input value={text} onInput={(e) => onChange(value(e))} />}
    </label>
  );
}

/** The editable fields of one question, by game type. */
function QuestionFields({ game, g, q, t, onEdit }: { game: Game; g: number; q: number; t: Dict; onEdit: (change: (game: Game) => void) => void }) {
  switch (game.type) {
    case "classify": {
      const item = game.items[q]!;
      return (
        <>
          <TextField label={t.fieldItem} text={item.label} onChange={(v) => onEdit((gm) => gm.type === "classify" && (gm.items[q]!.label = v))} />
          <label class="field">
            <span>{t.fieldCategory}</span>
            <select value={item.category} onChange={(e) => onEdit((gm) => gm.type === "classify" && (gm.items[q]!.category = value(e)))}>
              {game.categories.map((c) => (
                <option value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </label>
          <TextField label={t.fieldExplanation} text={item.explanation} multiline onChange={(v) => onEdit((gm) => gm.type === "classify" && (gm.items[q]!.explanation = v))} />
        </>
      );
    }
    case "order": {
      const round = game.rounds[q]!;
      return (
        <>
          <TextField label={t.fieldQuestion} text={round.prompt} multiline onChange={(v) => onEdit((gm) => gm.type === "order" && (gm.rounds[q]!.prompt = v))} />
          <div class="field">
            <span>{t.fieldSteps}</span>
            <ol class="steps-edit">
              {round.items.map((item, i) => (
                <li class="opt-row">
                  <span class="slot-number">{i + 1}</span>
                  <input aria-label={`${t.fieldItem} ${i + 1}`} value={item.label} onInput={(e) => onEdit((gm) => gm.type === "order" && (gm.rounds[q]!.items[i]!.label = value(e)))} />
                  <button class="btn small" aria-label={t.moveUp} disabled={i === 0} onClick={() => onEdit((gm) => gm.type === "order" && (gm.rounds[q]!.items = moveItem(gm.rounds[q]!.items, i, -1)))}>
                    ↑
                  </button>
                  <button
                    class="btn small"
                    aria-label={t.moveDown}
                    disabled={i === round.items.length - 1}
                    onClick={() => onEdit((gm) => gm.type === "order" && (gm.rounds[q]!.items = moveItem(gm.rounds[q]!.items, i, 1)))}
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <TextField label={t.fieldExplanation} text={round.explanation} multiline onChange={(v) => onEdit((gm) => gm.type === "order" && (gm.rounds[q]!.explanation = v))} />
        </>
      );
    }
    case "yesno": {
      const question = game.questions[q]!;
      return (
        <>
          <TextField label={t.fieldStatement} text={question.statement} multiline onChange={(v) => onEdit((gm) => gm.type === "yesno" && (gm.questions[q]!.statement = v))} />
          <fieldset class="field">
            <legend>{t.fieldAnswer}</legend>
            <div class="actions">
              {[true, false].map((answer) => (
                <label class="pill choice">
                  <input type="radio" name={`answer-${g}-${q}`} checked={question.answer === answer} onChange={() => onEdit((gm) => gm.type === "yesno" && (gm.questions[q]!.answer = answer))} />
                  {answer ? t.yes : t.no}
                </label>
              ))}
            </div>
          </fieldset>
          <TextField label={t.fieldExplanation} text={question.explanation} multiline onChange={(v) => onEdit((gm) => gm.type === "yesno" && (gm.questions[q]!.explanation = v))} />
        </>
      );
    }
    case "choice":
    case "boss": {
      const question = game.questions[q]!;
      const type = game.type;
      return (
        <>
          <TextField label={t.fieldQuestion} text={question.prompt} multiline onChange={(v) => onEdit((gm) => gm.type === type && (gm.questions[q]!.prompt = v))} />
          <fieldset class="field">
            <legend>{t.fieldOptions}</legend>
            {question.options.map((option, i) => (
              <div class="opt-row">
                <input
                  type="radio"
                  name={`answer-${g}-${q}`}
                  aria-label={t.correctOption(option)}
                  checked={question.answer === option}
                  onChange={() => onEdit((gm) => gm.type === type && (gm.questions[q]!.answer = option))}
                />
                <input
                  aria-label={`${t.fieldOptions} ${i + 1}`}
                  value={option}
                  onInput={(e) => onEdit((gm) => gm.type === type && (gm.questions[q] = renameOption(gm.questions[q]!, i, value(e))))}
                />
              </div>
            ))}
          </fieldset>
          <TextField label={t.fieldExplanation} text={question.explanation} multiline onChange={(v) => onEdit((gm) => gm.type === type && (gm.questions[q]!.explanation = v))} />
        </>
      );
    }
  }
}
