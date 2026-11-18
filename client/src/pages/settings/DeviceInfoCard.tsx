import type { AddressAssignment, ConnectionType, DeviceInfo } from "@ip-speaker-console/shared";
import { ActionIcon, Alert, Button, Stack, Text, Tooltip } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { SectionCard } from "../../components/SectionCard";
import { StatusRow } from "../../components/StatusRow";
import { formatUptime } from "../../format/time";
import type { useDeviceInfo } from "./useDeviceInfo";

/** Model, software version, uptime and network connection, with a refresh button. */
export function DeviceInfoCard({ device }: { device: ReturnType<typeof useDeviceInfo> }) {
  const info = device.status === "ready" ? device.info : undefined;

  return (
    <SectionCard
      title="Device information"
      action={
        <Tooltip label="Refresh">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Refresh the device information"
            loading={device.refreshing}
            onClick={device.refresh}
          >
            <IconRefresh size={18} aria-hidden />
          </ActionIcon>
        </Tooltip>
      }
    >
      {device.status === "error" ? (
        <Alert color="danger" title="Couldn't read the device information">
          <Text size="sm" mb="sm">
            {device.message}
          </Text>
          <Button size="xs" variant="light" color="danger" onClick={device.refresh}>
            Try again
          </Button>
        </Alert>
      ) : (
        <Stack gap="sm">
          <StatusRow label="Model">{info?.model}</StatusRow>
          <StatusRow label="Software">{info && `Version ${info.softwareVersion}`}</StatusRow>
          <StatusRow label="Hostname">{info?.hostname}</StatusRow>
          <StatusRow label="Up for">{info && formatUptime(info.uptimeSeconds)}</StatusRow>
          <StatusRow label="Network">{info && describeNetwork(info)}</StatusRow>
        </Stack>
      )}
    </SectionCard>
  );
}

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  ethernet: "Ethernet",
  wifi: "Wi-Fi",
  other: "Connected",
};

const ADDRESSING_LABELS: Record<AddressAssignment, string | undefined> = {
  dhcp: "DHCP",
  static: "Static IP",
  unknown: undefined,
};

/** The connection in a few words, such as "Ethernet · DHCP" or "Not connected". */
function describeNetwork({ network }: DeviceInfo): string {
  if (!network) {
    return "Not connected";
  }
  const addressing = ADDRESSING_LABELS[network.addressing];
  return [CONNECTION_LABELS[network.type], addressing].filter(Boolean).join(" · ");
}
