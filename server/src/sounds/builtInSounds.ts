import { fileURLToPath } from "node:url";

/**
 * The sounds shipped with the console, in display order. They can be played, downloaded and
 * pinned, but not renamed or deleted.
 */
export const BUILT_IN_SOUNDS = [
  { id: "test-tone", name: "Test tone", fileName: "test-tone.wav" },
  { id: "chime", name: "Chime", fileName: "chime.wav" },
  { id: "alert", name: "Alert", fileName: "alert.wav" },
] as const;

// server/assets/sounds, from both src/ (development) and dist/ (production).
export const BUILT_IN_SOUNDS_DIR = fileURLToPath(new URL("../../assets/sounds", import.meta.url));
