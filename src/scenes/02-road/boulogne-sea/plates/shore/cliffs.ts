import { createRng, mix, type Pt, vRamp } from "../../paint/kit";
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
  addBroken,
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
import { edgeAt, shoreAt } from "./terrain";

/**
 * The cliffs north of the harbour, from the high-water line to their
 * broken brow, with what stands on the edge: the batteries, Napoleon's
 * pavilion with the admiral's and the signal mast between them, Soult's and
 * Decrès's huts, flagstaffs. They face due west: lit square-on by the low
 * sun behind the eye, modelled a little from the left, so the shade lies
 * only on the walls of gullies and buttresses turned south (to the right),
 * and under the ledges of the hard beds.
 */

const N_MAX = 1500;
const N_MIN = 18;
const STEP = 5;
/** The face's foot (the top of the beach), true metres. */
const FOOT = 3;

interface Gully {
  n: number;
  w: number;
  s: number;
}

interface CliffGeo {
  ns: number[];
  /** True top height and east of the face per sample (gullies carved). */
  top: number[];
  east: number[];
  gullies: Gully[];
  edge: Pt[];
  foot: Pt[];
  hw: Pt[];
}

function buildGeo(): CliffGeo {
  const rng = createRng(301);
  const gullies: Gully[] = [];
  for (let n = N_MAX; n > 140; n -= 55 + rng() * 95)
    gullies.push({ n, w: 9 + rng() * 20, s: 0.35 + rng() * 0.65 });
  const notch = (n: number) => {
    let g = 0;
    for (const q of gullies) {
      const u = (n - q.n) / q.w;
      if (Math.abs(u) < 1) g = Math.max(g, q.s * (1 - u * u) ** 2);
    }
    return g;
  };
  const ns: number[] = [];
  const top: number[] = [];
  const east: number[] = [];
  for (let n = N_MAX; n >= N_MIN; n -= STEP) {
    const [e, h] = edgeAt(n);
    const g = notch(n);
    ns.push(n);
    top.push(h - 7 * g);
    east.push(e + 22 * g);
  }
  const geo: CliffGeo = { ns, top, east, gullies, edge: [], foot: [], hw: [] };
  for (let i = 0; i < ns.length; i++) {
    geo.edge.push(faceAt(geo, i, 1));
    geo.foot.push(faceAt(geo, i, 0));
    geo.hw.push(project(shoreAt(ns[i]), ns[i], -0.6));
  }
  return geo;
}

/** A point of the face at sample `i`, `f` of the way up from its foot. */
function faceAt(g: CliffGeo, i: number, f: number): Pt {
  const h = FOOT + (g.top[i] - FOOT) * f;
  // A steep upper face of hard beds over a talus of clays.
  const e = g.east[i] - 46 * (1 - f) ** 1.5;
  return project(e, g.ns[i], h * VEX);
}

/** A point of the face at true height `h` (clamped to the face). */
function faceAtH(g: CliffGeo, i: number, h: number): Pt {
  const f = Math.min(1, Math.max(0, (h - FOOT) / (g.top[i] - FOOT)));
  return faceAt(g, i, f);
}

/** Sample index nearest to `n`. */
function indexOf(g: CliffGeo, n: number): number {
  return Math.max(0, Math.min(g.ns.length - 1, Math.round((N_MAX - n) / STEP)));
}

/** The beds of the cliff, true metres, top down: hard caps over clays, dipping gently north. */
const BEDS = [
  { h0: 37, h1: 60, colour: SHORE.chalk, hard: true },
  { h0: 35.5, h1: 37, colour: SHORE.seam, hard: false },
  { h0: 26, h1: 35.5, colour: SHORE.sand, hard: true },
  { h0: 24, h1: 26, colour: SHORE.clayDeep, hard: false },
  { h0: 16.5, h1: 24, colour: SHORE.ochre, hard: true },
  { h0: FOOT, h1: 16.5, colour: SHORE.clay, hard: false },
] as const;

function bedH(h: number, n: number): number {
  return h - 0.0035 * (n - 600);
}

const AHEAD = 1350;

export function cliffsPlate(o: {
  id: string;
  depth: number;
  box: Plate["box"];
}): Plate {
  let geo: CliffGeo | undefined;
  const get = () => {
    if (!geo) geo = buildGeo();
    return geo;
  };
  const facePath = (g: CliffGeo) => band(g.edge, g.foot);

  const colour: PlateJob[] = [
    // The beach at the cliff's foot, down to the high-water line.
    (c) => {
      const g = get();
      const p = band(g.foot, g.hw);
      fill(
        c,
        p,
        vRamp(c.ctx, 2, -6, [
          air(SHORE.beach, AHEAD),
          air(SHORE.beachLow, AHEAD),
        ]),
      );
      const rng = createRng(311);
      const sh = new Path2D();
      for (let i = 0; i < g.ns.length; i += 2) {
        const a = g.foot[i];
        const b = g.hw[i];
        const t = 0.2 + rng() * 0.7;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        sh.moveTo(x, y);
        sh.lineTo(x + 0.6 + rng() * 1.5, y - 0.05);
      }
      stroke(c, sh, 0.6, air(SHORE.beachLow, AHEAD), 0.5);
      // The wrack at the high-water mark.
      const wrack = new Path2D();
      addBroken(
        wrack,
        g.hw.map(([x, y]) => [x, y + 0.5] as Pt),
        2,
        1.5,
        rng,
      );
      stroke(c, wrack, 0.8, air(SHORE.seam, AHEAD), 0.45);
    },
    // The face: its body ramped from the lit caps to the cooler clays.
    (c) => {
      const g = get();
      fill(
        c,
        facePath(g),
        vRamp(c.ctx, 100, 0, [
          air(SHORE.chalk, AHEAD),
          air(SHORE.sand, AHEAD),
          air(SHORE.ochre, AHEAD),
          air(SHORE.clay, AHEAD),
        ]),
      );
    },
    // The beds, each its own colour, clipped to the face.
    (c) => {
      const g = get();
      c.ctx.save();
      c.ctx.clip(facePath(g));
      for (const bed of BEDS) {
        const hi: Pt[] = [];
        const lo: Pt[] = [];
        for (let i = 0; i < g.ns.length; i++) {
          hi.push(faceAtH(g, i, bedH(bed.h1, g.ns[i])));
          lo.push(faceAtH(g, i, bedH(bed.h0, g.ns[i])));
        }
        fill(c, band(hi, lo), air(bed.colour, AHEAD), bed.hard ? 0.55 : 0.6);
      }
      c.ctx.restore();
    },
    // Ledges: a lit lip on each hard bed, the shade of its overhang under it.
    (c) => {
      const g = get();
      const rng = createRng(321);
      c.ctx.save();
      c.ctx.clip(facePath(g));
      const lips = new Path2D();
      const under = new Path2D();
      const runnels = new Path2D();
      for (const bed of BEDS) {
        if (!bed.hard) continue;
        const lip: Pt[] = [];
        const sh: Pt[] = [];
        for (let i = 0; i < g.ns.length; i++) {
          lip.push(faceAtH(g, i, bedH(bed.h1, g.ns[i]) - 0.2));
          sh.push(faceAtH(g, i, bedH(bed.h0, g.ns[i]) - 0.5));
        }
        addBroken(lips, lip, 9, 3, rng);
        addBroken(under, sh, 12, 4, rng);
      }
      stroke(c, under, 1.3, air(SHORE.shadeDeep, AHEAD), 0.5);
      stroke(c, lips, 0.8, air("#fff1cf", AHEAD), 0.45);
      // Rain runnels down the soft beds: fine, low in contrast.
      for (let i = 0; i < g.ns.length; i += 1) {
        if (rng() > 0.35) continue;
        const f0 = 0.15 + rng() * 0.5;
        const f1 = Math.max(0.02, f0 - 0.1 - rng() * 0.25);
        const pts: Pt[] = [];
        for (let k = 0; k <= 4; k++)
          pts.push(faceAt(g, i, f0 + ((f1 - f0) * k) / 4));
        addLine(runnels, pts);
      }
      stroke(c, runnels, 0.5, air(SHORE.seam, AHEAD), 0.3);
      c.ctx.restore();
    },
    // Gullies: their north walls, turned south, in the sky's cool shade.
    (c) => {
      const g = get();
      c.ctx.save();
      c.ctx.clip(facePath(g));
      const shade = new Path2D();
      const core = new Path2D();
      const lit = new Path2D();
      for (const q of g.gullies) {
        const iL = indexOf(g, q.n + q.w * 0.55);
        const iR = indexOf(g, q.n + q.w * 0.02);
        const iC = indexOf(g, q.n + q.w * 0.42);
        const iF = indexOf(g, q.n - q.w * 0.6);
        const left: Pt[] = [];
        const right: Pt[] = [];
        const mid: Pt[] = [];
        const front: Pt[] = [];
        const reach = 0.08 + (1 - q.s) * 0.3;
        for (let k = 0; k <= 10; k++) {
          const f = 1 - ((1 - reach) * k) / 10;
          left.push(faceAt(g, iL, f));
          right.push(faceAt(g, iR, Math.min(1, f + 0.02)));
          mid.push(faceAt(g, iC, f));
          front.push(faceAt(g, iF, f));
        }
        addLine(shade, [...left, ...right.slice().reverse()], true);
        addLine(core, [...left, ...mid.slice().reverse()], true);
        // The buttress beyond, its front square to the sun: a touch brighter.
        addLine(lit, [...right, ...front.slice().reverse()], true);
      }
      fill(c, lit, air("#f6dca6", AHEAD), 0.18);
      fill(c, shade, air(SHORE.shade, AHEAD), 0.42);
      fill(c, core, air(SHORE.shadeDeep, AHEAD), 0.32);
      c.ctx.restore();
    },
    // The flank toward the harbour, turned south: in shade.
    (c) => {
      const g = get();
      c.ctx.save();
      c.ctx.clip(facePath(g));
      const x0 = faceAt(g, indexOf(g, 210), 1)[0];
      const x1 = faceAt(g, indexOf(g, 60), 1)[0];
      const gr = c.ctx.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, `${air(SHORE.shade, AHEAD)}00`);
      gr.addColorStop(1, air(SHORE.shade, AHEAD));
      c.ctx.globalAlpha = 0.55;
      c.ctx.fillStyle = gr;
      c.ctx.fillRect(x0, -10, x1 - x0 + 40, 140);
      c.ctx.globalAlpha = 1;
      c.ctx.restore();
    },
    // The turf on the brow, hanging into the gullies, and the clays' grass.
    (c) => {
      const g = get();
      const rng = createRng(331);
      const low: Pt[] = [];
      for (let i = 0; i < g.ns.length; i++) {
        const drop = 1.2 + rng() * 0.6 + Math.max(0, 1 - g.top[i] / 45) * 3;
        low.push(faceAtH(g, i, g.top[i] - drop));
      }
      fill(c, band(g.edge, low), air(SHORE.turfLit, AHEAD));
      const shadow = new Path2D();
      addBroken(shadow, low, 10, 2, rng);
      stroke(c, shadow, 1, air(SHORE.turfShade, AHEAD), 0.55);
      const grass = new Path2D();
      for (let i = 0; i < g.ns.length; i += 3) {
        if (rng() > 0.5) continue;
        const f = 0.05 + rng() * 0.25;
        const a = faceAt(g, i, f);
        const r = 1 + rng() * 3;
        grass.moveTo(a[0] - r, a[1]);
        grass.quadraticCurveTo(a[0], a[1] + r * 0.5, a[0] + r, a[1]);
        grass.closePath();
      }
      fill(c, grass, air(SHORE.turf, AHEAD), 0.4);
    },
    // Fallen blocks and the old tower's rubble on the beach.
    (c) => paintBlocks(c, get(), "colour"),
    (c) => paintEdgeWorks(c, get(), "colour"),
  ];

  const ink: PlateJob[] = [
    (c) => {
      const g = get();
      fill(c, band(g.foot, g.hw), PAPER.low);
      fill(c, facePath(g), PAPER.low);
      const rng = createRng(341);
      // The beach: sparse broken strokes; the wrack line at the high-water mark.
      const s = new Path2D();
      for (let i = 0; i < g.ns.length; i += 4) {
        const a = g.foot[i];
        const b = g.hw[i];
        const t = 0.3 + rng() * 0.6;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        s.moveTo(x, y);
        s.lineTo(x + 0.8 + rng() * 1.2, y);
      }
      stroke(c, s, 0.5, INK.hatch, 0.5);
      const wrack = new Path2D();
      addBroken(
        wrack,
        g.hw.map(([x, y]) => [x, y + 0.5] as Pt),
        1.5,
        2,
        rng,
      );
      stroke(c, wrack, 0.6, INK.hatch, 0.6);
    },
    // Strata: fine broken lines along the beds, firmer under the hard ones.
    (c) => {
      const g = get();
      const rng = createRng(351);
      c.ctx.save();
      c.ctx.clip(facePath(g));
      const hard = new Path2D();
      const soft = new Path2D();
      for (const bed of BEDS) {
        for (const [h, path] of [
          [bed.h0, bed.hard ? hard : soft],
          [(bed.h0 + bed.h1) / 2, soft],
        ] as const) {
          if (h > 50) continue;
          const pts: Pt[] = [];
          for (let i = 0; i < g.ns.length; i++)
            pts.push(faceAtH(g, i, bedH(h, g.ns[i])));
          addBroken(path, pts, 8, 2.5, rng, () => 0.8);
        }
      }
      stroke(c, hard, 0.9, INK.line, 0.75);
      stroke(c, soft, 0.6, INK.hatch, 0.55);
      c.ctx.restore();
    },
    // Shade by hatching down the fall line: the gullies' walls dense,
    // their cores cross-hatched; the clays lightly.
    (c) => {
      const g = get();
      const rng = createRng(361);
      c.ctx.save();
      c.ctx.clip(facePath(g));
      const dense = new Path2D();
      const cross = new Path2D();
      const light = new Path2D();
      for (const q of g.gullies) {
        const iL = indexOf(g, q.n + q.w * 0.55);
        const iR = indexOf(g, q.n + q.w * 0.02);
        const reach = 0.08 + (1 - q.s) * 0.3;
        for (let i = iL; i <= iR; i += 1) {
          const t = (i - iL) / Math.max(1, iR - iL);
          const f0 = 1;
          const f1 = reach + t * 0.25 + rng() * 0.1;
          const pts: Pt[] = [];
          for (let k = 0; k <= 5; k++)
            pts.push(faceAt(g, i, f0 + ((f1 - f0) * k) / 5));
          addLine(dense, pts);
          if (t < 0.45 && i % 2 === 0) {
            const a = faceAt(g, i, 0.9 - rng() * 0.2);
            cross.moveTo(a[0] - 1.2, a[1] + 1.4);
            cross.lineTo(a[0] + 1.2, a[1] - 1.4);
          }
        }
      }
      for (let i = 0; i < g.ns.length; i += 3) {
        if (rng() > 0.5) continue;
        const f0 = 0.05 + rng() * 0.2;
        const pts: Pt[] = [faceAt(g, i, f0 + 0.18), faceAt(g, i, f0)];
        addLine(light, pts);
      }
      stroke(c, dense, 0.6, INK.hatch, 0.85);
      stroke(c, cross, 0.5, INK.hatch, 0.7);
      stroke(c, light, 0.5, INK.hatch, 0.45);
      // The flank toward the harbour, in shade: hatched across.
      const flank = new Path2D();
      for (let i = indexOf(g, 200); i < g.ns.length; i += 1) {
        const pts: Pt[] = [faceAt(g, i, 1), faceAt(g, i, 0.05)];
        addLine(flank, pts);
      }
      stroke(c, flank, 0.5, INK.hatch, 0.55);
      c.ctx.restore();
    },
    // The brow's contour, firm; the foot's, broken.
    (c) => {
      const g = get();
      const rng = createRng(371);
      const edge = new Path2D();
      addLine(edge, g.edge);
      stroke(c, edge, 1.4, INK.line, 0.9);
      const foot = new Path2D();
      addBroken(foot, g.foot, 6, 2, rng);
      stroke(c, foot, 0.8, INK.line, 0.6);
    },
    (c) => paintBlocks(c, get(), "ink"),
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

function paintBlocks(c: PlateCanvas, _g: CliffGeo, mode: PlateMode): void {
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

/** Sample index's top point plus `up` drawn metres, set back `back` metres behind the edge. */
function onEdge(g: CliffGeo, n: number, back: number, up: number): Pt {
  const i = indexOf(g, n);
  return project(g.east[i] + back, n, g.top[i] * VEX + up);
}

function paintEdgeWorks(c: PlateCanvas, g: CliffGeo, mode: PlateMode): void {
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
    const ahead = viewOf(g.east[indexOf(g, b.n0)], b.n0)[0];
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
      e: g.east[i] + back,
      n,
      g: g.top[i] * VEX + 0.5,
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
  g: CliffGeo,
  n: number,
  back: number,
  length: number,
  rotunda: number,
  mode: PlateMode,
): void {
  const i = indexOf(g, n);
  const e0 = g.east[i] + back;
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
  g: CliffGeo,
  n: number,
  back: number,
  mode: PlateMode,
): void {
  const i = indexOf(g, n);
  const e = g.east[i] + back;
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
