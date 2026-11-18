import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Sound } from "@ip-speaker-console/shared";
import type { FastifyBaseLogger } from "fastify";
import { readWavFile } from "../audio/wav.js";

/** A sound plus where its file is on disk. The path stays on the server. */
export interface LibrarySound extends Sound {
  file: string;
}

/** Where playable sounds come from. M5 replaces the bundled list with uploaded sounds. */
export interface SoundLibrary {
  list(): Sound[];
  find(id: string): LibrarySound | undefined;
}

/** The sounds shipped with the console, in display order. */
const BUNDLED_SOUNDS = [
  { id: "test-tone", name: "Test tone", fileName: "test-tone.wav" },
  { id: "chime", name: "Chime", fileName: "chime.wav" },
  { id: "alert", name: "Alert", fileName: "alert.wav" },
] as const;

// server/assets/sounds, from both src/ (development) and dist/ (production).
export const BUNDLED_SOUNDS_DIR = fileURLToPath(new URL("../../assets/sounds", import.meta.url));

/**
 * A fixed, read-only set of sample sounds so the speaker can be tested before the sounds
 * library exists. Files that are missing or unreadable are logged and left out.
 */
export async function loadBundledSounds(
  log: FastifyBaseLogger,
  directory = BUNDLED_SOUNDS_DIR,
): Promise<SoundLibrary> {
  const sounds: LibrarySound[] = [];

  for (const { id, name, fileName } of BUNDLED_SOUNDS) {
    const file = path.join(directory, fileName);
    try {
      const { durationMs, sampleRate, channels, bitsPerSample } = await readWavFile(file);
      const { size } = await stat(file);
      sounds.push({
        id,
        name,
        durationMs,
        fileName,
        sizeBytes: size,
        format: { sampleRate, channels, bitsPerSample },
        file,
      });
    } catch (error) {
      log.error({ err: error, file }, `Couldn't load the bundled sound "${name}"`);
    }
  }

  return {
    list: () => sounds.map(({ file: _file, ...sound }) => sound),
    find: (id) => sounds.find((sound) => sound.id === id),
  };
}
