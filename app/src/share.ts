/**
 * Sharing a unit with another device (QZS-26): a parent makes and reviews it
 * on their phone and sends it to the child's tablet. No server: the pack
 * travels inside the link, after the "#", which browsers never send to
 * GitHub Pages; or as a .json file for "Load a pack".
 */
import type { Pack } from "../../src/pack/schema.js";
import { type ValidationResult, validatePackJson } from "../../src/pack/validate.js";

const HASH = "#pack=";

/** "z." = deflate-raw, the usual; "j." = plain JSON, for a browser without CompressionStream. */
type Encoding = "z" | "j";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The link that opens the app with this unit, e.g. https://…/Quizasaurus/#pack=z.… */
export async function packLink(pack: Pack, base: string): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack));
  const encoding: Encoding = typeof CompressionStream === "function" ? "z" : "j";
  const bytes = encoding === "z" ? await transform(json, new CompressionStream("deflate-raw")) : json;
  return `${base.split("#")[0]}${HASH}${encoding}.${toBase64Url(bytes)}`;
}

/** Whether the page was opened from a shared link. */
export function isSharedLink(hash: string): boolean {
  return hash.startsWith(HASH);
}

/** The unit inside a shared link, checked like a loaded file. A broken or foreign link is not ok. */
export async function packFromLink(hash: string): Promise<ValidationResult> {
  const broken: ValidationResult = { ok: false, issues: [{ path: "", message: "Broken link" }] };
  const body = hash.slice(HASH.length);
  const [encoding, data] = [body.slice(0, 1), body.slice(2)];
  if (body[1] !== "." || !data) return broken;
  try {
    const bytes = fromBase64Url(data);
    if (encoding === "z") return validatePackJson(new TextDecoder().decode(await transform(bytes, new DecompressionStream("deflate-raw"))));
    if (encoding === "j") return validatePackJson(new TextDecoder().decode(bytes));
  } catch {
    // Cut short or not ours.
  }
  return broken;
}

/** The unit as a file for "Load a pack", named after it. */
export function packFile(pack: Pack): File {
  return new File([JSON.stringify(pack, null, 2)], `${pack.id}.quizasaurus.json`, { type: "application/json" });
}
