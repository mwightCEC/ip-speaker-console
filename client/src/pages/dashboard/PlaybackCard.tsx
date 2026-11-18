import type { VolumeState } from "@ip-speaker-console/shared";
import { Alert, Divider, Group, Progress, Stack, Text } from "@mantine/core";
import { formatDuration } from "../../format/time";
import { PlayButton, PreviewButton } from "../../playback/SoundButtons";
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
  /** The target is being previewed in this browser. */
  previewing: boolean;
  onPreview: (target: PlaybackTarget) => void;
  onStopPreview: () => void;
}

/**
 * The selected sound with Play or Stop, Preview, its progress, and the volume. The sound stays after it
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
  previewing,
  onPreview,
  onStopPreview,
}: PlaybackCardProps & { target: PlaybackTarget }) {
  const { nowPlaying, lastResult } = playback;
  const playingThis = nowPlaying?.soundId === target.soundId;
  const elapsedMs = usePlaybackProgress(playingThis ? nowPlaying : undefined);
  const percent = target.durationMs > 0 ? (elapsedMs / target.durationMs) * 100 : 0;
  const failed =
    !nowPlaying && lastResult?.ending === "failed" && lastResult.soundId === target.soundId;

  return (
    <Stack gap="md">
      <div className={classes.layout}>
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
        <Group gap="xs" wrap="nowrap" className={classes.buttons}>
          <PreviewButton
            name={target.name}
            previewing={previewing}
            onPreview={() => onPreview(target)}
            onStopPreview={onStopPreview}
          />
          <PlayButton
            name={target.name}
            variant="filled"
            playing={playingThis}
            starting={starting}
            stopping={stopping}
            onPlay={() => onPlay(target)}
            onStop={onStop}
          />
        </Group>
      </div>

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
