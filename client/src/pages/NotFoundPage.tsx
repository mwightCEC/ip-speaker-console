import { Anchor, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";

export function NotFoundPage() {
  return (
    <Stack gap="md">
      <PageHeader title="Page not found" />
      <Text>
        This address doesn't match a page in the console.{" "}
        <Anchor component={Link} to="/">
          Go to the dashboard
        </Anchor>
      </Text>
    </Stack>
  );
}
