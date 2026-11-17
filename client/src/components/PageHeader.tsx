import { Stack, Text, Title } from "@mantine/core";
import { useDocumentTitle } from "@mantine/hooks";

interface PageHeaderProps {
  title: string;
  description?: string;
}

const APP_NAME = "IP Speaker Console";

/** Page title and optional one-line description. Also sets the browser tab title. */
export function PageHeader({ title, description }: PageHeaderProps) {
  useDocumentTitle(`${title} · ${APP_NAME}`);

  return (
    <Stack gap={4}>
      <Title order={1} size="h2">
        {title}
      </Title>
      {/* Body color, not secondary: gray-500 text drops below AA on the gray-50 canvas. */}
      {description && <Text>{description}</Text>}
    </Stack>
  );
}
