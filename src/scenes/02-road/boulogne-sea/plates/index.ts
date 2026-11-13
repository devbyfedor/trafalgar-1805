import type { Plate } from "../paint/plate";
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
  return [
    ...skyPlates(),
    ...hillsPlates(),
    ...townPlates(),
    ...northPlates(),
    ...southPlates(),
    ...harbourPlates(),
    ...waterPlates(),
    ...fleetPlates(),
    ...heroPlates(),
  ].sort((a, b) => b.depth - a.depth);
}
