import { SNAPSHOT_ACTIVITY_LIMIT, type ActivityEvent } from "@ip-speaker-console/shared";
import { describe, expect, it } from "vitest";
import { applyServerMessage, INITIAL_STATE, type RealtimeState } from "./realtimeState";

function activity(id: number): ActivityEvent {
  return {
    id,
    timestamp: "2026-11-18T10:00:00.000Z",
    category: "device",
    outcome: "info",
    message: `Event ${id}`,
  };
}

describe("applyServerMessage", () => {
  it("replaces recent activity with the snapshot's", () => {
    const stale: RealtimeState = { ...INITIAL_STATE, recentActivity: [activity(1)] };
    const next = applyServerMessage(stale, {
      type: "snapshot",
      serverVersion: "0.1.0",
      recentActivity: [activity(3), activity(2)],
    });

    expect(next.serverVersion).toBe("0.1.0");
    expect(next.recentActivity.map((event) => event.id)).toEqual([3, 2]);
  });

  it("adds new activity to the front", () => {
    const state: RealtimeState = { ...INITIAL_STATE, recentActivity: [activity(1)] };
    const next = applyServerMessage(state, { type: "activity.created", event: activity(2) });

    expect(next.recentActivity.map((event) => event.id)).toEqual([2, 1]);
  });

  it("ignores an event it already has", () => {
    const state: RealtimeState = { ...INITIAL_STATE, recentActivity: [activity(1)] };
    expect(applyServerMessage(state, { type: "activity.created", event: activity(1) })).toBe(state);
  });

  it("keeps at most the snapshot limit", () => {
    const full: RealtimeState = {
      ...INITIAL_STATE,
      recentActivity: Array.from({ length: SNAPSHOT_ACTIVITY_LIMIT }, (_, index) =>
        activity(SNAPSHOT_ACTIVITY_LIMIT - index),
      ),
    };
    const next = applyServerMessage(full, {
      type: "activity.created",
      event: activity(SNAPSHOT_ACTIVITY_LIMIT + 1),
    });

    expect(next.recentActivity).toHaveLength(SNAPSHOT_ACTIVITY_LIMIT);
    expect(next.recentActivity[0]?.id).toBe(SNAPSHOT_ACTIVITY_LIMIT + 1);
    expect(next.recentActivity.at(-1)?.id).toBe(2);
  });
});
