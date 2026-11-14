import type { CraftPaint, CraftSpec, CraftType } from "./types";

/**
 * The four gun craft of the invasion flotilla at Boulogne, August 1805, at
 * anchor in the roads. The designs of 1803 (Desbrière, Projets III, p. 90
 * and its plates; James III, pp. 216–217; docs/history-notes.md, "Scene 2:
 * Boulogne from the sea (beat 1)", "The flotilla in the roads and in the
 * harbour", and docs/research/scene-02/boulogne-sea/flotilla.md):
 *
 * - the prame: 110 × 25 × 8 French feet (about 36 × 8 × 2.6 m), three
 *   masts, ship-rigged ("gréement de corvette"), twelve 24-pounders;
 * - the chaloupe canonnière: a brig of 76–80 feet, three 24-pounders and a
 *   howitzer or mortar;
 * - the bateau canonnier: a lugger of 60 × 14 feet, a 24-pounder forward
 *   and a field gun aft;
 * - the péniche: a lugger of 60 × 10 × 3½ feet, an open boat under oars
 *   and lugsails, a howitzer and a 4-pounder.
 *
 * Every number smallcraft.ts draws a glyph from is copied here unchanged
 * (hull lengths, rails, rakes, the sheer's low point; masts' places,
 * rakes, deck heights, tops, heads, trucks and diameters; yards; the
 * bowsprits, jib-booms, gaffs, booms, the running bowsprit and bumkin;
 * the stays): scripts/dev/craft-bounds.mjs compares the two. What a glyph
 * doesn't show (wales, ports, guns, rudders, deadeyes, the cable, flags,
 * colours) is added here, from the sources where they speak and assumed,
 * as marked, where they don't.
 */

/**
 * Colours. Assumed until the research note says otherwise: tarred or black
 * hulls with a yellow-ochre strake on the larger craft (the French navy's
 * usual scheme of the period), oiled wood for rails, masts and spars of the
 * mast's wood, black ironwork at the mastheads and on the yards, unbleached
 * hemp canvas.
 */
const BLACK_HULL: CraftPaint = {
  hull: "#34302b",
  wale: "#2b2824",
  band: "#c9a253",
  rail: "#8d6c48",
  bottom: "#3a352e",
  mast: "#a98653",
  spar: "#2f2b27",
  canvas: "#d9cfb6",
  rope: "#3a3029",
  running: "#6e5d49",
  iron: "#34322f",
  inside: "#6b5b47",
};

const LUGGER_HULL: CraftPaint = {
  ...BLACK_HULL,
  band: undefined,
  rail: "#93714b",
};

export const PRAME: CraftSpec = {
  id: "prame-1805",
  type: "prame",
  name: "Prame",
  seed: 1805_01,
  rig: "ship",
  hull: {
    length: 34.8,
    rail: [3.4, 2.8, 3.3],
    lowX: 17,
    sternRake: 1.0,
    stemRake: 1.0,
    deck: 1.3,
    draught: 2.6,
    depthShown: 1,
    strake: 0.24,
    plankLength: 7.2,
    railCap: 0.11,
    // A pair of wales under the battery, a rubbing strake lower down.
    wales: [
      { drop: 1.0, height: 0.32, sheer: 0.92 },
      { drop: 1.72, height: 0.2, sheer: 0.82 },
    ],
    // The yellow strake along the battery, the ports cut through it.
    band: { drop: 0.2, height: 0.78, sheer: 1 },
    ports: {
      xs: [4.2, 9.4, 14.6, 19.8, 25, 30.2],
      sill: 0.52,
      width: 0.82,
      height: 0.72,
      muzzle: 0.38,
    },
    scuppers: [3.2, 6.6, 12, 17.4, 22.6, 27.8, 31.6],
    rudder: { width: 0.72, headWidth: 0.38, head: 3.1 },
  },
  masts: [
    {
      id: "mizzen",
      x: 7.8,
      rake: 4,
      deck: 1.3,
      top: 10.4,
      head: 11.6,
      topmastHead: 16.6,
      truck: 19.6,
      d: [0.4, 0.25, 0.14],
      topWidth: 2,
      yards: [
        // The crossjack, a dry yard; the mizzen topsail furled.
        { y: 10.1, length: 11.6, furled: false },
        { y: 15.2, length: 8.2, furled: true },
      ],
      shrouds: [-1.5, -0.95, -0.4],
      shroudHead: 10.1,
      channel: true,
      ratlines: true,
      backstay: 4.2,
    },
    {
      id: "main",
      x: 17.6,
      rake: 2.5,
      deck: 1.3,
      top: 14.3,
      head: 15.6,
      topmastHead: 23,
      truck: 27.4,
      d: [0.6, 0.36, 0.2],
      topWidth: 3.2,
      yards: [
        { y: 13.9, length: 16.6, furled: true },
        { y: 21, length: 12.2, furled: true },
        { y: 25.6, length: 7.6, furled: true },
      ],
      shrouds: [-1.9, -1.35, -0.8, -0.25],
      shroudHead: 14.0,
      channel: true,
      ratlines: true,
      backstay: 4.2,
    },
    {
      id: "fore",
      x: 28.4,
      rake: 1,
      deck: 1.3,
      top: 13.2,
      head: 14.4,
      topmastHead: 21.2,
      truck: 25.2,
      d: [0.56, 0.34, 0.19],
      topWidth: 2.9,
      yards: [
        { y: 12.8, length: 15, furled: true },
        { y: 19.2, length: 11, furled: true },
        { y: 23.6, length: 6.8, furled: true },
      ],
      shrouds: [-1.85, -1.3, -0.75, -0.2],
      shroudHead: 12.9,
      channel: true,
      ratlines: true,
      backstay: 4.2,
    },
  ],
  stays: [
    {
      from: { mast: "fore", on: "lower", y: 14.2 },
      to: { bowsprit: 3 },
      heavy: true,
    },
    {
      from: { mast: "fore", on: "topmast", y: 21 },
      to: { at: "cap" },
      heavy: true,
    },
    {
      from: { mast: "fore", on: "pole", y: 23.8 },
      to: { at: "jibBoomEnd" },
      heavy: false,
    },
    {
      from: { mast: "main", on: "lower", y: 15.4 },
      to: { mast: "fore", on: "lower", y: 2.6 },
      heavy: true,
    },
    {
      from: { mast: "main", on: "topmast", y: 22.8 },
      to: { mast: "fore", on: "lower", y: 13.2 },
      heavy: true,
    },
    {
      from: { mast: "main", on: "pole", y: 27 },
      to: { mast: "fore", on: "topmast", y: 21 },
      heavy: false,
    },
    {
      from: { mast: "mizzen", on: "lower", y: 11.4 },
      to: { mast: "main", on: "lower", y: 4 },
      heavy: false,
    },
    {
      from: { mast: "mizzen", on: "topmast", y: 16.4 },
      to: { mast: "main", on: "lower", y: 14.3 },
      heavy: false,
    },
  ],
  bowsprit: {
    heel: [33.6, 2.6],
    angle: 30,
    length: 9,
    inboard: 1.5,
    d: [0.5, 0.36],
    jibBoom: { overlap: 2.6, lift: 0.28, length: 6.5, d: [0.26, 0.16] },
    martingale: 1.7,
  },
  gaff: {
    mast: "mizzen",
    throat: 10,
    length: 7.4,
    angle: 36,
    ease: 25,
    d: [0.22, 0.14],
    boom: { at: 3.4, length: 9.6, rise: 0.5, d: [0.26, 0.18] },
  },
  stowedHeadsails: true,
  guns: [],
  anchor: {
    hawse: [34.25, 2.32],
    hawseHole: true,
    cable: 0.13,
    angle: 38,
    catted: { at: [33.35, 3.2], length: 3.1 },
  },
  chimney: { x: 21.4, height: 2.3 },
  boat: { length: 6.4, height: 0.62, gap: 2.4 },
  ensign: { at: "peak", fly: 3.6, hoist: 2.4 },
  pennant: { mast: "main", length: 7.5, hoist: 0.42 },
  paint: BLACK_HULL,
};

export const CHALOUPE: CraftSpec = {
  id: "chaloupe-1805",
  type: "chaloupe",
  name: "Chaloupe canonnière",
  seed: 1805_02,
  rig: "brig",
  hull: {
    length: 24.6,
    rail: [2.0, 1.55, 2.05],
    lowX: 11,
    sternRake: 0.8,
    stemRake: 0.8,
    deck: 0.95,
    draught: 1.8,
    depthShown: 1,
    strake: 0.2,
    plankLength: 6.2,
    railCap: 0.09,
    wales: [
      { drop: 0.58, height: 0.24, sheer: 0.92 },
      { drop: 1.08, height: 0.14, sheer: 0.8 },
    ],
    band: { drop: 0.16, height: 0.36, sheer: 1 },
    scuppers: [2.6, 6.4, 10.4, 14.4, 18.4, 21.8],
    rudder: { width: 0.6, headWidth: 0.3, head: 2.05 },
  },
  masts: [
    {
      id: "main",
      x: 10,
      rake: 3,
      deck: 0.95,
      top: 10.8,
      head: 12,
      topmastHead: 17,
      truck: 20.4,
      d: [0.46, 0.28, 0.16],
      topWidth: 2.4,
      yards: [
        { y: 10.4, length: 12.4, furled: true },
        { y: 15.8, length: 8.9, furled: true },
        { y: 19.4, length: 5.6, furled: true },
      ],
      shrouds: [-1.45, -1.0, -0.55, -0.1],
      shroudHead: 10.5,
      channel: true,
      ratlines: true,
      backstay: 3.4,
    },
    {
      id: "fore",
      x: 18.2,
      rake: 1.5,
      deck: 0.95,
      top: 10.2,
      head: 11.4,
      topmastHead: 16.2,
      truck: 19.4,
      d: [0.44, 0.27, 0.15],
      topWidth: 2.3,
      yards: [
        { y: 9.8, length: 12, furled: true },
        { y: 15, length: 8.6, furled: true },
        { y: 18.4, length: 5.4, furled: true },
      ],
      shrouds: [-1.45, -1.0, -0.55, -0.1],
      shroudHead: 9.9,
      channel: true,
      ratlines: true,
      backstay: 3.4,
    },
  ],
  stays: [
    {
      from: { mast: "fore", on: "lower", y: 11.2 },
      to: { bowsprit: 2.5 },
      heavy: true,
    },
    {
      from: { mast: "fore", on: "topmast", y: 16 },
      to: { at: "cap" },
      heavy: true,
    },
    {
      from: { mast: "fore", on: "pole", y: 18.9 },
      to: { at: "jibBoomEnd" },
      heavy: false,
    },
    {
      from: { mast: "main", on: "lower", y: 11.8 },
      to: { mast: "fore", on: "lower", y: 2.2 },
      heavy: true,
    },
    {
      from: { mast: "main", on: "topmast", y: 16.8 },
      to: { mast: "fore", on: "lower", y: 10.2 },
      heavy: true,
    },
    {
      from: { mast: "main", on: "pole", y: 20 },
      to: { mast: "fore", on: "topmast", y: 16 },
      heavy: false,
    },
  ],
  bowsprit: {
    heel: [23.8, 1.8],
    angle: 26,
    length: 7.2,
    inboard: 1.2,
    d: [0.4, 0.28],
    jibBoom: { overlap: 2.2, lift: 0.22, length: 5.6, d: [0.2, 0.12] },
    martingale: 1.3,
  },
  gaff: {
    mast: "main",
    throat: 10.2,
    length: 6.6,
    angle: 34,
    ease: 20,
    d: [0.2, 0.13],
    boom: { at: 2.7, length: 11.4, rise: 0.4, d: [0.24, 0.16] },
  },
  stowedHeadsails: true,
  guns: [
    // Two long 24-pounders forward, run out through the bow; one aft.
    { x: 22.85, y: 1.62, length: 2.75, bore: 0.36, dir: 1, kind: "long" },
    { x: 1.75, y: 1.66, length: 2.75, bore: 0.36, dir: -1, kind: "long" },
  ],
  anchor: {
    hawse: [24.3, 1.56],
    hawseHole: true,
    cable: 0.1,
    angle: 40,
    catted: { at: [23.4, 1.98], length: 2.4 },
  },
  chimney: { x: 13.6, height: 1.55 },
  ensign: { at: "peak", fly: 2.9, hoist: 1.95 },
  pennant: { mast: "main", length: 6, hoist: 0.34 },
  paint: BLACK_HULL,
};

export const BATEAU: CraftSpec = {
  id: "bateau-1805",
  type: "bateau",
  name: "Bateau canonnier",
  seed: 1805_03,
  rig: "lugger",
  hull: {
    length: 18.8,
    rail: [1.5, 1.25, 1.6],
    lowX: 9,
    sternRake: 0.5,
    stemRake: 0.7,
    deck: 0.8,
    draught: 1.45,
    depthShown: 1,
    strake: 0.18,
    plankLength: 5.4,
    railCap: 0.08,
    wales: [{ drop: 0.5, height: 0.18, sheer: 0.9 }],
    scuppers: [2.4, 5.6, 9.2, 12.8, 16],
    rudder: {
      width: 0.5,
      headWidth: 0.22,
      head: 1.82,
      tiller: { length: 1.7, rise: 0.12 },
    },
    stemHead: 0.12,
  },
  masts: [
    {
      id: "fore",
      x: 16.4,
      rake: -3,
      deck: 0.8,
      truck: 11.6,
      d: [0.32, 0, 0],
      shrouds: [-0.9, -0.2],
      shroudHead: 10.9,
      channel: false,
      ratlines: false,
    },
    {
      id: "main",
      x: 9.2,
      rake: 5,
      deck: 0.8,
      truck: 13,
      d: [0.34, 0, 0],
      shrouds: [-1.2, -0.4],
      shroudHead: 12.3,
      channel: false,
      ratlines: false,
    },
    {
      id: "mizzen",
      x: 0.6,
      rake: 8,
      deck: 0.8,
      truck: 7.4,
      d: [0.2, 0, 0],
      shrouds: [0.5],
      shroudHead: 6.9,
      channel: false,
      ratlines: false,
    },
  ],
  stays: [
    {
      from: { mast: "fore", on: "lower", y: 11.2 },
      to: { point: [21.6, 1.9] },
      heavy: true,
    },
    {
      from: { mast: "main", on: "lower", y: 12.6 },
      to: { mast: "fore", on: "lower", y: 10.8 },
      heavy: false,
    },
    {
      from: { mast: "mizzen", on: "lower", y: 7.1 },
      to: { mast: "main", on: "lower", y: 1.6 },
      heavy: false,
    },
  ],
  runningBowsprit: { from: [16.2, 1.45], to: [22, 1.95], d: [0.24, 0.16] },
  bumkin: { from: [1, 1.35], to: [-3.4, 1.05], d: [0.16, 0.12] },
  // The yards lowered, their sails rolled on them, lying fore and aft on deck.
  lugs: [
    {
      mast: "main",
      length: 8.6,
      d: 0.2,
      aftX: 3.3,
      aftY: 1.36,
      foreY: 1.3,
      roll: 0.3,
    },
    {
      mast: "fore",
      length: 7.6,
      d: 0.18,
      aftX: 11.2,
      aftY: 1.42,
      foreY: 1.56,
      roll: 0.28,
    },
    {
      mast: "mizzen",
      length: 4.6,
      d: 0.13,
      aftX: -0.15,
      aftY: 1.56,
      foreY: 1.44,
      roll: 0.2,
    },
  ],
  guns: [
    // The 24-pounder forward on its slide, run out over the bow; the field gun aft.
    { x: 16.75, y: 1.36, length: 2.75, bore: 0.36, dir: 1, kind: "long" },
    { x: 2.3, y: 1.42, length: 1.25, bore: 0.3, dir: -1, kind: "howitzer" },
  ],
  anchor: {
    hawse: [18.62, 1.12],
    hawseHole: true,
    cable: 0.07,
    angle: 42,
  },
  ensign: {
    at: "staff",
    staff: { foot: [-0.32, 1.42], height: 2.5, rake: 8, d: 0.08 },
    fly: 1.9,
    hoist: 1.25,
  },
  paint: LUGGER_HULL,
};

export const PENICHE: CraftSpec = {
  id: "peniche-1805",
  type: "peniche",
  name: "Péniche",
  seed: 1805_04,
  rig: "lugger",
  hull: {
    length: 19,
    rail: [1.05, 0.8, 1.15],
    lowX: 9.5,
    sternRake: 0.45,
    stemRake: 0.55,
    pointed: true,
    open: true,
    deck: 0.3,
    draught: 1.1,
    depthShown: 1,
    strake: 0.16,
    plankLength: 5,
    railCap: 0.07,
    wales: [{ drop: 0.13, height: 0.08, sheer: 1 }],
    rudder: {
      width: 0.42,
      headWidth: 0.16,
      head: 1.3,
      tiller: { length: 1.45, rise: 0.08 },
    },
    stemHead: 0.16,
  },
  masts: [
    {
      id: "fore",
      x: 14.6,
      rake: -2,
      deck: 0.3,
      truck: 8.6,
      d: [0.22, 0, 0],
      shrouds: [-0.5],
      shroudHead: 8.1,
      channel: false,
      ratlines: false,
    },
    {
      id: "main",
      x: 7.6,
      rake: 4,
      deck: 0.3,
      truck: 9.6,
      d: [0.24, 0, 0],
      shrouds: [-0.7],
      shroudHead: 9.1,
      channel: false,
      ratlines: false,
    },
  ],
  stays: [
    {
      from: { mast: "fore", on: "lower", y: 8.3 },
      to: { point: [19.4, 1.1] },
      heavy: true,
    },
    {
      from: { mast: "main", on: "lower", y: 9.3 },
      to: { mast: "fore", on: "lower", y: 8 },
      heavy: false,
    },
  ],
  lugs: [
    {
      mast: "main",
      length: 7,
      d: 0.15,
      aftX: 2.75,
      aftY: 0.86,
      foreY: 0.8,
      roll: 0.22,
    },
    {
      mast: "fore",
      length: 6,
      d: 0.14,
      aftX: 10.5,
      aftY: 0.84,
      foreY: 0.92,
      roll: 0.2,
    },
  ],
  guns: [
    // The howitzer forward; the 4-pounder aft.
    { x: 15.7, y: 0.9, length: 1.05, bore: 0.3, dir: 1, kind: "howitzer" },
    { x: 3.1, y: 0.86, length: 1.6, bore: 0.17, dir: -1, kind: "long" },
  ],
  anchor: {
    hawse: [19.42, 1.06],
    hawseHole: false,
    cable: 0.05,
    angle: 46,
  },
  oars: { from: 2.6, to: 16.2, pairs: 14, shown: 7, length: 5.2 },
  ensign: {
    at: "staff",
    staff: { foot: [-0.18, 1.02], height: 2.1, rake: 10, d: 0.07 },
    fly: 1.5,
    hoist: 1.0,
  },
  paint: LUGGER_HULL,
};

export const CRAFT_SPECS: Record<CraftType, CraftSpec> = {
  prame: PRAME,
  chaloupe: CHALOUPE,
  bateau: BATEAU,
  peniche: PENICHE,
};
