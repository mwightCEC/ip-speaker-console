import { API_PREFIX, type SoundList } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { SoundLibrary } from "./soundLibrary.js";

/** `GET /api/sounds`: every sound the speaker can play. */
export async function registerSoundRoutes(
  app: FastifyInstance,
  library: SoundLibrary,
): Promise<void> {
  app.get(`${API_PREFIX}/sounds`, async (): Promise<SoundList> => ({ sounds: library.list() }));
}
