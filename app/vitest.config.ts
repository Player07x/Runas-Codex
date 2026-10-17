import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globals: true,
    // Evita dezenas de parsers e importadores concorrendo por CPU nos checkouts e no CI.
    maxWorkers: 2,
  },
})
