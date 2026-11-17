import { defaultVariantColorsResolver, type VariantColorsResolver } from "@mantine/core";

/** Text color for filled controls of each role color. Dark mode fills are light, so they need dark text. */
const FILLED_TEXT: Record<string, string> = {
  brand: "var(--color-action-text)",
  success: "var(--color-on-status)",
  warning: "var(--color-on-status)",
  danger: "var(--color-on-status)",
};

/**
 * Mantine's default resolver always puts white text on filled controls. That fails contrast
 * against the light dark-mode fills, so filled role colors use the palette's paired text color.
 */
export const variantColorResolver: VariantColorsResolver = (input) => {
  const colors = defaultVariantColorsResolver(input);
  const colorName = input.color ?? input.theme.primaryColor;
  const filledText = FILLED_TEXT[colorName];

  if (input.variant === "filled" && filledText) {
    return { ...colors, color: filledText };
  }
  return colors;
};
