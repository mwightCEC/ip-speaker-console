import { createBrowserRouter } from "react-router";
import { ActivityPage } from "./pages/ActivityPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SoundsPage } from "./pages/SoundsPage";
import { AppLayout } from "./shell/AppLayout";

// Paths match NAV_ITEMS in shell/navItems.ts. The server returns index.html for these routes.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "sounds", element: <SoundsPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
