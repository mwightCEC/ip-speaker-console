import type { AudioDriverName } from "@ip-speaker-console/shared";

/** Where the sound goes, for each audio driver. */
export const AUDIO_OUTPUT_LABELS: Record<AudioDriverName, string> = {
  aplay: "Speaker (ALSA)",
  mock: "Simulated, no sound",
};
