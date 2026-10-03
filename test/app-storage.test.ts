import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UI_LANGS, defaultUiLang } from "../app/src/i18n.js";
import { loadPacks, removePack, resetMemory, savePack } from "../app/src/storage.js";
import type { Pack } from "../src/pack/schema.js";

const example = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

beforeEach(() => resetMemory());
afterEach(() => vi.unstubAllGlobals());

describe("pack storage on the device", () => {
  it("saves, replaces by id and removes packs", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    expect(savePack(example)).toBe(true);
    expect(savePack({ ...example, title: "Nou títol" })).toBe(true);
    resetMemory();
    expect(loadPacks().map((p) => p.title)).toEqual(["Nou títol"]);

    removePack(example.id);
    resetMemory();
    expect(loadPacks()).toEqual([]);
  });

  it("keeps working from memory when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    expect(loadPacks()).toEqual([]);
    expect(savePack(example)).toBe(false);
    expect(loadPacks()).toHaveLength(1);
  });

  it("drops stored packs that are corrupt or no longer valid", () => {
    const storage = memoryStorage();
    storage.setItem("quizasaurus.packs.v1", JSON.stringify([example, { id: "broken" }]));
    vi.stubGlobal("localStorage", storage);
    expect(loadPacks().map((p) => p.id)).toEqual([example.id]);

    resetMemory();
    storage.setItem("quizasaurus.packs.v1", "{not json");
    expect(loadPacks()).toEqual([]);
  });
});

describe("interface language", () => {
  it("is the first browser language the app speaks, English otherwise", () => {
    expect(defaultUiLang(["ca-ES", "es"])).toBe("ca");
    expect(defaultUiLang(["es-ES", "en"])).toBe("es");
    expect(defaultUiLang(["fr-FR", "en-GB"])).toBe("en");
    expect(defaultUiLang(["de-DE"])).toBe("en");
    expect(defaultUiLang([])).toBe("en");
  });

  it("has every text in the three languages", () => {
    const keys = (dict: object) => Object.keys(dict).sort();
    expect(Object.keys(UI_LANGS)).toEqual(["ca", "es", "en"]);
    for (const dict of Object.values(UI_LANGS)) expect(keys(dict)).toEqual(keys(UI_LANGS.es));
  });
});
