import { Card, List, Stack, Text } from "@mantine/core";
import { PageHeader } from "./PageHeader";

interface PlannedPageProps {
  title: string;
  description: string;
  milestone: string;
  features: string[];
}

/**
 * Temporary page body used while the shell is built (M2). Each page replaces it with its real
 * content in the milestone it names.
 */
export function PlannedPage({ title, description, milestone, features }: PlannedPageProps) {
  return (
    <Stack gap="lg">
      <PageHeader title={title} description={description} />
      <Card>
        <Stack gap="xs">
          <Text fw={600} c="var(--color-text-primary)">
            Coming in {milestone}
          </Text>
          <List size="sm" spacing={4}>
            {features.map((feature) => (
              <List.Item key={feature}>{feature}</List.Item>
            ))}
          </List>
        </Stack>
      </Card>
    </Stack>
  );
}
