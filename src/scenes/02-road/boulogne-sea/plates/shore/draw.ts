import { createRng, mix, type Pt, rgba } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { aerial, BUILD, EYE_EN, project, viewOf } from "../../scene";

/**
 * The shore painter's drawing kit: paths, broken strokes, contour-following
 * hatching and the camps' huts, in colour and in the engraving's inks
 * (paint/plate.ts PAPER and INK). Layer units, y up.
 */

export type Rng = () => number;

/** The area's colours: a golden evening, the sun low behind the eye and a little to the left. */
export const SHORE = {
  chalk: "#f1dcaa",
  sand: "#e5b977",
  ochre: "#d6a465",
  seam: "#a3845f",
  clay: "#b49a7a",
  clayDeep: "#9a8672",
  shade: "#8f8899",
  shadeDeep: "#6d687c",
  talus: "#b39c7c",
  block: "#d2b083",
  beach: "#e3cb9b",
  beachLow: "#c9b591",
  turf: "#a3a05c",
  turfLit: "#c8bb69",
  turfShade: "#7f8466",
  stubble: "#dcc07a",
  pasture: "#aeae66",
  fallow: "#c5a678",
  path: "#e0c996",
  hedge: "#7d7b52",
  garden: "#93a160",
  earth: "#b4825a",
  earthLit: "#cf9a66",
  gabion: "#8c6f50",
  muzzle: "#3a3330",
  pale: "#e2ddd2",
  paleShade: "#a5a4ae",
  slate: "#8e909b",
  wood: "#5d5048",
  woodLit: "#8f7558",
  thatchNew: "#e8c47e",
  thatchOld: "#a99272",
  wallLit: "#c4a57a",
  wallWhite: "#ede3cf",
  wallShade: "#8e8590",
  marram: "#9da36d",
  dune: "#e2cc98",
  duneShade: "#b9ab92",
  blue: "#3f5288",
  white: "#efe8da",
  red: "#b5473b",
} as const;

/** A colour seen at `ahead` metres through the evening air. */
export function air(hex: string, ahead: number): string {
  return aerial(hex, ahead);
}

// ------------------------------------------------------------------ paths

export function addLine(p: Path2D, pts: readonly Pt[], closed = false): void {
  if (pts.length === 0) return;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  if (closed) p.closePath();
}

export function poly(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  addLine(p, pts, true);
  return p;
}

/** The region under an open line down to `y` (filled only: its sides and bottom are cuts). */
export function under(line: readonly Pt[], y: number): Path2D {
  const p = new Path2D();
  p.moveTo(line[0][0], y);
  for (const q of line) p.lineTo(q[0], q[1]);
  p.lineTo(line[line.length - 1][0], y);
  p.closePath();
  return p;
}

/** The region between two open lines sampled alike (`top` and `bottom`). */
export function band(top: readonly Pt[], bottom: readonly Pt[]): Path2D {
  const p = new Path2D();
  addLine(p, top);
  for (let i = bottom.length - 1; i >= 0; i--)
    p.lineTo(bottom[i][0], bottom[i][1]);
  p.closePath();
  return p;
}

/** A line between two lines sampled alike, at `t` (0: a, 1: b). */
export function lerpLine(a: readonly Pt[], b: readonly Pt[], t: number): Pt[] {
  const out: Pt[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++)
    out.push([
      a[i][0] + (b[i][0] - a[i][0]) * t,
      a[i][1] + (b[i][1] - a[i][1]) * t,
    ]);
  return out;
}

export function fill(
  c: PlateCanvas,
  p: Path2D,
  style: string | CanvasGradient,
  alpha = 1,
): void {
  c.ctx.globalAlpha = alpha;
  c.ctx.fillStyle = style;
  c.ctx.fill(p);
  c.ctx.globalAlpha = 1;
}

export function stroke(
  c: PlateCanvas,
  p: Path2D,
  px: number,
  colour: string,
  alpha = 1,
): void {
  const { ctx } = c;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = c.pen(px);
  ctx.stroke(p);
}

/**
 * Adds a polyline's pieces to a path, broken: dashes about `dash` units
 * long with gaps about `gap`, each dash kept with the probability
 * `keep(x, y)` (all by default). The engraver's broken stroke.
 */
export function addBroken(
  p: Path2D,
  pts: readonly Pt[],
  dash: number,
  gap: number,
  rng: Rng,
  keep?: (x: number, y: number) => number,
): void {
  if (pts.length < 2) return;
  let on = rng() < 0.75;
  let left = (on ? dash : gap) * (0.3 + rng() * 0.9);
  let visible = on && (!keep || rng() < keep(pts[0][0], pts[0][1]));
  let drawing = false;
  for (let i = 1; i < pts.length; i++) {
    let x0 = pts[i - 1][0];
    let y0 = pts[i - 1][1];
    const x1 = pts[i][0];
    const y1 = pts[i][1];
    let seg = Math.hypot(x1 - x0, y1 - y0);
    while (seg > 1e-9) {
      const step = Math.min(left, seg);
      const t = step / seg;
      const xn = x0 + (x1 - x0) * t;
      const yn = y0 + (y1 - y0) * t;
      if (visible) {
        if (!drawing) {
          p.moveTo(x0, y0);
          drawing = true;
        }
        p.lineTo(xn, yn);
      }
      x0 = xn;
      y0 = yn;
      seg -= step;
      left -= step;
      if (left <= 1e-9) {
        on = !on;
        drawing = false;
        left = (on ? dash : gap) * (0.6 + rng() * 0.8);
        visible = on && (!keep || rng() < keep(x0, y0));
      }
    }
  }
}

/** Short strokes from points: a tick of length `len` at angle `deg` from each. */
export function addTicks(
  p: Path2D,
  pts: readonly Pt[],
  len: number,
  deg: number,
): void {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * len;
  const dy = Math.sin(a) * len;
  for (const [x, y] of pts) {
    p.moveTo(x, y);
    p.lineTo(x + dx, y + dy);
  }
}

// ------------------------------------------------------------------ huts

export interface Hut {
  e: number;
  n: number;
  /** The ground under it, metres as drawn. */
  g: number;
  /** Half-length along the row, half-width across, wall and ridge heights: metres as drawn (BUILD). */
  l: number;
  w: number;
  wall: number;
  ridge: number;
  /** 0: a men's hut; 1: officers' (whitewashed, larger); 2: a kitchen (a chimney); 3: thatched to the ground (a cone when `l` is 0). */
  kind: 0 | 1 | 2 | 3;
  /** The thatch's age, 0 (new, golden) to 1 (two winters, grey-brown). */
  age: number;
  white: boolean;
  /** Its long axis, a unit vector [east, north] (north-south by default). */
  axis?: readonly [number, number];
}

export interface HutShape {
  front: Pt[];
  roof: Pt[];
  end: Pt[];
  endLit: boolean;
  eave: [Pt, Pt];
  ridge: [Pt, Pt];
  chimney: Pt[] | null;
  ahead: number;
}

/** The low sun's direction over the ground, [east, north]: azimuth 294. */
const SUN: readonly [number, number] = [
  Math.sin((294 * Math.PI) / 180),
  Math.cos((294 * Math.PI) / 180),
];

/** A hut's faces in layer units: its front toward the eye, its roof's slope on that side, and the end turned toward the eye. */
export function hutShape(h: Hut): HutShape {
  const [ae, an] = h.axis ?? [0, 1];
  const te = EYE_EN[0] - h.e;
  const tn = EYE_EN[1] - h.n;
  // Across, toward the eye.
  let be = an;
  let bn = -ae;
  if (be * te + bn * tn < 0) {
    be = -be;
    bn = -bn;
  }
  // The end turned toward the eye: +1 the end at +l.
  const s = ae * te + an * tn > 0 ? 1 : -1;
  const endLit = s * (ae * SUN[0] + an * SUN[1]) > 0.15;
  const P = (a: number, b: number, up: number): Pt =>
    project(h.e + ae * a + be * b, h.n + an * a + bn * b, h.g + up);
  const o = 0.35 * BUILD;
  const ahead = viewOf(h.e, h.n)[0];
  if (h.kind === 3 && h.l === 0) {
    // A cone thatched to the ground.
    const base0 = P(h.w, 0, 0);
    const base1 = P(-h.w, 0, 0);
    const apex = P(0, 0, h.ridge);
    const mid = P(0, h.w, 0);
    return {
      front: [],
      roof: [base0, mid, base1, apex],
      end: [P(s * h.w, 0, 0), P(s * h.w * 0.6, -h.w * 0.7, 0), apex],
      endLit,
      eave: [base0, base1],
      ridge: [apex, apex],
      chimney: null,
      ahead,
    };
  }
  const wall = h.kind === 3 ? 0.2 : h.wall;
  const front: Pt[] = [
    P(h.l, h.w, 0),
    P(-h.l, h.w, 0),
    P(-h.l, h.w, wall),
    P(h.l, h.w, wall),
  ];
  const lo = h.kind === 3 ? 0 : wall - 0.15 * BUILD;
  const roof: Pt[] = [
    P(h.l + o, h.w + o, lo),
    P(-h.l - o, h.w + o, lo),
    P(-h.l - o * 0.6, 0, h.ridge),
    P(h.l + o * 0.6, 0, h.ridge),
  ];
  const endA = s * h.l;
  const end: Pt[] = [
    P(endA, h.w, 0),
    P(endA, -h.w, 0),
    P(endA, -h.w, wall),
    P(endA + s * o * 0.6, 0, h.ridge),
    P(endA, h.w, wall),
  ];
  let chimney: Pt[] | null = null;
  if (h.kind === 2) {
    const ca = -s * h.l * 0.4;
    const cw = 0.45 * BUILD;
    chimney = [
      P(ca - cw, cw, h.ridge - 0.6),
      P(ca + cw, cw, h.ridge - 0.6),
      P(ca + cw, cw, h.ridge + 1.6 * BUILD),
      P(ca - cw, cw, h.ridge + 1.6 * BUILD),
    ];
  }
  return {
    front,
    roof,
    end,
    endLit,
    eave: [roof[0], roof[1]],
    ridge: [roof[3], roof[2]],
    chimney,
    ahead,
  };
}

/** Paints huts in colour, far ones first: lit fronts and thatch, the shaded or lit end, the eaves' shadow. */
export function paintHuts(c: PlateCanvas, huts: readonly Hut[]): void {
  const shapes = huts
    .map((h) => ({ h, s: hutShape(h) }))
    .sort((a, b) => b.s.ahead - a.s.ahead);
  const { ctx } = c;
  ctx.lineJoin = "round";
  for (const { h, s } of shapes) {
    const d = s.ahead;
    const thatch = mix(SHORE.thatchNew, SHORE.thatchOld, h.age);
    const wallCol = h.white || h.kind === 1 ? SHORE.wallWhite : SHORE.wallLit;
    // The end: in cool shade for the north camp (its south ends), lit a
    // little less than the fronts for the south camp (north ends).
    const endCol = s.endLit
      ? mix(wallCol, SHORE.wallShade, 0.3)
      : mix(wallCol, SHORE.wallShade, 0.78);
    ctx.fillStyle = air(endCol, d);
    ctx.fill(poly(s.end));
    if (s.front.length) {
      ctx.fillStyle = air(wallCol, d);
      ctx.fill(poly(s.front));
    }
    ctx.fillStyle = air(thatch, d);
    ctx.fill(poly(s.roof));
    // The thatch's lower course, a touch darker, and the eaves' shadow.
    const r = s.roof;
    const k = 0.32;
    const midL: Pt = [
      r[0][0] + (r[3][0] - r[0][0]) * k,
      r[0][1] + (r[3][1] - r[0][1]) * k,
    ];
    const midR: Pt = [
      r[1][0] + (r[2][0] - r[1][0]) * k,
      r[1][1] + (r[2][1] - r[1][1]) * k,
    ];
    ctx.fillStyle = air(mix(thatch, SHORE.thatchOld, 0.45), d);
    ctx.globalAlpha = 0.55;
    ctx.fill(poly([r[0], r[1], midR, midL]));
    ctx.globalAlpha = 1;
    // The roof's end, edge-on toward the eye: the gable's barge in shade.
    const eaveShadow = new Path2D();
    eaveShadow.moveTo(s.eave[0][0], s.eave[0][1]);
    eaveShadow.lineTo(s.eave[1][0], s.eave[1][1]);
    stroke(c, eaveShadow, 0.7, air(SHORE.shadeDeep, d), 0.55);
    const ridge = new Path2D();
    ridge.moveTo(s.ridge[0][0], s.ridge[0][1]);
    ridge.lineTo(s.ridge[1][0], s.ridge[1][1]);
    stroke(c, ridge, 0.6, air(mix(thatch, "#fff3d6", 0.4), d), 0.7);
    if (s.chimney) {
      ctx.fillStyle = air(mix(SHORE.earth, SHORE.shade, 0.3), d);
      ctx.fill(poly(s.chimney));
    }
  }
}

/** Engraves huts: paper-backed, the roof's contour and eaves, the shaded end hatched. */
export function engraveHuts(c: PlateCanvas, huts: readonly Hut[]): void {
  const shapes = huts
    .map((h) => ({ h, s: hutShape(h) }))
    .sort((a, b) => b.s.ahead - a.s.ahead);
  const { ctx } = c;
  for (const { s } of shapes) {
    const d = s.ahead;
    const px = Math.max(0.5, Math.min(1.4, 2000 / d));
    ctx.fillStyle = PAPER.low;
    ctx.fill(poly(s.end));
    if (s.front.length) ctx.fill(poly(s.front));
    ctx.fill(poly(s.roof));
    const line = new Path2D();
    const r = s.roof;
    // The roof's true contours: up its end, along the ridge, down; the eaves.
    line.moveTo(r[0][0], r[0][1]);
    line.lineTo(r[3][0], r[3][1]);
    line.lineTo(r[2][0], r[2][1]);
    line.lineTo(r[1][0], r[1][1]);
    line.lineTo(r[0][0], r[0][1]);
    if (s.chimney) addLine(line, s.chimney, true);
    stroke(c, line, px * 0.8, INK.line, 0.9);
    const e = s.end;
    const hatchP = new Path2D();
    // A cone's end is a triangle: no end wall to hatch.
    const strokes = e.length < 5 ? 0 : s.endLit ? 1 : 3;
    for (let i = 1; i <= strokes; i++) {
      const t = i / (strokes + 1);
      const x = e[0][0] + (e[1][0] - e[0][0]) * t;
      const y0 = e[0][1] + (e[1][1] - e[0][1]) * t;
      const y1 = e[4][1] + (e[2][1] - e[4][1]) * t;
      hatchP.moveTo(x, y0);
      hatchP.lineTo(x, y1);
    }
    // A few strokes down the thatch.
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const a: Pt = [
        r[0][0] + (r[1][0] - r[0][0]) * t,
        r[0][1] + (r[1][1] - r[0][1]) * t,
      ];
      const b: Pt = [
        r[3][0] + (r[2][0] - r[3][0]) * t,
        r[3][1] + (r[2][1] - r[3][1]) * t,
      ];
      hatchP.moveTo(a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15);
      hatchP.lineTo(a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7);
    }
    stroke(c, hatchP, px * 0.55, INK.hatch, 0.75);
  }
}

/**
 * Lays huts along a row of the ground: `at(t)` gives the ground's point
 * (east, north, drawn metres) at `t` metres along the row; huts about 12 m
 * long as drawn (6 m true), short gaps, a cross street every battalion.
 */
export function rowHuts(
  rng: Rng,
  length: number,
  at: (t: number) => readonly [number, number, number],
  kind: 0 | 1 | 2,
  opts: {
    gap?: number;
    street?: number;
    block?: number;
    keep?: (t: number) => number;
  } = {},
): Hut[] {
  const huts: Hut[] = [];
  const gap = opts.gap ?? 4;
  const street = opts.street ?? 22;
  const block = opts.block ?? 9;
  let t = rng() * 10;
  let inBlock = Math.floor(rng() * block);
  while (t < length) {
    const big = kind === 1 ? 1.35 : 1;
    const l = (2.6 + rng() * 0.9) * BUILD * big;
    const mid = t + l;
    if (mid > length) break;
    const [e, n, g] = at(mid);
    const [e0, n0] = at(Math.max(0, mid - l));
    const [e1, n1] = at(Math.min(length, mid + l));
    const al = Math.hypot(e1 - e0, n1 - n0) || 1;
    if (!opts.keep || rng() < opts.keep(mid)) {
      huts.push({
        e,
        n,
        g: g - 0.5 * BUILD,
        l,
        w: (1.8 + rng() * 0.4) * BUILD * big,
        wall: (kind === 1 ? 1.6 : 0.6 + rng() * 0.25) * BUILD,
        ridge: (kind === 1 ? 3.6 : 2.6 + rng() * 0.5) * BUILD,
        kind,
        age: Math.min(1, Math.max(0, 0.72 + (rng() - 0.5) * 0.6)),
        white: kind === 1 || rng() < 0.12,
        axis: [(e1 - e0) / al, (n1 - n0) / al],
      });
    }
    t += 2 * l + gap * (0.7 + rng() * 0.6);
    inBlock++;
    if (inBlock >= block) {
      inBlock = 0;
      t += street * (0.8 + rng() * 0.5);
    }
  }
  return huts;
}

// ------------------------------------------------------------------ marks

/** A post windmill: its body on a trestle, four sails; `turn` the sails' angle. */
export function windmill(
  e: number,
  n: number,
  g: number,
  turn: number,
): {
  body: Pt[];
  post: Pt[];
  sails: Pt[][];
  hub: Pt;
  ahead: number;
  size: number;
} {
  const ahead = viewOf(e, n)[0];
  const u = 1000 / ahead;
  const [x, y] = project(e, n, g);
  const bw = 2.6 * BUILD * u;
  const bh = 4.2 * BUILD * u;
  const pz = 2.8 * BUILD * u;
  const body: Pt[] = [
    [x - bw, y + pz],
    [x + bw, y + pz],
    [x + bw * 0.9, y + pz + bh],
    [x, y + pz + bh * 1.22],
    [x - bw * 0.9, y + pz + bh],
  ];
  const post: Pt[] = [
    [x - bw * 1.1, y],
    [x - 0.15 * u, y + pz],
    [x + 0.15 * u, y + pz],
    [x + bw * 1.1, y],
  ];
  const hub: Pt = [x - bw * 0.2, y + pz + bh * 0.7];
  const R = 9.5 * BUILD * u;
  const sails: Pt[][] = [];
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const w0 = 0.12 * R;
    const pts: Pt[] = [
      [
        hub[0] + ca * R * 0.18 - sa * w0 * 0.2,
        hub[1] + sa * R * 0.18 + ca * w0 * 0.2,
      ],
      [hub[0] + ca * R - sa * w0 * 0.2, hub[1] + sa * R + ca * w0 * 0.2],
      [hub[0] + ca * R + sa * w0, hub[1] + sa * R - ca * w0],
      [hub[0] + ca * R * 0.18 + sa * w0, hub[1] + sa * R * 0.18 - ca * w0],
    ];
    sails.push(pts);
  }
  return { body, post, sails, hub, ahead, size: R };
}

export function paintWindmill(
  c: PlateCanvas,
  m: ReturnType<typeof windmill>,
  mode: "colour" | "ink",
): void {
  const { ctx } = c;
  if (mode === "colour") {
    const wood = air(SHORE.wood, m.ahead);
    const lit = air(SHORE.woodLit, m.ahead);
    const post = new Path2D();
    addLine(post, m.post);
    stroke(c, post, 1, wood, 1);
    ctx.fillStyle = wood;
    ctx.fill(poly(m.body));
    ctx.fillStyle = lit;
    ctx.globalAlpha = 0.85;
    ctx.fill(
      poly([
        m.body[0],
        m.body[4],
        m.body[3],
        [(m.body[0][0] + m.body[1][0]) / 2 - 0.2, m.body[3][1]],
        [(m.body[0][0] + m.body[1][0]) / 2 - 0.2, m.body[0][1]],
      ]),
    );
    ctx.globalAlpha = 1;
    const frame = new Path2D();
    const cloth = new Path2D();
    for (const s of m.sails) {
      frame.moveTo(m.hub[0], m.hub[1]);
      frame.lineTo(s[1][0], s[1][1]);
      addLine(cloth, s, true);
    }
    ctx.fillStyle = air("#d9cdb2", m.ahead);
    ctx.globalAlpha = 0.75;
    ctx.fill(cloth);
    ctx.globalAlpha = 1;
    stroke(c, frame, 0.9, wood, 1);
    return;
  }
  ctx.fillStyle = PAPER.low;
  ctx.fill(poly(m.body));
  const line = new Path2D();
  addLine(line, m.body, true);
  addLine(line, m.post);
  for (const s of m.sails) {
    line.moveTo(m.hub[0], m.hub[1]);
    line.lineTo(s[1][0], s[1][1]);
    addLine(line, [s[1], s[2], s[3]]);
  }
  stroke(c, line, 0.7, INK.line, 0.9);
  const h = new Path2D();
  const [a, b] = [m.body[0], m.body[1]];
  for (let i = 1; i < 4; i++) {
    const x = a[0] + (b[0] - a[0]) * (0.45 + i * 0.15);
    h.moveTo(x, a[1]);
    h.lineTo(x, m.body[2][1]);
  }
  stroke(c, h, 0.5, INK.hatch, 0.8);
}

/** A flag on its staff: the tricolour (blue at the hoist), streaming to the left on the south-west wind... */
export function flag(
  x: number,
  y: number,
  staff: number,
  size: number,
): { staff: [Pt, Pt]; panes: Pt[][] } {
  const top: Pt = [x, y + staff];
  const w = size * 1.5;
  const h = size;
  // On a south-west wind the flag streams to the north-east: away and to the left.
  const panes: Pt[][] = [];
  for (let i = 0; i < 3; i++) {
    const x0 = top[0] - (w * i) / 3;
    const x1 = top[0] - (w * (i + 1)) / 3;
    const sag0 = (i / 3) * h * 0.12;
    const sag1 = ((i + 1) / 3) * h * 0.12;
    panes.push([
      [x0, top[1] - sag0],
      [x1, top[1] - sag1],
      [x1, top[1] - h - sag1],
      [x0, top[1] - h - sag0],
    ]);
  }
  return { staff: [[x, y], top], panes };
}

export function paintFlag(
  c: PlateCanvas,
  f: ReturnType<typeof flag>,
  ahead: number,
  mode: "colour" | "ink",
): void {
  const st = new Path2D();
  st.moveTo(f.staff[0][0], f.staff[0][1]);
  st.lineTo(f.staff[1][0], f.staff[1][1]);
  if (mode === "colour") {
    stroke(c, st, 0.8, air(SHORE.wood, ahead), 1);
    const cols = [SHORE.blue, SHORE.white, SHORE.red];
    f.panes.forEach((p, i) => {
      c.ctx.fillStyle = air(cols[i], ahead);
      c.ctx.fill(poly(p));
    });
    return;
  }
  stroke(c, st, 0.7, INK.line, 0.9);
  const o = new Path2D();
  for (const p of f.panes) {
    c.ctx.fillStyle = PAPER.low;
    c.ctx.fill(poly(p));
  }
  const all = f.panes;
  addLine(o, [all[0][0], all[2][1], all[2][2], all[0][3]]);
  stroke(c, o, 0.6, INK.line, 0.85);
  const h = new Path2D();
  addTicks(h, [all[0][3]], 0, 0);
  const p0 = all[0];
  for (let i = 1; i < 3; i++) {
    const t = i / 3;
    h.moveTo(p0[3][0] + (p0[2][0] - p0[3][0]) * t, p0[3][1]);
    h.lineTo(p0[0][0] + (p0[1][0] - p0[0][0]) * t, p0[0][1]);
  }
  stroke(c, h, 0.45, INK.hatch, 0.8);
}

/** The pen for a contour at `ahead` metres: about 1.4 device px near, 0.6 far. */
export function penFor(ahead: number, near = 1.4): number {
  return Math.max(0.5, Math.min(near, near * (1300 / ahead) ** 1.1));
}

export { createRng };
