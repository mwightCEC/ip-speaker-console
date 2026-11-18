/** Device settings people can change on the Settings page. */
export interface DeviceSettings {
  /** Shown in the titlebar and browser tab, such as "Lobby speaker". */
  deviceName: string;
  /** IANA time zone the device runs in, such as "America/Chicago". Times are shown in it. */
  timeZone: string;
}

/** Request body of `PATCH /api/settings`: whichever settings to change. */
export type SettingsChange = Partial<DeviceSettings>;

/** Name used until someone sets one. */
export const DEFAULT_DEVICE_NAME = "IP Speaker";

/** Longest device name, in characters. */
export const DEVICE_NAME_MAX_LENGTH = 40;
