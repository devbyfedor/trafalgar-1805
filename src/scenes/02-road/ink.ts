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
 * Where the chapter marker, top left, would stand on the bright far haze or
 * land of the daylight views, its own soft scrim comes in: measured in
 * light ink with no scrim, it read 1.2-3.5:1 from the handoff to the night
 * (0.82; a few short stretches over the sea passed, too short to let the
 * scrim go) and again from the dawn's brightening (0.955).
 */
export const CHAPTER_SCRIM: readonly ScrimRun[] = [
  [0, 0.02, 0.815, 0.835],
  [0.935, 0.952, 1, 1],
];
