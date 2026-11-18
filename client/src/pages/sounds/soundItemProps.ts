import type { Sound } from "@ip-speaker-console/shared";

/** What a tile or list row needs to show one sound and act on it. */
export interface SoundItemProps {
  sound: Sound;
  /** Being previewed in this browser. */
  previewing: boolean;
  /** Playing on the speaker. */
  playing: boolean;
  /** A play request for this sound is in flight. */
  starting: boolean;
  onPreview: () => void;
  onStopPreview: () => void;
  onPlay: () => void;
  onStop: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}
