import { REBOOT_TIMEOUT_MS } from "@ip-speaker-console/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "../api/device";
import { useRealtime } from "../realtime/useRealtime";

/** How often to ask whether the device is back, and to update the timer. */
const POLL_INTERVAL_MS = 1000;

/**
 * "going-down": the device still answers as the old boot. "down": it has stopped answering.
 * "timed-out": it hasn't come back in time; checking carries on in case it's just slow.
 */
export type RebootPhase = "going-down" | "down" | "timed-out";

/** Reloads the page, which then loads the console from the device's new boot. */
function reloadPage(): void {
  window.location.reload();
}

/**
 * Follows a reboot that started in boot `fromBootId`: asks the device every second
 * whether it's back, and reloads the page as soon as it answers as a new boot (or the
 * WebSocket reconnects to one).
 */
export function useRebootProgress(fromBootId: string | undefined) {
  const [phase, setPhase] = useState<RebootPhase>("going-down");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const liveBootId = useRealtime((state) => state.bootId);

  useEffect(() => {
    if (fromBootId === undefined) {
      return undefined;
    }
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed > REBOOT_TIMEOUT_MS) {
        setPhase("timed-out");
      }
      fetchHealth().then(
        (health) => {
          if (health.bootId !== fromBootId) reloadPage();
        },
        () => setPhase((current) => (current === "timed-out" ? current : "down")),
      );
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fromBootId, startedAt]);

  // The WebSocket reconnecting to the new boot is just as good a sign.
  useEffect(() => {
    if (fromBootId !== undefined && liveBootId !== undefined && liveBootId !== fromBootId) {
      reloadPage();
    }
  }, [fromBootId, liveBootId]);

  /** Starts the timeout again after it ran out. */
  const keepWaiting = useCallback(() => {
    setStartedAt(Date.now());
    setElapsedMs(0);
    setPhase("down");
  }, []);

  return { phase, elapsedMs, keepWaiting, reloadPage };
}
