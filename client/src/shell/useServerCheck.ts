import { useEffect } from "react";
import { fetchHealth } from "../api/health";

/**
 * Checks once on load that the server answers, and logs a browser-console error if it doesn't.
 * There's no on-screen indicator; M3 replaces this check with the WebSocket connection.
 */
export function useServerCheck(): void {
  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error("Can't reach the IP speaker server at /api/health.", error);
      }
    });
    return () => controller.abort();
  }, []);
}
