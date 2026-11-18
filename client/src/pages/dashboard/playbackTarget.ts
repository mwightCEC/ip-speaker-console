import type { Sound } from "@ip-speaker-console/shared";
import type { LivePlayback } from "../../realtime/realtimeState";

/** The sound shown in the Playback card. */
export interface PlaybackTarget {
  soundId: string;
  name: string;
  durationMs: number;
}

/** A sound picked in this browser, and when (by `Date.now()`). */
export interface SoundSelection {
  soundId: string;
  selectedAtMs: number;
}

/**
 * Picks the sound for the Playback card: whichever happened last of this browser's selection
 * and a sound starting to play (from any browser). The sound stays after it finishes, ready to
 * play again, until another is selected or played. With neither, it falls back to the last
 * sound that played before this page opened. The name comes from the library when the sound is
 * still in it, so a rename shows straight away.
 */
export function pickPlaybackTarget(
  selection: SoundSelection | undefined,
  playback: LivePlayback,
  sounds: readonly Sound[],
): PlaybackTarget | undefined {
  const { lastStarted, lastResult } = playback;
  const selectedSound = selection && sounds.find((sound) => sound.id === selection.soundId);

  if (
    lastStarted &&
    (!selectedSound || lastStarted.startedAtLocalMs >= (selection?.selectedAtMs ?? 0))
  ) {
    const current = sounds.find((sound) => sound.id === lastStarted.soundId);
    return {
      soundId: lastStarted.soundId,
      name: current?.name ?? lastStarted.soundName,
      durationMs: lastStarted.durationMs,
    };
  }

  const sound = selectedSound ?? sounds.find((candidate) => candidate.id === lastResult?.soundId);
  return sound && { soundId: sound.id, name: sound.name, durationMs: sound.durationMs };
}
