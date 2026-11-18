import type { Sound } from "@ip-speaker-console/shared";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { deleteSound } from "../../api/sounds";

interface DeleteSoundModalProps {
  /** The sound to delete; undefined when the dialog is closed. */
  sound: Sound | undefined;
  /** The sound is playing on the speaker, so deleting it will stop it. */
  playing: boolean;
  onClose: () => void;
}

/** Confirms deleting a sound, saying what else will happen, then deletes it. */
export function DeleteSoundModal({ sound, playing, onClose }: DeleteSoundModalProps) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async (target: Sound) => {
    setDeleting(true);
    try {
      await deleteSound(target.id);
      onClose();
    } catch (error) {
      notifications.show({
        color: "danger",
        title: `Couldn't delete ${target.name}`,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal opened={sound !== undefined} onClose={onClose} title={`Delete ${sound?.name ?? ""}?`}>
      {sound && (
        <Stack gap="md">
          <Text>This removes the sound and its file from the speaker. It can't be undone.</Text>
          {(playing || sound.pinned) && (
            <Text>
              {playing && "It's playing now and will stop. "}
              {sound.pinned && "It will also disappear from Quick play."}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button color="danger" loading={deleting} onClick={() => void confirm(sound)}>
              Delete
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
