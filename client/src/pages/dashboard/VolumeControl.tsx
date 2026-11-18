import {
  VOLUME_MAX,
  VOLUME_MIN,
  type VolumeChange,
  type VolumeState,
} from "@ip-speaker-console/shared";
import { ActionIcon, Group, Skeleton, Slider, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconVolume, IconVolume2, IconVolume3, IconVolumeOff } from "@tabler/icons-react";
import { useState } from "react";
import { changeVolume } from "../../api/playback";
import classes from "./VolumeControl.module.css";

/**
 * How long the slider must rest before the volume is sent. Holding an arrow key or dragging
 * then makes one change instead of one per step, for the speaker and the activity log alike.
 */
const SAVE_DELAY_MS = 400;

/**
 * The speaker's mute button and volume slider. They follow the live volume, except while being
 * changed. Moving the slider while muted unmutes, as on a computer.
 */
export function VolumeControl({ volume }: { volume: VolumeState | undefined }) {
  // The values being changed or saved; undefined means "show the live value".
  const [draftPercent, setDraftPercent] = useState<number>();
  const [draftMuted, setDraftMuted] = useState<boolean>();

  const save = async (change: VolumeChange) => {
    try {
      await changeVolume(change);
    } catch (error) {
      notifications.show({
        color: "danger",
        title: change.muted === undefined ? "Couldn't change the volume" : muteFailureTitle(change),
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (change.percent !== undefined) {
        setDraftPercent(undefined);
      }
      setDraftMuted(undefined);
    }
  };

  const savePercent = useDebouncedCallback(
    (percent: number) => void save({ percent, muted: false }),
    SAVE_DELAY_MS,
  );

  if (volume === undefined) {
    return <Skeleton h={28} />;
  }

  const percent = draftPercent ?? volume.percent;
  const muted = draftMuted ?? volume.muted;

  const toggleMute = () => {
    setDraftMuted(!muted);
    void save({ muted: !muted });
  };

  return (
    <Group gap="sm" wrap="nowrap">
      <ActionIcon
        variant="subtle"
        color={muted ? "danger" : "gray"}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={toggleMute}
      >
        <VolumeIcon percent={percent} muted={muted} />
      </ActionIcon>
      <Slider
        className={classes.slider}
        color={muted ? "gray" : "brand"}
        value={percent}
        min={VOLUME_MIN}
        max={VOLUME_MAX}
        step={1}
        label={(value) => `${value}%`}
        thumbLabel="Volume"
        onChange={(value) => {
          setDraftPercent(value);
          setDraftMuted(false);
        }}
        onChangeEnd={savePercent}
      />
      <Text size="sm" c="dimmed" className={classes.value} aria-hidden>
        {muted ? "Muted" : `${percent}%`}
      </Text>
    </Group>
  );
}

function muteFailureTitle(change: VolumeChange): string {
  return change.muted ? "Couldn't mute the speaker" : "Couldn't unmute the speaker";
}

function VolumeIcon({ percent, muted }: { percent: number; muted: boolean }) {
  const Icon = muted
    ? IconVolumeOff
    : percent === 0
      ? IconVolume3
      : percent < 50
        ? IconVolume2
        : IconVolume;
  return <Icon size={20} aria-hidden />;
}
