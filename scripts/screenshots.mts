/**
 * The README screenshots (QZS-31), always from the example pack: no child's
 * data and no copyrighted book ever reach them.
 *
 *   npm run screenshots
 *
 * Builds the app, serves dist/ and saves the pictures to assets/screenshots/.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { type Browser, type Page, chromium } from "playwright";
import { preview } from "vite";

const OUT = "assets/screenshots";
const example = JSON.parse(readFileSync("examples/ciclo-del-agua.pack.json", "utf8")) as { title: string };

/** The example unit on the device, with the interface in English (inside the unit it speaks the pack's Spanish). */
const SETUP = `
  if (!localStorage.getItem("quizasaurus.packs.v1")) {
    localStorage.setItem("quizasaurus.packs.v1", JSON.stringify([${JSON.stringify(example)}]));
    localStorage.setItem("quizasaurus.uiLang", "en");
  }
`;

async function open(browser: Browser, base: string, viewport: { width: number; height: number }, mobile: boolean): Promise<Page> {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, locale: "en-GB" });
  await context.addInitScript(SETUP);
  const page = await context.newPage();
  await page.goto(base);
  await page.locator(".welcome").waitFor();
  // The first visit says the app is ready offline: not part of the picture.
  await page.locator(".notice .close").click({ timeout: 3_000 }).catch(() => undefined);
  return page;
}

/** Phone pictures share one height, so they line up side by side in the README. */
const PHONE_SHOT_HEIGHT = 640;

async function shot(page: Page, name: string, phone = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot(phone ? { path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 390, height: PHONE_SHOT_HEIGHT } } : { path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`✔ ${OUT}/${name}.png`);
}

/** Answers the parental gate (a multiplication) the way an adult would. */
async function passGate(page: Page) {
  const question = await page.locator(".gate .field span").textContent();
  const [a, b] = (question ?? "").match(/\d+/g)!.map(Number);
  await page.locator(".gate input").fill(String(a! * b!));
  await page.locator(".gate button[type=submit]").click();
}

async function openUnit(page: Page) {
  await page.locator(".welcome-actions .btn.prime").click();
  await page.locator(".worlds").waitFor();
  await page.locator("ul.levels .lvl").filter({ hasText: example.title }).click();
  await page.locator("ol.levels").waitFor();
}

mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4191, strictPort: false, open: false }, logLevel: "warn" });
const base = server.resolvedUrls!.local[0]!;
const browser = await chromium.launch();
try {
  // A laptop: the cover.
  const laptop = await open(browser, base, { width: 1280, height: 900 }, false);
  await shot(laptop, "welcome", false);
  await laptop.context().close();

  // A phone, as families use it.
  const phone = { width: 390, height: 844 };
  let page = await open(browser, base, phone, true);
  await openUnit(page);
  await shot(page, "unit");
  for (const [level, name] of [[0, "game-classify"], [3, "game-yesno"]] as const) {
    await page.locator("ol.levels > li > button.lvl").nth(level).click();
    await page.locator(".game-screen").waitFor();
    await shot(page, name);
    await page.goBack();
    await page.locator("ol.levels").waitFor();
  }
  await page.locator("details.parents summary").click();
  await page.locator("details.parents .pbody .actions .btn").first().click();
  await page.locator(".gate").waitFor();
  await passGate(page);
  await page.locator(".review").waitFor();
  await shot(page, "review");
  await page.context().close();

  page = await open(browser, base, phone, true);
  await page.locator(".welcome-actions .btn.create").click();
  await page.locator(".gate").waitFor();
  await passGate(page);
  await page.locator("form.generator").waitFor();
  await shot(page, "generator");
  await page.context().close();
} finally {
  await browser.close();
  await server.close();
}
