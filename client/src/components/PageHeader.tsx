import { Group, Stack, Text, Title } from "@mantine/core";
import { useDocumentTitle } from "@mantine/hooks";
import type { ReactNode } from "react";
import { useRealtime } from "../realtime/useRealtime";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Shown at the right of the title, such as the page's main button. */
  action?: ReactNode;
}

const APP_NAME = "IP Speaker Console";

/**
 * Page title and optional one-line description. Also sets the browser tab title, with the
 * device's name so several speakers' tabs can be told apart.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  const deviceName = useRealtime((state) => state.settings?.deviceName);
  useDocumentTitle(`${title} · ${deviceName ?? APP_NAME}`);

  return (
    <Group justify="space-between" align="flex-end" gap="md">
      <Stack gap={4}>
        <Title order={1} size="h2">
          {title}
        </Title>
        {/* Body color, not secondary: gray-500 text drops below AA on the gray-50 canvas. */}
        {description && <Text>{description}</Text>}
      </Stack>
      {action}
    </Group>
  );
}
