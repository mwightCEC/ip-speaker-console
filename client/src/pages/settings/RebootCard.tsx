import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPower } from "@tabler/icons-react";
import { useState } from "react";
import { rebootDevice } from "../../api/device";
import { SectionCard } from "../../components/SectionCard";
import { realtimeClient } from "../../realtime/useRealtime";

/** Reboots the device after asking first. The reboot screen takes over from there. */
export function RebootCard({ deviceName }: { deviceName: string | undefined }) {
  const [confirming, { open, close }] = useDisclosure(false);
  const [starting, setStarting] = useState(false);
  const name = deviceName ?? "the speaker";

  const reboot = async () => {
    setStarting(true);
    try {
      const { bootId } = await rebootDevice();
      // The WebSocket says so too, but it may drop before that message arrives.
      realtimeClient.markRebooting(bootId);
      close();
    } catch (error) {
      notifications.show({
        color: "danger",
        title: "Couldn't reboot the speaker",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <SectionCard title="Reboot">
      <Text>
        Restarts the speaker. Playback stops, and the console is unavailable until it's back,
        usually within a minute.
      </Text>
      <Group justify="flex-end">
        <Button
          color="danger"
          variant="light"
          leftSection={<IconPower size={16} aria-hidden />}
          onClick={open}
        >
          Reboot…
        </Button>
      </Group>

      <Modal opened={confirming} onClose={close} title={`Reboot ${name}?`}>
        <Stack gap="md">
          <Text>
            Anything playing stops, and every open console shows a reboot screen until the speaker
            is back.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button color="danger" loading={starting} onClick={() => void reboot()}>
              Reboot
            </Button>
          </Group>
        </Stack>
      </Modal>
    </SectionCard>
  );
}
