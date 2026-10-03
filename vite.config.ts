import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The app lives in app/ and reuses the pack code in src/ (ADR-0003).
// Relative base: works on GitHub Pages under /Quizasaurus/ and locally.
export default defineConfig({
  root: "app",
  base: "./",
  publicDir: "public",
  build: { outDir: "../dist", emptyOutDir: true },
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      // globPatterns below already precaches the icons and the logo.
      includeManifestIcons: false,
      manifest: {
        name: "Quizasaurus",
        short_name: "Quizasaurus",
        description: "Study games made from your own school unit. Works offline.",
        lang: "en",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "any",
        background_color: "#bfe3f5",
        theme_color: "#3f8a2c",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // A new version takes over at once instead of waiting for every tab of the
        // installed app to close (otherwise a tablet could keep an old version for weeks).
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Everything the player needs is precached, so it opens in airplane mode.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
