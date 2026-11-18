import { SOUND_UPLOAD_MAX_BYTES, type Sound } from "@ip-speaker-console/shared";
import { Button, FileButton, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { updateSound } from "../../api/sounds";
import { PageHeader } from "../../components/PageHeader";
import { usePlaybackActions } from "../../playback/usePlaybackActions";
import { useSoundPreview } from "../../playback/useSoundPreview";
import { useRealtime } from "../../realtime/useRealtime";
import { DeleteSoundModal } from "./DeleteSoundModal";
import { RenameSoundModal } from "./RenameSoundModal";
import type { SoundItemProps } from "./soundItemProps";
import { SoundLibraryCard } from "./SoundLibraryCard";
import { UploadDropArea } from "./UploadDropArea";
import { useSoundUploads } from "./useSoundUploads";

const MAX_MEGABYTES = SOUND_UPLOAD_MAX_BYTES / 1024 / 1024;

/** The sound library: upload, preview, play, rename, download, pin and delete sounds. */
export function SoundsPage() {
  const sounds = useRealtime((state) => state.sounds);
  const playingSoundId = useRealtime((state) => state.playback.nowPlaying?.soundId);
  const { play, stop, pendingSoundId } = usePlaybackActions();
  const { previewingId, preview, stopPreview } = useSoundPreview();
  const { upload, remaining } = useSoundUploads();
  const [renaming, setRenaming] = useState<Sound>();
  const [deleting, setDeleting] = useState<Sound>();

  const itemProps = (sound: Sound): SoundItemProps => ({
    sound,
    previewing: sound.id === previewingId,
    playing: sound.id === playingSoundId,
    starting: sound.id === pendingSoundId,
    onPreview: () => preview(sound),
    onStopPreview: stopPreview,
    onPlay: () => void play({ soundId: sound.id, name: sound.name }),
    onStop: () => void stop(),
    onRename: () => setRenaming(sound),
    onTogglePin: () => void togglePin(sound),
    onDelete: () => setDeleting(sound),
  });

  const uploadButton = (
    <FileButton
      onChange={(files) => void upload(files)}
      accept="audio/wav,audio/x-wav,.wav"
      multiple
    >
      {(buttonProps) => (
        <Button
          {...buttonProps}
          leftSection={<IconUpload size={16} aria-hidden />}
          loading={remaining > 0}
        >
          Upload WAV
        </Button>
      )}
    </FileButton>
  );

  return (
    <Stack gap="lg">
      <PageHeader
        title="Sounds"
        description={`Upload, preview and manage the speaker's sounds. WAV files up to ${MAX_MEGABYTES} MB; drag them here or use Upload.`}
        action={uploadButton}
      />

      <UploadDropArea onDrop={(files) => void upload(files)}>
        <SoundLibraryCard sounds={sounds} itemProps={itemProps} />
      </UploadDropArea>

      <RenameSoundModal sound={renaming} onClose={() => setRenaming(undefined)} />
      <DeleteSoundModal
        sound={deleting}
        playing={deleting !== undefined && deleting.id === playingSoundId}
        onClose={() => setDeleting(undefined)}
      />
    </Stack>
  );
}

/** Pins or unpins a sound; the change reaches every page over the WebSocket. */
async function togglePin(sound: Sound): Promise<void> {
  try {
    await updateSound(sound.id, { pinned: !sound.pinned });
  } catch (error) {
    notifications.show({
      color: "danger",
      title: sound.pinned ? `Couldn't unpin ${sound.name}` : `Couldn't pin ${sound.name}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
