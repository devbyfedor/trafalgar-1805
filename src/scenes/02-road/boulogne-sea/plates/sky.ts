import type { Plate } from "../paint/plate";
import { cloudPlates } from "./sky/clouds";
import {
  groundColourJobs,
  groundInkJobs,
  HATCH_BOX,
  hatchInkJobs,
  SKY_BOX,
} from "./sky/ground";
import { moonPlate } from "./sky/moon";

export { MOON } from "./sky/moon";

/**
 * The evening sky over Boulogne, looking east with the sun low behind the
 * eye (sky/ground.ts): its ground, the engraving's few strokes, the rising
 * full moon (sky/moon.ts), the clouds (sky/clouds.ts). All at an infinite
 * depth, painted far to near in this order (the plates' sort keeps it).
 */
export function skyPlates(): Plate[] {
  return [
    {
      id: "sky",
      depth: Number.POSITIVE_INFINITY,
      box: SKY_BOX,
      group: "sky",
      jobs: (mode) =>
        mode === "colour" ? groundColourJobs() : groundInkJobs(),
      // A smooth ramp and flat paper: half the resolution, a quarter of the memory.
      resolution: { colour: 0.5, ink: 0.5 },
    },
    {
      id: "sky-hatch",
      depth: Number.POSITIVE_INFINITY,
      box: HATCH_BOX,
      group: "sky",
      jobs: (mode) => (mode === "ink" ? hatchInkJobs() : []),
    },
    moonPlate(),
    ...cloudPlates(),
  ];
}
