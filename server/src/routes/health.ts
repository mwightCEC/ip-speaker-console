import { API_PREFIX, type HealthResponse } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";
import type { BootState } from "../system/bootState.js";
import { APP_VERSION } from "../version.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  { config, boot }: { config: ServerConfig; boot: BootState },
): Promise<void> {
  app.get(`${API_PREFIX}/health`, async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      version: APP_VERSION,
      bootId: boot.id,
      uptimeSeconds: Math.round(process.uptime()),
      drivers: {
        audio: config.audioDriver,
        system: config.systemDriver,
      },
    };
  });
}
