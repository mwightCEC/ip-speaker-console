import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import classes from "./ThemeToggle.module.css";

/**
 * Switches between light and dark. Until someone clicks it, the console follows the system
 * theme; after that Mantine remembers the choice in localStorage.
 */
export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const nextScheme = computedScheme === "dark" ? "light" : "dark";

  return (
    <ActionIcon
      variant="transparent"
      size="lg"
      className={classes.root}
      onClick={() => setColorScheme(nextScheme)}
      aria-label={`Switch to ${nextScheme} theme`}
    >
      {/* Both icons render and CSS shows the right one, so the icon never flashes on load. */}
      <IconMoon size={20} stroke={1.75} className={classes.moon} aria-hidden />
      <IconSun size={20} stroke={1.75} className={classes.sun} aria-hidden />
    </ActionIcon>
  );
}
