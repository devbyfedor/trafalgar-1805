import { createRng, mix, type Pt } from "../../paint/kit";
import {
  INK,
  PAPER,
  type PaintMode,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { BUILD, project, VEX, viewOf } from "../../scene";
import {
  addLine,
  air,
  band,
  engraveHuts,
  fill,
  flag,
  type Hut,
  paintFlag,
  paintHuts,
  poly,
  SHORE,
  stroke,
} from "./draw";
import {
  browGround,
  buildFace,
  carveFace,
  edgeFace,
  type Face,
  faceColourJobs,
  faceInkJobs,
  lineFace,
  pointFace,
  shapeFace,
} from "./face";
import { hull, lamp, lightSeed, occlude, opening, union } from "./lit";
import { edgeAt, northUp, shoreAt, smoothstep } from "./terrain";

/**
 * The cliffs north of the harbour, from the high-water line to their
 * broken brow (shore/face.ts), with what stands on the edge: the
 * batteries, Napoleon's pavilion with the admiral's and the signal mast
 * between them, Soult's and Decrès's huts, flagstaffs.
 */

const AHEAD = 1350;

export function cliffsPlate(o: {
  id: string;
  depth: number;
  box: Plate["box"];
}): Plate {
  // The face's geometry is built in six jobs, so none is long; any job
  // that needs it finishes what is left.
  let face: Face | undefined;
  let stage = 0;
  const stages: ((f: Face) => void)[] = [
    carveFace,
    shapeFace,
    (f) => pointFace(f, 0, 5),
    (f) => pointFace(f, 5, f.bh.length),
    lineFace,
    edgeFace,
  ];
  const step = () => {
    if (!face) face = buildFace();
    else if (stage < stages.length) stages[stage++](face);
    return face;
  };
  const get = () => {
    let f = step();
    while (stage < stages.length) f = step();
    return f;
  };
  const colour: PlateJob[] = [
    ...Array.from({ length: stages.length + 1 }, () => () => {
      step();
    }),
    ...faceColourJobs(get),
    (c) => paintBlocks(c, "colour"),
    (c) => paintEdgeWorks(c, get(), "colour"),
  ];
  const ink: PlateJob[] = [
    ...faceInkJobs(get),
    (c) => paintBlocks(c, "ink"),
    (c) => paintEdgeWorks(c, get(), "ink"),
  ];
  return {
    id: o.id,
    depth: o.depth,
    box: o.box,
    group: "land",
    jobs(mode: PaintMode) {
      return mode === "colour" ? colour : ink;
    },
  };
}

// ------------------------------------------------------------ the foot

function paintBlocks(c: PlateCanvas, mode: PaintMode): void {
  const rng = createRng(381);
  const blocks: { pts: Pt[]; lit: Pt[]; tower: boolean }[] = [];
  const add = (n: number, e: number, size: number, tower: boolean) => {
    const base = project(e, n, 1.2 * VEX);
    const u = 1000 / viewOf(e, n)[0];
    const w = size * u * (0.8 + rng() * 0.6);
    const h = size * u * (tower ? 0.9 : 0.55 + rng() * 0.4);
    const sk = (rng() - 0.5) * w * 0.4;
    const pts: Pt[] = tower
      ? [
          [base[0] - w, base[1]],
          [base[0] + w, base[1]],
          [base[0] + w * 0.95 + sk * 0.2, base[1] + h],
          [base[0] - w * 0.9, base[1] + h * (0.9 + rng() * 0.2)],
        ]
      : [
          [base[0] - w, base[1]],
          [base[0] + w, base[1]],
          [base[0] + w * 0.8 + sk, base[1] + h * 0.8],
          [base[0] + sk * 0.3, base[1] + h],
          [base[0] - w * 0.7 + sk, base[1] + h * 0.85],
        ];
    const lit: Pt[] = [
      pts[0],
      [base[0] + w * 0.3, base[1]],
      [base[0] + w * 0.25 + sk * 0.5, base[1] + h * 0.92],
      pts[pts.length - 1],
    ];
    blocks.push({ pts, lit, tower });
  };
  for (let n = 1450; n > 150; n -= 8 + rng() * 30) {
    const [e] = edgeAt(n);
    add(n, e - 46 - rng() * 14, (1.2 + rng() * 3.2) * VEX, false);
  }
  // The old tower's masonry, fallen in 1644, on the beach under its site.
  for (let k = 0; k < 9; k++) {
    const n = 175 + rng() * 70;
    add(n, shoreAt(n) + 20 + rng() * 40, (2 + rng() * 2.6) * VEX, true);
  }
  blocks.sort((a, b) => b.pts[0][1] - a.pts[0][1]);
  for (const b of blocks) {
    if (mode === "colour") {
      fill(
        c,
        poly(b.pts),
        air(b.tower ? mix(SHORE.chalk, SHORE.clay, 0.4) : SHORE.talus, AHEAD),
      );
      fill(
        c,
        poly(b.lit),
        air(b.tower ? SHORE.chalk : SHORE.block, AHEAD),
        0.8,
      );
      const sh = new Path2D();
      sh.moveTo(b.pts[0][0] - 0.4, b.pts[0][1] - 0.15);
      sh.lineTo(b.pts[1][0] + 0.8, b.pts[1][1] - 0.15);
      stroke(c, sh, 0.9, air(SHORE.shadeDeep, AHEAD), 0.45);
      if (b.tower) {
        const course = new Path2D();
        const [p0, p1] = [b.pts[0], b.pts[1]];
        const top = b.pts[2][1];
        for (let y = p0[1] + 1; y < top; y += 1.1) {
          course.moveTo(p0[0] + 0.2, y);
          course.lineTo(p1[0] - 0.2, y);
        }
        stroke(c, course, 0.4, air(SHORE.seam, AHEAD), 0.4);
      }
    } else {
      fill(c, poly(b.pts), PAPER.low);
      const o = new Path2D();
      addLine(o, [...b.pts.slice(1), b.pts[0]]);
      stroke(c, o, 0.7, INK.line, 0.75);
      const h = new Path2D();
      const r = b.pts[1];
      const t = b.pts[2];
      for (let k = 1; k <= 3; k++) {
        const s = k / 4;
        h.moveTo(r[0] - (r[0] - b.lit[1][0]) * s, r[1]);
        h.lineTo(t[0] - (t[0] - b.lit[2][0]) * s, t[1] - 0.2);
      }
      stroke(c, h, 0.45, INK.hatch, 0.7);
    }
  }
}

// ------------------------------------------------------------ the edge

interface Battery {
  n0: number;
  n1: number;
  guns: number;
}

const BATTERIES: readonly Battery[] = [
  { n0: 360, n1: 470, guns: 12 },
  { n0: 610, n1: 665, guns: 5 },
  { n0: 830, n1: 880, guns: 5 },
  { n0: 1060, n1: 1110, guns: 4 },
  { n0: 1320, n1: 1370, guns: 4 },
];

/**
 * A battery: a low earth parapet built level, set 15–25 m back from the
 * brow so a strip of grass lies between, its face toward the sea in the
 * sun; embrasures cut as notches into its top; a row of gabions along
 * its crest; its flag. From the roads the history's "low red-brown
 * blocks" (Lewis): a gun's muzzle at 1.35 km is under a pixel, and the
 * mortars behind the parapet do not show.
 */
function battery(c: PlateCanvas, g: Face, b: Battery, mode: PaintMode): void {
  const back = 15 + ((b.n0 * 7) % 11);
  // Level: the mean of the ground along it.
  let sum = 0;
  let count = 0;
  for (let n = b.n0; n <= b.n1; n += 4) {
    sum += browGround(g, n, back).h;
    count++;
  }
  const level = (sum / count) * VEX;
  const height = 2.2 * BUILD;
  const guns: number[] = [];
  for (let k = 0; k < b.guns; k++)
    guns.push(b.n1 - ((k + 0.5) * (b.n1 - b.n0)) / b.guns);
  const top: Pt[] = [];
  const base: Pt[] = [];
  const cheeks = new Path2D();
  for (let n = b.n1; n >= b.n0 - 1e-6; n -= 0.8) {
    const gr = browGround(g, n, back);
    // An embrasure: a notch with sloping cheeks at each gun.
    let cut = 0;
    for (const gn of guns) {
      const u = Math.abs(n - gn);
      cut = Math.max(cut, 1 - smoothstep(0.9, 1.9, u));
    }
    top.push(project(gr.e, n, level + height - cut * 0.85 * BUILD));
    base.push(project(gr.e - 2, n, Math.min(level, gr.h * VEX) - 0.4));
  }
  for (const gn of guns) {
    const gr = browGround(g, gn, back);
    const a = project(gr.e, gn + 1.3, level + height - 0.85 * BUILD);
    const z = project(gr.e, gn - 1.3, level + height - 0.85 * BUILD);
    const d = project(gr.e, gn, level + height - 1.35 * BUILD);
    addLine(cheeks, [a, z, d], true);
  }
  const ahead = viewOf(browGround(g, b.n0, back).e, b.n0)[0];
  const fl = browGround(g, b.n0 - 6, back + 4);
  const foot = project(fl.e, b.n0 - 6, level);
  const f = flag(foot[0], foot[1], 12 * BUILD * (1000 / ahead), 2.4);
  const body = band(top, base);
  const gab = new Path2D();
  const gabLit = new Path2D();
  const unit = c.pen(1);
  for (let k = 0; k < top.length; k += 2) {
    const p = top[k];
    gab.moveTo(p[0], p[1] - 0.05);
    gab.lineTo(p[0], p[1] - 0.6);
    gabLit.moveTo(p[0] - 0.45 * unit, p[1] - 0.05);
    gabLit.lineTo(p[0] - 0.45 * unit, p[1] - 0.5);
  }
  if (mode === "colour") {
    const earth = mix(mix(SHORE.earthLit, SHORE.turf, 0.3), PALETTE_HAZE, 0.12);
    fill(c, body, air(earth, ahead));
    // The berm at its foot, a little darker: earth thrown up, trodden.
    const berm = band(
      base.map(([x, y]) => [x, y + 0.7] as Pt),
      base,
    );
    fill(c, berm, air(mix(SHORE.earth, SHORE.turf, 0.4), ahead), 0.8);
    fill(c, cheeks, air(mix(SHORE.earth, SHORE.shadeDeep, 0.55), ahead));
    stroke(
      c,
      gab,
      0.6,
      air(mix(SHORE.gabion, SHORE.shadeDeep, 0.3), ahead),
      0.85,
    );
    stroke(
      c,
      gabLit,
      0.45,
      air(mix(SHORE.earthLit, "#f0d9a8", 0.4), ahead),
      0.7,
    );
  } else {
    fill(c, body, PAPER.low);
    const l = new Path2D();
    addLine(l, top);
    stroke(c, l, 0.85, INK.line, 0.85);
    stroke(c, cheeks, 0.5, INK.line, 0.8);
    stroke(c, gab, 0.45, INK.hatch, 0.75);
    const lb = new Path2D();
    addLine(lb, base);
    stroke(c, lb, 0.45, INK.hatch, 0.6);
  }
  paintFlag(c, f, ahead, mode);
}

const PALETTE_HAZE = "#c3b8bc";

function paintEdgeWorks(c: PlateCanvas, g: Face, mode: PaintMode): void {
  const colourMode = mode === "colour";
  const rng = createRng(391);
  for (const b of BATTERIES) battery(c, g, b, mode);
  // The Tour d'Odre's group: Napoleon's pavilion (its rotunda to the west,
  // toward the roads), the signal mast, the admiral's smaller copy;
  // Soult's and Decrès's huts thatched to the ground.
  bastions(c, g, mode);
  pavilion(c, g, 205, 14, 32.5, 9.7, 7.3, mode, true);
  signalMast(c, g, 258, 16, mode);
  pavilion(c, g, 305, 22, 22, 7, 5.5, mode, false);
  const huts: Hut[] = [];
  for (const [n, back, kind, l, w, ridge] of [
    [236, 70, 3, 9, 5, 8],
    [285, 92, 3, 0, 6, 15],
  ] as const) {
    const gr = browGround(g, n, back);
    huts.push({
      e: gr.e,
      n,
      g: Math.max(gr.h * VEX, northUp(n, back)) + 0.5,
      l,
      w,
      wall: 0,
      ridge,
      kind,
      age: 0.3 + rng() * 0.3,
      white: false,
    });
  }
  if (colourMode) paintHuts(c, huts);
  else engraveHuts(c, huts);
}

/**
 * The ruined English bastions of 1544 round the Tour d'Odre's site, in
 * which the pavilion stands (history-notes, "Napoleon's pavilion"):
 * low stumps of red brick along an angular trace, broken, their faces
 * toward the roads in the sun.
 */
function bastions(c: PlateCanvas, g: Face, mode: PaintMode): void {
  const rng = createRng(397);
  // The trace: a five-sided work round the site, metres north and back from the brow.
  const trace: [number, number][] = [
    [262, 8],
    [228, 4],
    [176, 10],
    [160, 46],
    [196, 78],
    [250, 66],
    [262, 8],
  ];
  const faces = new Path2D();
  const tops = new Path2D();
  let ahead = 1400;
  for (let k = 0; k < trace.length - 1; k++) {
    const [n0, b0] = trace[k];
    const [n1, b1] = trace[k + 1];
    const len = Math.hypot(n1 - n0, b1 - b0);
    // A few stumps along each side, gaps where the brick has gone.
    for (let t = rng() * 0.2; t < 1; t += (5 + rng() * 9) / len) {
      if (rng() < 0.5) continue;
      const t1 = Math.min(1, t + (3 + rng() * 7) / len);
      const h = (0.6 + rng() * 1.2) * BUILD;
      const pts: Pt[] = [];
      const top: Pt[] = [];
      for (const u of [t, t1]) {
        const n = n0 + (n1 - n0) * u;
        const gr = browGround(g, n, b0 + (b1 - b0) * u);
        ahead = viewOf(gr.e, n)[0];
        pts.push(project(gr.e, n, gr.h * VEX));
        top.push(project(gr.e, n, gr.h * VEX + h * (0.7 + rng() * 0.3)));
      }
      addLine(faces, [pts[0], pts[1], top[1], top[0]], true);
      addLine(tops, top);
    }
  }
  if (mode === "colour") {
    fill(c, faces, air("#8a6453", ahead));
    stroke(c, tops, 0.6, air("#bf9a7e", ahead), 0.7);
  } else {
    fill(c, faces, PAPER.low);
    stroke(c, faces, 0.55, INK.line, 0.8);
  }
}

/**
 * A pavilion of grey-white planks seen almost end-on, as it stood (its
 * long axis about east-west, history-notes "Which way it faced"): the
 * rotunda at the west end toward the roads, a drum and its low cone lit
 * full by the sun behind the eye, its turned side cool; the body behind
 * showing only as a short ridge; the paling round its mound.
 */
function pavilion(
  c: PlateCanvas,
  g: Face,
  n: number,
  back: number,
  length: number,
  rotunda: number,
  width: number,
  mode: PaintMode,
  lamps: boolean,
): void {
  const gr = browGround(g, n, back);
  const e0 = gr.e;
  const ground = gr.h * VEX + 1.5 * VEX;
  const half = (width * BUILD) / 2;
  const wall = 4 * BUILD;
  const roofUp = 2.2 * BUILD;
  const r = (rotunda * BUILD) / 2;
  const L = length * BUILD;
  // East along the axis, north across it.
  const P = (along: number, side: number, up: number): Pt =>
    project(e0 + along, n + side, ground + up);
  const ahead = viewOf(e0, n)[0];
  // The body's south side, toward the eye, at a glancing angle; its roof.
  const side: Pt[] = [
    P(r * 0.5, -half, 0),
    P(L, -half, 0),
    P(L, -half, wall),
    P(r * 0.5, -half, wall),
  ];
  const roof: Pt[] = [
    P(r * 0.4, -half - 0.6, wall),
    P(L + 0.6, -half - 0.6, wall),
    P(L, 0, wall + roofUp),
    P(r * 0.5, 0, wall + roofUp),
  ];
  // The rotunda: a drum and its low cone, toward the roads.
  const [cx, cy] = P(0, 0, 0);
  const rw = r * (1000 / ahead);
  const topY = P(0, 0, wall)[1];
  const apex = P(0, 0, wall + roofUp * 1.5)[1];
  const drum: Pt[] = [
    [cx - rw, cy],
    [cx + rw, cy],
    [cx + rw, topY],
    [cx - rw, topY],
  ];
  const cone: Pt[] = [
    [cx - rw * 1.08, topY],
    [cx + rw * 1.08, topY],
    [cx, apex],
  ];
  // The mound and the paling round it.
  const mound: Pt[] = [];
  const pal: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI * (k / 16);
    const p = project(
      e0 + Math.cos(a) * 26 + 6,
      n + Math.sin(a - Math.PI / 2) * -26,
      ground - 1.5 * VEX + Math.sin(a) * 1.5 * VEX,
    );
    mound.push(p);
    pal.push([p[0], p[1] + 0.05]);
  }
  if (mode === "colour") {
    const lit = mix(SHORE.pale, "#e8d6b4", 0.5);
    fill(c, poly(mound), air(mix(SHORE.turfLit, SHORE.turf, 0.4), ahead));
    fill(c, poly(side), air(mix(SHORE.paleShade, lit, 0.25), ahead));
    fill(c, poly(roof), air(SHORE.slate, ahead));
    const gd = c.ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
    gd.addColorStop(0, air(mix(lit, SHORE.pale, 0.2), ahead));
    gd.addColorStop(0.45, air(lit, ahead));
    gd.addColorStop(0.8, air(mix(lit, SHORE.paleShade, 0.6), ahead));
    gd.addColorStop(1, air(SHORE.paleShade, ahead));
    fill(c, poly(drum), gd);
    fill(c, poly(cone), air(mix(SHORE.slate, "#c9b9a0", 0.3), ahead));
    const win = new Path2D();
    for (let k = -1; k <= 2; k++) {
      const x = cx + (rw * k) / 2.6 - rw * 0.12;
      win.moveTo(x, cy + (topY - cy) * 0.35);
      win.lineTo(x, cy + (topY - cy) * 0.72);
    }
    stroke(c, win, 0.8, air("#5f5a57", ahead), 0.7);
    const fence = new Path2D();
    for (let k = 0; k < pal.length; k += 1) {
      fence.moveTo(pal[k][0], pal[k][1]);
      fence.lineTo(pal[k][0], pal[k][1] + 1);
    }
    addLine(
      fence,
      pal.map(([x, y]) => [x, y + 0.8] as Pt),
    );
    stroke(c, fence, 0.5, air(SHORE.wood, ahead), 0.7);
    if (!c.lights) return;
    // The lights at dusk (lit.ts), in paint order: the pavilion hides
    // what lies behind it; then the windows of its body's side, the
    // rotunda over them; the rotunda's windows; the lamps along the
    // paling, in front of all of it.
    occlude(c, hull([...mound, ...side, ...roof, ...drum, ...cone]));
    const seed = (k: number) => lightSeed(e0, n, k);
    // The Emperor was at Boulogne from 3 August 1805: his pavilion's
    // windows lit more than a hut's (a licence: whether he worked there
    // in the evening is not recorded).
    const litShare = lamps ? 0.7 : undefined;
    const span = L - r * 0.5;
    const count = Math.max(2, Math.round(span / (3.5 * BUILD)));
    for (let k = 0; k < count; k++) {
      const a = r * 0.5 + ((k + 0.5) * span) / count;
      const hw = 0.5 * BUILD;
      opening(
        c,
        "window",
        [
          P(a - hw, -half, 0.9 * BUILD),
          P(a + hw, -half, 0.9 * BUILD),
          P(a + hw, -half, 2.7 * BUILD),
          P(a - hw, -half, 2.7 * BUILD),
        ],
        seed(k),
        litShare,
      );
    }
    occlude(c, union([drum, cone]));
    const ww = 0.5 * BUILD * (1000 / ahead);
    for (let k = -1; k <= 2; k++) {
      const x = cx + (rw * k) / 2.6 - rw * 0.12;
      opening(
        c,
        "window",
        [
          [x - ww, cy + (topY - cy) * 0.35],
          [x + ww, cy + (topY - cy) * 0.72],
        ],
        seed(20 + k),
        litShare,
      );
    }
    if (lamps) {
      // Constant: reflector lamps outside the lattice round it, four feet
      // apart (BUILD times, as everything built is drawn), on posts.
      const run = Math.hypot(52, 52);
      const many = Math.round(run / (1.3 * BUILD));
      for (let k = 0; k <= many; k++) {
        const a = Math.acos(1 - (2 * k) / many);
        const p = project(
          e0 + Math.cos(a) * 26 + 6,
          n + Math.sin(a - Math.PI / 2) * -26,
          ground - 1.5 * VEX + Math.sin(a) * 1.5 * VEX,
        );
        lamp(c, p[0], p[1] + 1.05, 0.3, seed(40 + k));
      }
    }
    return;
  }
  for (const p of [mound, side, roof, drum, cone]) fill(c, poly(p), PAPER.low);
  const l = new Path2D();
  addLine(l, [side[1], side[2], roof[2], roof[3]]);
  addLine(l, [drum[0], drum[3], cone[0], cone[2], cone[1], drum[2], drum[1]]);
  stroke(c, l, 0.9, INK.line, 0.9);
  const h = new Path2D();
  for (let k = 1; k <= 3; k++) {
    const x = cx + rw * (0.3 + k * 0.2);
    h.moveTo(x, cy);
    h.lineTo(x, topY);
  }
  stroke(c, h, 0.5, INK.hatch, 0.8);
  const fence = new Path2D();
  for (let k = 0; k < pal.length; k += 2) {
    fence.moveTo(pal[k][0], pal[k][1]);
    fence.lineTo(pal[k][0], pal[k][1] + 1);
  }
  stroke(c, fence, 0.5, INK.hatch, 0.7);
}

/**
 * The signal mast by the pavilion: a tall flagstaff with a topmast and
 * two yards for the hoists (history-notes: a signal mast with yards,
 * no semaphore arms before 1806), stayed to the ground; the hoists on
 * their halyards lifting a little to the left in the westerly air.
 */
function signalMast(
  c: PlateCanvas,
  g: Face,
  n: number,
  back: number,
  mode: PaintMode,
): void {
  const gr = browGround(g, n, back);
  const e = gr.e;
  const ground = gr.h * VEX;
  const ahead = viewOf(e, n)[0];
  const u = 1000 / ahead;
  const foot = project(e, n, ground);
  const head = project(e, n, ground + 22 * BUILD);
  const truck = project(e, n, ground + 28 * BUILD);
  const yard1 = project(e, n, ground + 17 * BUILD)[1];
  const yard2 = project(e, n, ground + 24 * BUILD)[1];
  const half1 = 6.5 * BUILD * u;
  const half2 = 4 * BUILD * u;
  const mast = new Path2D();
  mast.moveTo(foot[0], foot[1]);
  mast.lineTo(head[0], head[1]);
  const top = new Path2D();
  top.moveTo(head[0], head[1] - 0.5);
  top.lineTo(truck[0], truck[1]);
  const yards = new Path2D();
  yards.moveTo(head[0] - half1, yard1);
  yards.lineTo(head[0] + half1, yard1);
  yards.moveTo(head[0] - half2, yard2);
  yards.lineTo(head[0] + half2, yard2);
  const stays = new Path2D();
  stays.moveTo(head[0], head[1] - 1);
  stays.lineTo(foot[0] - half1 * 0.9, foot[1]);
  stays.moveTo(head[0], head[1] - 1);
  stays.lineTo(foot[0] + half1 * 0.8, foot[1]);
  // Hoists: flags one under another on a halyard from each yardarm.
  const hoists: { x: number; y: number; col: string }[] = [];
  const cols = [SHORE.blue, SHORE.white, SHORE.red, "#d8b04a"];
  const halyards = new Path2D();
  const arms: [number, number, number][] = [
    [head[0] - half1 * 0.9, yard1, 3],
    [head[0] + half1 * 0.9, yard1, 2],
    [head[0] - half2 * 0.9, yard2, 2],
  ];
  arms.forEach(([x, y, count], a) => {
    halyards.moveTo(x, y);
    halyards.lineTo(x - 0.4, y - count * 2.4 - 0.6);
    for (let k = 0; k < count; k++)
      hoists.push({
        x: x - 0.15 - k * 0.12,
        y: y - 0.4 - k * 2.4,
        col: cols[(a * 2 + k) % cols.length],
      });
  });
  const flagPath = (h: { x: number; y: number }): Pt[] => [
    [h.x, h.y],
    [h.x - 1.9, h.y + 0.15],
    [h.x - 1.9, h.y - 1.55],
    [h.x, h.y - 1.7],
  ];
  if (mode === "colour") {
    stroke(c, stays, 0.5, air(SHORE.wood, ahead), 0.55);
    stroke(c, halyards, 0.4, air(SHORE.wood, ahead), 0.6);
    stroke(c, mast, 1.4, air(SHORE.wood, ahead));
    stroke(c, top, 0.9, air(SHORE.wood, ahead));
    stroke(c, yards, 1, air(SHORE.wood, ahead));
    for (const h of hoists) fill(c, poly(flagPath(h)), air(h.col, ahead));
    return;
  }
  stroke(c, stays, 0.45, INK.hatch, 0.7);
  stroke(c, halyards, 0.4, INK.hatch, 0.7);
  stroke(c, mast, 1.1, INK.line, 0.95);
  stroke(c, top, 0.8, INK.line, 0.95);
  stroke(c, yards, 0.9, INK.line, 0.95);
  for (const h of hoists) {
    fill(c, poly(flagPath(h)), PAPER.low);
    const o = new Path2D();
    addLine(o, flagPath(h), true);
    stroke(c, o, 0.5, INK.line, 0.85);
  }
}
