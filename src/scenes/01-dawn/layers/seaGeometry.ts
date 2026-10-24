import { createRng } from "@/lib/random";

/**
 * Tiling wave strips for the sea.
 *
 * Units: 1 unit = 1/1000 of the viewport height, so every strip scales with
 * the composition (which is sized from the viewport height). A strip is
 * `tiles` periods wide: wide enough to cover a 21:9 viewport plus one period,
 * so translating its wrapper by exactly one period (xPercent = -100/tiles)
 * loops seamlessly at any window size.
 */

export const WIDEST_ASPECT = 2.4; // 21:9 is 2.39

export interface WaveComponent {
  /** Integer number of cycles per tile, so the tile repeats seamlessly. */
  k: number;
  /** Amplitude in units. */
  a: number;
}

export interface StripSpec {
  id: string;
  /** Tile period in units. */
  period: number;
  /** Strip height in units (top of the wave band to the bottom of the strip). */
  height: number;
  /** Swell components; the first is the main swell. */
  waves: readonly WaveComponent[];
  /** Crest sharpening, 0 (pure sines) to ~0.6 (peaky crests, broad troughs). */
  sharpness: number;
  /** Crest highlight thickness in units. */
  highlight: number;
  seed: number;
}

export interface StripGeometry {
  tiles: number;
  width: number;
  height: number;
  /** Wave body: top edge = wave profile, filled to the strip bottom. */
  body: string;
  /** Thin band along the crests. */
  crest: string;
  /** A faint inner band that follows the swell a little below the surface. */
  inner: string;
}

const fmt = (n: number): string => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? "0" : String(r);
};

function profile(spec: StripSpec): (x: number) => number {
  const rng = createRng(spec.seed);
  const phases = spec.waves.map(() => rng() * Math.PI * 2);
  const total = spec.waves.reduce((s, w) => s + w.a, 0) || 1;
  const { period, sharpness } = spec;
  return (x: number) => {
    let y = 0;
    spec.waves.forEach((w, i) => {
      y += w.a * Math.sin((2 * Math.PI * w.k * x) / period + phases[i]);
    });
    // Normalised to [-1, 1], then peaked: crests (negative y, upward in SVG)
    // get narrower, troughs broader.
    const s = y / total;
    const peaked = s - sharpness * (s * s - 0.33);
    return peaked * total;
  };
}

/** Catmull-Rom through samples, emitted as cubic Béziers. */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

export function buildStrip(spec: StripSpec): StripGeometry {
  const tiles = Math.ceil((WIDEST_ASPECT * 1000 + spec.period) / spec.period);
  const width = tiles * spec.period;
  const f = profile(spec);
  const amp = spec.waves.reduce((s, w) => s + w.a, 0);
  const base = amp; // the wave band sits in [0, 2 * amp]
  // Enough samples for the shortest component.
  const kMax = Math.max(...spec.waves.map((w) => w.k));
  const perTile = Math.max(24, kMax * 6);
  const n = tiles * perTile;
  const top: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * width;
    // Sample modulo one period so every tile is identical.
    top.push([x, base + f(x % spec.period)]);
  }
  const h = spec.height;
  const surface = smoothPath(top);
  const body = `${surface}L${fmt(width)} ${fmt(h)}L0 ${fmt(h)}Z`;

  // Crest band: thicker where the surface is high (crests), thin in troughs.
  const lower = top
    .map(([x, y]): [number, number] => {
      const lift = (base - y) / (amp || 1); // 1 at crests, -1 in troughs
      const t = spec.highlight * (0.35 + 0.65 * Math.max(0, lift));
      return [x, y + t];
    })
    .reverse();
  const crest = `${surface}L${fmt(lower[0][0])} ${fmt(lower[0][1])}${smoothPath(
    lower,
  )
    .slice(1)
    .replace(/^[^C]*/, "")}Z`;

  // Inner band: the swell echoed below the surface, smoothed and lower.
  const depth = Math.min(h * 0.45, amp * 3 + spec.highlight * 3);
  const innerTop = top.map(([x, y]): [number, number] => [
    x,
    base + (y - base) * 0.5 + depth,
  ]);
  const innerBottom = innerTop
    .map(([x, y]): [number, number] => [x, y + spec.highlight * 1.6])
    .reverse();
  const inner = `${smoothPath(innerTop)}L${fmt(innerBottom[0][0])} ${fmt(innerBottom[0][1])}${smoothPath(
    innerBottom,
  )
    .slice(1)
    .replace(/^[^C]*/, "")}Z`;

  return { tiles, width, height: h, body, crest, inner };
}
