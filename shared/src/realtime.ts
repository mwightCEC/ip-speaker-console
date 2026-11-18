import type { ActivityEvent } from "./activity.js";

/**
 * Full state sent as the first message on every WebSocket connection, including reconnects.
 * The client replaces what it has with this, so it never misses changes made while it was
 * disconnected. Later milestones add playback, settings and network state here.
 */
export interface SnapshotMessage {
  type: "snapshot";
  serverVersion: string;
  /** Most recent activity, newest first. */
  recentActivity: ActivityEvent[];
}

/** Sent whenever a new activity event is recorded. */
export interface ActivityCreatedMessage {
  type: "activity.created";
  event: ActivityEvent;
}

/** Every message the server sends over the WebSocket. */
export type ServerMessage = SnapshotMessage | ActivityCreatedMessage;

/** How many recent activity events a snapshot carries. */
export const SNAPSHOT_ACTIVITY_LIMIT = 20;
