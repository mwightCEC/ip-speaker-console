import type { ActivityCategory, ActivityOutcome, ActivityPage } from "@ip-speaker-console/shared";
import { apiRequest } from "./apiRequest";

export interface ActivityFilters {
  category?: ActivityCategory | undefined;
  outcome?: ActivityOutcome | undefined;
}

/** One page of activity, newest first. Pass `before` (a page's nextBefore) for older events. */
export function fetchActivity(
  filters: ActivityFilters,
  { before, limit = 50 }: { before?: number; limit?: number } = {},
): Promise<ActivityPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (filters.category) query.set("category", filters.category);
  if (filters.outcome) query.set("outcome", filters.outcome);
  if (before !== undefined) query.set("before", String(before));
  return apiRequest<ActivityPage>(`/activity?${query.toString()}`);
}
