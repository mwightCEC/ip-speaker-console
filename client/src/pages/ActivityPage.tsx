import { PlannedPage } from "../components/PlannedPage";

export function ActivityPage() {
  return (
    <PlannedPage
      title="Activity"
      description="Everything the speaker has done, and whether it worked."
      milestone="M6"
      features={[
        "Live log of playback, file and device events",
        "Success, warning and failure for each event",
        "Filters by category and outcome",
      ]}
    />
  );
}
