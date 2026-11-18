/** Path prefix for every REST endpoint. The client's dev proxy forwards it to the server. */
export const API_PREFIX = "/api";

/** Path of the WebSocket endpoint used for real-time device events. */
export const WS_PATH = "/ws";

/** Response body of `GET /api/health`. */
export interface HealthResponse {
  status: "ok";
  version: string;
  /**
   * Changes every time the console starts, including after a reboot. The reboot screen waits
   * for it to change to know the device has come back.
   */
  bootId: string;
  /** Seconds since the server process started. */
  uptimeSeconds: number;
  drivers: {
    audio: AudioDriverName;
    system: SystemDriverName;
  };
}

/** Audio back ends: real `aplay` playback on the device, or a simulated one for development. */
export type AudioDriverName = "mock" | "aplay";

/** System back ends: real Linux integration (network, reboot) or a simulated one. */
export type SystemDriverName = "mock" | "linux";
