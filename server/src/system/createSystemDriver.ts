import type { SystemDriverName } from "@ip-speaker-console/shared";
import { ConfigError } from "../config.js";
import { MockSystemDriver } from "./mockSystemDriver.js";
import type { SystemDriver } from "./systemDriver.js";

/** Creates the system driver named by `SYSTEM_DRIVER`. */
export function createSystemDriver(
  name: SystemDriverName,
  { simulateReboot }: { simulateReboot: () => void },
): SystemDriver {
  switch (name) {
    case "mock":
      return new MockSystemDriver({ simulateReboot });
    case "linux":
      // Arrives with hardware integration (M7), where it can be tested on the board.
      throw new ConfigError(
        "SYSTEM_DRIVER=linux isn't available yet; it arrives with hardware integration. Use mock.",
      );
  }
}
