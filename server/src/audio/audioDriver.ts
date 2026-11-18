import type { AudioDriverName } from "@ip-speaker-console/shared";

export interface PlayOptions {
  /** Length of the sound, from its WAV header. */
  durationMs: number;
  /** Aborting stops playback; `play` then resolves once the sound has actually stopped. */
  signal: AbortSignal;
}

/**
 * Plays sound files through one output. Swapping the driver is how the console runs without
 * speaker hardware during development.
 */
export interface AudioDriver {
  readonly name: AudioDriverName;
  /**
   * Plays a WAV file to the end. Resolves when the sound finishes or has been stopped through
   * `signal`, and rejects with a message written for people if it can't be played.
   */
  play(file: string, options: PlayOptions): Promise<void>;
}
