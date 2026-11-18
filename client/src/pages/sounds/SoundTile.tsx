import { Group, Paper, Stack, Text } from "@mantine/core";
import { formatFileSize, formatSoundFormat } from "../../format/sound";
import { formatDuration } from "../../format/time";
import { PlayButton, PreviewButton } from "../../playback/SoundButtons";
import { SoundBadges } from "./SoundBadges";
import type { SoundItemProps } from "./soundItemProps";
import { SoundMenu } from "./SoundMenu";
import classes from "./SoundTile.module.css";

/** One sound as a tile: its details, preview and play buttons, and a menu of changes. */
export function SoundTile(props: SoundItemProps) {
  const { sound } = props;

  return (
    <Paper component="li" withBorder p="md" className={classes.tile} aria-label={sound.name}>
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
          <Stack gap={4} className={classes.heading}>
            <Text fw={600} c="var(--color-text-primary)" className={classes.name}>
              {sound.name}
            </Text>
            <SoundBadges sound={sound} />
          </Stack>
          <SoundMenu {...props} />
        </Group>

        <Stack gap={2} className={classes.details}>
          <Text size="sm">
            {formatDuration(sound.durationMs)} · {formatFileSize(sound.sizeBytes)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatSoundFormat(sound.format)}
          </Text>
          <Text size="xs" c="dimmed" className={classes.fileName}>
            {sound.fileName}
          </Text>
        </Stack>

        <Group gap="xs" grow>
          <PreviewButton
            name={sound.name}
            previewing={props.previewing}
            onPreview={props.onPreview}
            onStopPreview={props.onStopPreview}
          />
          <PlayButton
            name={sound.name}
            playing={props.playing}
            starting={props.starting}
            onPlay={props.onPlay}
            onStop={props.onStop}
          />
        </Group>
      </Stack>
    </Paper>
  );
}
