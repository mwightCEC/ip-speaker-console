import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_OUTCOMES,
  type ActivityCategory,
  type ActivityOutcome,
} from "@ip-speaker-console/shared";
import { Card, Group, Select, Stack } from "@mantine/core";
import { useSearchParams } from "react-router";
import { CATEGORY_LABELS } from "../../components/ActivityEventItem";
import { PageHeader } from "../../components/PageHeader";
import { ActivityLog } from "./ActivityLog";

const ALL = "all";

const OUTCOME_LABELS: Record<ActivityOutcome, string> = {
  success: "Success",
  warning: "Warning",
  failure: "Failed",
  info: "Info",
};

const CATEGORY_OPTIONS = [
  { value: ALL, label: "All categories" },
  ...ACTIVITY_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

const OUTCOME_OPTIONS = [
  { value: ALL, label: "All outcomes" },
  ...ACTIVITY_OUTCOMES.map((value) => ({ value, label: OUTCOME_LABELS[value] })),
];

/** Reads a filter from the address, ignoring values that aren't one of the choices. */
function readFilter<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((value) => value === raw);
}

/**
 * Everything the speaker has done, newest first, with filters. The filters live in the
 * address (such as /activity?outcome=failure), so a filtered view can be bookmarked or shared.
 */
export function ActivityPage() {
  const [params, setParams] = useSearchParams();
  const category = readFilter<ActivityCategory>(params.get("category"), ACTIVITY_CATEGORIES);
  const outcome = readFilter<ActivityOutcome>(params.get("outcome"), ACTIVITY_OUTCOMES);

  const setFilter = (name: "category" | "outcome", value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && value !== ALL) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Activity"
        description="Everything the speaker has done, and whether it worked."
      />
      <Card>
        <Stack gap="md">
          <Group gap="sm" grow preventGrowOverflow={false} wrap="wrap">
            <Select
              label="Category"
              data={CATEGORY_OPTIONS}
              value={category ?? ALL}
              onChange={(value) => setFilter("category", value)}
              allowDeselect={false}
            />
            <Select
              label="Outcome"
              data={OUTCOME_OPTIONS}
              value={outcome ?? ALL}
              onChange={(value) => setFilter("outcome", value)}
              allowDeselect={false}
            />
          </Group>
          {/* Keyed so each set of filters starts from a fresh first page. */}
          <ActivityLog
            key={`${category ?? ALL}-${outcome ?? ALL}`}
            category={category}
            outcome={outcome}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
