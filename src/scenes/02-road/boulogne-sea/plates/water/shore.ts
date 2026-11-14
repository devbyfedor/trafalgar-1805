import { type EN, SHORE_HIGH, SHORE_LOW } from "../../geo";
import { EYE_H, mixHex, project } from "../../scene";

/**
 * The strand and the water's geometry and tones, in layer units at the
 * hold (y up from the horizon), from geo.ts's shore lines through
 * scene.ts's project(), so they move with the eye.
 *
 * The licence on the strand (for the main session to record): from an eye
 * 6 m up, the bare strand at low water (from the high-water shore some
 * 1350 m ahead to the low-water edge some 380 m ahead) is a band about
 * 11 units deep, too thin to read. It is drawn STRAND_STRETCH times its
 * true depth below the high-water shore, which stays where the land's foot
 * is: the low-water edge comes down to lowWaterY(x). Anything standing at
 * the edge or just off it (the wooden fort, the moored line) stands on
 * lowWaterY(x) to agree with it.
 */
export const STRAND_STRETCH = 1.5;

type Line = readonly (readonly [number, number])[];

let lines: { high: Line; low: Line } | null = null;

function units(line: readonly EN[]): Line {
  return line.map(([e, n]) => project(e, n, 0));
}

function shoreLines(): { high: Line; low: Line } {
  lines ??= { high: units(SHORE_HIGH), low: units(SHORE_LOW) };
  return lines;
}

function yAt(line: Line, x: number): number {
  if (x <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) {
    const [xa, ya] = line[i - 1];
    const [xb, yb] = line[i];
    if (x <= xb) return ya + ((yb - ya) * (x - xa)) / (xb - xa);
  }
  return line[line.length - 1][1];
}

/** The high-water shore (the land's foot), layer units, at x. */
export function highWaterY(x: number): number {
  return yAt(shoreLines().high, x);
}

/** The low-water edge as drawn (the strand stretched), at x. */
export function lowWaterY(x: number): number {
  const h = highWaterY(x);
  return h + STRAND_STRETCH * (yAt(shoreLines().low, x) - h);
}

/** A point of the strand at share u (0: the high-water shore, 1: the low-water edge), at x. */
export function strandY(x: number, u: number): number {
  const h = highWaterY(x);
  return h + u * (lowWaterY(x) - h);
}

/** The distance (metres) of the water seen at height y (below the horizon) at the hold. */
export function distanceAt(y: number): number {
  return (1000 * EYE_H) / Math.max(0.5, -y);
}

/** Interpolates a table of numbers by distance (metres, far first), in 1/distance. */
export function numByDistance(
  table: readonly (readonly [number, number])[],
): (d: number) => number {
  return (d: number) => {
    const v = 1 / d;
    if (v <= 1 / table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [da, a] = table[i - 1];
      const [db, b] = table[i];
      if (v <= 1 / db) return a + ((b - a) * (v - 1 / da)) / (1 / db - 1 / da);
    }
    return table[table.length - 1][1];
  };
}

/** Interpolates a table of tones by distance (metres, far first), in 1/distance. */
function byDistance(
  table: readonly (readonly [number, string])[],
): (d: number) => string {
  return (d: number) => {
    const v = 1 / d;
    if (v <= 1 / table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) {
      const [da, ca] = table[i - 1];
      const [db, cb] = table[i];
      if (v <= 1 / db) return mixHex(ca, cb, (v - 1 / da) / (1 / db - 1 / da));
    }
    return table[table.length - 1][1];
  };
}

/**
 * The water facing east with the sun behind it (docs/history-notes.md,
 * "The painting's light is that of 18:33"): the sea ahead mirrors the cool
 * eastern sky, and the sun's warmth reaches it only far off, from the lit
 * shore and the strand. Far off, where the eye meets it at a grazing
 * angle, it is nearly a mirror of the low sky (pale pearl, warm only at
 * the edge); nearer, it mirrors the higher, bluer sky and less of it, so
 * it deepens to a dark slate blue near the eye (relative luminance about
 * 0.03-0.08: dark under the caption, bottom left; docs/reviews/
 * boulogne-sea/s27-critique-whole.md, finding 3).
 */
export const waterBody = byDistance([
  [420, "#c2b1a5"],
  [300, "#b2a9aa"],
  [200, "#9b9ba6"],
  [130, "#7e899a"],
  [85, "#5c6d80"],
  [62, "#455869"],
  [46, "#364b5e"],
  [33, "#2b4053"],
  [24, "#23374b"],
  [18, "#1f3245"],
]);

/**
 * The light marks: the backs of the wavelets, tilted away from the eye,
 * mirroring the low sky (pearl, warm only far off), their lower edges
 * crisp where the crest hides the rest. Near the eye they stay low, so the
 * caption keeps its contrast.
 */
export const waterLight = byDistance([
  [300, "#ebdccd"],
  [190, "#e3d4cc"],
  [130, "#cdc6cf"],
  [85, "#aab0c2"],
  [60, "#74849c"],
  [45, "#65778f"],
  [30, "#5c6f89"],
  [18, "#4d6079"],
]);

/** The dark marks: the faces of the wavelets, tilted toward the eye, mirroring the higher, bluer sky. */
export const waterDark = byDistance([
  [300, "#8b90a3"],
  [190, "#7b849a"],
  [130, "#606f89"],
  [85, "#465a78"],
  [55, "#2e425c"],
  [35, "#1c2e44"],
  [18, "#142438"],
]);

/**
 * The glassy slicks of the evening's light air: far off a clean mirror of
 * the low sky, brighter than the ruffled water round them; near the eye a
 * smooth lane of the body's own deep tone, the ripples gone from it.
 */
export const waterSlick = byDistance([
  [300, "#e4d7cf"],
  [190, "#d8cfd0"],
  [130, "#bfbdc8"],
  [90, "#97a0b3"],
  [65, "#5d6e85"],
  [48, "#41566b"],
  [30, "#33495e"],
  [18, "#2a3f53"],
]);
