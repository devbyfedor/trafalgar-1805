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
 * The water facing east with the sun behind: far off it mirrors the lit
 * shore and the warm low sky (pale, warm), cooling to a deep blue-green
 * near the eye (dark under the caption, bottom left).
 */
export const waterBody = byDistance([
  [420, "#b9a794"],
  [300, "#a79f99"],
  [200, "#8f9196"],
  [130, "#6f818c"],
  [85, "#4e6371"],
  [60, "#3f5564"],
  [40, "#2f4856"],
  [28, "#273f4c"],
  [18, "#1f3541"],
]);

/** The faces of the waves turned to the sun: warm, golden, subdued near. */
export const waterCrest = byDistance([
  [420, "#edd6aa"],
  [250, "#e0c49a"],
  [150, "#cdaf84"],
  [90, "#b39672"],
  [55, "#957e64"],
  [30, "#7c6c5a"],
  [18, "#6a5e51"],
]);

/** The troughs, keeping the sky's blue, deeper near. */
export const waterTrough = byDistance([
  [420, "#9f9aa0"],
  [200, "#7b8592"],
  [120, "#5c6f7e"],
  [60, "#304757"],
  [30, "#1d3140"],
  [18, "#172a37"],
]);
