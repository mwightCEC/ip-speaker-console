import type { DeviceInfo } from "@ip-speaker-console/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchDeviceInfo } from "../../api/device";

type DeviceInfoState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; info: DeviceInfo };

/** Fetches the device information and turns the outcome into state. Never rejects. */
async function requestDeviceInfo(): Promise<DeviceInfoState> {
  try {
    return { status: "ready", info: await fetchDeviceInfo() };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Facts about the device, read once when the page opens. `refresh` reads them again. */
export function useDeviceInfo() {
  const [state, setState] = useState<DeviceInfoState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void requestDeviceInfo().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void requestDeviceInfo().then((next) => {
      setState(next);
      setRefreshing(false);
    });
  }, []);

  return { ...state, refreshing, refresh };
}
