import { createRng, field, mix, rgba, softBlob } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { MOON } from "../sky/moon";
import { distanceAt, highWaterY, lowWaterY, strandY, waterBody } from "./shore";

/**
 * The wide wet strand at low water in front of the town and the cliffs,
 * one of the owner's key elements: a luminous band between the land's
 * foot and the sea. The dry upper beach pale under the high-water shore
 * with its drift line; below it the wet sand, a dull mirror of the lit
 * shore and the warm low sky (golden under the cliffs, mixed under the
 * town, pale under the dunes), with pools and runnels glinting, ripple
 * marks, darker wet patches, the moon's soft streak under its place, and
 * the Liane's channel running out across it from the harbour's mouth;
 * then the low-water edge, a fine bright line, and the shallow water
 * beyond it with the warm smears of the shore's reflection.
 *
 * Plates: the deep backdrop (under all the water, smooth, half
 * resolution); the far strand, its top on the high-water shore at the
 * land's depth so the two never part in the dive; the near strand with
 * the edge and the water off it. Each reaches below its near edge as far
 * as the dive needs (a plate at depth d shows 54000 / d units lower at the
 * transition's start), hidden at the hold under the nearer plates.
 *
 * Its engraving: paper, sparse broken strokes along the strand, the wet
 * shine and the moon's streak left as paper, the edge a fine broken line,
 * the water's short strokes and the reflections' broken verticals.
 */

const RIGHT = 892;

/** The far strand's band (shares of the strand) and the near strand's. */
const FAR_U = 0.33;
const NEAR_U = 0.37;
/** Where the near plate's top runs (under the far plate's art, same tones). */
const SEAM_U = 0.35;

/** The strand's tone from the high-water shore (0) to the low-water edge (1). */
const SAND: readonly (readonly [number, string])[] = [
  [0, "#ead4aa"],
  [0.06, "#e5cda3"],
  [0.1, "#d2b893"],
  [0.16, "#d6bb96"],
  [0.3, "#dec49e"],
  [0.55, "#e4cba4"],
  [0.8, "#e9d1ab"],
  [1, "#eed8b2"],
];

function sandAt(u: number): string {
  if (u <= SAND[0][0]) return SAND[0][1];
  for (let i = 1; i < SAND.length; i++) {
    const [ua, ca] = SAND[i - 1];
    const [ub, cb] = SAND[i];
    if (u <= ub) return mix(ca, cb, (u - ua) / (ub - ua));
  }
  return SAND[SAND.length - 1][1];
}

/** What the wet sand mirrors above it at x: the lit cliffs, the town, the dunes. */
function mirrorAt(x: number, rng: () => number): string {
  if (x < -340) return rng() < 0.7 ? "#e8bd7f" : "#d9b07a";
  if (x < 320) {
    const r = rng();
    return r < 0.45 ? "#e6c596" : r < 0.75 ? "#f0dcb7" : "#bba48c";
  }
  return rng() < 0.6 ? "#eedab4" : "#e2c9a2";
}

/** The Liane's channel across the strand: centre and half-width at share u. */
function channel(u: number): [number, number] {
  return [-140 + 3 * Math.sin(u * 4) - 2 * u, 11 + 19 * u];
}

const CHANNEL_U0 = 0.02;

/**
 * Where share u of the strand lies at x on the plate being painted: the
 * strand as drawn at the hold, except on the far plate, whose art carries
 * on below the hold's view (hidden there under the near plate) as the
 * strand seen from higher up in the dive (farY). Set for a job's length
 * by `on()`; painting is synchronous.
 */
let at: (x: number, u: number) => number = strandY;

function on(pos: (x: number, u: number) => number, job: PlateJob): PlateJob {
  return (c) => {
    at = pos;
    try {
      job(c);
    } finally {
      at = strandY;
    }
  };
}

/** The far plate's art drawn as at the hold down to this share. */
const FAR_END = 0.45;

/** The far plate's strand: as drawn down to FAR_END, then on down to the plate's bottom by u = 1. */
function farY(x: number, u: number): number {
  if (u <= FAR_END) return strandY(x, u);
  const y = strandY(x, FAR_END);
  return y + ((u - FAR_END) / (1 - FAR_END)) * (FAR_BOX[2] + 1 - y);
}

/** The far plate's tones below FAR_END change slowly, to meet the near plate's top in the dive. */
const farTone = (u: number): number =>
  u <= FAR_END ? u : FAR_END + (u - FAR_END) * 0.3;

/** Samples x across the box. */
function across(x0: number, x1: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.ceil((x1 - x0) / step);
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n);
  return out;
}

/** The region between two strand lines (shares ua above, ub below), as a path; ub may be a fixed y. */
function bandPath(
  xs: readonly number[],
  top: (x: number) => number,
  bottom: (x: number) => number,
): Path2D {
  const p = new Path2D();
  p.moveTo(xs[0], top(xs[0]));
  for (const x of xs) p.lineTo(x, top(x));
  for (let i = xs.length - 1; i >= 0; i--) p.lineTo(xs[i], bottom(xs[i]));
  p.closePath();
  return p;
}

/** The strand's ramp: bands following the shore, from ua to ub (tone: the share whose colour a share takes). */
function paintSand(
  c: PlateCanvas,
  ua: number,
  ub: number,
  below: number | null,
  tone: (u: number) => number = (u) => u,
) {
  const { ctx } = c;
  const [x0, x1] = c.box;
  const xs = across(x0, x1, 12);
  const n = Math.max(2, Math.round((ub - ua) * 40));
  for (let i = 0; i < n; i++) {
    const a = ua + ((ub - ua) * i) / n;
    const b = ua + ((ub - ua) * (i + 1)) / n;
    const last = i === n - 1;
    ctx.fillStyle = sandAt(tone((a + b) / 2));
    ctx.fill(
      bandPath(
        xs,
        (x) => at(x, a) + (i === 0 ? 0 : 0.15),
        (x) => (last && below !== null ? below : at(x, b) - 0.15),
      ),
    );
  }
}

interface Pool {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pools, runnels and wet patches between shares ua and ub, seeded. */
function pools(seed: number, ua: number, ub: number, x0: number): Pool[] {
  const rng = createRng(seed);
  const out: Pool[] = [];
  const n = Math.round((ub - ua) * 120);
  for (let i = 0; i < n; i++) {
    const u = ua + 0.02 + (ub - ua - 0.04) * rng();
    const x = x0 + rng() * (RIGHT - x0);
    const [cx, hw] = channel(u);
    if (Math.abs(x - cx) < hw + 12) continue;
    const y = at(x, u);
    out.push({ x, y, w: (6 + rng() * 40) * (0.5 + u), h: 0.3 + u * 0.9 });
  }
  return out;
}

function inPool(ps: readonly Pool[], x: number, y: number): boolean {
  for (const p of ps)
    if (Math.abs(x - p.x) < p.w + 2 && Math.abs(y - p.y) < p.h + 0.8)
      return true;
  return false;
}

function lens(p: Pool): Path2D {
  const path = new Path2D();
  path.ellipse(p.x, p.y, p.w, p.h, 0, 0, Math.PI * 2);
  return path;
}

/** The wet sand's mirror: soft vertical smears of the lit shore, wet patches, pools, runnels, ripple marks. */
function paintWet(
  c: PlateCanvas,
  seed: number,
  ua: number,
  ub: number,
  part: "smears" | "marks",
) {
  const { ctx } = c;
  const rng = createRng(seed);
  const [x0] = c.box;
  const span = (x: number) => at(x, ua) - at(x, ub);
  // Smears of the shore's reflection.
  for (let i = 0; i < (part === "smears" ? 130 : 0); i++) {
    const x = x0 + rng() * (RIGHT - x0);
    const u = ua + (ub - ua) * (0.2 + 0.6 * rng());
    softBlob(
      c,
      x,
      at(x, u),
      1.5 + rng() * 3.5,
      span(x) * (0.3 + rng() * 0.4),
      mirrorAt(x, rng),
      0.16 + rng() * 0.18,
    );
  }
  if (part === "smears") return;
  // Darker wet patches.
  for (let i = 0; i < 40; i++) {
    const x = x0 + rng() * (RIGHT - x0);
    const u = ua + (ub - ua) * rng();
    softBlob(
      c,
      x,
      at(x, u),
      20 + rng() * 60,
      0.8 + rng() * 1.6,
      "#bfa385",
      0.18,
    );
  }
  // Pools glinting with the sky, a darker lip under each.
  const ps = pools(seed + 1, ua, ub, x0);
  for (const p of ps) {
    const sky = p.x > -60 && p.x < 360 ? "#d7cbd0" : "#f2e1bf";
    ctx.fillStyle = rgba(sky, 0.85);
    ctx.fill(lens(p));
  }
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x - p.w * 0.8, p.y - p.h * 0.55);
    ctx.quadraticCurveTo(
      p.x,
      p.y - p.h * 1.25,
      p.x + p.w * 0.8,
      p.y - p.h * 0.55,
    );
  }
  ctx.lineWidth = c.pen(0.7);
  ctx.strokeStyle = rgba("#a08668", 0.4);
  ctx.stroke();
  // Runnels: long bright threads along the strand.
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const u = ua + (ub - ua) * (0.1 + 0.8 * rng());
    const a = x0 + rng() * (RIGHT - x0);
    const len = 30 + rng() * 150;
    const ph = rng() * 6;
    for (let k = 0; k <= 12; k++) {
      const x = a + (len * k) / 12;
      const uu = u + 0.025 * Math.sin(ph + k * 0.7);
      if (k === 0) ctx.moveTo(x, at(x, uu));
      else ctx.lineTo(x, at(x, uu));
    }
  }
  ctx.lineWidth = c.pen(1);
  ctx.strokeStyle = rgba("#f6e8cb", 0.55);
  ctx.stroke();
  // Ripple marks in clusters.
  ctx.beginPath();
  for (let i = 0; i < 70; i++) {
    const cx = x0 + rng() * (RIGHT - x0);
    const u = ua + (ub - ua) * rng();
    for (let k = 0; k < 6; k++) {
      const x = cx + (rng() - 0.5) * 30;
      const y = at(x, u) + (rng() - 0.5) * span(x) * 0.15;
      const l = 2 + rng() * 5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + l, y + (rng() - 0.5) * 0.2);
    }
  }
  ctx.lineWidth = c.pen(0.6);
  ctx.strokeStyle = rgba("#ae9576", 0.32);
  ctx.stroke();
}

/** The moon's soft streak in the wet sand under its place. */
function paintMoonStreak(c: PlateCanvas, ua: number, ub: number) {
  const { ctx } = c;
  const x = MOON.x;
  const top = at(x, ua);
  const bot = at(x, ub);
  softBlob(c, x, (top + bot) / 2, 4.5, (top - bot) * 0.55, "#fbeed4", 0.5);
  ctx.fillStyle = rgba("#fff4df", 0.3);
  ctx.fillRect(x - 0.7, bot, 1.4, top - bot);
}

/** The Liane's channel from the harbour's mouth out across the strand. */
function channelPath(ua: number, ub: number): Path2D {
  const p = new Path2D();
  const n = 24;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = ua + ((ub - ua) * i) / n;
    const [cx, hw] = channel(u);
    left.push([cx - hw, at(cx - hw, u)]);
    right.push([cx + hw, at(cx + hw, u)]);
  }
  p.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) p.lineTo(x, y);
  for (let i = right.length - 1; i >= 0; i--)
    p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  return p;
}

function paintChannel(c: PlateCanvas, ua: number, ub: number) {
  const { ctx } = c;
  const top = at(-140, ua);
  const bot = at(-140, ub);
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, "#e4d1b3");
  g.addColorStop(1, "#dac6ab");
  ctx.fillStyle = g;
  ctx.fill(channelPath(ua, ub));
  ctx.save();
  ctx.clip(channelPath(ua, ub));
  const rng = createRng(911);
  for (let i = 0; i < 18; i++) {
    const u = ua + (ub - ua) * rng();
    const [cx, hw] = channel(u);
    softBlob(
      c,
      cx + (rng() - 0.5) * hw,
      at(cx, u),
      1.5 + rng() * 3,
      3 + rng() * 4,
      rng() < 0.6 ? "#f6e7c9" : "#c6b5a6",
      0.4,
    );
  }
  ctx.restore();
  // The banks: thin darker lips.
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 24; i++) {
      const u = ua + ((ub - ua) * i) / 24;
      const [cx, hw] = channel(u);
      const x = cx + side * hw;
      if (i === 0) ctx.moveTo(x, at(x, u));
      else ctx.lineTo(x, at(x, u));
    }
  }
  ctx.lineWidth = c.pen(0.8);
  ctx.strokeStyle = rgba("#a08a70", 0.22);
  ctx.stroke();
}

/** The drift line under the high-water shore: weed and wrack, broken. */
function paintDriftLine(c: PlateCanvas, ink: boolean) {
  const { ctx } = c;
  const [x0] = c.box;
  const rng = createRng(301);
  ctx.beginPath();
  let x = x0;
  while (x < RIGHT) {
    const len = ink ? 1 + rng() * 3 : 4 + rng() * 20;
    const [cx, hw] = channel(0.09);
    if (Math.abs(x - cx) > hw + 4 && rng() > 0.15) {
      const u = 0.085 + 0.012 * Math.sin(x * 0.05);
      ctx.moveTo(x, at(x, u));
      ctx.lineTo(x + len, at(x + len, u + (rng() - 0.5) * 0.01));
    }
    x += len + (ink ? 1.5 + rng() * 3 : 1 + rng() * 6);
  }
  ctx.lineWidth = c.pen(ink ? 0.6 : 0.8);
  ctx.strokeStyle = ink ? rgba(INK.hatch, 0.7) : rgba("#8e7a62", 0.5);
  ctx.stroke();
}

// ------------------------------------------------------------------ ink

/** Paper under a region. */
function inkPaper(c: PlateCanvas, top: (x: number) => number, bottom: number) {
  const [x0, x1] = c.box;
  c.ctx.fillStyle = PAPER.low;
  c.ctx.fill(bandPath(across(x0, x1, 6), top, () => bottom));
}

/**
 * Sparse broken strokes along the strand between shares ua and ub: rows
 * following the shore, unevenly spaced and patchy, the shine (pools, the
 * channel, the moon's streak) left as paper.
 */
function inkStrand(c: PlateCanvas, seed: number, ua: number, ub: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const patch = field(seed + 3, 140, 3);
  const [x0] = c.box;
  const ps = pools(seed - 4000, ua, ub, x0);
  ctx.beginPath();
  let u = ua + 0.01;
  while (u < ub) {
    u += (0.035 + rng() * 0.03) * (1.2 - 0.5 * u);
    if (u >= ub) break;
    let x = x0 - rng() * 20;
    while (x < RIGHT) {
      const len = 3 + rng() * 12;
      const gap = 3 + rng() * 16;
      const y = at(x, u);
      const [cx, hw] = channel(u);
      const shine =
        Math.abs(x - MOON.x) < 8 ||
        (u > CHANNEL_U0 && Math.abs(x + len / 2 - cx) < hw + 3) ||
        inPool(ps, x, y);
      if (!shine && rng() < 0.35 + 0.35 * patch(x, u * 100)) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, at(x + len, u) + (rng() - 0.5) * 0.25);
      }
      x += len + gap;
    }
  }
  ctx.lineWidth = c.pen(0.55);
  ctx.strokeStyle = rgba(INK.hatch, 0.55);
  ctx.stroke();
  // The pools' lower lips and the channel's banks, fine.
  ctx.beginPath();
  for (const p of ps) {
    ctx.moveTo(p.x - p.w * 0.7, p.y - p.h * 0.5);
    ctx.quadraticCurveTo(
      p.x,
      p.y - p.h * 1.2,
      p.x + p.w * 0.7,
      p.y - p.h * 0.5,
    );
  }
  for (const side of [-1, 1]) {
    let on = false;
    for (let i = 0; i <= 30; i++) {
      const uu =
        Math.max(CHANNEL_U0, ua) + ((ub - Math.max(CHANNEL_U0, ua)) * i) / 30;
      const [cx, hw] = channel(uu);
      const x = cx + side * hw;
      const keep = rng() > 0.45;
      if (keep && on) ctx.lineTo(x, at(x, uu));
      else if (keep) ctx.moveTo(x, at(x, uu));
      on = keep;
    }
  }
  ctx.lineWidth = c.pen(0.55);
  ctx.strokeStyle = rgba(INK.hatch, 0.6);
  ctx.stroke();
}

// ------------------------------------------------------------------ water

/** The water off the edge: its body by distance, down to `bottom`. */
function paintEdgeWater(c: PlateCanvas, bottom: number) {
  const { ctx } = c;
  const [x0, x1] = c.box;
  const xs = across(x0, x1, 6);
  const g = ctx.createLinearGradient(0, -13, 0, bottom);
  const stops = [-13, -18, -22, -26, -31, -40, -55, -75, -105, -150, bottom];
  for (const y of stops)
    g.addColorStop((y + 13) / (bottom + 13), waterBody(distanceAt(y) * 1.35));
  ctx.fillStyle = g;
  ctx.fill(
    bandPath(
      xs,
      (x) => lowWaterY(x),
      () => bottom,
    ),
  );
}

/** Warm smears of the lit shore in the shallow water, wavelets across them. */
function paintEdgeLight(c: PlateCanvas, seed: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const [x0] = c.box;
  for (let i = 0; i < 300; i++) {
    const x = x0 + rng() * (RIGHT - x0);
    const e = lowWaterY(x);
    const tone = mirrorAt(x, rng);
    const strong = x < -340 ? 1 : 0.7;
    softBlob(
      c,
      x,
      e - 3 - rng() * 7,
      1.2 + rng() * 2.6,
      3 + rng() * 6,
      tone,
      (0.16 + rng() * 0.2) * strong,
    );
  }
  ctx.beginPath();
  for (let i = 0; i < 200; i++) {
    const x = x0 + rng() * (RIGHT - x0);
    const e = lowWaterY(x);
    const h = 1.5 + rng() * 5;
    const top = e - 0.6 - rng() * 2;
    ctx.rect(x, top - h, 0.6 + rng() * 1.4, h);
  }
  ctx.fillStyle = rgba("#ecd0a0", 0.22);
  ctx.fill();
  // Wavelets: thin lines following the edge, lighter and darker by turns.
  const [, x1] = c.box;
  const light = new Path2D();
  const dark = new Path2D();
  for (let k = 0; k < 9; k++) {
    const off = 1.3 + k * (1.4 + k * 0.25);
    let x = x0 - rng() * 10;
    while (x < x1) {
      const len = 6 + rng() * 30;
      const gap = 2 + rng() * 10;
      const path = rng() < 0.5 ? light : dark;
      const y = (xx: number) =>
        lowWaterY(xx) - off + Math.sin(xx * 0.09 + k) * 0.25;
      path.moveTo(x, y(x));
      path.lineTo(x + len / 2, y(x + len / 2) + 0.15);
      path.lineTo(x + len, y(x + len));
      x += len + gap;
    }
  }
  ctx.lineWidth = c.pen(0.8);
  ctx.strokeStyle = rgba("#ead6b4", 0.32);
  ctx.stroke(light);
  ctx.strokeStyle = rgba("#77808c", 0.3);
  ctx.stroke(dark);
}

/** Small wave marks on the water below the edge (seen in the dive, under the strips at the hold). */
function paintEdgeWaves(
  c: PlateCanvas,
  seed: number,
  from: number,
  to: number,
) {
  const { ctx } = c;
  const rng = createRng(seed);
  const [x0, x1] = c.box;
  const lit = new Path2D();
  const dark = new Path2D();
  let y = from;
  while (y > to) {
    const d = distanceAt(y);
    const dy = Math.max(2.6, (6000 * 6) / (d * d));
    y -= dy * (0.8 + rng() * 0.4);
    let x = x0 - rng() * 30;
    while (x < x1) {
      const len = Math.min(40, 600 / d) * (0.6 + rng());
      const amp = Math.min(3, 120 / d);
      const p = rng() < 0.55 ? lit : dark;
      p.moveTo(x, y);
      p.quadraticCurveTo(x + len / 2, y + amp, x + len, y);
      x += len * (1.1 + rng() * 1.2);
    }
  }
  ctx.lineWidth = c.pen(1);
  ctx.strokeStyle = rgba("#c9ae86", 0.28);
  ctx.stroke(lit);
  ctx.strokeStyle = rgba("#2f4554", 0.3);
  ctx.stroke(dark);
}

function inkEdge(c: PlateCanvas, seed: number, bottom: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const patch = field(seed + 5, 90, 3);
  const [x0, x1] = c.box;
  // The low-water edge: a fine broken line.
  ctx.beginPath();
  let x = x0;
  while (x < x1) {
    const len = 5 + rng() * 24;
    const skip = rng() < 0.2;
    if (!skip) ctx.moveTo(x, lowWaterY(x));
    for (let k = 1; k <= 4; k++) {
      const xx = x + (len * k) / 4;
      if (!skip) ctx.lineTo(xx, lowWaterY(xx) + (rng() - 0.5) * 0.2);
    }
    x += len + (rng() < 0.15 ? 25 + rng() * 80 : 2 + rng() * 12);
  }
  ctx.lineWidth = c.pen(0.75);
  ctx.strokeStyle = rgba(INK.line, 0.75);
  ctx.stroke();
  // The shore's reflection: broken verticals just off the edge, more under the cliffs.
  ctx.beginPath();
  for (let i = 0; i < 230; i++) {
    const xx = x0 + rng() * (x1 - x0);
    if (xx > -340 && rng() < 0.6) continue;
    const e = lowWaterY(xx) - 1 - rng() * 6;
    let y = e;
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const h = 1 + rng() * 2.5;
      ctx.moveTo(xx, y);
      ctx.lineTo(xx, y - h);
      y -= h + 0.8 + rng() * 1.5;
    }
  }
  ctx.lineWidth = c.pen(0.55);
  ctx.strokeStyle = rgba(INK.hatch, 0.6);
  ctx.stroke();
  // The water: short broken strokes along wavelets, closer and stronger down.
  ctx.beginPath();
  let y = -14;
  while (y > bottom) {
    const d = distanceAt(y);
    y -= Math.max(1.6, (6000 * 4) / (d * d)) * (0.75 + rng() * 0.5);
    let xx = x0 - rng() * 20;
    const near = Math.min(1, Math.max(0, (-y - 20) / 160));
    while (xx < x1) {
      const len = (3 + rng() * 10) * (1 + near * 2);
      const top = Math.min(lowWaterY(xx), lowWaterY(xx + len)) - 0.8;
      if (
        y < top &&
        rng() <
          (0.45 + near * 0.35) *
            (0.35 + 0.65 * Math.max(0, 0.5 + 0.5 * patch(xx, y)))
      ) {
        const amp = Math.min(2.5, 60 / d);
        ctx.moveTo(xx, y);
        ctx.quadraticCurveTo(xx + len / 2, y + amp, xx + len, y);
      }
      xx += len + 2 + rng() * 14;
    }
  }
  ctx.lineWidth = c.pen(0.7);
  ctx.strokeStyle = rgba(INK.hatch, 0.6);
  ctx.stroke();
}

// ------------------------------------------------------------------ plates

const DEEP_BOX = [-909, RIGHT, -330, -4.2] as const;
const FAR_BOX = [-921, RIGHT, -86, -4] as const;
const NEAR_BOX = [-928, RIGHT, -212, -8.8] as const;

function backdrop(): Plate {
  const top = (x: number) => highWaterY(x) - 0.4;
  return {
    id: "water-deep",
    depth: 1295,
    box: DEEP_BOX,
    group: "water",
    resolution: { colour: 0.5, ink: 0.5 },
    jobs: (mode) => [
      (c) => {
        const { ctx } = c;
        const [x0, x1, y0] = c.box;
        if (mode === "ink") {
          inkPaper(c, top, y0);
          return;
        }
        const g = ctx.createLinearGradient(0, -5, 0, y0);
        const stops: [number, string][] = [
          [-5, "#e2c9a2"],
          [-22, "#dcc5a2"],
          [-30, "#a19c99"],
          [-60, "#5d6f7b"],
          [-120, "#33495a"],
          [y0, "#1f3541"],
        ];
        for (const [y, col] of stops) g.addColorStop((y + 5) / (y0 + 5), col);
        ctx.fillStyle = g;
        ctx.fill(bandPath(across(x0, x1, 12), top, () => y0));
      },
    ],
  };
}

function farStrand(): Plate {
  const [, , y0] = FAR_BOX;
  return {
    id: "strand-far",
    depth: 1290,
    box: FAR_BOX,
    group: "water",
    jobs: (mode) =>
      mode === "colour"
        ? [
            on(farY, (c) => paintSand(c, 0, 0.25, null, farTone)),
            on(farY, (c) => paintSand(c, 0.25, 0.5, null, farTone)),
            on(farY, (c) => paintSand(c, 0.5, 1, y0, farTone)),
            on(farY, (c) => paintWet(c, 1201, 0.12, FAR_U, "smears")),
            on(farY, (c) => paintWet(c, 1701, 0.12, FAR_U, "smears")),
            on(farY, (c) => paintWet(c, 1201, 0.12, FAR_U, "marks")),
            // The art below the hold's view, in four bands so no job runs long.
            ...[0.47, 0.6, 0.73, 0.86].flatMap((u, k) => [
              on(farY, (c) => paintWet(c, 1210 + k, u, u + 0.12, "smears")),
              on(farY, (c) => paintWet(c, 1710 + k, u, u + 0.12, "smears")),
              on(farY, (c) => paintWet(c, 1210 + k, u, u + 0.12, "marks")),
            ]),
            on(farY, (c) => {
              paintMoonStreak(c, 0.1, FAR_U);
              paintMoonStreak(c, 0.47, 0.98);
              paintChannel(c, CHANNEL_U0, 1);
              paintDriftLine(c, false);
            }),
          ]
        : [
            (c) => inkPaper(c, (x) => strandY(x, 0), y0),
            on(farY, (c) => {
              inkStrand(c, 1301, 0.1, FAR_U);
              inkStrand(c, 1302, 0.47, 0.98);
              paintDriftLine(c, true);
            }),
          ],
  };
}

function nearStrand(): Plate {
  const [, , y0] = NEAR_BOX;
  const seam = (x: number) => at(x, SEAM_U);
  return {
    id: "strand-edge",
    depth: 480,
    box: NEAR_BOX,
    group: "water",
    jobs: (mode) =>
      mode === "colour"
        ? [
            (c) => {
              paintSand(c, SEAM_U, 1, -40);
              paintEdgeWater(c, y0);
            },
            (c) => paintWet(c, 1401, NEAR_U, 0.97, "smears"),
            (c) => paintWet(c, 1901, NEAR_U, 0.97, "smears"),
            (c) => paintWet(c, 1401, NEAR_U, 0.97, "marks"),
            (c) => {
              paintMoonStreak(c, NEAR_U, 0.99);
              paintChannel(c, SEAM_U, 1);
            },
            (c) => {
              const { ctx } = c;
              // The wettest margin and the swash's bright line.
              const [x0, x1] = c.box;
              const xs = across(x0, x1, 4);
              ctx.beginPath();
              xs.forEach((x, i) => {
                const y = lowWaterY(x) + 0.5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.lineWidth = c.pen(2.2);
              ctx.strokeStyle = rgba("#c4a888", 0.35);
              ctx.stroke();
              ctx.beginPath();
              xs.forEach((x, i) => {
                const y = lowWaterY(x) - 0.2 + Math.sin(x * 0.21) * 0.15;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.lineWidth = c.pen(1.1);
              ctx.strokeStyle = rgba("#f8ecd3", 0.85);
              ctx.stroke();
              paintEdgeLight(c, 1501);
            },
            (c) => paintEdgeWaves(c, 1601, -26, y0),
          ]
        : [
            (c) => inkPaper(c, seam, y0),
            (c) => inkStrand(c, 1701, NEAR_U, 0.97),
            (c) => inkEdge(c, 1801, y0),
          ],
  };
}

export function strandPlates(): Plate[] {
  return [backdrop(), farStrand(), nearStrand()];
}

/** For the main session: the strand's plates' depths. */
export const STRAND_DEPTHS = { deep: 1295, far: 1290, near: 480 } as const;
