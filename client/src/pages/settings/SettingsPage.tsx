import { SimpleGrid, Stack } from "@mantine/core";
import { PageHeader } from "../../components/PageHeader";
import { useRealtime } from "../../realtime/useRealtime";
import { DeviceInfoCard } from "./DeviceInfoCard";
import { DeviceSettingsCard } from "./DeviceSettingsCard";
import { RebootCard } from "./RebootCard";
import { useDeviceInfo } from "./useDeviceInfo";

/** Device settings, device information and reboot. */
export function SettingsPage() {
  const settings = useRealtime((state) => state.settings);
  const device = useDeviceInfo();

  return (
    <Stack gap="lg">
      <PageHeader title="Settings" description="Device configuration and information." />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <DeviceSettingsCard settings={settings} />
        <DeviceInfoCard device={device} />
        <RebootCard deviceName={settings?.deviceName} />
      </SimpleGrid>
    </Stack>
  );
}
