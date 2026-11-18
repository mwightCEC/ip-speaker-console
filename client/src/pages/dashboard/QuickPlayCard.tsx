import type { Sound } from "@ip-speaker-console/shared";
import { ActionIcon, Alert, Button, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import { formatFileSize, formatSoundFormat } from "../../format/sound";
import { formatDuration } from "../../format/time";
import { DashboardCard } from "./DashboardCard";
import classes from "./QuickPlayCard.module.css";
import type { useSounds } from "./useSounds";

interface QuickPlayCardProps {
  sounds: ReturnType<typeof useSounds>;
  selectedSoundId: string | undefined;
  playingSoundId: string | undefined;
  pendingSoundId: string | undefined;
  onSelect: (sound: Sound) => void;
  onPlay: (sound: Sound) => void;
  onStop: () => void;
}

/**
 * Every sound, one per row with its file details. Clicking a row selects it into the Playback
 * card; its Play button selects it and plays it straight away.
 */
export function QuickPlayCard({ sounds, ...rowProps }: QuickPlayCardProps) {
  return (
    <DashboardCard title="Quick play">
      {sounds.status === "loading" && (
        <Stack gap="xs">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} h={52} />
          ))}
        </Stack>
      )}

      {sounds.status === "error" && (
        <Alert color="danger" title="Couldn't load the sounds">
          <Text size="sm" mb="sm">
            {sounds.message}
          </Text>
          <Button size="xs" variant="light" color="danger" onClick={sounds.retry}>
            Try again
          </Button>
        </Alert>
      )}

      {sounds.status === "ready" && sounds.sounds.length === 0 && (
        <Text>There are no sounds on the speaker yet.</Text>
      )}

      {sounds.status === "ready" && sounds.sounds.length > 0 && (
        <ul className={classes.list}>
          {sounds.sounds.map((sound) => (
            <SoundRow key={sound.id} sound={sound} {...rowProps} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

type SoundRowProps = Omit<QuickPlayCardProps, "sounds"> & { sound: Sound };

function SoundRow({
  sound,
  selectedSoundId,
  playingSoundId,
  pendingSoundId,
  onSelect,
  onPlay,
  onStop,
}: SoundRowProps) {
  const selected = sound.id === selectedSoundId;
  const playing = sound.id === playingSoundId;

  return (
    <li className={classes.row} data-selected={selected || undefined}>
      <UnstyledButton
        className={classes.select}
        aria-pressed={selected}
        onClick={() => onSelect(sound)}
      >
        <Text fw={600} size="sm" c="var(--color-text-primary)">
          {sound.name}
        </Text>
        <Text size="xs" c="dimmed">
          {sound.fileName} · {formatSoundFormat(sound.format)} · {formatFileSize(sound.sizeBytes)}
        </Text>
      </UnstyledButton>
      <Text size="sm" c="dimmed" className={classes.duration}>
        {formatDuration(sound.durationMs)}
      </Text>
      {playing ? (
        <ActionIcon
          variant="light"
          color="danger"
          size="lg"
          aria-label={`Stop ${sound.name}`}
          onClick={onStop}
        >
          <IconPlayerStopFilled size={16} aria-hidden />
        </ActionIcon>
      ) : (
        <ActionIcon
          variant="light"
          size="lg"
          aria-label={`Play ${sound.name}`}
          loading={sound.id === pendingSoundId}
          onClick={() => onPlay(sound)}
        >
          <IconPlayerPlayFilled size={16} aria-hidden />
        </ActionIcon>
      )}
    </li>
  );
}
