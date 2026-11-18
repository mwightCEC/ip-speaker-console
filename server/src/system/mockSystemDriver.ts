import { hostname, uptime } from "node:os";
import type { SystemDriver, SystemInfo } from "./systemDriver.js";
import { connectionTypeOf, primaryInterface } from "./networkConnection.js";

interface MockSystemDriverOptions {
  /** Called instead of rebooting; the app uses it to take the console down and bring it back. */
  simulateReboot: () => void;
}

/**
 * A pretend device for development: real hostname, uptime and connection type from this
 * computer, a time zone it only remembers, and a reboot that's simulated. It can't tell how this
 * computer got its address, so it reports DHCP, the usual case.
 */
export class MockSystemDriver implements SystemDriver {
  readonly name = "mock";
  readonly #simulateReboot: () => void;
  #timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  constructor({ simulateReboot }: MockSystemDriverOptions) {
    this.#simulateReboot = simulateReboot;
  }

  async info(): Promise<SystemInfo> {
    const connectedThrough = primaryInterface();
    return {
      model: "Simulated device",
      hostname: hostname(),
      uptimeSeconds: Math.round(uptime()),
      network:
        connectedThrough === undefined
          ? undefined
          : {
              type: connectionTypeOf(connectedThrough),
              addressing: "dhcp",
            },
    };
  }

  async currentTimeZone(): Promise<string> {
    return this.#timeZone;
  }

  async setTimeZone(timeZone: string): Promise<void> {
    this.#timeZone = timeZone;
  }

  async reboot(): Promise<void> {
    this.#simulateReboot();
  }
}
