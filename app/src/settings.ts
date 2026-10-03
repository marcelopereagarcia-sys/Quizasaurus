/**
 * Family settings, kept on the device. The family panel (QZS-19) edits them.
 */
import { DEFAULT_BOSS_THRESHOLD } from "./game/steps.js";
import { safeStorage } from "./storage.js";

export interface Settings {
  /** Share of right answers needed to beat the boss, one of BOSS_THRESHOLD_CHOICES. */
  bossThreshold: number;
}

const SETTINGS_KEY = "quizasaurus.settings.v1";
export const BOSS_THRESHOLD_CHOICES = [0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

export function loadSettings(): Settings {
  let stored: unknown;
  try {
    stored = JSON.parse(safeStorage.get(SETTINGS_KEY) ?? "{}");
  } catch {
    stored = undefined;
  }
  // Anything that is not an object (null, a number…) counts as no settings.
  const threshold = typeof stored === "object" && stored !== null ? (stored as Partial<Settings>).bossThreshold : undefined;
  return {
    bossThreshold: (BOSS_THRESHOLD_CHOICES as readonly unknown[]).includes(threshold) ? (threshold as number) : DEFAULT_BOSS_THRESHOLD,
  };
}

export function saveSettings(settings: Settings): boolean {
  return safeStorage.set(SETTINGS_KEY, JSON.stringify(settings));
}
