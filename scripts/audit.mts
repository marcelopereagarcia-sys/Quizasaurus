/// <reference lib="dom" />
/**
 * Automatic audit of the player (QZS-22, gate O2).
 *
 * `npm run audit` builds the app, serves dist/ and plays it in a headless
 * browser the way a child would: every level and the infinite mode of every
 * pack, once answering everything right and once at random, on a phone
 * (375 px), a tablet (768 px) and a computer (1440 px). On every screen it
 * looks for anything wider than the screen and for text cut off, and it
 * collects every JavaScript error.
 *
 * Besides the example pack it plays two synthetic packs (Catalan and English)
 * written at the pack format's length limits, so the unit screens are checked
 * in the three interface languages and with the longest texts an AI may write.
 *
 * The report goes to docs/gestion/auditoria-o2.md and screenshots of any
 * problem to audit-output/ (not in git). Exits with 1 if anything failed.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { type Browser, type BrowserContext, type Page, chromium } from "playwright";
import { preview } from "vite";
import type { Game, Pack } from "../src/pack/schema.js";
import { validatePack } from "../src/pack/validate.js";

const REPORT = "docs/gestion/auditoria-o2.md";
const SHOTS = "audit-output";

// ---------------------------------------------------------------- packs

type Lang = "ca" | "en";

/** Real words of each language, some of them very long, to fill the synthetic packs. */
const WORDS: Record<Lang, string[]> = {
  ca: "l'aigua del núvol baixa per la muntanya fins al riu i després arriba al mar amb l'evaporació la condensació i la precipitació segons la temperatura i les característiques del desenvolupament electroencefalogràficament".split(" "),
  en: "the water in the cloud falls down the mountain into the river and then reaches the sea through evaporation condensation and precipitation depending on the temperature and the characteristics of its development incomprehensibilities".split(" "),
};

/** A text of at most `max` characters made of the language's words, starting with `lead`. */
function filler(lang: Lang, lead: string, max: number, seed: number): string {
  const words = WORDS[lang];
  let out = lead;
  for (let i = seed; ; i++) {
    const next = out ? `${out} ${words[i % words.length]}` : words[i % words.length]!;
    if (next.length > max) return out;
    out = next;
  }
}

/** A pack that uses the format's longest texts in every field (charter: 2-4 options, 3-6 items…). */
function stressPack(lang: Lang): Pack {
  let seed = 0;
  const w = (lead: string, max: number) => filler(lang, lead, max, (seed += 7));
  const traced = (n: number) => ({ topic: `tema-${(n % 3) + 1}`, source: w("", 500), explanation: w("", 300) });
  const choice = (n: number) => {
    const options = [0, 1, 2, 3].map((k) => w(`${String.fromCharCode(65 + k)}${n}`, 120));
    return { prompt: w(`${n}.`, 200), emoji: "🌧️", options, answer: options[n % 4]!, ...traced(n) };
  };
  const pack = {
    schemaVersion: 1,
    id: `audit-stress-${lang}`,
    title: w("Audit", 80),
    subject: w("", 60),
    language: lang,
    grade: { stage: "primary", year: 3 },
    topics: [1, 2, 3].map((n) => ({ id: `tema-${n}`, name: w(`${n}`, 60) })),
    games: [
      {
        type: "classify",
        title: w("", 60),
        instructions: w("", 200),
        categories: [0, 1, 2, 3].map((k) => ({ id: `cat-${k}`, label: w(`${k + 1}`, 40), emoji: "🧊" })),
        items: [0, 1, 2, 3].map((k) => ({ label: w(`${k + 1}`, 60), emoji: "💧", category: `cat-${k}`, ...traced(k) })),
      },
      {
        type: "order",
        title: w("", 60),
        rounds: [{ prompt: w("", 200), items: [0, 1, 2, 3, 4, 5].map((k) => ({ label: w(`${k + 1}`, 60), emoji: "☁️" })), ...traced(1) }],
      },
      { type: "choice", title: w("", 60), questions: [1, 2, 3].map(choice) },
      {
        type: "yesno",
        title: w("", 60),
        questions: [0, 1, 2, 3].map((k) => ({ statement: w(`${k + 1}.`, 200), emoji: "🌊", answer: k % 2 === 0, ...traced(k) })),
      },
      { type: "boss", title: w("", 60), questions: [11, 12, 13, 14, 15].map(choice) },
    ],
    review: { status: "approved", approvedAt: "2026-10-04T00:00:00Z" },
  };
  const result = validatePack(pack);
  if (!result.ok) throw new Error(`The ${lang} stress pack is not valid: ${JSON.stringify(result.issues)}`);
  return result.pack;
}

const EXAMPLE = validatePack(JSON.parse(readFileSync("examples/ciclo-del-agua.pack.json", "utf8")));
if (!EXAMPLE.ok) throw new Error("The example pack is not valid");
const STRESS = [stressPack("ca"), stressPack("en")];
const PACKS: Pack[] = [EXAMPLE.pack, ...STRESS];

// ---------------------------------------------------------------- answers

/** What the current question looks like on screen. */
type View =
  | { kind: "results" }
  | { kind: "bins"; card: string; options: string[] }
  | { kind: "list"; prompt: string; options: string[] }
  | { kind: "order"; prompt: string; chips: string[] }
  | { kind: "swipe"; card: string };

/** The right answer, read from the pack, never from the screen. */
type Expected = { kind: "pick"; labels: string[] } | { kind: "order"; chips: string[] } | { kind: "swipe"; yes: boolean };

const chipText = (item: { label: string; emoji?: string | undefined }) => [item.emoji, item.label].filter(Boolean).join(" ");
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function expectedAnswer(games: readonly Game[], view: View): Expected | undefined {
  for (const game of games) {
    if (view.kind === "bins" && game.type === "classify") {
      const item = game.items.find((i) => i.label === view.card);
      const bin = item && game.categories.find((c) => c.id === item.category);
      if (bin && sameSet(view.options, game.categories.map((c) => c.label))) return { kind: "pick", labels: [bin.label] };
    }
    if (view.kind === "list" && (game.type === "choice" || game.type === "boss")) {
      const q = game.questions.find((q) => q.prompt === view.prompt && sameSet(q.options, view.options));
      if (q) return { kind: "pick", labels: [q.answer, ...(q.alsoAccepted ?? [])] };
    }
    if (view.kind === "order" && game.type === "order") {
      const round = game.rounds.find((r) => r.prompt === view.prompt && sameSet(r.items.map(chipText), view.chips));
      if (round) return { kind: "order", chips: round.items.map(chipText) };
    }
    if (view.kind === "swipe" && game.type === "yesno") {
      const q = game.questions.find((q) => q.statement === view.card);
      if (q) return { kind: "swipe", yes: q.answer };
    }
  }
  return undefined;
}

async function readView(page: Page): Promise<View> {
  return page.evaluate((): View => {
    const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? "";
    const all = (selector: string) => [...document.querySelectorAll(selector)];
    if (document.querySelector(".results")) return { kind: "results" };
    if (document.querySelector(".options.bins"))
      return { kind: "bins", card: text(document.querySelector(".pick .card-text")), options: all(".options.bins .option").map((b) => text(b.lastElementChild)) };
    if (document.querySelector(".options.list"))
      return { kind: "list", prompt: text(document.querySelector(".pick .prompt")), options: all(".options.list .option").map((b) => text(b.lastElementChild)) };
    if (document.querySelector(".order"))
      return { kind: "order", prompt: text(document.querySelector(".order .prompt")), chips: all(".order .chips .chip").map(text) };
    return { kind: "swipe", card: text(document.querySelector(".swipe .card-text")) };
  });
}

// ---------------------------------------------------------------- layout

interface LayoutProblem {
  kind: "page-wider-than-screen" | "outside-screen" | "text-cut" | "text-out-of-box";
  element: string;
  detail: string;
}

/**
 * Runs in the page. Flags the page scrolling sideways, any visible element
 * that sticks out of the screen, text clipped by its box (overflow hidden,
 * ellipsis) and text spilling out of its box (a word too long to wrap).
 * Decorations (aria-hidden) and text only for screen readers (clipped on
 * purpose) are left out.
 */
function findLayoutProblems(): LayoutProblem[] {
  const problems: LayoutProblem[] = [];
  const root = document.documentElement;
  const width = root.clientWidth;
  const describe = (el: Element) => {
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
    const words = (el.textContent ?? "").trim().replace(/\s+/g, " ");
    return `${el.tagName.toLowerCase()}${cls}${words ? ` «${words.slice(0, 50)}${words.length > 50 ? "…" : ""}»` : ""}`;
  };
  if (root.scrollWidth > width + 1) {
    problems.push({ kind: "page-wider-than-screen", element: "html", detail: `${root.scrollWidth} px de ancho en una pantalla de ${width} px` });
  }
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[aria-hidden='true'], option, select, script, style")) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.clip !== "auto") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.right > width + 1 || box.left < -1) {
      problems.push({ kind: "outside-screen", element: describe(el), detail: `ocupa de ${Math.round(box.left)} a ${Math.round(box.right)} px (pantalla: ${width} px)` });
      continue;
    }
    const hasText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
    if (!hasText || style.display === "inline") continue;
    const wider = el.scrollWidth > el.clientWidth + 1;
    const taller = el.scrollHeight > el.clientHeight + 1;
    if ((style.overflowX !== "visible" && wider) || (style.overflowY !== "visible" && taller)) {
      problems.push({ kind: "text-cut", element: describe(el), detail: `contenido ${el.scrollWidth}×${el.scrollHeight} px en una caja de ${el.clientWidth}×${el.clientHeight} px` });
    } else if (wider) {
      problems.push({ kind: "text-out-of-box", element: describe(el), detail: `texto de ${el.scrollWidth} px en una caja de ${el.clientWidth} px` });
    }
  }
  return problems;
}

// ---------------------------------------------------------------- runs

const VIEWPORTS = [
  { name: "375 px (móvil)", width: 375, height: 812, mobile: true },
  { name: "768 px (tablet)", width: 768, height: 1024, mobile: true },
  { name: "1440 px (ordenador)", width: 1440, height: 900, mobile: false },
] as const;

/** Perfect mode wears the default skin and random mode the other, so both skins go through every size. */
const MODES = [
  { name: "perfecto", random: false, skin: "blocks" },
  { name: "aleatorio", random: true, skin: "dinos" },
] as const;

interface Problem extends LayoutProblem {
  screen: string;
  times: number;
  shot?: string;
}

interface RunResult {
  viewport: string;
  mode: string;
  skin: string;
  levels: number;
  answers: number;
  right: number;
  wrong: number;
  /** Answers the game judged differently from the pack (must be 0). */
  misjudged: string[];
  problems: Problem[];
  jsErrors: string[];
  failedRequests: string[];
  checks: { name: string; ok: boolean; detail?: string | undefined }[];
  crashed?: string | undefined;
}

/** Errors and failed requests of a page, collected from the start. */
function watch(page: Page, run: RunResult) {
  page.on("pageerror", (e) => run.jsErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && run.jsErrors.push(m.text()));
  page.on("requestfailed", (r) => run.failedRequests.push(`${r.url()} (${r.failure()?.errorText ?? "?"})`));
}

/** tsx wraps named inner functions in `__name()`; the functions sent to the page need it there too. */
const KEEP_NAMES = "globalThis.__name = (f) => f;";

const rand = (n: number) => Math.floor(Math.random() * n);
const exact = (s: string) => new RegExp(`^\\s*${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);

class Auditor {
  private shots = 0;
  /** The last screen checked, to say where a run stopped. */
  where = "inicio";
  constructor(
    private page: Page,
    private run: RunResult,
    private slug: string,
  ) {}

  /** Checks the layout of what is on screen now; each problem is kept once, with a screenshot. */
  async check(screen: string) {
    this.where = screen;
    // Waits for transitions to end (the swiped card going back), not for looping decorations.
    await this.page.waitForFunction(() =>
      document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
    );
    for (const p of await this.page.evaluate(findLayoutProblems)) {
      const same = this.run.problems.find((q) => q.kind === p.kind && q.element === p.element);
      if (same) {
        same.times++;
        continue;
      }
      const shot = `${SHOTS}/${this.slug}-${++this.shots}.png`;
      await this.page.screenshot({ path: shot, fullPage: true });
      this.run.problems.push({ ...p, screen, times: 1, shot });
    }
  }

  async home() {
    await this.page.locator("main.screen .sign h1").waitFor();
  }

  /** Answers the parental gate (a multiplication) the way an adult would. */
  async passGate() {
    const question = await this.page.locator(".gate .field span").textContent();
    const [a, b] = (question ?? "").match(/\d+/g)!.map(Number);
    await this.page.locator(".gate input").fill(String(a! * b!));
    await this.page.locator(".gate button[type=submit]").click();
  }

  async openUnit(pack: Pack) {
    await this.page.locator("ul.levels .lvl").filter({ has: this.page.locator(".ln", { hasText: exact(pack.title) }) }).click();
    await this.page.locator("ol.levels").waitFor();
  }

  /** Plays one level to its results screen. */
  async playLevel(pack: Pack, level: number, label: string, random: boolean, reloadAfter?: number) {
    await this.page.locator("ol.levels > li > button.lvl").nth(level).click();
    await this.page.locator(".game-screen").waitFor();
    for (let n = 1; ; n++) {
      const view = await readView(this.page);
      if (view.kind === "results") break;
      const screen = `${pack.id} · ${label} · pregunta ${n}`;
      await this.check(screen);
      const expected = expectedAnswer(pack.games, view);
      if (!expected) {
        this.run.misjudged.push(`${screen}: la pregunta en pantalla no está en el pack`);
        throw new Error(`Unknown question on ${screen}`);
      }
      const shouldBeRight = await this.answer(view, expected, random);
      const feedback = this.page.locator(".feedback");
      await feedback.waitFor({ timeout: 5_000 });
      const judgedRight = (await this.page.locator(".feedback.ok").count()) > 0;
      this.run.answers++;
      judgedRight ? this.run.right++ : this.run.wrong++;
      if (judgedRight !== shouldBeRight) this.run.misjudged.push(`${screen}: debía ser ${shouldBeRight ? "acierto" : "fallo"}`);
      if (!judgedRight) {
        await this.check(`${screen} (explicación del fallo)`);
        await this.page.locator(".feedback .btn.prime").click();
      }
      await feedback.waitFor({ state: "detached", timeout: 5_000 });
      if (reloadAfter === n) await this.checkResume(n);
    }
    await this.check(`${pack.id} · ${label} · resultados`);
    await this.page.locator(".results .actions .btn").last().click();
    await this.page.locator("ol.levels").waitFor();
    this.run.levels++;
  }

  /** Gives the answer the mode asks for; returns whether it is right according to the pack. */
  private async answer(view: View, expected: Expected, random: boolean): Promise<boolean> {
    const page = this.page;
    if ((view.kind === "bins" || view.kind === "list") && expected.kind === "pick") {
      const index = random ? rand(view.options.length) : view.options.findIndex((o) => expected.labels.includes(o));
      await page.locator(".stage .options .option").nth(index).click();
      return expected.labels.includes(view.options[index]!);
    }
    if (view.kind === "order" && expected.kind === "order") {
      const sequence = random ? [...view.chips].sort(() => Math.random() - 0.5) : expected.chips;
      for (const chip of sequence) await page.locator(".order .chips .chip").filter({ hasText: exact(chip) }).first().click();
      await page.locator(".order .actions .btn.prime").click();
      return sequence.every((c, i) => c === expected.chips[i]);
    }
    if (view.kind === "swipe" && expected.kind === "swipe") {
      const yes = random ? Math.random() < 0.5 : expected.yes;
      if (random && Math.random() < 0.5) {
        // Half the random answers swipe the card with the finger instead of tapping a button.
        const box = (await page.locator(".swipe-card").boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + (yes ? 160 : -160), y, { steps: 8 });
        await page.mouse.up();
      } else {
        await page.locator(yes ? ".swipe .option.yes" : ".swipe .option.no").click();
      }
      return yes === expected.yes;
    }
    throw new Error(`The answer does not fit the question (${view.kind}/${expected.kind})`);
  }

  /** Reloads in the middle of a game: it must go on from the same question. */
  private async checkResume(answered: number) {
    const before = await readView(this.page);
    await this.page.reload();
    await this.page.locator(".game-screen").waitFor();
    const after = await readView(this.page);
    const done = await this.page.locator(".prog i.ok, .prog i.bad").count();
    const ok = done === answered && JSON.stringify(before) === JSON.stringify(after);
    this.run.checks.push({ name: "Recargar a mitad de partida sigue en la misma pregunta", ok, detail: ok ? undefined : `${done} respondidas tras recargar` });
  }

  async review(pack: Pack) {
    await this.page.locator("details.parents summary").click();
    await this.check(`${pack.id} · rincón de las familias`);
    await this.page.locator("details.parents .pbody .actions .btn").first().click();
    await this.page.locator(".gate").waitFor();
    await this.check(`${pack.id} · control parental`);
    await this.passGate();
    await this.page.locator(".review").waitFor();
    await this.check(`${pack.id} · revisión adulta`);
    await this.page.goBack();
    await this.page.locator("ol.levels").waitFor();
  }

  async generator(lang: string) {
    await this.page.locator("main.screen > .actions .btn.prime").click();
    await this.page.locator(".gate").waitFor();
    await this.passGate();
    await this.page.locator("form.generator").waitFor();
    await this.check(`generador (${lang})`);
    await this.page.goBack();
    await this.home();
  }
}

async function auditRun(browser: Browser, base: string, viewport: (typeof VIEWPORTS)[number], mode: (typeof MODES)[number]): Promise<RunResult> {
  const run: RunResult = { viewport: viewport.name, mode: mode.name, skin: mode.skin, levels: 0, answers: 0, right: 0, wrong: 0, misjudged: [], problems: [], jsErrors: [], failedRequests: [], checks: [] };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    locale: "es-ES",
  });
  await context.addInitScript(KEEP_NAMES);
  // The synthetic packs are on the device as if the family had loaded them.
  await context.addInitScript(
    ({ packs, skin }) => {
      if (localStorage.getItem("quizasaurus.packs.v1")) return;
      localStorage.setItem("quizasaurus.packs.v1", JSON.stringify(packs));
      localStorage.setItem("quizasaurus.skin", skin);
    },
    { packs: STRESS, skin: mode.skin },
  );
  const page = await context.newPage();
  watch(page, run);
  const a = new Auditor(page, run, `${viewport.width}-${mode.name}`);
  try {
    await page.goto(base);
    await a.home();
    for (const lang of ["ca", "es", "en"]) {
      await page.locator(".sign select").selectOption(lang);
      await a.check(`inicio (${lang})`);
      await a.generator(lang);
    }
    for (const [p, pack] of PACKS.entries()) {
      await a.openUnit(pack);
      await a.check(`${pack.id} · unidad`);
      for (let level = 0; level <= pack.games.length; level++) {
        const label = level < pack.games.length ? `nivel ${level + 1} (${pack.games[level]!.type})` : "modo infinito";
        await a.playLevel(pack, level, label, mode.random, mode.random && p === 0 && level === 0 ? 2 : undefined);
      }
      await a.check(`${pack.id} · unidad con estrellas y dinos`);
      await a.review(pack);
      await page.locator("main.screen > div > .btn.small").click();
      await a.home();
    }
    await a.check("inicio con la colección");
  } catch (e) {
    run.crashed = `${a.where}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`;
    await page.screenshot({ path: `${SHOTS}/${viewport.width}-${mode.name}-crash.png`, fullPage: true }).catch(() => undefined);
  }
  await context.close();
  return run;
}

/** Opens the app once, then again without internet: it must still play (gate O2). */
async function auditOffline(browser: Browser, base: string): Promise<RunResult["checks"][number]> {
  const name = "Sin conexión: tras la primera visita se abre y se juega en modo avión";
  const context: BrowserContext = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
  await context.addInitScript(KEEP_NAMES);
  try {
    const page = await context.newPage();
    await page.goto(base);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await page.locator("ul.levels .lvl").first().click();
    await page.locator("ol.levels > li > button.lvl").first().click();
    await page.locator(".game-screen .stage").waitFor({ timeout: 5_000 });
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message.split("\n")[0] : String(e) };
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- report

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const KIND_NAMES: Record<LayoutProblem["kind"], string> = {
  "page-wider-than-screen": "La página se desplaza de lado",
  "outside-screen": "Elemento fuera de la pantalla",
  "text-cut": "Texto cortado",
  "text-out-of-box": "Texto que se sale de su caja",
};

function report(runs: RunResult[], offline: RunResult["checks"][number], seconds: number): { markdown: string; passed: boolean } {
  const when = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" }).format(new Date());
  const commit = git("rev-parse --short HEAD") || "?";
  const dirty = git("status --porcelain") !== "";
  const sum = (f: (r: RunResult) => number) => runs.reduce((n, r) => n + f(r), 0);
  const checks = [...runs.flatMap((r) => r.checks.map((c) => ({ ...c, name: `${c.name} (${r.viewport})` }))), offline];
  const failures = {
    crashes: runs.filter((r) => r.crashed),
    misjudged: sum((r) => r.misjudged.length),
    problems: sum((r) => r.problems.length),
    errors: sum((r) => r.jsErrors.length),
    requests: sum((r) => r.failedRequests.length),
    checks: checks.filter((c) => !c.ok).length,
  };
  const passed = Object.values(failures).every((v) => (Array.isArray(v) ? v.length === 0 : v === 0));
  const yes = (ok: boolean) => (ok ? "✅" : "❌");
  const levels = PACKS.reduce((n, p) => n + p.games.length + 1, 0);

  const lines = [
    "# Auditoría automática del reproductor (puerta O2)",
    "",
    `> Generado por \`npm run audit\` el ${when} sobre el commit \`${commit}\`${dirty ? " con cambios locales sin subir" : ""}. No editar a mano: se rehace en cada ejecución.`,
    "",
    `**Resultado: ${passed ? "✅ superada" : "❌ no superada"}** · ${runs.length} partidas completas · ${sum((r) => r.levels)} niveles jugados · ${sum((r) => r.answers)} respuestas · ${Math.round(seconds)} s`,
    "",
    "## Criterios de aceptación (QZS-22)",
    "",
    "| Criterio | Resultado |",
    "| --- | --- |",
    `| Juega todos los niveles en modo perfecto y en modo aleatorio | ${yes(failures.crashes.length === 0 && failures.misjudged === 0)} ${sum((r) => r.levels)} de ${levels * runs.length} niveles; ${failures.misjudged} respuestas mal juzgadas |`,
    `| 375 px (móvil), 768 px (tablet) y 1440 px (ordenador) sin desbordes ni texto cortado | ${yes(failures.problems === 0)} ${failures.problems} problemas de diseño |`,
    `| 0 errores de JavaScript | ${yes(failures.errors === 0)} ${failures.errors} errores · ${failures.requests} peticiones fallidas |`,
    `| Informe enlazado desde \`docs/gestion\` | ✅ este archivo, enlazado en [README](README.md) |`,
    "",
    "## Qué se ha jugado",
    "",
    "Cada partida empieza en un navegador limpio (Chromium sin ventana), como la primera visita de una familia.",
    "",
    "- **Modo perfecto:** responde siempre lo que dice el pack (la respuesta se lee del pack, nunca de la pantalla). Todas deben contar como acierto.",
    "- **Modo aleatorio:** toca cualquier opción; en «sí o no», la mitad de las veces desliza la tarjeta con el dedo. El juego debe dar por buenas justo las que coinciden con el pack.",
    "- En cada pregunta, en cada explicación de un fallo y en cada pantalla (inicio en los 3 idiomas, unidad, rincón de las familias, control parental, revisión adulta, generador y resultados) se busca: página que se desplaza de lado, elementos fuera de la pantalla, texto cortado y texto que se sale de su caja.",
    "- Se cuenta cualquier error de JavaScript o de consola y cualquier petición que falle.",
    "",
    "| Pack | Idioma | Niveles | Para qué |",
    "| --- | --- | --- | --- |",
    ...PACKS.map((p) => `| \`${p.id}\` | ${p.language} | ${p.games.map((g) => g.type).join(", ")} + infinito | ${STRESS.includes(p) ? "Sintético, con los textos más largos que admite el formato" : "Pack de ejemplo incluido en la app"} |`),
    "",
    "| Pantalla | Modo | Skin | Niveles | Respuestas (✔ / ✘) | Mal juzgadas | Problemas de diseño | Errores JS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...runs.map((r) => `| ${r.viewport} | ${r.mode} | ${r.skin} | ${r.levels}${r.crashed ? " ⚠️" : ""} | ${r.answers} (${r.right} / ${r.wrong}) | ${r.misjudged.length} | ${r.problems.length} | ${r.jsErrors.length} |`),
    "",
    "## Comprobaciones extra",
    "",
    "| Comprobación | Resultado |",
    "| --- | --- |",
    ...checks.map((c) => `| ${c.name} | ${yes(c.ok)}${c.detail ? ` ${c.detail}` : ""} |`),
    "",
  ];

  if (!passed) {
    lines.push("## Problemas encontrados", "");
    for (const r of runs) {
      const items = [
        ...(r.crashed ? [`- **La partida se detuvo:** ${r.crashed}`] : []),
        ...r.misjudged.map((m) => `- **Respuesta mal juzgada:** ${m}`),
        ...r.problems.map((p) => `- **${KIND_NAMES[p.kind]}** en ${p.screen}${p.times > 1 ? ` (y ${p.times - 1} veces más)` : ""}: \`${p.element}\`, ${p.detail}. Captura: \`${p.shot}\``),
        ...r.jsErrors.map((e) => `- **Error de JavaScript:** ${e}`),
        ...r.failedRequests.map((e) => `- **Petición fallida:** ${e}`),
      ];
      if (items.length) lines.push(`### ${r.viewport} · ${r.mode}`, "", ...items, "");
    }
  }
  lines.push("## Cómo repetirla", "", "```bash", "npx playwright install chromium --only-shell   # solo la primera vez", "npm run audit", "```", "");
  return { markdown: lines.join("\n"), passed };
}

// ---------------------------------------------------------------- main

const started = Date.now();
rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
const server = await preview({ preview: { port: 4190, strictPort: false, open: false }, logLevel: "warn" });
const base = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch();
try {
  const [offline, ...runs] = await Promise.all([auditOffline(browser, base), ...VIEWPORTS.flatMap((v) => MODES.map((m) => auditRun(browser, base, v, m)))]);
  const { markdown, passed } = report(runs, offline!, (Date.now() - started) / 1000);
  writeFileSync(REPORT, markdown);
  console.log(`${passed ? "✅ Audit passed" : "❌ Audit failed"}: see ${REPORT}`);
  process.exitCode = passed ? 0 : 1;
} finally {
  await browser.close();
  await server.close();
}
