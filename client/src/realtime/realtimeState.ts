import {
  SNAPSHOT_ACTIVITY_LIMIT,
  type ActivityEvent,
  type ServerMessage,
} from "@ip-speaker-console/shared";

export type ConnectionStatus = "connecting" | "open" | "closed";

/** What the client knows about the device, kept current by the WebSocket. */
export interface RealtimeState {
  status: ConnectionStatus;
  /** Set once the first snapshot arrives. */
  serverVersion?: string;
  /** Newest first, at most SNAPSHOT_ACTIVITY_LIMIT events. */
  recentActivity: ActivityEvent[];
}

export const INITIAL_STATE: RealtimeState = { status: "connecting", recentActivity: [] };

/** Applies one server message. Pure, so it can be unit-tested without a socket. */
export function applyServerMessage(state: RealtimeState, message: ServerMessage): RealtimeState {
  switch (message.type) {
    case "snapshot":
      // A snapshot is the whole truth: replace, don't merge, so nothing stale survives a reconnect.
      return {
        ...state,
        serverVersion: message.serverVersion,
        recentActivity: message.recentActivity.slice(0, SNAPSHOT_ACTIVITY_LIMIT),
      };
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
