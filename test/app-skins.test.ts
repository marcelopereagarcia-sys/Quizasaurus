import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SKIN, SKINS, SKIN_THEME_COLOR, loadSkin, saveSkin } from "../app/src/skins.js";

const css = readFileSync(new URL("../app/src/styles.css", import.meta.url), "utf8");

/** The custom properties a skin's rule defines, e.g. { "--bg": "#f4f1e8" }. */
function tokens(skin: string): Record<string, string> {
  const rule = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, selector]) => selector!.includes(`[data-skin="${skin}"]`));
  if (!rule) return {};
  const body = rule[2]!.replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name!, value!.trim()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Text colour on background, as the app uses them. WCAG AA asks 4.5:1. */
const TEXT_PAIRS = [
  ["--ink", "--sky"],
  ["--ink", "--sky2"],
  ["--ink", "--paper"],
  ["--ink", "--card"],
  ["--muted", "--paper"],
  ["--muted", "--card"],
  ["--muted", "--sky"],
  ["--muted", "--sky2"],
  ["--ok", "--paper"],
  ["--bad", "--paper"],
  ["--on-color", "--ok"],
  ["--on-color", "--bad"],
  ["--ink", "--gold"],
  ["--ink", "--c1"],
  ["--ink", "--c2"],
  ["--ink", "--c3"],
  ["--ink", "--c4"],
  ["--ink", "--ok-bg"],
  ["--ink", "--bad-bg"],
  ["--night-fg", "--night"],
  ["--night-muted", "--night"],
  ["--night-fg", "--night-tile"],
  ["--sign-fg", "--dirt"],
  ["--sign-fg", "--dirt2"],
] as const;

afterEach(() => vi.unstubAllGlobals());

describe("skins", () => {
  it("there are two, blocks and dinos, each with every theme token", () => {
    expect([...SKINS].sort()).toEqual(["blocks", "dinos"]);
    const names = Object.keys(tokens(DEFAULT_SKIN)).sort();
    expect(names.length).toBeGreaterThan(20);
    for (const skin of SKINS) expect(Object.keys(tokens(skin)).sort()).toEqual(names);
  });

  it("text colours reach WCAG AA in every skin", () => {
    for (const skin of SKINS) {
      const t = tokens(skin);
      for (const [fg, bg] of TEXT_PAIRS) {
        expect(contrast(t[fg]!, t[bg]!), `${skin}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("the browser bar colour is each skin's dark grass", () => {
    for (const skin of SKINS) expect(SKIN_THEME_COLOR[skin]).toBe(tokens(skin)["--grass-dk"]);
  });

  it("no trademarked names in the skins or the interface texts", () => {
    const sources = ["../app/src/styles.css", "../app/src/skins.ts", "../app/src/i18n.ts", "../app/src/app.tsx"]
      .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/minecraft|roblox|creeper|lego|fortnite|pok[eé]mon|jurassic/i);
  });

  it("keeps the child's choice, with blocks by default", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
    expect(loadSkin()).toBe("blocks");
    expect(saveSkin("dinos")).toBe(true);
    expect(loadSkin()).toBe("dinos");
    data.set("quizasaurus.skin", "castle");
    expect(loadSkin()).toBe("blocks");
  });

  it("ships the fonts with the app, so it looks the same offline", () => {
    const main = readFileSync(new URL("../app/src/main.tsx", import.meta.url), "utf8");
    expect(main).toMatch(/@fontsource\/pixelify-sans/);
    expect(main).toMatch(/@fontsource\/lexend/);
    expect(css).not.toMatch(/fonts\.googleapis/);
  });
});
