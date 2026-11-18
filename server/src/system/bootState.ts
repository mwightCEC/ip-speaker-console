import { randomUUID } from "node:crypto";

/**
 * Which boot of the console this is, and whether it's down for a simulated reboot. Browsers
 * know the device is back from a reboot when the boot ID changes.
 */
export class BootState {
  #id = randomUUID();
  #offline = false;

  get id(): string {
    return this.#id;
  }

  /** The console is pretending to be switched off (mock system driver only). */
  get offline(): boolean {
    return this.#offline;
  }

  goOffline(): void {
    this.#offline = true;
  }

  /** Comes back from a simulated reboot as a new boot. */
  startNewBoot(): void {
    this.#id = randomUUID();
    this.#offline = false;
  }
}
