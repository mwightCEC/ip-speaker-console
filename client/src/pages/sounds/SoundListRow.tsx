import { Group, Text } from "@mantine/core";
import { formatFileSize, formatSoundFormat } from "../../format/sound";
import { formatDuration } from "../../format/time";
import { PlayButton, PreviewButton } from "../../playback/SoundButtons";
import { SoundBadges } from "./SoundBadges";
import type { SoundItemProps } from "./soundItemProps";
import classes from "./SoundListRow.module.css";
import { SoundMenu } from "./SoundMenu";

/** One sound as a list row: details on the left, then its length and buttons. */
export function SoundListRow(props: SoundItemProps) {
  const { sound } = props;

  return (
    <li className={classes.row} aria-label={sound.name}>
      <div className={classes.info}>
        <Group gap="xs">
          <Text fw={600} size="sm" c="var(--color-text-primary)" className={classes.name}>
            {sound.name}
          </Text>
          <SoundBadges sound={sound} />
        </Group>
        <Text size="xs" c="dimmed" className={classes.details}>
          {sound.fileName} · {formatSoundFormat(sound.format)} · {formatFileSize(sound.sizeBytes)}
        </Text>
      </div>
      <Text size="sm" c="dimmed" className={classes.duration}>
        {formatDuration(sound.durationMs)}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <PreviewButton
          size="icon"
          name={sound.name}
          previewing={props.previewing}
          onPreview={props.onPreview}
          onStopPreview={props.onStopPreview}
        />
        <PlayButton
          size="icon"
          name={sound.name}
          playing={props.playing}
          starting={props.starting}
          onPlay={props.onPlay}
          onStop={props.onStop}
        />
        <SoundMenu {...props} />
      </Group>
    </li>
  );
}
