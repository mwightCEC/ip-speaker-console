import type { Sound } from "@ip-speaker-console/shared";
import { Badge, Group } from "@mantine/core";
import { IconPin } from "@tabler/icons-react";

/** Marks a sound as pinned to Quick play and/or built in. Renders nothing for neither. */
export function SoundBadges({ sound }: { sound: Sound }) {
  if (!sound.pinned && !sound.builtIn) {
    return null;
  }
  return (
    <Group gap={6}>
      {sound.pinned && (
        <Badge size="sm" variant="light" leftSection={<IconPin size={12} aria-hidden />}>
          Quick play
        </Badge>
      )}
      {sound.builtIn && (
        <Badge size="sm" variant="light" color="gray">
          Built-in
        </Badge>
      )}
    </Group>
  );
}
