import { API_PREFIX, WS_PATH } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { ActivityService } from "../activity/activityService.js";
import { errorBody } from "../http/errors.js";
import { APP_VERSION } from "../version.js";
import type { BootState } from "./bootState.js";

/** About how long a real board takes to reboot. */
export const SIMULATED_REBOOT_MS = 20_000;

/**
 * While the console pretends to be rebooting, the API and WebSocket answer 503 like a device
 * that's switched off. The page itself still loads, so the reboot screen keeps working.
 */
export function registerOfflineGate(app: FastifyInstance, boot: BootState): void {
  app.addHook("onRequest", async (request, reply) => {
    const pathname = request.url.split("?")[0] ?? "";
    const isServerPath = pathname.startsWith(`${API_PREFIX}/`) || pathname === WS_PATH;
    if (boot.offline && isServerPath) {
      return reply
        .code(503)
        .send(errorBody("restarting", "The speaker is restarting. Try again in a moment."));
    }
    return undefined;
  });
}

interface SimulatedRebootOptions {
  boot: BootState;
  activity: ActivityService;
  /** Drops every WebSocket connection, as a real reboot would. */
  disconnectAll: () => void;
  durationMs?: number;
}

/**
 * What the mock system driver does instead of rebooting: the console goes quiet for a while,
 * then comes back as a new boot, so the whole reboot flow can be tried on a development machine.
 */
export function simulateReboot({
  boot,
  activity,
  disconnectAll,
  durationMs = SIMULATED_REBOOT_MS,
}: SimulatedRebootOptions): void {
  boot.goOffline();
  disconnectAll();
  setTimeout(() => {
    boot.startNewBoot();
    activity.record({
      category: "device",
      outcome: "info",
      message: `Console started, version ${APP_VERSION}`,
      detail: "After a simulated reboot.",
    });
  }, durationMs).unref();
}
