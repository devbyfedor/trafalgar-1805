import type { Plate } from "../paint/plate";
import { type Contour, campPlate } from "./shore/camp";
import { cliffsPlate } from "./shore/cliffs";
import { edgeAt, KITCHENS, northUp, smoothstep } from "./shore/terrain";

/**
 * The painting's area north of the harbour: the cliffs with the beach at
 * their foot, the batteries along their edge, Napoleon's pavilion by the
 * Tour d'Odre's site, and the right camp's tiers of huts climbing the
 * seaward slope behind them to the crest (plates/shore/). Three plates by
 * depth, so the cliffs, the near tiers and the far ones part a little in
 * the drift and on the dive.
 */

/** The camps' kitchen fires, both camps (plates/shore/terrain.ts), for the smoke canvas. */
export { KITCHENS };

interface TierSpec {
  d: number;
  row?: 0 | 1 | 2;
}

/** The camp's south end, metres north, by metres inland: it begins north-east of the Tour d'Odre. */
function campShare(n: number, d: number): number {
  const start = 360 + d * 0.1;
  return smoothstep(start, start + 90, n);
}

function northContours(tiers: readonly TierSpec[]): () => Contour[] {
  return () =>
    tiers.map((t) => {
      const world: [number, number, number][] = [];
      for (let n = 3600; n >= 20; n -= 12) {
        const [e] = edgeAt(n);
        world.push([e + t.d, n, northUp(n, t.d)]);
      }
      return {
        world,
        row: t.row,
        camp: (_e: number, n: number) => campShare(n, t.d),
      };
    });
}

/**
 * The near tiers, far to near: each row of huts its own tier along the
 * contour, the officers' row behind each three of the men's, the ground
 * between them showing (the camp seen from the roads as dotted lines
 * along the contours).
 */
const NEAR: readonly TierSpec[] = [
  { d: 640 },
  { d: 590, row: 0 },
  { d: 480 },
  { d: 380, row: 1 },
  { d: 300 },
  { d: 245, row: 0 },
  { d: 195 },
  { d: 150, row: 0 },
  { d: 115 },
  { d: 80, row: 0 },
  { d: 40 },
  { d: 0 },
];

/** The far tiers up to the crest, the kitchens at the camp's back, landward edge. */
const FAR: readonly TierSpec[] = [
  { d: 2000 },
  { d: 1820 },
  { d: 1680 },
  { d: 1575, row: 2 },
  { d: 1480 },
  { d: 1380, row: 0 },
  { d: 1270 },
  { d: 1170, row: 0 },
  { d: 1100 },
  { d: 1030, row: 1 },
  { d: 965 },
  { d: 900, row: 0 },
  { d: 810 },
  { d: 730, row: 0 },
  { d: 660 },
  { d: 600 },
];

export function northPlates(): Plate[] {
  return [
    cliffsPlate({
      id: "north-cliffs",
      depth: 1350,
      box: [-902, -148, -8, 122],
    }),
    campPlate({
      id: "north-camp-near",
      depth: 1650,
      box: [-899, -150, 0, 128],
      seed: 401,
      contours: northContours(NEAR),
      count: NEAR.length,
    }),
    campPlate({
      id: "north-camp-far",
      depth: 2400,
      box: [-896, -170, 0, 160],
      seed: 451,
      contours: northContours(FAR),
      count: FAR.length,
      mills: () =>
        (
          [
            [760, 1730, 0.3],
            [1560, 1760, 0.9],
            [2350, 1700, 0.5],
          ] as const
        ).map(([n, d, turn]) => {
          const [e] = edgeAt(n);
          return [e + d, n, northUp(n, d) - 1, turn] as const;
        }),
    }),
  ];
}
