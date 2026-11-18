import type { Sound } from "@ip-speaker-console/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchSounds } from "../../api/playback";

type SoundsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sounds: Sound[] };

/** Fetches the sounds and turns the outcome into state. Never rejects. */
async function requestSounds(): Promise<SoundsState> {
  try {
    const { sounds } = await fetchSounds();
    return { status: "ready", sounds };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Loads the sounds the speaker can play. `retry` loads them again after an error. */
export function useSounds(): SoundsState & { retry: () => void } {
  const [state, setState] = useState<SoundsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void requestSounds().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void requestSounds().then(setState);
  }, []);

  return { ...state, retry };
}
