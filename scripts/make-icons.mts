/** Draws the app icons (run once: npx tsx scripts/make-icons.mts). */
import { writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";

function icon(size: number, maskable: boolean): Uint8Array {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const pad = maskable ? 0 : size * 0.06;
  ctx.fillStyle = "#2f7d4f";
  ctx.beginPath();
  ctx.roundRect(pad, pad, size - 2 * pad, size - 2 * pad, maskable ? 0 : size * 0.22);
  ctx.fill();
  // Maskable icons keep the drawing inside the central 80 % safe zone.
  const scale = maskable ? 0.62 : 0.78;
  ctx.font = `${Math.round(size * scale * 0.82)}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🦖", size / 2, size / 2 + size * 0.04);
  return canvas.toBuffer("image/png");
}

writeFileSync("app/public/icons/icon-192.png", icon(192, false));
writeFileSync("app/public/icons/icon-512.png", icon(512, false));
writeFileSync("app/public/icons/icon-maskable-512.png", icon(512, true));
