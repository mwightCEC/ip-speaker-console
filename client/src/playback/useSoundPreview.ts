import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { soundFileUrl } from "../api/sounds";

/** What a preview needs: which sound, and its name for messages. */
interface PreviewableSound {
  id: string;
  name: string;
}

/**
 * Plays sounds in this browser, one at a time, without touching the speaker. Leaving the page
 * stops the preview.
 */
export function useSoundPreview() {
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
  const [previewingId, setPreviewingId] = useState<string>();

  const stopPreview = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = undefined;
    setPreviewingId(undefined);
  }, []);

  const preview = (sound: PreviewableSound) => {
    stopPreview();
    const audio = new Audio(soundFileUrl(sound.id));
    const finish = () => {
      if (audioRef.current === audio) {
        stopPreview();
      }
    };
    audio.addEventListener("ended", finish);
    audioRef.current = audio;
    setPreviewingId(sound.id);

    audio.play().catch((error: unknown) => {
      finish();
      notifications.show({
        color: "danger",
        title: `Couldn't preview ${sound.name}`,
        message:
          error instanceof DOMException && error.name === "NotSupportedError"
            ? "This browser can't play the file. It may still play on the speaker."
            : "The file couldn't be loaded from the speaker.",
      });
    });
  };

  // Stop when leaving the page.
  useEffect(() => () => audioRef.current?.pause(), []);

  return { previewingId, preview, stopPreview };
}
