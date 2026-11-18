import { defineConfig } from "vitest/config";

// Unit tests for client logic that doesn't need a browser (state updates, timing). Component
// tests would add a DOM environment here.
export default defineConfig({
  // Resolve workspace packages to their TypeScript source; the rest are Vite's server defaults.
  ssr: {
    resolve: {
      conditions: ["source", "module", "node", "development|production"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
