import type { AudioDriverName, SystemDriverName } from "./api.js";

/** How the device is connected to the network. */
export type ConnectionType = "ethernet" | "wifi" | "other";

/** How the device got its network address. */
export type AddressAssignment = "dhcp" | "static" | "unknown";

/** The device's network connection, summarised. */
export interface NetworkConnection {
  type: ConnectionType;
  addressing: AddressAssignment;
}

/** Response body of `GET /api/device`: facts about the device, read when asked. */
export interface DeviceInfo {
  /** Board model, such as "Radxa ROCK Pi S". */
  model: string;
  hostname: string;
  softwareVersion: string;
  /** Seconds since the device (not the console) started. */
  uptimeSeconds: number;
  /** The connection the device uses; undefined when it isn't connected. */
  network?: NetworkConnection | undefined;
  audioDriver: AudioDriverName;
  systemDriver: SystemDriverName;
  /** ALSA control the volume changes when the audio driver is aplay. */
  mixerControl: string;
}

/** How long to wait for the device to come back after a reboot before saying it didn't. */
export const REBOOT_TIMEOUT_MS = 3 * 60 * 1000;
