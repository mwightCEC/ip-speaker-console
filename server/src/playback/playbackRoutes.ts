import { API_PREFIX, type PlaybackState, type PlayRequest } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { ApiError } from "../http/errors.js";
import type { SoundLibrary } from "../sounds/soundLibrary.js";
import type { PlaybackService } from "./playbackService.js";

const PLAYBACK_PATH = `${API_PREFIX}/playback`;

/**
 * `GET /api/playback` reports what's playing, `POST /api/playback` plays a sound (stopping the
 * current one) and `POST /api/playback/stop` stops it. Each answers with the playback state.
 */
export async function registerPlaybackRoutes(
  app: FastifyInstance,
  { playback, library }: { playback: PlaybackService; library: SoundLibrary },
): Promise<void> {
  app.get(PLAYBACK_PATH, async (): Promise<PlaybackState> => playback.state);

  app.post<{ Body: PlayRequest }>(
    PLAYBACK_PATH,
    {
      schema: {
        body: {
          type: "object",
          required: ["soundId"],
          properties: { soundId: { type: "string", minLength: 1, maxLength: 200 } },
        },
      },
    },
    (request): Promise<PlaybackState> => {
      const sound = library.find(request.body.soundId);
      if (!sound) {
        throw new ApiError(
          404,
          "sound_not_found",
          "That sound isn't on the device. Refresh the page to see the current sounds.",
        );
      }
      return playback.play(sound);
    },
  );

  app.post(`${PLAYBACK_PATH}/stop`, (): Promise<PlaybackState> => playback.stop());
}
