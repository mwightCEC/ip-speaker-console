import { Group, Skeleton, Text } from "@mantine/core";
import type { ReactNode } from "react";

/** A label and its value. The value is a placeholder while it's undefined (still loading). */
export function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Text c="dimmed">{label}</Text>
      {children === undefined ? (
        <Skeleton h={16} w={96} />
      ) : (
        <Text component="div" ta="right">
          {children}
        </Text>
      )}
    </Group>
  );
}
