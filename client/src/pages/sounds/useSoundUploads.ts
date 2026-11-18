import { SOUND_UPLOAD_MAX_BYTES } from "@ip-speaker-console/shared";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { uploadSound } from "../../api/sounds";

const MAX_MEGABYTES = SOUND_UPLOAD_MAX_BYTES / 1024 / 1024;

/**
 * Uploads WAV files one at a time, with how many are still to go. Each upload ends with a
 * notification; the new sound itself reaches the page over the WebSocket.
 */
export function useSoundUploads() {
  const [remaining, setRemaining] = useState(0);

  const upload = async (files: readonly File[]): Promise<void> => {
    setRemaining((count) => count + files.length);
    for (const file of files) {
      try {
        // The speaker checks this too; checking here saves sending a file it would refuse.
        if (file.size > SOUND_UPLOAD_MAX_BYTES) {
          throw new Error(`The file is over the ${MAX_MEGABYTES} MB limit.`);
        }
        const sound = await uploadSound(file);
        notifications.show({
          color: "success",
          title: `Uploaded ${sound.name}`,
          message: "Pin it to add it to Quick play on the Dashboard.",
        });
      } catch (error) {
        notifications.show({
          color: "danger",
          title: `Couldn't upload ${file.name}`,
          message: error instanceof Error ? error.message : String(error),
          autoClose: false,
        });
      } finally {
        setRemaining((count) => count - 1);
      }
    }
  };

  return { upload, remaining };
}
