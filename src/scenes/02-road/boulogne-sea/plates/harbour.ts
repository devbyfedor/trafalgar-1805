import { buildLand } from "../land";
import type { Plate } from "../paint/plate";
import { legacyPlate } from "./legacy";

/**
 * The painting's area: the harbour: the jetties, the pierhead battery and its light, the wooden fort, the forest of masts. Legacy port of session 24's layer(s)
 * ("harbour"), to be painted anew.
 */
const IDS: readonly string[] = ["harbour"];

export function harbourPlates(): Plate[] {
  return buildLand()
    .filter((l) => IDS.includes(l.id))
    .map((l) =>
      legacyPlate(
        { id: l.id, depth: l.depth, box: l.box, group: "land" },
        () => l.shapes,
      ),
    );
}
