import {
  createRng,
  field,
  mix,
  type Pt,
  rgba,
  softBlob,
  wobble,
} from "../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../paint/plate";
import { aerial } from "../scene";
import { type Box, brokenLine, penAt, strokeLines } from "./town/kit";

/**
 * The hills inland (brief, "Owner review": hills with fields and hedges,
 * drawn in hatching, not flat fill): Mont Lambert's broad top to the right
 * of the belfry, its north-west shoulder falling into a saddle behind the
 * upper town, so the belfry's octagon, spire and telegraph stand against
 * the sky (history-notes.md, "The belfry is the skyline's one tower": the
 * ground straight behind is the lower north-west shoulder, the summit
 * 2-6° to the right); the Boulonnais' ridges falling away to the north
 * and, past the Liane's valley, rising again to the south; a farther,
 * paler ridge showing through the gaps.
 *
 * The face is laid out as the land lies: bands along the contours, thinner
 * toward the skyline as the slope turns away, each band cut into fields at
 * its own places with sides slanting down the fall line, so no seam runs
 * on from band to band. August in the Boulonnais: pale gold stubble and
 * standing wheat, oats, dark pasture and fresh aftermath, brown fallow and
 * plough. The bocage's hedges are rows of small crowns along some field
 * edges, with gaps; copses are clusters of crowns, dark and cool on the
 * right, rimmed gold on top. A step darker and warmer than the sky at the
 * horizon, softened by 5 km of evening air.
 *
 * Heights at the land's licence (scene.ts VEX): Mont Lambert, 187 m about
 * 5.3 km off, tops at y ≈ 88 right of the belfry. Its skyline from x 200
 * to 290 is the one the moon rises on (sky/moon.ts: its lower limb on it
 * at x 248, y 83.5) and is kept exactly.
 */

const NEAR_DEPTH = 5300;
const FAR_DEPTH = 7400;
const NEAR_BOX: Box = [-915, 915, -8, 93];
const FAR_BOX: Box = [-915, 915, 28, 82];

/** The near hills' skyline control points (layer units), as the moon was seated on them: kept for x ≥ 200. */
const NEAR_RIDGE: readonly Pt[] = [
  [-940, 56],
  [-800, 61],
  [-650, 55],
  [-500, 64],
  [-360, 68],
  [-230, 72.5],
  [-110, 78],
  [-10, 84.6],
  [60, 87.6],
  [123, 88.2],
  [190, 87.4],
  [250, 83.6],
  [305, 75],
  [360, 61],
  [420, 51.5],
  [490, 52.5],
  [580, 59],
  [690, 63],
  [800, 58],
  [940, 62],
];

/**
 * West of the summit: Mont Lambert's north-west shoulder falling into a
 * broad saddle behind the belfry (x 81: the octagon's foot at y 70.7, so
 * the skyline there at about 68), then a lower rounded hill to its left
 * and the ridges falling away north as before.
 */
const WEST_RIDGE: readonly Pt[] = [
  [-940, 56],
  [-800, 61],
  [-650, 55],
  [-500, 64],
  [-360, 68],
  [-230, 72.5],
  [-150, 74.6],
  [-70, 75.6],
  [-10, 73.6],
  [40, 70],
  [70, 67.9],
  [88, 68.1],
  [104, 71.2],
  [122, 77.4],
  [142, 83.4],
  [164, 87],
  [190, 87.4],
  [250, 83.6],
  [305, 75],
];

const FAR_RIDGE: readonly Pt[] = [
  [-940, 64],
  [-780, 70],
  [-600, 67.5],
  [-470, 73],
  [-330, 70],
  [-180, 72],
  [-40, 66],
  [100, 62.5],
  [220, 64],
  [330, 66],
  [430, 68.5],
  [560, 72],
  [700, 67],
  [820, 70.5],
  [940, 66],
];

/** Catmull-Rom through control points, sampled every `step` units of x, plus a seeded wobble kept calm where `calm` says. */
function skyline(
  ctrl: readonly Pt[],
  step: number,
  seed: number,
  amp: number,
  calm: (x: number) => number,
): Pt[] {
  const out: Pt[] = [];
  const w = wobble(seed, [
    [140, amp],
    [47, amp * 0.45],
    [13, amp * 0.15],
  ]);
  for (let x = ctrl[0][0]; x <= ctrl[ctrl.length - 1][0]; x += step) {
    let i = 0;
    while (i < ctrl.length - 2 && ctrl[i + 1][0] < x) i++;
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    out.push([x, y + w(x) * calm(x)]);
  }
  return out;
}

const calmLambert = (x: number) =>
  x > 20 && x < 270 ? 0.15 : x > -40 && x < 320 ? 0.5 : 1;

/** The saddle behind the belfry kept smooth (the octagon's foot close above it). */
const calmWest = (x: number) =>
  x > 30 && x < 140 ? 0.12 : x > -60 && x < 200 ? 0.45 : 1;

function smoothstep(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** The near skyline: the west profile left of x 175, the moon's (unchanged) from x 200, blended between. */
function nearRidge(): Pt[] {
  const moon = skyline(NEAR_RIDGE, 3, 501, 1.6, calmLambert);
  const west = skyline(WEST_RIDGE, 3, 502, 1.6, calmWest);
  return moon.map(([x, y], i) => {
    if (x >= 200 || i >= west.length) return [x, y] as Pt;
    const k = smoothstep((x - 175) / 25);
    return [x, west[i][1] * (1 - k) + y * k] as Pt;
  });
}

// ------------------------------------------------------------- the plan

type Kind =
  | "stubble"
  | "wheat"
  | "oats"
  | "pasture"
  | "meadow"
  | "aftermath"
  | "fallow"
  | "plough";

/** August's crops and grass, before the air: the local colour of each kind. */
const KINDS: readonly (readonly [Kind, string, number])[] = [
  ["stubble", "#dcc583", 0.2],
  ["wheat", "#d3b062", 0.13],
  ["oats", "#c8b672", 0.08],
  ["pasture", "#738348", 0.22],
  ["meadow", "#8b9653", 0.13],
  ["aftermath", "#a3a862", 0.09],
  ["fallow", "#a08668", 0.08],
  ["plough", "#8a7259", 0.07],
];

interface Field {
  /** The top edge's x from a0 to b0 on contour `row`, the foot's from a1 to b1 on contour `row + 1`. */
  a0: number;
  b0: number;
  a1: number;
  b1: number;
  row: number;
  kind: Kind;
  colour: string;
  /** Its furrows: along the contours or down the fall line. */
  fall: boolean;
  seed: number;
}

/** A crown of a hedge or a copse: centre, radius, and whether a copse's (darker, a rim of gold on top). */
interface Crown {
  x: number;
  y: number;
  r: number;
}

interface Hills {
  ridge: Pt[];
  /** The face's y for x and a depth into the face t (0 at the skyline, 1 at the foot). */
  faceY(x: number, t: number): number;
  /** Local slope of the ridge (dy/dx), smoothed. */
  slope(x: number): number;
  /** The contours between the bands: each a depth t and a gentle wobble of it along x. */
  contours: { t: number; w: (x: number) => number }[];
  fields: Field[];
  hedges: Crown[];
  copses: { crowns: Crown[]; x: number; y: number; r: number }[];
}

let nearCache: Hills | undefined;

const ROWS_T = 0.8;
const X0 = -925;
const X1 = 925;

/** Lays out the hills' skyline and contours (the first job). */
function nearBase(): Hills {
  if (nearCache) return nearCache;
  const ridge = nearRidge();
  const x0 = ridge[0][0];
  const at = (x: number) => {
    const i = Math.max(0, Math.min(ridge.length - 1, Math.round((x - x0) / 3)));
    return ridge[i][1];
  };
  const foot = NEAR_BOX[2];
  const faceY = (x: number, t: number) =>
    at(x) - (at(x) - foot) * Math.max(0, t) ** 1.25;
  const slope = (x: number) => (at(x + 24) - at(x - 24)) / 48;
  const rng = createRng(733);
  const contours: Hills["contours"] = [{ t: 0.004, w: () => 0 }];
  let t = 0.004;
  let k = 0;
  while (t < ROWS_T) {
    t += (0.014 + 0.075 * t) * (0.7 + rng() * 0.6);
    const amp = 0.003 + 0.018 * t;
    const wv = wobble(1300 + k++, [
      [260, amp],
      [90, amp * 0.5],
    ]);
    contours.push({ t, w: wv });
  }
  nearCache = {
    ridge,
    faceY,
    slope,
    contours,
    fields: [],
    hedges: [],
    copses: [],
  };
  return nearCache;
}

/** A contour's y at x. */
const contourCache: Float32Array[] = [];

/** A contour's y at x (sampled every 3 units once, then read). */
function contourY(h: Hills, row: number, x: number): number {
  const r = Math.min(row, h.contours.length - 1);
  let ys = contourCache[r];
  if (!ys) {
    const c = h.contours[r];
    ys = new Float32Array(Math.ceil((X1 - X0) / 3) + 2);
    for (let i = 0; i < ys.length; i++) {
      const xi = X0 + i * 3;
      ys[i] = h.faceY(xi, c.t + c.w(xi));
    }
    contourCache[r] = ys;
  }
  const f = Math.max(0, Math.min(ys.length - 1.001, (x - X0) / 3));
  const i = Math.floor(f);
  return ys[i] + (ys[i + 1] - ys[i]) * (f - i);
}

/** A point of a field in its own coordinates: u across (0 left, 1 right), v down (0 top, 1 foot). */
function fieldPoint(h: Hills, f: Field, u: number, v: number): Pt {
  const xt = f.a0 + (f.b0 - f.a0) * u;
  const xb = f.a1 + (f.b1 - f.a1) * u;
  const yt = contourY(h, f.row, xt);
  const yb = contourY(h, f.row + 1, xb);
  return [xt + (xb - xt) * v, yt + (yb - yt) * v];
}

function fieldPath(h: Hills, f: Field): Path2D {
  const p = new Path2D();
  const n = Math.max(2, Math.ceil(Math.abs(f.b0 - f.a0) / 4));
  for (let i = 0; i <= n; i++) {
    const [x, y] = fieldPoint(h, f, i / n, 0);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = fieldPoint(h, f, i / n, 1);
    p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

const ROW_CHUNK = 2;

/** The ink's contour hatching in this many jobs. */
const MODEL_PARTS = 6;

/** Lays out the fields, hedges and copses of contour bands `from` to `to` (each band its own seed, so the jobs may share the work in any order). */
function nearRows(from: number, to: number): void {
  const h = nearBase();
  const bands = h.contours.length - 1;
  for (let row = from; row < Math.min(to, bands); row++) {
    const rng = createRng(4100 + row * 7919);
    const yAt = (x: number, r: number) => contourY(h, r, x);
    // The band's dividers: their x on the top contour and on the foot's, slanting down the fall line.
    let xt = X0 - rng() * 30;
    const divs: [number, number][] = [];
    while (xt < X1 + 40) {
      const height = Math.max(0.5, yAt(xt, row) - yAt(xt, row + 1));
      const lean =
        Math.max(-1.1, Math.min(1.1, -h.slope(xt) * 2.4)) + (rng() - 0.5) * 0.9;
      divs.push([xt, xt + lean * height]);
      xt += 14 + rng() * 36;
    }
    for (let i = 0; i < divs.length - 1; i++) {
      const [a0, a1] = divs[i];
      const [b0, b1] = divs[i + 1];
      let r = rng();
      let kind: Kind = "pasture";
      let colour = "#738348";
      for (const [k, col, p] of KINDS) {
        if (r < p) {
          kind = k;
          colour = col;
          break;
        }
        r -= p;
      }
      const f: Field = {
        a0,
        b0,
        a1,
        b1,
        row,
        kind,
        colour,
        fall: rng() < 0.7,
        seed: Math.floor(rng() * 1e6),
      };
      h.fields.push(f);
      // Bocage: crowns along the field's top edge and its left side, in runs with gaps.
      const grassy =
        kind === "pasture" || kind === "meadow" || kind === "aftermath";
      const run = (u0: number, v0: number, u1: number, v1: number) => {
        const [sx, sy] = fieldPoint(h, f, u0, v0);
        const [ex, ey] = fieldPoint(h, f, u1, v1);
        const len = Math.hypot(ex - sx, ey - sy);
        let s = rng() * 1.2;
        let on = rng() < 0.75;
        let left = 3 + rng() * 9;
        while (s < len) {
          const step = 0.9 + rng() * 0.8;
          if (on) {
            const k = s / len;
            h.hedges.push({
              x: sx + (ex - sx) * k + (rng() - 0.5) * 0.3,
              y: sy + (ey - sy) * k,
              r: 0.45 + rng() * 0.55 * (rng() < 0.15 ? 1.7 : 1),
            });
          }
          s += step;
          left -= step;
          if (left <= 0) {
            on = !on;
            left = on ? 4 + rng() * 12 : 1.5 + rng() * 5;
          }
        }
      };
      // Never along the skyline itself (a fringe of crowns on the sky).
      const onTop = rng() < (grassy ? 0.55 : 0.32);
      if (onTop && row > 1) run(0, 0, 1, 0);
      if (rng() < (grassy ? 0.5 : 0.3)) run(0, 0, 0, 1);
      // Now and then a copse.
      if (rng() < 0.075) {
        const [cx, cy] = fieldPoint(
          h,
          f,
          0.25 + rng() * 0.5,
          0.35 + rng() * 0.4,
        );
        const r = 1.6 + rng() * 3;
        const crowns: Crown[] = [];
        const n = 10 + Math.floor(rng() * 16);
        for (let k = 0; k < n; k++) {
          const a = rng() * Math.PI * 2;
          const d = Math.sqrt(rng());
          crowns.push({
            x: cx + Math.cos(a) * r * d,
            y: cy + Math.sin(a) * r * d * 0.42,
            r: 0.5 + rng() * 0.6,
          });
        }
        // Back to front (higher first), so the nearer crowns overlap the farther.
        crowns.sort((p, q) => q.y - p.y);
        h.copses.push({ crowns, x: cx, y: cy, r });
      }
    }
  }
}

const AIR = NEAR_DEPTH;

/** How a bit of face takes the low sun: flanks rising to the right face north-west (lit), falling flanks face south-west (cooler). */
function lightAt(
  h: Hills,
  x: number,
  y: number,
  noise: (x: number, y: number) => number,
): number {
  const s = h.slope(x);
  return Math.max(
    0,
    Math.min(
      1,
      0.55 + Math.max(-1, Math.min(1, s * 3)) * 0.4 + noise(x, y) * 0.12,
    ),
  );
}

// ------------------------------------------------------------- painting

function facePath(ridge: readonly Pt[], foot: number): Path2D {
  const p = new Path2D();
  p.moveTo(ridge[0][0], foot);
  for (const [x, y] of ridge) p.lineTo(x, y);
  p.lineTo(ridge[ridge.length - 1][0], foot);
  p.closePath();
  return p;
}

function nearWash(c: PlateCanvas): void {
  const { ctx } = c;
  const h = nearBase();
  const p = facePath(h.ridge, NEAR_BOX[2]);
  if (c.mode === "ink") {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    return;
  }
  // Under the fields: the land's general colour (shows only as the lanes between them, and below the bands).
  const g = ctx.createLinearGradient(0, 88, 0, NEAR_BOX[2]);
  g.addColorStop(0, aerial("#a99f66", AIR));
  g.addColorStop(0.45, aerial("#8b8d5c", AIR));
  g.addColorStop(1, aerial("#7d8068", AIR));
  ctx.fillStyle = g;
  ctx.fill(p);
}

const FIELD_CHUNK = 60;

function nearFields(c: PlateCanvas, from: number, to: number): void {
  const { ctx } = c;
  const h = nearBase();
  const list = h.fields.slice(from, to);
  const noise = field(91, 300, 2);
  const pen = penAt(AIR);
  for (const f of list) {
    const [mx, my] = fieldPoint(h, f, 0.5, 0.5);
    // Hidden fields cost nothing: below the town, the cliffs and the heights only the dive shows down to about y 25.
    if (my < 18) continue;
    const path = fieldPath(h, f);
    const lit = lightAt(h, mx, my, noise);
    const top = contourY(h, f.row, mx);
    const height = Math.max(0.3, top - contourY(h, f.row + 1, mx));
    const wide = Math.abs(f.b0 - f.a0);
    if (c.mode === "colour") {
      // Its local colour in the light the face takes, warmer where the sun is square.
      const local = mix(
        mix(f.colour, "#5d6670", 0.32 - lit * 0.32),
        "#e8c48a",
        lit * 0.16,
      );
      const tone = aerial(local, AIR);
      ctx.fillStyle = tone;
      ctx.fill(path);
      // Its texture: furrows, stubble rows or the grass's unevenness, in its own direction.
      const dark = aerial(mix(local, "#3f3f33", 0.45), AIR);
      const light = aerial(mix(local, "#f4dda4", 0.4), AIR);
      const ploughed = f.kind === "plough" || f.kind === "fallow";
      const corn =
        f.kind === "stubble" || f.kind === "wheat" || f.kind === "oats";
      const colour = ploughed ? dark : corn ? light : dark;
      // Rows along the contours softer than furrows down the fall line (never a ruled page).
      const alpha = (ploughed ? 0.42 : corn ? 0.38 : 0.2) * (f.fall ? 1 : 0.6);
      ctx.beginPath();
      if (f.fall) {
        const n = Math.min(60, Math.floor(wide / c.pen(1.9)));
        for (let i = 1; i < n; i++) {
          const a = fieldPoint(h, f, i / n, 0.04);
          const b = fieldPoint(h, f, i / n, 0.96);
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
      } else {
        const n = Math.min(10, Math.floor(height / c.pen(2.6)));
        for (let i = 1; i < n; i++) {
          for (let k = 0; k <= 6; k++) {
            const [x, y] = fieldPoint(h, f, k / 6, i / n);
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
      }
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.lineWidth = c.pen(0.6);
      ctx.stroke();
      // The lane or bank along its top edge: a hair of shadow, lit above.
      if (height > 0.8) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const [x, y] = fieldPoint(h, f, k / 6, 0);
          if (k === 0) ctx.moveTo(x, y - 0.15);
          else ctx.lineTo(x, y - 0.15);
        }
        ctx.strokeStyle = rgba(aerial("#4b4a3c", AIR), 0.28);
        ctx.lineWidth = c.pen(0.6);
        ctx.stroke();
      }
    } else {
      // The engraving: ploughed and stubble fields as short strokes in their direction only; grass left to the paper and the hill's own hatching.
      const ploughed = f.kind === "plough" || f.kind === "fallow";
      const corn = f.kind === "stubble" || f.kind === "wheat";
      if (!ploughed && !corn) continue;
      const lines: Pt[][] = [];
      if (f.fall) {
        const n = Math.min(40, Math.floor(wide / c.pen(ploughed ? 2.2 : 3.4)));
        for (let i = 1; i < n; i++) {
          const a = fieldPoint(h, f, i / n, 0.1);
          const b = fieldPoint(h, f, i / n, ploughed ? 0.9 : 0.55);
          lines.push([a, b]);
        }
      } else {
        const n = Math.min(10, Math.floor(height / c.pen(ploughed ? 2 : 3)));
        for (let i = 1; i < n; i++) {
          const l: Pt[] = [];
          for (let k = 0; k <= 6; k++) l.push(fieldPoint(h, f, k / 6, i / n));
          lines.push(...brokenLine(l, 3, 1.5, f.seed + i));
        }
      }
      strokeLines(c, lines, pen * 0.45, INK.hatch, ploughed ? 0.6 : 0.4);
    }
  }
}

/** The bocage's crowns: a dark body, its shadow to the right, a lit dab up and to the left. */
function paintCrowns(
  c: PlateCanvas,
  list: readonly Crown[],
  tones: { body: string; shade: string; lit: string; rim?: string },
): void {
  const { ctx } = c;
  const pass = (
    colour: string,
    dx: number,
    dy: number,
    s: number,
    alpha: number,
  ) => {
    ctx.fillStyle = rgba(colour, alpha);
    ctx.beginPath();
    for (const k of list) {
      const x = k.x + k.r * dx;
      const y = k.y + k.r * (0.7 + dy);
      ctx.moveTo(x + k.r * s, y);
      ctx.ellipse(x, y, k.r * s, k.r * s * 0.85, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  pass(tones.body, 0, 0, 1, 1);
  pass(tones.shade, 0.32, -0.12, 0.72, 0.9);
  pass(tones.lit, -0.3, 0.28, 0.46, 0.9);
  if (tones.rim) pass(tones.rim, -0.12, 0.5, 0.36, 0.7);
}

/** The bocage engraved: beaded lines of tiny crowns, each an arc on top and a touch of shade under it. */
function engraveCrowns(
  c: PlateCanvas,
  list: readonly Crown[],
  weight: number,
): void {
  const { ctx } = c;
  const pen = penAt(AIR);
  ctx.beginPath();
  for (const k of list) {
    const y = k.y + k.r * 0.7;
    ctx.moveTo(k.x - k.r, y);
    ctx.ellipse(k.x, y, k.r, k.r * 0.85, 0, Math.PI, 0, true);
  }
  ctx.strokeStyle = rgba(INK.line, 0.75 * weight);
  ctx.lineWidth = c.pen(pen * 0.6);
  ctx.stroke();
  ctx.beginPath();
  for (const k of list) {
    const y = k.y + k.r * 0.4;
    ctx.moveTo(k.x - k.r * 0.2, y);
    ctx.lineTo(k.x + k.r * 0.9, y + k.r * 0.15);
  }
  ctx.strokeStyle = rgba(INK.hatch, 0.7 * weight);
  ctx.lineWidth = c.pen(pen * 0.5);
  ctx.stroke();
}

const HEDGE_CHUNK = 1200;

/** The skyline's y at x. */
function ridgeAt(h: Hills, x: number): number {
  const x0 = h.ridge[0][0];
  const i = Math.max(0, Math.min(h.ridge.length - 1, Math.round((x - x0) / 3)));
  return h.ridge[i][1];
}

/** Crowns that show (above the hidden foot) and stay under the skyline. */
function shown(h: Hills, list: readonly Crown[]): Crown[] {
  return list.filter(
    (k) => k.y > 18 && k.y + k.r * 1.6 < ridgeAt(h, k.x) - 0.3,
  );
}

function nearHedges(c: PlateCanvas, from: number, to: number): void {
  const h = nearBase();
  const list = shown(h, h.hedges.slice(from, to));
  if (!list.length) return;
  if (c.mode === "colour")
    paintCrowns(c, list, {
      body: aerial("#4a5439", AIR),
      shade: aerial("#3b423d", AIR),
      lit: aerial("#958f55", AIR),
    });
  else engraveCrowns(c, list, 1);
}

function nearCopses(c: PlateCanvas, from: number, to: number): void {
  const { ctx } = c;
  const h = nearBase();
  for (const k0 of h.copses.slice(from, to)) {
    if (k0.y < 18) continue;
    const k = { ...k0, crowns: shown(h, k0.crowns) };
    if (!k.crowns.length) continue;
    if (c.mode === "colour") {
      // The copse's cast shadow on the field, to the right and down, then its crowns.
      softBlob(
        c,
        k.x + k.r * 0.5,
        k.y - k.r * 0.12,
        k.r * 1.1,
        k.r * 0.32,
        aerial("#3e4436", AIR),
        0.35,
      );
      paintCrowns(c, k.crowns, {
        body: aerial("#37422f", AIR),
        shade: aerial("#2f3734", AIR),
        lit: aerial("#7f7f45", AIR),
        rim: aerial("#c2a85e", AIR),
      });
    } else {
      // A scalloped outline over the top crowns, close hatching on the shaded right.
      const p = new Path2D();
      for (const q of k.crowns) {
        const y = q.y + q.r * 0.7;
        p.moveTo(q.x + q.r, y);
        p.ellipse(q.x, y, q.r, q.r * 0.85, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = PAPER.low;
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      const lines: Pt[][] = [];
      for (let x = k.x - k.r * 0.1; x < k.x + k.r * 1.4; x += c.pen(1.2))
        lines.push([
          [x, k.y - k.r],
          [x + k.r * 0.3, k.y + k.r],
        ]);
      strokeLines(c, lines, penAt(AIR) * 0.45, INK.hatch, 0.8);
      ctx.restore();
      engraveCrowns(c, k.crowns, 1);
    }
  }
}

/** The near hills' modelling: the south-west flanks cooler, the summit band lighter in the haze, the feet in the evening's haze. */
function nearModel(c: PlateCanvas, part: number): void {
  if (c.mode === "colour" && part > 0) return;
  const { ctx } = c;
  const h = nearBase();
  const p = facePath(h.ridge, NEAR_BOX[2]);
  ctx.save();
  ctx.clip(p);
  if (c.mode === "colour") {
    for (let x = -900; x < 900; x += 24) {
      const s = h.slope(x);
      if (s < -0.04)
        softBlob(
          c,
          x,
          h.faceY(x, 0.16),
          26,
          12,
          aerial("#5f6680", AIR),
          Math.min(0.3, -s * 1.1),
        );
      if (s > 0.04)
        softBlob(
          c,
          x,
          h.faceY(x, 0.1),
          24,
          9,
          aerial("#f0cf92", AIR),
          Math.min(0.2, s * 0.9),
        );
    }
    // The summit band seen at a graze: a little paler.
    ctx.beginPath();
    ctx.moveTo(h.ridge[0][0], h.ridge[0][1]);
    for (const [x, y] of h.ridge) ctx.lineTo(x, y);
    for (let i = h.ridge.length - 1; i >= 0; i--) {
      const [x] = h.ridge[i];
      ctx.lineTo(x, h.faceY(x, 0.03));
    }
    ctx.closePath();
    ctx.fillStyle = rgba(aerial("#d6c6a4", AIR), 0.22);
    ctx.fill();
    // The haze over the hills' feet.
    const g = ctx.createLinearGradient(0, 46, 0, NEAR_BOX[2]);
    g.addColorStop(0, rgba(aerial("#c9bcb6", AIR), 0));
    g.addColorStop(1, rgba(aerial("#c9bcb6", AIR), 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(NEAR_BOX[0], NEAR_BOX[2], NEAR_BOX[1] - NEAR_BOX[0], 54);
  } else {
    // The hill's form in hatching along its contours: close on the flanks
    // turned from the sun, sparse and broken on the lit faces, none on the
    // brightest; never an even ruling.
    const noise = field(93, 160, 2);
    const lines: Pt[][] = [];
    const n = h.contours.length;
    const k0 = Math.max(1, Math.floor((n * part) / MODEL_PARTS));
    const k1 = Math.floor((n * (part + 1)) / MODEL_PARTS);
    for (let k = k0; k < k1; k++) {
      for (const half of [0, 0.5]) {
        if (half && k % 2) continue;
        const l: Pt[] = [];
        const flush = () => {
          if (l.length > 1)
            lines.push(...brokenLine(l.splice(0), 7, 2.5, k * 31 + l.length));
          l.length = 0;
        };
        for (let x = -912; x <= 912; x += 3) {
          const y =
            contourY(h, k, x) * (1 - half) + contourY(h, k + 1, x) * half;
          const s = h.slope(x) + noise(x, y) * 0.03;
          const shade = s < -0.02 ? 1 : s < 0.03 ? 0.5 : 0;
          const want = half
            ? shade > 0.9
            : shade > 0.4 || (k % 3 === 0 && shade > 0);
          if (want && y > 18) l.push([x, y]);
          else flush();
        }
        flush();
      }
    }
    strokeLines(c, lines, penAt(AIR) * 0.5, INK.hatch, 0.5);
  }
  ctx.restore();
  // The skyline: a fine contour.
  if (c.mode === "ink" && part < MODEL_PARTS - 1) return;
  if (c.mode === "ink")
    strokeLines(
      c,
      brokenLine(h.ridge, 120, 2.5, 5),
      penAt(AIR),
      INK.line,
      0.85,
    );
  else strokeLines(c, [h.ridge], 0.7, aerial("#d9c79a", AIR), 0.6);
}

function nearPlate(): Plate {
  const jobs = (): PlateJob[] => {
    const out: PlateJob[] = [() => void nearBase(), (c) => nearWash(c)];
    for (let r = 0; r < 60; r += ROW_CHUNK)
      out.push(() => nearRows(r, r + ROW_CHUNK));
    for (let i = 0; i < 3000; i += FIELD_CHUNK)
      out.push((c) => {
        if (i < nearBase().fields.length) nearFields(c, i, i + FIELD_CHUNK);
      });
    for (let k = 0; k < MODEL_PARTS; k++) out.push((c) => nearModel(c, k));
    for (let i = 0; i < 40000; i += HEDGE_CHUNK)
      out.push((c) => {
        if (i < nearBase().hedges.length) nearHedges(c, i, i + HEDGE_CHUNK);
      });
    for (let i = 0; i < 300; i += 30)
      out.push((c) => {
        if (i < nearBase().copses.length) nearCopses(c, i, i + 30);
      });
    return out;
  };
  return { id: "hills", depth: NEAR_DEPTH, box: NEAR_BOX, group: "land", jobs };
}

function farPlate(): Plate {
  const ridge = () => skyline(FAR_RIDGE, 4, 77, 1.2, () => 1);
  const jobs = (mode: PlateMode): PlateJob[] => [
    (c) => {
      const { ctx } = c;
      const r = ridge();
      const p = facePath(r, FAR_BOX[2]);
      if (mode === "colour") {
        const g = ctx.createLinearGradient(0, 75, 0, FAR_BOX[2]);
        g.addColorStop(0, aerial("#a9a493", FAR_DEPTH));
        g.addColorStop(1, aerial("#9c9aa6", FAR_DEPTH));
        ctx.fillStyle = g;
        ctx.fill(p);
        ctx.save();
        ctx.clip(p);
        const rng = createRng(19);
        for (let i = 0; i < 50; i++)
          softBlob(
            c,
            -900 + rng() * 1800,
            40 + rng() * 30,
            30 + rng() * 60,
            4 + rng() * 5,
            rng() < 0.5
              ? aerial("#8f93a6", FAR_DEPTH)
              : aerial("#cdbd98", FAR_DEPTH),
            0.22,
          );
        ctx.restore();
      } else {
        ctx.fillStyle = PAPER.low;
        ctx.fill(p);
        const lines: Pt[][] = [];
        for (let k = 1; k < 5; k++)
          lines.push(
            ...brokenLine(
              r.map(([x, y]) => [x, y - k * k * 0.7] as Pt),
              10,
              12,
              600 + k,
            ),
          );
        ctx.save();
        ctx.clip(p);
        strokeLines(c, lines, 0.5, INK.hatch, 0.4);
        ctx.restore();
        strokeLines(c, brokenLine(r, 80, 4, 8), 0.55, INK.hatch, 0.8);
      }
    },
  ];
  return {
    id: "hills-far",
    depth: FAR_DEPTH,
    box: FAR_BOX,
    group: "land",
    jobs,
    resolution: { colour: 0.5 },
  };
}

/** The hills' plates, far to near. */
export function hillsPlates(): Plate[] {
  return [farPlate(), nearPlate()];
}
