import type { Sound } from "@ip-speaker-console/shared";
import {
  ActionIcon,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useId } from "react";
import type { SoundItemProps } from "./soundItemProps";
import classes from "./SoundLibraryCard.module.css";
import { SoundListRow } from "./SoundListRow";
import { SoundTile } from "./SoundTile";

type Layout = "tiles" | "list";

interface SoundLibraryCardProps {
  /** Every sound; undefined until the speaker has sent them. */
  sounds: Sound[] | undefined;
  /** The props for one sound's tile or row. */
  itemProps: (sound: Sound) => SoundItemProps;
}

/**
 * Every sound in one card, as tiles or as a list. The button in the card's header switches
 * between them, and this browser remembers the choice.
 */
export function SoundLibraryCard({ sounds, itemProps }: SoundLibraryCardProps) {
  const titleId = useId();
  const [layout, setLayout] = useLocalStorage<Layout>({
    key: "ip-speaker-console.sounds-layout",
    defaultValue: "tiles",
  });
  const nextLayout: Layout = layout === "tiles" ? "list" : "tiles";

  return (
    <Card component="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" align="baseline">
            <Title order={2} size="h4" id={titleId}>
              Library
            </Title>
            {sounds && (
              <Text size="sm" c="dimmed">
                {sounds.length === 1 ? "1 sound" : `${sounds.length} sounds`}
              </Text>
            )}
          </Group>
          <Tooltip label={nextLayout === "list" ? "Show as a list" : "Show as tiles"}>
            <ActionIcon
              variant="default"
              size="lg"
              aria-label={nextLayout === "list" ? "Show as a list" : "Show as tiles"}
              onClick={() => setLayout(nextLayout)}
            >
              {nextLayout === "list" ? (
                <IconList size={18} aria-hidden />
              ) : (
                <IconLayoutGrid size={18} aria-hidden />
              )}
            </ActionIcon>
          </Tooltip>
        </Group>

        {sounds === undefined && (
          <Stack gap="xs">
            {[1, 2, 3].map((key) => (
              <Skeleton key={key} h={56} />
            ))}
          </Stack>
        )}

        {sounds?.length === 0 && (
          <Text>There are no sounds on the speaker yet. Upload a WAV file to get started.</Text>
        )}

        {sounds !== undefined && sounds.length > 0 && layout === "tiles" && (
          <SimpleGrid component="ul" cols={{ base: 1, sm: 2, lg: 3 }} className={classes.tiles}>
            {sounds.map((sound) => (
              <SoundTile key={sound.id} {...itemProps(sound)} />
            ))}
          </SimpleGrid>
        )}

        {sounds !== undefined && sounds.length > 0 && layout === "list" && (
          <ul className={classes.list}>
            {sounds.map((sound) => (
              <SoundListRow key={sound.id} {...itemProps(sound)} />
            ))}
          </ul>
        )}
      </Stack>
    </Card>
  );
}
