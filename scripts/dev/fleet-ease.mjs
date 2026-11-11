// The dawn fleets eased apart by as little as the last frame needs (the
// owner's licence of 10 November 2026, narrowed on 11 November): starting
// from each ship's place at the sources' spacing, finds the least shifts
// (metres east and north over the ground) that let every ship of both
// fleets stand in the last frame at her group's common size, readable and
// clear of every other glyph.
//
// The layout is the glyph layout's own for ships at their true places
// (glyphs/layout.ts, layoutFree), copied here: each group in order (Nelson's,
// Collingwood's, the allied main body, Gravina's, the British frigates, the
// French), its lead first, then its larger ships; the group's common scale
// the haze-weighted median of how far each ship may grow before she meets
// her nearest companion; each ship drawn at that scale (her lead at full
// size) or as far as the glyphs placed before her allow, boxes kept
// GLYPH_GAP_PX apart. Wanted: every group's common scale draws all its
// ships at MIN_CSS or more, and no ship is held under TOL of her scale by a
// glyph placed before her.
//
// Reads the sources' places, the camera at p and each glyph's ink box from
// the page (window.__road.dawnFleet, cameraAt, layoutDebug), with
// `road.dawnEase` set to {} so the page draws the sources' places. Then a
// binary search for the least cap on any one ship's shift at which a
// relaxation (each fault's pair pushed apart on screen along the cheaper
// axis, in ground metres) leaves no fault, and a pass pulling each ship
// back toward her place as far as no fault comes back. The Victory stays
// put (scene 1's hand-off stands on her place). Prints each ship's shift
// and writes the table (JSON=<file>) for fleets.ts's DAWN_EASE.
// Development only.
//   node scripts/dev/fleet-ease.mjs
// Environment: BASE (default http://127.0.0.1:3000), W, H, S (1280, 720,
// 1.5: the owner's screen, where the frame is tightest), SAMPLES (the p
// laid out: the last frame's hold, through which the ships still sail to
// their dawn places; "1,0.996,0.992,0.988"), MIN_CSS (10.5), TOL (0.95),
// MARGIN (device px added to the gap for the bake's sweeps; 1.5), JSON,
// FIXED (keys kept put, comma-separated; "british:Victory" always), SPARE
// (keys whose faults are let be).
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const SAMPLES = (process.env.SAMPLES ?? "1,0.996,0.992,0.988")
  .split(",")
  .map(Number);
const MARGIN = Number(process.env.MARGIN ?? 1.5);
/** The lines' stage spreads for this much over the least scale (0: no lines' stage). */
const LINE_SLACK = Number(process.env.LINE_SLACK ?? 1.03);
/** How much of a pair's spare room on screen the lines' stage keeps (1: all). */
const KEEP_SPARE = Number(process.env.KEEP_SPARE ?? 0);
/** The least spare room kept between the main body's two divisions, CSS px. */
const DIVISION_PX = Number(process.env.DIVISION_PX ?? 16);
const MIN_CSS = Number(process.env.MIN_CSS ?? 10.5);
const TOL = Number(process.env.TOL ?? 0.95);
const GLYPH_GAP_PX = 1.5;
const fixed = new Set([
  "british:Victory",
  ...(process.env.FIXED ?? "").split(",").filter(Boolean),
]);
const spare = new Set((process.env.SPARE ?? "").split(",").filter(Boolean));

// ---- From the page ----------------------------------------------------------
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("road.dawnEase", "{}");
  } catch {}
});
const page = await context.newPage();
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
const fleet = await page.evaluate(() => window.__road.dawnFleet());
const views = [];
for (const p of SAMPLES)
  views.push({
    p,
    cam: await page.evaluate((p) => window.__road.cameraAt(p), p),
    at: await page.evaluate((p) => window.__road.fleetAt(p), p),
  });
const rows = (
  await page.evaluate((p) => window.__road.layoutDebug(p), SAMPLES[0])
).filter((r) => r.free !== undefined);
await browser.close();
for (const s of fleet)
  for (const k of [0, 1])
    if (Math.abs(s.sources[k] - s.drawn[k]) > 1e-9)
      throw new Error(`the page did not draw the sources' places (${s.key})`);

// ---- The view -----------------------------------------------------------------
const dpr = views[0].cam.dpr;
const gap = GLYPH_GAP_PX * dpr + MARGIN;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** World (km, sea level) to device px from the bottom left, and the clip w (layout.ts, View.project). */
function project(view, x, y) {
  const { cam } = view;
  const V = cam.view;
  const Pm = cam.projection;
  const vx = V[0] * x + V[4] * y + V[12];
  const vy = V[1] * x + V[5] * y + V[13];
  const vz = V[2] * x + V[6] * y + V[14];
  const vw = V[3] * x + V[7] * y + V[15];
  const cx = Pm[0] * vx + Pm[4] * vy + Pm[8] * vz + Pm[12] * vw;
  const cy = Pm[1] * vx + Pm[5] * vy + Pm[9] * vz + Pm[13] * vw;
  const cw = Pm[3] * vx + Pm[7] * vy + Pm[11] * vz + Pm[15] * vw;
  return [
    (cx / cw / 2 + 0.5) * cam.width,
    (cy / cw / 2 + 0.5) * cam.height,
    cw,
  ];
}

/** glyphs/height.ts, glyphNominalPx, times dpr and the ship's size. */
function nominal(view, dist, size) {
  const { cam } = view;
  const ez = cam.eye[2];
  const t = Math.min(1, Math.max(0, (ez / dist - 0.12) / 0.18));
  const steep = t * t * (3 - 2 * t);
  const lo = 0.3 + 0.25 * steep;
  const k = Math.min(1.8, Math.max(lo, cam.sizeRef / dist));
  const power = k >= 1 ? 0.35 : 1 - 0.65 * steep;
  return cam.sizePx * k ** power * dpr * size;
}

// ---- The ships, in the layout's order -----------------------------------------
const ORDER = [
  ["british", "nelson"],
  ["british", "collingwood"],
  ["combined", "main"],
  ["combined", "gravina"],
  ["british", "frigates"],
  ["combined", "frigates"],
];
const byIndex = new Map(rows.map((r) => [r.free, r]));
const ships = fleet.map((s, i) => {
  const r = byIndex.get(i);
  const [x, y, w] = project(views[0], s.sources[0], s.sources[1]);
  return {
    ...s,
    index: i,
    // The ink box at the nominal height, as shares of it (constant under a
    // small shift: the heading against the view doesn't change).
    box: r ? r.box.map((v) => v / r.h0) : [0.5, 0.5, 0.9],
    km: 1 / Math.cos((s.lat * Math.PI) / 180) / 1000, // world km per ground metre
    d: [0, 0], // ground metres east, north
    inFrame:
      w > 0 &&
      x > 0 &&
      x < views[0].cam.width &&
      y > 0 &&
      y < views[0].cam.height,
    fixed: fixed.has(s.key),
  };
});
const groups = ORDER.map(([side, group]) =>
  ships
    .filter((s) => s.side === side && s.group === group && s.inFrame)
    .sort(
      (a, b) =>
        Number(b.lead) - Number(a.lead) || b.size - a.size || a.index - b.index,
    ),
).filter((g) => g.length > 0);
const placed = groups.flat();
const outOfFrame = ships.filter((s) => !s.inFrame).map((s) => s.key);

/**
 * A ship as the layout measures her (measureFree) in a view: foot, nominal
 * height, box, weight. Her place there is the page's for the sources'
 * layout, moved by her shift (near dawn each ship keeps her offset from
 * her fleet's centre, so a shift of her dawn place moves her alike).
 */
function measure(s, view = views[0]) {
  const { cam, at } = view;
  const [ex, ey, ez] = cam.eye;
  const x = at[s.index * 3] + s.d[0] * s.km;
  const y = at[s.index * 3 + 1] + s.d[1] * s.km;
  const [fx, fy, w] = project(view, x, y);
  const dist = Math.hypot(x - ex, y - ey, ez);
  const h0 = nominal(view, dist, s.size);
  const haze = Math.exp(-((dist / cam.hazeVisibility) ** 2));
  return {
    fx,
    fy,
    h0,
    l: s.box[0] * h0,
    r: s.box[1] * h0,
    t: s.box[2] * h0,
    wt: at[s.index * 3 + 2] * haze * smoothstep(0.02, 0.1, w),
    shown: at[s.index * 3 + 2] > 0,
  };
}

/** Screen px per ground metre east and north (finite differences). */
function jacobian(s) {
  const a = measure(s);
  s.d[0] += 1;
  const e = measure(s);
  s.d[0] -= 1;
  s.d[1] += 1;
  const n = measure(s);
  s.d[1] -= 1;
  return [
    [e.fx - a.fx, n.fx - a.fx],
    [e.fy - a.fy, n.fy - a.fy],
  ];
}

// ---- The layout's geometry (layout.ts: apart, contact, mutual) -----------------
let upper = -1;
let lower = Number.POSITIVE_INFINITY;
function apart(coef, rhs) {
  if (coef > 1e-12) {
    if (rhs >= 0) upper = Math.max(upper, rhs / coef);
  } else if (coef < -1e-12) lower = Math.min(lower, Math.max(0, rhs / coef));
  else if (rhs >= 0) upper = Number.POSITIVE_INFINITY;
}
function first() {
  if (lower <= 0) return Number.POSITIVE_INFINITY;
  if (upper < 0) return 0;
  if (lower <= upper) return Number.POSITIVE_INFINITY;
  return upper;
}
/** How far a's box may grow about its foot before it meets box q ([x0, x1, y0, y1]). */
function contact(a, q) {
  upper = -1;
  lower = Number.POSITIVE_INFINITY;
  apart(a.r, q[0] - gap - a.fx);
  apart(a.l, a.fx - (q[1] + gap));
  apart(a.t, q[2] - gap - a.fy);
  apart(0, a.fy - (q[3] + gap));
  return first();
}
/** How far two boxes may grow alike before they meet. */
function mutual(a, c) {
  upper = -1;
  lower = Number.POSITIVE_INFINITY;
  const dx = c.fx - a.fx;
  const dy = c.fy - a.fy;
  apart(a.r + c.l, dx - gap);
  apart(a.l + c.r, -dx - gap);
  apart(a.t, dy - gap);
  apart(c.t, -dy - gap);
  return first();
}

/** The weighted median, interpolated by cumulative weight (layout.ts). */
function weightedMedian(values, weights) {
  const idx = values.map((_, i) => i).filter((i) => weights[i] > 0);
  if (idx.length === 0) return 1;
  idx.sort((a, b) => values[a] - values[b]);
  const total = idx.reduce((t, i) => t + weights[i], 0);
  const half = total / 2;
  let before = 0;
  let prevMid = 0;
  let prevValue = values[idx[0]];
  for (let k = 0; k < idx.length; k++) {
    const w = weights[idx[k]];
    const mid = before + w / 2;
    const value = values[idx[k]];
    if (mid >= half) {
      if (k === 0) return value;
      const t = (half - prevMid) / Math.max(mid - prevMid, 1e-12);
      return prevValue + (value - prevValue) * t;
    }
    before += w;
    prevMid = mid;
    prevValue = value;
  }
  return prevValue;
}

/** The pair whose boxes, at the given scales, must part (null if they are apart). */
function fault(a, sa, b, sb, A, B) {
  const ax = [a.fx - a.l * sa, a.fx + a.r * sa, a.fy, a.fy + a.t * sa];
  const bx = [b.fx - b.l * sb, b.fx + b.r * sb, b.fy, b.fy + b.t * sb];
  const ox = Math.min(ax[1], bx[1]) - Math.max(ax[0], bx[0]) + gap;
  const oy = Math.min(ax[3], bx[3]) - Math.max(ax[2], bx[2]) + gap;
  if (ox <= 0 || oy <= 0) return null;
  return {
    A,
    B,
    ox,
    oy,
    cx: (ax[0] + ax[1]) / 2 < (bx[0] + bx[1]) / 2 ? 1 : -1,
    cy: ax[2] < bx[2] ? 1 : -1,
  };
}

/**
 * Lays the fleets out as the layout does and lists the faults: pairs too
 * close for their group's scale to reach MIN_CSS, and ships held under TOL
 * of their scale by a glyph placed before them.
 */
function layOutIn(view) {
  const faults = [];
  const obstacles = [];
  const result = new Map();
  const commons = [];
  for (const all of groups) {
    const g = all.filter((s) => measure(s, view).shown);
    if (g.length === 0) {
      commons.push(1);
      continue;
    }
    const m = g.map((s) => measure(s, view));
    const near = m.map((a, i) => {
      let best = 1;
      for (let j = 0; j < m.length; j++) {
        if (j === i) continue;
        const s = Math.max(mutual(a, m[j]), 1 - Math.min(1, m[j].wt));
        best = Math.min(best, s);
      }
      return best;
    });
    const common = Math.min(
      1,
      weightedMedian(
        near,
        m.map((x) => x.wt),
      ),
    );
    commons.push(common);
    // The scale every ship of the group needs to stand at MIN_CSS.
    let least = 0;
    if (g[0].side !== "british")
      for (const x of m.slice(1))
        least = Math.max(least, (MIN_CSS * dpr) / x.h0);
    if (common < least)
      for (let i = 0; i < m.length; i++)
        for (let j = i + 1; j < m.length; j++)
          if (mutual(m[i], m[j]) < least) {
            const f = fault(m[i], least, m[j], least, g[i], g[j]);
            if (f) faults.push({ ...f, kind: "least", p: view.p });
          }
    for (let k = 0; k < g.length; k++) {
      const a = m[k];
      const limit = k === 0 ? 1 : common;
      let s = limit;
      for (const o of obstacles) s = Math.min(s, contact(a, o.box));
      s = Math.max(0, s);
      if (s < TOL * limit && !spare.has(g[k].key))
        for (const o of obstacles)
          if (contact(a, o.box) < TOL * limit) {
            const f = fault(o.m, o.s, a, TOL * limit, o.ship, g[k]);
            if (f) faults.push({ ...f, kind: "held", p: view.p });
          }
      result.set(g[k], { s, h: s * a.h0, limit });
      obstacles.push({
        ship: g[k],
        m: a,
        s,
        box: [a.fx - a.l * s, a.fx + a.r * s, a.fy, a.fy + a.t * s],
      });
    }
  }
  return { faults, result, commons };
}

/** The layout in every view: their faults together; the first view's sizes. */
function layOut() {
  const first = layOutIn(views[0]);
  const faults = [...first.faults];
  for (const v of views.slice(1)) faults.push(...layOutIn(v).faults);
  return { ...first, faults };
}

/** Moves ship s by `px` along screen axis a (0: x, 1: y), the least ground metres that do it. */
function nudge(s, a, px) {
  if (s.fixed) return;
  const J = jacobian(s)[a];
  const n2 = J[0] * J[0] + J[1] * J[1];
  s.d[0] += (px * J[0]) / n2;
  s.d[1] += (px * J[1]) / n2;
}

/** Keeps each ship within `cap` metres of her place after the lines' stage (base). */
function clamp(cap) {
  for (const s of placed) {
    if (s.fixed) {
      s.d = [0, 0];
      continue;
    }
    const ox = s.d[0] - s.base[0];
    const oy = s.d[1] - s.base[1];
    const m = Math.hypot(ox, oy);
    if (m > cap) {
      s.d[0] = s.base[0] + (ox * cap) / m;
      s.d[1] = s.base[1] + (oy * cap) / m;
    }
  }
}

/** Relaxation under a cap (metres): true when the layout has no fault. */
function relax(cap, iterations = 2500) {
  for (let it = 0; it < iterations; it++) {
    const { faults } = layOut();
    if (faults.length === 0) return true;
    for (const f of faults) {
      const { A, B } = f;
      if (A.fixed && B.fixed) continue;
      const mx =
        1 / Math.hypot(...jacobian(A)[0]) + 1 / Math.hypot(...jacobian(B)[0]);
      const my =
        1 / Math.hypot(...jacobian(A)[1]) + 1 / Math.hypot(...jacobian(B)[1]);
      const axis = f.ox * mx <= f.oy * my ? 0 : 1;
      const need = (axis === 0 ? f.ox : f.oy) * 0.6 + 0.05;
      const dir = axis === 0 ? f.cx : f.cy;
      // The main body's line, laid out by the lines' stage, gives way least.
      const stiffA = A.fixed ? 0 : A.group === "main" ? 0.15 : 1;
      const stiffB = B.fixed ? 0 : B.group === "main" ? 0.15 : 1;
      const wa = stiffA / (stiffA + stiffB);
      nudge(A, axis, -dir * need * wa);
      nudge(B, axis, dir * need * (1 - wa));
    }
    clamp(cap);
  }
  return layOut().faults.length === 0;
}

function reset() {
  for (const s of ships) s.d = [...s.base];
}

// ---- The allied lines first, each kept in its order ---------------------------------
/**
 * Spreads a line of ships along its own axis by the least that keeps its
 * order with each ship clear of the next on screen, her box at the group's
 * scale (its lead at full size) and the gap between: an L∞ isotonic
 * regression (positions less the gaps before them, made non-decreasing with
 * the least largest change), whose answer is the mean of the running
 * maximum from the start and the running minimum from the end. The least
 * any one ship can move is half the line's whole shortfall on screen.
 */
function spreadLine(g, view = views[0]) {
  let least = 0;
  const scaleOf = (k) => (k === 0 ? 1 : least * LINE_SLACK);
  // The line's axis: the principal direction of the ships' places (metres).
  const pts = g.map((s) => [s.sources[0] / s.km, s.sources[1] / s.km]);
  const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length;
  const cy = pts.reduce((t, p) => t + p[1], 0) / pts.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of pts) {
    sxx += (x - cx) ** 2;
    sxy += (x - cx) * (y - cy);
    syy += (y - cy) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const axis = [Math.cos(angle), Math.sin(angle)];
  const order = g
    .map((s, k) => ({
      s,
      k,
      u0: (pts[k][0] - cx) * axis[0] + (pts[k][1] - cy) * axis[1],
    }))
    .sort((a, b) => a.u0 - b.u0);
  // The gap between the main body's two divisions: its widest step.
  let division = -1;
  if (g[0].group === "main") {
    let widest = 0;
    for (let i = 0; i + 1 < order.length; i++) {
      const step = order[i + 1].u0 - order[i].u0;
      if (step > widest) {
        widest = step;
        division = i;
      }
    }
  }
  let worst = 0;
  // Each round measures the line where the last left it (the screen's px
  // per metre change along it), then solves again from the sources' places.
  for (let round = 0; round < 8; round++) {
    const m = g.map((s) => measure(s, view));
    // The scale every ship needs to stand at MIN_CSS where she now stands
    // (a ship moved away from the eye stands smaller).
    least = 0;
    for (const x of m.slice(1)) least = Math.max(least, (MIN_CSS * dpr) / x.h0);
    const u = order.map(
      (o) => o.u0 + o.s.base[0] * axis[0] + o.s.base[1] * axis[1],
    );
    const along = order.map(({ s }) => {
      const J = jacobian(s)[0];
      return J[0] * axis[0] + J[1] * axis[1];
    });
    // Each pair's spacing along the axis: as it stands, more by what its
    // screen spacing lacks (a ship's distance off the line moves her across
    // the screen too, so the screen spacing is measured, not inferred), less
    // by what it has to spare but KEEP_SPARE of it (and between the
    // divisions at least DIVISION_PX, a step's width more than its ships
    // need: the gap is part of the order shown).
    const G = [0];
    let lacking = 0;
    for (let i = 0; i + 1 < order.length; i++) {
      const a = order[i];
      const b = order[i + 1];
      const rate = Math.abs((along[i] + along[i + 1]) / 2);
      const sign = Math.sign(along[i] + along[i + 1]);
      const [left, right] = sign > 0 ? [a, b] : [b, a];
      const need =
        m[left.k].r * scaleOf(left.k) + m[right.k].l * scaleOf(right.k) + gap;
      const spare = m[right.k].fx - m[left.k].fx - need;
      const kept =
        spare < 0
          ? 0
          : Math.max(
              KEEP_SPARE * spare,
              i === division ? Math.min(spare, DIVISION_PX * dpr) : 0,
            );
      lacking = Math.max(lacking, -spare);
      G.push(G[i] + (u[i + 1] - u[i]) + (kept - spare) / rate);
    }
    if (process.env.DEBUG_LINE === g[0].group)
      console.log(
        `  round ${round}: most lacking ${lacking.toFixed(1)} px, worst ${worst.toFixed(0)} m`,
      );
    // The least largest change from the sources' places.
    const a = order.map((o, i) => o.u0 - G[i]);
    const hiFrom = [];
    const loTo = [];
    for (let i = 0; i < a.length; i++)
      hiFrom[i] = Math.max(a[i], i > 0 ? hiFrom[i - 1] : -Infinity);
    for (let i = a.length - 1; i >= 0; i--)
      loTo[i] = Math.min(a[i], i + 1 < a.length ? loTo[i + 1] : Infinity);
    worst = 0;
    order.forEach((o, i) => {
      const delta = (hiFrom[i] + loTo[i]) / 2 + G[i] - o.u0;
      worst = Math.max(worst, Math.abs(delta));
      if (o.s.fixed) return;
      o.s.base = [delta * axis[0], delta * axis[1]];
      o.s.d = [...o.s.base];
    });
  }
  return { worst, least };
}

for (const s of ships) s.base = [0, 0];
const lines = [];
if (LINE_SLACK > 0)
  for (const g of groups)
    if (
      g[0].side === "combined" &&
      (g[0].group === "main" || g[0].group === "gravina")
    )
      lines.push({ group: g[0].group, ...spreadLine(g) });
for (const s of ships) s.d = [...s.base];

// ---- Search ---------------------------------------------------------------------
const start = layOut();
if (process.env.SHOW_FAULTS) {
  const fs0 = layOut().faults;
  console.log(`after the lines' stage: ${fs0.length} faults`);
  for (const f of fs0)
    console.log(
      `  ${f.kind}: ${f.A.key} / ${f.B.key} (${f.ox.toFixed(1)}, ${f.oy.toFixed(1)} px)`,
    );
}
let lo = 0;
let hi = Number(process.env.CAP ?? 4000);
reset();
if (!relax(hi)) {
  const { faults } = layOut();
  console.log(`no layout within ${hi} m; ${faults.length} faults left:`);
  for (const f of faults.slice(0, 12))
    console.log(
      `  ${f.kind} at ${f.p}: ${f.A.key} / ${f.B.key} (${f.ox.toFixed(1)}, ${f.oy.toFixed(1)} px)`,
    );
  process.exit(1);
}
if (process.env.NO_SEARCH) lo = hi;
while (hi - lo > 25) {
  const mid = (lo + hi) / 2;
  reset();
  if (relax(mid)) hi = mid;
  else lo = mid;
}
reset();
relax(hi);
// Pull each ship back toward her place as far as no fault comes back.
for (let round = 0; round < 30; round++) {
  let gained = 0;
  for (const s of placed) {
    if (s.fixed) continue;
    const keep = [...s.d];
    const m = Math.hypot(...keep);
    if (m < 1) continue;
    let ok = false;
    for (const f of [0, 0.5, 0.75, 0.9, 0.95]) {
      s.d = [keep[0] * f, keep[1] * f];
      if (layOut().faults.length === 0) {
        gained += m * (1 - f);
        ok = true;
        break;
      }
    }
    if (!ok) s.d = [...keep];
  }
  if (gained < 1) break;
}

// ---- Report ---------------------------------------------------------------------
const end = layOut();
const table = {};
const report = [];
for (const s of ships) {
  const m = Math.hypot(s.d[0], s.d[1]);
  table[s.key] = [Math.round(s.d[0]), Math.round(s.d[1])];
  report.push({ key: s.key, m, d: s.d });
}
report.sort((a, b) => b.m - a.m);
const mean = report.reduce((t, r) => t + r.m, 0) / report.length;
console.log(
  `p ${SAMPLES.join(", ")} at ${width}×${height}@${scale}, MIN_CSS ${MIN_CSS}, TOL ${TOL}, MARGIN ${MARGIN}: ${start.faults.length} faults at the sources' places; cap ${hi.toFixed(0)} m; mean shift ${mean.toFixed(0)} m; faults left ${end.faults.length}`,
);
console.log(
  `lines' stage: ${lines.map((l) => `${l.group} worst ${l.worst.toFixed(0)} m at scale ${l.least.toFixed(2)}`).join("; ") || "none"}`,
);
console.log(
  `common scales: ${groups.map((g, i) => `${g[0].side} ${g[0].group} ${end.commons[i].toFixed(2)}`).join("; ")}`,
);
const small = placed
  .map((s) => ({ ship: s, ...end.result.get(s) }))
  .filter((x) => x.h < MIN_CSS * dpr - 0.01 || x.s < TOL * x.limit - 1e-6);
console.log(
  `under MIN_CSS or held under TOL: ${small.map((x) => `${x.ship.key} ${(x.h / dpr).toFixed(1)} css (${x.s.toFixed(2)}/${x.limit.toFixed(2)})`).join(", ") || "none"}`,
);
console.log(`out of the frame: ${outOfFrame.join(", ") || "none"}`);
for (const r of report.filter((r) => r.m >= 50))
  console.log(
    `  ${r.key.padEnd(32)} ${r.m.toFixed(0).padStart(5)} m  (${r.d[0].toFixed(0)} E, ${r.d[1].toFixed(0)} N)`,
  );
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(table));
