import type { FrameInfo } from "../engine/Chart";
import type { LightBlend } from "../light/states";
import type { CoastField } from "../terrain/coast";

/**
 * The chart's colour under a label, on the CPU, as the terrain's shader
 * draws it (terrain/shaders.ts; the sky's functions from shaders/common.ts,
 * GLSL_SKY): what a label's ink is read against. The renderer writes the
 * shader's sRGB values as they are (Chart: LinearSRGBColorSpace), so these
 * are the frame's own colours, less the fine ink drawn over the ground
 * (isobaths, contours, the coast's line) and the land's relief light,
 * which a label can't keep off and are taken at their worst instead.
 *
 * The sea: its colour by depth, the sky it reflects at grazing angles (the
 * horizon's glow under the sun included), the sun's road, the outer
 * waterlines as they light the label's bright end where it comes nearest
 * the coast,
 * then the haze toward the colour of the sky behind it. The land: its paper
 * by height in the deepest shade the relief light gives, then the haze.
 * Toward the horizon the haze lightens the ground toward the colour of the
 * air, and at dawn the sun's road and the glow brighten the sea under it:
 * the pale ink reads only so far into them. At night the hazed sea stays
 * dark, and the dark ink on the dark paper never reads.
 */

/** sRGB colour, 0..1. */
export type Rgb = [number, number, number];

/** The sky stops' elevations, degrees (GLSL_SKY, SKY_ELEV). */
const SKY_ELEV = [0, 1.25, 3.33, 6.66, 11.2, 16.9, 24.6, 34.8, 90];
const DEG = Math.PI / 180;
/**
 * The waterlines (terrain/shaders.ts, waterlines; Terrain.ts's uniforms):
 * their share of the pale ink at full strength, their spacing on screen
 * (CSS px), how far each set reaches (uWaterOpen), and a line's cover at
 * its middle well out from the coast (0.55 device px wide at 1.5, by the
 * engraver's hand 0.85 to 1.15 of that).
 */
const WATER_INK = 0.42;
const WATER_SPACING_PX = 2.2;
const WATER_OPEN: readonly [number, number] = [0.45, 0.45];
const WATER_COVER = 0.9;
/** The share of a label's pixels its ground is read at the bright end of (contrast.mjs: the 95th percentile). */
const BRIGHT_SHARE = 0.05;

/** WCAG relative luminance of an sRGB colour. */
export function luminance(c: Rgb): number {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}

/** WCAG contrast of two luminances. */
export function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function mix(out: Rgb, x: number, y: number, z: number, t: number): void {
  out[0] += (x - out[0]) * t;
  out[1] += (y - out[1]) * t;
  out[2] += (z - out[2]) * t;
}

/**
 * How much of the pale ink the waterlines lay on the bright end of a
 * label's ground (0..WATER_INK) at u of their band out from the coast,
 * where the coast's distance changes by perPx km per CSS px on screen at
 * device pixel ratio dpr: their strength there, and the cover of their
 * pixels at the label's bright end. The band is drawn in sets an octave
 * apart, each reaching less far the finer it is, so well out only sparse
 * lines are left: a set whose lines are far apart lights too few of the
 * label's pixels to make its bright end.
 */
export function waterlineInk(u: number, perPx: number, dpr: number): number {
  if (!(u < 1) || !(perPx > 0)) return 0;
  const uu = Math.max(0, u);
  const Z = Math.log2((WATER_SPACING_PX * perPx) / 0.001);
  const z = Z - Math.floor(Z);
  let cover = 0;
  for (let i = 0; i < 4; i++) {
    const r = i - z;
    const edge = WATER_OPEN[0] + WATER_OPEN[1] * r;
    const shown =
      (1 - smoothstep(edge - 0.12, edge + 0.12, uu)) *
      (i === 0 ? 1 - smoothstep(0, 1, z) : 1);
    if (shown <= 0) continue;
    // A line lights about one device pixel of every spacing; the bright
    // end's share of the label reaches down its edges this far.
    const spacingDev = WATER_SPACING_PX * 2 ** r * dpr;
    const atBright = clamp01(1 - (BRIGHT_SHARE * spacingDev) / 2);
    cover = Math.max(cover, shown * atBright);
  }
  return WATER_INK * WATER_COVER * cover * (1 - uu) ** 1.5;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** The angle from one azimuth to another, radians, 0..π. */
function azimuthApart(a: number, b: number): number {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

/** Scene 1's horizon glow at a direction (GLSL horizonGlow). */
function horizonGlow(
  light: LightBlend,
  x: number,
  y: number,
  z: number,
): number {
  const s = light.sunDir;
  const dAz = azimuthApart(Math.atan2(x, y), Math.atan2(s.x, s.y));
  const elev = Math.asin(Math.min(1, Math.max(-1, z)));
  const r = Math.hypot(dAz / (30 * DEG), elev / (14 * DEG));
  const a =
    r < 0.24
      ? 0.62 + (0.32 - 0.62) * (r / 0.24)
      : r < 0.52
        ? 0.32 + (0.12 - 0.32) * ((r - 0.24) / 0.28)
        : 0.12 * (1 - clamp01((r - 0.52) / 0.2));
  return a * light.glow;
}

/** The sky's colour in a direction (unit), into out (GLSL skyColor). */
function skyColor(
  light: LightBlend,
  x: number,
  y: number,
  z: number,
  out: Rgb,
): void {
  const e = Math.min(
    90,
    Math.max(0, Math.asin(Math.min(1, Math.max(-1, z))) / DEG),
  );
  const stops = light.skyStops;
  out[0] = stops[0].x;
  out[1] = stops[0].y;
  out[2] = stops[0].z;
  for (let i = 1; i < 9; i++) {
    const t = clamp01((e - SKY_ELEV[i - 1]) / (SKY_ELEV[i] - SKY_ELEV[i - 1]));
    if (t > 0) mix(out, stops[i].x, stops[i].y, stops[i].z, t);
  }
  const g = light.glowColor;
  mix(out, g.x, g.y, g.z, horizonGlow(light, x, y, z));
}

/** The haze's colour toward a direction (unit), into out (GLSL hazeColorFor). */
function hazeColor(
  light: LightBlend,
  x: number,
  y: number,
  z: number,
  out: Rgb,
): void {
  const up = Math.max(z, 0);
  const n = Math.hypot(x, y, up) || 1;
  skyColor(light, x / n, y / n, up / n, out);
  const h = light.haze;
  // Looking down, the haze is the general colour of the air.
  mix(out, h.x, h.y, h.z, Math.min(0.6, clamp01(-z * 0.8)));
}

export class ChartGround {
  private readonly haze: Rgb = [0, 0, 0];
  private readonly sky: Rgb = [0, 0, 0];

  constructor(private readonly coast: CoastField) {}

  /**
   * The sea's colour at a world point (km) as the frame shows it, into out:
   * with `water` of the pale ink laid by the waterlines (waterlineInk).
   */
  sea(x: number, y: number, frame: FrameInfo, water: number, out: Rgb): void {
    const light = frame.light;
    const eye = frame.eye;
    let vx = x - eye.x;
    let vy = y - eye.y;
    let vz = -eye.z;
    const dist = Math.hypot(vx, vy, vz) || 1;
    vx /= dist;
    vy /= dist;
    vz /= dist;
    // The sea by its depth.
    const depth = Math.max(-this.coast.height(x, y), 0);
    const shelf = smoothstep(0, 1, Math.log2(1 + depth / 15) / 5.5);
    const sh = light.seaShallow;
    const dp = light.seaDeep;
    out[0] = sh.x + (dp.x - sh.x) * shelf;
    out[1] = sh.y + (dp.y - sh.y) * shelf;
    out[2] = sh.z + (dp.z - sh.z) * shelf;
    // The sky it reflects at grazing angles.
    const grazing = 1 - clamp01(-vz);
    const fresnel = grazing ** 6 * light.seaReflect;
    if (fresnel > 0) {
      skyColor(light, vx, vy, -vz, this.sky);
      mix(out, this.sky[0], this.sky[1], this.sky[2], fresnel * 0.85);
    }
    // The sun's road.
    if (light.sunDisc > 0) {
      const s = light.sunDir;
      const dAz = azimuthApart(Math.atan2(vx, vy), Math.atan2(s.x, s.y));
      const below = Math.asin(clamp01(-vz));
      const half = 1.2 * DEG + 0.35 * below;
      const road =
        Math.exp((-dAz * dAz) / (half * half)) * Math.exp(-below / (9 * DEG));
      const g = light.glowColor;
      mix(out, g.x, g.y, g.z, Math.min(0.6, Math.max(0, road * light.sunDisc)));
    }
    // The faint outer waterlines, where the label comes nearest.
    if (water > 0) {
      const p = light.inkPale;
      mix(out, p.x, p.y, p.z, water);
    }
    this.hazed(vx, vy, vz, dist, frame, out);
  }

  /** The land's colour at a world point (km) in its deepest shade, into out. */
  land(x: number, y: number, frame: FrameInfo, out: Rgb): void {
    const light = frame.light;
    const eye = frame.eye;
    let vx = x - eye.x;
    let vy = y - eye.y;
    let vz = -eye.z;
    const dist = Math.hypot(vx, vy, vz) || 1;
    vx /= dist;
    vy /= dist;
    vz /= dist;
    const hl = Math.max(this.coast.height(x, y), 0);
    const t = smoothstep(50, 2200, hl);
    const lo = light.paperLow;
    const hi = light.paperHigh;
    // The relief's deepest shade (terrain/shaders.ts: shade = gain x lit -
    // shadow x cast, the paper times 1 + 0.45 shade, tinted toward the
    // shade's colour).
    const shade = -Math.min(1, light.shadowStrength);
    const k = 1 + 0.45 * shade;
    out[0] = (lo.x + (hi.x - lo.x) * t) * k;
    out[1] = (lo.y + (hi.y - lo.y) * t) * k;
    out[2] = (lo.z + (hi.z - lo.z) * t) * k;
    const tint = light.shadeColor;
    const a = Math.min(Math.abs(shade), 1) * 0.6;
    out[0] += (out[0] * tint.x - out[0]) * a;
    out[1] += (out[1] * tint.y - out[1]) * a;
    out[2] += (out[2] * tint.z - out[2]) * a;
    this.hazed(vx, vy, vz, dist, frame, out);
  }

  /** The haze over a colour seen along (vx, vy, vz) at dist km. */
  private hazed(
    vx: number,
    vy: number,
    vz: number,
    dist: number,
    frame: FrameInfo,
    out: Rgb,
  ): void {
    hazeColor(frame.light, vx, vy, vz, this.haze);
    const hx = dist / frame.hazeVisibility;
    mix(out, this.haze[0], this.haze[1], this.haze[2], 1 - Math.exp(-hx * hx));
  }
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
