import { between, jitter, type Rng } from "@/lib/random";
import type { PathBuilder } from "../../geometry/path";
import type { Vec } from "../../geometry/vec";
import { smoothShape, smoothThrough } from "./shapes";

/**
 * Canvas rolled up along a spar: a square sail furled on its yard, a lug
 * sail rolled on its lowered yard, a headsail stowed on the jib-boom, a
 * gaff sail brailed in under its gaff. A slack roll, thickest where the
 * bunt is gathered, bulging between the gaskets that hold it and pinched
 * at each; its face lit, the edge turned to the sky a little lighter, the
 * edge turned down in shade.
 */

export interface RollInput {
  /** The spar's axis, from one end of the canvas to the other. */
  a: Vec;
  b: Vec;
  /** Which side of a→b the roll lies on: 1 the left of a→b, -1 the right. */
  side: 1 | -1;
  /** Where the roll's inner edge runs, from the axis (it may lap over the spar). */
  inner: (t: number) => number;
  /** The roll's outer edge from the axis. */
  outer: (t: number) => number;
  /** Gaskets (or brails), as positions along it, 0..1. */
  gaskets: readonly number[];
  /** How much it bulges between gaskets, as a share of its thickness. */
  bulge: number;
  rng: Rng;
}

export interface RollParts {
  body: Vec[];
  /** Strips along the edge turned up (to the sky) and the edge turned down. */
  upper: Vec[];
  lower: Vec[];
  gaskets: [Vec, Vec][];
  folds: Vec[][];
  /** The outer edge, for a glint along it. */
  edge: Vec[];
}

export function roll(r: RollInput): RollParts {
  const dx = r.b[0] - r.a[0];
  const dy = r.b[1] - r.a[1];
  const len = Math.hypot(dx, dy) || 1;
  // The left normal of a→b, turned to the roll's side.
  const nx = (-dy / len) * r.side;
  const ny = (dx / len) * r.side;
  const at = (t: number, off: number): Vec => [
    r.a[0] + dx * t + nx * off,
    r.a[1] + dy * t + ny * off,
  ];

  // Each gap between gaskets bulges by its own amount.
  const stops = [0, ...r.gaskets.filter((g) => g > 0.02 && g < 0.98), 1];
  const swell = stops.map(() => between(r.rng, 0.75, 1.25));
  const bulgeAt = (t: number) => {
    for (let i = 0; i + 1 < stops.length; i++) {
      const t0 = stops[i];
      const t1 = stops[i + 1];
      if (t >= t0 && t <= t1) {
        const f = (t - t0) / (t1 - t0 || 1);
        return Math.sin(Math.PI * f) * swell[i];
      }
    }
    return 0;
  };

  const n = 56;
  const inner: Vec[] = [];
  const outer: Vec[] = [];
  const thick: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o0 = r.inner(t);
    const base = r.outer(t);
    const th = base - o0;
    const o1 = base + th * r.bulge * (bulgeAt(t) - 0.35);
    inner.push(at(t, o0));
    outer.push(at(t, Math.max(o0 + th * 0.2, o1)));
    thick.push(Math.max(0, o1 - o0));
  }
  const body: Vec[] = [...outer, ...inner.slice().reverse()];

  // Strips: which edge faces up is the side whose normal points up.
  const outerUp = ny > 0;
  const stripAlong = (fromOuter: boolean, share: number): Vec[] => {
    const edge: Vec[] = [];
    const inside: Vec[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const o0 = r.inner(t);
      const th = thick[i];
      const wob = 1 + 0.12 * Math.sin(t * 17 + r.side);
      const s = share * wob;
      if (fromOuter) {
        edge.push(outer[i]);
        inside.push(at(t, o0 + th * (1 - s)));
      } else {
        edge.push(inner[i]);
        inside.push(at(t, o0 + th * s));
      }
    }
    return [...edge, ...inside.reverse()];
  };
  const upper = stripAlong(outerUp, outerUp ? 0.2 : 0.16);
  const lower = stripAlong(!outerUp, outerUp ? 0.38 : 0.34);

  // Gaskets: a turn of line across the roll at each, leaning a little.
  const gaskets: [Vec, Vec][] = [];
  for (const g of r.gaskets) {
    if (g <= 0.02 || g >= 0.98) continue;
    const i = Math.round(g * n);
    const lean = 0.012 + jitter(r.rng, 0.006);
    const p0 = at(g - lean, r.inner(g) - 0.01);
    const p1 = at(g + lean, r.inner(g) + thick[i] * 1.02);
    gaskets.push([p0, p1]);
  }

  // Folds: a crease or two in each gap, rising from the turned-down edge.
  const folds: Vec[][] = [];
  for (let k = 0; k + 1 < stops.length; k++) {
    const t0 = stops[k];
    const t1 = stops[k + 1];
    const count = t1 - t0 > 0.16 ? 2 : 1;
    for (let c = 0; c < count; c++) {
      const tm = t0 + (t1 - t0) * between(r.rng, 0.25, 0.75);
      const i = Math.round(tm * n);
      const th = thick[i];
      const o0 = r.inner(tm);
      const run =
        (t1 - t0) * between(r.rng, 0.12, 0.28) * (r.rng() < 0.5 ? -1 : 1);
      const fromOff = outerUp ? o0 + th * 0.12 : o0 + th * 0.88;
      const toOff = outerUp
        ? o0 + th * between(r.rng, 0.55, 0.8)
        : o0 + th * between(r.rng, 0.2, 0.45);
      folds.push([
        at(tm, fromOff),
        at(tm + run * 0.5, (fromOff + toOff) / 2 + th * 0.05),
        at(tm + run, toOff),
      ]);
    }
  }

  return { body, upper, lower, gaskets, folds, edge: outer };
}

/** Writes a roll's parts into builders. */
export function drawRoll(
  parts: RollParts,
  into: {
    body: PathBuilder;
    upper: PathBuilder;
    lower: PathBuilder;
    gaskets: PathBuilder;
    folds: PathBuilder;
  },
): void {
  const half = Math.floor(parts.body.length / 2);
  const outer = parts.body.slice(0, half);
  const inner = parts.body.slice(half).reverse();
  smoothShape(into.body, outer, inner);
  const uh = Math.floor(parts.upper.length / 2);
  smoothShape(
    into.upper,
    parts.upper.slice(0, uh),
    parts.upper.slice(uh).reverse(),
  );
  const lh = Math.floor(parts.lower.length / 2);
  smoothShape(
    into.lower,
    parts.lower.slice(0, lh),
    parts.lower.slice(lh).reverse(),
  );
  for (const [p, q] of parts.gaskets) into.gaskets.segment(p, q);
  for (const f of parts.folds) smoothThrough(into.folds, f, true);
}
