/** The sound that's playing right now. */
export interface NowPlaying {
  soundId: string;
  soundName: string;
  /** When playback started, as an ISO 8601 UTC timestamp. */
  startedAt: string;
  durationMs: number;
  /**
   * How far into the sound playback was when this state was sent. Clients time progress from
   * this rather than `startedAt`, so a browser whose clock differs from the device's still shows
   * the right position.
   */
  elapsedMs: number;
}

/** How the most recent playback ended. */
export const PLAYBACK_ENDINGS = ["finished", "stopped", "replaced", "failed"] as const;
export type PlaybackEnding = (typeof PLAYBACK_ENDINGS)[number];

export interface PlaybackResult {
  soundId: string;
  soundName: string;
  ending: PlaybackEnding;
  /** When playback ended, as an ISO 8601 UTC timestamp. */
  endedAt: string;
  /** Why playback failed, written for people. Only present when `ending` is "failed". */
  error?: string;
}

/**
 * The speaker's playback state. Response body of `GET /api/playback` and of the play and stop
 * requests. Only one sound plays at a time; playing another one stops the current sound first.
 */
export interface PlaybackState {
  /** Absent when the speaker is idle. */
  nowPlaying?: NowPlaying;
  /** Absent until the first playback since the server started has ended. */
  lastResult?: PlaybackResult;
}

/** Request body of `POST /api/playback`. */
export interface PlayRequest {
  soundId: string;
}
