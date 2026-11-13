import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The painting's area: the hills inland: Mont Lambert and the Boulonnais behind the town. Legacy port of session 24's layer(s)
 * ("hills"), to be painted anew.
 */
const IDS: readonly string[] = ["hills"];

export function hillsPlates(): Plate[] {
  return buildLand()
    .filter((l) => IDS.includes(l.id))
    .map((l) =>
      legacyPlate(
        { id: l.id, depth: l.depth, box: l.box, group: "land" },
        () => l.shapes,
      ),
    );
}
