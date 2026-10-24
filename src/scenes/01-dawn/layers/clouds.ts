import { createRng } from "@/lib/random";

/**
 * Low cloud in the east at daybreak: the squalls of the night had passed,
 * leaving broken cloud in the north-east and south-east quadrants (Gravina's
 * staff log). Drawn as long strands of stratocumulus broken into pieces: a
 * nearly flat base, a top of irregular rounded heads, and a lit underside
 * that is deepest on the side facing the sun, which rises below them.
 *
 * Coordinates: x relative to the sun's position, y from the top of the
 * viewport, both in units of 1/1000 viewport height.
 */

export interface CloudStrand {
  /** Left and right ends, relative to the sun's x. */
  x0: number;
  x1: number;
  /** Base line height. */
  y: number;
  /** Typical height of the heads above the base. */
  thickness: number;
  seed: number;
}

export interface CloudArt {
  body: string;
  rim: string;
  /** Vertical extent, for the body's gradient. */
  top: number;
  bottom: number;
}

type Pt = readonly [number, number];
const f = (n: number) => String(Math.round(n * 10) / 10);
const pt = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

export function buildCloud(strand: CloudStrand): CloudArt {
  const rng = createRng(strand.seed);
  const body: string[] = [];
  const rim: string[] = [];
  let top = strand.y;
  let x = strand.x0;
  while (x < strand.x1 - 30) {
    const len = Math.min(strand.x1 - x, 90 + rng() * 170);
    const a = x;
    const b = x + len;
    x = b + 6 + rng() * 40;
    const th = strand.thickness * (0.65 + rng() * 0.55);
    // The sun is at x = 0: light reaches each piece from that side.
    const sunward = (t: number) => ((a + b) / 2 < 0 ? t : 1 - t);

    // Base, left to right: nearly flat, lifting into rounded ends.
    const steps = Math.max(5, Math.round(len / 14));
    const base: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const end = Math.max(0, Math.abs(t - 0.5) * 2 - 0.8) / 0.2;
      base.push([
        a + len * t,
        strand.y - end ** 2 * th * 0.12 + (rng() - 0.5) * 1.2,
      ]);
    }

    // Heads, right to left: a hump per head, tallest mid-piece and thinning
    // to nothing at the ends.
    const heads: { from: Pt; to: Pt; peak: number }[] = [];
    let hx = b;
    let prev: Pt = base[base.length - 1];
    while (hx > a + 6) {
      const w = Math.min(hx - a, 12 + rng() * 26);
      const nx = hx - w;
      const t = (nx - a) / len;
      const env = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.8;
      const h = th * (0.06 + 0.94 * env) * (0.7 + rng() * 0.45);
      const to: Pt = nx <= a + 6 ? base[0] : [nx, strand.y - h * 0.62];
      heads.push({ from: prev, to, peak: strand.y - h });
      top = Math.min(top, strand.y - h);
      prev = to;
      hx = nx;
    }

    let d = `M${pt(base[0])}`;
    for (const p of base.slice(1)) d += `L${pt(p)}`;
    for (const { from, to, peak } of heads) {
      d += `C${f(from[0])} ${f(peak)} ${f(to[0])} ${f(peak)} ${pt(to)}`;
    }
    body.push(`${d}Z`);

    // Lit underside: a band along the base, deeper toward the sun and
    // tapering out at both ends, its upper edge undulating like the cloud's
    // own relief.
    const lit = base.map(([px, py], i): Pt => {
      const t = i / steps;
      const taper = Math.sin(Math.PI * t) ** 0.6;
      const depth =
        th *
        (0.1 + 0.22 * sunward(t)) *
        taper *
        (0.8 + 0.4 * Math.sin(t * 9 + a));
      return [px, py - Math.max(0.3, depth)];
    });
    let r = `M${pt(base[0])}`;
    for (const p of base.slice(1)) r += `L${pt(p)}`;
    for (const p of [...lit].reverse()) r += `L${pt(p)}`;
    rim.push(`${r}Z`);
  }
  return {
    body: body.join(""),
    rim: rim.join(""),
    top,
    bottom: strand.y,
  };
}

export const CLOUD_STRANDS: readonly CloudStrand[] = [
  // A long band above the sun's path; the sun rises toward it.
  { x0: -270, x1: 300, y: 470, thickness: 26, seed: 31 },
  // A thinner strand higher up.
  { x0: -130, x1: 170, y: 424, thickness: 13, seed: 32 },
  // Low and long, left of the sunrise point.
  { x0: -640, x1: -100, y: 566, thickness: 18, seed: 33 },
  // To the right, beyond the sun.
  { x0: 170, x1: 520, y: 542, thickness: 16, seed: 34 },
];
