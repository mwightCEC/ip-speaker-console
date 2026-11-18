import type { Sound } from "@ip-speaker-console/shared";
import { Anchor, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { formatFileSize, formatSoundFormat } from "../../format/sound";
import { formatDuration } from "../../format/time";
import { PlayButton, PreviewButton } from "../../playback/SoundButtons";
import { SectionCard } from "../../components/SectionCard";
import classes from "./QuickPlayCard.module.css";
import { Link } from "react-router";

interface QuickPlayCardProps {
  /** The pinned sounds; undefined until the speaker has sent them. */
  sounds: Sound[] | undefined;
  selectedSoundId: string | undefined;
  playingSoundId: string | undefined;
  pendingSoundId: string | undefined;
  /** The sound being previewed in this browser. */
  previewingSoundId: string | undefined;
  onSelect: (sound: Sound) => void;
  onPlay: (sound: Sound) => void;
  onStop: () => void;
  onPreview: (sound: Sound) => void;
  onStopPreview: () => void;
}

/**
 * The sounds pinned on the Sounds page, one per row with its file details. Clicking a row selects it into the Playback
 * card; its Play button selects it and plays it straight away, and Preview plays it in this
 * browser only.
 */
export function QuickPlayCard({ sounds, ...rowProps }: QuickPlayCardProps) {
  return (
    <SectionCard title="Quick play">
      {sounds === undefined && (
        <Stack gap="xs">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} h={52} />
          ))}
        </Stack>
      )}

      {sounds?.length === 0 && (
        <Text>
          No sounds are pinned. Pin the ones you play most on the{" "}
          <Anchor component={Link} to="/sounds">
            Sounds page
          </Anchor>{" "}
          to play them from here.
        </Text>
      )}

      {sounds !== undefined && sounds.length > 0 && (
        <ul className={classes.list}>
          {sounds.map((sound) => (
            <SoundRow key={sound.id} sound={sound} {...rowProps} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

type SoundRowProps = Omit<QuickPlayCardProps, "sounds"> & { sound: Sound };

function SoundRow({
  sound,
  selectedSoundId,
  playingSoundId,
  pendingSoundId,
  previewingSoundId,
  onSelect,
  onPlay,
  onStop,
  onPreview,
  onStopPreview,
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
      <Group gap="xs" wrap="nowrap">
        <PreviewButton
          size="icon"
          name={sound.name}
          previewing={sound.id === previewingSoundId}
          onPreview={() => onPreview(sound)}
          onStopPreview={onStopPreview}
        />
        <PlayButton
          size="icon"
          name={sound.name}
          playing={playing}
          starting={sound.id === pendingSoundId}
          onPlay={() => onPlay(sound)}
          onStop={onStop}
        />
      </Group>
    </li>
  );
}
