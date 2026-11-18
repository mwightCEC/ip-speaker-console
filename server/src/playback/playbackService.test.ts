import type { DatabaseSync } from "node:sqlite";
import type { PlaybackState } from "@ip-speaker-console/shared";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityService } from "../activity/activityService.js";
import { ActivityStore } from "../activity/activityStore.js";
import type { AudioDriver, PlayOptions } from "../audio/audioDriver.js";
import { EventBus } from "../events/eventBus.js";
import type { LibrarySound } from "../sounds/soundLibrary.js";
import { IN_MEMORY, openDatabase } from "../storage/database.js";
import { PlaybackService } from "./playbackService.js";

interface StartedSound {
  file: string;
  finish: () => void;
  fail: (reason: string) => void;
}

/** A driver the test finishes or fails by hand. Aborting a sound ends it straight away. */
class ManualDriver implements AudioDriver {
  readonly name = "mock";
  readonly started: StartedSound[] = [];

  play(file: string, { signal }: PlayOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.started.push({ file, finish: resolve, fail: (reason) => reject(new Error(reason)) });
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  }
}

function testSound(id: string, name: string, durationMs: number): LibrarySound {
  return {
    id,
    name,
    durationMs,
    fileName: `${id}.wav`,
    sizeBytes: 1000,
    format: { sampleRate: 22_050, channels: 1, bitsPerSample: 16 },
    file: `${id}.wav`,
  };
}

const CHIME = testSound("chime", "Chime", 2000);
const ALERT = testSound("alert", "Alert", 1000);

/** Lets promise callbacks (such as a sound's ending being recorded) run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("PlaybackService", () => {
  let db: DatabaseSync;
  let activity: ActivityService;
  let driver: ManualDriver;
  let service: PlaybackService;
  let clock: number;
  let changes: PlaybackState[];

  /** Activity messages, oldest first, with any detail in brackets. */
  const messages = () =>
    activity
      .list({ limit: 20 })
      .toReversed()
      .map(({ message, detail }) => (detail ? `${message} (${detail})` : message));

  beforeEach(() => {
    const log = Fastify({ logger: false }).log;
    const bus = new EventBus(log);
    db = openDatabase(IN_MEMORY);
    activity = new ActivityService(new ActivityStore(db, 100), bus, log);
    driver = new ManualDriver();
    clock = Date.parse("2026-11-18T10:00:00Z");
    service = new PlaybackService({ driver, activity, bus, now: () => clock });
    changes = [];
    bus.on("playback.changed", (state) => changes.push(state));
  });

  afterEach(() => db.close());

  it("starts with nothing playing", () => {
    expect(service.state).toEqual({});
  });

  it("plays a sound and reports how far into it playback is", async () => {
    const state = await service.play(CHIME);

    expect(driver.started.map(({ file }) => file)).toEqual(["chime.wav"]);
    expect(state.nowPlaying).toEqual({
      soundId: "chime",
      soundName: "Chime",
      startedAt: "2026-11-18T10:00:00.000Z",
      durationMs: 2000,
      elapsedMs: 0,
    });
    expect(changes).toEqual([state]);
    expect(messages()).toEqual(["Started playing Chime"]);

    clock += 750;
    expect(service.state.nowPlaying?.elapsedMs).toBe(750);
  });

  it("records a sound that plays to the end", async () => {
    await service.play(CHIME);
    clock += 2000;
    driver.started[0]?.finish();
    await settle();

    expect(service.state).toEqual({
      lastResult: {
        soundId: "chime",
        soundName: "Chime",
        ending: "finished",
        endedAt: "2026-11-18T10:00:02.000Z",
      },
    });
    expect(messages()).toEqual(["Started playing Chime", "Finished playing Chime"]);
    expect(changes).toHaveLength(2);
  });

  it("stops the sound that's playing", async () => {
    await service.play(CHIME);
    const state = await service.stop();

    expect(state.nowPlaying).toBeUndefined();
    expect(state.lastResult?.ending).toBe("stopped");
    expect(messages()).toEqual(["Started playing Chime", "Stopped Chime"]);
  });

  it("does nothing when asked to stop while idle", async () => {
    expect(await service.stop()).toEqual({});
    expect(messages()).toEqual([]);
  });

  it("replaces the sound that's playing with a new one", async () => {
    await service.play(CHIME);
    const state = await service.play(ALERT);

    expect(state.nowPlaying?.soundId).toBe("alert");
    expect(state.lastResult).toMatchObject({ soundId: "chime", ending: "replaced" });
    expect(messages()).toEqual([
      "Started playing Chime",
      "Stopped Chime (Replaced by Alert.)",
      "Started playing Alert",
    ]);
  });

  it("ends up playing the last of several requests made at once", async () => {
    await service.play(CHIME);
    await Promise.all([service.play(ALERT), service.play(CHIME)]);

    expect(service.state.nowPlaying?.soundId).toBe("chime");
    const stillPlaying =
      driver.started.length - messages().filter((m) => m.startsWith("Stop")).length;
    expect(stillPlaying).toBe(1);
  });

  it("records why a sound couldn't be played", async () => {
    await service.play(CHIME);
    driver.started[0]?.fail("audio open error: Device or resource busy");
    await settle();

    expect(service.state.lastResult).toMatchObject({
      ending: "failed",
      error: "audio open error: Device or resource busy",
    });
    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      outcome: "failure",
      message: "Couldn't play Chime",
      detail: "audio open error: Device or resource busy",
    });
  });
});
