/**
 * Raw color values from "Color Palette Handoff.md". This is the only file that contains palette
 * hex values. They're published as CSS variables (--blue-500, --dark-surface, …) by
 * cssVariablesResolver; components use the role tokens in tokens.css, never these directly.
 */
export const palette = {
  blue: {
    50: "#eaf4fb",
    300: "#6fb3de",
    500: "#127ec0",
    600: "#0f6ca6",
    700: "#0b5a8c",
  },
  gray: {
    0: "#ffffff",
    50: "#f5f7f9",
    100: "#ebeef2",
    200: "#d9dee5",
    400: "#9aa3ae",
    500: "#6b7480",
    700: "#3d4550",
    900: "#1c2129",
  },
  success: { 600: "#1e7f37" },
  warning: { 600: "#a35f00" },
  danger: { 600: "#c62828" },
  /** Dark-theme role values from the handoff's "Role tokens: light and dark" table. */
  dark: {
    canvas: "#12171d",
    surface: "#1b222b",
    border: "#2f3a47",
    "text-primary": "#e6eaef",
    "text-secondary": "#a3adb9",
    action: "#5aaee3",
    link: "#8fcbf0",
    success: "#4cc27a",
    warning: "#f2b84b",
    danger: "#f2766b",
  },
} as const;

/** Flattens the palette into CSS variables: palette.blue[500] becomes --blue-500. */
export function paletteCssVariables(): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [family, steps] of Object.entries(palette)) {
    for (const [step, value] of Object.entries(steps)) {
      variables[`--${family}-${step}`] = value;
    }
  }
  return variables;
}
