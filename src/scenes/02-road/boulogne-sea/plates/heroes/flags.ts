import { mix as linMix, lit } from "@/components/ship/craft/light";
import type { CraftSpec } from "@/components/ship/craft/types";
import { SEA_EYE } from "../../../interludes";
import { createRng } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { EYE_H } from "../../scene";

/**
 * The flags of a craft at anchor in a light westerly air (one wind for
 * the whole painting: toward the east, away from the eye and a little to
 * the left): plain bunting hanging heavily from its halyard, its fly
 * lifted away from the eye by the air and falling in folds. Built as a
 * cloth in the view's own frame and projected point by point, so a flag
 * leans toward the wind's vanishing point on the horizon (to the left on
 * most of the frame, to the right on its far left) and is seen
 * foreshortened, as it would be; its folds are lit by the low sun behind
 * the eye and a little to the left, or turned from it into a cool shade.
 *
 * The tricolour (three equal vertical bands, blue at the hoist, white,
 * red) at the stern; the masthead pennant (by the decree of 1794 a fifth
 * blue at the mast, a fifth white, three fifths red), long and narrow,
 * tapering to its point. In the engraving: the cloth on paper, its edges,
 * the colours in the heralds' hatching an engraver of the period used
 * (blue in lines along the fly, red in lines down the hoist, white plain)
 * and the folds turned from the light hatched closer.
 */

type V3 = readonly [number, number, number];

const DEG = Math.PI / 180;
/** The light air blows toward this azimuth (from the west, toward the east). */
const WIND_TO = 90;
/** The sun: azimuth and elevation, degrees. */
const SUN_AZ = 294;
const SUN_EL = 5;

const rel = (az: number) => (az - SEA_EYE.heading) * DEG;
/** Directions in the view's frame: ahead, right, up. */
const WIND: V3 = [Math.cos(rel(WIND_TO)), Math.sin(rel(WIND_TO)), 0];
/** Across the wind, level, to the right of it. */
const ACROSS: V3 = [-WIND[1], WIND[0], 0];
const SUN: V3 = [
  Math.cos(rel(SUN_AZ)) * Math.cos(SUN_EL * DEG),
  Math.sin(rel(SUN_AZ)) * Math.cos(SUN_EL * DEG),
  Math.sin(SUN_EL * DEG),
];

/** Where a craft stands, for its flags: metres ahead of the eye, right of the axis; its hull's mid-length; bow left. */
export interface FlagSite {
  ahead: number;
  right: number;
  midX: number;
  bowLeft: boolean;
}

export interface FlagSpec {
  kind: "ensign" | "pennant";
  /** The hoist's top, metres: x along the hull from the sternpost, y up from the waterline. */
  anchor: readonly [number, number];
  fly: number;
  hoist: number;
  seed: number;
}

/** A piece of the cloth: its corners in layer units, its band, its light, its distance. */
export interface ClothQuad {
  pts: [number, number][];
  band: 0 | 1 | 2;
  /** 0: turned from the sun, 1: square to it. */
  light: number;
  depth: number;
  /** Column along the fly (0 at the hoist) and row down the hoist. */
  i: number;
  j: number;
}

export interface ClothShape {
  quads: ClothQuad[];
  /** The grid, layer units: [i][j], i along the fly, j down the hoist. */
  grid: [number, number][][];
  nu: number;
  nv: number;
  /** Bands' first columns: white, red. */
  breaks: readonly [number, number];
  bounds: { x0: number; x1: number; y0: number; y1: number };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * The cloth's points in the view's frame (ahead, right, up), metres from
 * the eye, before projection: hanging from the halyard at the anchor, each
 * thread along the fly sagging more toward its end, the folds swinging the
 * cloth across the wind.
 */
function clothPoints(site: FlagSite, f: FlagSpec, nu: number, nv: number) {
  const rng = createRng(f.seed);
  const ensign = f.kind === "ensign";
  // How the cloth hangs: the angle below level at the hoist and at the fly.
  const th0 = (ensign ? 12 : 8) + rng() * 6;
  const th1 = (ensign ? 50 : 40) + rng() * 10;
  // Folds: across the wind, a few along the fly, leaning down toward it.
  const folds = ensign ? 1.5 + rng() * 0.6 : 1.2 + rng() * 0.4;
  const amp = ensign ? 0.08 + rng() * 0.03 : 0.028 + rng() * 0.014;
  const ph = rng() * Math.PI * 2;
  const ph2 = rng() * Math.PI * 2;
  const lean = 1.2 + rng() * 0.6;
  const gather = ensign ? 0.86 : 0.9;
  const side = site.bowLeft ? -1 : 1;
  const r0 = site.right + side * (f.anchor[0] - site.midX);
  const pts: V3[][] = [];
  for (let i = 0; i <= nu; i++) {
    const col: V3[] = [];
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      // Integrate the thread at this height out to u.
      let t = 0;
      let drop = 0;
      const steps = Math.max(1, i);
      for (let s = 0; s < steps && i > 0; s++) {
        const u = ((s + 0.5) / steps) * (i / nu);
        const th = (th0 + (th1 - th0) * u ** 1.25 + (ensign ? 6 * v : 0)) * DEG;
        const du = i / nu / steps;
        t += Math.cos(th) * du * f.fly * gather;
        drop += Math.sin(th) * du * f.fly;
      }
      const u = i / nu;
      const grow = Math.min(1, u / 0.14) ** 1.5;
      const q =
        f.fly *
        amp *
        grow *
        (0.75 + 0.45 * u) *
        (Math.sin(2 * Math.PI * folds * u + ph + lean * v) +
          0.35 * Math.sin(2 * Math.PI * folds * 2.2 * u + ph2 - 0.8 * v));
      // A pennant narrows to its point.
      const width = ensign ? f.hoist : f.hoist * (1 - 0.88 * u);
      const up = f.anchor[1] - v * width - drop;
      col.push([
        site.ahead + WIND[0] * t + ACROSS[0] * q,
        r0 + WIND[1] * t + ACROSS[1] * q,
        up,
      ]);
    }
    pts.push(col);
  }
  return pts;
}

const rad = (d: number) => (d * Math.PI) / 180;

/**
 * The craft's flags from its spec's numbers (rig.ts's layout, copied, so
 * a plate can be measured without building the craft): the tricolour's
 * hoist at the ensign staff's head, the gaff's peak or a masthead; the
 * pennant's at the masthead's truck.
 */
export function flagAnchors(spec: CraftSpec, seed: number): FlagSpec[] {
  const out: FlagSpec[] = [];
  const mastAt = (id: string | undefined, y: number, pole: boolean) => {
    const m =
      spec.masts.find((q) => q.id === id) ?? spec.masts[spec.masts.length - 1];
    const lean = Math.tan(rad(m.rake));
    const x = m.x - (y - m.deck) * lean;
    if (!pole || m.head === undefined || m.top === undefined) return [x, y];
    const [dL, dT, dG] = m.d;
    const topOffset = (dL * 0.8 + dT) / 2 + 0.04;
    return [x + topOffset + (dT * 0.8 + dG) / 2 + 0.03, y];
  };
  const e = spec.ensign;
  let anchor: number[];
  if (e.at === "staff" && e.staff) {
    const st = e.staff;
    anchor = [
      st.foot[0] - Math.sin(rad(st.rake)) * st.height,
      st.foot[1] + Math.cos(rad(st.rake)) * st.height - 0.08,
    ];
  } else if (e.at === "peak" && spec.gaff) {
    const g = spec.gaff;
    const [tx, ty] = mastAt(g.mast, g.throat, false);
    anchor = [
      tx - Math.cos(rad(g.angle)) * g.length * Math.cos(rad(g.ease)) - 0.05,
      ty + Math.sin(rad(g.angle)) * g.length - 0.12,
    ];
  } else {
    const m =
      spec.masts.find((q) => q.id === e.mast) ??
      spec.masts[spec.masts.length - 1];
    anchor = mastAt(m.id, m.truck - 0.12, true);
  }
  out.push({
    kind: "ensign",
    anchor: [anchor[0], anchor[1]],
    fly: e.fly,
    hoist: e.hoist,
    seed: seed * 7,
  });
  const p = spec.pennant;
  if (p) {
    const m = spec.masts.find((q) => q.id === p.mast);
    if (m) {
      const at = mastAt(m.id, m.truck - 0.1, true);
      out.push({
        kind: "pennant",
        anchor: [at[0], at[1]],
        fly: p.length,
        hoist: p.hoist,
        seed: seed * 7 + 131,
      });
    }
  }
  return out;
}

/** A flag's box in layer units from a coarse cloth (generous), for measuring a plate. */
export function clothBounds(
  site: FlagSite,
  f: FlagSpec,
): { x0: number; x1: number; y0: number; y1: number } {
  const P = clothPoints(site, f, 8, 2);
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const col of P)
    for (const p of col) {
      const x = (1000 * p[1]) / p[0];
      const y = (1000 * (p[2] - EYE_H)) / p[0];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  const m = (1000 / site.ahead) * f.fly * 0.12 + 2;
  return { x0: x0 - m, x1: x1 + m, y0: y0 - m, y1: y1 + m };
}

const SHAPES = new Map<string, ClothShape>();

/**
 * The flag's cloth in layer units, as quads to paint far to near, each
 * lit by how it turns to the sun; `mirror`: its reflection in the water.
 */
export function clothShape(
  site: FlagSite,
  f: FlagSpec,
  mirror = false,
): ClothShape {
  const key = `${site.ahead.toFixed(2)}:${site.right.toFixed(2)}:${f.kind}:${f.anchor[0].toFixed(2)}:${f.anchor[1].toFixed(2)}:${f.fly}:${f.hoist}:${f.seed}:${mirror}`;
  const hit = SHAPES.get(key);
  if (hit) return hit;
  const ensign = f.kind === "ensign";
  const nu = ensign ? 24 : 30;
  const nv = ensign ? 6 : 2;
  const P = clothPoints(site, f, nu, nv);
  const proj = (p: V3): [number, number] => [
    (1000 * p[1]) / p[0],
    (1000 * ((mirror ? -p[2] : p[2]) - EYE_H)) / p[0],
  ];
  const grid = P.map((col) => col.map(proj));
  const breaks: readonly [number, number] = ensign
    ? [nu / 3, (2 * nu) / 3]
    : [Math.round(nu * 0.2), Math.round(nu * 0.4)];
  const quads: ClothQuad[] = [];
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = P[i][j];
      const b = P[i + 1][j];
      const c = P[i + 1][j + 1];
      const d = P[i][j + 1];
      let n = unit(cross(sub(b, a), sub(d, a)));
      const mid: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
      // The face the eye sees.
      const toEye = unit([-mid[0], -mid[1], EYE_H - mid[2]]);
      if (dot(n, toEye) < 0) n = [-n[0], -n[1], -n[2]];
      const light = Math.max(0, dot(n, SUN));
      const pts = [
        grid[i][j],
        grid[i + 1][j],
        grid[i + 1][j + 1],
        grid[i][j + 1],
      ];
      for (const [x, y] of pts) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      quads.push({
        pts,
        band: i < breaks[0] ? 0 : i < breaks[1] ? 1 : 2,
        light,
        depth: mid[0],
        i,
        j,
      });
    }
  }
  quads.sort((p, q) => q.depth - p.depth);
  const shape = { quads, grid, nu, nv, breaks, bounds: { x0, x1, y0, y1 } };
  SHAPES.set(key, shape);
  return shape;
}

/** The bunting's colours (flags.ts's), as cloth in white light. */
const BUNTING = ["#24366a", "#e6e0d2", "#b8312a"] as const;

const TONES = new Map<string, readonly [string, string][]>();
/** Each band's tone in the sun and in the shade, through the air at a distance. */
function tonesAt(haze: number, hazeColour: string) {
  const key = `${haze.toFixed(2)}:${hazeColour}`;
  let t = TONES.get(key);
  if (!t) {
    t = BUNTING.map((m): [string, string] => [
      linMix(lit(m, "evening", "side"), hazeColour, haze),
      linMix(lit(m, "evening", "shadow"), hazeColour, haze),
    ]);
    TONES.set(key, t);
  }
  return t;
}

/** The cloth in colour: quads far to near, each its band's tone by its light. */
export function paintCloth(
  c: PlateCanvas,
  shape: ClothShape,
  haze: number,
  hazeColour: string,
  toward?: { colour: string; share: number },
): void {
  const { ctx } = c;
  const tones = tonesAt(haze, hazeColour);
  ctx.lineJoin = "round";
  ctx.lineWidth = c.pen(0.55);
  ctx.globalAlpha = 1;
  for (const q of shape.quads) {
    const [sun, shade] = tones[q.band];
    let col = linMix(shade, sun, Math.min(1, q.light ** 0.85 * 1.08));
    if (toward) col = linMix(col, toward.colour, toward.share);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(q.pts[0][0], q.pts[0][1]);
    for (let k = 1; k < 4; k++) ctx.lineTo(q.pts[k][0], q.pts[k][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * The cloth engraved: column by column far to near, each backed with
 * paper, then its hatching (blue along the fly, red down the hoist, the
 * shaded folds closer), then the cloth's edges.
 */
export function engraveCloth(
  c: PlateCanvas,
  shape: ClothShape,
  weight: number,
): void {
  const { ctx } = c;
  const { grid, nu, nv, breaks } = shape;
  // Columns' depth and light: the mean of their quads.
  const cols = Array.from({ length: nu }, (_, i) => ({
    i,
    depth: 0,
    light: 0,
  }));
  for (const q of shape.quads) {
    cols[q.i].depth += q.depth / nv;
    cols[q.i].light += q.light / nv;
  }
  cols.sort((a, b) => b.depth - a.depth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const at = (i: number, v: number): [number, number] => {
    const j = Math.min(nv - 1, Math.floor(v * nv));
    const f = v * nv - j;
    const a = grid[i][j];
    const b = grid[i][j + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  for (const col of cols) {
    const i = col.i;
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER.low;
    ctx.beginPath();
    ctx.moveTo(...grid[i][0]);
    for (let j = 1; j <= nv; j++) ctx.lineTo(...grid[i][j]);
    for (let j = nv; j >= 0; j--) ctx.lineTo(...grid[i + 1][j]);
    ctx.closePath();
    ctx.fill();
    const band = i < breaks[0] ? 0 : i < breaks[1] ? 1 : 2;
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(0.45 * weight);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    if (band === 0) {
      // Azure: lines along the fly, across this column.
      const rows = Math.max(3, Math.round(nv * 2.2));
      for (let r = 0; r <= rows; r++) {
        const v = (r + 0.5) / (rows + 1);
        ctx.moveTo(...at(i, v));
        ctx.lineTo(...at(i + 1, v));
      }
    }
    // Gules, and the folds turned from the sun: lines down the hoist.
    const down = (band === 2 ? 2 : 0) + (col.light < 0.35 ? 2 : 0);
    for (let k = 0; k < down; k++) {
      const t = (k + 0.5) / down;
      const p0 = grid[i][0];
      const p1 = grid[i + 1][0];
      const top: [number, number] = [
        p0[0] + (p1[0] - p0[0]) * t,
        p0[1] + (p1[1] - p0[1]) * t,
      ];
      ctx.moveTo(...top);
      for (let j = 1; j <= nv; j++) {
        const a = grid[i][j];
        const b = grid[i + 1][j];
        ctx.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      }
    }
    ctx.stroke();
    // The column's share of the cloth's edges: its top, its foot, the hoist and the fly.
    ctx.globalAlpha = 1;
    ctx.lineWidth = c.pen(0.6 * weight);
    ctx.beginPath();
    ctx.moveTo(...grid[i][0]);
    ctx.lineTo(...grid[i + 1][0]);
    ctx.moveTo(...grid[i][nv]);
    ctx.lineTo(...grid[i + 1][nv]);
    if (i === nu - 1 || i === 0) {
      const e = i === 0 ? 0 : nu;
      ctx.moveTo(...grid[e][0]);
      for (let j = 1; j <= nv; j++) ctx.lineTo(...grid[e][j]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
