import {
  DEFAULT_VOLUME,
  VOLUME_MAX,
  VOLUME_MIN,
  type VolumeChange,
  type VolumeState,
} from "@ip-speaker-console/shared";
import type { FastifyBaseLogger } from "fastify";
import type { ActivityService } from "../activity/activityService.js";
import type { NewActivity } from "../activity/activityStore.js";
import type { AudioMixer } from "../audio/audioMixer.js";
import type { EventBus } from "../events/eventBus.js";
import type { SettingsStore } from "../settings/settingsStore.js";

const VOLUME_SETTING = "volume";
const MUTED_SETTING = "volume.muted";

interface VolumeServiceOptions {
  mixer: AudioMixer;
  settings: SettingsStore;
  activity: ActivityService;
  bus: EventBus;
  log: FastifyBaseLogger;
}

/**
 * The speaker's volume and mute. Both are saved in the settings store and applied to the mixer
 * again at startup, so they survive restarts and reboots. Muting sets the mixer to 0 % but keeps
 * the volume, so unmuting brings it back. Changes are applied one at a time in the order they
 * arrive, so the last change always wins.
 */
export class VolumeService {
  readonly #mixer: AudioMixer;
  readonly #settings: SettingsStore;
  readonly #activity: ActivityService;
  readonly #bus: EventBus;
  readonly #log: FastifyBaseLogger;
  #state: VolumeState;
  #queue: Promise<unknown> = Promise.resolve();

  constructor({ mixer, settings, activity, bus, log }: VolumeServiceOptions) {
    this.#mixer = mixer;
    this.#settings = settings;
    this.#activity = activity;
    this.#bus = bus;
    this.#log = log;
    this.#state = {
      percent: readStoredVolume(settings.get(VOLUME_SETTING)),
      muted: settings.get(MUTED_SETTING) === true,
    };
  }

  get state(): VolumeState {
    return { ...this.#state };
  }

  /** Applies the saved volume to the mixer. A failure is recorded but doesn't stop startup. */
  async restore(): Promise<void> {
    const { percent, muted } = this.#state;
    try {
      await this.#mixer.setVolume(muted ? 0 : percent);
    } catch (error) {
      this.#activity.record({
        category: "settings",
        outcome: "warning",
        message: muted
          ? "Couldn't mute the speaker at startup"
          : `Couldn't set the volume to ${percent}% at startup`,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Changes the volume, the mute, or both. Rejects with the mixer's reason if it can't be
   * applied, in which case nothing changes.
   */
  set(change: VolumeChange): Promise<VolumeState> {
    const result = this.#queue.then(() => this.#apply(change));
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #apply(change: VolumeChange): Promise<VolumeState> {
    const previous = this.#state;
    const next: VolumeState = {
      percent: change.percent ?? previous.percent,
      muted: change.muted ?? previous.muted,
    };
    if (next.percent === previous.percent && next.muted === previous.muted) {
      return this.state;
    }

    try {
      await this.#mixer.setVolume(next.muted ? 0 : next.percent);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#activity.record({
        category: "settings",
        outcome: "failure",
        message: describeFailure(previous, next),
        detail: reason,
      });
      throw new Error(reason, { cause: error });
    }

    this.#state = next;
    this.#settings.set(VOLUME_SETTING, next.percent);
    this.#settings.set(MUTED_SETTING, next.muted);
    this.#activity.record({
      category: "settings",
      outcome: "success",
      ...describeChange(previous, next),
    });
    this.#bus.emit("volume.changed", this.state);
    this.#log.debug(next, "Volume changed");
    return this.state;
  }
}

/** The activity message for a change that went through. */
function describeChange(
  previous: VolumeState,
  next: VolumeState,
): Pick<NewActivity, "message" | "detail"> {
  if (next.percent === previous.percent) {
    return next.muted
      ? { message: "Speaker muted", detail: `The volume stays at ${next.percent}%.` }
      : { message: "Speaker unmuted", detail: `The volume is ${next.percent}%.` };
  }
  if (next.muted === previous.muted) {
    return { message: `Volume set to ${next.percent}%`, detail: `Was ${previous.percent}%.` };
  }
  return next.muted
    ? { message: `Volume set to ${next.percent}% and muted`, detail: `Was ${previous.percent}%.` }
    : {
        message: `Volume set to ${next.percent}% and unmuted`,
        detail: `Was ${previous.percent}%, muted.`,
      };
}

/** The activity message for a change the mixer refused. */
function describeFailure(previous: VolumeState, next: VolumeState): string {
  if (next.muted !== previous.muted && next.percent === previous.percent) {
    return next.muted ? "Couldn't mute the speaker" : "Couldn't unmute the speaker";
  }
  return `Couldn't change the volume to ${next.percent}%`;
}

/** The saved volume, or the default if none is saved or the saved value is unusable. */
function readStoredVolume(stored: unknown): number {
  return Number.isInteger(stored) &&
    (stored as number) >= VOLUME_MIN &&
    (stored as number) <= VOLUME_MAX
    ? (stored as number)
    : DEFAULT_VOLUME;
}
