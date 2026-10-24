import { createRng } from "@/lib/random";

/**
 * Low cloud in the east at daybreak: the squalls of the night had passed,
 * leaving broken cloud in the north-east and south-east quadrants (Gravina's
 * staff log). Drawn as long, flat strands of stratocumulus: a gently
 * undulating base, a top of irregular rounded heads, broken into pieces.
 * A thin strip along the underside catches the sunrise.
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
}

const f = (n: number) => String(Math.round(n * 10) / 10);

export function buildCloud(strand: CloudStrand): CloudArt {
  const rng = createRng(strand.seed);
  const body: string[] = [];
  const rim: string[] = [];
  // Break the strand into a few pieces with gaps.
  let x = strand.x0;
  while (x < strand.x1 - 20) {
    const len = Math.min(strand.x1 - x, 60 + rng() * 180);
    const a = x;
    const b = x + len;
    x = b + 8 + rng() * 40;
    const th = strand.thickness * (0.6 + rng() * 0.6);
    // Base: gently undulating, rising a little at the ends.
    const base: [number, number][] = [];
    const steps = Math.max(4, Math.round(len / 18));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = a + (b - a) * t;
      const lift = 4 * (t - 0.5) ** 2 * th * 0.35;
      base.push([px, strand.y - lift + (rng() - 0.5) * 1.2]);
    }
    // Top: a run of rounded heads, highest in the middle of the piece.
    const top: [number, number][] = [];
    let hx = b;
    while (hx > a) {
      const w = 10 + rng() * 26;
      const t = (hx - a) / (b - a);
      const h =
        th * (0.35 + 0.65 * Math.sin(Math.PI * t)) * (0.75 + rng() * 0.4);
      top.push([hx, strand.y - h * 0.55]);
      top.push([hx - w / 2, strand.y - h]);
      hx -= w;
    }
    top.push([a, strand.y - 1]);
    let d = `M${f(base[0][0])} ${f(base[0][1])}`;
    for (const p of base.slice(1)) d += `L${f(p[0])} ${f(p[1])}`;
    for (let i = 0; i < top.length - 1; i += 2) {
      const ctrl = top[i + 1] ?? top[i];
      const end = top[i + 2] ?? [a, strand.y - 1];
      d += `Q${f(ctrl[0])} ${f(ctrl[1])} ${f(end[0])} ${f(end[1])}`;
    }
    body.push(`${d}Z`);
    // Lit underside: a thin band along the base.
    const lit = base.map(
      ([px, py]) => [px, py - Math.min(2.6, th * 0.22)] as const,
    );
    let r = `M${f(base[0][0])} ${f(base[0][1])}`;
    for (const p of base.slice(1)) r += `L${f(p[0])} ${f(p[1])}`;
    for (const p of [...lit].reverse()) r += `L${f(p[0])} ${f(p[1])}`;
    rim.push(`${r}Z`);
  }
  return { body: body.join(""), rim: rim.join("") };
}

export const CLOUD_STRANDS: readonly CloudStrand[] = [
  // A long band above the sun's path, the sun rising toward it.
  { x0: -240, x1: 330, y: 478, thickness: 15, seed: 31 },
  // A thin wisp higher up.
  { x0: -90, x1: 190, y: 432, thickness: 7, seed: 32 },
  // Low and long, left of the sunrise point.
  { x0: -600, x1: -70, y: 572, thickness: 11, seed: 33 },
  // To the right, beyond the sun.
  { x0: 170, x1: 470, y: 548, thickness: 9, seed: 34 },
];
