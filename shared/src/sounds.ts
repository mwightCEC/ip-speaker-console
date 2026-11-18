/** A sound the speaker can play. */
export interface Sound {
  /** Stable identifier used in API requests. */
  id: string;
  /** Name shown to people, such as "Chime". */
  name: string;
  /** Length of the recording in milliseconds. */
  durationMs: number;
  /** Name of the WAV file on the device, such as "chime.wav". */
  fileName: string;
  sizeBytes: number;
  format: SoundFormat;
}

/** How the audio in a WAV file is encoded. */
export interface SoundFormat {
  /** Samples per second, such as 44100. */
  sampleRate: number;
  /** 1 for mono, 2 for stereo. */
  channels: number;
  bitsPerSample: number;
}

/** Response body of `GET /api/sounds`. */
export interface SoundList {
  sounds: Sound[];
}
