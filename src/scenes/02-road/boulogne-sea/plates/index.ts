import { type LightsSpec, lightPlates } from "../paint/lights";
import { type Plate, paintOrder } from "../paint/plate";
import { fleetPlates } from "./fleet";
import { harbourPlates } from "./harbour";
import { heroPlates } from "./heroes";
import { hillsPlates } from "./hills";
import { northPlates } from "./north";
import { skyPlates } from "./sky";
import { southPlates } from "./south";
import { townPlates } from "./town";
import { waterPlates } from "./water";

/**
 * Every plate of the painting, far to near (paint/plate.ts). Each area's
 * module owns its plates (and any files of its own under plates/<area>/);
 * this list only gathers them.
 */
export function buildPlates(): Plate[] {
  const plates = [
    ...skyPlates(),
    ...hillsPlates(),
    ...townPlates(),
    ...northPlates(),
    ...southPlates(),
    ...harbourPlates(),
    ...waterPlates(),
    ...fleetPlates(),
    ...heroPlates(),
  ];
  const lights = plates.flatMap((p) => {
    const spec = LIGHTS[p.id];
    return spec ? lightPlates(p, spec) : [];
  });
  return [...plates, ...lights].sort((a, b) => paintOrder(b) - paintOrder(a));
}

/**
 * The areas whose lights come up at dusk (paint/lights.ts), and when, in
 * the hold's progress: only once the land has lost the sun (it goes from
 * about 0.40 to 0.62). The camps' kitchen fires first; then the windows
 * and doors in two banks each, the right camp (with the lamps and windows
 * of Napoleon's pavilion) before the left, the lower town, the upper town
 * last; the dusk fully lit rests from about 0.92. How many are lit, and
 * how they cluster: the camps by companies and streets with dark gaps
 * between, the town gently; few windows lit in the town at civil dusk,
 * more on the quays and the lower streets than up the slope (the
 * critics of session 29, docs/reviews/boulogne-sea/s29-dusk-lights.md).
 * Each area's painter records its sites in its colour pass.
 */
const CAMP = { amount: 1, salt: 11 } as const;
/** The camps' men's casements and doors: more lit than a house's at this hour (the officers' and the kitchens' have their own, shore/draw.ts). */
const CAMP_LIT = { window: 0.45, door: 0.7 } as const;
const TOWN = { amount: 0.35, salt: 37 } as const;

const LIGHTS: Readonly<Record<string, LightsSpec>> = {
  // The right camp's kitchens are all in its far plate, behind its ground,
  // as their smoke is.
  "north-camp-near": {
    banks: [
      [0.56, 0.8],
      [0.64, 0.88],
    ],
    lit: CAMP_LIT,
    cluster: CAMP,
  },
  "north-camp-far": {
    banks: [
      [0.57, 0.81],
      [0.65, 0.89],
    ],
    fires: [0.5, 0.76],
    lit: CAMP_LIT,
    cluster: CAMP,
  },
  "south-heights": {
    banks: [
      [0.58, 0.82],
      [0.66, 0.9],
    ],
    fires: [0.52, 0.78],
    lit: { window: 0.4, door: 0.65 },
    cluster: { amount: 1, salt: 23 },
  },
  // The pavilion's lamps and windows come up with the right camp's first.
  "north-cliffs": { banks: [[0.56, 0.8]] },
  "lower-town-near": {
    banks: [
      [0.6, 0.84],
      [0.68, 0.92],
    ],
    lit: { window: 0.07 },
    cluster: TOWN,
  },
  "lower-town-far": {
    banks: [
      [0.61, 0.85],
      [0.69, 0.93],
    ],
    lit: { window: 0.055 },
    cluster: TOWN,
  },
  "upper-town": {
    banks: [
      [0.66, 0.9],
      [0.72, 0.95],
    ],
    lit: { window: 0.05 },
    cluster: { amount: 0.35, salt: 41 },
  },
};
