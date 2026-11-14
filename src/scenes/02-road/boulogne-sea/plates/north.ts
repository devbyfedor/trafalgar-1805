import { createRng } from "../paint/kit";
import type { Plate } from "../paint/plate";
import { type Contour, campPlate } from "./shore/camp";
import { cliffsPlate } from "./shore/cliffs";
import {
  campDepth,
  edgeAt,
  KITCHENS,
  northLight,
  northUp,
  smoothstep,
} from "./shore/terrain";

/**
 * The painting's area north of the harbour: the cliffs with the beach at
 * their foot, the batteries along their edge, Napoleon's pavilion by the
 * Tour d'Odre's site, and the right camp behind them: its lines of huts
 * gable-on along the contours, in close pairs, the officers' rows behind,
 * the kitchens at its back, overlapping into the thin band of gables and
 * roofs the roads saw over the cliff; fields and hedges beyond it to the
 * skyline (plates/shore/). Three plates by depth, so the cliffs, the near
 * rows and the far ones part a little in the drift and on the dive.
 */

/** The camps' kitchen fires, both camps (plates/shore/terrain.ts), for the smoke canvas. */
export { KITCHENS };

interface TierSpec {
  d: number;
  row?: 0 | 1;
}

/** The camp's share of the ground: from north-east of the Tour d'Odre, inland to its depth there, ending softly. */
function campShare(n: number, d: number): number {
  const start = 380 + d * 0.08;
  const reach = campDepth(n);
  return (
    smoothstep(start, start + 80, n) *
    (1 - smoothstep(reach - 90, reach + 10, d))
  );
}

/**
 * The battalions' blocks along the camp, metres north, with cross
 * streets 25–38 m wide between them: the same for every line, so the
 * streets run through the camp from the brow to its back.
 */
const BLOCKS: readonly (readonly [number, number])[] = (() => {
  const rng = createRng(417);
  const out: [number, number][] = [];
  for (let n = 360; n < 3600; ) {
    const len = 90 + rng() * 80;
    out.push([n, n + len]);
    n += len + 25 + rng() * 13;
  }
  return out;
})();

function street(n: number): boolean {
  return !BLOCKS.some(([a, b]) => n >= a && n <= b);
}

/** The kitchens stand in a line just behind the camp's last rows. */
function kitchenAt(n: number, d: number): boolean {
  const back = campDepth(n) + 35;
  return Math.abs(d - back) < 40 && n > 420;
}

function northContours(tiers: readonly TierSpec[]): () => Contour[] {
  return () =>
    tiers.map((t) => {
      const world: [number, number, number][] = [];
      const ns: number[] = [];
      for (let n = 3600; n >= 20; n -= 12) {
        const [e] = edgeAt(n);
        world.push([e + t.d, n, northUp(n, t.d)]);
        ns.push(n);
      }
      return {
        world,
        row: t.row,
        camp: (_e: number, n: number) => campShare(n, t.d),
        street: (_e: number, n: number) => street(n),
        kitchen:
          t.row === 0
            ? (_e: number, n: number) => kitchenAt(n, t.d)
            : undefined,
        light: (i: number) => northLight(ns[i], t.d),
      };
    });
}

/**
 * The near tiers, far to near: the men's rows in close pairs along the
 * contours, an officers' row behind every few, the ground between them.
 */
const NEAR: readonly TierSpec[] = [
  { d: 660 },
  { d: 576, row: 0 },
  { d: 560, row: 0 },
  { d: 515, row: 1 },
  { d: 466, row: 0 },
  { d: 450, row: 0 },
  { d: 366, row: 0 },
  { d: 350, row: 0 },
  { d: 300, row: 1 },
  { d: 256, row: 0 },
  { d: 240, row: 0 },
  { d: 156, row: 0 },
  { d: 140, row: 0 },
  { d: 76, row: 0 },
  { d: 60, row: 0 },
  { d: 30 },
  { d: 0 },
];

/** The far tiers: the camp's last rows toward La Crèche and its kitchens, then fields to the crest. */
const FAR: readonly TierSpec[] = [
  { d: 2000 },
  { d: 1800 },
  { d: 1620 },
  { d: 1460 },
  { d: 1320 },
  { d: 1200 },
  { d: 1120 },
  { d: 1056, row: 0 },
  { d: 1040, row: 0 },
  { d: 995, row: 1 },
  { d: 946, row: 0 },
  { d: 930, row: 0 },
  { d: 846, row: 0 },
  { d: 830, row: 0 },
  { d: 775, row: 1 },
  { d: 736, row: 0 },
  { d: 720, row: 0 },
  { d: 680 },
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
      // Post mills on the fields beyond the camp, each painted after the
      // tier behind it, so the ground in front hides its foot.
      mills: () =>
        (
          [
            [700, 1390, 0.3, 3],
            [1180, 1530, 0.9, 2],
            [1900, 1710, 0.5, 1],
          ] as const
        ).map(([n, d, turn, after]) => {
          const [e] = edgeAt(n);
          return [e + d, n, northUp(n, d) - 0.5, turn, after] as const;
        }),
    }),
  ];
}
