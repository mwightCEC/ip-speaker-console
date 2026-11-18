import {
  DEFAULT_DEVICE_NAME,
  DEVICE_NAME_MAX_LENGTH,
  type DeviceSettings,
  type SettingsChange,
} from "@ip-speaker-console/shared";
import type { ActivityService } from "../activity/activityService.js";
import type { NewActivity } from "../activity/activityStore.js";
import type { EventBus } from "../events/eventBus.js";
import { ApiError } from "../http/errors.js";
import type { SystemDriver } from "../system/systemDriver.js";
import { nameProblem, tidyName } from "../text/displayName.js";
import type { SettingsStore } from "./settingsStore.js";

const NAME_SETTING = "device.name";
const TIME_ZONE_SETTING = "device.timeZone";

interface SettingsServiceOptions {
  store: SettingsStore;
  driver: SystemDriver;
  activity: ActivityService;
  bus: EventBus;
}

/**
 * The device name and time zone. Both are saved in the settings store; the time zone is also
 * applied to the device, at startup and whenever it changes. Changes are applied one at a time.
 */
export class SettingsService {
  readonly #store: SettingsStore;
  readonly #driver: SystemDriver;
  readonly #activity: ActivityService;
  readonly #bus: EventBus;
  #state: DeviceSettings = { deviceName: DEFAULT_DEVICE_NAME, timeZone: "UTC" };
  #queue: Promise<unknown> = Promise.resolve();

  constructor({ store, driver, activity, bus }: SettingsServiceOptions) {
    this.#store = store;
    this.#driver = driver;
    this.#activity = activity;
    this.#bus = bus;
  }

  get state(): DeviceSettings {
    return { ...this.#state };
  }

  /**
   * Reads the saved settings and applies the saved time zone to the device. Without a saved
   * time zone, the device's own is used. A failure is recorded but doesn't stop startup.
   */
  async load(): Promise<void> {
    const storedName = this.#store.get(NAME_SETTING);
    const storedTimeZone = this.#store.get(TIME_ZONE_SETTING);

    const deviceName =
      typeof storedName === "string" && !this.#nameProblem(storedName)
        ? storedName
        : DEFAULT_DEVICE_NAME;

    let timeZone = await this.#driver.currentTimeZone();
    const savedTimeZone =
      typeof storedTimeZone === "string" ? canonicalTimeZone(storedTimeZone) : undefined;
    if (savedTimeZone) {
      try {
        await this.#driver.setTimeZone(savedTimeZone);
        timeZone = savedTimeZone;
      } catch (error) {
        this.#activity.record({
          category: "settings",
          outcome: "warning",
          message: `Couldn't set the time zone to ${savedTimeZone} at startup`,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.#state = { deviceName, timeZone };
  }

  /** Changes the device name, the time zone, or both. Rejects with an ApiError saying why. */
  update(change: SettingsChange): Promise<DeviceSettings> {
    const result = this.#queue.then(() => this.#apply(change));
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #apply(change: SettingsChange): Promise<DeviceSettings> {
    const previous = this.#state;
    const deviceName =
      change.deviceName === undefined ? previous.deviceName : tidyName(change.deviceName);
    const problem = this.#nameProblem(deviceName);
    if (problem) {
      throw new ApiError(400, "invalid_name", problem);
    }
    const timeZone =
      change.timeZone === undefined ? previous.timeZone : canonicalTimeZone(change.timeZone);
    if (!timeZone) {
      throw new ApiError(
        400,
        "invalid_time_zone",
        `${change.timeZone ?? ""} isn't a time zone the speaker knows.`,
      );
    }
    const next: DeviceSettings = { deviceName, timeZone };

    if (next.timeZone !== previous.timeZone) {
      await this.#applyTimeZone(next.timeZone);
    }

    const changes = describeChanges(previous, next);
    if (changes.length === 0) {
      return this.state;
    }

    this.#state = next;
    this.#store.set(NAME_SETTING, next.deviceName);
    this.#store.set(TIME_ZONE_SETTING, next.timeZone);
    for (const description of changes) {
      this.#activity.record({ category: "settings", outcome: "success", ...description });
    }
    this.#bus.emit("settings.changed", this.state);
    return this.state;
  }

  async #applyTimeZone(timeZone: string): Promise<void> {
    try {
      await this.#driver.setTimeZone(timeZone);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#activity.record({
        category: "settings",
        outcome: "failure",
        message: `Couldn't set the time zone to ${timeZone}`,
        detail: reason,
      });
      throw new ApiError(
        500,
        "settings_failed",
        "Couldn't change the time zone on the speaker.",
        reason,
      );
    }
  }

  #nameProblem(name: string): string | undefined {
    return nameProblem(name, {
      maxLength: DEVICE_NAME_MAX_LENGTH,
      emptyMessage: "Give the speaker a name.",
    });
  }
}

/**
 * The standard spelling of a time zone the device knows, such as "America/Chicago" for
 * "america/chicago", or undefined if it isn't one.
 */
export function canonicalTimeZone(timeZone: string): string | undefined {
  if (timeZone.trim() === "") {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat("en", { timeZone }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function describeChanges(
  previous: DeviceSettings,
  next: DeviceSettings,
): Pick<NewActivity, "message" | "detail">[] {
  const changes: Pick<NewActivity, "message" | "detail">[] = [];
  if (next.deviceName !== previous.deviceName) {
    changes.push({
      message: `Renamed the speaker to ${next.deviceName}`,
      detail: `Was ${previous.deviceName}.`,
    });
  }
  if (next.timeZone !== previous.timeZone) {
    changes.push({
      message: `Time zone set to ${next.timeZone}`,
      detail: `Was ${previous.timeZone}.`,
    });
  }
  return changes;
}
