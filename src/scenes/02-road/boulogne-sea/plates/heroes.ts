import { buildFleet, type MooredCraft, placeCraft } from "../fleet";
import type { Plate } from "../paint/plate";
import { PALETTE } from "../scene";
import { drawCraft } from "./fleet";

/**
 * The nearest craft, large in the foreground, rocking at anchor (legacy
 * port: the chart's silhouettes, large; the hero art replaces them).
 */
const HEROES = [
  {
    id: "hero-prame",
    kind: "prame" as const,
    ahead: 150,
    right: -36,
    roll: 0.55,
    heave: 0.18,
    period: 7.9,
    phase: 1.3,
  },
  {
    id: "hero-chaloupe",
    kind: "chaloupe" as const,
    ahead: 76,
    right: 26,
    roll: 0.8,
    heave: 0.22,
    period: 6.3,
    phase: 0,
  },
];

export function heroPlates(): Plate[] {
  const art = Object.fromEntries(
    buildFleet()
      .flatMap((l) => l.craft)
      .map((c) => [c.kind, c.art]),
  ) as Record<MooredCraft["kind"], MooredCraft["art"]>;
  return HEROES.map((h): Plate => {
    const m: MooredCraft = {
      kind: h.kind,
      art: art[h.kind],
      ahead: h.ahead,
      right: h.right,
      bowRight: true,
      hull: PALETTE.craft.hullNear,
      spar: PALETTE.craft.sparNear,
    };
    const { x, y, scale } = placeCraft(m);
    const half = 30 * scale;
    return {
      id: h.id,
      depth: h.ahead,
      box: [x - half, x + half, y - 4 * scale, y + 34 * scale],
      group: "craft",
      jobs: () => [(c) => drawCraft(c, m, true)],
      rock: {
        pivot: [x, y],
        roll: h.roll,
        heave: h.heave,
        period: h.period,
        phase: h.phase,
      },
    };
  });
}
