import type { AudioDriverName } from "@ip-speaker-console/shared";
import { Badge, Group, Skeleton, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { LivePlayback } from "../../realtime/realtimeState";
import { DashboardCard } from "./DashboardCard";

interface SpeakerStatusCardProps {
  playback: LivePlayback;
  audioDriver: AudioDriverName | undefined;
  serverVersion: string | undefined;
}

const AUDIO_OUTPUT: Record<AudioDriverName, string> = {
  aplay: "Speaker (ALSA)",
  mock: "Simulated, no sound",
};

/** The speaker's audio status, audio output and software version. */
export function SpeakerStatusCard({
  playback,
  audioDriver,
  serverVersion,
}: SpeakerStatusCardProps) {
  return (
    <DashboardCard title="Speaker">
      <Stack gap="sm">
        <StatusRow label="Audio">
          <AudioStatusBadge playback={playback} />
        </StatusRow>
        <StatusRow label="Output">{audioDriver && AUDIO_OUTPUT[audioDriver]}</StatusRow>
        <StatusRow label="Version">{serverVersion}</StatusRow>
      </Stack>
    </DashboardCard>
  );
}

/** A label and its value. The value is a placeholder until the first snapshot arrives. */
function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text c="dimmed">{label}</Text>
      {children === undefined ? (
        <Skeleton h={16} w={96} />
      ) : (
        <Text component="div" ta="right">
          {children}
        </Text>
      )}
    </Group>
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
  // The reason is shown in the Now playing card; the badge only flags it.
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
