import { Alert, Button, Center, Skeleton, Stack, Text } from "@mantine/core";
import type { ActivityFilters } from "../../api/activity";
import { ActivityEventItem } from "../../components/ActivityEventItem";
import classes from "./ActivityLog.module.css";
import { useActivityLog } from "./useActivityLog";

/** The events for some filters, newest first, with new ones appearing live. */
export function ActivityLog(filters: ActivityFilters) {
  const log = useActivityLog(filters);
  const filtered = filters.category !== undefined || filters.outcome !== undefined;

  if (log.status === "loading") {
    return (
      <Stack gap="xs">
        {[1, 2, 3, 4, 5].map((key) => (
          <Skeleton key={key} h={44} />
        ))}
      </Stack>
    );
  }

  if (log.status === "error") {
    return (
      <Alert color="danger" title="Couldn't load the activity">
        <Text size="sm" mb="sm">
          {log.message}
        </Text>
        <Button size="xs" variant="light" color="danger" onClick={log.retry}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (log.events.length === 0) {
    return <Text>{filtered ? "No activity matches these filters." : "No activity yet."}</Text>;
  }

  return (
    <Stack gap="md">
      <ol className={classes.list} aria-label="Activity, newest first">
        {log.events.map((event) => (
          <ActivityEventItem key={event.id} event={event} showCategory />
        ))}
      </ol>
      {log.nextBefore === undefined ? (
        <Text size="sm" c="dimmed" ta="center">
          That's everything the speaker has kept.
        </Text>
      ) : (
        <Center>
          <Button variant="default" loading={log.loadingMore} onClick={() => void log.loadMore()}>
            Load older activity
          </Button>
        </Center>
      )}
    </Stack>
  );
}
