/**
 * Test inputs generated on the fly from our own example text, so no PDF or
 * photo is ever committed (the repository ignores *.pdf).
 */
import { readFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const exampleLines = readFileSync(new URL("../examples/ciclo-del-agua.txt", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((line) => line.trim() !== "");

/** A fake identification field, as found on worksheets. */
export const FAKE_ID_LINE = "Nom: Joan Garcia Puig   Data: 30/9/2026";

/** A PDF with a real text layer: one page per group of lines. */
export async function textPdf(pages: string[][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([595, 842]);
    lines.forEach((line, i) => {
      for (const [j, chunk] of wrap(line, 90).entries()) {
        page.drawText(chunk, { x: 40, y: 800 - (i * 2 + j) * 16, size: 11, font });
      }
    });
  }
  return doc.save();
}

/** A page of text rendered as a PNG, like a clean scan. */
export function pageImage(lines: string[], width = 1100): Uint8Array {
  const lineHeight = 34;
  const wrapped = lines.flatMap((line) => [...wrap(line, 60), ""]);
  const canvas = createCanvas(width, 80 + wrapped.length * lineHeight);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.font = "26px sans-serif";
  wrapped.forEach((line, i) => ctx.fillText(line, 50, 60 + i * lineHeight));
  return canvas.toBuffer("image/png");
}

/** A PDF whose only page is an image: no text layer, like a scanned book. */
export async function scannedPdf(png: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  const page = doc.addPage([540, 720]);
  page.drawImage(image, { x: 0, y: 0, width: 540, height: 720 });
  return doc.save();
}

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return line ? [...out, line] : out;
}

/** Share of the reference words found in the output (case-insensitive bag of words). */
export function wordRecall(reference: string, output: string): number {
  const words = (s: string) => s.normalize("NFC").toLowerCase().match(/\p{L}+/gu) ?? [];
  const available = new Map<string, number>();
  for (const w of words(output)) available.set(w, (available.get(w) ?? 0) + 1);
  const ref = words(reference);
  let hits = 0;
  for (const w of ref) {
    const n = available.get(w) ?? 0;
    if (n > 0) {
      hits++;
      available.set(w, n - 1);
    }
  }
  return hits / ref.length;
}
