/** A sound the speaker can play. */
export interface Sound {
  /** Stable identifier used in API requests. Uploaded sounds get a generated one. */
  id: string;
  /** Name shown to people, such as "Chime". */
  name: string;
  /** Length of the recording in milliseconds. */
  durationMs: number;
  /**
   * Name of the WAV file, such as "chime.wav". For an upload it's the name the file had on the
   * computer it came from; it's only shown, never used to find the file.
   */
  fileName: string;
  sizeBytes: number;
  format: SoundFormat;
  /** Shipped with the console. Built-in sounds can't be renamed or deleted. */
  builtIn: boolean;
  /** Shown in the Dashboard's Quick play list. */
  pinned: boolean;
  /** When it was added to the library, as an ISO 8601 UTC timestamp. */
  addedAt: string;
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

/** Request body of `PATCH /api/sounds/:id`: whichever of the two to change. */
export interface SoundChange {
  name?: string;
  pinned?: boolean;
}

/** Longest sound name, in characters. */
export const SOUND_NAME_MAX_LENGTH = 60;

/** Largest WAV file that can be uploaded. */
export const SOUND_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** The form field `POST /api/sounds` reads the uploaded file from. */
export const SOUND_UPLOAD_FIELD = "file";
