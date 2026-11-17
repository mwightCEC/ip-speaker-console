import { PlannedPage } from "../components/PlannedPage";

export function SoundsPage() {
  return (
    <PlannedPage
      title="Sounds"
      description="Recordings available to the speaker."
      milestone="M5"
      features={[
        "Library of default and uploaded recordings",
        "Preview in the browser or play on the speaker",
        "WAV upload with validation",
        "Rename, download, pin and delete",
      ]}
    />
  );
}
