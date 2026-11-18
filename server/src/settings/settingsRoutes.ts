import { API_PREFIX, type DeviceSettings, type SettingsChange } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { SettingsService } from "./settingsService.js";

const SETTINGS_PATH = `${API_PREFIX}/settings`;

/** `GET /api/settings` reports the device settings; `PATCH /api/settings` changes them. */
export async function registerSettingsRoutes(
  app: FastifyInstance,
  settings: SettingsService,
): Promise<void> {
  app.get(SETTINGS_PATH, async (): Promise<DeviceSettings> => settings.state);

  app.patch<{ Body: SettingsChange }>(
    SETTINGS_PATH,
    {
      schema: {
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            deviceName: { type: "string", maxLength: 200 },
            timeZone: { type: "string", maxLength: 100 },
          },
        },
      },
    },
    (request): Promise<DeviceSettings> => settings.update(request.body),
  );
}
