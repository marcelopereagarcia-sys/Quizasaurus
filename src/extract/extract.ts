/**
 * Turns a school unit (a PDF or photos) into clean text, page by page.
 *
 * - PDF pages with a text layer are read directly, without OCR.
 * - Scanned PDF pages and photos go to a vision model (ADR-0002).
 * - Every page is cleaned of identification fields before it is returned.
 */
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { cleanPageText } from "./clean.js";
import type { VisionTranscriber } from "./vision.js";

export type ExtractionMethod = "text-layer" | "vision";

export interface ExtractedPage {
  /** 1-based, in the order the pages were given. */
  page: number;
  method: ExtractionMethod;
  text: string;
  seconds: number;
}

export interface ExtractOptions {
  /** Needed only for scanned pages and photos. */
  vision?: VisionTranscriber | undefined;
  /** Called after each page, for progress output. */
  onPage?: (page: ExtractedPage, total: number) => void;
}

/** A PDF page counts as having a text layer if it has at least this many letters. */
const MIN_TEXT_LAYER_LETTERS = 25;

/** Scanned pages are rendered at 2× (~1080 × 1440 px for a 540 × 720 pt page). */
const RENDER_SCALE = 2;

export const SUPPORTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"] as const;

/** ".pdf", ".jpg"…: the extension of a file name, lowercase (no node:path, so it also runs in the browser). */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > name.lastIndexOf("/") && dot > name.lastIndexOf("\\") ? name.slice(dot).toLowerCase() : "";
}

/**
 * The canvas pdf.js draws scanned pages on: Node needs @napi-rs/canvas, the
 * browser has its own. The module name is a variable so the web bundle skips it.
 */
const NODE_CANVAS = "@napi-rs/canvas";
const canvasImport = typeof document === "undefined" ? () => import(/* @vite-ignore */ NODE_CANVAS) : undefined;

export interface InputFile {
  name: string;
  data: Uint8Array;
}

/** Extracts all files in order; pages are numbered across files. */
export async function extractUnit(files: InputFile[], options: ExtractOptions = {}): Promise<ExtractedPage[]> {
  const pages: ExtractedPage[] = [];
  for (const file of files) {
    const ext = extensionOf(file.name);
    if (ext === ".pdf") {
      pages.push(...(await extractPdf(file.data, { ...options, firstPage: pages.length + 1 })));
    } else if ((SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
      const page = await transcribe(file.data, pages.length + 1, options.vision, file.name);
      options.onPage?.(page, pages.length + 1);
      pages.push(page);
    } else {
      throw new Error(`Unsupported file "${file.name}". Use a PDF or a photo (${SUPPORTED_EXTENSIONS.join(", ")}).`);
    }
  }
  return pages;
}

export async function extractPdf(
  data: Uint8Array,
  options: ExtractOptions & { firstPage?: number } = {},
): Promise<ExtractedPage[]> {
  // pdf.js takes ownership of the buffer it is given, so it gets a copy.
  const pdf = await getDocumentProxy(new Uint8Array(data), { verbosity: 0 });
  const first = options.firstPage ?? 1;
  const pages: ExtractedPage[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const started = performance.now();
    const raw = await pageText(pdf, n);
    let page: ExtractedPage;
    if (countLetters(raw) >= MIN_TEXT_LAYER_LETTERS) {
      page = { page: first + n - 1, method: "text-layer", text: cleanPageText(raw), seconds: elapsed(started) };
    } else {
      const image = new Uint8Array(
        await renderPageAsImage(pdf, n, { scale: RENDER_SCALE, ...(canvasImport ? { canvasImport } : {}) }),
      );
      page = await transcribe(image, first + n - 1, options.vision, `page ${n}`);
      page.seconds = elapsed(started);
    }
    options.onPage?.(page, pdf.numPages);
    pages.push(page);
  }
  return pages;
}

async function transcribe(
  image: Uint8Array,
  pageNumber: number,
  vision: VisionTranscriber | undefined,
  label: string,
): Promise<ExtractedPage> {
  if (!vision) {
    throw new Error(`${label} is a scan or a photo and needs a vision model (see .env.example).`);
  }
  const started = performance.now();
  const text = await vision.transcribe(image);
  return { page: pageNumber, method: "vision", text: cleanPageText(text), seconds: elapsed(started) };
}

/** Text of one PDF page, one line per visual line (pdf.js marks line ends with `hasEOL`). */
async function pageText(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, n: number): Promise<string> {
  const page = await pdf.getPage(n);
  const content = await page.getTextContent();
  let text = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    text += item.str + (item.hasEOL ? "\n" : "");
  }
  return text;
}

const countLetters = (text: string) => (text.match(/\p{L}/gu) ?? []).length;
const elapsed = (started: number) => Math.round(performance.now() - started) / 1000;

/** One text file for the whole unit, with a marker before each page. */
export function joinPages(pages: ExtractedPage[]): string {
  return pages.map((p) => `--- page ${p.page} ---\n${p.text}`).join("\n\n") + "\n";
}
