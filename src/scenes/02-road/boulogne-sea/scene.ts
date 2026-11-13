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
    lit: "#f2d9b4",
    litWarm: "#ecc59b",
    shade: "#9f99a8",
    shadeDeep: "#7d7f93",
  },
  haze: {
    far: "#b9b5bd",
    near: "#cdbfae",
  },
  hills: { lit: "#a6a3a9", shade: "#8e8f9c" },
  town: {
    wallLit: "#cdb48c",
    wallShade: "#9a8e86",
    roofSlate: "#7e8291",
    roofTile: "#b08a69",
    roofLit: "#a99886",
    hill: "#a39c74",
    hillShade: "#8b8a72",
  },
  cliff: {
    lit: "#d0ad73",
    litHigh: "#e2c48c",
    shade: "#9c8466",
    base: "#6d6153",
    grass: "#9f9a5c",
    grassLit: "#b8ae66",
  },
  plateau: {
    field: "#b2a865",
    fieldLit: "#c9b977",
    hedge: "#7c7a52",
  },
  hut: {
    roofLit: "#d7b578",
    roofShade: "#97825f",
    wallLit: "#c7ad84",
    wallShade: "#857a6b",
    gap: "#6f6858",
  },
  harbour: {
    pier: "#4a4239",
    pierLit: "#8a7253",
    mast: "#4f4740",
    mastLit: "#8b7556",
    hull: "#3f3a35",
  },
  sea: {
    farBody: "#9fa2a6",
    farCrest: "#d7c3a0",
    farInner: "#939aa1",
    midBody: "#5f7682",
    midCrest: "#b19e7d",
    midInner: "#566d79",
    nearBody: "#2b4350",
    nearCrest: "#8f7f62",
    nearInner: "#263c48",
  },
  craft: {
    hullNear: "#3c3834",
    sparNear: "#5d5248",
    hullFar: "#6f6d70",
    sparFar: "#868384",
    sailFurled: "#cbb894",
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
  const k = 1 - Math.exp(-distance / 7000);
  return mixHex(hex, PALETTE.haze.far, k);
}
