/**
 * Scene 2's text against the chart, measured (scripts/dev/contrast.mjs:
 * WCAG contrast of each showing text against the bright end of the chart
 * under its line boxes, at every 0.01 of p; docs/decisions.md, "Text
 * contrast over the chart"). Re-measure after moving a camera key.
 *
 * The text is always the page's light ink. Where the chart under it is
 * bright, a soft scrim comes in behind it: a wide darkening that falls away
 * smoothly in every direction, never a plate with an edge, coming and going
 * over a long stretch of scroll (the owner's rule, 9 November 2026).
 */

import type { CSSProperties } from "react";

/** The scrims' colour, the night sea's (as scene 1's scrim). */
const SCRIM_RGB = "11, 17, 23";

/**
 * A soft scrim: even over the text at its heart (to `flat` of its radius),
 * then falling away by a smoothstep over the rest, flat again at its rim,
 * so it has no edge anywhere. Drawn as a radial gradient of many stops.
 */
export function softScrim(
  peak: number,
  ellipse: string,
  at: string,
  flat = 0.25,
  steps = 16,
): string {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.min(1, Math.max(0, (t - flat) / (1 - flat)));
    const a = peak * (1 - x * x * (3 - 2 * x));
    stops.push(`rgba(${SCRIM_RGB}, ${a.toFixed(3)}) ${(t * 100).toFixed(1)}%`);
  }
  return `radial-gradient(ellipse ${ellipse} at ${at}, ${stops.join(", ")})`;
}

/** A band's guard at each end, where it is nothing (a pixel's sampling). */
const GUARD = "2px";

/**
 * A fall's shape from its outer end (t = 0) to the even part (t = 1): a
 * Gaussian of sigma a third of the fall, set to run from exactly nothing to
 * full. Level where it meets the even part, it gives most of its strength
 * away near the text and leaves a long faint tail, so a small scrim reads
 * as a shadow, not a plate with a rim.
 */
function gauss(t: number): number {
  const k = 4.5;
  const floor = Math.exp(-k);
  return (Math.exp(-k * (1 - t) * (1 - t)) - floor) / (1 - floor);
}

/**
 * A mask that rises from nothing to full over `start` from its beginning,
 * holds, and falls away over `end` to its end, each by `gauss`, drawn as a
 * linear gradient of many stops.
 */
function softBand(
  direction: string,
  start: string,
  end: string,
  steps = 16,
): string {
  const rise: string[] = [];
  const set: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = gauss(t).toFixed(4);
    const at = (t * 100).toFixed(2);
    rise.push(
      `rgba(0, 0, 0, ${a}) calc(${GUARD} + (${start} - ${GUARD}) * ${at} / 100)`,
    );
    set.push(
      `rgba(0, 0, 0, ${a}) calc(100% - ${GUARD} - (${end} - ${GUARD}) * ${at} / 100)`,
    );
  }
  return `linear-gradient(${direction}, ${[...rise, ...set.reverse()].join(", ")})`;
}

/** A soft patch's falls: [top, right, bottom, left], as CSS lengths. */
export type Falls = readonly [string, string, string, string];

/**
 * A soft patch: a scrim that hugs a line of text instead of a corner. Even
 * over its box but for its outer falls (each side its own), over which it
 * falls away by a smoothstep; the product of two soft bands, so its corners
 * round off, with no edge anywhere. Set the box round the text so the text
 * sits wholly in the even part.
 */
export function softPatch(peak: number, falls: Falls): CSSProperties {
  const [top, right, bottom, left] = falls;
  return {
    background: `rgba(${SCRIM_RGB}, ${peak})`,
    maskImage: `${softBand("to right", left, right)}, ${softBand("to bottom", top, bottom)}`,
    maskRepeat: "no-repeat",
    maskSize: "100% 100%",
    maskComposite: "intersect",
  };
}

/**
 * A scrim's run over p: [in from, full at, full until, out by], and how
 * strong it is there against the scrim's own peak (1 if left out).
 */
export type ScrimRun =
  | readonly [number, number, number, number]
  | readonly [number, number, number, number, number];

/**
 * Where the card's text would stand on bright ground even with the sea
 * framed under it (the camera passing over land between two framings, or a
 * view that must look north for its names to read), the card's deeper
 * scrim comes in.
 */
export const DEEP_SCRIM: readonly ScrimRun[] = [
  [0.145, 0.162, 0.178, 0.196, 0.7],
  [0.226, 0.242, 0.268, 0.286, 0.7],
  // The whole Atlantic and the West Indies: looked at from the south, as
  // their names must read, South America lies under the card.
  [0.31, 0.333, 0.478, 0.5, 0.7],
  [0.616, 0.631, 0.641, 0.658, 0.7],
  // Coming down into the harbour, the city's peninsula passes under the
  // caption's right half for a moment.
  [0.703, 0.711, 0.718, 0.726],
];

/**
 * The chapter marker's own soft scrim, top left, as light as each view
 * lets it be: its opacity over p (keys, joined by straight lines). Measured
 * in light ink with no scrim the marker reads 1.2-1.5:1 over the brightest
 * haze and land of the daylight views and 2-4:1 over many others; the
 * curve gives each view the least opacity that keeps the marker at 4.7:1 or
 * more at all four of the owner's and the large sizes, taken as the most
 * any view within 0.02 of p needs, so it comes and goes over a stretch of
 * scroll (scripts/dev/chapter-scrim.mjs, chapter-scrim-curve.mjs; the
 * owner's answer of 11 November 2026: lighter in the bright daylight views,
 * never under 4.5:1). Over the sea and at night it needs none.
 */
export const CHAPTER_SCRIM: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.02, 0.46],
  [0.03, 0.54],
  [0.04, 0.71],
  [0.06, 0.82],
  [0.25, 0.87],
  [0.27, 0.86],
  [0.28, 0.75],
  [0.3, 0.76],
  [0.31, 0.88],
  [0.44, 0.87],
  [0.5, 0.89],
  [0.52, 0.69],
  [0.53, 0.69],
  [0.55, 0.88],
  [0.59, 0.89],
  [0.6, 0.88],
  [0.65, 0.89],
  [0.68, 0.83],
  [0.71, 0.88],
  [0.76, 0.88],
  [0.79, 0.84],
  [0.8, 0.84],
  [0.81, 0.81],
  [0.82, 0.65],
  [0.83, 0.38],
  [0.84, 0.14],
  [0.85, 0],
  [0.92, 0],
  [0.93, 0.08],
  [0.94, 0.19],
  [0.95, 0.38],
  [0.96, 0.53],
  [0.97, 0.64],
  [0.98, 0.67],
  [1, 0.68],
];
