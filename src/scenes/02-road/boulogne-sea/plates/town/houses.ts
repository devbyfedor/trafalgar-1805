import { createRng, mix, type Pt, rgba } from "../../paint/kit";
import type { LightSite } from "../../paint/lights";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { aerial, EYE_EN, EYE_H, project, viewOf } from "../../scene";
import {
  clamp01,
  inside,
  penAt,
  rectPts,
  Shapes,
  SUN_ALT,
  SUN_AZ,
  smooth,
} from "./kit";

/**
 * Buildings as real boxes with real roofs (brief, "Owner review", bug 8:
 * the town as separate houses with roofs, never cubes): each house is a
 * footprint on the map (metres east and north of the jetty heads) with
 * walls and a gable or hipped roof, projected through the painting's eye
 * (scene.ts project) and lit by the evening sun's true direction (7° up
 * at azimuth 286, behind the eye and a little to its left). So a
 * front turned to the west glows gold, a side turned north takes the sun
 * at a graze, a face turned south is in the cool shade of the sky, a roof
 * slope gets what its pitch allows; and as the streets turn, the light
 * turns with them: the town's modelling comes from its own geometry, not
 * from a recipe.
 *
 * The engraving draws the same faces: paper, then hatching by each face's
 * light (none on a lit front, close on a grazed side, crossed in shade),
 * along the walls' uprights and the roofs' fall lines, then the true
 * contours as open strokes (never the foot's cut along the ground).
 */

export interface Tone {
  lit: string;
  graze: string;
  shade: string;
}

/**
 * Walls: a west face in the sun, a north face at a graze, a south face in
 * shade. The lower town was mostly dark stone in 1805, with some new pale
 * fronts (history-notes.md, "The lower town"): the Boulonnais stone a
 * weathered grey-brown, warm in the sun and cool in the shade; plaster
 * and limewash a step paler.
 */
export const WALLS = {
  cream: { lit: "#e6c995", graze: "#b4a086", shade: "#76717e" },
  white: { lit: "#eedcb7", graze: "#c0b39c", shade: "#80808f" },
  ochre: { lit: "#d6ac76", graze: "#a68b70", shade: "#726b78" },
  stone: { lit: "#b39472", graze: "#857565", shade: "#5a5560" },
  brown: { lit: "#a07f62", graze: "#766658", shade: "#4f4a52" },
  /** The old town's darkest fronts: grey stone of the coast, soot-stained. */
  grey: { lit: "#9a8a76", graze: "#6f675f", shade: "#47454f" },
} as const satisfies Record<string, Tone>;

/** Roofs: red-brown tile (tile stays tile in shade: a deep red-brown) and grey slate; golden in the sun, never red. */
export const ROOFS = {
  tile: { lit: "#cb8d5d", graze: "#9b6b55", shade: "#6a5250" },
  tileDeep: { lit: "#b77953", graze: "#8b5e4c", shade: "#5c4545" },
  tileOld: { lit: "#b8926c", graze: "#8a715d", shade: "#5f504c" },
  slate: { lit: "#9c9ca3", graze: "#73788a", shade: "#4c5164" },
  slateDark: { lit: "#85868f", graze: "#61667a", shade: "#3f4457" },
} as const satisfies Record<string, Tone>;

export const WINDOW = "#2c272c";
export const GLINT = "#ffe6a8";

/** The sun at 18:33 on 10 August 1805: azimuth 286.2, 7° up (history-notes.md, "The painting's light"); a unit vector (east, north, up) toward it. */
const SUN: readonly [number, number, number] = (() => {
  const az = (SUN_AZ * Math.PI) / 180;
  const alt = (SUN_ALT * Math.PI) / 180;
  return [
    Math.sin(az) * Math.cos(alt),
    Math.cos(az) * Math.cos(alt),
    Math.sin(alt),
  ];
})();

/** The evening air over the town: farther is softer and cooler (scene.ts aerial, and the town's own haze). */
export function townAir(hex: string, distance: number): string {
  const k = 0.16 * smooth((distance - 1300) / 1500);
  return mix(aerial(hex, distance), "#cfc0b6", k);
}

export function airTone(t: Tone, distance: number): Tone {
  return {
    lit: townAir(t.lit, distance),
    graze: townAir(t.graze, distance),
    shade: townAir(t.shade, distance),
  };
}

/** A tone for a face's light, 0 (shade) .. 1 (square to the sun). */
export function toneAt(t: Tone, f: number): string {
  if (f < 0.42) return mix(t.shade, t.graze, smooth(f / 0.42));
  return mix(t.graze, t.lit, clamp01((f - 0.42) / 0.5));
}

/** A building's plan and build, metres (heights as drawn). */
export interface Spec {
  /** The front's middle at the ground, metres east and north. */
  e: number;
  n: number;
  /** The ground's height there, metres as drawn. */
  ground: number;
  /** The front's direction along the street (unit, east and north); the house runs back to its left. */
  te: number;
  tn: number;
  /** Frontage, depth and wall height, metres as drawn. */
  w: number;
  d: number;
  h: number;
  /** The roof's rise over its half span. */
  pitch: number;
  /** The ridge along the street (an eaves front) or across it (a gable front). */
  ridge: "along" | "across";
  hip: boolean;
  wall: Tone;
  roof: Tone;
  storeys: number;
  chimneys: number;
  /** One chimney at this share of the ridge (a smoking one: its top is known to the smoke). */
  chimneyAt?: number;
  /** Chimneys' height over the ridge, metres as drawn (2.6-4.2 by default). */
  chimneyLift?: number;
  /** Dormers along the roof slope facing the eye (an eaves front only). */
  dormers?: number;
  /** No house windows: a tower's or a church's plain coursed stone. */
  plain?: boolean;
  seed: number;
}

/** A dormer's size scale: metres as drawn per metre (the buildings' licence). */
const BUILD_D = 2;

/** A smoking chimney's height over its ridge, metres as drawn. */
export const CHIMNEY_TOP = 3.4;

type Kind = "wall" | "gable" | "roof";

interface Face {
  kind: Kind;
  pts: Pt[];
  /** Light 0..1. */
  f: number;
  colour: string;
  /** For walls: the foot's two corners and the top's (for windows and hatching). */
  quad?: [Pt, Pt, Pt, Pt];
  storeys?: number;
  bays?: number;
  /** Glint chance of its windows (its mirror of the sun toward the eye). */
  glint?: number;
  /** The material's shade tone (for the eaves' cast shadow). */
  shade?: string;
}

/** A dormer on a roof slope: its front (a small gabled wall) and its roof's two slopes, with the front's light. */
interface Dormer {
  front: Pt[];
  roofL: Pt[];
  roofR: Pt[];
  f: number;
  wall: string;
  roof: string;
  roofShade: string;
  window: Pt[];
}

export interface Building {
  faces: Face[];
  /** The silhouette (convex), for paper, base fill and the contour. */
  hull: Pt[];
  /** Which of the hull's points stand on the ground (their edges are cuts, never stroked). */
  foot: boolean[];
  chimneys: { x: number; y0: number; y1: number; w: number }[];
  dormers: Dormer[];
  /** Plain coursed stone, no house windows. */
  plain: boolean;
  distance: number;
  seed: number;
  /** For the plates' sorting and culling: the foot's middle, layer units. */
  x: number;
  y: number;
  top: number;
  /** For the town's smoke: the ridge's middle, metres. */
  ridge: readonly [number, number, number];
}

function dot3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm3(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Convex hull (monotone chain) of points, counter-clockwise. */
function hullOf(points: readonly Pt[]): number[] {
  const idx = points.map((_, i) => i);
  idx.sort(
    (a, b) => points[a][0] - points[b][0] || points[a][1] - points[b][1],
  );
  const cross = (o: number, a: number, b: number) =>
    (points[a][0] - points[o][0]) * (points[b][1] - points[o][1]) -
    (points[a][1] - points[o][1]) * (points[b][0] - points[o][0]);
  const lower: number[] = [];
  for (const i of idx) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0
    )
      lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0
    )
      upper.pop();
    upper.push(i);
  }
  upper.pop();
  lower.pop();
  return [...lower, ...upper];
}

/**
 * Builds a building's faces from its spec: the walls and roof planes
 * that face the eye, each with its light from the sun.
 */
export function build(o: Spec): Building {
  // The plan: the front from F0 to F1 along t; the back B0, B1 a depth d behind (to the left of t).
  const be = -o.tn;
  const bn = o.te;
  const hw = o.w / 2;
  const F0: Pt = [o.e - o.te * hw, o.n - o.tn * hw];
  const F1: Pt = [o.e + o.te * hw, o.n + o.tn * hw];
  const B0: Pt = [F0[0] + be * o.d, F0[1] + bn * o.d];
  const B1: Pt = [F1[0] + be * o.d, F1[1] + bn * o.d];
  const z0 = o.ground;
  const z1 = o.ground + o.h;
  const mid: Pt = [(F0[0] + B1[0]) / 2, (F0[1] + B1[1]) / 2];
  const ve = EYE_EN[0] - mid[0];
  const vn = EYE_EN[1] - mid[1];
  const toEye = norm3([ve, vn, EYE_H - (z0 + z1) / 2]);
  const P = (p: Pt, z: number): Pt => project(p[0], p[1], z) as Pt;
  const faces: Face[] = [];
  const dormers: Dormer[] = [];
  const all: Pt[] = [];
  const foot: boolean[] = [];
  const push = (p: Pt, isFoot: boolean) => {
    all.push(p);
    foot.push(isFoot);
  };
  const rng = createRng(o.seed);
  // The mirror of the sun off an upright face toward the eye: its windows blaze.
  const glintOf = (ne: number, nn: number) => {
    const sn = SUN[0] * ne + SUN[1] * nn;
    const r: [number, number, number] = [
      2 * sn * ne - SUN[0],
      2 * sn * nn - SUN[1],
      -SUN[2],
    ];
    const k = dot3(r, toEye);
    return k > 0.8 ? smooth((k - 0.8) / 0.17) : 0;
  };
  const wall = (
    a: Pt,
    b: Pt,
    ne: number,
    nn: number,
    span: number,
    apex?: Pt,
    apexZ?: number,
  ) => {
    const n3: [number, number, number] = [ne, nn, 0];
    if (dot3(n3, toEye) <= 0.02) return;
    const f = Math.max(0, dot3(n3, SUN));
    const pa = P(a, z0);
    const pb = P(b, z0);
    const ta = P(a, z1);
    const tb = P(b, z1);
    const pts: Pt[] = [pa, pb, tb];
    if (apex && apexZ !== undefined) pts.push(P(apex, apexZ));
    pts.push(ta);
    faces.push({
      kind: apex ? "gable" : "wall",
      pts,
      f,
      colour: toneAt(o.wall, f),
      shade: o.wall.shade,
      quad: [pa, pb, ta, tb],
      storeys: o.plain ? undefined : o.storeys,
      bays: Math.max(1, Math.round(span / 6.4)),
      glint: glintOf(ne, nn),
    });
  };
  const slope = (
    pts3: readonly (readonly [Pt, number])[],
    he: number,
    hn: number,
    rise: number,
  ) => {
    // A roof plane rising inward from the eaves; its normal tilts out toward (he, hn).
    const s = Math.sin(Math.atan(rise));
    const c = Math.cos(Math.atan(rise));
    const n3: [number, number, number] = [he * s, hn * s, c];
    if (dot3(n3, toEye) <= 0.01) return;
    const f = Math.max(0, dot3(n3, SUN));
    faces.push({
      kind: "roof",
      pts: pts3.map(([p, z]) => P(p, z)),
      f,
      colour: toneAt(o.roof, Math.min(1, f * 1.12)),
    });
  };
  // The eaves overhang, metres.
  const ov = 0.7;
  const add = (p: Pt, k: number): Pt => [p[0] + be * k, p[1] + bn * k];
  const along = (p: Pt, k: number): Pt => [p[0] + o.te * k, p[1] + o.tn * k];
  let ridgeMid: [number, number, number];
  if (o.ridge === "along") {
    const rise = (o.d / 2) * o.pitch;
    const zr = z1 + rise;
    const inset = o.hip ? Math.min(o.d / 2, hw) * 0.95 : 0;
    const R0: Pt = along([(F0[0] + B0[0]) / 2, (F0[1] + B0[1]) / 2], inset);
    const R1: Pt = along([(F1[0] + B1[0]) / 2, (F1[1] + B1[1]) / 2], -inset);
    ridgeMid = [(R0[0] + R1[0]) / 2, (R0[1] + R1[1]) / 2, zr];
    // Walls: the front, the back, the two ends (gabled unless hipped).
    wall(F0, F1, -be, -bn, o.w);
    wall(B1, B0, be, bn, o.w);
    wall(B0, F0, -o.te, -o.tn, o.d, o.hip ? undefined : R0, zr);
    wall(F1, B1, o.te, o.tn, o.d, o.hip ? undefined : R1, zr);
    const ef0 = along(add(F0, -ov), -ov);
    const ef1 = along(add(F1, -ov), ov);
    const eb0 = along(add(B0, ov), -ov);
    const eb1 = along(add(B1, ov), ov);
    const ze = z1 - ov * o.pitch;
    slope(
      [
        [ef0, ze],
        [ef1, ze],
        [R1, zr],
        [R0, zr],
      ],
      -be,
      -bn,
      o.pitch,
    );
    slope(
      [
        [eb1, ze],
        [eb0, ze],
        [R0, zr],
        [R1, zr],
      ],
      be,
      bn,
      o.pitch,
    );
    if (o.hip) {
      slope(
        [
          [eb0, ze],
          [ef0, ze],
          [R0, zr],
        ],
        -o.te,
        -o.tn,
        o.pitch * (o.d / 2 / Math.max(1, inset)),
      );
      slope(
        [
          [ef1, ze],
          [eb1, ze],
          [R1, zr],
        ],
        o.te,
        o.tn,
        o.pitch * (o.d / 2 / Math.max(1, inset)),
      );
    }
    for (const p of [ef0, ef1, eb0, eb1]) push(P(p, ze), false);
    push(P(R0, zr), false);
    push(P(R1, zr), false);
    if (o.dormers) {
      // On the long slope that faces the eye: its eaves line A0-A1 and the way in, up the roof.
      const front = -be * toEye[0] + -bn * toEye[1] > 0;
      const [A0, A1] = front ? [F0, F1] : [B0, B1];
      const ie = front ? be : -be;
      const inn = front ? bn : -bn;
      const nf: [number, number, number] = [-ie, -inn, 0];
      const df = Math.max(0, dot3(nf, SUN));
      const dw = 1.5 * BUILD_D;
      const dh = 1.7 * BUILD_D;
      const di = (o.d / 2) * 0.32;
      const zb = z1 + di * o.pitch;
      const zt = zb + dh;
      const za = zt + dw * 0.45;
      const sideLit = Math.max(0, SUN[0] * -o.te + SUN[1] * -o.tn) > 0.3;
      for (let k = 0; k < o.dormers; k++) {
        const t = (k + 0.5) / o.dormers;
        const f0: Pt = [
          A0[0] + (A1[0] - A0[0]) * t + ie * di,
          A0[1] + (A1[1] - A0[1]) * t + inn * di,
        ];
        const side = (p: Pt, k2: number): Pt => [
          p[0] + o.te * k2,
          p[1] + o.tn * k2,
        ];
        const inward = (p: Pt, k2: number): Pt => [
          p[0] + ie * k2,
          p[1] + inn * k2,
        ];
        const L = side(f0, -dw / 2);
        const R = side(f0, dw / 2);
        const back = (zt - zb) / o.pitch;
        const backA = (za - zb) / o.pitch;
        dormers.push({
          front: [P(L, zb), P(R, zb), P(R, zt), P(f0, za), P(L, zt)],
          roofL: [
            P(L, zt),
            P(f0, za),
            P(inward(f0, backA), za),
            P(inward(L, back), zt),
          ],
          roofR: [
            P(R, zt),
            P(f0, za),
            P(inward(f0, backA), za),
            P(inward(R, back), zt),
          ],
          f: df,
          wall: toneAt(o.wall, df),
          roof: toneAt(o.roof, sideLit ? 0.8 : 0.5),
          roofShade: toneAt(o.roof, sideLit ? 0.25 : 0.6),
          window: [
            P(side(f0, -dw * 0.22), zb + dh * 0.15),
            P(side(f0, dw * 0.22), zb + dh * 0.15),
            P(side(f0, dw * 0.22), zb + dh * 0.85),
            P(side(f0, -dw * 0.22), zb + dh * 0.85),
          ],
        });
      }
    }
  } else {
    const rise = hw * o.pitch;
    const zr = z1 + rise;
    const Rf: Pt = [(F0[0] + F1[0]) / 2, (F0[1] + F1[1]) / 2];
    const Rb: Pt = [(B0[0] + B1[0]) / 2, (B0[1] + B1[1]) / 2];
    ridgeMid = [(Rf[0] + Rb[0]) / 2, (Rf[1] + Rb[1]) / 2, zr];
    wall(F0, F1, -be, -bn, o.w, Rf, zr);
    wall(B1, B0, be, bn, o.w, Rb, zr);
    wall(B0, F0, -o.te, -o.tn, o.d);
    wall(F1, B1, o.te, o.tn, o.d);
    const ze = z1 - ov * o.pitch;
    const f0 = add(along(F0, -ov), -ov);
    const f1 = add(along(F1, ov), -ov);
    const b0 = add(along(B0, -ov), ov);
    const b1 = add(along(B1, ov), ov);
    const rf = add(Rf, -ov);
    const rb = add(Rb, ov);
    slope(
      [
        [b0, ze],
        [f0, ze],
        [rf, zr],
        [rb, zr],
      ],
      -o.te,
      -o.tn,
      o.pitch,
    );
    slope(
      [
        [f1, ze],
        [b1, ze],
        [rb, zr],
        [rf, zr],
      ],
      o.te,
      o.tn,
      o.pitch,
    );
    for (const p of [f0, f1, b0, b1]) push(P(p, ze), false);
    push(P(rf, zr), false);
    push(P(rb, zr), false);
  }
  for (const p of [F0, F1, B0, B1]) {
    push(P(p, z0), true);
    push(P(p, z1), false);
  }
  const hi = hullOf(all);
  const hull = hi.map((i) => all[i]);
  const hullFoot = hi.map((i) => foot[i]);
  // Chimneys on the ridge: a stack's lit face and its shaded flank.
  const chimneys: Building["chimneys"] = [];
  const [ahead] = viewOf(o.e, o.n);
  const u = 1000 / ahead;
  const count = o.chimneyAt !== undefined ? 1 : o.chimneys;
  for (let i = 0; i < count; i++) {
    const t =
      o.chimneyAt ??
      (count === 1 ? 0.15 + rng() * 0.7 : 0.08 + (0.84 * i) / (count - 1));
    let p: Pt;
    if (o.ridge === "along") {
      const a = (F0[0] + B0[0]) / 2;
      const b = (F0[1] + B0[1]) / 2;
      p = [a + o.te * o.w * t, b + o.tn * o.w * t];
    } else {
      const a = (F0[0] + F1[0]) / 2;
      const b = (F0[1] + F1[1]) / 2;
      p = [a + be * o.d * t, b + bn * o.d * t];
    }
    const [x, y0] = project(p[0], p[1], ridgeMid[2] - 1.2);
    const lift =
      o.chimneyAt !== undefined
        ? CHIMNEY_TOP
        : (o.chimneyLift ?? 1.8) + rng() * 1.4;
    const [, y1] = project(p[0], p[1], ridgeMid[2] + lift);
    chimneys.push({ x, y0, y1, w: (2 + rng() * 0.9) * u });
  }
  // Sort the faces so the roofs come after the walls they sit on.
  faces.sort(
    (a, b) => (a.kind === "roof" ? 1 : 0) - (b.kind === "roof" ? 1 : 0),
  );
  const [fx, fy] = project(o.e, o.n, z0);
  let top = Number.NEGATIVE_INFINITY;
  for (const q of hull) top = Math.max(top, q[1]);
  return {
    faces,
    hull,
    foot: hullFoot,
    chimneys,
    dormers,
    plain: o.plain ?? false,
    distance: ahead,
    seed: o.seed,
    x: fx,
    y: fy,
    top,
    ridge: ridgeMid,
  };
}

// ----------------------------------------------------------------- colour

function fillPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** The street's dusk at the walls' feet and in the gaps between houses. */
export const DUSK = "#4a4450";

function band(a: Pt, b: Pt, down: number): Pt[] {
  return [a, b, [b[0], b[1] - down], [a[0], a[1] - down]];
}

/** A chimney's stack and cap, as painted. */
function chimneyPts(k: Building["chimneys"][number]): Pt[][] {
  return [
    rectPts(k.x - k.w / 2, k.y0, k.w, k.y1 - k.y0),
    rectPts(k.x - k.w * 0.55, k.y1 - 0.24, k.w * 1.1, 0.32),
  ];
}

/** A building's silhouette as painted (its hull, its chimneys and dormers): what it hides of the lights behind it. */
function silhouette(b: Building): Path2D {
  const s = new Shapes().poly(b.hull);
  for (const k of b.chimneys) for (const p of chimneyPts(k)) s.poly(p);
  for (const d of b.dormers) s.poly(d.front).poly(d.roofL).poly(d.roofR);
  return s.path;
}

/** Drops the sites a shape painted over them hides (their middle under it). */
function cover(sites: LightSite[] | undefined, pts: readonly Pt[]): void {
  if (!sites) return;
  for (let i = sites.length - 1; i >= 0; i--) {
    const s = sites[i];
    if (inside(pts, s.x + s.w / 2, s.y + s.h / 2)) sites.splice(i, 1);
  }
}

/** A light site on a painted opening (its box). */
function opening(
  kind: "window" | "door",
  pts: readonly Pt[],
  seed: number,
): LightSite {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { kind, x: x0, y: y0, w: x1 - x0, h: y1 - y0, seed };
}

/**
 * Paints buildings (far to near) in the evening light. With a light sink
 * (paint/lights.ts) it records, in paint order, each building's silhouette
 * as an occluder of the lights behind it, then its windows, doors and
 * dormer windows as sites, each where it is painted (less any its own
 * door, dormers or chimneys paint over).
 */
export function paintBuildings(
  c: PlateCanvas,
  list: readonly Building[],
): void {
  const { ctx } = c;
  const sink = c.lights;
  for (const b of list) {
    const rng = createRng(b.seed ^ 0x51ed);
    const sites: LightSite[] | undefined = sink ? [] : undefined;
    let seed = (b.seed % 1000003) * 1024;
    const air = (hex: string) => townAir(hex, b.distance);
    const dusk = air(DUSK);
    // A base under the faces, so their seams never show light.
    let darkest = b.faces[0]?.colour ?? "#888888";
    let low = 2;
    for (const f of b.faces)
      if (f.f < low) {
        low = f.f;
        darkest = f.colour;
      }
    ctx.fillStyle = air(darkest);
    fillPoly(ctx, b.hull);
    sink?.occlude(silhouette(b));
    for (const f of b.faces) {
      const col = air(f.colour);
      if (f.kind !== "roof" && f.quad) {
        // A wall: the street's dusk deep at its foot, a third of the way up; a little warmer under the eaves.
        const [pa, , ta] = f.quad;
        const top = f.kind === "gable" ? (f.pts[3]?.[1] ?? ta[1]) : ta[1];
        const g = ctx.createLinearGradient(0, pa[1], 0, top);
        const k = Math.max(0.12, (ta[1] - pa[1]) / Math.max(0.01, top - pa[1]));
        g.addColorStop(0, mix(col, dusk, 0.5));
        g.addColorStop(0.33 * k, col);
        g.addColorStop(1, mix(col, air("#fff0cf"), 0.06 * f.f));
        ctx.fillStyle = g;
      } else ctx.fillStyle = col;
      fillPoly(ctx, f.pts);
    }
    // Plain stone (a tower, a church): courses, no windows.
    if (b.plain)
      for (const f of b.faces) {
        if (!f.quad) continue;
        const [pa, pb, ta, tb] = f.quad;
        const h = ta[1] - pa[1];
        const n = Math.min(14, Math.floor(h / 0.9));
        ctx.strokeStyle = rgba(air(f.shade ?? DUSK), 0.22);
        ctx.lineWidth = c.pen(0.45);
        ctx.beginPath();
        for (let k = 1; k < n; k++) {
          const a = lerp(pa, ta, k / n);
          const z = lerp(pb, tb, k / n);
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(z[0], z[1]);
        }
        ctx.stroke();
      }
    // Roofs: courses of tile or slate, a ridge catching the light.
    for (const f of b.faces) {
      if (f.kind !== "roof" || f.pts.length < 4) continue;
      const [e0, e1, r1, r0] = f.pts;
      const span = Math.hypot(r0[0] - e0[0], r0[1] - e0[1]);
      if (span > 1.2) {
        ctx.strokeStyle = rgba(air("#4a3a3a"), 0.22);
        ctx.lineWidth = c.pen(0.5);
        ctx.beginPath();
        const n = Math.min(5, Math.floor(span / 1));
        for (let k = 1; k <= n; k++) {
          const t = k / (n + 1);
          const a = lerp(e0, r0, t);
          const z = lerp(e1, r1, t);
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(z[0], z[1]);
        }
        ctx.stroke();
      }
      if (f.f > 0.3) {
        ctx.strokeStyle = rgba(air("#ffe2b0"), 0.4 * f.f);
        ctx.lineWidth = c.pen(0.6);
        ctx.beginPath();
        ctx.moveTo(r0[0], r0[1]);
        ctx.lineTo(r1[0], r1[1]);
        ctx.stroke();
      }
    }
    // The eaves' cast shadow: a crisp dark band under every eaves line on
    // the wall below (what makes a house read at 2 km), inside the house.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(b.hull[0][0], b.hull[0][1]);
    for (const q of b.hull) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.clip();
    for (const f of b.faces) {
      if (f.kind !== "roof" || f.pts.length < 3) continue;
      const [e0, e1] = f.pts;
      if (Math.abs(e1[0] - e0[0]) < 0.2) continue;
      ctx.fillStyle = rgba(dusk, 0.55);
      fillPoly(ctx, band(e0, e1, 0.38));
      ctx.fillStyle = rgba(dusk, 0.22);
      fillPoly(ctx, band([e0[0], e0[1] - 0.38], [e1[0], e1[1] - 0.38], 0.3));
    }
    ctx.restore();
    // The eaves' edge itself: a dark line.
    ctx.strokeStyle = rgba(air("#2f282c"), 0.5);
    ctx.lineWidth = c.pen(0.7);
    ctx.beginPath();
    for (const f of b.faces) {
      if (f.kind !== "roof" || f.pts.length < 2) continue;
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      ctx.lineTo(f.pts[1][0], f.pts[1][1]);
    }
    ctx.stroke();
    // Windows by storeys and bays: dark dots on the stone; a few blaze with
    // the sun where the face mirrors it to the eye.
    for (const f of b.faces) {
      if (!f.quad || !f.storeys || !f.bays) continue;
      const [pa, pb, ta] = f.quad;
      const wpx = Math.abs(pb[0] - pa[0]);
      const hpx = ta[1] - pa[1];
      if (wpx < 1.6 || hpx < 2) continue;
      const bays = Math.max(1, Math.min(f.bays, Math.floor(wpx / 1.1)));
      const ww = Math.max(0.32, (wpx / bays) * 0.36);
      const sh = hpx / f.storeys;
      const wh = Math.max(0.38, sh * 0.46);
      const dark = air(mix(WINDOW, f.colour, 0.14));
      for (let i = 0; i < f.storeys; i++) {
        for (let j = 0; j < bays; j++) {
          if (rng() < 0.1) continue;
          const t = (j + 0.5) / bays;
          const foot = lerp(pa, pb, t);
          const wx = foot[0] - ww / 2;
          const wy = foot[1] + sh * (i + 0.34);
          const blaze = rng() < 0.035 + (f.glint ?? 0) * 0.75;
          if (blaze && f.f > 0.3) {
            ctx.fillStyle = air(GLINT);
            ctx.globalAlpha = 0.95;
          } else {
            const sky = rng() < 0.18 ? 0.3 : 0;
            ctx.fillStyle = mix(dark, air("#9c98a2"), sky);
            ctx.globalAlpha = 0.92;
          }
          ctx.fillRect(wx, wy, ww, wh);
          ctx.globalAlpha = 1;
          sites?.push({ kind: "window", x: wx, y: wy, w: ww, h: wh, seed });
          seed++;
        }
      }
      // The door or the shop at the foot of a lit front on the street.
      if (f.kind === "wall" && f.f > 0.5 && wpx > 4 && rng() < 0.6) {
        const t = 0.2 + rng() * 0.6;
        const p = lerp(pa, pb, t);
        ctx.fillStyle = rgba(air(WINDOW), 0.85);
        ctx.fillRect(
          p[0] - ww * 0.6,
          p[1],
          ww * 1.2,
          Math.min(sh * 0.62, wh * 1.6),
        );
        if (sites) {
          const door = rectPts(
            p[0] - ww * 0.6,
            p[1],
            ww * 1.2,
            Math.min(sh * 0.62, wh * 1.6),
          );
          cover(sites, door);
          sites.push(opening("door", door, seed));
        }
        seed++;
      }
    }
    // Dormers: a small lit front with its window, two little slopes.
    for (const d of b.dormers) {
      ctx.fillStyle = air(d.wall);
      fillPoly(ctx, d.front);
      cover(sites, d.front);
      ctx.fillStyle = air(WINDOW);
      fillPoly(ctx, d.window);
      sites?.push(opening("window", d.window, seed));
      seed++;
      ctx.fillStyle = air(d.roof);
      fillPoly(ctx, d.roofL);
      ctx.fillStyle = air(d.roofShade);
      fillPoly(ctx, d.roofR);
      cover(sites, d.roofL);
      cover(sites, d.roofR);
    }
    // Chimneys: stone or brick, a lit face and a shaded flank, a dark cap.
    for (const k of b.chimneys) {
      ctx.fillStyle = air("#b8916b");
      ctx.fillRect(k.x - k.w / 2, k.y0, k.w * 0.6, k.y1 - k.y0);
      ctx.fillStyle = air("#5d5257");
      ctx.fillRect(k.x - k.w / 2 + k.w * 0.6, k.y0, k.w * 0.4, k.y1 - k.y0);
      ctx.fillStyle = air("#3a3134");
      ctx.fillRect(k.x - k.w * 0.55, k.y1 - 0.24, k.w * 1.1, 0.32);
      if (sites) for (const p of chimneyPts(k)) cover(sites, p);
    }
    if (sink && sites) for (const s of sites) sink.add(s);
  }
}

// ----------------------------------------------------------------- engraving

/**
 * Engraves buildings (far to near): paper over what is behind, hatching
 * by each face's light along its form, the windows as small marks, then
 * the contours as open strokes: a house whose front is in the sun keeps
 * only its roof's line and its shaded side, as an engraver leaves a lit
 * passage open; the far plate's pen a little finer.
 */
export function engraveBuildings(
  c: PlateCanvas,
  list: readonly Building[],
): void {
  const { ctx } = c;
  for (const b of list) {
    const pen = penAt(b.distance) * (b.distance > 1960 ? 0.8 : 1);
    const rng = createRng(b.seed ^ 0x2b7);
    ctx.fillStyle = PAPER.low;
    fillPoly(ctx, b.hull);
    const light: number[][] = [];
    const dark: number[][] = [];
    const lines = (into: number[][], a: Pt, z: Pt) => {
      into.push([a[0], a[1], z[0], z[1]]);
    };
    let litFront = false;
    for (const f of b.faces) {
      if (f.kind !== "roof" && f.f > 0.7) litFront = true;
      // Spacing in device px by the face's light: open on a lit face, close in shade.
      const tone = 1 - f.f;
      if (f.kind === "roof") {
        if (f.pts.length < 3) continue;
        const [e0, e1, r1, r0 = r1] = f.pts;
        const wide = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
        const gap = c.pen(tone > 0.55 ? 1.5 : tone > 0.3 ? 2.2 : 3.4);
        const n = Math.max(1, Math.floor(wide / gap));
        // Along the fall line, from the eaves up to the ridge.
        for (let k = 0; k <= n; k++) {
          const t = (k + 0.5) / (n + 1);
          if (tone < 0.3 && k % 2) continue;
          lines(tone > 0.55 ? dark : light, lerp(e0, e1, t), lerp(r0, r1, t));
        }
      } else if (f.quad && tone > 0.12) {
        const [pa, pb, ta, tb] = f.quad;
        const wide = Math.abs(pb[0] - pa[0]);
        const gap = c.pen(tone > 0.75 ? 1.3 : tone > 0.45 ? 1.8 : 2.8);
        const n = Math.max(1, Math.floor(wide / gap));
        const apex = f.kind === "gable" ? f.pts[3] : undefined;
        for (let k = 0; k <= n; k++) {
          const t = (k + 0.5) / (n + 1);
          const foot = lerp(pa, pb, t);
          let head = lerp(ta, tb, t);
          if (apex) {
            const g =
              t < 0.5 ? lerp(ta, apex, t * 2) : lerp(apex, tb, (t - 0.5) * 2);
            // ta..tb lie along the eaves; the gable's top edge rises to the apex.
            head = [head[0], Math.max(head[1], g[1])];
          }
          lines(tone > 0.6 ? dark : light, foot, head);
        }
        // Crossed in the deepest shade.
        if (tone > 0.8) {
          const h = ta[1] - pa[1];
          for (let y = pa[1] + c.pen(2); y < pa[1] + h; y += c.pen(2.2))
            lines(
              dark,
              [Math.min(pa[0], pb[0]), y],
              [Math.max(pa[0], pb[0]), y],
            );
        }
      } else if (f.quad && f.f > 0.7 && b.distance < 1900) {
        // A lit front: a couple of strokes of the street's dusk at its foot.
        const [pa, pb, ta] = f.quad;
        const h = ta[1] - pa[1];
        for (let k = 0; k < 2; k++) {
          const y = pa[1] + h * (0.06 + k * 0.08);
          lines(light, [pa[0], y], [pb[0], y + (pb[1] - pa[1])]);
        }
      }
    }
    // The eaves' shadow: one close stroke under each eaves line.
    for (const f of b.faces) {
      if (f.kind !== "roof" || f.pts.length < 2) continue;
      const [e0, e1] = f.pts;
      lines(dark, [e0[0], e0[1] - 0.25], [e1[0], e1[1] - 0.25]);
    }
    const stroke = (
      set: number[][],
      px: number,
      colour: string,
      alpha: number,
    ) => {
      if (!set.length) return;
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of set) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      ctx.strokeStyle = rgba(colour, alpha);
      ctx.lineWidth = c.pen(px);
      ctx.stroke();
    };
    stroke(light, pen * 0.42, INK.hatch, 0.7);
    stroke(dark, pen * 0.5, INK.hatch, 0.9);
    // Windows on the fronts: small marks.
    ctx.fillStyle = rgba(INK.line, 0.7);
    for (const f of b.faces) {
      if (!f.quad || !f.storeys || !f.bays || f.f < 0.4) continue;
      const [pa, pb, ta] = f.quad;
      const wpx = Math.abs(pb[0] - pa[0]);
      const hpx = ta[1] - pa[1];
      if (wpx < 2.4 || hpx < 2.6) continue;
      const bays = Math.max(1, Math.min(f.bays, Math.floor(wpx / 1.5)));
      const sh = hpx / f.storeys;
      for (let i = 0; i < f.storeys; i++)
        for (let j = 0; j < bays; j++) {
          if (rng() < 0.2) continue;
          const p = lerp(pa, pb, (j + 0.5) / bays);
          ctx.fillRect(
            p[0] - c.pen(0.5),
            p[1] + sh * (i + 0.36),
            c.pen(1),
            sh * 0.38,
          );
        }
    }
    for (const d of b.dormers) {
      ctx.fillStyle = PAPER.low;
      fillPoly(ctx, d.front);
      ctx.fillStyle = rgba(INK.line, 0.8);
      fillPoly(ctx, d.window);
    }
    // The contours: the silhouette's edges except those along the ground,
    // and the creases between faces; a lit house keeps only its roof's
    // line and its shaded side.
    ctx.beginPath();
    const n = b.hull.length;
    let cx = 0;
    for (const q of b.hull) cx += q[0] / n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (b.foot[i] && b.foot[j]) continue;
      if (
        litFront &&
        (b.foot[i] || b.foot[j]) &&
        (b.hull[i][0] + b.hull[j][0]) / 2 < cx
      )
        continue;
      ctx.moveTo(b.hull[i][0], b.hull[i][1]);
      ctx.lineTo(b.hull[j][0], b.hull[j][1]);
    }
    for (const f of b.faces) {
      if (f.kind === "roof" && f.pts.length >= 2) {
        // The eaves.
        ctx.moveTo(f.pts[0][0], f.pts[0][1]);
        ctx.lineTo(f.pts[1][0], f.pts[1][1]);
      } else if (f.quad && (!litFront || f.f < 0.45)) {
        // The upright corners.
        const [pa, pb, ta, tb] = f.quad;
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(ta[0], ta[1]);
        ctx.moveTo(pb[0], pb[1]);
        ctx.lineTo(tb[0], tb[1]);
      }
    }
    for (const d of b.dormers) {
      ctx.moveTo(d.front[4][0], d.front[4][1]);
      ctx.lineTo(d.front[3][0], d.front[3][1]);
      ctx.lineTo(d.front[2][0], d.front[2][1]);
    }
    ctx.strokeStyle = rgba(INK.line, 0.92);
    ctx.lineWidth = c.pen(pen * 0.8);
    ctx.stroke();
    for (const k of b.chimneys) {
      ctx.fillStyle = PAPER.low;
      ctx.fillRect(k.x - k.w / 2, k.y0, k.w, k.y1 - k.y0);
      ctx.strokeStyle = rgba(INK.line, 0.9);
      ctx.lineWidth = c.pen(pen * 0.6);
      ctx.beginPath();
      ctx.moveTo(k.x - k.w / 2, k.y0);
      ctx.lineTo(k.x - k.w / 2, k.y1);
      ctx.lineTo(k.x + k.w / 2, k.y1);
      ctx.lineTo(k.x + k.w / 2, k.y0);
      ctx.moveTo(k.x + k.w * 0.15, k.y0);
      ctx.lineTo(k.x + k.w * 0.15, k.y1);
      ctx.stroke();
    }
  }
}
