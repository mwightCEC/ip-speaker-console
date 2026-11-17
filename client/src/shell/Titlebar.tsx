import { AppShell, Burger, Group, UnstyledButton } from "@mantine/core";
import { Link } from "react-router";
import logoUrl from "../assets/clinton-logo-white.svg";
import { ThemeToggle } from "./ThemeToggle";
import classes from "./Titlebar.module.css";

interface TitlebarProps {
  navOpened: boolean;
  onToggleNav: () => void;
}

/** Persistent titlebar: logo on the left (links to the dashboard), theme toggle on the right. */
export function Titlebar({ navOpened, onToggleNav }: TitlebarProps) {
  return (
    <AppShell.Header className={classes.root}>
      <Group gap="sm" wrap="nowrap">
        <Burger
          opened={navOpened}
          onClick={onToggleNav}
          hiddenFrom="sm"
          size="sm"
          color="var(--color-titlebar-icon)"
          aria-label={navOpened ? "Close navigation" : "Open navigation"}
        />
        <UnstyledButton
          component={Link}
          to="/"
          className={classes.logoLink}
          aria-label="Clinton Electronics, go to the dashboard"
        >
          <img className={classes.logo} src={logoUrl} alt="" />
        </UnstyledButton>
      </Group>
      <ThemeToggle />
    </AppShell.Header>
  );
}
