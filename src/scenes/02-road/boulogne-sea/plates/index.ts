import type { Plate } from "../paint/plate";
import { fleetPlates } from "./fleet";
import { heroPlates } from "./heroes";
import { landPlates } from "./land";
import { skyPlates } from "./sky";
import { waterPlates } from "./water";

/**
 * Every plate of the painting, far to near (paint/plate.ts). Each area's
 * module owns its plates; this list only gathers them.
 */
export function buildPlates(): Plate[] {
  return [
    ...skyPlates(),
    ...landPlates(),
    ...waterPlates(),
    ...fleetPlates(),
    ...heroPlates(),
  ].sort((a, b) => b.depth - a.depth);
}
