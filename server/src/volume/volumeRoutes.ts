import {
  API_PREFIX,
  VOLUME_MAX,
  VOLUME_MIN,
  type VolumeChange,
  type VolumeState,
} from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { ApiError } from "../http/errors.js";
import type { VolumeService } from "./volumeService.js";

const VOLUME_PATH = `${API_PREFIX}/volume`;

/**
 * `GET /api/volume` reports the volume and mute. `PUT /api/volume` changes either or both, for
 * example `{ "muted": true }`.
 */
export async function registerVolumeRoutes(
  app: FastifyInstance,
  volume: VolumeService,
): Promise<void> {
  app.get(VOLUME_PATH, async (): Promise<VolumeState> => volume.state);

  app.put<{ Body: VolumeChange }>(
    VOLUME_PATH,
    {
      schema: {
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            percent: { type: "integer", minimum: VOLUME_MIN, maximum: VOLUME_MAX },
            muted: { type: "boolean" },
          },
        },
      },
    },
    (request): Promise<VolumeState> =>
      volume.set(request.body).catch((error: unknown) => {
        throw new ApiError(
          500,
          "volume_failed",
          "Couldn't change the volume on the speaker.",
          error instanceof Error ? error.message : String(error),
        );
      }),
  );
}
