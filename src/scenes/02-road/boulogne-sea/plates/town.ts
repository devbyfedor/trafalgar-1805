import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The painting's area: the town: the upper town on its hill and the lower town. Legacy port of session 24's layer(s)
 * ("town"), to be painted anew.
 */
const IDS: readonly string[] = ["town"];

export function townPlates(): Plate[] {
  return buildLand()
    .filter((l) => IDS.includes(l.id))
    .map((l) =>
      legacyPlate(
        { id: l.id, depth: l.depth, box: l.box, group: "land" },
        () => l.shapes,
      ),
    );
}
