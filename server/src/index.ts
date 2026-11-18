import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { ConfigError, loadConfig } from "./config.js";
import { APP_VERSION } from "./version.js";

// The client build sits beside the server package: <repo>/client/dist.
const CLIENT_DIST_DIR = fileURLToPath(new URL("../../client/dist", import.meta.url));

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config, clientDistDir: CLIENT_DIST_DIR });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.fatal({ err: error }, `Couldn't listen on ${config.host}:${config.port}`);
    await app.close();
    process.exit(1);
  }

  app.activity.record({
    category: "device",
    outcome: "info",
    message: `Console started, version ${APP_VERSION}`,
    detail: `Audio driver: ${config.audioDriver}. System driver: ${config.systemDriver}.`,
  });
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(`Invalid configuration: ${error.message}`);
  } else {
    console.error("The server failed to start.", error);
  }
  process.exit(1);
});
