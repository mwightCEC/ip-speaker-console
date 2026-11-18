import type { ActivityOutcome } from "@ip-speaker-console/shared";
import { Badge } from "@mantine/core";

const OUTCOME_DISPLAY: Record<ActivityOutcome, { label: string; color: string }> = {
  success: { label: "Success", color: "success" },
  warning: { label: "Warning", color: "warning" },
  failure: { label: "Failed", color: "danger" },
  info: { label: "Info", color: "brand" },
};

/** How an activity event turned out, as a colored label. The word carries the meaning too. */
export function ActivityOutcomeBadge({ outcome }: { outcome: ActivityOutcome }) {
  const { label, color } = OUTCOME_DISPLAY[outcome];
  return (
    <Badge color={color} variant="light" size="sm" radius="sm">
      {label}
    </Badge>
  );
}
