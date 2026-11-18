import type { ActivityEvent } from "@ip-speaker-console/shared";
import { Anchor, Text } from "@mantine/core";
import { Link } from "react-router";
import { ActivityEventItem } from "../../components/ActivityEventItem";
import { SectionCard } from "../../components/SectionCard";
import classes from "./RecentActivityCard.module.css";

const SHOWN_EVENTS = 8;

/** The newest activity, updating live. */
export function RecentActivityCard({ events }: { events: ActivityEvent[] }) {
  const shown = events.slice(0, SHOWN_EVENTS);

  return (
    <SectionCard
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
            <ActivityEventItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
