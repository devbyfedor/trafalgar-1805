import type { StripSpec } from "./layers/seaGeometry";

/**
 * Scene 1 composition. Vertical positions are fractions of the viewport
 * height; the ship is sized from the height, so the composition holds from
 * 4:3 to 21:9 while sky, sea and haze extend sideways. See the layout sketch
 * in docs/decisions.md.
 */

export const HORIZON = 0.61;
export const WATERLINE = 0.69;
/** Height of Victory's main truck at her hero position (from the top). */
export const TRUCK = 0.11;

/** Victory's main truck above her waterline, metres (spec). */
export const MAIN_TRUCK_M = 60.2;

/** One metre at Victory's distance, in vh. */
export const METRE_VH = ((WATERLINE - TRUCK) * 100) / MAIN_TRUCK_M;

/** Victory's horizontal positions (hull centre, fraction of viewport width). */
export const VICTORY_X = {
  /** p = 0: only her bow and foremast inside the left edge. */
  start: -0.16,
  hero: 0.47,
  /** p = 1: still sailing slowly toward the enemy. */
  end: 0.53,
} as const;

/** The sun's horizontal position (fraction of width): right-hand end of the enemy line. */
export const SUN_X = 0.8;
/** Sun disc diameter, vh. About three enemy rigs high, as the research advises. */
export const SUN_DIAMETER_VH = 5.2;

/** Enemy line along the horizon (fractions of width). */
export const ENEMY_SPAN = { from: 0.5, to: 0.9 } as const;

export interface SeaStrip extends StripSpec {
  /** Top of the strip's wave band (units of 1/1000 viewport height). */
  top: number;
  /** Crest drift speed, units per second (crests travel left to right). */
  speed: number;
  /** Vertical swell amplitude, units, and period, seconds. */
  swell: number;
  swellPeriod: number;
  /** Phase offset of the swell, seconds. */
  swellDelay: number;
  colors: {
    night: { body: string; crest: string; inner: string };
    dawn: { body: string; crest: string; inner: string };
  };
}

/** Back sea: horizon to just below Victory's waterline (behind her). */
export const BACK_STRIPS: readonly SeaStrip[] = [
  {
    id: "b1",
    top: 606,
    height: 34,
    period: 96,
    waves: [
      { k: 1, a: 0.7 },
      { k: 3, a: 0.35 },
      { k: 7, a: 0.15 },
    ],
    sharpness: 0.2,
    highlight: 0.9,
    seed: 11,
    speed: 3.2,
    swell: 0.35,
    swellPeriod: 11,
    swellDelay: 0,
    colors: {
      night: { body: "#3b4756", crest: "#4a5667", inner: "#36424f" },
      dawn: { body: "#8a8580", crest: "#cdb18a", inner: "#7d7b78" },
    },
  },
  {
    id: "b2",
    top: 614,
    height: 46,
    period: 150,
    waves: [
      { k: 1, a: 1.1 },
      { k: 3, a: 0.5 },
      { k: 8, a: 0.2 },
    ],
    sharpness: 0.25,
    highlight: 1.2,
    seed: 12,
    speed: 4.6,
    swell: 0.6,
    swellPeriod: 10.5,
    swellDelay: 0.6,
    colors: {
      night: { body: "#34404d", crest: "#45515f", inner: "#303b47" },
      dawn: { body: "#6f7473", crest: "#bfa47f", inner: "#666c6c" },
    },
  },
  {
    id: "b3",
    top: 624,
    height: 60,
    period: 240,
    waves: [
      { k: 1, a: 1.7 },
      { k: 3, a: 0.7 },
      { k: 9, a: 0.25 },
    ],
    sharpness: 0.3,
    highlight: 1.6,
    seed: 13,
    speed: 6.5,
    swell: 1,
    swellPeriod: 10,
    swellDelay: 1.2,
    colors: {
      night: { body: "#2d3944", crest: "#3e4a57", inner: "#29343e" },
      dawn: { body: "#566469", crest: "#a99677", inner: "#4f5d63" },
    },
  },
  {
    id: "b4",
    top: 640,
    height: 76,
    period: 360,
    waves: [
      { k: 1, a: 2.4 },
      { k: 2, a: 1 },
      { k: 7, a: 0.35 },
    ],
    sharpness: 0.35,
    highlight: 2,
    seed: 14,
    speed: 9,
    swell: 1.6,
    swellPeriod: 9.6,
    swellDelay: 1.9,
    colors: {
      night: { body: "#26323c", crest: "#37434f", inner: "#222d36" },
      dawn: { body: "#45585f", crest: "#958771", inner: "#3f5259" },
    },
  },
  {
    id: "b5",
    top: 661,
    height: 90,
    period: 540,
    waves: [
      { k: 1, a: 3.2 },
      { k: 2, a: 1.3 },
      { k: 7, a: 0.45 },
    ],
    sharpness: 0.38,
    highlight: 2.6,
    seed: 15,
    speed: 12,
    swell: 2.2,
    swellPeriod: 9.2,
    swellDelay: 2.5,
    colors: {
      night: { body: "#212c35", crest: "#323e49", inner: "#1d2730" },
      dawn: { body: "#3b4f57", crest: "#867b68", inner: "#364950" },
    },
  },
];

/** Front sea: the strip over Victory's waterline and the foreground. */
export const FRONT_STRIPS: readonly SeaStrip[] = [
  {
    id: "f1",
    top: 682,
    height: 120,
    period: 760,
    waves: [
      { k: 1, a: 2.8 },
      { k: 3, a: 1.1 },
      { k: 9, a: 0.4 },
    ],
    sharpness: 0.35,
    highlight: 3,
    seed: 21,
    speed: 15,
    swell: 2.6,
    swellPeriod: 9,
    swellDelay: 3.1,
    colors: {
      night: { body: "#1e2932", crest: "#2f3b46", inner: "#1a242c" },
      dawn: { body: "#344a53", crest: "#7d7464", inner: "#2f444c" },
    },
  },
  {
    id: "f2",
    top: 742,
    height: 170,
    period: 1100,
    waves: [
      { k: 1, a: 4.5 },
      { k: 3, a: 1.6 },
      { k: 8, a: 0.6 },
    ],
    sharpness: 0.38,
    highlight: 4,
    seed: 22,
    speed: 21,
    swell: 3.6,
    swellPeriod: 8.8,
    swellDelay: 3.8,
    colors: {
      night: { body: "#1b262e", crest: "#2a3640", inner: "#172129" },
      dawn: { body: "#2e434c", crest: "#6c6658", inner: "#2a3e46" },
    },
  },
  {
    id: "f3",
    top: 838,
    height: 240,
    period: 1640,
    waves: [
      { k: 1, a: 7 },
      { k: 3, a: 2.4 },
      { k: 7, a: 0.9 },
    ],
    sharpness: 0.4,
    highlight: 5,
    seed: 23,
    speed: 30,
    swell: 5,
    swellPeriod: 8.6,
    swellDelay: 4.4,
    colors: {
      night: { body: "#18222a", crest: "#26313a", inner: "#141d24" },
      dawn: { body: "#283c44", crest: "#5f5b4f", inner: "#24373f" },
    },
  },
];
