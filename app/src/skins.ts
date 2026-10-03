/**
 * Skins (QZS-20): the child picks the colours of the games. The look is the
 * prototype's (a blocky world with dinosaurs); each skin is a set of colour
 * tokens in styles.css, chosen with data-skin on <html>, and the choice is kept
 * on the device. Original designs: no trademarked names or graphics.
 */
import { safeStorage } from "./storage.js";

export const SKINS = ["blocks", "dinos"] as const;
export type Skin = (typeof SKINS)[number];

export const DEFAULT_SKIN: Skin = "blocks";

/** The emoji on each skin's button. */
export const SKIN_EMOJI: Record<Skin, string> = { blocks: "🧱", dinos: "🦕" };

/** The browser bar colour of each skin: its --grass-dk token (a test keeps them equal). */
export const SKIN_THEME_COLOR: Record<Skin, string> = { blocks: "#3f8a2c", dinos: "#2f6e24" };

const SKIN_KEY = "quizasaurus.skin";

export function isSkin(value: unknown): value is Skin {
  return (SKINS as readonly unknown[]).includes(value);
}

export function loadSkin(): Skin {
  const saved = safeStorage.get(SKIN_KEY);
  return isSkin(saved) ? saved : DEFAULT_SKIN;
}

export function saveSkin(skin: Skin): boolean {
  return safeStorage.set(SKIN_KEY, skin);
}

export function applySkin(skin: Skin, doc: Document = document): void {
  doc.documentElement.dataset.skin = skin;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute("content", SKIN_THEME_COLOR[skin]);
}
