/**
 * Ready-made class strings for the Stitch type scale. The custom `text-*`
 * utilities (defined in globals.css) only carry size + line-height — weight
 * and letter-spacing (per academic_precision/DESIGN.md) are applied here
 * explicitly rather than relying on Tailwind v4 font-size "companion"
 * variables, which don't cover weight/tracking.
 */
export const typography = {
  displayLg: "text-display-lg font-bold tracking-tight",
  displaySm: "text-display-sm font-bold tracking-tight",
  headlineLg: "text-headline-lg font-semibold tracking-tight",
  headlineMd: "text-headline-md font-semibold",
  headlineSm: "text-headline-sm font-semibold",
  titleLg: "text-title-lg font-semibold",
  bodyLg: "text-body-lg font-normal",
  bodyMd: "text-body-md font-normal",
  labelMd: "text-label-md font-medium tracking-wide",
  labelSm: "text-label-sm font-semibold",
} as const;
