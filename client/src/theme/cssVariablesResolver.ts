import type { CSSVariablesResolver } from "@mantine/core";
import { paletteCssVariables } from "./palette";

/** Theme colors that map to palette roles. Each gets its Mantine variables pointed at role tokens. */
const ROLE_COLORS = {
  brand: {
    solid: "--color-action-bg",
    hover: "--color-action-bg-hover",
    tint: "--color-selected-bg",
    text: "--color-selected-text",
  },
  success: {
    solid: "--color-success",
    hover: "--color-success",
    tint: "--color-success-bg",
    text: "--color-success",
  },
  warning: {
    solid: "--color-warning",
    hover: "--color-warning",
    tint: "--color-warning-bg",
    text: "--color-warning",
  },
  danger: {
    solid: "--color-danger",
    hover: "--color-danger",
    tint: "--color-danger-bg",
    text: "--color-danger",
  },
} as const;

function colorVariables(): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [name, role] of Object.entries(ROLE_COLORS)) {
    const prefix = `--mantine-color-${name}`;
    variables[`${prefix}-filled`] = `var(${role.solid})`;
    variables[`${prefix}-filled-hover`] = `var(${role.hover})`;
    variables[`${prefix}-light`] = `var(${role.tint})`;
    variables[`${prefix}-light-hover`] = `var(${role.tint})`;
    variables[`${prefix}-light-color`] = `var(${role.text})`;
    variables[`${prefix}-outline`] = `var(${role.solid})`;
    variables[`${prefix}-outline-hover`] = `var(${role.tint})`;
    variables[`${prefix}-text`] = `var(${role.text})`;
  }
  return variables;
}

/**
 * Publishes the palette as CSS variables and points Mantine's own variables at the role tokens
 * in tokens.css, so every Mantine component follows the palette in both themes. The role tokens
 * already switch with the color scheme, so light and dark share one mapping.
 */
const roleVariables: Record<string, string> = {
  // Mantine paints Paper, Card, inputs and the AppShell with "body", so it maps to surface.
  // The page canvas is set on <body> in tokens.css.
  "--mantine-color-body": "var(--color-surface)",
  "--mantine-color-text": "var(--color-text-body)",
  "--mantine-color-dimmed": "var(--color-text-secondary)",
  "--mantine-color-anchor": "var(--color-link)",
  "--mantine-color-error": "var(--color-danger)",
  "--mantine-color-placeholder": "var(--color-text-secondary)",
  "--mantine-color-default": "var(--color-surface)",
  "--mantine-color-default-border": "var(--color-border)",
  "--mantine-color-default-color": "var(--color-text-primary)",
  "--mantine-color-disabled-color": "var(--color-text-disabled)",
  "--mantine-primary-color-contrast": "var(--color-action-text)",
  ...colorVariables(),
};

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: paletteCssVariables(),
  light: roleVariables,
  dark: roleVariables,
});
