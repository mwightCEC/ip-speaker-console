import type { Sound } from "@ip-speaker-console/shared";
import { describe, expect, it } from "vitest";
import type { LiveNowPlaying } from "../../realtime/realtimeState";
import { pickPlaybackTarget } from "./playbackTarget";

function sound(id: string, name: string, durationMs: number): Sound {
  return {
    id,
    name,
    durationMs,
    fileName: `${id}.wav`,
    sizeBytes: 1000,
    format: { sampleRate: 22_050, channels: 1, bitsPerSample: 16 },
  };
}

const SOUNDS = [sound("chime", "Chime", 2200), sound("alert", "Alert", 1100)];

function started(soundId: string, soundName: string, startedAtLocalMs: number): LiveNowPlaying {
  return {
    soundId,
    soundName,
    startedAt: "2026-11-18T10:00:00.000Z",
    durationMs: 1000,
    elapsedMs: 0,
    startedAtLocalMs,
  };
}

describe("pickPlaybackTarget", () => {
  it("shows nothing until a sound is selected or played", () => {
    expect(pickPlaybackTarget(undefined, {}, SOUNDS)).toBeUndefined();
  });

  it("shows the selected sound", () => {
    expect(pickPlaybackTarget({ soundId: "alert", selectedAtMs: 5 }, {}, SOUNDS)).toEqual({
      soundId: "alert",
      name: "Alert",
      durationMs: 1100,
    });
  });

  it("switches to a sound that starts playing after the selection", () => {
    const playback = { lastStarted: started("chime", "Chime", 10) };
    expect(
      pickPlaybackTarget({ soundId: "alert", selectedAtMs: 5 }, playback, SOUNDS)?.soundId,
    ).toBe("chime");
  });

  it("keeps a newer selection over a sound that started earlier", () => {
    const playback = { lastStarted: started("chime", "Chime", 10) };
    expect(
      pickPlaybackTarget({ soundId: "alert", selectedAtMs: 20 }, playback, SOUNDS)?.soundId,
    ).toBe("alert");
  });

  it("keeps showing a sound after it finishes", () => {
    const playback = {
      lastStarted: started("chime", "Chime", 10),
      lastResult: {
        soundId: "chime",
        soundName: "Chime",
        ending: "finished" as const,
        endedAt: "2026-11-18T10:00:02.000Z",
      },
    };
    expect(pickPlaybackTarget(undefined, playback, SOUNDS)?.soundId).toBe("chime");
  });

  it("falls back to the last sound played before the page opened", () => {
    const playback = {
      lastResult: {
        soundId: "alert",
        soundName: "Alert",
        ending: "stopped" as const,
        endedAt: "2026-11-18T10:00:02.000Z",
      },
    };
    expect(pickPlaybackTarget(undefined, playback, SOUNDS)?.soundId).toBe("alert");
  });

  it("ignores a selected sound that's no longer on the speaker", () => {
    expect(pickPlaybackTarget({ soundId: "gone", selectedAtMs: 5 }, {}, SOUNDS)).toBeUndefined();
  });
});
