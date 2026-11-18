/** Lowest and highest volume, in percent. */
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 100;

/** Volume used until someone changes it. */
export const DEFAULT_VOLUME = 80;

/** Response body of `GET /api/volume` and `PUT /api/volume`. */
export interface VolumeState {
  /** Whole number from VOLUME_MIN to VOLUME_MAX. Kept while muted, so unmuting restores it. */
  percent: number;
  /** The speaker is silent; `percent` is what it returns to when unmuted. */
  muted: boolean;
}

/** Request body of `PUT /api/volume`: whichever of the two to change. */
export type VolumeChange = Partial<VolumeState>;
