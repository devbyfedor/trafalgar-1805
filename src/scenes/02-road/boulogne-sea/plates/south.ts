import type { Plate } from "../paint/plate";
import { VEX } from "../scene";
import { type Contour, campPlate } from "./shore/camp";
import { dunesPlate } from "./shore/dunes";
import { behind, browLine, escarpment, smoothstep } from "./shore/terrain";

/**
 * The painting's area south of the Liane: the beach and the dunes with
 * marram, Châtillon's hill with its battery, and the Outreau heights with
 * the left camp along their brow: one line of huts gable-on just behind
 * the convex brow, their feet sunk behind it, and a second line's roofs
 * barely showing; the plateau's top hidden behind its own edge
 * (history-notes, "What the roads see"; plates/shore/).
 */

/** The sun's direction over the ground, [east, north]: azimuth 294. */
const SUN: readonly [number, number] = [
  Math.sin((294 * Math.PI) / 180),
  Math.cos((294 * Math.PI) / 180),
];

/**
 * The left camp along the brow, from above the harbour south-west: thin
 * where the brow falls toward the Liane, gaps between its battalions'
 * blocks of lines.
 */
function campShare(_e: number, n: number): number {
  const ends = smoothstep(-700, -900, n) * (1 - smoothstep(-2250, -2450, n));
  // Gaps between the blocks: a few hundred metres of camp, then fields.
  const blocks = Math.sin((n + 140) / 105) + 0.55 * Math.sin((n - 60) / 47);
  return ends * smoothstep(-0.75, -0.2, blocks);
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
  row?: 0 | 1;
}

/** Far to near: the plateau behind the brow with the camp's rows, the brow, the escarpment down to the flats. */
const TIERS: readonly Spec[] = [
  { back: 340 },
  { back: 200 },
  { back: 78, row: 0 },
  { back: 24, row: 0 },
  { f: 0 },
  { f: 0.05 },
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
    // The brow a little convex: its lip stands over the ground just
    // behind it, so the huts there sink behind it to their eaves.
    const lip = t.f === 0 ? 0.8 : t.f === 0.05 ? 0.3 : 0;
    const world = line.map(
      ([e, n, h]) => [e, n, h * VEX + lip] as [number, number, number],
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
      // A post mill on the brow in a gap between the camp's blocks, its
      // foot behind the brow's own lip.
      mills: () => {
        const line = behind(40);
        let best = Math.floor(line.length * 0.62);
        for (let i = Math.floor(line.length * 0.5); i < line.length * 0.75; i++)
          if (
            campShare(line[i][0], line[i][1]) <
            campShare(line[best][0], line[best][1])
          )
            best = i;
        const p = line[best];
        return [[p[0], p[1], p[2] * VEX - 0.6, 0.6, 2]];
      },
    }),
    dunesPlate({ id: "south-dunes", depth: 1450, box: [-100, 905, -8, 78] }),
  ];
}
