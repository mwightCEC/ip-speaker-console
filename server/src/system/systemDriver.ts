import type { NetworkConnection, SystemDriverName } from "@ip-speaker-console/shared";

/** Facts about the device the system driver reads. */
export interface SystemInfo {
  model: string;
  hostname: string;
  /** Seconds since the device started. */
  uptimeSeconds: number;
  /** Undefined when the device isn't connected. */
  network?: NetworkConnection | undefined;
}

/**
 * The operating system side of the device: facts about it, its time zone and rebooting it.
 * The mock version simulates all of these so the console works on a development machine.
 */
export interface SystemDriver {
  readonly name: SystemDriverName;
  info(): Promise<SystemInfo>;
  /** The time zone the device is set to now, such as "Europe/London". */
  currentTimeZone(): Promise<string>;
  /** Changes the device's time zone. Rejects with a message written for people. */
  setTimeZone(timeZone: string): Promise<void>;
  /** Starts a reboot. Resolves once it's under way; the device then goes down. */
  reboot(): Promise<void>;
}
