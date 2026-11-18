import { Card, Group, Stack, Title } from "@mantine/core";
import { useId, type ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  /** Shown at the right of the title, such as a "View all" link. */
  action?: ReactNode;
  children: ReactNode;
}

/** One titled panel on the Dashboard, marked up as a labelled section. */
export function DashboardCard({ title, action, children }: DashboardCardProps) {
  const titleId = useId();

  return (
    <Card component="section" aria-labelledby={titleId} h="100%">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2} size="h4" id={titleId}>
            {title}
          </Title>
          {action}
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
