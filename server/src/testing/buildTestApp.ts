import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp, type AppOptions } from "../app.js";
import { loadConfig } from "../config.js";
import { IN_MEMORY } from "../storage/database.js";

/**
 * Builds the app for a test: an in-memory database, no client build, no logging, and a
 * temporary data folder (for uploaded sounds) that's deleted when the app closes.
 */
export async function buildTestApp(options: Partial<AppOptions> = {}): Promise<FastifyInstance> {
  const dataDir = mkdtempSync(path.join(tmpdir(), "isc-test-"));
  const app = await buildApp({
    config: loadConfig({ DATA_DIR: dataDir }),
    clientDistDir: "/nonexistent",
    databaseFile: IN_MEMORY,
    logger: false,
    ...options,
  });
  app.addHook("onClose", () => rm(dataDir, { recursive: true, force: true }));
  return app;
}
