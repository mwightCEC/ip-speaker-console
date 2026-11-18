import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace packages to their TypeScript source so tests never need a prior build.
  // The other entries are Vite's default server conditions, which this list replaces.
  ssr: {
    resolve: {
      conditions: ["source", "module", "node", "development|production"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // node:sqlite prints an "experimental" warning in every worker on Node 22; it's expected.
    execArgv: ["--disable-warning=ExperimentalWarning"],
  },
});
