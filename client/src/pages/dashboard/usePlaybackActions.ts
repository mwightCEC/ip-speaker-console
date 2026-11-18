import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { playSound, stopPlayback } from "../../api/playback";

/** What a play request needs: which sound, and its name for messages. */
interface PlayableSound {
  soundId: string;
  name: string;
}

/**
 * Play and stop requests, with which one is in flight. A failure shows a notification with the
 * server's message. Success needs no message: the new state arrives over the WebSocket.
 */
export function usePlaybackActions() {
  const [pendingSoundId, setPendingSoundId] = useState<string>();
  const [stopping, setStopping] = useState(false);

  const play = async ({ soundId, name }: PlayableSound): Promise<void> => {
    setPendingSoundId(soundId);
    try {
      await playSound(soundId);
    } catch (error) {
      notifyFailure(`Couldn't play ${name}`, error);
    } finally {
      setPendingSoundId(undefined);
    }
  };

  const stop = async (): Promise<void> => {
    setStopping(true);
    try {
      await stopPlayback();
    } catch (error) {
      notifyFailure("Couldn't stop playback", error);
    } finally {
      setStopping(false);
    }
  };

  return { play, stop, pendingSoundId, stopping };
}

function notifyFailure(title: string, error: unknown): void {
  notifications.show({
    color: "danger",
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
