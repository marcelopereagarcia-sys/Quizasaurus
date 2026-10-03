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
  ["--text", "--bg"],
  ["--text", "--surface"],
  ["--muted", "--bg"],
  ["--muted", "--surface"],
  ["--primary", "--bg"],
  ["--primary", "--surface"],
  ["--primary-text", "--primary"],
  ["--ok", "--bg"],
  ["--ok", "--surface"],
  ["--pending", "--bg"],
  ["--pending", "--surface"],
] as const;

afterEach(() => vi.unstubAllGlobals());

describe("skins", () => {
  it("there are two, blocks and dinos, each with every theme token", () => {
    expect([...SKINS].sort()).toEqual(["blocks", "dinos"]);
    const names = Object.keys(tokens(DEFAULT_SKIN)).sort();
    expect(names.length).toBeGreaterThan(10);
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

  it("the browser bar colour is each skin's primary colour", () => {
    for (const skin of SKINS) expect(SKIN_THEME_COLOR[skin]).toBe(tokens(skin)["--primary"]);
  });

  it("no trademarked names in the skins or the interface texts", () => {
    const sources = ["../app/src/styles.css", "../app/src/skins.ts", "../app/src/i18n.ts", "../app/src/app.tsx"]
      .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
      .join("\n");
    expect(sources).not.toMatch(/minecraft|roblox|creeper|lego|fortnite|pok[eé]mon|jurassic/i);
  });

  it("keeps the child's choice, with dinos by default", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
    expect(loadSkin()).toBe("dinos");
    expect(saveSkin("blocks")).toBe(true);
    expect(loadSkin()).toBe("blocks");
    data.set("quizasaurus.skin", "castle");
    expect(loadSkin()).toBe("dinos");
  });
});
