import type { DefaultMantineColor, MantineColorsTuple } from "@mantine/core";

type AppColor = "brand" | "success" | "warning" | "danger" | DefaultMantineColor;

// Lets `color="success"` and friends type-check alongside Mantine's built-in color names.
declare module "@mantine/core" {
  export interface MantineThemeColorsOverride {
    colors: Record<AppColor, MantineColorsTuple>;
  }
}
