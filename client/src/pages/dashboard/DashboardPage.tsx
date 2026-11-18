import type { Sound } from "@ip-speaker-console/shared";
import { Grid, Stack } from "@mantine/core";
import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { useRealtime } from "../../realtime/useRealtime";
import { PlaybackCard } from "./PlaybackCard";
import { pickPlaybackTarget, type SoundSelection } from "./playbackTarget";
import { QuickPlayCard } from "./QuickPlayCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { SpeakerStatusCard } from "./SpeakerStatusCard";
import { usePlaybackActions } from "./usePlaybackActions";
import { useSounds } from "./useSounds";

export function DashboardPage() {
  const playback = useRealtime((state) => state.playback);
  const volume = useRealtime((state) => state.volume);
  const recentActivity = useRealtime((state) => state.recentActivity);
  const audioDriver = useRealtime((state) => state.audioDriver);
  const serverVersion = useRealtime((state) => state.serverVersion);
  const sounds = useSounds();
  const [selection, setSelection] = useState<SoundSelection>();
  const { play, stop, pendingSoundId, stopping } = usePlaybackActions();

  const target = pickPlaybackTarget(
    selection,
    playback,
    sounds.status === "ready" ? sounds.sounds : [],
  );

  const select = (sound: Sound) => setSelection({ soundId: sound.id, selectedAtMs: Date.now() });
  const selectAndPlay = (sound: Sound) => {
    select(sound);
    void play({ soundId: sound.id, name: sound.name });
  };

  return (
    <Stack gap="lg">
      <PageHeader title="Dashboard" description="Play sounds and see what the speaker is doing." />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <PlaybackCard
            target={target}
            playback={playback}
            volume={volume}
            onPlay={(sound) => void play(sound)}
            onStop={() => void stop()}
            starting={target !== undefined && pendingSoundId === target.soundId}
            stopping={stopping}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SpeakerStatusCard
            playback={playback}
            audioDriver={audioDriver}
            serverVersion={serverVersion}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <QuickPlayCard
            sounds={sounds}
            selectedSoundId={target?.soundId}
            playingSoundId={playback.nowPlaying?.soundId}
            pendingSoundId={pendingSoundId}
            onSelect={select}
            onPlay={selectAndPlay}
            onStop={() => void stop()}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <RecentActivityCard events={recentActivity} />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
