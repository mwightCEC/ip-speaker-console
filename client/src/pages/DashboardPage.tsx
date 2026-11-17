import { PlannedPage } from "../components/PlannedPage";

export function DashboardPage() {
  return (
    <PlannedPage
      title="Dashboard"
      description="Playback and an overview of the speaker."
      milestone="M4"
      features={[
        "Play, pause, stop and volume",
        "Currently selected sound and playback status",
        "Quick announcements with one-click play",
        "Two most recent activity events",
        "Network connection type and IP address",
      ]}
    />
  );
}
