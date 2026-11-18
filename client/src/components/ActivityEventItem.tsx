import type { ActivityEvent } from "@ip-speaker-console/shared";
import { Group, Stack, Text } from "@mantine/core";
import { formatEventTime } from "../format/time";
import { useRealtime } from "../realtime/useRealtime";
import { ActivityOutcomeBadge } from "./ActivityOutcomeBadge";
import classes from "./ActivityEventItem.module.css";

/** Names for the activity categories, as shown to people. */
export const CATEGORY_LABELS = {
  playback: "Playback",
  files: "Files",
  settings: "Settings",
  device: "Device",
} as const;

interface ActivityEventItemProps {
  event: ActivityEvent;
  /** Also show which part of the device the event concerns. */
  showCategory?: boolean;
}

/**
 * One activity event as a list item: the message and detail, then its outcome and time. The
 * time is shown in the device's time zone.
 */
export function ActivityEventItem({ event, showCategory = false }: ActivityEventItemProps) {
  const timeZone = useRealtime((state) => state.settings?.timeZone);

  return (
    <li className={classes.item}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={2}>
          <Text size="sm" c="var(--color-text-primary)">
            {event.message}
          </Text>
          {event.detail && (
            <Text size="xs" c="dimmed">
              {event.detail}
            </Text>
          )}
        </Stack>
        <Stack gap={4} align="flex-end" className={classes.meta}>
          <ActivityOutcomeBadge outcome={event.outcome} />
          <Text size="xs" c="dimmed" component="time" dateTime={event.timestamp}>
            {showCategory && `${CATEGORY_LABELS[event.category]} · `}
            {formatEventTime(event.timestamp, { timeZone })}
          </Text>
        </Stack>
      </Group>
    </li>
  );
}
