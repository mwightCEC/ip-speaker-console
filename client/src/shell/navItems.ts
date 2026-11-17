import {
  IconActivity,
  IconLayoutDashboard,
  IconMusic,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

export interface NavItem {
  label: string;
  path: string;
  icon: Icon;
}

/** The four primary pages, in sidebar order. The router uses the same paths. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: IconLayoutDashboard },
  { label: "Sounds", path: "/sounds", icon: IconMusic },
  { label: "Activity", path: "/activity", icon: IconActivity },
  { label: "Settings", path: "/settings", icon: IconSettings },
];
