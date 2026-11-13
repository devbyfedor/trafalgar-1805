import {
  BATEAU,
  CHALOUPE,
  PENICHE,
  PRAME,
} from "@/components/ship/craft/specs";
import type { CraftPaint, CraftSpec } from "@/components/ship/craft/types";

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
 *   on a brig), and a long masthead pennant, about 11 m on a brig;
 * - the chaloupe's carronades along her sides, in ports in the bulwark.
 */

const TARRED: CraftPaint = {
  hull: "#2d2925",
  wale: "#25221f",
  band: undefined,
  rail: "#7c6448",
  bottom: "#332e29",
  mast: "#9a7a52",
  spar: "#5a4836",
  canvas: "#d4c6a6",
  rope: "#3a3029",
  running: "#6e5d49",
  iron: "#33312e",
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
  ensign: { ...CHALOUPE.ensign, fly: 4.4, hoist: 2.9 },
  pennant: { mast: "main", length: 10.8, hoist: 0.4 },
  boat: { length: 5.2, height: 0.5, gap: 2.2 },
  paint: TARRED,
};

export const SEA_BATEAU: CraftSpec = {
  ...BATEAU,
  id: "bateau-sea",
  ensign: {
    ...BATEAU.ensign,
    fly: 3.2,
    hoist: 2.1,
  },
  paint: TARRED_LUGGER,
};

export const SEA_PENICHE: CraftSpec = {
  ...PENICHE,
  id: "peniche-sea",
  ensign: { ...PENICHE.ensign, fly: 2.4, hoist: 1.6 },
  paint: TARRED_LUGGER,
};

/** A licence: no 1805 line held a prame; one stands far along the line. */
export const SEA_PRAME: CraftSpec = {
  ...PRAME,
  id: "prame-sea",
  hull: { ...PRAME.hull, band: undefined },
  pennant: PRAME.pennant
    ? { ...PRAME.pennant, length: 12, hoist: 0.45 }
    : undefined,
  paint: TARRED,
};
