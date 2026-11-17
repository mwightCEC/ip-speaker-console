import Fastify, { type FastifyInstance } from "fastify";
import type { ServerConfig } from "./config.js";
import { registerClientApp } from "./client-app.js";
import { registerHealthRoutes } from "./routes/health.js";

export interface AppOptions {
  config: ServerConfig;
  /** Absolute path to the built client. When the folder doesn't exist, only the API is served. */
  clientDistDir: string;
  /** Set to false in tests to keep output quiet. */
  logger?: boolean;
}

/** Builds the Fastify application without starting to listen, so tests can use `inject`. */
export async function buildApp({
  config,
  clientDistDir,
  logger = true,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: config.logLevel } : false,
  });

  await registerHealthRoutes(app, config);
  await registerClientApp(app, clientDistDir);

  return app;
}
