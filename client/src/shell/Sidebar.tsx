import { AppShell, NavLink } from "@mantine/core";
import { Link, matchPath, useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import classes from "./Sidebar.module.css";

interface SidebarProps {
  /** Called after a link is chosen, so the mobile drawer can close. */
  onNavigate: () => void;
}

/** Persistent left navigation. The current page gets the selected tint and a 3px indicator bar. */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <AppShell.Navbar component="nav" aria-label="Main" className={classes.root}>
      {NAV_ITEMS.map(({ label, path, icon: ItemIcon }) => {
        const active = matchPath({ path, end: path === "/" }, pathname) !== null;
        return (
          <NavLink
            key={path}
            component={Link}
            to={path}
            label={label}
            leftSection={<ItemIcon size={20} stroke={1.75} aria-hidden />}
            active={active}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            classNames={{ root: classes.link, label: classes.label }}
          />
        );
      })}
    </AppShell.Navbar>
  );
}
