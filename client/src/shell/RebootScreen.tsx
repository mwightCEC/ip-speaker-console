import { REBOOT_TIMEOUT_MS } from "@ip-speaker-console/shared";
import { Alert, Button, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { formatDuration } from "../format/time";
import { useRealtime } from "../realtime/useRealtime";
import { useRebootProgress } from "./useRebootProgress";

/**
 * Covers the console while the device reboots, in every open browser, and reloads the page
 * once it's back. It can't be dismissed: nothing works until the device returns.
 */
export function RebootScreen() {
  const rebootingFrom = useRealtime((state) => state.rebootingFrom);
  const deviceName = useRealtime((state) => state.settings?.deviceName) ?? "the speaker";

  return (
    <Modal
      opened={rebootingFrom !== undefined}
      onClose={() => undefined}
      withCloseButton={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      centered
      title={`Rebooting ${deviceName}`}
    >
      {rebootingFrom !== undefined && <RebootProgress fromBootId={rebootingFrom} />}
    </Modal>
  );
}

function RebootProgress({ fromBootId }: { fromBootId: string }) {
  const { phase, elapsedMs, keepWaiting, reloadPage } = useRebootProgress(fromBootId);

  if (phase === "timed-out") {
    return (
      <Stack gap="md">
        <Alert color="danger" title="The speaker hasn't come back">
          It's been {Math.round(REBOOT_TIMEOUT_MS / 60_000)} minutes. Check that it has power and is
          connected to the network. This page keeps checking and reloads if it returns.
        </Alert>
        <Group justify="flex-end">
          <Button variant="default" onClick={reloadPage}>
            Reload page
          </Button>
          <Button onClick={keepWaiting}>Keep waiting</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md" align="center" py="md" aria-live="polite">
      <Loader />
      <Text ta="center">
        {phase === "going-down"
          ? "Waiting for the speaker to shut down…"
          : "The speaker is restarting. This page reloads by itself when it's back."}
      </Text>
      <Text size="sm" c="dimmed">
        {formatDuration(elapsedMs)}
      </Text>
    </Stack>
  );
}
