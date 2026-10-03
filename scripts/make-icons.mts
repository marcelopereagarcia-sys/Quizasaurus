/**
 * Builds the app icons and header logo from assets/logo.png.
 * Run after changing the logo: npx tsx scripts/make-icons.mts
 */
import { writeFileSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const logo = await loadImage("assets/logo.png");

/** The logo on a transparent background (it already has its own rounded square). */
function plain(size: number): Uint8Array {
  const canvas = createCanvas(size, size);
  canvas.getContext("2d").drawImage(logo, 0, 0, size, size);
  return canvas.toBuffer("image/png");
}

/**
 * Maskable: Android may crop it to a circle, so the background fills the whole
 * square and the logo stays inside the central safe zone (80 %).
 */
function maskable(size: number): Uint8Array {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#7763fa");
  gradient.addColorStop(1, "#3f63ee");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const inner = size * 0.8;
  ctx.drawImage(logo, (size - inner) / 2, (size - inner) / 2, inner, inner);
  return canvas.toBuffer("image/png");
}

writeFileSync("app/public/icons/icon-192.png", plain(192));
writeFileSync("app/public/icons/icon-512.png", plain(512));
writeFileSync("app/public/icons/icon-maskable-512.png", maskable(512));
writeFileSync("app/public/icons/apple-touch-icon.png", maskable(180));
writeFileSync("app/public/logo.png", plain(160));
