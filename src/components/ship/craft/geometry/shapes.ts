import type { PathBuilder } from "../../geometry/path";
import { lerp, type Vec } from "../../geometry/vec";
import type { CraftHullSpec } from "../types";

/**
 * Shapes shared by the craft's geometry. Some are copies of private helpers
 * elsewhere (smallcraft.ts's railAt, rig.ts's yard taper, sails.ts's
 * Catmull-Rom, hull.ts's circle): copied, not imported, so those files and
 * what they draw stay exactly as they are.
 */

/** Height of the top of the side at x (smallcraft.ts's railAt). */
export function railAt(h: CraftHullSpec, x: number): number {
  const [aft, low, fwd] = h.rail;
  if (x <= h.lowX) {
    const t = (h.lowX - x) / (h.lowX + h.sternRake);
    return low + (aft - low) * t * t;
  }
  const t = (x - h.lowX) / (h.length + h.stemRake - h.lowX);
  return low + (fwd - low) * t * t;
}

/** A line below the rail keeping `sheer` of its rise: its height at x. */
export function sheerLine(
  h: CraftHullSpec,
  drop: number,
  sheer: number,
  x: number,
): number {
  const low = h.rail[1];
  return low - drop + (railAt(h, x) - low) * sheer;
}

/** The deck (an open boat's floor), at a fixed depth under the rail. */
export function deckAt(h: CraftHullSpec, x: number): number {
  return railAt(h, x) - (h.rail[1] - h.deck);
}

/**
 * x of the stern's profile at height y: a raked transom, or a curved post
 * on a double-ended hull (smallcraft.ts's outline, continued below the
 * water as its line to [0.15, -1] runs).
 */
export function sternX(h: CraftHullSpec, y: number): number {
  if (y <= 0) return 0.15 * -y;
  const t = Math.min(1, y / h.rail[0]);
  return -h.sternRake * (h.pointed ? t ** 1.6 : t);
}

/** x of the stem's profile at height y (smallcraft.ts's, and its forefoot). */
export function stemX(h: CraftHullSpec, y: number): number {
  if (y <= 0) return h.length + 0.5 * y;
  const t = Math.min(1, y / h.rail[2]);
  return h.length + h.stemRake * t ** 1.3;
}

/** The hull's outline: up the stern, along the sheer, down the stem. */
export function hullPoints(h: CraftHullSpec, below: number): Vec[] {
  const pts: Vec[] = [];
  const [aft, , fwd] = h.rail;
  for (let i = 0; i <= 10; i++) {
    const y = -below + ((aft + below) * i) / 10;
    pts.push([sternX(h, y), y]);
  }
  const x0 = -h.sternRake;
  const x1 = h.length + h.stemRake;
  for (let i = 1; i < 48; i++) {
    const x = x0 + ((x1 - x0) * i) / 48;
    pts.push([x, railAt(h, x)]);
  }
  for (let i = 0; i <= 14; i++) {
    const y = fwd - ((fwd + below) * i) / 14;
    pts.push([stemX(h, y), y]);
  }
  return pts;
}

/** A tapered spar from a to b, widths wa and wb (rig.ts's taperedSpar). */
export function taper(a: Vec, b: Vec, wa: number, wb: number): Vec[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
    [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
  ];
}

/**
 * Part of a tapered spar's width, as a strip along it: `from` and `to` run
 * across it from -0.5 (the side to the left of a→b) to 0.5. Looking up a
 * mast (a below b), -0.5 is its after side, 0.5 its fore side.
 */
export function strip(
  a: Vec,
  b: Vec,
  wa: number,
  wb: number,
  from: number,
  to: number,
): Vec[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // The normal pointing to the right of a→b.
  const nx = dy / len;
  const ny = -dx / len;
  const at = (p: Vec, w: number, s: number): Vec => [
    p[0] + nx * w * s,
    p[1] + ny * w * s,
  ];
  return [at(a, wa, from), at(b, wb, from), at(b, wb, to), at(a, wa, to)];
}

/**
 * A yard face-on, tapered by Steel's rule: from the slings outward the
 * diameter is 30/31 at the first quarter, 7/8 at the second, 7/10 at the
 * third and 3/7 at the arms (rig.ts's yardShape). `part` keeps the upper
 * ("top") or lower ("bottom") half only.
 */
const YARD_TAPER = [
  [0, 1],
  [0.25, 30 / 31],
  [0.5, 7 / 8],
  [0.75, 7 / 10],
  [1, 3 / 7],
] as const;

export function yardShape(
  centre: Vec,
  half: number,
  d: number,
  part: "whole" | "top" | "bottom" = "whole",
): Vec[] {
  const [cx, cy] = centre;
  const top: Vec[] = [];
  const bottom: Vec[] = [];
  const up = part === "bottom" ? 0 : 1;
  const down = part === "top" ? 0 : 1;
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? [...YARD_TAPER].reverse() : YARD_TAPER.slice(1);
    for (const [t, k] of side) {
      top.push([cx + sign * half * t, cy + (up * d * k) / 2]);
      bottom.push([cx + sign * half * t, cy - (down * d * k) / 2]);
    }
  }
  return [...top, ...bottom.reverse()];
}

/** The diameter of a Steel-tapered yard at t (0: slings, 1: arm). */
export function yardDiameter(d: number, t: number): number {
  const u = Math.min(1, Math.abs(t));
  for (let i = 1; i < YARD_TAPER.length; i++) {
    const [t1, k1] = YARD_TAPER[i];
    const [t0, k0] = YARD_TAPER[i - 1];
    if (u <= t1) return d * (k0 + ((k1 - k0) * (u - t0)) / (t1 - t0));
  }
  return d * YARD_TAPER[YARD_TAPER.length - 1][1];
}

/** Catmull-Rom through points, appended to a builder (moveTo if `start`); sails.ts's. */
export function smoothThrough(
  b: PathBuilder,
  pts: readonly Vec[],
  start: boolean,
): void {
  if (start) b.moveTo(pts[0]);
  else b.lineTo(pts[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    b.cubicTo(
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    );
  }
}

/** A closed smooth shape through an outline (upper edge then lower edge reversed). */
export function smoothShape(
  b: PathBuilder,
  upper: readonly Vec[],
  lower: readonly Vec[],
): void {
  smoothThrough(b, upper, true);
  smoothThrough(b, [...lower].reverse(), false);
  b.close();
}

/** A small circle as a closed subpath (hull.ts's). */
export function circle(b: PathBuilder, c: Vec, r: number): void {
  b.moveTo([c[0] - r, c[1]])
    .quadTo([c[0] - r, c[1] + r], [c[0], c[1] + r])
    .quadTo([c[0] + r, c[1] + r], [c[0] + r, c[1]])
    .quadTo([c[0] + r, c[1] - r], [c[0], c[1] - r])
    .quadTo([c[0] - r, c[1] - r], [c[0] - r, c[1]])
    .close();
}

/** An arc of a circle as an open polyline, angles in radians (counter-clockwise, y up). */
export function arc(
  c: Vec,
  r: number,
  a0: number,
  a1: number,
  steps = 8,
): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return pts;
}

/** A band of width w either side of a polyline (for ropes drawn as fills, bands along curves). */
export function ribbon(pts: readonly Vec[], w0: number, w1 = w0): Vec[] {
  const left: Vec[] = [];
  const right: Vec[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const w = (w0 + ((w1 - w0) * i) / Math.max(1, pts.length - 1)) / 2;
    const nx = (-dy / len) * w;
    const ny = (dx / len) * w;
    left.push([pts[i][0] + nx, pts[i][1] + ny]);
    right.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  return [...left, ...right.reverse()];
}

/** Points along a quadratic Bézier. */
export function quadPoints(a: Vec, c: Vec, b: Vec, steps: number): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ab = lerp(a, c, t);
    const cb = lerp(c, b, t);
    pts.push(lerp(ab, cb, t));
  }
  return pts;
}

/** Points sampled along x on a function y(x). */
export function sampleX(
  x0: number,
  x1: number,
  steps: number,
  y: (x: number) => number,
): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push([x, y(x)]);
  }
  return pts;
}
