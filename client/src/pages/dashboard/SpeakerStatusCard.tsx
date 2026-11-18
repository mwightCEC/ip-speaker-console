import type { AudioDriverName } from "@ip-speaker-console/shared";
import { Badge, Stack } from "@mantine/core";
import { SectionCard } from "../../components/SectionCard";
import { StatusRow } from "../../components/StatusRow";
import { AUDIO_OUTPUT_LABELS } from "../../format/audio";
import type { LivePlayback } from "../../realtime/realtimeState";

interface SpeakerStatusCardProps {
  playback: LivePlayback;
  audioDriver: AudioDriverName | undefined;
  serverVersion: string | undefined;
}

/** The speaker's audio status, audio output and software version. */
export function SpeakerStatusCard({
  playback,
  audioDriver,
  serverVersion,
}: SpeakerStatusCardProps) {
  return (
    <SectionCard title="Speaker">
      <Stack gap="sm">
        <StatusRow label="Audio">
          <AudioStatusBadge playback={playback} />
        </StatusRow>
        <StatusRow label="Output">{audioDriver && AUDIO_OUTPUT_LABELS[audioDriver]}</StatusRow>
        <StatusRow label="Version">{serverVersion}</StatusRow>
      </Stack>
    </SectionCard>
  );
}

function AudioStatusBadge({ playback }: { playback: LivePlayback }) {
  if (playback.nowPlaying) {
    return (
      <Badge color="brand" variant="light">
        Playing
      </Badge>
    );
  }
  // The reason is shown in the Playback card; the badge only flags it.
  if (playback.lastResult?.ending === "failed") {
    return (
      <Badge color="danger" variant="light">
        Error
      </Badge>
    );
  }
  return (
    <Badge color="success" variant="light">
      Ready
    </Badge>
  );
}
