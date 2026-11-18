import type { DatabaseSync } from "node:sqlite";
import { DEFAULT_VOLUME, type VolumeState } from "@ip-speaker-console/shared";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityService } from "../activity/activityService.js";
import { ActivityStore } from "../activity/activityStore.js";
import type { AudioMixer } from "../audio/audioMixer.js";
import { EventBus } from "../events/eventBus.js";
import { SettingsStore } from "../settings/settingsStore.js";
import { IN_MEMORY, openDatabase } from "../storage/database.js";
import { VolumeService } from "./volumeService.js";

/** Records every volume it's given, and fails when told to. */
class RecordingMixer implements AudioMixer {
  readonly applied: number[] = [];
  failWith: string | undefined;

  async setVolume(percent: number): Promise<void> {
    // Yield first, like a real mixer, so overlapping changes would interleave if not queued.
    await new Promise((resolve) => setImmediate(resolve));
    if (this.failWith) {
      throw new Error(this.failWith);
    }
    this.applied.push(percent);
  }
}

describe("VolumeService", () => {
  let db: DatabaseSync;
  let settings: SettingsStore;
  let activity: ActivityService;
  let bus: EventBus;
  let mixer: RecordingMixer;
  let changes: VolumeState[];

  const createService = () =>
    new VolumeService({ mixer, settings, activity, bus, log: Fastify({ logger: false }).log });

  beforeEach(() => {
    const log = Fastify({ logger: false }).log;
    db = openDatabase(IN_MEMORY);
    settings = new SettingsStore(db);
    bus = new EventBus(log);
    activity = new ActivityService(new ActivityStore(db, 100), bus, log);
    mixer = new RecordingMixer();
    changes = [];
    bus.on("volume.changed", (state) => changes.push(state));
  });

  afterEach(() => db.close());

  it("starts at the default volume and applies it to the mixer", async () => {
    const volume = createService();
    await volume.restore();

    expect(volume.state).toEqual({ percent: DEFAULT_VOLUME, muted: false });
    expect(mixer.applied).toEqual([DEFAULT_VOLUME]);
  });

  it("changes the volume, saves it and records it", async () => {
    const volume = createService();

    expect(await volume.set({ percent: 55 })).toEqual({ percent: 55, muted: false });
    expect(mixer.applied).toEqual([55]);
    expect(changes).toEqual([{ percent: 55, muted: false }]);
    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      category: "settings",
      outcome: "success",
      message: "Volume set to 55%",
      detail: `Was ${DEFAULT_VOLUME}%.`,
    });

    expect(createService().state.percent).toBe(55);
  });

  it("mutes without forgetting the volume, and unmutes back to it", async () => {
    const volume = createService();

    expect(await volume.set({ muted: true })).toEqual({ percent: DEFAULT_VOLUME, muted: true });
    expect(mixer.applied).toEqual([0]);
    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      message: "Speaker muted",
      detail: `The volume stays at ${DEFAULT_VOLUME}%.`,
    });
    expect(createService().state.muted).toBe(true);

    await volume.set({ muted: false });
    expect(mixer.applied).toEqual([0, DEFAULT_VOLUME]);
    expect(activity.list({ limit: 1 })[0]?.message).toBe("Speaker unmuted");
    expect(changes.map((state) => state.muted)).toEqual([true, false]);
  });

  it("keeps the speaker silent when the volume changes while muted", async () => {
    const volume = createService();
    await volume.set({ muted: true });
    await volume.set({ percent: 30 });

    expect(mixer.applied).toEqual([0, 0]);
    expect(volume.state).toEqual({ percent: 30, muted: true });
  });

  it("changes the volume and unmutes in one go", async () => {
    const volume = createService();
    await volume.set({ muted: true });
    await volume.set({ percent: 30, muted: false });

    expect(mixer.applied).toEqual([0, 30]);
    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      message: "Volume set to 30% and unmuted",
      detail: `Was ${DEFAULT_VOLUME}%, muted.`,
    });
  });

  it("stays muted after a restart", async () => {
    settings.set("volume.muted", true);
    await createService().restore();

    expect(mixer.applied).toEqual([0]);
  });

  it("does nothing when the volume is already at that level", async () => {
    const volume = createService();
    await volume.set({ percent: DEFAULT_VOLUME, muted: false });

    expect(mixer.applied).toEqual([]);
    expect(activity.list({ limit: 1 })).toEqual([]);
  });

  it("applies overlapping changes in order, so the last one wins", async () => {
    const volume = createService();
    await Promise.all([
      volume.set({ percent: 10 }),
      volume.set({ percent: 20 }),
      volume.set({ percent: 30 }),
    ]);

    expect(mixer.applied).toEqual([10, 20, 30]);
    expect(volume.state.percent).toBe(30);
  });

  it("keeps the old volume and records why when the mixer fails", async () => {
    const volume = createService();
    mixer.failWith = "amixer: Unable to find simple control 'Master',0";

    await expect(volume.set({ percent: 40 })).rejects.toThrow("Unable to find simple control");
    expect(volume.state.percent).toBe(DEFAULT_VOLUME);
    expect(changes).toEqual([]);
    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      outcome: "failure",
      message: "Couldn't change the volume to 40%",
    });

    await expect(volume.set({ muted: true })).rejects.toThrow("Unable to find simple control");
    expect(activity.list({ limit: 1 })[0]?.message).toBe("Couldn't mute the speaker");
    expect(volume.state.muted).toBe(false);

    mixer.failWith = undefined;
    expect((await volume.set({ percent: 40 })).percent).toBe(40);
  });

  it("records a warning but keeps going when the saved volume can't be applied at startup", async () => {
    mixer.failWith = "amixer isn't installed";
    await createService().restore();

    expect(activity.list({ limit: 1 })[0]).toMatchObject({
      outcome: "warning",
      message: `Couldn't set the volume to ${DEFAULT_VOLUME}% at startup`,
    });
  });

  it("ignores an unusable saved value", () => {
    settings.set("volume", "loud");
    settings.set("volume.muted", "yes");
    expect(createService().state).toEqual({ percent: DEFAULT_VOLUME, muted: false });
  });
});
