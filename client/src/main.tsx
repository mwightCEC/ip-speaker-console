import "@fontsource-variable/inter-tight/index.css";
import "@mantine/core/styles.css";
import "./theme/tokens.css";
import "./theme/global.css";
import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { cssVariablesResolver } from "./theme/cssVariablesResolver";
import { theme } from "./theme/theme";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The #root element is missing from index.html.");
}

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
