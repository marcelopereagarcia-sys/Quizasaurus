import { describe, expect, it } from "vitest";
import { cleanPageText } from "../src/extract/clean.js";
import { extractPdf, extractUnit, joinPages } from "../src/extract/extract.js";
import type { VisionTranscriber } from "../src/extract/vision.js";
import { FAKE_ID_LINE, exampleLines, pageImage, scannedPdf, textPdf } from "./fixtures.js";

/** A vision model stand-in that records what it receives. */
function fakeVision(answer: (call: number) => string) {
  const images: Uint8Array[] = [];
  const vision: VisionTranscriber = {
    name: "fake",
    async transcribe(image) {
      images.push(image);
      return answer(images.length);
    },
  };
  return { vision, images };
}

const noVision: VisionTranscriber = {
  name: "none",
  transcribe: () => Promise.reject(new Error("A page with a text layer must not go to the vision model")),
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

describe("cleanPageText", () => {
  it("removes identification fields with personal data", () => {
    const text = cleanPageText(`${FAKE_ID_LINE}\nNom i cognoms: Joan Garcia Puig\nCurs: 3r B\nREPÀS CATALÀ`);
    expect(text).toBe("REPÀS CATALÀ");
  });

  it("removes filled-in fields written without a colon", () => {
    const text = cleanPageText("Nom JOAN GARCIA Data 29/09/2026\nNom | Nombre de síl·labes | Exemple");
    expect(text).toBe("Nom | Nombre de síl·labes | Exemple");
  });

  it("collapses a line repeated in a loop", () => {
    const text = cleanPageText(["màquina →", ...Array(697).fill("→"), "ordinador →"].join("\n"));
    expect(text).toBe("màquina →\n→\n→\nordinador →");
  });

  it("removes empty field lines left on the page", () => {
    expect(cleanPageText("FITXA 1\nNom Data\nNom ________ Data ________\nText")).toBe("FITXA 1\nText");
  });

  it("keeps content that starts like a field label", () => {
    const text = "Nombre de síl·labes\nNoms comuns: nen, gos, ciutat\nData de la festa: dilluns";
    expect(cleanPageText(text)).toBe(text);
  });

  it("keeps first names inside the content (PM decision, ADR-0002)", () => {
    expect(cleanPageText("Noms propis: Joan, Barcelona, Pirineus")).toBe("Noms propis: Joan, Barcelona, Pirineus");
  });

  it("fixes Cyrillic look-alikes that vision models sometimes emit", () => {
    expect(cleanPageText("La separació de síl·lаbes")).toBe("La separació de síl·labes");
  });

  it("turns symbol-font bullets into •", () => {
    expect(cleanPageText(" Síl·laba tònica")).toBe("• Síl·laba tònica");
  });
});

describe("PDF with a text layer", () => {
  it("is read directly, page by page and in reading order, without the vision model", async () => {
    const pdf = await textPdf([[FAKE_ID_LINE, ...exampleLines.slice(0, 5)], exampleLines.slice(5)]);
    const pages = await extractPdf(pdf, { vision: noVision });

    expect(pages.map((p) => [p.page, p.method])).toEqual([
      [1, "text-layer"],
      [2, "text-layer"],
    ]);
    expect(pages[0]?.text).toContain("El hielo y la nieve son agua en estado sólido.");
    expect(pages[0]?.text).not.toContain("Joan");
    const all = joinPages(pages);
    const positions = exampleLines.map((line) => all.indexOf(line.slice(0, 30)));
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe("scans and photos", () => {
  it("a scanned PDF page is rendered to an image and sent to the vision model", async () => {
    const pdf = await scannedPdf(pageImage(exampleLines.slice(0, 4)));
    const { vision, images } = fakeVision(() => `${FAKE_ID_LINE}\nEl agua puede estar en tres estados.`);

    const [page] = await extractPdf(pdf, { vision });

    expect(page?.method).toBe("vision");
    expect(page?.text).toBe("El agua puede estar en tres estados.");
    expect(images).toHaveLength(1);
    expect([...(images[0] ?? []).slice(0, 4)]).toEqual(PNG_SIGNATURE);
  });

  it("photos go to the vision model, numbered after the previous files", async () => {
    const pdf = await textPdf([exampleLines.slice(0, 3)]);
    const { vision } = fakeVision((n) => `Foto ${n}`);
    const pages = await extractUnit(
      [
        { name: "unitat.pdf", data: pdf },
        { name: "foto-1.JPG", data: pageImage(["a"]) },
        { name: "foto-2.png", data: pageImage(["b"]) },
      ],
      { vision },
    );
    expect(pages.map((p) => [p.page, p.method, p.text])).toEqual([
      [1, "text-layer", expect.stringContaining("El ciclo del agua")],
      [2, "vision", "Foto 1"],
      [3, "vision", "Foto 2"],
    ]);
  });

  it("explains what is missing when a scan arrives without a vision model", async () => {
    await expect(extractUnit([{ name: "foto.jpg", data: pageImage(["a"]) }])).rejects.toThrow(/needs a vision model/);
  });

  it("rejects unsupported files with the list of supported ones", async () => {
    await expect(extractUnit([{ name: "foto.heic", data: new Uint8Array() }])).rejects.toThrow(/\.pdf, \.jpg/);
  });
});
