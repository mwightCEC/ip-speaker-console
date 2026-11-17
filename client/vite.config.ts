import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

// Where `npm run dev -w server` listens. Override with API_TARGET if the server runs elsewhere.
const apiTarget = process.env.API_TARGET ?? "http://127.0.0.1:3000";

// Must match API_PREFIX and WS_PATH in @ip-speaker-console/shared. They're repeated here because
// Vite loads this file before `resolve.conditions` applies, so it can't import the shared source.
const API_PREFIX = "/api";
const WS_PATH = "/ws";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use the shared package's TypeScript source, so no build step is needed during development.
    conditions: ["source", ...defaultClientConditions],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      [API_PREFIX]: { target: apiTarget },
      [WS_PATH]: { target: apiTarget, ws: true },
    },
  },
});
