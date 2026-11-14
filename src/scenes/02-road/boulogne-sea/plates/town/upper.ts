import { PLACES, RAMPART_HEIGHT, RAMPARTS, TOWN_GROUND } from "../../geo";
import { createRng, mix, type Pt, rgba, softBlob } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { BUILD, EYE_EN, project, VEX, viewOf } from "../../scene";
import {
  airTone,
  type Building,
  build,
  DUSK,
  ROOFS,
  type Tone,
  toneAt,
  townAir,
  WALLS,
} from "./houses";
import {
  brokenLine,
  groundSkyline,
  inside,
  lightBook,
  penAt,
  Shapes,
  strokeLines,
  sunOn,
} from "./kit";

/**
 * The upper town (brief: the walled rectangle corner-on to the sea on its
 * plateau; walls 13-16 m of dark grey-brown stone with round towers,
 * crowned by a double row of trees; the Porte des Dunes toward the lower
 * town and the harbour; roofs inside; the belfry, a square stone tower
 * with an octagonal top stage under a slender spire, the Chappe telegraph
 * on the spire's point (as Lewis drew it in October 1804, the nearest view
 * in time; history-notes.md, "What crowned it in August 1805"), against
 * Mont Lambert's slope; the château's round towers at the far corner,
 * barely seen; nothing tall where the cathedral was being pulled down).
 */

export const UPPER_DEPTH = 2500;

/** The walls' foot (the ground outside, as drawn) and top. */
export const FOOT = 50 * VEX;
export const TOP = FOOT + RAMPART_HEIGHT * BUILD;

const [W, N, E, S] = RAMPARTS;

const STONE: Tone = { lit: "#c8ac84", graze: "#988b80", shade: "#6b6977" };

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function P(p: Pt, z: number): Pt {
  return project(p[0], p[1], z) as Pt;
}

export interface Face {
  foot: Pt[];
  top: Pt[];
  /** The outward normal's azimuth, degrees. */
  az: number;
}

export interface Tower {
  x: number;
  y0: number;
  y1: number;
  r: number;
  distance: number;
  /** A crenellated top over a corbelled band (the château, the gate); else a plain parapet. */
  crenel: boolean;
}

export interface TreeCrown {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** The trunk's foot, layer units (the walk's level): shows in the gaps against the hill. */
  foot: number;
  seed: number;
}

/** The belfry's square stage: its corner turrets and its bell stage's openings. */
export interface BelfryStage {
  turrets: Tower[];
  /** Tall openings at the bell stage, each a quad (foot left, foot right, top right, top left), with its face's light. */
  openings: { quad: Pt[]; f: number }[];
}

export interface Upper {
  nw: Face;
  sw: Face;
  towers: Tower[];
  gate: {
    x: number;
    y0: number;
    y1: number;
    r: number;
    arch: number;
    towers: Tower[];
  };
  trees: TreeCrown[];
  belfry: Building;
  stage: BelfryStage;
  /** The octagonal stage (y0 to y1), its half-width, and the spire's height above it. */
  octagon: { x: number; y0: number; y1: number; r: number; spire: number };
  telegraph: { x: number; y0: number; y1: number; reg: number; arm: number };
  chateau: Tower[];
  ground: Pt[];
}

let cache: Upper | undefined;

function face(a: Pt, b: Pt): Face {
  const foot: Pt[] = [];
  const top: Pt[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = lerp(a, b, i / 30);
    foot.push(P(p, FOOT));
    top.push(P(p, TOP));
  }
  const te = b[0] - a[0];
  const tn = b[1] - a[1];
  // Outward: to the right of a→b (the faces run N→W and W→S, anticlockwise seen from above): the normal (tn, -te), as an azimuth.
  const az = ((Math.atan2(tn, -te) * 180) / Math.PI + 360) % 360;
  return { foot, top, az };
}

function towerAt(
  a: Pt,
  b: Pt,
  t: number,
  radius: number,
  extra: number,
  crenel: boolean,
): Tower {
  const p = lerp(a, b, t);
  const [ahead] = viewOf(p[0], p[1]);
  const u = 1000 / ahead;
  const [x, y0] = P(p, FOOT - 3);
  const [, y1] = P(p, TOP + extra);
  return { x, y0, y1, r: radius * BUILD * u, distance: ahead, crenel };
}

type Walls = Pick<Upper, "nw" | "sw" | "towers" | "gate">;
let wallsCache: Walls | undefined;

/** The walls' faces, towers and gate (the plan's first job). */
export function upperWalls(): Walls {
  if (wallsCache) return wallsCache;
  const nw = face(N, W);
  const sw = face(W, S);
  const towers: Tower[] = [];
  for (const t of [0.02, 0.19, 0.37, 0.56])
    towers.push(towerAt(N, W, t, 5.2, 1.5, false));
  towers.push(towerAt(N, W, 0.995, 6.2, 2.5, false));
  for (const t of [0.42, 0.985]) towers.push(towerAt(W, S, t, 5.2, 1.5, false));
  // The Porte des Dunes: two broad round towers flanking the arch, a little
  // over the walls, crenellated, no roofs; toward the lower town and the harbour.
  const gp = lerp(N, W, 0.78);
  const [gAhead] = viewOf(gp[0], gp[1]);
  const gu = 1000 / gAhead;
  const [gx, gy0] = P(gp, FOOT - 2);
  const [, gy1] = P(gp, TOP + 1.5 * BUILD);
  const gate = {
    x: gx,
    y0: gy0,
    y1: gy1,
    r: 4 * BUILD * gu,
    arch: 3.6 * BUILD * gu,
    towers: [
      towerAt(N, W, 0.742, 5.6, 2.2 * BUILD, true),
      towerAt(N, W, 0.818, 5.6, 2.2 * BUILD, true),
    ],
  };
  wallsCache = { nw, sw, towers, gate };
  return wallsCache;
}

let treesCache: TreeCrown[] | undefined;

/** The trees on the ramparts' walk (the plan's second job). */
export function upperTrees(): TreeCrown[] {
  if (treesCache) return treesCache;
  // The double row of trees on the ramparts' walk: crowns of different
  // sizes, a few tall elms, gaps of one to three missing crowns.
  const rng = createRng(911);
  const trees: TreeCrown[] = [];
  const cx = (W[0] + E[0]) / 2;
  const cn = (W[1] + E[1]) / 2;
  const row = (a: Pt, b: Pt, inset: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = 6 + rng() * 6;
    while (s < len - 6) {
      if (rng() < 0.13) {
        s += (1 + Math.floor(rng() * 3)) * 9;
        continue;
      }
      const [e0, n0] = lerp(a, b, s / len);
      const k = inset / Math.hypot(cx - e0, cn - n0);
      const e = e0 + (cx - e0) * k;
      const n = n0 + (cn - n0) * k;
      const [ahead] = viewOf(e, n);
      const u = 1000 / ahead;
      const [x, y] = P([e, n], TOP - 2);
      const elm = rng() < 0.1;
      const size = elm ? 1.2 + rng() * 0.3 : 0.6 + rng() * 0.75;
      const lift = elm ? 1.3 : 1;
      const rx = 5.6 * BUILD * u * 0.5 * size;
      // A gap in the rows where the château's towers show over the wall.
      if (Math.abs(x - 37) > 9)
        trees.push({
          x,
          y: y + rx * 0.4 * (lift - 1),
          rx: rx * (elm ? 1.1 : 1),
          ry: 7.5 * BUILD * u * 0.5 * size * lift,
          foot: y - 0.4,
          seed: Math.floor(rng() * 1e6),
        });
      s += 7 + rng() * 5;
    }
  };
  row(N, W, 22);
  row(W, S, 22);
  row(N, W, 9);
  row(W, S, 9);
  trees.sort((p, q) => q.y - p.y);
  treesCache = trees;
  return trees;
}

export function upper(): Upper {
  if (cache) return cache;
  const { nw, sw, towers, gate } = upperWalls();
  const trees = upperTrees();
  const te = (W[0] - N[0]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  const tn = (W[1] - N[1]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  // Inward, away from the north-west wall: left of N→W.
  const ie = -tn;
  const in_ = te;
  const [be, bn] = PLACES.belfry;
  // The belfry: the square stone tower (27 m) on the old town hall's roofs,
  // faces square to the town's streets: plain coursed stone, no house
  // windows; tall louvred openings at the bell stage; four small corner
  // turrets on its square stage (history-notes.md, "The belfry").
  const ground = 52 * VEX;
  const bw = 10 * BUILD;
  const bh = 27 * BUILD;
  const fe = be - ie * 5 * BUILD;
  const fn = bn - in_ * 5 * BUILD;
  const belfry = build({
    e: fe,
    n: fn,
    ground,
    te,
    tn,
    w: bw,
    d: bw,
    h: bh,
    pitch: 0.12,
    ridge: "along",
    hip: true,
    wall: STONE,
    roof: ROOFS.slateDark,
    storeys: 6,
    chimneys: 0,
    plain: true,
    seed: 4242,
  });
  const stage = belfryStage(fe, fn, te, tn, ground, bw, bh);
  const [bx] = P([be, bn], ground);
  const [bAhead] = viewOf(be, bn);
  const bu = 1000 / bAhead;
  const [, oy0] = P([be, bn], ground + 27 * BUILD + 0.6 * BUILD);
  const [, oy1] = P([be, bn], ground + 35.5 * BUILD);
  // A slender spire of about 9 m on the octagon (Lewis, October 1804, and
  // the engraving of the telegraph, an XII: the nearest views in time).
  const octagon = {
    x: bx,
    y0: oy0,
    y1: oy1,
    r: 3.9 * BUILD * bu,
    spire: 9 * BUILD * bu,
  };
  // The Chappe telegraph on the spire's point: a mast, the regulator across its head, an indicator at each end (drawn half again its size, so it reads).
  const T = 1.6;
  const telegraph = {
    x: bx,
    y0: oy1 + octagon.spire * 0.86,
    y1: oy1 + octagon.spire * 0.86 + 5.6 * BUILD * bu * T,
    reg: 2.3 * BUILD * bu * T,
    arm: 1.15 * BUILD * bu * T,
  };
  // The château at the far (east) corner: an octagon of round towers, of
  // which three or four show over the north-west wall, low broad drums of
  // dark coursed stone with crenellated tops, barely over the walls.
  const chateau: Tower[] = [-24, -9, 6, 21].map((off) => {
    const p: Pt = [PLACES.chateau[0] + off, PLACES.chateau[1] - off * 0.7];
    const [ahead] = viewOf(p[0], p[1]);
    const u = 1000 / ahead;
    const [x, y0] = P(p, TOWN_GROUND * VEX);
    const lift = off === -9 || off === 6 ? 26 : 23.5;
    const [, y1] = P(p, TOWN_GROUND * VEX + lift * BUILD);
    return { x, y0, y1, r: 6.4 * BUILD * u, distance: ahead, crenel: true };
  });
  // The slope below the walls and beside them.
  const nwFoot0 = nw.foot[0][0];
  const swFoot1 = sw.foot[sw.foot.length - 1][0];
  const left = groundSkyline(-80, nwFoot0 - 1, 3, 2250, 2750, 18);
  const right = groundSkyline(swFoot1 + 1, 196, 3, 2250, 2850, 18);
  const groundLine: Pt[] = [...left, ...nw.foot, ...sw.foot.slice(1), ...right];
  cache = {
    nw,
    sw,
    towers,
    gate,
    trees,
    belfry,
    stage,
    octagon,
    telegraph,
    chateau,
    ground: groundLine,
  };
  return cache;
}

/**
 * The belfry's square stage seen from the roads: a turret at each corner
 * that shows (a small drum with a pointed cap over the parapet), and two
 * tall louvred openings in each face that shows, at the bell stage.
 */
function belfryStage(
  fe: number,
  fn: number,
  te: number,
  tn: number,
  ground: number,
  w: number,
  h: number,
): BelfryStage {
  // The plan: the front F0-F1 along t, the back a depth w behind (left of t), as build() lays it.
  const be = -tn;
  const bn = te;
  const F0: Pt = [fe - (te * w) / 2, fn - (tn * w) / 2];
  const F1: Pt = [fe + (te * w) / 2, fn + (tn * w) / 2];
  const B0: Pt = [F0[0] + be * w, F0[1] + bn * w];
  const B1: Pt = [F1[0] + be * w, F1[1] + bn * w];
  const top = ground + h;
  const turrets: Tower[] = [];
  for (const c of [F0, F1, B0, B1]) {
    const [ahead] = viewOf(c[0], c[1]);
    const u = 1000 / ahead;
    const [x, y0] = P(c, top - 2.5 * BUILD);
    const [, y1] = P(c, top + 3.2 * BUILD);
    turrets.push({
      x,
      y0,
      y1,
      r: 1.05 * BUILD * u,
      distance: ahead,
      crenel: false,
    });
  }
  // Only the turrets that show: the nearer three (the far corner hides behind the octagon's foot).
  turrets.sort((a, b) => b.distance - a.distance);
  turrets.shift();
  // The faces that show (toward the eye), their light, and two openings each.
  const openings: BelfryStage["openings"] = [];
  const faces: [Pt, Pt, number, number][] = [
    [F0, F1, -be, -bn],
    [B1, B0, be, bn],
    [B0, F0, -te, -tn],
    [F1, B1, te, tn],
  ];
  for (const [a, b, ne, nn] of faces) {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    if (ne * (EYE_EN[0] - mx) + nn * (EYE_EN[1] - my) <= 0) continue;
    const az = (Math.atan2(ne, nn) * 180) / Math.PI;
    const f = sunOn(az);
    for (const k of [0.3, 0.7]) {
      const p0 = lerp(a, b, k - 0.08);
      const p1 = lerp(a, b, k + 0.08);
      const z0 = top - 8.5 * BUILD;
      const z1 = top - 3.2 * BUILD;
      openings.push({ quad: [P(p0, z0), P(p1, z0), P(p1, z1), P(p0, z1)], f });
    }
  }
  return { turrets, openings };
}

/** The houses inside the walls: rows parallel to the north-west wall, their fronts to it (only their roofs and upper storeys show over the walls and between the trees). */
const interior: Building[][] = [];
let interiorAll: Building[] | undefined;

/** Lays out the interior's rows from `from` to `to` (each its own seed), for jobs to share the work. */
export function interiorRows(from: number, to: number): void {
  if (interiorAll) return;
  for (let r = from; r < to; r++) if (!interior[r]) interior[r] = layRow(r);
}

function layRow(row: number): Building[] {
  const houses: Building[] = [];
  const from = row;
  const to = row + 1;
  const te = (W[0] - N[0]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  const tn = (W[1] - N[1]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  // Inward, away from the north-west wall: left of N→W.
  const ie = -tn;
  const in_ = te;
  const lenNW = Math.hypot(W[0] - N[0], W[1] - N[1]);
  const [be, bn] = PLACES.belfry;
  for (let r = from; r < to; r++) {
    const rng = createRng(912 + r * 7919);
    const off = 42 + r * 34 + rng() * 6;
    let s = 20 + rng() * 10;
    while (s < lenNW + 120) {
      const w = (6 + rng() * 6) * BUILD;
      const e = N[0] + te * (s + w / 2) + ie * off;
      const n = N[1] + tn * (s + w / 2) + in_ * off;
      s += w;
      if (rng() < 0.1) {
        s += 10 + rng() * 10;
        continue;
      }
      if (!inside(RAMPARTS, e, n)) continue;
      // Clear of the walls' inner side, the belfry's and the château's plots, and the cathedral's site (being pulled down).
      if (Math.hypot(e - be, n - bn) < 34) continue;
      if (Math.hypot(e - PLACES.chateau[0], n - PLACES.chateau[1]) < 55)
        continue;
      // Nor in front of the château across its moat, so its drums show over the wall.
      {
        const [ahead, right] = viewOf(e, n);
        if (Math.abs((1000 * right) / ahead - 37) < 9 && ahead > 2380) continue;
      }
      if (
        Math.hypot(e - PLACES.cathedralSite[0], n - PLACES.cathedralSite[1]) <
        40
      )
        continue;
      const storeys = rng() < 0.5 ? 2 : 3;
      const slate = rng() < 0.45;
      const roofKind = slate
        ? rng() < 0.6
          ? ROOFS.slate
          : ROOFS.slateDark
        : rng() < 0.6
          ? ROOFS.tile
          : ROOFS.tileOld;
      houses.push(
        build({
          e,
          n,
          ground: TOWN_GROUND * VEX,
          te,
          tn,
          w: w * 0.97,
          d: (10 + rng() * 5) * BUILD,
          h: (storeys * 3.3 + 1) * BUILD,
          pitch: slate ? 1.05 + rng() * 0.25 : 0.8 + rng() * 0.25,
          ridge: rng() < 0.25 ? "across" : "along",
          hip: rng() < 0.15,
          wall:
            rng() < 0.5 ? WALLS.stone : rng() < 0.5 ? WALLS.cream : WALLS.white,
          roof: roofKind,
          storeys,
          chimneys: rng() < 0.8 ? 1 + (rng() < 0.4 ? 1 : 0) : 0,
          seed: Math.floor(rng() * 1e9),
        }),
      );
    }
  }
  return houses;
}

export const INTERIOR_ROWS = 9;

export function interiorHouses(): Building[] {
  if (interiorAll) return interiorAll;
  interiorRows(0, INTERIOR_ROWS);
  interiorAll = interior.flat().sort((a, b) => b.distance - a.distance);
  return interiorAll;
}

// ------------------------------------------------------------- painting

/**
 * The walls' and towers' stone: dark grey-brown (history-notes.md, "The
 * upper town": walls 13-16 m of dark grey-brown stone), warm where the low
 * sun takes it, cool in the sky's shade.
 */
const WALL_STONE: Tone = { lit: "#9d8467", graze: "#73685f", shade: "#4f4c57" };

/** A round tower's light across its visible half: the sun 8° left of behind. */
function towerStops(t: Tone, distance: number): [number, string][] {
  const tone = airTone(t, distance);
  const out: [number, string][] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    // x from the left limb (k=0) to the right limb (k=1); the face's azimuth offset from the eye's line.
    const phi = Math.asin(1 - 2 * k);
    const f = Math.max(0, Math.cos(phi - (8 * Math.PI) / 180));
    out.push([k, toneAt(tone, f * 0.98)]);
  }
  return out;
}

/** The drum's top edge: a slight arc, its front higher (seen from below, the near side of a ring stands up). */
function drumTop(tw: Tower, x: number): number {
  const u = (x - tw.x) / tw.r;
  return tw.y1 + tw.r * 0.1 * (1 - u * u);
}

function drumPath(tw: Tower, top: (x: number) => number): Path2D {
  const p = new Path2D();
  p.moveTo(tw.x - tw.r, tw.y0);
  for (let k = 0; k <= 10; k++) {
    const x = tw.x - tw.r + (2 * tw.r * k) / 10;
    p.lineTo(x, top(x));
  }
  p.lineTo(tw.x + tw.r, tw.y0);
  p.closePath();
  return p;
}

/** The merlons along a crenellated top: their boxes, layer units. */
function merlons(tw: Tower): [number, number, number, number][] {
  const n = Math.max(3, Math.round((2 * tw.r) / 1.15));
  const out: [number, number, number, number][] = [];
  const h = Math.max(0.55, tw.r * 0.16);
  for (let i = 0; i < n; i++) {
    // Narrower toward the limbs, as the ring turns away.
    const a0 = Math.PI * (1 - (i + 0.18) / n);
    const a1 = Math.PI * (1 - (i + 0.72) / n);
    const x0 = tw.x + Math.cos(a0) * tw.r;
    const x1 = tw.x + Math.cos(a1) * tw.r;
    out.push([x0, x1, drumTop(tw, (x0 + x1) / 2), h]);
  }
  return out;
}

/** A round tower's silhouette as painted (its drum, its merlons), into an occluder of the lights behind it (paint/lights.ts). */
function towerShape(s: Shapes, tw: Tower): Shapes {
  const top = (x: number) => drumTop(tw, x);
  const pts: Pt[] = [[tw.x - tw.r, tw.y0]];
  for (let k = 0; k <= 10; k++) {
    const x = tw.x - tw.r + (2 * tw.r * k) / 10;
    pts.push([x, top(x)]);
  }
  pts.push([tw.x + tw.r, tw.y0]);
  s.poly(pts);
  if (tw.crenel)
    for (const [x0, x1, y, mh] of merlons(tw))
      s.rect(x0, y - 0.05, x1 - x0, mh);
  return s;
}

/** A round tower in dark coursed stone: lit on its left, its courses curving with the drum, the street's dusk at its foot, a corbelled band and merlons on a crenellated top, else a plain parapet with its lit coping. */
export function paintTower(c: PlateCanvas, tw: Tower, t: Tone): void {
  const { ctx } = c;
  const tone = airTone(t, tw.distance);
  const g = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
  for (const [k, col] of towerStops(t, tw.distance)) g.addColorStop(k, col);
  const top = (x: number) => drumTop(tw, x);
  const drum = drumPath(tw, top);
  ctx.fillStyle = g;
  ctx.fill(drum);
  ctx.save();
  ctx.clip(drum);
  // The ditch's dusk at the foot.
  const h = tw.y1 - tw.y0;
  const dusk = ctx.createLinearGradient(0, tw.y0, 0, tw.y0 + h * 0.35);
  dusk.addColorStop(0, rgba(townAir(DUSK, tw.distance), 0.55));
  dusk.addColorStop(1, rgba(townAir(DUSK, tw.distance), 0));
  ctx.fillStyle = dusk;
  ctx.fillRect(tw.x - tw.r, tw.y0, 2 * tw.r, h * 0.35);
  // Courses, curving with the drum.
  ctx.strokeStyle = rgba(tone.shade, 0.3);
  ctx.lineWidth = c.pen(0.45);
  ctx.beginPath();
  const n = Math.floor(h / 0.95);
  for (let k = 1; k < n; k++) {
    const y = tw.y0 + (h * k) / n;
    const bow = tw.r * 0.1 * (k / n);
    for (let i = 0; i <= 8; i++) {
      const u = -1 + (2 * i) / 8;
      const x = tw.x + u * tw.r;
      const yy = y + bow * (1 - u * u);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
  }
  ctx.stroke();
  // Weathering: a few dark streaks down from the parapet.
  const rng = createRng(Math.floor(tw.x * 97 + tw.y1 * 13));
  for (let i = 0; i < 4; i++) {
    const x = tw.x - tw.r * 0.8 + rng() * tw.r * 1.6;
    const len = h * (0.2 + rng() * 0.4);
    ctx.fillStyle = rgba(tone.shade, 0.18 + rng() * 0.12);
    ctx.fillRect(x, tw.y1 - len, 0.3 + rng() * 0.3, len);
  }
  ctx.restore();
  if (tw.crenel) {
    // The corbelled band's shadow under the parapet, the parapet's lit face above it.
    const band = Math.max(0.35, tw.r * 0.09);
    ctx.save();
    ctx.clip(drum);
    ctx.fillStyle = rgba(townAir("#2c282e", tw.distance), 0.6);
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = tw.x - tw.r + (2 * tw.r * k) / 10;
      const y = top(x) - band * 2.6;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let k = 10; k >= 0; k--) {
      const x = tw.x - tw.r + (2 * tw.r * k) / 10;
      ctx.lineTo(x, top(x) - band * 1.6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Merlons, each lit on its left.
    for (const [x0, x1, y, mh] of merlons(tw)) {
      const k = ((x0 + x1) / 2 - (tw.x - tw.r)) / (2 * tw.r);
      const stops = towerStops(t, tw.distance);
      const col = stops[Math.min(8, Math.max(0, Math.round(k * 8)))][1];
      ctx.fillStyle = col;
      ctx.fillRect(x0, y - 0.05, x1 - x0, mh);
      ctx.fillStyle = rgba(mix(tone.lit, "#fff1d0", 0.3), 0.7 * (1 - k));
      ctx.fillRect(x0, y + mh - 0.18, x1 - x0, 0.18);
    }
  } else {
    // A plain parapet: its coping lit gold on the left, in shade on the right.
    ctx.lineWidth = c.pen(1.1);
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = tw.x - tw.r + (2 * tw.r * k) / 10;
      if (k === 0) ctx.moveTo(x, top(x) - 0.15);
      else ctx.lineTo(x, top(x) - 0.15);
    }
    const lg = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
    lg.addColorStop(0, mix(tone.lit, "#fff1d0", 0.35));
    lg.addColorStop(0.6, mix(tone.lit, "#fff1d0", 0.1));
    lg.addColorStop(1, tone.graze);
    ctx.strokeStyle = lg;
    ctx.stroke();
  }
}

export function engraveTower(c: PlateCanvas, tw: Tower): void {
  const { ctx } = c;
  const pen = penAt(tw.distance);
  const top = (x: number) => drumTop(tw, x);
  const drum = drumPath(tw, top);
  ctx.fillStyle = PAPER.low;
  ctx.fill(drum);
  for (const [x0, x1, y, mh] of tw.crenel ? merlons(tw) : [])
    ctx.fillRect(x0, y - 0.05, x1 - x0, mh);
  // Uprights closer toward the shaded right limb (the drum's form), courses curving across the lit side.
  const lines: Pt[][] = [];
  for (let k = 0.3; k < 1; k += 0.08) {
    const x = tw.x - tw.r + 2 * tw.r * k;
    if (k < 0.6 && Math.floor(k * 100) % 2) continue;
    lines.push([
      [x, tw.y0],
      [x, top(x) - 0.3],
    ]);
  }
  strokeLines(c, lines, pen * 0.42, INK.hatch, 0.85);
  const courses: Pt[][] = [];
  const h = tw.y1 - tw.y0;
  for (let y = tw.y0 + 1.4; y < tw.y1 - 0.8; y += 1.9) {
    const bow = tw.r * 0.1 * ((y - tw.y0) / h);
    const l: Pt[] = [];
    for (let i = 0; i <= 6; i++) {
      const u = -1 + (1.4 * i) / 6;
      l.push([tw.x + u * tw.r, y + bow * (1 - u * u)]);
    }
    courses.push(...brokenLine(l, 2.5, 1, Math.floor(y * 31 + tw.x)));
  }
  strokeLines(c, courses, pen * 0.35, INK.hatch, 0.6);
  // The outline: the limbs and the top (the foot is a cut, never stroked).
  const outline: Pt[] = [[tw.x - tw.r, tw.y0]];
  for (let k = 0; k <= 10; k++) {
    const x = tw.x - tw.r + (2 * tw.r * k) / 10;
    outline.push([x, top(x)]);
  }
  outline.push([tw.x + tw.r, tw.y0]);
  strokeLines(c, [outline], pen * 0.85, INK.line, 0.95);
  if (tw.crenel) {
    const ml: Pt[][] = merlons(tw).map(([x0, x1, y, mh]) => [
      [x0, y],
      [x0, y + mh],
      [x1, y + mh],
      [x1, y],
    ]);
    strokeLines(c, ml, pen * 0.6, INK.line, 0.9);
  }
}

function wallPath(f: Face): Path2D {
  const p = new Path2D();
  p.moveTo(f.foot[0][0], f.foot[0][1]);
  for (const q of f.foot) p.lineTo(q[0], q[1]);
  for (let i = f.top.length - 1; i >= 0; i--)
    p.lineTo(f.top[i][0], f.top[i][1]);
  p.closePath();
  return p;
}

/** The ramparts' faces: courses of dark stone, the north-west face taking the low sun at a slant, warm; the south-west in the sky's cool shade; the ditch's dusk at the foot; each tower's shadow on the wall at its right. */
export function paintWalls(c: PlateCanvas): void {
  const { ctx } = c;
  const u = upper();
  const air = UPPER_DEPTH - 100;
  const tone = airTone(WALL_STONE, air);
  for (const f of [u.sw, u.nw]) {
    const p = wallPath(f);
    const lit = sunOn(f.az);
    const col = toneAt(tone, lit);
    const y0 = Math.min(...f.foot.map((q) => q[1]));
    const y1 = Math.max(...f.top.map((q) => q[1]));
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix(col, townAir(DUSK, air), 0.55));
    g.addColorStop(0.3, mix(col, tone.shade, 0.12));
    g.addColorStop(0.85, col);
    g.addColorStop(1, mix(col, "#fff0cc", 0.1 * lit));
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    // Courses.
    ctx.strokeStyle = rgba(tone.shade, lit > 0.5 ? 0.3 : 0.2);
    ctx.lineWidth = c.pen(0.5);
    ctx.beginPath();
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      for (let i = 0; i < f.foot.length; i++) {
        const x = f.foot[i][0];
        const y = f.foot[i][1] + (f.top[i][1] - f.foot[i][1]) * t;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    // Weathering: streaks from the walk's drains, patches of lichen and damp.
    const rng = createRng(17 + Math.floor(f.az));
    for (let i = 0; i < 34; i++) {
      const k = Math.floor(rng() * f.foot.length);
      const x = f.foot[k][0] + rng() * 2;
      const top = f.top[k][1];
      const len = (top - f.foot[k][1]) * (0.2 + rng() * 0.55);
      ctx.fillStyle = rgba(tone.shade, 0.16 + rng() * 0.14);
      ctx.fillRect(x, top - len, 0.35 + rng() * 0.5, len);
    }
    for (let i = 0; i < 16; i++) {
      const k = Math.floor(rng() * f.foot.length);
      softBlob(
        c,
        f.foot[k][0],
        f.foot[k][1] + rng() * 5,
        2 + rng() * 4,
        0.8 + rng() * 1.5,
        rng() < 0.5 ? "#5d634b" : tone.shade,
        0.22,
      );
    }
    // Each tower's shadow on the wall beside it (the light from behind and a little left: a narrow band at its right).
    for (const tw of [...u.towers, ...u.gate.towers]) {
      const sg = ctx.createLinearGradient(
        tw.x + tw.r * 0.8,
        0,
        tw.x + tw.r * 1.7,
        0,
      );
      sg.addColorStop(0, rgba(townAir("#3a3640", air), 0.45));
      sg.addColorStop(1, rgba(townAir("#3a3640", air), 0));
      ctx.fillStyle = sg;
      ctx.fillRect(tw.x + tw.r * 0.8, tw.y0, tw.r * 0.9, tw.y1 - tw.y0);
    }
    ctx.restore();
    // The parapet's coping catching the sun, a dark line of its shadow under it.
    strokeLines(
      c,
      [f.top.map(([x, y]) => [x, y - 0.55] as Pt)],
      0.8,
      townAir("#2f2a30", air),
      0.45,
    );
    strokeLines(c, [f.top], 0.9, mix(col, "#fff2d4", 0.32 * lit), 0.9);
  }
  for (const tw of u.towers) paintTower(c, tw, WALL_STONE);
  // The Porte des Dunes: the gate's front between its towers, the arch dark.
  const gt = u.gate;
  const gtone = airTone(WALL_STONE, air);
  ctx.fillStyle = toneAt(gtone, 0.8);
  ctx.fillRect(gt.x - gt.r, gt.y0, gt.r * 2, gt.y1 - gt.y0);
  ctx.fillStyle = rgba(townAir(DUSK, air), 0.5);
  ctx.fillRect(gt.x - gt.r, gt.y0, gt.r * 2, (gt.y1 - gt.y0) * 0.3);
  ctx.fillStyle = rgba(gtone.shade, 0.5);
  ctx.fillRect(gt.x - gt.r, gt.y1 - 0.5, gt.r * 2, 0.5);
  for (const tw of gt.towers) paintTower(c, tw, WALL_STONE);
  ctx.fillStyle = townAir("#2a2428", air);
  ctx.beginPath();
  const aw = gt.arch * 0.42;
  ctx.moveTo(gt.x - aw, gt.y0);
  ctx.lineTo(gt.x - aw, gt.y0 + gt.arch * 0.75);
  ctx.arc(gt.x, gt.y0 + gt.arch * 0.75, aw, Math.PI, 0, true);
  ctx.lineTo(gt.x + aw, gt.y0);
  ctx.closePath();
  ctx.fill();
  // The ramparts hide the lights of the houses inside them below their
  // walk (paint/lights.ts): the faces, the towers, the gate.
  const book = lightBook(c);
  if (book) {
    const sh = new Shapes();
    for (const f of [u.sw, u.nw]) sh.poly([...f.foot, ...[...f.top].reverse()]);
    for (const tw of u.towers) towerShape(sh, tw);
    sh.rect(gt.x - gt.r, gt.y0, gt.r * 2, gt.y1 - gt.y0);
    for (const tw of gt.towers) towerShape(sh, tw);
    book.occlude(sh);
  }
}

export function engraveWalls(c: PlateCanvas): void {
  const { ctx } = c;
  const u = upper();
  const pen = penAt(UPPER_DEPTH - 100);
  for (const f of [u.sw, u.nw]) {
    const p = wallPath(f);
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    const lit = sunOn(f.az);
    const lines: Pt[][] = [];
    // Dark stone: open uprights on the lit face, close ones in shade.
    const gap = c.pen(lit < 0.6 ? 1.3 : 2.6);
    for (let i = 0; i < f.foot.length - 1; i++) {
      const a = f.foot[i];
      const b = f.foot[i + 1];
      const ta = f.top[i];
      const span = b[0] - a[0];
      const n = Math.max(1, Math.round(span / gap));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        lines.push([
          [a[0] + span * t, a[1] + (b[1] - a[1]) * t],
          [a[0] + span * t, ta[1] + (f.top[i + 1][1] - ta[1]) * t],
        ]);
      }
    }
    // The courses, crossing them: broken, closer toward the foot (the ditch's dusk); unbroken in shade.
    for (let k = 1; k < 10; k++) {
      const t = (k / 10) ** 1.4;
      const l = f.foot.map(
        (q, i) => [q[0], q[1] + (f.top[i][1] - q[1]) * t] as Pt,
      );
      if (lit < 0.6) lines.push(l);
      else
        lines.push(
          ...brokenLine(l, 5 + k, 1.5 + k * 0.3, 300 + k + Math.floor(f.az)),
        );
    }
    strokeLines(c, lines, pen * 0.4, INK.hatch, lit < 0.6 ? 0.85 : 0.6);
    // The true contours: the parapet's line; the foot only as a light broken line.
    strokeLines(c, [f.top], pen, INK.line, 1);
    strokeLines(
      c,
      brokenLine(f.foot, 4, 2.5, 41 + Math.floor(f.az)),
      pen * 0.5,
      INK.hatch,
      0.7,
    );
  }
  // The west corner's arris.
  const wc = u.nw.top[u.nw.top.length - 1];
  const wf = u.nw.foot[u.nw.foot.length - 1];
  strokeLines(c, [[wf, wc]], pen, INK.line, 1);
  for (const tw of u.towers) engraveTower(c, tw);
  const gt = u.gate;
  ctx.fillStyle = PAPER.low;
  ctx.fillRect(gt.x - gt.r, gt.y0, gt.r * 2, gt.y1 - gt.y0);
  strokeLines(
    c,
    [
      [
        [gt.x - gt.r, gt.y1],
        [gt.x + gt.r, gt.y1],
      ],
    ],
    pen,
    INK.line,
  );
  for (const tw of gt.towers) engraveTower(c, tw);
  ctx.fillStyle = INK.line;
  ctx.beginPath();
  const aw = gt.arch * 0.42;
  ctx.moveTo(gt.x - aw, gt.y0);
  ctx.lineTo(gt.x - aw, gt.y0 + gt.arch * 0.75);
  ctx.arc(gt.x, gt.y0 + gt.arch * 0.75, aw, Math.PI, 0, true);
  ctx.lineTo(gt.x + aw, gt.y0);
  ctx.closePath();
  ctx.fill();
}

/** The belfry's square stage: the bell stage's tall louvred openings, and the corner turrets over the parapet with their small pointed caps. */
export function paintBelfryStage(c: PlateCanvas): void {
  const { ctx } = c;
  const s = upper().stage;
  const d = 2533;
  for (const o of s.openings) {
    ctx.fillStyle = townAir(o.f > 0.4 ? "#3a3236" : "#2c272d", d);
    ctx.beginPath();
    ctx.moveTo(o.quad[0][0], o.quad[0][1]);
    for (const q of o.quad) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.fill();
    // The louvres: a few lit slats across.
    const [a, b, , t] = o.quad;
    ctx.strokeStyle = rgba(townAir("#8c7a66", d), 0.55);
    ctx.lineWidth = c.pen(0.4);
    ctx.beginPath();
    for (let k = 1; k < 5; k++) {
      const y = a[1] + ((t[1] - a[1]) * k) / 5;
      ctx.moveTo(a[0], y);
      ctx.lineTo(b[0], y + (b[1] - a[1]));
    }
    ctx.stroke();
  }
  const slate = airTone(ROOFS.slateDark, d);
  for (const tw of s.turrets) {
    paintTower(c, tw, STONE);
    // Its cap: a small pointed cone of slate, lit on the left.
    const cg = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
    cg.addColorStop(0, slate.graze);
    cg.addColorStop(0.35, slate.lit);
    cg.addColorStop(1, slate.shade);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(tw.x - tw.r * 1.15, tw.y1);
    ctx.lineTo(tw.x, tw.y1 + tw.r * 2.4);
    ctx.lineTo(tw.x + tw.r * 1.15, tw.y1);
    ctx.closePath();
    ctx.fill();
  }
  // The turrets hide the lights behind them (paint/lights.ts).
  const book = lightBook(c);
  if (book) {
    const sh = new Shapes();
    for (const tw of s.turrets)
      towerShape(sh, tw).poly([
        [tw.x - tw.r * 1.15, tw.y1],
        [tw.x + tw.r * 1.15, tw.y1],
        [tw.x, tw.y1 + tw.r * 2.4],
      ]);
    book.occlude(sh);
  }
}

export function engraveBelfryStage(c: PlateCanvas): void {
  const { ctx } = c;
  const s = upper().stage;
  const pen = penAt(2533);
  ctx.fillStyle = rgba(INK.line, 0.85);
  for (const o of s.openings) {
    ctx.beginPath();
    ctx.moveTo(o.quad[0][0], o.quad[0][1]);
    for (const q of o.quad) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    ctx.fill();
  }
  for (const tw of s.turrets) {
    engraveTower(c, tw);
    const cap = new Path2D();
    cap.moveTo(tw.x - tw.r * 1.15, tw.y1);
    cap.lineTo(tw.x, tw.y1 + tw.r * 2.4);
    cap.lineTo(tw.x + tw.r * 1.15, tw.y1);
    ctx.fillStyle = PAPER.low;
    ctx.fill(cap);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen * 0.7);
    ctx.stroke(cap);
  }
}

/** Foliage masses of a crown: a few overlapping lobes, seeded. */
function lobes(t: TreeCrown): [number, number, number, number][] {
  const rng = createRng(t.seed);
  const out: [number, number, number, number][] = [];
  const n = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng() * 0.8;
    const d = 0.3 + rng() * 0.45;
    out.push([
      t.x + Math.cos(a) * t.rx * d,
      t.y + t.ry + Math.sin(a) * t.ry * d * 0.85,
      t.rx * (0.34 + rng() * 0.26),
      t.ry * (0.3 + rng() * 0.22),
    ]);
  }
  return out;
}

/** The ramparts' trees: dark masses, cool in the shade, with a golden rim where the low sun takes them, up and to the left. */
const FOLIAGE: Tone = { lit: "#8d8a4c", graze: "#56603f", shade: "#343f36" };

export function paintTrees(
  c: PlateCanvas,
  list: readonly TreeCrown[],
  distance: number,
): void {
  const { ctx } = c;
  const t = airTone(FOLIAGE, distance);
  // Trunks first: they show in the gaps against the hill.
  ctx.strokeStyle = townAir("#3b322f", distance);
  ctx.lineWidth = c.pen(0.8);
  ctx.beginPath();
  for (const tr of list) {
    ctx.moveTo(tr.x, tr.foot);
    ctx.lineTo(tr.x + tr.rx * 0.05, tr.y + tr.ry * 0.7);
  }
  ctx.stroke();
  for (const tr of list) {
    const ls = lobes(tr);
    ctx.fillStyle = t.shade;
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      ctx.moveTo(x + rx, y);
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // The mid tone up and to the left (the sun behind the eye, a little to its left).
    ctx.fillStyle = t.graze;
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      const cx = x - rx * 0.16;
      const cy = y + ry * 0.16;
      ctx.moveTo(cx + rx * 0.72, cy);
      ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // The lit rim: crescents on the upper left of the lobes facing the sun.
    ctx.fillStyle = rgba(t.lit, 0.9);
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      if (y < tr.y + tr.ry * 0.9) continue;
      const cx = x - rx * 0.34;
      const cy = y + ry * 0.34;
      ctx.moveTo(cx + rx * 0.4, cy);
      ctx.ellipse(cx, cy, rx * 0.4, ry * 0.36, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  // The crowns and their trunks hide the lights behind them (paint/lights.ts): the shade masses (the rest lie inside them).
  const book = lightBook(c);
  if (book) {
    const sh = new Shapes();
    const half = c.pen(0.4);
    for (const tr of list) {
      const x1 = tr.x + tr.rx * 0.05;
      const y1 = tr.y + tr.ry * 0.7;
      sh.poly([
        [tr.x - half, tr.foot],
        [tr.x + half, tr.foot],
        [x1 + half, y1],
        [x1 - half, y1],
      ]);
      for (const [x, y, rx, ry] of lobes(tr)) sh.ellipse(x, y, rx, ry);
    }
    book.occlude(sh);
  }
}

export function engraveTrees(
  c: PlateCanvas,
  list: readonly TreeCrown[],
  distance: number,
): void {
  const { ctx } = c;
  const pen = penAt(distance);
  strokeLines(
    c,
    list.map((tr) => [
      [tr.x, tr.foot],
      [tr.x, tr.y + tr.ry * 0.7],
    ]),
    pen * 0.5,
    INK.line,
    0.8,
  );
  for (const tr of list) {
    const ls = lobes(tr);
    const p = new Path2D();
    for (const [x, y, rx, ry] of ls) {
      p.moveTo(x + rx, y);
      p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    // Short curved strokes on each lobe's shaded lower right, following its form.
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      for (let k = 0; k < 3; k++) {
        const r = 0.55 + k * 0.17;
        ctx.moveTo(x + Math.cos(-0.2) * rx * r, y + Math.sin(-0.2) * ry * r);
        ctx.ellipse(x, y, rx * r, ry * r, 0, -0.2, -1.6, true);
      }
    }
    ctx.strokeStyle = rgba(INK.hatch, 0.8);
    ctx.lineWidth = c.pen(pen * 0.4);
    ctx.stroke();
    // The crown's edge: the upper lobes' arcs only (a scalloped line), never a closed ring.
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      ctx.moveTo(x + Math.cos(0.3) * rx, y + Math.sin(0.3) * ry);
      ctx.ellipse(x, y, rx, ry, 0, 0.3, Math.PI - 0.2);
    }
    ctx.strokeStyle = rgba(INK.line, 0.85);
    ctx.lineWidth = c.pen(pen * 0.6);
    ctx.stroke();
  }
}

/**
 * The spire's three facets seen, each a triangle from the octagon's
 * cornice to the point: left (grazed by the sun), middle, right (shade).
 */
function spireFacets(): { base: [number, number]; apex: Pt; bell: number }[] {
  const o = upper().octagon;
  const apex: Pt = [o.x, o.y1 + o.spire];
  // The spire's foot a little inside the cornice, with a short bell-cast.
  const xs = [
    o.x - o.r * 0.62,
    o.x - o.r * 0.24,
    o.x + o.r * 0.24,
    o.x + o.r * 0.62,
  ];
  return [0, 1, 2].map((i) => ({
    base: [xs[i], xs[i + 1]],
    apex,
    bell: o.spire * 0.07,
  }));
}

/** The belfry's octagonal stage and its slender spire, and the telegraph on the point. */
export function paintBelfryTop(c: PlateCanvas): void {
  const { ctx } = c;
  const u = upper();
  const o = u.octagon;
  const d = 2533;
  const tone = airTone(STONE, d);
  // Three facets seen: the left grazed, the middle square to the sun's quarter, the right in shade.
  const xs = [o.x - o.r, o.x - o.r * 0.41, o.x + o.r * 0.41, o.x + o.r];
  const fs = [0.62, 0.95, 0.3];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = toneAt(tone, fs[i]);
    ctx.fillRect(xs[i], o.y0, xs[i + 1] - xs[i] + 0.04, o.y1 - o.y0);
    // A tall opening in each facet.
    const w = (xs[i + 1] - xs[i]) * 0.36;
    ctx.fillStyle = townAir(i === 2 ? "#3f3a40" : "#4b4448", d);
    ctx.fillRect(
      (xs[i] + xs[i + 1]) / 2 - w / 2,
      o.y0 + (o.y1 - o.y0) * 0.28,
      w,
      (o.y1 - o.y0) * 0.48,
    );
  }
  // The cornice, then the slender lead spire: three facets to the point,
  // the left one grazed by the low sun, the middle lit, the right in shade.
  ctx.fillStyle = toneAt(tone, 0.85);
  ctx.fillRect(o.x - o.r * 1.08, o.y1 - 0.3, o.r * 2.16, 0.35);
  const lead = airTone(ROOFS.slateDark, d);
  const faces = [lead.graze, lead.lit, lead.shade];
  spireFacets().forEach((f, i) => {
    ctx.fillStyle = faces[i];
    ctx.beginPath();
    ctx.moveTo(f.base[0] - (i === 0 ? f.bell * 0.6 : 0), o.y1);
    ctx.lineTo(f.base[0], o.y1 + f.bell);
    ctx.lineTo(f.apex[0], f.apex[1]);
    ctx.lineTo(f.base[1], o.y1 + f.bell);
    ctx.lineTo(f.base[1] + (i === 2 ? f.bell * 0.6 : 0), o.y1);
    ctx.closePath();
    ctx.fill();
  });
  // The sun's thin line down the spire's lit arris.
  const arris = spireFacets()[1];
  strokeLines(
    c,
    [
      [
        [arris.base[0] + 0.05, o.y1 + arris.bell],
        [arris.apex[0] - 0.02, arris.apex[1] - 0.2],
      ],
    ],
    0.35,
    townAir("#d9b783", d),
    0.55,
  );
  telegraphLines(c, "colour");
  // The octagon and the spire hide the lights behind them (paint/lights.ts).
  const book = lightBook(c);
  if (book) {
    const sh = new Shapes().rect(
      xs[0],
      o.y0,
      xs[3] - xs[0] + 0.04,
      o.y1 - o.y0,
    );
    sh.rect(o.x - o.r * 1.08, o.y1 - 0.3, o.r * 2.16, 0.35);
    const f = spireFacets();
    sh.poly([
      [f[0].base[0] - f[0].bell * 0.6, o.y1],
      [f[2].base[1] + f[2].bell * 0.6, o.y1],
      f[0].apex,
    ]);
    book.occlude(sh);
  }
}

function telegraphParts(): { mast: Pt[]; reg: Pt[]; arms: Pt[][] } {
  const t = upper().telegraph;
  const head = t.y1 - t.arm * 0.15;
  // The regulator a little off level; the indicators at a signal's angles.
  const tilt = 0.14;
  const a: Pt = [t.x - t.reg, head - t.reg * tilt];
  const b: Pt = [t.x + t.reg, head + t.reg * tilt];
  return {
    mast: [
      [t.x, t.y0],
      [t.x, t.y1],
    ],
    reg: [a, b],
    arms: [
      [a, [a[0] - t.arm * 0.35, a[1] + t.arm * 0.94]],
      [b, [b[0] + t.arm * 0.72, b[1] - t.arm * 0.7]],
    ],
  };
}

function telegraphLines(c: PlateCanvas, mode: "colour" | "ink"): void {
  const p = telegraphParts();
  const dark = mode === "colour" ? townAir("#2f2a2c", 2533) : INK.line;
  strokeLines(c, [p.mast], 0.9, dark, 0.95);
  strokeLines(c, [p.reg], 1.15, dark, 1);
  strokeLines(c, p.arms, 1, dark, 1);
  if (mode === "colour") {
    // The low sun on the beams' west faces.
    strokeLines(
      c,
      [p.mast, p.reg].map((l) => l.map(([x, y]) => [x - 0.12, y + 0.12] as Pt)),
      0.45,
      townAir("#d9b783", 2533),
      0.6,
    );
  }
}

export function engraveBelfryTop(c: PlateCanvas): void {
  const { ctx } = c;
  const o = upper().octagon;
  const pen = penAt(2533);
  ctx.fillStyle = PAPER.low;
  ctx.fillRect(o.x - o.r, o.y0, o.r * 2, o.y1 - o.y0);
  const facets = spireFacets();
  const left = facets[0];
  const right = facets[2];
  const cap = new Path2D();
  cap.moveTo(left.base[0] - left.bell * 0.6, o.y1);
  cap.lineTo(left.base[0], o.y1 + left.bell);
  cap.lineTo(left.apex[0], left.apex[1]);
  cap.lineTo(right.base[1], o.y1 + right.bell);
  cap.lineTo(right.base[1] + right.bell * 0.6, o.y1);
  cap.closePath();
  ctx.fill(cap);
  const lines: Pt[][] = [];
  for (let x = o.x + o.r * 0.45; x < o.x + o.r; x += c.pen(1.3))
    lines.push([
      [x, o.y0],
      [x, o.y1],
    ]);
  for (let x = o.x - o.r + c.pen(1); x < o.x - o.r * 0.42; x += c.pen(2.2))
    lines.push([
      [x, o.y0],
      [x, o.y1],
    ]);
  // The spire's shaded facet hatched along its slope, toward the point.
  for (let x = right.base[0]; x < right.base[1]; x += c.pen(1.1)) {
    const k = (x - right.base[0]) / (right.base[1] - right.base[0]);
    lines.push([
      [x, o.y1 + right.bell * k],
      [
        right.apex[0] + (x - right.apex[0]) * 0.12,
        right.apex[1] - o.spire * 0.12,
      ],
    ]);
  }
  strokeLines(c, lines, pen * 0.4, INK.hatch, 0.85);
  ctx.fillStyle = rgba(INK.line, 0.9);
  const xs = [o.x - o.r, o.x - o.r * 0.41, o.x + o.r * 0.41, o.x + o.r];
  for (let i = 0; i < 3; i++) {
    const w = (xs[i + 1] - xs[i]) * 0.34;
    ctx.fillRect(
      (xs[i] + xs[i + 1]) / 2 - w / 2,
      o.y0 + (o.y1 - o.y0) * 0.28,
      w,
      (o.y1 - o.y0) * 0.48,
    );
  }
  ctx.strokeStyle = INK.line;
  ctx.lineWidth = c.pen(pen * 0.8);
  ctx.beginPath();
  ctx.moveTo(o.x - o.r, o.y0);
  ctx.lineTo(o.x - o.r, o.y1);
  ctx.moveTo(o.x + o.r, o.y0);
  ctx.lineTo(o.x + o.r, o.y1);
  ctx.moveTo(o.x - o.r * 0.41, o.y0);
  ctx.lineTo(o.x - o.r * 0.41, o.y1);
  ctx.moveTo(o.x + o.r * 0.41, o.y0);
  ctx.lineTo(o.x + o.r * 0.41, o.y1);
  ctx.stroke();
  ctx.stroke(cap);
  telegraphLines(c, "ink");
}
