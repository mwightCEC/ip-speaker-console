import type { VolumeState } from "@ip-speaker-console/shared";
import { Alert, Button, Divider, Group, Progress, Stack, Text } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import { formatDuration } from "../../format/time";
import type { LivePlayback } from "../../realtime/realtimeState";
import { DashboardCard } from "./DashboardCard";
import type { PlaybackTarget } from "./playbackTarget";
import { usePlaybackProgress } from "./usePlaybackProgress";
import classes from "./PlaybackCard.module.css";
import { VolumeControl } from "./VolumeControl";

interface PlaybackCardProps {
  /** The sound to show; undefined until one is selected or played. */
  target: PlaybackTarget | undefined;
  playback: LivePlayback;
  volume: VolumeState | undefined;
  onPlay: (target: PlaybackTarget) => void;
  onStop: () => void;
  /** A play request for the target is in flight. */
  starting: boolean;
  stopping: boolean;
}

/**
 * The selected sound with Play or Stop, its progress, and the volume. The sound stays after it
 * finishes, ready to play again.
 */
export function PlaybackCard(props: PlaybackCardProps) {
  const { target, volume } = props;

  return (
    <DashboardCard title="Playback">
      {target ? (
        <SelectedSound {...props} target={target} />
      ) : (
        <Text>Select a sound from Quick play to get started.</Text>
      )}
      <Divider />
      <VolumeControl volume={volume} />
    </DashboardCard>
  );
}

function SelectedSound({
  target,
  playback,
  onPlay,
  onStop,
  starting,
  stopping,
}: PlaybackCardProps & { target: PlaybackTarget }) {
  const { nowPlaying, lastResult } = playback;
  const playingThis = nowPlaying?.soundId === target.soundId;
  const elapsedMs = usePlaybackProgress(playingThis ? nowPlaying : undefined);
  const percent = target.durationMs > 0 ? (elapsedMs / target.durationMs) * 100 : 0;
  const failed =
    !nowPlaying && lastResult?.ending === "failed" && lastResult.soundId === target.soundId;

  return (
    <Stack gap="md">
      <Group wrap="nowrap" gap="lg">
        <Stack gap="xs" className={classes.details}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} size="lg" c="var(--color-text-primary)">
              {target.name}
            </Text>
            <Text size="sm" c="dimmed" aria-live="polite">
              {playingThis ? "Playing" : "Ready"}
            </Text>
          </Group>
          <Progress value={percent} aria-label="Playback progress" transitionDuration={250} />
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              {formatDuration(elapsedMs)}
            </Text>
            <Text size="sm" c="dimmed">
              {formatDuration(target.durationMs)}
            </Text>
          </Group>
        </Stack>
        {playingThis ? (
          <Button
            color="danger"
            variant="light"
            leftSection={<IconPlayerStopFilled size={16} aria-hidden />}
            loading={stopping}
            onClick={onStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            leftSection={<IconPlayerPlayFilled size={16} aria-hidden />}
            loading={starting}
            onClick={() => onPlay(target)}
          >
            Play
          </Button>
        )}
      </Group>

      {failed && (
        <Alert color="danger" title={`Couldn't play ${target.name}`}>
          {lastResult.error}
        </Alert>
      )}

      {nowPlaying && !playingThis && (
        <Text size="sm" c="dimmed">
          {nowPlaying.soundName} is playing. Playing {target.name} will stop it.
        </Text>
      )}
    </Stack>
  );
}
