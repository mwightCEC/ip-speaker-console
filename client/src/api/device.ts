import type {
  DeviceInfo,
  DeviceSettings,
  HealthResponse,
  SettingsChange,
} from "@ip-speaker-console/shared";
import { apiRequest } from "./apiRequest";

export function fetchDeviceInfo(): Promise<DeviceInfo> {
  return apiRequest<DeviceInfo>("/device");
}

/** Changes the device name, the time zone, or both. Every browser hears about it live. */
export function updateSettings(change: SettingsChange): Promise<DeviceSettings> {
  return apiRequest<DeviceSettings>("/settings", { method: "PATCH", body: change });
}

/** Starts a reboot. Resolves with the boot that's ending once the device has agreed. */
export function rebootDevice(): Promise<{ bootId: string }> {
  return apiRequest<{ bootId: string }>("/device/reboot", { method: "POST" });
}

export function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}
