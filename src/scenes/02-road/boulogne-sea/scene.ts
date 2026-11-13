import { SEA_EYE } from "../interludes";

/**
 * The composition of Boulogne from the sea (docs/scene-02-boulogne-brief.md,
 * "Concept"): where everything stands, how it is drawn bigger than life,
 * and its colours at a golden August evening with the sun low behind the
 * eye. The history behind the places is in docs/history-notes.md (scene 2,
 * beat 1) and docs/research/scene-02/boulogne-sea/; the licences are in
 * docs/decisions.md ("Boulogne from the sea").
 *
 * Places are given in metres from the heads of the harbour's piers (about
 * 50.7277 N 1.5865 E), east and north; the painting sees them from its eye
 * (interludes.ts, SEA_EYE) through view.ts's layer units: x = 1000 · tan
 * of the angle right of the view's axis, y = 1000 · tan of the angle above
 * the eye's horizon.
 */

/** The piers' heads, degrees. */
export const HARBOUR = { lon: 1.5865, lat: 50.7277 } as const;

const M_PER_DEG_LAT = 111_200;
const M_PER_DEG_LON = 111_320 * Math.cos((HARBOUR.lat * Math.PI) / 180);

/** The eye, metres east and north of the piers' heads. */
export const EYE_EN = [
  (SEA_EYE.lon - HARBOUR.lon) * M_PER_DEG_LON,
  (SEA_EYE.lat - HARBOUR.lat) * M_PER_DEG_LAT,
] as const;

const PSI = (SEA_EYE.heading * Math.PI) / 180;
const SIN = Math.sin(PSI);
const COS = Math.cos(PSI);

/**
 * The painter's licence on heights (docs/decisions.md): the land's relief
 * drawn VEX times its height, buildings, huts and masts BUILD times their
 * size, as period views of the coast drew them; at their true size from a
 * kilometre out the cliffs stood 2° high and a hut was a speck.
 */
export const VEX = 2.5;
export const BUILD = 2;

/** The eye's height over the water at the hold, metres. */
export const EYE_H = SEA_EYE.height;

/** A place's distance ahead along the view and across it (metres), from metres east and north of the piers' heads. */
export function viewOf(
  east: number,
  north: number,
): [ahead: number, right: number] {
  const e = east - EYE_EN[0];
  const n = north - EYE_EN[1];
  return [e * SIN + n * COS, e * COS - n * SIN];
}

/** Layer units of a place (metres east, north of the piers' heads; `up` metres above the water as drawn). */
export function project(
  east: number,
  north: number,
  up: number,
): [number, number] {
  const [ahead, right] = viewOf(east, north);
  return [(1000 * right) / ahead, (1000 * (up - EYE_H)) / ahead];
}

/**
 * The layers' depths, metres ahead of the eye: each flat layer moves as a
 * thing at that depth would (view.ts, shiftFor).
 */
export const DEPTH = {
  farHills: 6000,
  town: 2900,
  heightsSouth: 1800,
  plateauNorth: 1600,
  harbour: 1400,
  shore: 1300,
  lineFar: 800,
  lineNear: 480,
} as const;

/**
 * Colours of a golden evening in August with the sun about 7° up in the
 * west-north-west, behind the eye: the land lit full in the face, warm,
 * against a cool sea and the pale eastern sky; farther is lighter, cooler
 * and lower in contrast. Warm notes stay golden, never red-brown (the
 * project's palette, docs/decisions.md).
 */
export const PALETTE = {
  sky: {
    zenith: "#3b5372",
    high: "#55708f",
    mid: "#7f93a9",
    low: "#b4b6b6",
    glow: "#dccaa9",
    horizon: "#e9d3ab",
  },
  cloud: {
    lit: "#f7dfb8",
    litWarm: "#f0c6a0",
    shade: "#b3a1aa",
    shadeDeep: "#8f86a0",
  },
  haze: {
    far: "#c3b8bc",
    near: "#d9c6ad",
  },
  hills: { lit: "#b0a6ab", shade: "#989ba8" },
  town: {
    wallLit: "#dcbf8f",
    wallShade: "#a39283",
    roofSlate: "#878a9a",
    roofTile: "#b5916f",
    roofLit: "#b8a58c",
    hill: "#b4a771",
    hillShade: "#958f74",
  },
  cliff: {
    lit: "#d9aa68",
    litHigh: "#eac384",
    shade: "#a9835f",
    base: "#76634f",
    grass: "#a69e58",
    grassLit: "#c5b565",
  },
  plateau: {
    field: "#c0aa64",
    fieldLit: "#d7be77",
    hedge: "#8b7d55",
  },
  hut: {
    roofLit: "#e3be7b",
    roofShade: "#a18661",
    wallLit: "#d6bb8f",
    wallShade: "#91806c",
    gap: "#706656",
  },
  harbour: {
    pier: "#4e453b",
    pierLit: "#937855",
    mast: "#5a4f45",
    mastLit: "#967b58",
    hull: "#433c35",
  },
  sea: {
    farBody: "#b6aaa2",
    farCrest: "#e6cc9f",
    farInner: "#a9a0a2",
    midBody: "#7b8693",
    midCrest: "#bea27a",
    midInner: "#6e7b89",
    nearBody: "#33485a",
    nearCrest: "#8e7b62",
    nearInner: "#2c3f4f",
  },
  craft: {
    hullNear: "#463e37",
    sparNear: "#64574b",
    hullFar: "#7a7171",
    sparFar: "#8e8586",
    sailFurled: "#d4bf96",
  },
} as const;

/** Linear interpolation between two hex colours. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const k = Math.min(1, Math.max(0, t));
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * k);
  };
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return `#${v.toString(16).padStart(6, "0")}`;
}

/**
 * Atmospheric perspective: a colour seen through the evening air at a
 * distance (metres), pulled toward the haze. The air is clear from the
 * sea at evening; a few kilometres soften and cool a colour by a third.
 */
export function aerial(hex: string, distance: number): string {
  const k = 1 - Math.exp(-distance / 9000);
  return mixHex(hex, PALETTE.haze.far, k);
}
