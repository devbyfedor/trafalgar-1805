import type { CraftLighting, CraftPaint } from "./types";

/**
 * Colour by light, so every material on every craft is lit by the same
 * sun. A material is its colour in white light; a lighting is a sun, the
 * sky and the water below, each a colour and a strength; a facing says how
 * much of each a surface sees. Mixed in linear light, then back to sRGB.
 *
 * "evening": the sun about 6° up behind the viewer, a little to his left
 * (he looks east-south-east, the sun is in the west-north-west), golden;
 * the eastern sky cool; the water a dark blue-grey. So whatever faces the
 * viewer faces the sun: hull sides, masts, furled canvas are lit warm, and
 * only what turns away or lies under something is in cool shade.
 * "neutral": soft white daylight from above, for the lab and for any
 * scene that brings its own light.
 */

/** How much of the sun, the sky and the water a surface sees. */
interface Facing {
  sun: number;
  sky: number;
  water: number;
}

/** The faces the drawing uses. */
export type FacingName =
  /** A side facing the viewer (the hull's side, a mast's sunward face). */
  | "side"
  /** Facing up: rail caps, the tops of wales, of furled canvas. */
  | "top"
  /** Facing down: the undersides of wales, tops, rolls; seeing the water. */
  | "under"
  /** Turning away from the sun: a mast's fore edge, the bow's flare. */
  | "turned"
  /** The lower hull, curving in toward the keel, lit by sun and water. */
  | "low"
  /** In shadow: inside a port, under the bulwark, in a cast shadow. */
  | "shadow";

interface Lighting {
  sun: string;
  sky: string;
  water: string;
  /** Light scattered from everything round about, on every face alike. */
  fill: string;
  /** Strengths of the four. */
  strength: { sun: number; sky: number; water: number; fill: number };
  facings: Record<FacingName, Facing>;
  exposure: number;
  /** A warm glint for sunlit edges, and a cool tone for cast shadows. */
  glint: string;
  cast: string;
}

const LIGHTINGS: Record<CraftLighting, Lighting> = {
  evening: {
    // The sun 5–12° up: warm gold, not orange (that is the last half-hour).
    sun: "#ffe2bc",
    sky: "#a7b4c8",
    water: "#6a7a86",
    fill: "#b8bcc4",
    strength: { sun: 1.25, sky: 0.95, water: 0.55, fill: 0.35 },
    facings: {
      side: { sun: 0.93, sky: 0.45, water: 0.25 },
      top: { sun: 0.15, sky: 1, water: 0 },
      under: { sun: 0, sky: 0.3, water: 0.85 },
      turned: { sun: 0.25, sky: 0.55, water: 0.3 },
      low: { sun: 0.55, sky: 0.32, water: 0.6 },
      shadow: { sun: 0, sky: 0.42, water: 0.25 },
    },
    exposure: 0.9,
    glint: "#fff0d6",
    cast: "#2b3340",
  },
  neutral: {
    sun: "#fff8ee",
    sky: "#c3cad4",
    water: "#6f7a82",
    fill: "#bcbfc4",
    strength: { sun: 0.95, sky: 0.8, water: 0.4, fill: 0.35 },
    facings: {
      side: { sun: 0.55, sky: 0.5, water: 0.2 },
      top: { sun: 1, sky: 1, water: 0 },
      under: { sun: 0, sky: 0.25, water: 0.75 },
      turned: { sun: 0.35, sky: 0.45, water: 0.25 },
      low: { sun: 0.4, sky: 0.32, water: 0.5 },
      shadow: { sun: 0, sky: 0.4, water: 0.2 },
    },
    exposure: 0.95,
    glint: "#f6f2ea",
    cast: "#2c3138",
  },
};

type Rgb = [number, number, number];

const toLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const toSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

function parse(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [
    toLinear(((n >> 16) & 255) / 255),
    toLinear(((n >> 8) & 255) / 255),
    toLinear((n & 255) / 255),
  ];
}

function format(c: Rgb): string {
  // A soft shoulder instead of a hard clip, so bright canvas keeps its hue.
  const shoulder = (v: number) =>
    v < 0.8 ? v : 0.8 + 0.2 * Math.tanh((v - 0.8) / 0.2);
  return `#${c
    .map((v) => {
      const s = Math.round(toSrgb(Math.max(0, shoulder(v))) * 255);
      return Math.min(255, s).toString(16).padStart(2, "0");
    })
    .join("")}`;
}

/** A material under a lighting, seen on a facing. */
export function lit(
  material: string,
  lighting: CraftLighting,
  facing: FacingName,
): string {
  const L = LIGHTINGS[lighting];
  const f = L.facings[facing];
  const albedo = parse(material);
  const sun = parse(L.sun);
  const sky = parse(L.sky);
  const water = parse(L.water);
  const fill = parse(L.fill);
  const out: Rgb = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const light =
      sun[i] * L.strength.sun * f.sun +
      sky[i] * L.strength.sky * f.sky +
      water[i] * L.strength.water * f.water +
      fill[i] * L.strength.fill;
    out[i] = albedo[i] * light * L.exposure;
  }
  return format(out);
}

/** A mix of two sRGB colours in linear light. */
export function mix(a: string, b: string, t: number): string {
  const ca = parse(a);
  const cb = parse(b);
  return format([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as Rgb);
}

/** A material's tones on each facing. */
export type Tones = Record<FacingName, string>;

function tones(material: string, lighting: CraftLighting): Tones {
  return {
    side: lit(material, lighting, "side"),
    top: lit(material, lighting, "top"),
    under: lit(material, lighting, "under"),
    turned: lit(material, lighting, "turned"),
    low: lit(material, lighting, "low"),
    shadow: lit(material, lighting, "shadow"),
  };
}

export interface CraftPalette {
  hull: Tones;
  wale: Tones;
  band: Tones | null;
  rail: Tones;
  bottom: Tones;
  mast: Tones;
  spar: Tones;
  canvas: Tones;
  rope: Tones;
  running: Tones;
  iron: Tones;
  inside: Tones;
  glint: string;
  cast: string;
  /** The flag's colours, as lit. */
  flag: { white: string; blue: string; red: string; shade: string };
}

const cache = new Map<string, CraftPalette>();

/** The palette of a craft's paint under a lighting (cached). */
export function paletteOf(
  paint: CraftPaint,
  lighting: CraftLighting,
): CraftPalette {
  const key = `${lighting}:${JSON.stringify(paint)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const L = LIGHTINGS[lighting];
  const palette: CraftPalette = {
    hull: tones(paint.hull, lighting),
    wale: tones(paint.wale ?? paint.hull, lighting),
    band: paint.band ? tones(paint.band, lighting) : null,
    rail: tones(paint.rail, lighting),
    bottom: tones(paint.bottom, lighting),
    mast: tones(paint.mast, lighting),
    spar: tones(paint.spar, lighting),
    canvas: tones(paint.canvas, lighting),
    rope: tones(paint.rope, lighting),
    running: tones(paint.running, lighting),
    iron: tones(paint.iron, lighting),
    inside: tones(paint.inside, lighting),
    glint: L.glint,
    cast: L.cast,
    flag: {
      // flags.ts's colours as bunting, then lit.
      white: lit("#e6e0d2", lighting, "side"),
      blue: lit("#24366a", lighting, "side"),
      red: lit("#b8312a", lighting, "side"),
      shade: L.cast,
    },
  };
  cache.set(key, palette);
  return palette;
}
