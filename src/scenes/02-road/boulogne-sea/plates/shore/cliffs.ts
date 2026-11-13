import { createRng, mix, type Pt } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
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
  browAt,
  buildFace,
  type Face,
  faceColourJobs,
  faceE,
  faceInkJobs,
  indexOf,
  lineFace,
  shapeFace,
} from "./face";
import { edgeAt, northUp, shoreAt } from "./terrain";

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
  // The face's geometry is built in three jobs, so none is long; any job
  // that needs it finishes what is left.
  let face: Face | undefined;
  let stage = 0;
  const step = () => {
    face ??= buildFace();
    if (stage === 0) stage = 1;
    else if (stage === 1) {
      shapeFace(face);
      stage = 2;
    } else if (stage === 2) {
      lineFace(face);
      stage = 3;
    }
    return face;
  };
  const get = () => {
    let f = step();
    while (stage < 3) f = step();
    return f;
  };
  const colour: PlateJob[] = [
    () => step(),
    () => step(),
    () => step(),
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
    jobs(mode: PlateMode) {
      return mode === "colour" ? colour : ink;
    },
  };
}

// ------------------------------------------------------------ the foot

function paintBlocks(c: PlateCanvas, mode: PlateMode): void {
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
  mortars?: number;
}

const BATTERIES: readonly Battery[] = [
  { n0: 360, n1: 470, guns: 12, mortars: 6 },
  { n0: 610, n1: 665, guns: 5 },
  { n0: 830, n1: 880, guns: 5 },
  { n0: 1060, n1: 1110, guns: 4 },
  { n0: 1320, n1: 1370, guns: 4 },
];

/** A point `back` metres behind the brow at `n`, `up` drawn metres above the ground. */
function onEdge(g: Face, n: number, back: number, up: number): Pt {
  return browAt(g, n, back, up);
}

function paintEdgeWorks(c: PlateCanvas, g: Face, mode: PlateMode): void {
  const colourMode = mode === "colour";
  const rng = createRng(391);
  // The batteries: earth parapets of gabions along the edge, embrasures with dark muzzles.
  for (const b of BATTERIES) {
    const top: Pt[] = [];
    const base: Pt[] = [];
    for (let n = b.n1; n >= b.n0; n -= 4) {
      top.push(onEdge(g, n, 10, 2.4 * BUILD));
      base.push(onEdge(g, n, 4, -0.6));
    }
    const body = band(top, base);
    const embr = new Path2D();
    const muzz = new Path2D();
    const gab = new Path2D();
    for (let k = 0; k < b.guns; k++) {
      const n = b.n1 - ((k + 0.5) * (b.n1 - b.n0)) / b.guns;
      const a = onEdge(g, n + 2.2, 10, 2.4 * BUILD);
      const z = onEdge(g, n - 2.2, 10, 2.4 * BUILD);
      const bot = onEdge(g, n, 10, 1.2 * BUILD);
      addLine(embr, [a, [(a[0] + z[0]) / 2, bot[1]], z], true);
      const m = onEdge(g, n, 8, 1.55 * BUILD);
      muzz.moveTo(m[0] - 0.5, m[1]);
      muzz.lineTo(m[0] + 0.5, m[1]);
    }
    for (let n = b.n1; n >= b.n0; n -= 2.2) {
      const p = onEdge(g, n, 10, 2.4 * BUILD);
      gab.moveTo(p[0], p[1]);
      gab.lineTo(p[0], p[1] + 0.55);
    }
    const ahead = viewOf(faceE(g, indexOf(g, b.n0), g.top[indexOf(g, b.n0)]), b.n0)[0];
    const fl = onEdge(g, b.n0 - 6, 12, 0);
    const f = flag(fl[0], fl[1], 12 * BUILD * (1000 / ahead), 2.4);
    if (colourMode) {
      fill(c, body, air(SHORE.earthLit, ahead));
      const shade = band(
        top.map(([x, y]) => [x, y] as Pt),
        top.map(([x, y]) => [x, y - 0.7] as Pt),
      );
      fill(c, shade, air(SHORE.earth, ahead), 0.7);
      fill(c, embr, air(mix(SHORE.earth, SHORE.shadeDeep, 0.5), ahead));
      stroke(c, gab, 0.9, air(SHORE.gabion, ahead), 0.9);
      stroke(c, muzz, 1.2, SHORE.muzzle, 0.95);
    } else {
      fill(c, body, PAPER.low);
      const l = new Path2D();
      addLine(l, top);
      stroke(c, l, 0.9, INK.line, 0.85);
      stroke(c, embr, 0.6, INK.line, 0.8);
      stroke(c, gab, 0.5, INK.hatch, 0.8);
      stroke(c, muzz, 1, INK.line, 0.9);
    }
    if (b.mortars) {
      // Mortars on their timber platforms behind the parapet.
      const m = new Path2D();
      for (let k = 0; k < b.mortars; k++) {
        const n = b.n1 - ((k + 0.5) * (b.n1 - b.n0)) / b.mortars;
        const p = onEdge(g, n, 26, 2.2 * BUILD);
        m.moveTo(p[0] + 0.9, p[1] + 0.4);
        m.ellipse(p[0], p[1] + 0.4, 0.9, 0.7, 0, 0, Math.PI * 2);
      }
      fill(c, m, colourMode ? SHORE.muzzle : INK.line, 0.85);
    }
    paintFlag(c, f, ahead, mode);
  }
  // A plank magazine behind each battery.
  // The Tour d'Odre's group: Napoleon's pavilion (its rotunda toward the
  // harbour mouth), the signal mast, Bruix's pavilion; Soult's and Decrès's
  // huts thatched to the ground.
  pavilion(c, g, 205, 14, 65, 19.4, mode);
  signalMast(c, g, 258, 16, mode);
  pavilion(c, g, 305, 22, 40, 14, mode);
  const huts: Hut[] = [];
  for (const [n, back, kind, l, w, ridge] of [
    [236, 70, 3, 9, 5, 8],
    [285, 92, 3, 0, 6, 15],
  ] as const) {
    const i = indexOf(g, n);
    huts.push({
      e: faceE(g, i, g.top[i]) + back,
      n,
      g: Math.max(g.top[i] * VEX, northUp(n, back)) + 0.5,
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

function pavilion(
  c: PlateCanvas,
  g: Face,
  n: number,
  back: number,
  length: number,
  rotunda: number,
  mode: PlateMode,
): void {
  const i = indexOf(g, n);
  const e0 = faceE(g, i, g.top[i]) + back;
  const ground = g.top[i] * VEX + 3 * VEX;
  // The long axis from the rotunda toward the east-north-east.
  const ue = Math.sin((60 * Math.PI) / 180);
  const un = Math.cos((60 * Math.PI) / 180);
  const half = (7.3 * BUILD) / 2;
  const wall = 4 * BUILD;
  const roofUp = 2.2 * BUILD;
  const r = rotunda / 2;
  const P = (along: number, side: number, up: number): Pt =>
    project(
      e0 + ue * along - un * side,
      n + un * along + ue * side,
      ground + up,
    );
  const ahead = viewOf(e0, n)[0];
  // The long side turned north-north-west, toward the eye and the sun.
  const side: Pt[] = [
    P(r * 0.6, half, 0),
    P(length, half, 0),
    P(length, half, wall),
    P(r * 0.6, half, wall),
  ];
  const roof: Pt[] = [
    P(r * 0.4, half + 0.8, wall),
    P(length + 0.8, half + 0.8, wall),
    P(length, 0, wall + roofUp),
    P(r * 0.6, 0, wall + roofUp),
  ];
  const end: Pt[] = [
    P(length, half, 0),
    P(length, -half, 0),
    P(length, -half, wall),
    P(length, 0, wall + roofUp),
    P(length, half, wall),
  ];
  // The rotunda: a drum and its low cone, toward the harbour mouth.
  const [cx, cy] = P(0, 0, 0);
  const rw = r * (1000 / ahead);
  const top = P(0, 0, wall)[1];
  const apex = P(0, 0, wall + roofUp * 1.6)[1];
  const drum: Pt[] = [
    [cx - rw, cy],
    [cx + rw, cy],
    [cx + rw, top],
    [cx - rw, top],
  ];
  const cone: Pt[] = [
    [cx - rw * 1.08, top],
    [cx + rw * 1.08, top],
    [cx, apex],
  ];
  // The mound and the paling round it.
  const mound: Pt[] = [];
  const pal: Pt[] = [];
  for (let k = 0; k <= 16; k++) {
    const a = Math.PI * (k / 16);
    const p = project(
      e0 + Math.cos(a) * 30 - 10,
      n + Math.sin(a - Math.PI / 2) * -38 + 10,
      ground - 3 * VEX + Math.sin(a) * 3 * VEX,
    );
    mound.push(p);
    pal.push([p[0], p[1] + 0.05]);
  }
  if (mode === "colour") {
    const lit = mix(SHORE.pale, "#f5dcae", 0.28);
    fill(c, poly(mound), air(SHORE.turfLit, ahead));
    fill(c, poly(end), air(SHORE.paleShade, ahead));
    fill(c, poly(side), air(lit, ahead));
    fill(c, poly(roof), air(SHORE.slate, ahead));
    const gr = c.ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
    gr.addColorStop(0, air(mix(lit, SHORE.pale, 0.3), ahead));
    gr.addColorStop(0.35, air(lit, ahead));
    gr.addColorStop(1, air(SHORE.paleShade, ahead));
    fill(c, poly(drum), gr);
    fill(c, poly(cone), air(mix(SHORE.slate, "#c9b9a0", 0.25), ahead));
    // Windows: a row of small dark panes along the side and round the drum.
    const win = new Path2D();
    for (let k = 1; k < 8; k++) {
      const a = P(r + ((length - r) * k) / 8, half, wall * 0.35);
      const b = P(r + ((length - r) * k) / 8, half, wall * 0.7);
      win.moveTo(a[0], a[1]);
      win.lineTo(b[0], b[1]);
    }
    for (let k = -2; k <= 2; k++) {
      const x = cx + (rw * k) / 3;
      win.moveTo(x, cy + (top - cy) * 0.35);
      win.lineTo(x, cy + (top - cy) * 0.7);
    }
    stroke(c, win, 0.8, air("#6b6660", ahead), 0.7);
    const fence = new Path2D();
    for (let k = 0; k < pal.length; k += 1) {
      fence.moveTo(pal[k][0], pal[k][1]);
      fence.lineTo(pal[k][0], pal[k][1] + 1.1);
    }
    addLine(
      fence,
      pal.map(([x, y]) => [x, y + 0.9] as Pt),
    );
    stroke(c, fence, 0.5, air(SHORE.wood, ahead), 0.7);
    return;
  }
  for (const p of [mound, end, side, roof, drum, cone])
    fill(c, poly(p), PAPER.low);
  const l = new Path2D();
  addLine(l, [side[0], side[3], roof[3], roof[2], roof[1], side[2], side[1]]);
  addLine(l, [end[2], end[3]]);
  addLine(l, [drum[0], drum[3], cone[0], cone[2], cone[1], drum[2], drum[1]]);
  stroke(c, l, 0.9, INK.line, 0.9);
  const h = new Path2D();
  for (let k = 1; k <= 4; k++) {
    const x = end[0][0] + ((end[1][0] - end[0][0]) * k) / 5;
    h.moveTo(x, end[0][1]);
    h.lineTo(x, end[2][1]);
  }
  for (let k = 1; k <= 3; k++) {
    const x = cx + rw * (0.25 + k * 0.22);
    h.moveTo(x, cy);
    h.lineTo(x, top);
  }
  stroke(c, h, 0.5, INK.hatch, 0.8);
  const fence = new Path2D();
  for (let k = 0; k < pal.length; k += 2) {
    fence.moveTo(pal[k][0], pal[k][1]);
    fence.lineTo(pal[k][0], pal[k][1] + 1.1);
  }
  stroke(c, fence, 0.5, INK.hatch, 0.7);
}

function signalMast(
  c: PlateCanvas,
  g: Face,
  n: number,
  back: number,
  mode: PlateMode,
): void {
  const i = indexOf(g, n);
  const e = faceE(g, i, g.top[i]) + back;
  const ground = g.top[i] * VEX;
  const ahead = viewOf(e, n)[0];
  const foot = project(e, n, ground);
  const top = project(e, n, ground + 22 * BUILD);
  const yardY = project(e, n, ground + 17 * BUILD)[1];
  const half = 6.5 * BUILD * (1000 / ahead);
  const mast = new Path2D();
  mast.moveTo(foot[0], foot[1]);
  mast.lineTo(top[0], top[1]);
  const yard = new Path2D();
  yard.moveTo(top[0] - half, yardY);
  yard.lineTo(top[0] + half, yardY);
  // Stays to the ground and the halyards with their flags.
  const stays = new Path2D();
  stays.moveTo(top[0], top[1] - 1);
  stays.lineTo(foot[0] - half * 0.9, foot[1]);
  stays.moveTo(top[0], top[1] - 1);
  stays.lineTo(foot[0] + half * 0.8, foot[1]);
  const flags: { x: number; y: number; col: string }[] = [
    { x: top[0] - half * 0.85, y: yardY - 1.2, col: SHORE.blue },
    { x: top[0] - half * 0.85, y: yardY - 3.6, col: SHORE.white },
    { x: top[0] + half * 0.85, y: yardY - 1.2, col: SHORE.red },
    { x: top[0] + half * 0.85, y: yardY - 3.6, col: "#d8b04a" },
  ];
  if (mode === "colour") {
    stroke(c, stays, 0.5, air(SHORE.wood, ahead), 0.55);
    stroke(c, mast, 1.4, air(SHORE.wood, ahead));
    stroke(c, yard, 1.1, air(SHORE.wood, ahead));
    for (const f of flags) {
      c.ctx.fillStyle = air(f.col, ahead);
      c.ctx.fillRect(f.x - 1.6, f.y - 2, 1.6, 2);
    }
    return;
  }
  stroke(c, stays, 0.45, INK.hatch, 0.7);
  stroke(c, mast, 1.1, INK.line, 0.95);
  stroke(c, yard, 0.9, INK.line, 0.95);
  for (const f of flags) {
    c.ctx.fillStyle = PAPER.low;
    c.ctx.fillRect(f.x - 1.6, f.y - 2, 1.6, 2);
    c.ctx.strokeStyle = INK.line;
    c.ctx.lineWidth = c.pen(0.5);
    c.ctx.strokeRect(f.x - 1.6, f.y - 2, 1.6, 2);
  }
}
