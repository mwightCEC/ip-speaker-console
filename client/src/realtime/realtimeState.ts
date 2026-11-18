import {
  SNAPSHOT_ACTIVITY_LIMIT,
  type ActivityEvent,
  type AudioDriverName,
  type NowPlaying,
  type PlaybackResult,
  type PlaybackState,
  type ServerMessage,
  type VolumeState,
} from "@ip-speaker-console/shared";

export type ConnectionStatus = "connecting" | "open" | "closed";

/** A playing sound, timed against this browser's clock. */
export interface LiveNowPlaying extends NowPlaying {
  /**
   * When the sound started by this browser's clock (`Date.now()` milliseconds). Worked out from
   * `elapsedMs` when the message arrived, so it's right even if the device's clock isn't.
   */
  startedAtLocalMs: number;
}

export interface LivePlayback {
  nowPlaying?: LiveNowPlaying;
  lastResult?: PlaybackResult;
  /**
   * The most recent sound this browser saw start, kept after it ends. Lets the Dashboard keep
   * showing that sound, ready to play again.
   */
  lastStarted?: LiveNowPlaying;
}

/** What the client knows about the device, kept current by the WebSocket. */
export interface RealtimeState {
  status: ConnectionStatus;
  /** Set once the first snapshot arrives. */
  serverVersion?: string;
  /** Set once the first snapshot arrives. */
  audioDriver?: AudioDriverName;
  playback: LivePlayback;
  /** Set once the first snapshot arrives. */
  volume?: VolumeState;
  /** Newest first, at most SNAPSHOT_ACTIVITY_LIMIT events. */
  recentActivity: ActivityEvent[];
}

export const INITIAL_STATE: RealtimeState = {
  status: "connecting",
  playback: {},
  recentActivity: [],
};

/**
 * Applies one server message. Pure, so it can be unit-tested without a socket. `receivedAtMs`
 * is when the message arrived, by this browser's clock.
 */
export function applyServerMessage(
  state: RealtimeState,
  message: ServerMessage,
  receivedAtMs: number = Date.now(),
): RealtimeState {
  switch (message.type) {
    case "snapshot":
      // A snapshot is the whole truth: replace, don't merge, so nothing stale survives a reconnect.
      return {
        ...state,
        serverVersion: message.serverVersion,
        audioDriver: message.audioDriver,
        playback: toLivePlayback(message.playback, state.playback, receivedAtMs),
        volume: message.volume,
        recentActivity: message.recentActivity.slice(0, SNAPSHOT_ACTIVITY_LIMIT),
      };
    case "playback.changed":
      return { ...state, playback: toLivePlayback(message.playback, state.playback, receivedAtMs) };
    case "volume.changed":
      return { ...state, volume: message.volume };
    case "activity.created": {
      if (state.recentActivity.some((event) => event.id === message.event.id)) {
        return state;
      }
      return {
        ...state,
        recentActivity: [message.event, ...state.recentActivity].slice(0, SNAPSHOT_ACTIVITY_LIMIT),
      };
    }
  }
}

function toLivePlayback(
  { nowPlaying, lastResult }: PlaybackState,
  previous: LivePlayback,
  receivedAtMs: number,
): LivePlayback {
  const live: LivePlayback = {};
  if (nowPlaying) {
    live.nowPlaying = { ...nowPlaying, startedAtLocalMs: receivedAtMs - nowPlaying.elapsedMs };
    live.lastStarted = live.nowPlaying;
  } else if (previous.lastStarted) {
    live.lastStarted = previous.lastStarted;
  }
  if (lastResult) {
    live.lastResult = lastResult;
  }
  return live;
}
