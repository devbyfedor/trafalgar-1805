import { OUTREAU } from "../geo";
import type { Plate } from "../paint/plate";
import { VEX } from "../scene";
import { type Contour, campPlate } from "./shore/camp";
import { dunesPlate } from "./shore/dunes";
import { browLine, escarpment, smoothstep } from "./shore/terrain";

/**
 * The painting's area south of the Liane: the beach and the dunes with
 * marram, Châtillon's hill with its battery, and the Outreau heights with
 * the left camp along their brow, sitting on the skyline; the plateau's
 * top hidden behind its own edge (plates/shore/).
 */

/** The sun's direction over the ground, [east, north]: azimuth 294. */
const SUN: readonly [number, number] = [
  Math.sin((294 * Math.PI) / 180),
  Math.cos((294 * Math.PI) / 180),
];

/** The left camp along the brow, from above the harbour south-west. */
function campShare(_e: number, n: number): number {
  return smoothstep(-640, -780, n) * (1 - smoothstep(-2300, -2500, n));
}

/** A line behind the brow (on the plateau), `dist` metres back, rising to the plateau's height. */
function behind(dist: number): [number, number, number][] {
  const brow = browLine();
  const out: [number, number, number][] = [];
  for (let i = 0; i < brow.length; i++) {
    const a = brow[Math.max(0, i - 1)];
    const b = brow[Math.min(brow.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const te = (b[0] - a[0]) / len;
    const tn = (b[1] - a[1]) / len;
    // Back from the slope: the plateau's side (east-south-east).
    const [e, n, h] = brow[i];
    const rise = (OUTREAU.plateau - OUTREAU.brow) * smoothstep(0, 280, dist);
    out.push([e - tn * dist, n + te * dist, h + rise]);
  }
  return out;
}

/** How square a contour's ground faces the low sun, sample by sample (the escarpment falls to the north-west). */
function lightOf(
  line: readonly (readonly [number, number, number])[],
  slope: boolean,
): (i: number) => number {
  return (i) => {
    if (!slope) return 0.7;
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ne = (b[1] - a[1]) / len;
    const nn = -(b[0] - a[0]) / len;
    return Math.min(1, Math.max(0, 0.3 + 0.7 * (ne * SUN[0] + nn * SUN[1])));
  };
}

interface Spec {
  /** Metres behind the brow, on the plateau. */
  back?: number;
  /** The share of the way down the escarpment. */
  f?: number;
  row?: 0 | 1 | 2;
}

/** Far to near: the plateau behind the brow with the camp's rows, the brow, the escarpment down to the flats. */
const TIERS: readonly Spec[] = [
  { back: 340 },
  { back: 270 },
  { back: 200, row: 1 },
  { back: 140, row: 0 },
  { back: 85, row: 0 },
  { back: 30, row: 0 },
  { f: 0 },
  { f: 0.05, row: 0 },
  { f: 0.12 },
  { f: 0.22 },
  { f: 0.34 },
  { f: 0.48 },
  { f: 0.64 },
  { f: 0.8 },
  { f: 1 },
];

function southContours(): Contour[] {
  const brow = browLine();
  return TIERS.map((t) => {
    const line =
      t.back !== undefined ? behind(t.back) : escarpment(brow, t.f ?? 0);
    const world = line.map(
      ([e, n, h]) => [e, n, h * VEX] as [number, number, number],
    );
    return {
      world,
      row: t.row,
      camp: campShare,
      light: lightOf(line, t.back === undefined),
    };
  });
}

export function southPlates(): Plate[] {
  return [
    campPlate({
      id: "south-heights",
      depth: 2000,
      box: [-20, 905, 0, 98],
      seed: 501,
      contours: southContours,
      count: TIERS.length,
      mills: () => {
        const line = behind(150);
        const p = line[Math.floor(line.length * 0.62)];
        return [[p[0], p[1], p[2] * VEX - 1, 0.6]];
      },
    }),
    dunesPlate({ id: "south-dunes", depth: 1450, box: [-100, 905, -8, 78] }),
  ];
}
