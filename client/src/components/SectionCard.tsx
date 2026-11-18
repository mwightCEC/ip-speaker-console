import { Card, Group, Stack, Title } from "@mantine/core";
import { useId, type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  /** Shown at the right of the title, such as a "View all" link. */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled panel on a page, marked up as a labelled section. */
export function SectionCard({ title, action, children }: SectionCardProps) {
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
