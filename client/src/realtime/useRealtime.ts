import { useSyncExternalStore } from "react";
import { defaultRealtimeUrl, RealtimeClient } from "./realtimeClient";
import type { RealtimeState } from "./realtimeState";

/** One connection shared by the whole app. Started from main.tsx. */
export const realtimeClient = new RealtimeClient(defaultRealtimeUrl());

/**
 * Reads live device state, re-rendering when the selected part changes. Select the smallest
 * piece you need, such as `useRealtime((state) => state.recentActivity)`.
 */
export function useRealtime<T>(selector: (state: RealtimeState) => T): T {
  return useSyncExternalStore(realtimeClient.subscribe, () => selector(realtimeClient.getState()));
}
