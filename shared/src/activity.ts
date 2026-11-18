/** What part of the device an activity event concerns. Used for filtering on the Activity page. */
export const ACTIVITY_CATEGORIES = ["playback", "files", "settings", "device"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/**
 * How an operation turned out. "info" is for events that aren't a success or failure, such as
 * the console starting up.
 */
export const ACTIVITY_OUTCOMES = ["success", "warning", "failure", "info"] as const;
export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number];

/** One entry in the device's activity log. */
export interface ActivityEvent {
  /** Increasing ID; newer events always have larger IDs. */
  id: number;
  /** When it happened, as an ISO 8601 UTC timestamp. */
  timestamp: string;
  category: ActivityCategory;
  outcome: ActivityOutcome;
  /** One-line summary shown in lists, such as "Playback finished: chime.wav". */
  message: string;
  /** Optional extra context, such as an error reason or who requested the operation. */
  detail?: string;
}

/** Response body of `GET /api/activity`. */
export interface ActivityPage {
  events: ActivityEvent[];
  /** Pass as `before` to load the next (older) page; absent when there are no older events. */
  nextBefore?: number;
}
