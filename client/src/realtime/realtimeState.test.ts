import {
  SNAPSHOT_ACTIVITY_LIMIT,
  type ActivityEvent,
  type NowPlaying,
} from "@ip-speaker-console/shared";
import { describe, expect, it } from "vitest";
import { applyServerMessage, INITIAL_STATE, type RealtimeState } from "./realtimeState";

const CHIME_PLAYING: NowPlaying = {
  soundId: "chime",
  soundName: "Chime",
  startedAt: "2026-11-18T10:00:00.000Z",
  durationMs: 2000,
  elapsedMs: 0,
};

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
  it("replaces everything with the snapshot's state", () => {
    const stale: RealtimeState = {
      ...INITIAL_STATE,
      playback: { nowPlaying: { ...CHIME_PLAYING, startedAtLocalMs: 0 } },
      recentActivity: [activity(1)],
    };
    const next = applyServerMessage(stale, {
      type: "snapshot",
      serverVersion: "0.1.0",
      bootId: "boot-1",
      audioDriver: "mock",
      settings: { deviceName: "Lobby", timeZone: "UTC" },
      playback: {},
      volume: { percent: 70, muted: false },
      sounds: [],
      recentActivity: [activity(3), activity(2)],
    });

    expect(next.serverVersion).toBe("0.1.0");
    expect(next.audioDriver).toBe("mock");
    expect(next.playback.nowPlaying).toBeUndefined();
    expect(next.volume).toEqual({ percent: 70, muted: false });
    expect(next.recentActivity.map((event) => event.id)).toEqual([3, 2]);
  });

  it("times playback from when the message arrived, not the device's clock", () => {
    const next = applyServerMessage(
      INITIAL_STATE,
      { type: "playback.changed", playback: { nowPlaying: { ...CHIME_PLAYING, elapsedMs: 400 } } },
      10_000,
    );

    expect(next.playback.nowPlaying?.startedAtLocalMs).toBe(9600);
  });

  it("clears what's playing when playback ends but remembers the sound", () => {
    const playing = applyServerMessage(
      INITIAL_STATE,
      { type: "playback.changed", playback: { nowPlaying: CHIME_PLAYING } },
      0,
    );
    expect(playing.playback.lastStarted?.soundId).toBe("chime");

    const lastResult = {
      soundId: "chime",
      soundName: "Chime",
      ending: "finished",
      endedAt: "2026-11-18T10:00:02.000Z",
    } as const;
    const next = applyServerMessage(playing, {
      type: "playback.changed",
      playback: { lastResult },
    });

    expect(next.playback.nowPlaying).toBeUndefined();
    expect(next.playback.lastResult).toEqual(lastResult);
    expect(next.playback.lastStarted?.soundId).toBe("chime");
  });

  it("follows volume changes", () => {
    const next = applyServerMessage(INITIAL_STATE, {
      type: "volume.changed",
      volume: { percent: 25, muted: true },
    });
    expect(next.volume).toEqual({ percent: 25, muted: true });
  });

  it("follows settings changes and hears about a reboot", () => {
    const renamed = applyServerMessage(INITIAL_STATE, {
      type: "settings.changed",
      settings: { deviceName: "Lobby", timeZone: "Asia/Tokyo" },
    });
    expect(renamed.settings?.deviceName).toBe("Lobby");

    const rebooting = applyServerMessage(renamed, { type: "device.rebooting", bootId: "boot-1" });
    expect(rebooting.rebootingFrom).toBe("boot-1");
  });

  it("follows sound library changes", () => {
    const next = applyServerMessage(INITIAL_STATE, { type: "sounds.changed", sounds: [] });
    expect(next.sounds).toEqual([]);
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
