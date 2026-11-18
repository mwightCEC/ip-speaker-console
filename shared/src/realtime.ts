import type { ActivityEvent } from "./activity.js";
import type { AudioDriverName } from "./api.js";
import type { PlaybackState } from "./playback.js";
import type { VolumeState } from "./volume.js";

/**
 * Full state sent as the first message on every WebSocket connection, including reconnects.
 * The client replaces what it has with this, so it never misses changes made while it was
 * disconnected. Later milestones add settings and network state here.
 */
export interface SnapshotMessage {
  type: "snapshot";
  serverVersion: string;
  audioDriver: AudioDriverName;
  playback: PlaybackState;
  volume: VolumeState;
  /** Most recent activity, newest first. */
  recentActivity: ActivityEvent[];
}

/** Sent whenever a new activity event is recorded. */
export interface ActivityCreatedMessage {
  type: "activity.created";
  event: ActivityEvent;
}

/** Sent whenever playback starts or ends. */
export interface PlaybackChangedMessage {
  type: "playback.changed";
  playback: PlaybackState;
}

/** Sent whenever the volume changes. */
export interface VolumeChangedMessage {
  type: "volume.changed";
  volume: VolumeState;
}

/** Every message the server sends over the WebSocket. */
export type ServerMessage =
  | SnapshotMessage
  | ActivityCreatedMessage
  | PlaybackChangedMessage
  | VolumeChangedMessage;

/** How many recent activity events a snapshot carries. */
export const SNAPSHOT_ACTIVITY_LIMIT = 20;
