import { Alert, Code, Container, Loader, Stack, Text, Title } from "@mantine/core";
import type { HealthResponse } from "@ip-speaker-console/shared";
import { useEffect, useState } from "react";
import { fetchHealth } from "./api/health";

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; health: HealthResponse }
  | { kind: "error"; message: string };

/**
 * Temporary M1 page that proves the client, dev proxy and server are wired together.
 * The application shell replaces it in M2.
 */
export function App() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: "ok", health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const reason = error instanceof Error ? error.message : String(error);
        setState({ kind: "error", message: reason });
      });
    return () => controller.abort();
  }, []);

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>IP Speaker Console</Title>
        <HealthStatus state={state} />
      </Stack>
    </Container>
  );
}

function HealthStatus({ state }: { state: HealthState }) {
  switch (state.kind) {
    case "loading":
      return <Loader size="sm" aria-label="Checking the server" />;
    case "error":
      return (
        <Alert color="red" title="Can't reach the server">
          {state.message} Check that the server is running with npm run dev.
        </Alert>
      );
    case "ok":
      return (
        <Alert color="green" title="Server connected">
          <Text size="sm">
            Version <Code>{state.health.version}</Code>, audio driver{" "}
            <Code>{state.health.drivers.audio}</Code>, system driver{" "}
            <Code>{state.health.drivers.system}</Code>.
          </Text>
        </Alert>
      );
  }
}
