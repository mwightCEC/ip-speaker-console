import { Anchor, Card, colorsTuple, createTheme, Title } from "@mantine/core";
import { palette } from "./palette";
import classes from "./theme.module.css";
import { variantColorResolver } from "./variantColorResolver";

const FONT_FAMILY =
  "'Inter Tight Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const { blue, gray, dark } = palette;

/*
 * Mantine needs ten shades per color. Where the handoff defines fewer steps, the nearest defined
 * step repeats instead of inventing colors. Components get their real colors from the role tokens
 * (cssVariablesResolver), so these tuples only matter for explicit shades such as `c="brand.7"`.
 */
const brandShades = colorsTuple([
  blue[50],
  blue[50],
  blue[300],
  blue[300],
  blue[500],
  blue[500],
  blue[600],
  blue[700],
  blue[700],
  blue[700],
]);

const grayShades = colorsTuple([
  gray[50],
  gray[100],
  gray[200],
  gray[200],
  gray[400],
  gray[500],
  gray[500],
  gray[700],
  gray[900],
  gray[900],
]);

/** Mantine's dark-mode shades: 0 text, 2 dimmed, 4 borders, 6 inputs, 7 page. */
const darkShades = colorsTuple([
  dark["text-primary"],
  dark["text-primary"],
  dark["text-secondary"],
  dark["text-secondary"],
  dark.border,
  dark.border,
  dark.surface,
  dark.canvas,
  dark.canvas,
  dark.canvas,
]);

export const theme = createTheme({
  fontFamily: FONT_FAMILY,
  headings: { fontFamily: FONT_FAMILY, fontWeight: "600" },
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 6 },
  colors: {
    brand: brandShades,
    gray: grayShades,
    dark: darkShades,
    success: colorsTuple(palette.success[600]),
    warning: colorsTuple(palette.warning[600]),
    danger: colorsTuple(palette.danger[600]),
  },
  defaultRadius: "md",
  focusRing: "auto",
  // Pointer cursor on checkboxes, radios, switches and similar controls (global.css covers links and buttons).
  cursorType: "pointer",
  variantColorResolver,
  components: {
    // Links are always underlined so they never rely on color alone.
    Anchor: Anchor.extend({ defaultProps: { underline: "always" } }),
    Card: Card.extend({ defaultProps: { withBorder: true, radius: "md", padding: "lg" } }),
    Title: Title.extend({ classNames: { root: classes.title } }),
  },
});
