import type { DatabaseSync } from "node:sqlite";
import { DEFAULT_DEVICE_NAME, type DeviceSettings } from "@ip-speaker-console/shared";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityService } from "../activity/activityService.js";
import { ActivityStore } from "../activity/activityStore.js";
import { EventBus } from "../events/eventBus.js";
import { IN_MEMORY, openDatabase } from "../storage/database.js";
import type { SystemDriver } from "../system/systemDriver.js";
import { canonicalTimeZone, SettingsService } from "./settingsService.js";
import { SettingsStore } from "./settingsStore.js";

/** Remembers the time zone it's given, and fails when told to. */
class RecordingDriver implements SystemDriver {
  readonly name = "mock";
  timeZone = "Europe/London";
  failWith: string | undefined;

  info = () => Promise.reject(new Error("not used"));
  reboot = () => Promise.reject(new Error("not used"));

  async currentTimeZone(): Promise<string> {
    return this.timeZone;
  }

  async setTimeZone(timeZone: string): Promise<void> {
    if (this.failWith) {
      throw new Error(this.failWith);
    }
    this.timeZone = timeZone;
  }
}

describe("SettingsService", () => {
  let db: DatabaseSync;
  let store: SettingsStore;
  let activity: ActivityService;
  let bus: EventBus;
  let driver: RecordingDriver;
  let changes: DeviceSettings[];

  const createService = async () => {
    const service = new SettingsService({ store, driver, activity, bus });
    await service.load();
    return service;
  };

  const lastActivity = () => activity.list({ limit: 1 })[0];

  beforeEach(() => {
    const log = Fastify({ logger: false }).log;
    db = openDatabase(IN_MEMORY);
    store = new SettingsStore(db);
    bus = new EventBus(log);
    activity = new ActivityService(new ActivityStore(db, 100), bus, log);
    driver = new RecordingDriver();
    changes = [];
    bus.on("settings.changed", (settings) => changes.push(settings));
  });

  afterEach(() => db.close());

  it("starts with the default name and the device's own time zone", async () => {
    expect((await createService()).state).toEqual({
      deviceName: DEFAULT_DEVICE_NAME,
      timeZone: "Europe/London",
    });
  });

  it("renames the device, saves it and records it", async () => {
    const service = await createService();

    expect(await service.update({ deviceName: "  Lobby   speaker " })).toMatchObject({
      deviceName: "Lobby speaker",
    });
    expect(lastActivity()).toMatchObject({
      message: "Renamed the speaker to Lobby speaker",
      detail: `Was ${DEFAULT_DEVICE_NAME}.`,
    });
    expect(changes).toHaveLength(1);
    expect((await createService()).state.deviceName).toBe("Lobby speaker");
  });

  it("sets the device's time zone and applies it again at startup", async () => {
    const service = await createService();
    await service.update({ timeZone: "america/chicago" });

    expect(driver.timeZone).toBe("America/Chicago");
    expect(lastActivity()?.message).toBe("Time zone set to America/Chicago");

    driver.timeZone = "UTC";
    expect((await createService()).state.timeZone).toBe("America/Chicago");
    expect(driver.timeZone).toBe("America/Chicago");
  });

  it("refuses an empty name or an unknown time zone", async () => {
    const service = await createService();

    await expect(service.update({ deviceName: " " })).rejects.toMatchObject({
      statusCode: 400,
      message: "Give the speaker a name.",
    });
    await expect(service.update({ timeZone: "Mars/Olympus" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Mars/Olympus isn't a time zone the speaker knows.",
    });
    expect(changes).toEqual([]);
  });

  it("keeps the old time zone and says why when the device refuses it", async () => {
    const service = await createService();
    driver.failWith = "timedatectl: Access denied";

    await expect(service.update({ timeZone: "Asia/Tokyo" })).rejects.toMatchObject({
      statusCode: 500,
      detail: "timedatectl: Access denied",
    });
    expect(service.state.timeZone).toBe("Europe/London");
    expect(lastActivity()).toMatchObject({
      outcome: "failure",
      message: "Couldn't set the time zone to Asia/Tokyo",
    });
  });

  it("does nothing when nothing changes", async () => {
    const service = await createService();
    await service.update({ deviceName: DEFAULT_DEVICE_NAME, timeZone: "Europe/London" });

    expect(changes).toEqual([]);
    expect(lastActivity()).toBeUndefined();
  });
});

describe("canonicalTimeZone", () => {
  it.each([
    ["America/Chicago", "America/Chicago"],
    ["america/new_york", "America/New_York"],
    ["UTC", "UTC"],
    ["Mars/Olympus", undefined],
    ["", undefined],
  ])("reads %j", (input, expected) => {
    expect(canonicalTimeZone(input)).toBe(expected);
  });
});
