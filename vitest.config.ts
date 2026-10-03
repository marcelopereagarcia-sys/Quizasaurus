import { defineConfig } from "vitest/config";

// Separate from vite.config.ts, whose root is app/: tests run from the repository root.
export default defineConfig({
  root: ".",
  test: {
    include: ["test/**/*.test.ts"],
  },
});
