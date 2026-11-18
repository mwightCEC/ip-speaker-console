import { SOUND_NAME_MAX_LENGTH, type Sound } from "@ip-speaker-console/shared";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { updateSound } from "../../api/sounds";

interface RenameSoundModalProps {
  /** The sound being renamed; undefined when the dialog is closed. */
  sound: Sound | undefined;
  onClose: () => void;
}

/** Asks for a new name and saves it. The speaker's reason is shown if it refuses the name. */
export function RenameSoundModal({ sound, onClose }: RenameSoundModalProps) {
  return (
    <Modal opened={sound !== undefined} onClose={onClose} title="Rename sound">
      {/* Keyed so the form starts fresh for each sound. */}
      {sound && <RenameForm key={sound.id} sound={sound} onClose={onClose} />}
    </Modal>
  );
}

function RenameForm({ sound, onClose }: { sound: Sound; onClose: () => void }) {
  const [name, setName] = useState(sound.name);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const tidy = name.trim();
    if (tidy === "") {
      setError("Give the sound a name.");
      return;
    }
    setSaving(true);
    try {
      await updateSound(sound.id, { name: tidy });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Stack gap="md">
        <TextInput
          label="Name"
          value={name}
          maxLength={SOUND_NAME_MAX_LENGTH}
          error={error}
          data-autofocus
          onChange={(event) => {
            setName(event.currentTarget.value);
            setError(undefined);
          }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
