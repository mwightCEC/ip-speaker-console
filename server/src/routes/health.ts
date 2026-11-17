import { API_PREFIX, type HealthResponse } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";
import { APP_VERSION } from "../version.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  config: ServerConfig,
): Promise<void> {
  app.get(`${API_PREFIX}/health`, async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      version: APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      drivers: {
        audio: config.audioDriver,
        system: config.systemDriver,
      },
    };
  });
}
