/**
 * Scene 2's text against the chart, measured (scripts/dev/contrast.mjs:
 * WCAG contrast of each showing text against the bright end of the chart
 * under its line boxes, at every 0.01 of p; docs/decisions.md, "Text
 * contrast over the chart"). Re-measure after moving a camera key.
 */

/**
 * The marker's dark ink: a printer's black, as the plates were printed
 * (the chart's own coast ink, #2a221c, reaches only 3.7-4.4:1 over the
 * mid-tones of the far haze).
 */
export const CHART_INK = "#100d0b";
/** The site's text colour (globals.css, --color-ink). */
export const PAGE_INK = "#f3ead8";

/**
 * The chapter marker's ink follows the ground under it, as the chart's own
 * lettering does: the chart's dark ink over the bright far haze and land of
 * the daylight views, the page's light text over the sea and at night. Runs
 * of p, each change crossfading over a few hundred pixels of scroll.
 */
export const CHAPTER_INK: readonly { from: number; dark: boolean }[] = [
  { from: 0.05, dark: true },
  { from: 0.278, dark: false },
  { from: 0.318, dark: true },
  { from: 0.488, dark: false },
  { from: 0.508, dark: true },
  { from: 0.808, dark: false },
  { from: 0.958, dark: true },
];

/** How long a change of the marker's ink takes, in p. */
export const CHAPTER_INK_FADE = 0.004;

/**
 * Where the card's text would stand on bright ground even with the sea
 * framed under it (the camera passing over land between two framings, or
 * a view that must look north for its names to read), a deeper scrim
 * comes in: [in from, full at, full until, out by].
 */
export const DEEP_SCRIM: readonly (readonly [
  number,
  number,
  number,
  number,
])[] = [
  [0.155, 0.162, 0.178, 0.186],
  [0.236, 0.242, 0.268, 0.276],
  // The whole Atlantic and the West Indies: looked at from the south, as
  // their names must read, South America lies under the card.
  [0.326, 0.333, 0.478, 0.486],
  [0.626, 0.631, 0.641, 0.648],
];
