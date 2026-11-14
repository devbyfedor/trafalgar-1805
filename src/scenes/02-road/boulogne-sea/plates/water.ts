import type { Plate } from "../paint/plate";
import type { WaterStrip } from "../water";
import { strandPlates } from "./water/strand";
import { swellPlates } from "./water/swell";

export { highWaterY, lowWaterY, STRAND_STRETCH, strandY } from "./water/shore";

/**
 * The water and the strand at low water (water/strand.ts): the deep
 * backdrop under all of it, the wet strand from the land's foot to the
 * low-water edge with the shallow water off it, and the swell's strips
 * from the edge in to the eye (water/swell.ts), which move as the swell
 * (plate.swell).
 */
export function waterPlates(): Plate[] {
  return [...strandPlates(), ...swellPlates()];
}

/**
 * Session 24's SVG strips of swell (../water.ts): replaced by the swell's
 * own plates, so none.
 */
export function legacyStrips(): WaterStrip[] {
  return [];
}
