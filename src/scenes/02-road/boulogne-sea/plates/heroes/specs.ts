import {
  BATEAU,
  CHALOUPE,
  PENICHE,
  PRAME,
} from "@/components/ship/craft/specs";
import type {
  CraftPaint,
  CraftSpec,
  RigPoint,
} from "@/components/ship/craft/types";
import type { Vec } from "@/components/ship/geometry/vec";

/**
 * The flotilla's craft as the painting shows them at anchor in Boulogne's
 * roads on an evening of August 1805: the craft module's four designs
 * (components/ship/craft/specs.ts; their hulls, rails and masts are the
 * chart glyphs' numbers, smallcraft.ts, and stay so), with what the
 * flotilla research says of their look in 1805:
 * - hulls black or very dark tarred brown, matt and weathered, with no
 *   bright strake (none is evidenced);
 * - masts and yards of brown wood, the canvas furled on the yards off-white
 *   weathered to buff;
 * - the tricolour at every stern, as long as the beam at most (about 5.5 m
 *   on a brig), and a long masthead pennant, about 11 m on a brig; at
 *   anchor the ensign flew from a staff at the taffrail, as in Lewis's view
 *   of the line (flotilla-check.md, item 13; the owner's answer of 14
 *   November 2026), not from the gaff's peak, where it flew under way;
 * - the chaloupe's carronades along her sides, in ports in the bulwark.
 */

/**
 * A craft's rig above the deck drawn `k` times as tall: mastheads, tops,
 * yards (their heights and lengths), the stays' ends on the masts, the
 * gaff's throat and length. The hull, the bowsprit and the boom stay.
 */
function taller(spec: CraftSpec, k: number): CraftSpec {
  const deck = spec.hull.deck;
  const up = (y: number) => deck + (y - deck) * k;
  const point = (p: RigPoint): RigPoint =>
    "mast" in p ? { ...p, y: up(p.y) } : p;
  return {
    ...spec,
    masts: spec.masts.map((m) => ({
      ...m,
      ...(m.top === undefined ? {} : { top: up(m.top) }),
      ...(m.head === undefined ? {} : { head: up(m.head) }),
      ...(m.topmastHead === undefined
        ? {}
        : { topmastHead: up(m.topmastHead) }),
      truck: up(m.truck),
      ...(m.yards
        ? {
            yards: m.yards.map((y) => ({
              ...y,
              y: up(y.y),
              length: y.length * k,
            })),
          }
        : {}),
      shroudHead: up(m.shroudHead),
    })),
    stays: spec.stays.map((st) => ({
      ...st,
      from: point(st.from),
      to: point(st.to),
    })),
    ...(spec.gaff
      ? {
          gaff: {
            ...spec.gaff,
            throat: up(spec.gaff.throat),
            length: spec.gaff.length * k,
          },
        }
      : {}),
  };
}

/**
 * A craft drawn with its side `dy` metres lower above the water: the rail,
 * the deck and everything standing on it (the guns, the lowered lug yards,
 * the spars' heels and ends, the hawse, the ensign staff's foot) come down
 * together; the masts' heads stay where they were.
 */
function lowerSides(spec: CraftSpec, dy: number): CraftSpec {
  const h = spec.hull;
  const down = (v: Vec): Vec => [v[0], v[1] - dy];
  const point = (p: RigPoint): RigPoint =>
    "point" in p ? { point: down(p.point) } : p;
  return {
    ...spec,
    hull: {
      ...h,
      rail: [h.rail[0] - dy, h.rail[1] - dy, h.rail[2] - dy],
      deck: h.deck - dy,
      rudder: { ...h.rudder, head: h.rudder.head - dy },
    },
    masts: spec.masts.map((m) => ({ ...m, deck: m.deck - dy })),
    stays: spec.stays.map((st) => ({
      ...st,
      from: point(st.from),
      to: point(st.to),
    })),
    ...(spec.runningBowsprit
      ? {
          runningBowsprit: {
            ...spec.runningBowsprit,
            from: down(spec.runningBowsprit.from),
            to: down(spec.runningBowsprit.to),
          },
        }
      : {}),
    ...(spec.bumkin
      ? {
          bumkin: {
            ...spec.bumkin,
            from: down(spec.bumkin.from),
            to: down(spec.bumkin.to),
          },
        }
      : {}),
    ...(spec.lugs
      ? {
          lugs: spec.lugs.map((l) => ({
            ...l,
            aftY: l.aftY - dy,
            foreY: l.foreY - dy,
          })),
        }
      : {}),
    guns: spec.guns.map((g) => ({ ...g, y: g.y - dy })),
    anchor: { ...spec.anchor, hawse: down(spec.anchor.hawse) },
    ensign: spec.ensign.staff
      ? {
          ...spec.ensign,
          staff: { ...spec.ensign.staff, foot: down(spec.ensign.staff.foot) },
        }
      : spec.ensign,
  };
}

const TARRED: CraftPaint = {
  hull: "#2b2621",
  wale: "#1f1c19",
  band: undefined,
  rail: "#7c6448",
  bottom: "#312b26",
  mast: "#9a7a52",
  spar: "#4f3f30",
  canvas: "#d4c6a6",
  // Standing rigging tarred black, running rigging of plain hemp.
  rope: "#221c18",
  running: "#5f4f3d",
  iron: "#3a3530",
  inside: "#6b5b47",
};

const TARRED_LUGGER: CraftPaint = { ...TARRED, rail: "#86694a" };

export const SEA_CHALOUPE: CraftSpec = {
  ...CHALOUPE,
  id: "chaloupe-sea",
  hull: {
    ...CHALOUPE.hull,
    band: undefined,
    // Carronades on slides, two a side, between the masts and abaft the main.
    ports: {
      xs: [5.4, 14.8],
      sill: 0.16,
      width: 0.5,
      height: 0.38,
      muzzle: 0.24,
    },
  },
  // On its staff at the taffrail, raking aft: the main boom, eased off to
  // one side, overhangs the stern beside it.
  ensign: {
    at: "staff",
    staff: { foot: [-0.6, 1.92], height: 5.4, rake: 8, d: 0.12 },
    fly: 4.4,
    hoist: 2.9,
  },
  pennant: { mast: "main", length: 10.8, hoist: 0.4 },
  boat: { length: 5.2, height: 0.5, gap: 2.2 },
  paint: TARRED,
};

/**
 * The bateau canonnier's side 0.35 m lower than the chart glyph's: 0.9–1.25
 * m above the water with its washboard, as the history has it (0.8–1.2 m;
 * history-notes.md; flotilla-check.md item 9), not 1.25–1.6.
 */
const BATEAU_SIDE_DROP = 0.35;

export const SEA_BATEAU: CraftSpec = lowerSides(
  {
    ...BATEAU,
    id: "bateau-sea",
    // The 24-pounder on its slide in the bow and the field gun on its
    // carriage aft stand high enough to show over the washboard.
    guns: [
      { ...BATEAU.guns[0], y: 1.54 },
      { ...BATEAU.guns[1], y: 1.62 },
    ],
    ensign: {
      ...BATEAU.ensign,
      fly: 3.2,
      hoist: 2.1,
    },
    paint: TARRED_LUGGER,
  },
  BATEAU_SIDE_DROP,
);

export const SEA_PENICHE: CraftSpec = {
  ...PENICHE,
  id: "peniche-sea",
  ensign: { ...PENICHE.ensign, fly: 2.4, hoist: 1.6 },
  paint: TARRED_LUGGER,
};

/**
 * The prame's rig by Steel's rule: the main truck about 34 m above the
 * water, not the glyph's 27.4 (the rule gives 35 from the extreme length,
 * about a metre too high; the Foudroyante model agrees; flotilla-check.md
 * item 11, Low).
 */
const PRAME_RIG = (34 - PRAME.hull.deck) / (27.4 - PRAME.hull.deck);

/** A licence: no 1805 line held a prame; one stands far along the line. */
export const SEA_PRAME: CraftSpec = {
  ...taller(PRAME, PRAME_RIG),
  id: "prame-sea",
  hull: { ...PRAME.hull, band: undefined },
  ensign: {
    at: "staff",
    staff: { foot: [-0.82, 3.3], height: 5.2, rake: 8, d: 0.13 },
    fly: PRAME.ensign.fly,
    hoist: PRAME.ensign.hoist,
  },
  pennant: PRAME.pennant
    ? { ...PRAME.pennant, length: 12, hoist: 0.45 }
    : undefined,
  paint: TARRED,
};

/**
 * Small ports along the bulwark for the sweeps (a chaloupe's) or cut in
 * the washboard for the oars (a bateau's, which the research describes):
 * their first and last centre, x in metres, the step between them, their
 * sill above the deck, width and height. None where a gun's port, a
 * channel or the hawse stands.
 */
export interface RowPorts {
  from: number;
  to: number;
  step: number;
  sill: number;
  width: number;
  height: number;
}

export const ROW_PORTS: Readonly<Record<string, RowPorts>> = {
  [SEA_CHALOUPE.id]: {
    from: 2.2,
    to: 22.2,
    step: 1.15,
    sill: 0.24,
    width: 0.2,
    height: 0.17,
  },
  [SEA_BATEAU.id]: {
    from: 2.4,
    to: 15.6,
    step: 1.05,
    sill: 0.2,
    width: 0.15,
    height: 0.13,
  },
};
