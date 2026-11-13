import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The painting's area: north of the harbour: the cliffs, the plateau and the right camp, Napoleon's pavilion. Legacy port of session 24's layer(s)
 * ("plateau-north", "shore"), to be painted anew.
 */
const IDS: readonly string[] = ["plateau-north", "shore"];

export function northPlates(): Plate[] {
  return buildLand()
    .filter((l) => IDS.includes(l.id))
    .map((l) =>
      legacyPlate(
        { id: l.id, depth: l.depth, box: l.box, group: "land" },
        () => l.shapes,
      ),
    );
}
