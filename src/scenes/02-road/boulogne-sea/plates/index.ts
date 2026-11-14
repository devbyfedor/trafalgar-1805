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
 * the hold's progress: the camps' kitchen fires first, as the land loses
 * the sun; then the windows and doors in two banks each, the near camp
 * before the town; the lamps round Napoleon's pavilion among the first.
 * Each area's painter records its sites in its colour pass.
 */
const LIGHTS: Readonly<Record<string, LightsSpec>> = {
  "north-camp-near": {
    banks: [
      [0.48, 0.7],
      [0.58, 0.82],
    ],
    fires: [0.4, 0.66],
  },
  "north-camp-far": {
    banks: [
      [0.5, 0.72],
      [0.6, 0.84],
    ],
    fires: [0.42, 0.68],
  },
  "south-heights": {
    banks: [
      [0.5, 0.72],
      [0.6, 0.84],
    ],
    fires: [0.42, 0.68],
  },
  "north-cliffs": { banks: [[0.46, 0.66]] },
  "lower-town-near": {
    banks: [
      [0.52, 0.74],
      [0.6, 0.84],
    ],
  },
  "lower-town-far": {
    banks: [
      [0.54, 0.76],
      [0.62, 0.86],
    ],
  },
  "upper-town": {
    banks: [
      [0.56, 0.78],
      [0.64, 0.88],
    ],
  },
};
