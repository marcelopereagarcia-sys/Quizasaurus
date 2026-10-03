import { render } from "preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app.js";
// Fonts ship with the app (OFL), so it looks the same offline. Latin covers ca, es and en.
import "@fontsource/lexend/latin-400.css";
import "@fontsource/lexend/latin-600.css";
import "@fontsource/lexend/latin-700.css";
import "@fontsource/pixelify-sans/latin-700.css";
import "./styles.css";

render(<App />, document.getElementById("app")!);

// Precaches the whole app on the first visit, so it opens in airplane mode afterwards.
registerSW({
  immediate: true,
  onOfflineReady: () => document.dispatchEvent(new CustomEvent("quizasaurus:offline-ready")),
});
