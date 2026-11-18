import type { ActivityEvent } from "@ip-speaker-console/shared";
import { Anchor, Group, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import { ActivityOutcomeBadge } from "../../components/ActivityOutcomeBadge";
import { formatEventTime } from "../../format/time";
import { DashboardCard } from "./DashboardCard";
import classes from "./RecentActivityCard.module.css";

const SHOWN_EVENTS = 8;

/** The newest activity, updating live. */
export function RecentActivityCard({ events }: { events: ActivityEvent[] }) {
  const shown = events.slice(0, SHOWN_EVENTS);

  return (
    <DashboardCard
      title="Recent activity"
      action={
        <Anchor component={Link} to="/activity" size="sm">
          View all
        </Anchor>
      }
    >
      {shown.length === 0 ? (
        <Text>No activity yet.</Text>
      ) : (
        <ol className={classes.list}>
          {shown.map((event) => (
            <li key={event.id} className={classes.item}>
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
                    {formatEventTime(event.timestamp)}
                  </Text>
                </Stack>
              </Group>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
