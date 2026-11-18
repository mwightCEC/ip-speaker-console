import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { registerActivityRoutes } from "./activity/activityRoutes.js";
import { ActivityService } from "./activity/activityService.js";
import { ActivityStore } from "./activity/activityStore.js";
import { registerClientApp } from "./client-app.js";
import type { ServerConfig } from "./config.js";
import { EventBus } from "./events/eventBus.js";
import { registerErrorHandler } from "./http/errors.js";
import { registerRealtime } from "./realtime/websocketHub.js";
import { registerHealthRoutes } from "./routes/health.js";
import { openDatabase } from "./storage/database.js";
import { APP_VERSION } from "./version.js";

const DATABASE_FILE_NAME = "console.db";

export interface AppOptions {
  config: ServerConfig;
  /** Absolute path to the built client. When the folder doesn't exist, only the API is served. */
  clientDistDir: string;
  /** Overrides the database location; tests pass IN_MEMORY. Defaults to <dataDir>/console.db. */
  databaseFile?: string;
  /** Set to false in tests to keep output quiet. */
  logger?: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Records activity and lists the log. Use this for every event worth showing users. */
    activity: ActivityService;
  }
}

/**
 * Builds the Fastify application and its services without starting to listen, so tests can
 * use `inject` and `injectWS`. Closing the app closes the database.
 */
export async function buildApp({
  config,
  clientDistDir,
  databaseFile = path.join(config.dataDir, DATABASE_FILE_NAME),
  logger = true,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: config.logLevel } : false,
  });

  const db = openDatabase(databaseFile);
  app.addHook("onClose", async () => db.close());

  const bus = new EventBus(app.log);
  const activity = new ActivityService(
    new ActivityStore(db, config.activityRetention),
    bus,
    app.log,
  );
  app.decorate("activity", activity);

  registerErrorHandler(app);
  await registerRealtime(app, { bus, activity, serverVersion: APP_VERSION });
  await registerHealthRoutes(app, config);
  await registerActivityRoutes(app, activity);
  await registerClientApp(app, clientDistDir);

  return app;
}
