import { createRng, field, mix, rgba, softBlob } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { MOON } from "../sky/moon";
import {
  distanceAt,
  highWaterY,
  lowWaterY,
  strandY,
  waterBody,
  waterDark,
  waterLight,
} from "./shore";

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

/**
 * The Liane's channel across the strand: centre and half-width at share u.
 * It leaves the harbour's mouth between the jetty heads (x -172 and -109)
 * narrow, then meanders out across the strand, widening as it spreads.
 */
function channel(u: number): [number, number] {
  // One bend between the jetty heads, then a full S below the far and near
  // plates' seam (shares 0.35 to 0.72), so the near plate's channel meets
  // the far plate's at the seam both at the hold and as the colour comes
  // in on the dive (the seam then lies near share 0.72 of the far plate).
  const mouth = u < 0.35 ? 4 * Math.sin((Math.PI * u) / 0.35) : 0;
  const s = 6 * Math.sin((2 * Math.PI * (u - 0.35)) / 0.37);
  const cx = -140 - 3 * u + mouth + (u > 0.35 ? s : 0);
  const hw = 8 + 15 * u ** 1.2 + 1.2 * u * Math.sin(u * 19 + 1.3);
  return [cx, hw];
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
function channelPath(ua: number, ub: number, widen = 0): Path2D {
  const p = new Path2D();
  const n = 40;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = ua + ((ub - ua) * i) / n;
    const [cx, hw] = channel(u);
    const w = hw + widen * bankWidth(u, -1);
    const e = hw + widen * bankWidth(u, 1);
    left.push([cx - w, at(cx - w, u)]);
    right.push([cx + e, at(cx + e, u)]);
  }
  p.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) p.lineTo(x, y);
  for (let i = right.length - 1; i >= 0; i--)
    p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  return p;
}

/** The mud of a bank beside the channel, layer units across, uneven (side -1: north, 1: south). */
function bankWidth(u: number, side: -1 | 1): number {
  const k = side < 0 ? 0 : 2.1;
  return (
    (1.4 + 3.2 * u) *
    (0.75 + 0.3 * Math.sin(u * 23 + k) + 0.2 * Math.sin(u * 51 + k * 1.7))
  );
}

/** Side runnels draining into the channel across the wet sand: start share, side, length (shares), seed. */
const RUNNELS: readonly (readonly [number, -1 | 1, number, number])[] = [
  [0.3, 1, 0.16, 1],
  [0.46, -1, 0.2, 2],
  [0.62, 1, 0.14, 3],
  [0.78, -1, 0.12, 4],
];

/** A runnel's centre line: off the bank, curving away down the strand. */
function runnel(
  u0: number,
  side: -1 | 1,
  len: number,
  seed: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = u0 + len * t;
    const [cx, hw] = channel(u0);
    const x =
      cx + side * (hw + 2 + 26 * t ** 0.8 + 4 * Math.sin(seed * 1.3 + t * 5));
    out.push([x, u, (1 - t) * (0.6 + 0.5 * u0)]);
  }
  return out;
}

/**
 * The channel as water at low tide: a ribbon mirroring the cool eastern
 * sky, darker than the sunlit sand round it (that difference says "water"),
 * between banks of dark wet mud; broken glints along it, and the masts in
 * the basin and the jetties' piles above it mirrored as broken verticals.
 * It meanders, narrow at the mouth between the jetty heads, with side
 * runnels draining the strand into it.
 */
function paintChannel(c: PlateCanvas, ua: number, ub: number) {
  const { ctx } = c;
  const rng = createRng(911);
  // The banks: wet mud, darkest at the water's lip.
  ctx.fillStyle = rgba("#8f7a63", 0.42);
  ctx.fill(channelPath(ua, ub, 1));
  ctx.fillStyle = rgba("#6f604f", 0.4);
  ctx.fill(channelPath(ua, ub, 0.32));
  // The runnels: thin threads of water with their muddy lips.
  for (const [u0, side, len, seed] of RUNNELS) {
    if (u0 + len < ua || u0 > ub) continue;
    const pts = runnel(u0, side, len, seed);
    for (const [w, col, a] of [
      [1.8, "#8f7a63", 0.35],
      [0.9, "#a7a4b2", 0.75],
    ] as const) {
      const p = new Path2D();
      const top: [number, number][] = [];
      const bot: [number, number][] = [];
      for (const [x, u, th] of pts) {
        if (u < ua || u > ub) continue;
        const y = at(x, u);
        top.push([x, y + w * th]);
        bot.push([x, y - w * th]);
      }
      if (top.length < 2) continue;
      p.moveTo(top[0][0], top[0][1]);
      for (const [x, y] of top) p.lineTo(x, y);
      for (let i = bot.length - 1; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
      p.closePath();
      ctx.fillStyle = rgba(col, a);
      ctx.fill(p);
    }
  }
  // The water.
  const x0 = channel(ua)[0];
  const g = ctx.createLinearGradient(0, at(x0, ua), 0, at(x0, ub));
  g.addColorStop(0, "#b8b0be");
  g.addColorStop(0.5, "#aaa7b8");
  g.addColorStop(1, "#9ca2b4");
  ctx.fillStyle = g;
  ctx.fill(channelPath(ua, ub));
  ctx.save();
  ctx.clip(channelPath(ua, ub));
  // A paler lane down the middle where it lies glassy, mirroring the low sky.
  const lane = new Path2D();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const u = ua + ((ub - ua) * i) / n;
    const [cx, hw] = channel(u);
    const x = cx + hw * 0.18 * Math.sin(u * 9);
    const y = at(x, u);
    if (i === 0) lane.moveTo(x - hw * 0.35, y);
    else lane.lineTo(x - hw * 0.35, y);
  }
  for (let i = n; i >= 0; i--) {
    const u = ua + ((ub - ua) * i) / n;
    const [cx, hw] = channel(u);
    const x = cx + hw * 0.18 * Math.sin(u * 9);
    lane.lineTo(x + hw * 0.3, at(x, u));
  }
  lane.closePath();
  ctx.fillStyle = rgba("#cbc5cf", 0.4);
  ctx.fill(lane);
  // The masts in the basin and the jetties' piles, mirrored: broken
  // verticals in a few groups, each a handful of masts close together.
  ctx.beginPath();
  for (let g = 0; g < 9; g++) {
    const u = ua + (ub - ua) * (0.08 + 0.84 * rng());
    const [cx, hw] = channel(u);
    const gx = cx + (rng() - 0.5) * 1.3 * hw;
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const x = gx + (rng() - 0.5) * 0.5 * hw;
      let y = at(x, u) + (rng() - 0.5) * 0.6;
      const h = (1.5 + 3.5 * rng()) * (0.5 + 0.8 * u);
      const pieces = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < pieces; k++) {
        const l = (h / pieces) * (0.6 + 0.5 * rng());
        ctx.moveTo(x + (rng() - 0.5) * 0.3, y);
        ctx.lineTo(x + (rng() - 0.5) * 0.3, y - l);
        y -= l + (h / pieces) * (0.25 + 0.3 * rng());
      }
    }
  }
  ctx.lineWidth = c.pen(1);
  ctx.strokeStyle = rgba("#4f4640", 0.3);
  ctx.stroke();
  // Glints: short bright broken strokes across it.
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const u = ua + (ub - ua) * rng();
    const [cx, hw] = channel(u);
    const x = cx + (rng() - 0.5) * 1.6 * hw;
    const y = at(x, u) + (rng() - 0.5) * 0.3;
    const l = (1.2 + 3.5 * rng()) * (0.5 + u);
    ctx.moveTo(x - l / 2, y);
    ctx.lineTo(x + l / 2, y + (rng() - 0.5) * 0.15);
  }
  ctx.lineWidth = c.pen(1);
  ctx.strokeStyle = rgba("#f2ece8", 0.7);
  ctx.stroke();
  ctx.restore();
}

/** The channel in the engraving: paper, a few short wavelet strokes, the banks firm broken lines with the mud hatched beside them. */
function inkChannel(c: PlateCanvas, ua: number, ub: number) {
  const { ctx } = c;
  const rng = createRng(1911);
  const u0 = Math.max(CHANNEL_U0, ua);
  ctx.fillStyle = PAPER.low;
  ctx.fill(channelPath(u0, ub));
  // The banks: a firm line on the water's edge, broken now and then.
  ctx.beginPath();
  for (const side of [-1, 1] as const) {
    let on = false;
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((ub - u0) * i) / n;
      const [cx, hw] = channel(u);
      const x = cx + side * hw;
      const keep = rng() > 0.08;
      if (keep && on) ctx.lineTo(x, at(x, u));
      else if (keep) ctx.moveTo(x, at(x, u));
      on = keep;
    }
  }
  ctx.lineWidth = c.pen(0.9);
  ctx.strokeStyle = rgba(INK.line, 0.7);
  ctx.stroke();
  // The mud: short strokes along the strand beside each bank.
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const u = u0 + (ub - u0) * rng();
    const side = rng() < 0.5 ? -1 : 1;
    const [cx, hw] = channel(u);
    const x = cx + side * (hw + bankWidth(u, side) * rng());
    const l = 1 + 2.5 * rng();
    ctx.moveTo(x - l / 2, at(x, u));
    ctx.lineTo(x + l / 2, at(x + l / 2, u));
  }
  ctx.lineWidth = c.pen(0.6);
  ctx.strokeStyle = rgba(INK.hatch, 0.55);
  ctx.stroke();
  // The water: a few short wavelet strokes and the verticals of the masts mirrored.
  ctx.save();
  ctx.clip(channelPath(u0, ub));
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const u = u0 + (ub - u0) * rng();
    const [cx, hw] = channel(u);
    const x = cx + (rng() - 0.5) * 1.6 * hw;
    const y = at(x, u);
    const l = (1.5 + 3 * rng()) * (0.5 + u);
    ctx.moveTo(x - l / 2, y);
    ctx.quadraticCurveTo(x, y - 0.35, x + l / 2, y);
  }
  for (let i = 0; i < 24; i++) {
    const u = u0 + (ub - u0) * rng() ** 1.3;
    const [cx, hw] = channel(u);
    const x = cx + (rng() - 0.5) * 1.6 * hw;
    const y = at(x, u);
    const h = (0.8 + 2 * rng()) * (0.4 + 0.9 * u);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
  }
  ctx.lineWidth = c.pen(0.6);
  ctx.strokeStyle = rgba(INK.hatch, 0.6);
  ctx.stroke();
  ctx.restore();
}

/**
 * The drift line under the high-water shore: weed and wrack left by the
 * last tide, in irregular clumps gathered in groups along a wandering
 * line, with long bare gaps between the groups; never an even row.
 */
function paintDriftLine(c: PlateCanvas, ink: boolean) {
  const { ctx } = c;
  const [x0] = c.box;
  const rng = createRng(301);
  const [cx, hw] = channel(0.09);
  // Where along it the wrack lies thick, thin or not at all.
  const lie = (x: number) =>
    0.5 * Math.sin(x * 0.013 + 1.1) +
    0.3 * Math.sin(x * 0.031 + 0.4) +
    0.2 * Math.sin(x * 0.071 + 2.6);
  const heavy = new Path2D();
  const light = new Path2D();
  let x = x0 + rng() * 20;
  while (x < RIGHT) {
    const g = lie(x);
    if (g < -0.15 || Math.abs(x - cx) < hw + 6) {
      x += 6 + rng() * 26;
      continue;
    }
    // A group: a few clumps close together, the line wandering a little.
    const n = 2 + Math.floor(rng() * (3 + 5 * Math.max(0, g)));
    for (let k = 0; k < n && x < RIGHT; k++) {
      const u =
        0.085 +
        0.014 * Math.sin(x * 0.021) +
        0.006 * Math.sin(x * 0.17) +
        (rng() - 0.5) * 0.012;
      const len = (ink ? 0.8 : 1.2) + rng() * (ink ? 3.2 : 5) * (0.6 + g);
      const th = (0.18 + 0.3 * rng() * (0.6 + g)) * (ink ? 0.8 : 1);
      const y = at(x, u);
      const p = rng() < 0.35 + 0.4 * g ? heavy : light;
      p.moveTo(x, y);
      p.quadraticCurveTo(x + len / 2, y + th, x + len, y + (rng() - 0.5) * 0.2);
      p.quadraticCurveTo(x + len / 2, y - th * 0.6, x, y);
      p.closePath();
      x += len + 0.4 + rng() * 2.4;
    }
    x += 8 + rng() * 40;
  }
  if (ink) {
    ctx.fillStyle = rgba(INK.line, 0.62);
    ctx.fill(heavy);
    ctx.fillStyle = rgba(INK.hatch, 0.5);
    ctx.fill(light);
  } else {
    ctx.fillStyle = rgba("#6f604c", 0.5);
    ctx.fill(heavy);
    ctx.fillStyle = rgba("#8e7a62", 0.38);
    ctx.fill(light);
  }
}

// ------------------------------------------------------------------ ink

/** Paper under a region. */
function inkPaper(c: PlateCanvas, top: (x: number) => number, bottom: number) {
  const [x0, x1] = c.box;
  c.ctx.fillStyle = PAPER.low;
  c.ctx.fill(bandPath(across(x0, x1, 6), top, () => bottom));
}

/**
 * The strand in the engraving, between shares ua and ub: sand is dotted
 * and flicked, never ruled like the water. A light stipple on the dry
 * upper beach; on the wet sand fewer dots, short flicks along the shore
 * and clusters of ripple marks; the sheen of the wet sand (long lanes),
 * the pools and the moon's streak left as bare paper.
 */
function inkStrand(c: PlateCanvas, seed: number, ua: number, ub: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const sheen = field(seed + 3, 160, 3);
  const [x0] = c.box;
  const ps = pools(seed - 4000, ua, ub, x0);
  const bare = (x: number, u: number, y: number) => {
    const [cx, hw] = channel(u);
    return (
      Math.abs(x - MOON.x) < 6 ||
      (u > CHANNEL_U0 && Math.abs(x - cx) < hw + bankWidth(u, 1) + 1) ||
      inPool(ps, x, y) ||
      (u > 0.14 && sheen(x * 0.35, u * 260) > 0.35)
    );
  };
  // Stipple: dots, closer on the dry sand and in the wet sand's darker patches.
  const dots = new Path2D();
  // The strand's area on the plate, layer units squared: the marks' counts follow it.
  const area = (RIGHT - x0) * Math.abs(at(0, ua) - at(0, ub));
  const nDots = Math.round(area * 0.09);
  for (let i = 0; i < nDots; i++) {
    const u = ua + (ub - ua) * rng();
    const x = x0 + (RIGHT - x0) * rng();
    const y = at(x, u) + (rng() - 0.5) * 0.4;
    const keep = u < 0.12 ? 0.75 : 0.32 + 0.3 * sheen(x * 0.9, u * 400);
    if (rng() > keep || bare(x, u, y)) continue;
    const r = c.pen(0.35 + 0.35 * rng());
    dots.moveTo(x + r, y);
    dots.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = rgba(INK.hatch, 0.5);
  ctx.fill(dots);
  // Flicks along the shore on the wet sand.
  ctx.beginPath();
  for (let i = 0; i < area * 0.012; i++) {
    const u = Math.max(0.13, ua) + (ub - Math.max(0.13, ua)) * rng();
    if (u >= ub) break;
    const x = x0 + (RIGHT - x0) * rng();
    const y = at(x, u);
    if (bare(x, u, y)) continue;
    const l = 0.8 + 2.4 * rng();
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, at(x + l, u) + (rng() - 0.5) * 0.2);
  }
  ctx.lineWidth = c.pen(0.5);
  ctx.strokeStyle = rgba(INK.hatch, 0.45);
  ctx.stroke();
  // Ripple marks: small clusters of short wavy strokes, one above another.
  ctx.beginPath();
  for (let i = 0; i < area * 0.004; i++) {
    const u = Math.max(0.14, ua) + (ub - Math.max(0.14, ua)) * rng();
    if (u >= ub) break;
    const cx = x0 + (RIGHT - x0) * rng();
    if (bare(cx, u, at(cx, u))) continue;
    const n = 2 + Math.floor(rng() * 4);
    const l = 2 + 4 * rng();
    for (let k = 0; k < n; k++) {
      const x = cx + (rng() - 0.5) * 1.5;
      const y = at(x, u) - k * (0.5 + 0.35 * u);
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + l / 3,
        y + 0.25,
        x + (2 * l) / 3,
        y - 0.25,
        x + l,
        y,
      );
    }
  }
  ctx.lineWidth = c.pen(0.5);
  ctx.strokeStyle = rgba(INK.hatch, 0.42);
  ctx.stroke();
  // The pools' lower lips, fine.
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
  ctx.lineWidth = c.pen(0.55);
  ctx.strokeStyle = rgba(INK.hatch, 0.6);
  ctx.stroke();
}

// ------------------------------------------------------------------ water

/**
 * The distance the water off the edge paints at height y: its own (a
 * little farther, as the plate stands farther than the strips), but never
 * nearer than the first strip of swell's far edge, so the part the dive
 * shows below that strip's crest keeps the crest's tone and no seam opens.
 */
function edgeD(y: number): number {
  return Math.max(SWELL_FAR, distanceAt(y) * 1.35);
}

/** The first strip of swell's far edge, metres (water/swell.ts, EDGES). */
const SWELL_FAR = 190;

/** The water off the edge: its body by distance, down to `bottom`. */
function paintEdgeWater(c: PlateCanvas, bottom: number) {
  const { ctx } = c;
  const [x0, x1] = c.box;
  const xs = across(x0, x1, 6);
  const g = ctx.createLinearGradient(0, -13, 0, bottom);
  const stops = [-13, -18, -22, -26, -31, -37, -43, -55, bottom];
  for (const y of stops)
    g.addColorStop((y + 13) / (bottom + 13), waterBody(edgeD(y)));
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
    const d = edgeD(y);
    const dy = Math.max(2.4, (6000 * 6) / (d * d));
    y -= dy * (0.8 + rng() * 0.4);
    let x = x0 - rng() * 30;
    while (x < x1) {
      const len = Math.min(70, 9000 / d) * (0.5 + rng());
      const p = rng() < 0.35 ? lit : dark;
      p.moveTo(x, y);
      p.lineTo(x + len, y + (rng() - 0.5) * 0.3);
      x += len * (1.4 + rng() * 2.4);
    }
  }
  ctx.lineWidth = c.pen(0.9);
  ctx.strokeStyle = rgba(waterLight(240), 0.4);
  ctx.stroke(lit);
  ctx.strokeStyle = rgba(waterDark(240), 0.26);
  ctx.stroke(dark);
}

function inkEdge(c: PlateCanvas, seed: number, bottom: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const patch = field(seed + 5, 90, 3);
  const [x0, x1] = c.box;
  // The low-water edge: one firm line, swelling and thinning along the
  // shore's lobes, with a few irregular breaks where the swash runs up.
  const weight = (x: number) =>
    0.55 + 0.3 * Math.sin(x * 0.019 + 0.7) + 0.15 * Math.sin(x * 0.053 + 2.1);
  const breaks: [number, number][] = [];
  for (let b = x0 + 20 + rng() * 80; b < x1; b += 70 + rng() * 210)
    breaks.push([b, b + 2 + rng() * 7]);
  const edge = new Path2D();
  const step = 2;
  let open = false;
  let run: [number, number][] = [];
  const close = () => {
    if (run.length > 1) {
      edge.moveTo(run[0][0], run[0][1]);
      for (const [x, y] of run) edge.lineTo(x, y);
      for (let i = run.length - 1; i >= 0; i--) {
        const [x, y] = run[i];
        edge.lineTo(x, y - c.pen(0.5 + 0.9 * weight(x)));
      }
      edge.closePath();
    }
    run = [];
  };
  for (let x = x0; x <= x1; x += step) {
    const gap = breaks.some(([a, b]) => x > a && x < b);
    if (gap) {
      if (open) close();
      open = false;
      continue;
    }
    open = true;
    // The shore's small lobes and tongues of sand.
    const lobe =
      0.3 * Math.sin(x * 0.043 + 1.2) + 0.18 * Math.sin(x * 0.117 + 0.3);
    run.push([x, lowWaterY(x) + 0.1 + Math.max(-0.2, lobe)]);
  }
  close();
  ctx.fillStyle = rgba(INK.line, 0.8);
  ctx.fill(edge);
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
            on(farY, (c) => inkStrand(c, 1301, 0, FAR_END)),
            on(farY, (c) => inkStrand(c, 1302, 0.47, 0.72)),
            on(farY, (c) => inkStrand(c, 1303, 0.72, 0.98)),
            on(farY, (c) => {
              inkChannel(c, CHANNEL_U0, 1);
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
            (c) => {
              inkStrand(c, 1701, NEAR_U, 0.97);
              inkChannel(c, SEAM_U, 1);
            },
            (c) => inkEdge(c, 1801, y0),
          ],
  };
}

export function strandPlates(): Plate[] {
  return [backdrop(), farStrand(), nearStrand()];
}

/** For the main session: the strand's plates' depths. */
export const STRAND_DEPTHS = { deep: 1295, far: 1290, near: 480 } as const;
