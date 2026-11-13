import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The painting's area: south of the Liane: the dunes, Outreau and the left camp, the coast toward Le Portel. Legacy port of session 24's layer(s)
 * ("heights-south"), to be painted anew.
 */
const IDS: readonly string[] = ["heights-south"];

export function southPlates(): Plate[] {
  return buildLand()
    .filter((l) => IDS.includes(l.id))
    .map((l) =>
      legacyPlate(
        { id: l.id, depth: l.depth, box: l.box, group: "land" },
        () => l.shapes,
      ),
    );
}
