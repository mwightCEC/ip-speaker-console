// Mantine's PostCSS setup: enables mixins such as `@mixin dark` and `@mixin smaller-than $mantine-breakpoint-sm`
// in CSS Modules. The breakpoints match Mantine's defaults.
export default {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
