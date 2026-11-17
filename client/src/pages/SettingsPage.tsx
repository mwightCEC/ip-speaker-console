import { PlannedPage } from "../components/PlannedPage";

export function SettingsPage() {
  return (
    <PlannedPage
      title="Settings"
      description="Device configuration and information."
      milestone="M6"
      features={[
        "Device name, time zone and audio status",
        "Model, software version and network details",
        "Reboot with confirmation and reconnect",
      ]}
    />
  );
}
