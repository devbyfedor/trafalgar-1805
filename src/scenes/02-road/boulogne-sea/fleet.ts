import {
  buildCraft,
  type CraftKind,
  type CraftSilhouette,
} from "@/components/ship/geometry/smallcraft";
import { createRng } from "@/lib/random";
import { aerial, EYE_H, mixHex, PALETTE } from "./scene";

/**
 * The flotilla in the roads: craft moored in lines across the road off the
 * piers (history notes: lines of gun craft moored outside the pier, as in
 * 1804), seen from among them. The far craft are the chart's own drawings
 * of each type (components/ship/geometry/smallcraft.ts, the glyphs' art),
 * at their true size for their distance, coloured by it; the nearest are
 * the heroes (heroes.ts).
 *
 * Places are metres ahead of the eye and across the view (right +), not
 * geography: the line runs across the view, a little oblique, as the
 * moored line ran across the road.
 */

export interface MooredCraft {
  kind: CraftKind;
  art: CraftSilhouette;
  /** Metres ahead of the eye and to the right of the axis. */
  ahead: number;
  right: number;
  /** Bow to the right (true) or mirrored. */
  bowRight: boolean;
  hull: string;
  spar: string;
}

export interface FleetLayer {
  id: string;
  depth: number;
  craft: MooredCraft[];
}

const ART = new Map<CraftKind, CraftSilhouette>();
function art(kind: CraftKind): CraftSilhouette {
  let a = ART.get(kind);
  if (!a) {
    a = buildCraft(kind, false);
    ART.set(kind, a);
  }
  return a;
}

/**
 * Two lines of craft at anchor across the road: an inner line of luggers
 * (bateaux and péniches) nearer the piers and an outer one of prames and
 * chaloupes, as the chart has them (boulogne.ts), here seen from inside
 * the outer line.
 */
export function buildFleet(): FleetLayer[] {
  const rng = createRng(81);
  const line = (
    id: string,
    depth: number,
    ahead: number,
    kinds: readonly CraftKind[],
    count: number,
    spread: number,
  ): FleetLayer => {
    const craft: MooredCraft[] = [];
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const across = -spread + (2 * spread * (i + 0.2 + rng() * 0.6)) / count;
      const a = ahead + across * 0.08 + (rng() - 0.5) * 40;
      const tint = mixHex(PALETTE.craft.hullNear, PALETTE.craft.hullFar, 0.35);
      craft.push({
        kind,
        art: art(kind),
        ahead: a,
        right: across,
        bowRight: true,
        hull: aerial(tint, a),
        spar: aerial(
          mixHex(PALETTE.craft.sparNear, PALETTE.craft.sparFar, 0.4),
          a,
        ),
      });
    }
    return { id, depth, craft };
  };
  return [
    line("line-far", 820, 820, ["bateau", "peniche", "bateau"], 16, 760),
    line("line-near", 470, 470, ["chaloupe", "prame", "chaloupe"], 9, 420),
  ];
}

/** A craft's placement in layer units: its waterline's middle and metres to units. */
export function placeCraft(c: MooredCraft): {
  x: number;
  y: number;
  scale: number;
} {
  return {
    x: (1000 * c.right) / c.ahead,
    y: (-1000 * EYE_H) / c.ahead,
    scale: 1000 / c.ahead,
  };
}
