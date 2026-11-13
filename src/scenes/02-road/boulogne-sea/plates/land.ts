import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The land (legacy port of session 24's six layers: the hills, the town,
 * the heights south of the Liane, the plateau north of the harbour, the
 * harbour, the shore), each to be replaced by its area's own painting.
 */
export function landPlates(): Plate[] {
  const layers = buildLand();
  return layers.map((l) =>
    legacyPlate(
      { id: l.id, depth: l.depth, box: l.box, group: "land" },
      () => l.shapes,
    ),
  );
}
