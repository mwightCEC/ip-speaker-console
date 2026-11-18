import { useEffect, useState } from "react";
import type { LiveNowPlaying } from "../../realtime/realtimeState";

const TICK_MS = 250;

/**
 * Milliseconds played so far, updated a few times a second while a sound plays. Until the first
 * tick after a sound starts, the clock may be from before it started; that clamps to 0.
 */
export function usePlaybackProgress(nowPlaying: LiveNowPlaying | undefined): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!nowPlaying) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [nowPlaying]);

  if (!nowPlaying) {
    return 0;
  }
  return Math.min(Math.max(now - nowPlaying.startedAtLocalMs, 0), nowPlaying.durationMs);
}
