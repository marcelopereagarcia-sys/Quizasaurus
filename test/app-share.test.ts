import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isSharedLink, packFile, packFromLink, packLink } from "../app/src/share.js";
import type { Pack } from "../src/pack/schema.js";

const pack = JSON.parse(readFileSync(new URL("../examples/ciclo-del-agua.pack.json", import.meta.url), "utf8")) as Pack;
const BASE = "https://example.org/Quizasaurus/";
const hashOf = (link: string) => link.slice(link.indexOf("#"));

describe("sharing a unit with another device (QZS-26)", () => {
  it("puts the whole unit inside the link, after the #, and gets it back the same", async () => {
    const link = await packLink(pack, `${BASE}#old`);
    expect(link.startsWith(`${BASE}#pack=z.`)).toBe(true);
    expect(isSharedLink(hashOf(link))).toBe(true);
    const back = await packFromLink(hashOf(link));
    expect(back.ok && back.pack).toEqual(pack);
  });

  it("keeps the link short enough for a chat message", async () => {
    const link = await packLink(pack, BASE);
    expect(link.length).toBeLessThan(JSON.stringify(pack).length / 2);
  });

  it("reads links made without compression too", async () => {
    const plain = Buffer.from(JSON.stringify(pack)).toString("base64url");
    const back = await packFromLink(`#pack=j.${plain}`);
    expect(back.ok).toBe(true);
  });

  it("turns down broken, cut or foreign links without breaking", async () => {
    const link = await packLink(pack, BASE);
    for (const hash of ["#pack=", "#pack=z.", "#pack=x.abc", "#pack=z.!!!", hashOf(link).slice(0, 200)]) {
      expect((await packFromLink(hash)).ok).toBe(false);
    }
    expect(isSharedLink("#other")).toBe(false);
  });

  it("only lets in a unit that passes the pack format", async () => {
    const bad = Buffer.from(JSON.stringify({ ...pack, games: [] })).toString("base64url");
    expect((await packFromLink(`#pack=j.${bad}`)).ok).toBe(false);
  });

  it("saves the unit as a .json file that loads back the same", async () => {
    const file = packFile(pack);
    expect(file.name).toBe("ciclo-del-agua.quizasaurus.json");
    expect(JSON.parse(await file.text())).toEqual(pack);
  });
});
