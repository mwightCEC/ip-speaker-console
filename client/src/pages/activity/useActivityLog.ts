import type { ActivityEvent } from "@ip-speaker-console/shared";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";
import { fetchActivity, type ActivityFilters } from "../../api/activity";
import { useRealtime } from "../../realtime/useRealtime";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: ActivityEvent[]; nextBefore: number | undefined };

/** Loads one page and turns the outcome into state. Never rejects. */
async function requestPage(filters: ActivityFilters, before?: number): Promise<LoadState> {
  try {
    const page = await fetchActivity(filters, before === undefined ? {} : { before });
    return { status: "ready", events: page.events, nextBefore: page.nextBefore };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Whether an event belongs in a list with these filters. */
export function matchesFilters(event: ActivityEvent, { category, outcome }: ActivityFilters) {
  return (!category || event.category === category) && (!outcome || event.outcome === outcome);
}

/**
 * The activity log for some filters: the first page, older pages on request, and new events
 * as they happen. Remount it (with a `key`) when the filters change.
 */
export function useActivityLog({ category, outcome }: ActivityFilters) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const recentActivity = useRealtime((realtime) => realtime.recentActivity);

  useEffect(() => {
    let cancelled = false;
    void requestPage({ category, outcome }).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [category, outcome]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void requestPage({ category, outcome }).then(setState);
  }, [category, outcome]);

  const loadMore = async () => {
    if (state.status !== "ready" || state.nextBefore === undefined) return;
    setLoadingMore(true);
    const next = await requestPage({ category, outcome }, state.nextBefore);
    setLoadingMore(false);
    if (next.status === "ready") {
      setState({ ...next, events: [...state.events, ...next.events] });
    } else if (next.status === "error") {
      // Keep what's shown; just say the older events couldn't be loaded.
      notifications.show({
        color: "danger",
        title: "Couldn't load older activity",
        message: next.message,
      });
    }
  };

  if (state.status !== "ready") {
    return { ...state, loadingMore, loadMore, retry };
  }

  // Events that happened since the first page loaded arrive over the WebSocket.
  const newestLoaded = state.events[0]?.id ?? 0;
  const live = recentActivity.filter(
    (event) => event.id > newestLoaded && matchesFilters(event, { category, outcome }),
  );
  return {
    ...state,
    events: [...live, ...state.events],
    loadingMore,
    loadMore,
    retry,
  };
}
