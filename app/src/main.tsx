import { render } from "preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app.js";
import "./styles.css";

render(<App />, document.getElementById("app")!);

// Precaches the whole app on the first visit, so it opens in airplane mode afterwards.
registerSW({
  immediate: true,
  onOfflineReady: () => document.dispatchEvent(new CustomEvent("quizasaurus:offline-ready")),
});
