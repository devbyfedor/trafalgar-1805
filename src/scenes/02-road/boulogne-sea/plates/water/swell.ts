import { createRng, rgba } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { EYE_H } from "../../scene";
import { distanceAt, waterBody, waterCrest, waterTrough } from "./shore";

/**
 * The water of the roads from the strand's edge in to the eye: a low
 * south-westerly swell with short wind waves on it, well under a metre,
 * no whitecaps (scene 1's sea language: strips of swell, far to near,
 * each with its rows of crests). Facing east with the sun behind, each
 * wave's face turned toward the eye and the sun catches warm light, the
 * troughs keep the sky's blue, and the water darkens to a deep blue-green
 * near the eye (dark under the caption, bottom left).
 *
 * Each strip is a plate with `swell` (paint/plate.ts): its art repeats
 * across every `period` units and its box reaches a period beyond the
 * frame's right edge, as BoulogneSea.tsx loops it while its crests drift
 * (to the left: the swell runs north-east, away and to the left) and it
 * rises and falls, the nearer strips later. Each reaches below its near
 * edge as far as the dive needs: the camera comes down from 60 m, nearer
 * strips move down more, and the gap a farther strip must fill opens
 * until the frame's bottom passes it.
 *
 * Its engraving: paper, short broken strokes along the crests and in the
 * troughs, following the waves, denser and heavier near.
 */

/** The strips' far edges, metres ahead at the hold, far to near. */
const EDGES = [190, 135, 97, 70, 52, 39, 30, 23] as const;

/** The frame's bottom at the hold and at the transition's start (layer units at the hold's horizon), and how far the camera comes down (m). */
const HOLD_BOTTOM = -283;
const DIVE_BOTTOM = -355;
const DIVE_DROP = 54;
const RIGHT = 892;

interface Row {
  y: number;
  amp: number;
  /** Space to the next row, layer units. */
  dy: number;
  d: number;
  seed: number;
}

interface Strip {
  i: number;
  depth: number;
  top: number;
  bottom: number;
  period: number;
  amp: number;
}

/** A strip's place: its top at the hold, and how far below it must reach for the dive. */
function strip(i: number): Strip {
  const depth = EDGES[i];
  const top = (-1000 * EYE_H) / depth;
  const next = EDGES[i + 1];
  let bottom: number;
  if (next === undefined) bottom = HOLD_BOTTOM - 9;
  else {
    const nextTop = (-1000 * EYE_H) / next;
    const h = Math.min(DIVE_DROP, (-DIVE_BOTTOM * next - 1000 * EYE_H) / 1000);
    bottom = nextTop - h * 1000 * (1 / next - 1 / depth) - 6;
  }
  const period = Math.round(Math.min(560, Math.max(120, 30000 / depth)));
  const amp = rowAmp(depth);
  return { i, depth, top, bottom, period, amp };
}

function rowAmp(d: number): number {
  return Math.min(13, 180 / d + 9000 / (d * d));
}

function rows(s: Strip): Row[] {
  const rng = createRng(800 + s.i * 31);
  const out: Row[] = [];
  let y = s.top;
  let k = 0;
  while (y > s.bottom) {
    const d = distanceAt(y);
    const dy = Math.max(2.4, (6000 * 6) / (d * d)) * (0.8 + rng() * 0.4);
    out.push({
      y,
      amp: k === 0 ? s.amp : rowAmp(d) * (0.75 + rng() * 0.5),
      dy,
      d,
      seed: 900 + s.i * 97 + k * 13,
    });
    y -= dy;
    k++;
  }
  return out;
}

/** A periodic function of x (period P): a sum of sines of whole harmonics. */
function periodic(
  seed: number,
  period: number,
  harmonics: readonly (readonly [number, number])[],
): (x: number) => number {
  const rng = createRng(seed);
  const parts = harmonics.map(([n, a]) => ({
    k: (2 * Math.PI * n) / period,
    a,
    ph: rng() * Math.PI * 2,
  }));
  return (x: number) => {
    let v = 0;
    for (const p of parts) v += p.a * Math.sin(p.k * x + p.ph);
    return v;
  };
}

const CREST: readonly (readonly [number, number])[] = [
  [1, 0.3],
  [2, 0.22],
  [3, 0.16],
  [5, 0.12],
  [8, 0.09],
  [13, 0.06],
  [21, 0.05],
];

const FACE: readonly (readonly [number, number])[] = [
  [2, 0.32],
  [3, 0.28],
  [5, 0.24],
  [7, 0.18],
  [11, 0.14],
];

interface Wave {
  crest: (x: number) => number;
  /** The lit face's depth under the crest at x, layer units (0: none). */
  face: (x: number) => number;
  trough: (x: number) => number;
}

function wave(r: Row, period: number): Wave {
  const w = periodic(r.seed, period, CREST);
  const f = periodic(r.seed + 5, period, FACE);
  const t = periodic(r.seed + 9, period, CREST);
  const tmax = Math.min(7, 0.42 * r.dy);
  return {
    crest: (x) => r.y + r.amp * w(x),
    face: (x) => tmax * Math.max(0, 0.18 + f(x)),
    trough: (x) => r.y - r.dy * 0.6 + r.amp * 0.7 * t(x),
  };
}

function xs(c: PlateCanvas, d: number): number[] {
  const [x0, x1] = c.box;
  const step = Math.min(6, Math.max(2, d / 40));
  const out: number[] = [];
  const n = Math.ceil((x1 - x0) / step);
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n);
  return out;
}

/** The strip's water: its top crest down to its bottom, body by distance. */
function bodyPath(c: PlateCanvas, s: Strip, first: Wave): Path2D {
  const p = new Path2D();
  const pts = xs(c, s.depth);
  p.moveTo(pts[0], s.bottom);
  for (const x of pts) p.lineTo(x, first.crest(x));
  p.lineTo(pts[pts.length - 1], s.bottom);
  p.closePath();
  return p;
}

function paintBody(c: PlateCanvas, s: Strip, first: Wave): void {
  const { ctx } = c;
  const top = s.top + s.amp;
  const g = ctx.createLinearGradient(0, top, 0, s.bottom);
  const n = 8;
  for (let k = 0; k <= n; k++) {
    const y = top + ((s.bottom - top) * k) / n;
    g.addColorStop(k / n, waterBody(distanceAt(Math.min(-1, y))));
  }
  ctx.fillStyle = g;
  ctx.fill(bodyPath(c, s, first));
}

function paintRows(c: PlateCanvas, s: Strip, rs: readonly Row[]): void {
  const { ctx } = c;
  for (const r of rs) {
    const wv = wave(r, s.period);
    const pts = xs(c, r.d);
    const near = Math.min(1, Math.max(0, (-r.y - 30) / 230));
    // The trough: a darker thread, the sky's blue.
    ctx.beginPath();
    pts.forEach((x, i) => {
      if (i === 0) ctx.moveTo(x, wv.trough(x));
      else ctx.lineTo(x, wv.trough(x));
    });
    ctx.lineWidth = c.pen(0.9 + 2.2 * near);
    ctx.strokeStyle = rgba(waterTrough(r.d), 0.45);
    ctx.stroke();
    // The lit face under the crest.
    const face = new Path2D();
    face.moveTo(pts[0], wv.crest(pts[0]));
    for (const x of pts) face.lineTo(x, wv.crest(x));
    for (let i = pts.length - 1; i >= 0; i--) {
      const x = pts[i];
      face.lineTo(x, wv.crest(x) - wv.face(x));
    }
    face.closePath();
    ctx.fillStyle = rgba(waterCrest(r.d), 0.5 - 0.18 * near);
    ctx.fill(face);
    // A crisp rim where the face is broad.
    ctx.beginPath();
    let on = false;
    const tmax = Math.min(7, 0.42 * r.dy);
    for (const x of pts) {
      const lit = wv.face(x) > tmax * 0.45;
      if (lit) {
        if (on) ctx.lineTo(x, wv.crest(x));
        else ctx.moveTo(x, wv.crest(x));
      }
      on = lit;
    }
    ctx.lineWidth = c.pen(0.9 + 0.6 * near);
    ctx.strokeStyle = rgba(waterCrest(r.d * 1.6), 0.5 - 0.25 * near);
    ctx.stroke();
  }
}

/** Dashes over one period, repeated across the box. */
function dashes(
  seed: number,
  period: number,
  len: number,
  gap: number,
  keep: number,
): [number, number][] {
  const rng = createRng(seed);
  // Patches of open water (the shine) between patches of strokes.
  const patch = periodic(seed + 11, period, [
    [1, 0.5],
    [2, 0.35],
    [3, 0.25],
    [5, 0.15],
  ]);
  const out: [number, number][] = [];
  let s = rng() * gap;
  while (s < period) {
    const l = len * (0.5 + rng());
    const e = Math.min(period, s + l);
    const m = Math.min(1, Math.max(0, 0.5 + 0.75 * patch((s + e) / 2)));
    if (rng() < keep * m) out.push([s, e]);
    s = e + gap * (0.3 + rng() * 1.3);
  }
  return out;
}

function strokeAlong(
  ctx: CanvasRenderingContext2D,
  c: PlateCanvas,
  f: (x: number) => number,
  ds: readonly [number, number][],
  period: number,
  step: number,
): void {
  const [x0, x1] = c.box;
  for (let m = Math.floor(x0 / period) - 1; m * period < x1; m++) {
    for (const [a, b] of ds) {
      const s = a + m * period;
      const e = b + m * period;
      if (e < x0 || s > x1) continue;
      ctx.moveTo(s, f(s));
      for (let x = s + step; x < e; x += step) ctx.lineTo(x, f(x));
      ctx.lineTo(e, f(e));
    }
  }
}

function inkRows(c: PlateCanvas, s: Strip, rs: readonly Row[]): void {
  const { ctx } = c;
  ctx.lineCap = "round";
  for (const r of rs) {
    // Some close far rows left out, so the far water never reads as ruling.
    if (r.dy < 3.4 && (r.seed * 7919) % 10 < 3) continue;
    const wv = wave(r, s.period);
    const near = Math.min(1, Math.max(0, (-r.y - 30) / 230));
    const len = Math.min(40, Math.max(5, 1200 / r.d));
    const step = Math.max(1.5, len / 6);
    // Along the crest, where the face is lit.
    ctx.beginPath();
    strokeAlong(
      ctx,
      c,
      wv.crest,
      dashes(r.seed, s.period, len, len * 0.7, 0.8),
      s.period,
      step,
    );
    ctx.lineWidth = c.pen(0.6 + 0.9 * near);
    ctx.strokeStyle = rgba(
      near > 0.5 ? INK.line : INK.hatch,
      0.62 + 0.15 * near,
    );
    ctx.stroke();
    // In the trough, shorter and broken, more near.
    ctx.beginPath();
    strokeAlong(
      ctx,
      c,
      wv.trough,
      dashes(
        r.seed + 3,
        s.period,
        len * 0.6,
        len * (1.4 - near * 0.8),
        0.55 + 0.3 * near,
      ),
      s.period,
      step,
    );
    if (near > 0.3) {
      const lower = (x: number) => wv.trough(x) - r.dy * 0.18;
      strokeAlong(
        ctx,
        c,
        lower,
        dashes(r.seed + 4, s.period, len * 0.5, len * 1.1, 0.5),
        s.period,
        step,
      );
    }
    ctx.lineWidth = c.pen(0.5 + 0.8 * near);
    ctx.strokeStyle = rgba(INK.hatch, 0.5 + 0.2 * near);
    ctx.stroke();
  }
}

function swellPlate(i: number): Plate {
  const s = strip(i);
  let memo: Row[] | null = null;
  const get = (): Row[] => {
    memo ??= rows(s);
    return memo;
  };
  const chunks = (): Row[][] => {
    const rs = get();
    const out: Row[][] = [];
    for (let k = 0; k < rs.length; k += 2) out.push(rs.slice(k, k + 2));
    return out;
  };
  const rng = createRng(4200 + i);
  const seconds = 8 + rng() * 2.5;
  // Jobs are listed before the rows exist; each picks its chunk when it runs.
  const maxChunks = 24;
  return {
    id: `swell-${i}`,
    depth: s.depth,
    box: [-RIGHT, RIGHT + s.period, s.bottom, s.top + s.amp + 1.5],
    group: "water",
    swell: {
      drift: -1200 / s.depth,
      period: s.period,
      amp: Math.min(2.4, 60 / s.depth + 0.3),
      seconds,
      delay: 0.45 * i,
    },
    jobs: (mode) => {
      const jobs: PlateJob[] = [];
      jobs.push((c) => {
        const first = wave(get()[0], s.period);
        if (mode === "colour") paintBody(c, s, first);
        else {
          c.ctx.fillStyle = PAPER.low;
          c.ctx.fill(bodyPath(c, s, first));
        }
      });
      for (let k = 0; k < maxChunks; k++)
        jobs.push((c) => {
          const part = chunks()[k];
          if (!part) return;
          if (mode === "colour") paintRows(c, s, part);
          else inkRows(c, s, part);
        });
      return jobs;
    },
  };
}

export function swellPlates(): Plate[] {
  return EDGES.map((_, i) => swellPlate(i));
}
