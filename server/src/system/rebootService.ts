import type { ActivityService } from "../activity/activityService.js";
import type { EventBus } from "../events/eventBus.js";
import { ApiError } from "../http/errors.js";
import type { BootState } from "./bootState.js";
import type { SystemDriver } from "./systemDriver.js";

/** Gives the reboot response and WebSocket message time to reach browsers first. */
const REBOOT_DELAY_MS = 1000;

interface RebootServiceOptions {
  driver: SystemDriver;
  boot: BootState;
  activity: ActivityService;
  bus: EventBus;
  /** Stops whatever is playing, so it ends cleanly and its ending is recorded. */
  stopPlayback: () => Promise<unknown>;
  delayMs?: number;
}

/** Reboots the device: tells every browser, stops playback, then asks the system to reboot. */
export class RebootService {
  readonly #driver: SystemDriver;
  readonly #boot: BootState;
  readonly #activity: ActivityService;
  readonly #bus: EventBus;
  readonly #stopPlayback: () => Promise<unknown>;
  readonly #delayMs: number;
  /** The boot a reboot was requested in; a new boot means it has happened. */
  #requestedInBoot: string | undefined;

  constructor(options: RebootServiceOptions) {
    this.#driver = options.driver;
    this.#boot = options.boot;
    this.#activity = options.activity;
    this.#bus = options.bus;
    this.#stopPlayback = options.stopPlayback;
    this.#delayMs = options.delayMs ?? REBOOT_DELAY_MS;
  }

  /**
   * Starts a reboot and returns the boot that's ending. The device goes down shortly after;
   * a failure to reboot is recorded as activity, since the request has already been answered.
   */
  async reboot(): Promise<{ bootId: string }> {
    const bootId = this.#boot.id;
    if (this.#requestedInBoot === bootId) {
      throw new ApiError(409, "already_rebooting", "The speaker is already restarting.");
    }
    this.#requestedInBoot = bootId;

    this.#activity.record({ category: "device", outcome: "info", message: "Reboot requested" });
    this.#bus.emit("device.rebooting", { bootId });
    await this.#stopPlayback();

    setTimeout(() => {
      this.#driver.reboot().catch((error: unknown) => {
        this.#requestedInBoot = undefined;
        this.#activity.record({
          category: "device",
          outcome: "failure",
          message: "Couldn't reboot the speaker",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.#delayMs).unref();

    return { bootId };
  }
}
