import { createRng, mix, type Pt, rgba } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { aerial, BUILD, EYE_EN, EYE_H, project, viewOf } from "../../scene";
import { HAZE, hazeOf } from "../heroes/common";
import { engraveCloth, paintCloth, staffFlag } from "../heroes/flags";

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
  turf: "#949650",
  turfLit: "#b4ad5c",
  turfShade: "#6c7358",
  stubble: "#d2b46a",
  pasture: "#9aa05a",
  fallow: "#b49272",
  path: "#cbb589",
  hedge: "#5d6045",
  hedgeLit: "#8a8d55",
  garden: "#7e9150",
  earth: "#b4825a",
  earthLit: "#cf9a66",
  gabion: "#8c6f50",
  muzzle: "#3a3330",
  pale: "#e2ddd2",
  paleShade: "#a5a4ae",
  slate: "#8e909b",
  wood: "#5d5048",
  woodLit: "#8f7558",
  thatchNew: "#d9b674",
  thatchOld: "#a3927a",
  thatchShade: "#7a6a59",
  thatchOldShade: "#67605f",
  wallLit: "#c9ad86",
  wallWhite: "#e6dccb",
  wallShade: "#8f8790",
  wallWhiteShade: "#a9a6b0",
  hutFoot: "#4e4a4c",
  hutDoor: "#4a4140",
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
  // A hex colour takes the alpha into its style; a CSS colour through the context.
  const hex = colour.startsWith("#");
  ctx.strokeStyle = hex ? rgba(colour, alpha) : colour;
  if (!hex) ctx.globalAlpha = alpha;
  ctx.lineWidth = c.pen(px);
  ctx.stroke(p);
  ctx.globalAlpha = 1;
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
  /** Half-length along its axis, half-width across, wall and ridge heights: metres as drawn (BUILD). */
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

/**
 * A hut's faces toward the eye, layer units, and how square each stands
 * to the low sun (0 in the sky's shade, 1 full in the sun): the gable end
 * turned toward the eye, the long wall and the roof's slope on the eye's
 * side, the thatch's cut end framing the gable.
 */
export interface HutShape {
  gable: Pt[];
  gableLight: number;
  side: Pt[];
  sideLight: number;
  roof: Pt[];
  roofLight: number;
  /** The thatch's end over the gable (a chevron), lit as the gable. */
  rake: Pt[];
  ridge: [Pt, Pt];
  /** Where the walls meet the ground, toward the eye. */
  foot: Pt[];
  door: Pt[] | null;
  chimney: Pt[] | null;
  /** A cone thatched to the ground: no walls. */
  cone: boolean;
  ahead: number;
  /** Layer units per drawn metre at its distance. */
  unit: number;
}

/** The low sun: azimuth 294, 7° up. Its direction [east, north, up]. */
const SUN_ALT = (7 * Math.PI) / 180;
const SUN: readonly [number, number, number] = [
  Math.sin((294 * Math.PI) / 180) * Math.cos(SUN_ALT),
  Math.cos((294 * Math.PI) / 180) * Math.cos(SUN_ALT),
  Math.sin(SUN_ALT),
];

/** How square a face of normal [east, north, up] (unit) stands to the sun, 0..1. */
export function sunOn(ne: number, nn: number, nu: number): number {
  return Math.max(0, ne * SUN[0] + nn * SUN[1] + nu * SUN[2]);
}

/** A hut's faces toward the eye, lit by the low sun. */
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
  const P = (a: number, b: number, up: number): Pt =>
    project(h.e + ae * a + be * b, h.n + an * a + bn * b, h.g + up);
  // The thatch's overhang: heavy, so the gable reads as a clay wall under
  // a hood of straw, not a pale triangle (a tent, which the brief forbids).
  const o = 0.55 * BUILD;
  const ahead = viewOf(h.e, h.n)[0];
  const unit = 1000 / ahead;
  const gableLight = sunOn(s * ae, s * an, 0);
  const sideLight = sunOn(be, bn, 0);
  if (h.kind === 3 && h.l === 0) {
    // A cone thatched to the ground: its lit and shaded halves.
    const base0 = P(0, h.w, 0);
    const base1 = P(0, -h.w, 0);
    const toward = P(h.w * 0.7 * s, h.w * 0.7, 0);
    const apex = P(0, 0, h.ridge);
    return {
      gable: [toward, base1, apex],
      gableLight,
      side: [base0, toward, apex],
      sideLight,
      roof: [],
      roofLight: 0,
      rake: [],
      ridge: [apex, apex],
      foot: [base0, toward, base1],
      door: null,
      chimney: null,
      cone: true,
      ahead,
      unit,
    };
  }
  const wall = h.kind === 3 ? 0.2 : h.wall;
  const lo = h.kind === 3 ? 0 : wall - 0.15 * BUILD;
  const run = h.w + o;
  const pitch = Math.atan2(h.ridge - lo, run);
  const roofLight = sunOn(
    be * Math.sin(pitch),
    bn * Math.sin(pitch),
    Math.cos(pitch),
  );
  const near = s * h.l;
  const far = -s * h.l;
  const side: Pt[] = [
    P(near, h.w, 0),
    P(far, h.w, 0),
    P(far, h.w, wall),
    P(near, h.w, wall),
  ];
  const roof: Pt[] = [
    P(near + s * o, run, lo),
    P(far - s * o, run, lo),
    P(far - s * o * 0.6, 0, h.ridge),
    P(near + s * o * 0.6, 0, h.ridge),
  ];
  const gable: Pt[] = [
    P(near, h.w, 0),
    P(near, -h.w, 0),
    P(near, -h.w, wall),
    P(near, 0, h.ridge - 0.3 * BUILD),
    P(near, h.w, wall),
  ];
  // The thatch's cut end: its outer edge (with the overhang) and its inner (the gable's top).
  const rake: Pt[] = [
    P(near + s * o, run, lo),
    P(near + s * o * 0.6, 0, h.ridge),
    P(near + s * o, -run, lo),
    P(near, -h.w, wall),
    P(near, 0, h.ridge - 0.3 * BUILD),
    P(near, h.w, wall),
  ];
  let door: Pt[] | null = null;
  if (h.kind !== 3 && h.w * unit > 3.2) {
    const dw = 0.45 * BUILD;
    const dh = Math.min(wall + 0.6 * BUILD, h.ridge * 0.6);
    const pick = (((Math.floor(h.e * 7 + h.n * 3) % 3) + 3) % 3) - 1;
    const off = h.w * 0.3 * pick;
    door = [
      P(near, off - dw, 0),
      P(near, off + dw, 0),
      P(near, off + dw, dh),
      P(near, off - dw, dh),
    ];
  }
  let chimney: Pt[] | null = null;
  if (h.kind === 2) {
    const ca = -s * h.l * 0.4;
    const cw = 0.45 * BUILD;
    chimney = [
      P(ca - cw, cw, h.ridge - 0.6),
      P(ca + cw, cw, h.ridge - 0.6),
      P(ca + cw, cw, h.ridge + 1.4 * BUILD),
      P(ca - cw, cw, h.ridge + 1.4 * BUILD),
    ];
  }
  return {
    gable,
    gableLight,
    side,
    sideLight,
    roof,
    roofLight,
    rake,
    ridge: [roof[3], roof[2]],
    foot: [P(far, h.w, 0), P(near, h.w, 0), P(near, -h.w, 0)],
    door,
    chimney,
    cone: false,
    ahead,
    unit,
  };
}

/** Thatch in the sun and in the sky's shade, by its age. */
function thatchOf(h: Hut, light: number): string {
  const lit = mix(SHORE.thatchNew, SHORE.thatchOld, h.age);
  const shade = mix(SHORE.thatchShade, SHORE.thatchOldShade, h.age);
  return mix(shade, lit, Math.min(1, light * 1.25) ** 0.8);
}

/** Daub or limewash in the sun and in the sky's shade. */
function wallOf(h: Hut, light: number): string {
  const white = h.white || h.kind === 1;
  const lit = white ? SHORE.wallWhite : SHORE.wallLit;
  const shade = white ? SHORE.wallWhiteShade : SHORE.wallShade;
  return mix(shade, lit, Math.min(1, light * 1.1) ** 0.85);
}

/**
 * Paints huts in colour, far ones first: the long wall and the thatch on
 * the eye's side, the gable end over them, framed by the thatch's cut
 * end; a door, the ridge catching the sun, a dark line where the half-sunk
 * walls meet the ground.
 */
export function paintHuts(c: PlateCanvas, huts: readonly Hut[]): void {
  const shapes = huts
    .map((h) => ({ h, s: hutShape(h) }))
    .sort((a, b) => b.s.ahead - a.s.ahead);
  const { ctx } = c;
  ctx.lineJoin = "round";
  for (const { h, s } of shapes) {
    const d = s.ahead;
    if (s.cone) {
      ctx.fillStyle = air(thatchOf(h, s.sideLight * 0.8), d);
      ctx.fill(poly(s.side));
      ctx.fillStyle = air(thatchOf(h, s.gableLight), d);
      ctx.fill(poly(s.gable));
      const foot = new Path2D();
      addLine(foot, s.foot);
      stroke(c, foot, 0.7, air(SHORE.hutFoot, d), 0.7);
      continue;
    }
    ctx.fillStyle = air(wallOf(h, s.sideLight), d);
    ctx.fill(poly(s.side));
    ctx.fillStyle = air(thatchOf(h, s.roofLight), d);
    ctx.fill(poly(s.roof));
    // The thatch's lower course, a touch darker, where it hangs over the wall.
    const r = s.roof;
    const k = 0.3;
    const midN: Pt = [
      r[0][0] + (r[3][0] - r[0][0]) * k,
      r[0][1] + (r[3][1] - r[0][1]) * k,
    ];
    const midF: Pt = [
      r[1][0] + (r[2][0] - r[1][0]) * k,
      r[1][1] + (r[2][1] - r[1][1]) * k,
    ];
    ctx.fillStyle = air(thatchOf(h, s.roofLight * 0.6), d);
    ctx.globalAlpha = 0.6;
    ctx.fill(poly([r[0], r[1], midF, midN]));
    ctx.globalAlpha = 1;
    ctx.fillStyle = air(wallOf(h, s.gableLight), d);
    ctx.fill(poly(s.gable));
    // The eaves' shadow across the gable's top: a dark band at the walls'
    // height that breaks the triangle into wall and roof.
    const g = s.gable;
    const shadowDrop = 0.32 * BUILD * s.unit;
    ctx.fillStyle = air(SHORE.wallShade, d);
    ctx.globalAlpha = 0.55;
    ctx.fill(
      poly([
        g[4],
        g[3],
        g[2],
        [g[2][0], g[2][1] - shadowDrop],
        [g[3][0], g[3][1] - shadowDrop * 1.4],
        [g[4][0], g[4][1] - shadowDrop],
      ]),
    );
    ctx.globalAlpha = 1;
    if (s.door) {
      ctx.fillStyle = air(SHORE.hutDoor, d);
      ctx.fill(poly(s.door));
    }
    ctx.fillStyle = air(thatchOf(h, s.gableLight * 0.62), d);
    ctx.fill(poly(s.rake));
    const ridge = new Path2D();
    ridge.moveTo(s.ridge[0][0], s.ridge[0][1]);
    ridge.lineTo(s.ridge[1][0], s.ridge[1][1]);
    stroke(c, ridge, 0.7, air(mix(thatchOf(h, 1), "#fff0cc", 0.35), d), 0.8);
    if (s.chimney) {
      ctx.fillStyle = air(mix(SHORE.earth, SHORE.shade, 0.45), d);
      ctx.fill(poly(s.chimney));
    }
    const foot = new Path2D();
    addLine(foot, s.foot);
    stroke(c, foot, 0.8, air(SHORE.hutFoot, d), 0.75);
  }
}

/**
 * Engraves huts: paper-backed, so a nearer row hides the feet of the one
 * behind; the gable's outline and the thatch's, two or three strokes down
 * the thatch on the eye's side, the shaded wall hatched.
 */
export function engraveHuts(c: PlateCanvas, huts: readonly Hut[]): void {
  const shapes = huts
    .map((h) => ({ h, s: hutShape(h) }))
    .sort((a, b) => b.s.ahead - a.s.ahead);
  const { ctx } = c;
  for (const { h, s } of shapes) {
    const d = s.ahead;
    const px = Math.max(0.5, Math.min(1.2, 1700 / d));
    ctx.fillStyle = PAPER.low;
    if (s.cone) {
      ctx.fill(poly([...s.foot, s.gable[2]]));
      ctx.fill(poly(s.side));
      ctx.fill(poly(s.gable));
      const line = new Path2D();
      addLine(line, [s.foot[0], s.gable[2], s.foot[2]]);
      stroke(c, line, px * 0.8, INK.line, 0.9);
      const hh = new Path2D();
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const a = s.foot[0];
        const z = s.foot[1];
        hh.moveTo(a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t);
        hh.lineTo(
          s.gable[2][0] + (a[0] - s.gable[2][0]) * 0.25,
          s.gable[2][1] + (a[1] - s.gable[2][1]) * 0.25,
        );
      }
      stroke(c, hh, px * 0.5, INK.hatch, 0.75);
      continue;
    }
    ctx.fill(poly(s.side));
    ctx.fill(poly(s.roof));
    ctx.fill(poly(s.rake));
    ctx.fill(poly(s.gable));
    const r = s.roof;
    if (s.unit * h.w < 2.2) {
      // A far hut: its ridge and a stroke down its shaded side, no
      // outline (a row of outlined gables would read as a zigzag).
      const far = new Path2D();
      far.moveTo(s.ridge[0][0], s.ridge[0][1]);
      far.lineTo(s.ridge[1][0], s.ridge[1][1]);
      stroke(c, far, px * 0.7, INK.line, 0.85);
      const sh = new Path2D();
      sh.moveTo(r[0][0], r[0][1]);
      sh.lineTo(r[1][0], r[1][1]);
      const g = s.gable;
      sh.moveTo(g[1][0], g[1][1]);
      sh.lineTo(g[2][0], g[2][1]);
      stroke(c, sh, px * 0.5, INK.hatch, 0.7);
      continue;
    }
    const line = new Path2D();
    const k = s.rake;
    // The thatch's outline: its cut end over the gable, the ridge, the far eave.
    addLine(line, [k[2], k[1], k[0], r[1], r[2], r[3]]);
    // The gable's walls down to the ground.
    addLine(line, [s.gable[2], s.gable[1], s.gable[0], s.gable[4]]);
    if (s.chimney) addLine(line, s.chimney, true);
    stroke(c, line, px * 0.75, INK.line, 0.9);
    const hatchP = new Path2D();
    // Strokes down the thatch, ridge to eave.
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const a: Pt = [
        r[3][0] + (r[2][0] - r[3][0]) * t,
        r[3][1] + (r[2][1] - r[3][1]) * t,
      ];
      const b: Pt = [
        r[0][0] + (r[1][0] - r[0][0]) * t,
        r[0][1] + (r[1][1] - r[0][1]) * t,
      ];
      hatchP.moveTo(a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15);
      hatchP.lineTo(a[0] + (b[0] - a[0]) * 0.85, a[1] + (b[1] - a[1]) * 0.85);
    }
    // The shaded long wall: a few short strokes down it.
    if (s.sideLight < 0.5) {
      const w = s.side;
      for (let i = 1; i <= 2; i++) {
        const t = i / 3;
        const top: Pt = [
          w[3][0] + (w[2][0] - w[3][0]) * t,
          w[3][1] + (w[2][1] - w[3][1]) * t,
        ];
        const bot: Pt = [
          w[0][0] + (w[1][0] - w[0][0]) * t,
          w[0][1] + (w[1][1] - w[0][1]) * t,
        ];
        hatchP.moveTo(top[0], top[1]);
        hatchP.lineTo(bot[0], bot[1]);
      }
    }
    // One stroke on the gable's shaded side when it is turned from the sun.
    if (s.gableLight < 0.6) {
      const g = s.gable;
      hatchP.moveTo(g[2][0] + (g[0][0] - g[2][0]) * 0.2, g[2][1]);
      hatchP.lineTo(g[1][0] + (g[0][0] - g[1][0]) * 0.2, g[1][1]);
    }
    stroke(c, hatchP, px * 0.5, INK.hatch, 0.75);
  }
}

/**
 * Lays huts along a row of the ground, gable-on to the row as the camps
 * stood (each gable to the street): `at(t)` gives the ground's point
 * (east, north, drawn metres) at `t` metres along the row. Huts in
 * battalion blocks of `block`, a cross street between blocks; `kind(t)`
 * says what stands at `t` (null: nothing, the camp's end or a gap).
 */
export function rowHuts(
  rng: Rng,
  length: number,
  at: (t: number) => readonly [number, number, number],
  kind: (t: number) => 0 | 1 | 2 | null,
  opts: {
    gap?: number;
    street?: number;
    block?: number;
    /** The share kept inside a block (the odd hut missing). */
    keep?: number;
  } = {},
): Hut[] {
  const huts: Hut[] = [];
  const gap = opts.gap ?? 4;
  const street = opts.street ?? 30;
  const block = opts.block ?? 10;
  let t = rng() * street;
  let inBlock = Math.floor(rng() * block);
  let blockSize = block - 2 + Math.floor(rng() * 5);
  while (t < length) {
    const k0 = kind(t);
    const big = k0 === 1 ? 1.25 : k0 === 2 ? 1.15 : 1;
    const w = (1.9 + rng() * 0.35) * BUILD * big;
    const mid = t + w;
    if (mid > length) break;
    const k = kind(mid);
    if (k !== null && rng() < (opts.keep ?? 0.94)) {
      const [e, n, g] = at(mid);
      const [e0, n0] = at(Math.max(0, mid - w));
      const [e1, n1] = at(Math.min(length, mid + w));
      const al = Math.hypot(e1 - e0, n1 - n0) || 1;
      const te = (e1 - e0) / al;
      const tn = (n1 - n0) / al;
      // A small turn off square, hut by hut.
      const turn = (rng() - 0.5) * 0.12;
      const ae = -tn + te * turn;
      const an = te + tn * turn;
      const an2 = Math.hypot(ae, an) || 1;
      huts.push({
        e,
        n,
        g: g - 0.45 * BUILD,
        l: (k === 1 ? 4 : 3 + rng() * 0.8) * BUILD,
        w: k === 1 ? w * 1.05 : w,
        wall: (k === 1 ? 1.7 : 1.15 + rng() * 0.25) * BUILD,
        ridge: (k === 1 ? 3.7 : 2.9 + rng() * 0.4) * BUILD,
        kind: k,
        age: Math.min(1, Math.max(0, 0.65 + (rng() - 0.5) * 0.7)),
        white: k === 1,
        axis: [ae / an2, an / an2],
      });
    }
    t += 2 * w + gap * (0.75 + rng() * 0.5);
    inBlock++;
    if (inBlock >= blockSize) {
      inBlock = 0;
      blockSize = block - 2 + Math.floor(rng() * 5);
      t += street * (0.85 + rng() * 0.3);
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
    // A crisp dark silhouette against the sky, its lit side to the left.
    const wood = air(mix(SHORE.wood, "#2f2925", 0.45), m.ahead);
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

/**
 * A flag on its staff: the staff, and the tricolour as cloth in the one
 * wind of the whole painting (heroes/flags.ts, staffFlag: hanging heavily,
 * its fly lifted away and leaning toward the wind's vanishing point, as the
 * craft's flags do), its hoist `f`'s size; `f.panes` only measure it.
 */
export function paintFlag(
  c: PlateCanvas,
  f: ReturnType<typeof flag>,
  ahead: number,
  mode: "colour" | "ink",
): void {
  const st = new Path2D();
  st.moveTo(f.staff[0][0], f.staff[0][1]);
  st.lineTo(f.staff[1][0], f.staff[1][1]);
  const [tx, ty] = f.staff[1];
  const hoist = ((f.panes[0][0][1] - f.panes[0][3][1]) * ahead) / 1000;
  const shape = staffFlag(
    ahead,
    (tx * ahead) / 1000,
    (ty * ahead) / 1000 + EYE_H,
    hoist * 1.5,
    hoist,
    Math.round(Math.abs(tx * 37 + ty * 11)),
  );
  if (mode === "colour") {
    stroke(c, st, 0.8, air(SHORE.wood, ahead), 1);
    paintCloth(c, shape, hazeOf(ahead), HAZE);
    return;
  }
  stroke(c, st, 0.7, INK.line, 0.9);
  engraveCloth(c, shape, 0.7);
}

/** The pen for a contour at `ahead` metres: about 1.4 device px near, 0.6 far. */
export function penFor(ahead: number, near = 1.4): number {
  return Math.max(0.5, Math.min(near, near * (1300 / ahead) ** 1.1));
}

export { createRng };
