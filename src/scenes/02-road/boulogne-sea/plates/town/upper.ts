import { PLACES, RAMPART_HEIGHT, RAMPARTS, TOWN_GROUND } from "../../geo";
import { createRng, mix, type Pt, rgba, softBlob } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { BUILD, project, VEX, viewOf } from "../../scene";
import {
  airTone,
  type Building,
  build,
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
  penAt,
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
}

export interface TreeCrown {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
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
): Tower {
  const p = lerp(a, b, t);
  const [ahead] = viewOf(p[0], p[1]);
  const u = 1000 / ahead;
  const [x, y0] = P(p, FOOT - 3);
  const [, y1] = P(p, TOP + extra);
  return { x, y0, y1, r: radius * BUILD * u, distance: ahead };
}

export function upper(): Upper {
  if (cache) return cache;
  const nw = face(N, W);
  const sw = face(W, S);
  const towers: Tower[] = [];
  for (const t of [0.02, 0.19, 0.37, 0.56])
    towers.push(towerAt(N, W, t, 5.2, 1.5));
  towers.push(towerAt(N, W, 0.995, 6.2, 2.5));
  for (const t of [0.42, 0.985]) towers.push(towerAt(W, S, t, 5.2, 1.5));
  // The Porte des Dunes: two round towers flanking the arch, toward the lower town and the harbour.
  const gp = lerp(N, W, 0.78);
  const [gAhead] = viewOf(gp[0], gp[1]);
  const gu = 1000 / gAhead;
  const [gx, gy0] = P(gp, FOOT - 2);
  const [, gy1] = P(gp, TOP + 3 * BUILD);
  const gate = {
    x: gx,
    y0: gy0,
    y1: gy1,
    r: 4 * BUILD * gu,
    arch: 3.6 * BUILD * gu,
    towers: [towerAt(N, W, 0.745, 4.6, 4.5), towerAt(N, W, 0.815, 4.6, 4.5)],
  };
  // The double row of trees on the ramparts' walk.
  const rng = createRng(911);
  const trees: TreeCrown[] = [];
  const cx = (W[0] + E[0]) / 2;
  const cn = (W[1] + E[1]) / 2;
  const row = (a: Pt, b: Pt, inset: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 8; s < len - 6; s += 8 + rng() * 5) {
      if (rng() < 0.08) continue;
      const [e0, n0] = lerp(a, b, s / len);
      const k = inset / Math.hypot(cx - e0, cn - n0);
      const e = e0 + (cx - e0) * k;
      const n = n0 + (cn - n0) * k;
      const [ahead] = viewOf(e, n);
      const u = 1000 / ahead;
      const [x, y] = P([e, n], TOP - 2);
      const size = 0.85 + rng() * 0.35;
      trees.push({
        x,
        y,
        rx: 5.6 * BUILD * u * 0.5 * size,
        ry: 7.5 * BUILD * u * 0.5 * size,
        seed: Math.floor(rng() * 1e6),
      });
    }
  };
  row(N, W, 22);
  row(W, S, 22);
  row(N, W, 9);
  row(W, S, 9);
  const te = (W[0] - N[0]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  const tn = (W[1] - N[1]) / Math.hypot(W[0] - N[0], W[1] - N[1]);
  // Inward, away from the north-west wall: left of N→W.
  const ie = -tn;
  const in_ = te;
  const [be, bn] = PLACES.belfry;
  // The belfry: the square stone tower (27 m) on the old town hall's roofs, faces square to the town's streets.
  const ground = 52 * VEX;
  const belfry = build({
    e: be - ie * 5 * BUILD,
    n: bn - in_ * 5 * BUILD,
    ground,
    te,
    tn,
    w: 10 * BUILD,
    d: 10 * BUILD,
    h: 27 * BUILD,
    pitch: 0.12,
    ridge: "along",
    hip: true,
    wall: STONE,
    roof: ROOFS.slateDark,
    storeys: 6,
    chimneys: 0,
    seed: 4242,
  });
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
  // The château's round towers at the far (east) corner, barely over the walls.
  const chateau: Tower[] = [-16, -2, 12].map((off) => {
    const p: Pt = [PLACES.chateau[0] + off, PLACES.chateau[1] - off * 0.7];
    const [ahead] = viewOf(p[0], p[1]);
    const u = 1000 / ahead;
    const [x, y0] = P(p, TOWN_GROUND * VEX);
    const [, y1] = P(p, TOWN_GROUND * VEX + 20 * BUILD);
    return { x, y0, y1, r: 5 * BUILD * u, distance: ahead };
  });
  // The slope below the walls and beside them.
  const nwFoot0 = nw.foot[0][0];
  const swFoot1 = sw.foot[sw.foot.length - 1][0];
  const left = groundSkyline(-80, nwFoot0 - 1, 3, 2250, 2750, 18);
  const right = groundSkyline(swFoot1 + 1, 196, 3, 2250, 2850, 18);
  const groundLine: Pt[] = [...left, ...nw.foot, ...sw.foot.slice(1), ...right];
  trees.sort((a, b) => b.y - a.y);
  cache = {
    nw,
    sw,
    towers,
    gate,
    trees,
    belfry,
    octagon,
    telegraph,
    chateau,
    ground: groundLine,
  };
  return cache;
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

/** A round tower's light across its visible half: the sun 16° left of behind. */
function towerStops(t: Tone, distance: number): [number, string][] {
  const tone = airTone(t, distance);
  const out: [number, string][] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    // x from the left limb (k=0) to the right limb (k=1); the face's azimuth offset from the eye's line.
    const phi = Math.asin(1 - 2 * k);
    const f = Math.max(0, Math.cos(phi - (16 * Math.PI) / 180));
    out.push([k, toneAt(tone, f * 0.98)]);
  }
  return out;
}

export function paintTower(
  c: PlateCanvas,
  tw: Tower,
  t: Tone,
  cap: boolean,
): void {
  const { ctx } = c;
  const g = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
  for (const [k, col] of towerStops(t, tw.distance)) g.addColorStop(k, col);
  ctx.fillStyle = g;
  ctx.fillRect(tw.x - tw.r, tw.y0, 2 * tw.r, tw.y1 - tw.y0);
  // Courses, a darker foot, the parapet's lit coping.
  const tone = airTone(t, tw.distance);
  ctx.fillStyle = rgba(tone.shade, 0.35);
  ctx.fillRect(tw.x - tw.r, tw.y0, 2 * tw.r, (tw.y1 - tw.y0) * 0.18);
  ctx.strokeStyle = rgba(tone.shade, 0.22);
  ctx.lineWidth = c.pen(0.5);
  ctx.beginPath();
  for (let y = tw.y0 + 1.1; y < tw.y1 - 0.6; y += 1.15) {
    ctx.moveTo(tw.x - tw.r, y);
    ctx.lineTo(tw.x + tw.r, y);
  }
  ctx.stroke();
  ctx.fillStyle = mix(tone.lit, "#fff1d0", 0.25);
  ctx.fillRect(tw.x - tw.r * 1.04, tw.y1 - 0.45, tw.r * 1.5, 0.45);
  ctx.fillStyle = tone.graze;
  ctx.fillRect(tw.x + tw.r * 0.46, tw.y1 - 0.45, tw.r * 0.58, 0.45);
  if (cap) {
    // A low conical cap of slate.
    const s = airTone(ROOFS.slateDark, tw.distance);
    const cg = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
    cg.addColorStop(0, s.graze);
    cg.addColorStop(0.35, s.lit);
    cg.addColorStop(1, s.shade);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(tw.x - tw.r * 1.08, tw.y1);
    ctx.lineTo(tw.x, tw.y1 + tw.r * 1.5);
    ctx.lineTo(tw.x + tw.r * 1.08, tw.y1);
    ctx.closePath();
    ctx.fill();
  }
}

export function engraveTower(c: PlateCanvas, tw: Tower, cap: boolean): void {
  const { ctx } = c;
  const pen = penAt(tw.distance);
  ctx.fillStyle = PAPER.low;
  ctx.fillRect(tw.x - tw.r, tw.y0, 2 * tw.r, tw.y1 - tw.y0);
  // Hatching closer toward the shaded right limb, following the curve (uprights).
  const lines: Pt[][] = [];
  for (let k = 0.3; k < 1; k += 0.09) {
    const x = tw.x - tw.r + 2 * tw.r * k;
    if (k < 0.62 && Math.floor(k * 100) % 2) continue;
    lines.push([
      [x, tw.y0],
      [x, tw.y1 - 0.3],
    ]);
  }
  strokeLines(c, lines, pen * 0.42, INK.hatch, 0.8);
  // Courses on the lit side, broken.
  const courses: Pt[][] = [];
  for (let y = tw.y0 + 1.6; y < tw.y1 - 0.8; y += 2.2)
    courses.push(
      ...brokenLine(
        [
          [tw.x - tw.r, y],
          [tw.x + tw.r * 0.3, y],
        ],
        2.5,
        1.2,
        Math.floor(y * 31 + tw.x),
      ),
    );
  strokeLines(c, courses, pen * 0.35, INK.hatch, 0.55);
  const outline: Pt[] = [
    [tw.x - tw.r, tw.y0],
    [tw.x - tw.r, tw.y1],
    [tw.x + tw.r, tw.y1],
    [tw.x + tw.r, tw.y0],
  ];
  strokeLines(c, [outline], pen * 0.85, INK.line, 0.95);
  if (cap) {
    const p = new Path2D();
    p.moveTo(tw.x - tw.r * 1.08, tw.y1);
    p.lineTo(tw.x, tw.y1 + tw.r * 1.5);
    p.lineTo(tw.x + tw.r * 1.08, tw.y1);
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    strokeLines(
      c,
      [
        [
          [tw.x + tw.r * 0.2, tw.y1 + tw.r * 1.2],
          [tw.x + tw.r * 0.9, tw.y1 + 0.2],
        ],
        [
          [tw.x + tw.r * 0.45, tw.y1 + tw.r * 0.8],
          [tw.x + tw.r * 0.75, tw.y1 + 0.2],
        ],
      ],
      pen * 0.4,
      INK.hatch,
      0.8,
    );
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen * 0.8);
    ctx.stroke(p);
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

/** The ramparts' faces: courses of dark stone lit gold on the north-west, the south-west in the sky's shade; the ditch's dusk at the foot. */
export function paintWalls(c: PlateCanvas): void {
  const { ctx } = c;
  const u = upper();
  const air = UPPER_DEPTH - 100;
  const tone = airTone(STONE, air);
  for (const f of [u.sw, u.nw]) {
    const p = wallPath(f);
    const lit = sunOn(f.az);
    const col = toneAt(tone, lit);
    const y0 = Math.min(...f.foot.map((q) => q[1]));
    const y1 = Math.max(...f.top.map((q) => q[1]));
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix(col, tone.shade, 0.45));
    g.addColorStop(0.25, mix(col, tone.shade, 0.12));
    g.addColorStop(0.85, col);
    g.addColorStop(1, mix(col, "#fff0cc", 0.12 * lit));
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    // Courses.
    ctx.strokeStyle = rgba(tone.shade, lit > 0.5 ? 0.2 : 0.14);
    ctx.lineWidth = c.pen(0.5);
    ctx.beginPath();
    for (let k = 1; k < 10; k++) {
      const t = k / 10;
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
    for (let i = 0; i < 26; i++) {
      const k = Math.floor(rng() * f.foot.length);
      const x = f.foot[k][0] + rng() * 2;
      const top = f.top[k][1];
      const len = (top - f.foot[k][1]) * (0.2 + rng() * 0.55);
      ctx.fillStyle = rgba(tone.shade, 0.12 + rng() * 0.12);
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
        rng() < 0.5 ? "#6d7258" : tone.shade,
        0.2,
      );
    }
    ctx.restore();
    // The parapet's coping catching the sun.
    strokeLines(c, [f.top], 0.9, mix(col, "#fff2d4", 0.3 * lit), 0.9);
  }
  for (const tw of u.towers) paintTower(c, tw, STONE, false);
  // The Porte des Dunes: its towers taller than the walls, the arch dark between them.
  const gt = u.gate;
  const gtone = airTone(STONE, air);
  ctx.fillStyle = toneAt(gtone, 0.85);
  ctx.fillRect(gt.x - gt.r, gt.y0, gt.r * 2, gt.y1 - gt.y0);
  ctx.fillStyle = rgba(gtone.shade, 0.5);
  ctx.fillRect(gt.x - gt.r, gt.y1 - 0.5, gt.r * 2, 0.5);
  for (const tw of gt.towers) paintTower(c, tw, STONE, true);
  ctx.fillStyle = townAir("#3d3638", air);
  ctx.beginPath();
  const aw = gt.arch * 0.42;
  ctx.moveTo(gt.x - aw, gt.y0);
  ctx.lineTo(gt.x - aw, gt.y0 + gt.arch * 0.75);
  ctx.arc(gt.x, gt.y0 + gt.arch * 0.75, aw, Math.PI, 0, true);
  ctx.lineTo(gt.x + aw, gt.y0);
  ctx.closePath();
  ctx.fill();
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
    if (lit < 0.5) {
      // In shade: close uprights, crossed by the courses.
      for (let i = 0; i < f.foot.length - 1; i++) {
        const a = f.foot[i];
        const b = f.foot[i + 1];
        const ta = f.top[i];
        const span = b[0] - a[0];
        const n = Math.max(1, Math.round(span / c.pen(1.5)));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          lines.push([
            [a[0] + span * t, a[1] + (b[1] - a[1]) * t],
            [a[0] + span * t, ta[1] + (f.top[i + 1][1] - ta[1]) * t],
          ]);
        }
      }
    }
    // The courses: broken, closer toward the foot (the ditch's dusk).
    for (let k = 1; k < 9; k++) {
      const t = (k / 9) ** 1.4;
      const l = f.foot.map(
        (q, i) => [q[0], q[1] + (f.top[i][1] - q[1]) * t] as Pt,
      );
      lines.push(
        ...brokenLine(l, 5 + k, 1.5 + k * 0.3, 300 + k + Math.floor(f.az)),
      );
    }
    strokeLines(c, lines, pen * 0.4, INK.hatch, lit < 0.5 ? 0.85 : 0.65);
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
  for (const tw of u.towers) engraveTower(c, tw, false);
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
  for (const tw of gt.towers) engraveTower(c, tw, true);
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

/** Foliage masses of a crown: a few overlapping lobes, seeded. */
function lobes(t: TreeCrown): [number, number, number, number][] {
  const rng = createRng(t.seed);
  const out: [number, number, number, number][] = [];
  const n = 5 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng() * 0.6;
    const d = 0.35 + rng() * 0.35;
    out.push([
      t.x + Math.cos(a) * t.rx * d,
      t.y + t.ry + Math.sin(a) * t.ry * d * 0.8,
      t.rx * (0.42 + rng() * 0.22),
      t.ry * (0.38 + rng() * 0.2),
    ]);
  }
  return out;
}

const FOLIAGE: Tone = { lit: "#a6a057", graze: "#6f7a4c", shade: "#465545" };

export function paintTrees(
  c: PlateCanvas,
  list: readonly TreeCrown[],
  distance: number,
): void {
  const { ctx } = c;
  const t = airTone(FOLIAGE, distance);
  for (const tr of list) {
    const ls = lobes(tr);
    ctx.fillStyle = t.shade;
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      ctx.moveTo(x + rx, y);
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // The lit side up and to the left (the sun behind the eye, a little to its left).
    ctx.fillStyle = t.graze;
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      ctx.moveTo(x - rx * 0.12 + rx * 0.8, y + ry * 0.12);
      ctx.ellipse(
        x - rx * 0.12,
        y + ry * 0.12,
        rx * 0.8,
        ry * 0.8,
        0,
        0,
        Math.PI * 2,
      );
    }
    ctx.fill();
    ctx.fillStyle = rgba(t.lit, 0.9);
    ctx.beginPath();
    for (const [x, y, rx, ry] of ls) {
      ctx.moveTo(x - rx * 0.3 + rx * 0.48, y + ry * 0.3);
      ctx.ellipse(
        x - rx * 0.3,
        y + ry * 0.3,
        rx * 0.48,
        ry * 0.46,
        0,
        0,
        Math.PI * 2,
      );
    }
    ctx.fill();
  }
}

export function engraveTrees(
  c: PlateCanvas,
  list: readonly TreeCrown[],
  distance: number,
): void {
  const { ctx } = c;
  const pen = penAt(distance);
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
