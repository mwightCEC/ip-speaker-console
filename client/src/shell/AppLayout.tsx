import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Titlebar } from "./Titlebar";
import { useServerCheck } from "./useServerCheck";

/** Shared frame for every page: titlebar, sidebar and the routed page in the main area. */
export function AppLayout() {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  useServerCheck();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navOpened } }}
      padding="lg"
    >
      <Titlebar navOpened={navOpened} onToggleNav={toggleNav} />
      <Sidebar onNavigate={closeNav} />
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
