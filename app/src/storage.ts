/**
 * Everything is kept on the device only (no accounts, no server).
 * If storage is blocked or full, the app keeps working from memory and
 * says that the data will not survive closing it.
 */
import { type Pack } from "../../src/pack/schema.js";
import { validatePack } from "../../src/pack/validate.js";

/** localStorage that never throws (private mode, blocked site data, quota). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      globalThis.localStorage?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};

const PACKS_KEY = "quizasaurus.packs.v1";
let memory: Pack[] | undefined;

/** Stored packs; anything that no longer validates is dropped. */
export function loadPacks(): Pack[] {
  if (memory) return memory;
  let stored: unknown = [];
  try {
    stored = JSON.parse(safeStorage.get(PACKS_KEY) ?? "[]");
  } catch {
    stored = [];
  }
  memory = (Array.isArray(stored) ? stored : []).flatMap((p) => {
    const result = validatePack(p);
    return result.ok ? [result.pack] : [];
  });
  return memory;
}

/** Adds or replaces a pack by id. Returns false if it could only be kept in memory. */
export function savePack(pack: Pack): boolean {
  memory = [...loadPacks().filter((p) => p.id !== pack.id), pack];
  return safeStorage.set(PACKS_KEY, JSON.stringify(memory));
}

export function removePack(id: string): boolean {
  memory = loadPacks().filter((p) => p.id !== id);
  return safeStorage.set(PACKS_KEY, JSON.stringify(memory));
}

/** For tests. */
export function resetMemory(): void {
  memory = undefined;
}
