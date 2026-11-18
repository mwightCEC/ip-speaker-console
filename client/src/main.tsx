import "@fontsource-variable/inter-tight/index.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./theme/tokens.css";
import "./theme/global.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { realtimeClient } from "./realtime/useRealtime";
import { router } from "./router";
import { TITLEBAR_HEIGHT } from "./shell/layout";
import notificationClasses from "./shell/Notifications.module.css";
import { cssVariablesResolver } from "./theme/cssVariablesResolver";
import { theme } from "./theme/theme";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The #root element is missing from index.html.");
}

realtimeClient.start();

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <Notifications
        position="top-right"
        classNames={{ root: notificationClasses.root }}
        style={{ "--titlebar-height": `${TITLEBAR_HEIGHT}px` }}
      />
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
