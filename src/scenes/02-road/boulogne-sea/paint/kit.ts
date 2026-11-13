import { createRng } from "@/lib/random";
import type { PlateCanvas } from "./plate";

/**
 * The painting's drawing kit: the few things every plate draws with, in
 * layer units (y up; plate.ts). Scene 1's painted language, carried into
 * rasters (docs/decisions.md, "Scene 1"): multi-stop ramps, translucent
 * washes stacked, soft radial glows, seeded irregularity, light from one
 * side; no photo texture, no noise grain, no filter or blur. And the
 * engraving's: outlines and hatching in the chart's inks, following form.
 */

export type Pt = readonly [number, number];

export { createRng };

// ------------------------------------------------------------------ colour

function parse(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix of two hex colours (sRGB), t in 0..1. */
export function mix(a: string, b: string, t: number): string {
  const [r0, g0, b0] = parse(a);
  const [r1, g1, b1] = parse(b);
  const k = Math.min(1, Math.max(0, t));
  return toHex(r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k);
}

/** A hex colour with an alpha, as CSS. */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha)).toFixed(3)})`;
}

/** Relative luminance (WCAG) of a hex colour. */
export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parse(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// ------------------------------------------------------------------ noise

/** Seeded smooth noise on a line: a sum of sines of the given periods and amplitudes. */
export function wobble(
  seed: number,
  scales: readonly (readonly [period: number, amp: number])[],
): (x: number) => number {
  const rng = createRng(seed);
  const parts = scales.map(([period, amp]) => ({
    k: (2 * Math.PI) / period,
    amp,
    phase: rng() * Math.PI * 2,
  }));
  return (x: number) => {
    let y = 0;
    for (const p of parts) y += p.amp * Math.sin(p.k * x + p.phase);
    return y;
  };
}

/**
 * Seeded smooth noise on the plane, about -1..1: a sum of a few rotated
 * sine waves (no lattice, so no grid shows), for patchy washes and the
 * spacing of hatching.
 */
export function field(
  seed: number,
  scale: number,
  octaves = 3,
): (x: number, y: number) => number {
  const rng = createRng(seed);
  const waves: { kx: number; ky: number; phase: number; amp: number }[] = [];
  let amp = 1;
  let sum = 0;
  for (let o = 0; o < octaves; o++) {
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI;
      const f = ((2 * Math.PI) / scale) * 2 ** o * (0.8 + rng() * 0.4);
      waves.push({
        kx: Math.cos(a) * f,
        ky: Math.sin(a) * f,
        phase: rng() * Math.PI * 2,
        amp,
      });
      sum += amp;
    }
    amp *= 0.5;
  }
  return (x: number, y: number) => {
    let v = 0;
    for (const w of waves) v += w.amp * Math.sin(w.kx * x + w.ky * y + w.phase);
    return (v / sum) * 1.6;
  };
}

// ------------------------------------------------------------------ paths

/** A Path2D through points (layer units), closed or open, straight segments. */
export function polyPath(points: readonly Pt[], closed = true): Path2D {
  const p = new Path2D();
  if (points.length === 0) return p;
  p.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) p.lineTo(points[i][0], points[i][1]);
  if (closed) p.closePath();
  return p;
}

/** A smooth Path2D through points (Catmull-Rom as cubic Béziers). */
export function smoothPath(
  points: readonly Pt[],
  closed = true,
  tension = 0.5,
): Path2D {
  const p = new Path2D();
  const n = points.length;
  if (n < 3) return polyPath(points, closed);
  const at = (i: number): Pt =>
    closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  p.moveTo(points[0][0], points[0][1]);
  const last = closed ? n : n - 1;
  const t = tension / 3;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    p.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * t,
      p1[1] + (p2[1] - p0[1]) * t,
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
      p2[0],
      p2[1],
    );
  }
  if (closed) p.closePath();
  return p;
}

/** Points along a polyline perturbed sideways by seeded noise (a hand-drawn line). */
export function jitterLine(
  points: readonly Pt[],
  seed: number,
  amp: number,
  period = 12,
): Pt[] {
  const w = wobble(seed, [
    [period, amp],
    [period / 2.7, amp * 0.4],
  ]);
  const out: Pt[] = [];
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    if (i > 0)
      s += Math.hypot(
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      );
    const o = w(s);
    out.push([points[i][0] - (dy / len) * o, points[i][1] + (dx / len) * o]);
  }
  return out;
}

/** Samples y = f(x) from x0 to x1 every `step`, as points. */
export function sample(
  x0: number,
  x1: number,
  step: number,
  f: (x: number) => number,
): Pt[] {
  const out: Pt[] = [];
  const n = Math.max(1, Math.ceil((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    out.push([x, f(x)]);
  }
  return out;
}

// ------------------------------------------------------------------ fills

/** A vertical ramp from `top` (y1) to `bottom` (y0) through evenly spaced colours. */
export function vRamp(
  ctx: CanvasRenderingContext2D,
  y1: number,
  y0: number,
  colours: readonly string[],
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y1, 0, y0);
  colours.forEach((c, i) => {
    g.addColorStop(colours.length > 1 ? i / (colours.length - 1) : 0, c);
  });
  return g;
}

/** A ramp along a line through stops at given offsets. */
export function ramp(
  ctx: CanvasRenderingContext2D,
  from: Pt,
  to: Pt,
  stops: readonly (readonly [number, string])[],
): CanvasGradient {
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

/**
 * A soft elliptical glow or wash: a radial gradient from `colour` at
 * `alpha` in the middle to nothing at the rim, squashed to rx × ry.
 */
export function softBlob(
  c: PlateCanvas,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colour: string,
  alpha: number,
  falloff: readonly (readonly [number, number])[] = [
    [0, 1],
    [0.45, 0.55],
    [1, 0],
  ],
): void {
  const { ctx } = c;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [o, a] of falloff) g.addColorStop(o, rgba(colour, alpha * a));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Painterly unevenness inside a region: a few dozen soft translucent
 * patches of a colour, seeded, so a large fill is never flat (scene 1's
 * stacked translucent fills, done as washes). Clip to the region first.
 */
export function mottle(
  c: PlateCanvas,
  region: readonly [number, number, number, number],
  seed: number,
  colour: string,
  alpha: number,
  count: number,
  size: readonly [number, number],
  squash = 0.35,
): void {
  const rng = createRng(seed);
  const [x0, x1, y0, y1] = region;
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    const r = size[0] + rng() * (size[1] - size[0]);
    softBlob(c, x, y, r, r * squash, colour, alpha * (0.4 + rng() * 0.6));
  }
}

// ------------------------------------------------------------------ hatching

export interface HatchOptions {
  /** Degrees from the x axis, counter-clockwise (y up). */
  angle: number;
  /** Distance between lines, device px. */
  spacing: number;
  /** Line width, device px. */
  width: number;
  colour: string;
  alpha?: number;
  /** Lines break into dashes of this length (device px) with gaps; 0: unbroken. */
  dash?: number;
  /** Seeded wobble of each line, device px. */
  wobble?: number;
  seed?: number;
  /** A density field (0..1) by position: where a line's piece is drawn. */
  density?: (x: number, y: number) => number;
}

/**
 * Parallel hatching over a box (layer units), to be clipped by the caller
 * to a region: the engraver's way of laying a tone, and the painter's for
 * fields and hills (the owner: hatching, not flat fill).
 */
export function hatch(
  c: PlateCanvas,
  box: readonly [number, number, number, number],
  o: HatchOptions,
): void {
  const { ctx } = c;
  const [x0, x1, y0, y1] = box;
  const a = (o.angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  // Normal to the lines.
  const nx = -uy;
  const ny = ux;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2;
  const step = c.pen(o.spacing);
  const rng = createRng(o.seed ?? 7);
  const wob = c.pen(o.wobble ?? 0);
  const dash = o.dash ? c.pen(o.dash) : 0;
  ctx.strokeStyle = rgba(o.colour, o.alpha ?? 1);
  ctx.lineWidth = c.pen(o.width);
  ctx.beginPath();
  const pieces = Math.max(2, Math.ceil((2 * half) / (dash || half / 6)));
  for (let s = -half; s <= half; s += step * (0.85 + rng() * 0.3)) {
    const bx = cx + nx * s;
    const by = cy + ny * s;
    const phase = rng() * 10;
    let pen = false;
    for (let i = 0; i <= pieces; i++) {
      const t = -half + (2 * half * i) / pieces;
      const off = wob ? Math.sin(t / (step * 9) + phase) * wob : 0;
      const x = bx + ux * t + nx * off;
      const y = by + uy * t + ny * off;
      let on = true;
      if (dash) on = (i + Math.floor(phase)) % 3 !== 0;
      if (on && o.density) on = rng() < o.density(x, y);
      if (on) {
        if (!pen) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        pen = true;
      } else pen = false;
    }
  }
  ctx.stroke();
}

/** Clips the context to a path (layer units) for what follows, inside save/restore. */
export function clipTo(c: PlateCanvas, p: Path2D): void {
  c.ctx.clip(p);
}
