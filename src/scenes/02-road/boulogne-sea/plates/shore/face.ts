import { createRng, field, type Pt, wobble } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";
import { project, VEX, viewOf } from "../../scene";
import { addBroken, addLine, band, fill, stroke } from "./draw";
import { edgeAt, northUp, shoreAt, smoothstep } from "./terrain";
import { css, hazed, lerp3, type RGB, rgbOf, scale3 } from "./tone";

/**
 * The cliff face north of the harbour, sample by sample along it: a face
 * of beds (hard sandstones and limestones standing as walls over softer
 * clays that slope back and grass over), broken by clefts where joints
 * have opened and by gullies where a stream notches the brow, with a
 * talus of fallen rock and slumped clay along its foot and the beach
 * below it.
 *
 * The light follows the form. The face runs north and south and faces
 * west, square to the sun low behind the eye; where it turns (a cleft's
 * or a gully's walls, a buttress's flank) each bed's colour is taken from
 * how square that bit of face stands to the sun (azimuth 294): a wall
 * turned south is in the sky's cool shade, one turned north-west catches
 * the sun full. So the shade lies in the clefts and on the gullies' north
 * walls (to the left of each, as seen from the roads), never in stripes.
 *
 * The engraving draws the same face: the beds' lines, firm under the hard
 * ones; hatching down the fall line where the face turns from the sun,
 * closer and heavier the deeper the shade, crossed in the deepest; the
 * joints; the talus's slope; the brow's contour.
 */

/** The face's samples: metres north, from beyond the frame's left edge to the harbour's quay. */
export const N_MAX = 1060;
export const N_MIN = 14;
export const STEP = 2;
/** The face's foot (the top of the beach under the talus), true metres. */
export const FOOT = 3;
/** How far the foot of the face stands out from its brow, metres. */
const LEAN = 6;

const SUN_E = Math.sin((294 * Math.PI) / 180);
const SUN_N = Math.cos((294 * Math.PI) / 180);

interface Material {
  lit: RGB;
  shade: RGB;
}

const mat = (lit: string, shade: string): Material => ({
  lit: rgbOf(lit),
  shade: rgbOf(shade),
});

/** Rock in the evening sun and in the blue sky's shade. Golden, never red-brown. */
const M = {
  lime: mat("#e0c99c", "#726e7a"),
  sandPale: mat("#dbbb88", "#6d6870"),
  sand: mat("#d2a670", "#685f64"),
  rust: mat("#cb9f6c", "#665a5e"),
  clay: mat("#b9a88f", "#5f5d67"),
  clayDark: mat("#a8977f", "#54525c"),
  seam: mat("#94826f", "#4c4a53"),
  cap: mat("#c9a878", "#6a6363"),
} as const;

interface Bed {
  /** Its base, true metres above high water at n = 500 (the beds dip gently north). */
  h: number;
  m: Material;
  hard: boolean;
}

/** The beds, bottom up: clays under sandstones and limestones, a rubbly cap. */
const BEDS: readonly Bed[] = [
  { h: 0, m: M.clayDark, hard: false },
  { h: 5.5, m: M.clay, hard: false },
  { h: 8.2, m: M.sand, hard: true },
  { h: 10.6, m: M.clay, hard: false },
  { h: 15.2, m: M.seam, hard: false },
  { h: 15.9, m: M.rust, hard: true },
  { h: 20.4, m: M.sandPale, hard: true },
  { h: 22.8, m: M.clayDark, hard: false },
  { h: 24, m: M.sand, hard: true },
  { h: 28.6, m: M.clay, hard: false },
  { h: 31.4, m: M.sandPale, hard: true },
  { h: 38.5, m: M.seam, hard: false },
  { h: 39.3, m: M.lime, hard: true },
  { h: 45.5, m: M.clay, hard: false },
  { h: 47, m: M.cap, hard: true },
];
const TOP_OF_ALL = 90;
const DIP = 0.005;

/** A cleft or a gully cut back into the face: a notch in its plan over a span of its height. */
interface Cut {
  n: number;
  /** How far back (east) at its deepest, metres. */
  depth: number;
  /** Half-widths of its north and south walls, metres. */
  wn: number;
  ws: number;
  /** True heights it spans; a gully runs from its floor to the brow. */
  h0: number;
  h1: number;
  /** How far it notches the brow, metres. */
  notch: number;
  gully: boolean;
}

/** Gullies where a little valley's stream comes over the edge: n, depth, half-width, notch, floor. */
const GULLIES: readonly (readonly [number, number, number, number, number])[] =
  [
    [1005, 26, 17, 9, 9],
    [905, 18, 12, 6, 12],
    [748, 30, 20, 11, 7],
    [540, 22, 15, 7, 10],
    [292, 16, 12, 5, 13],
  ];

export interface Face {
  ns: number[];
  /** The face's line at the brow without its cuts, metres east. */
  plan: number[];
  /** The brow's true height. */
  top: number[];
  cuts: Cut[];
  /** The cuts touching each sample. */
  near: number[][];
  /** Bed boundaries, true metres, [boundary][sample]: boundary j is the base of BEDS[j]. */
  bh: number[][];
  ahead: number[];
  edge: Pt[];
  base: Pt[];
  talusH: number[];
  talusTop: Pt[];
  talusFoot: Pt[];
  hw: Pt[];
  /** The ground just behind the brow (the batteries' ground), 36 m back. */
  back: Pt[];
  /** Joints in the hard beds: their sample, their ends' true heights, and a seep (1) or a rust stain (2) below some. */
  joints: Joint[];
  /** The bed boundaries clamped to the face (its foot to its brow), true metres, [boundary][sample]. */
  hc: number[][];
  /** Their points, layer units. */
  bp: Pt[][];
  /** Each bed's light at its mid-height, [bed][sample]. */
  light: number[][];
  /** The face's east at each clamped boundary, [boundary][sample]. */
  eb: number[][];
}

interface Joint {
  i: number;
  hi: number;
  lo: number;
  stain: 0 | 1 | 2;
  /** The stain's length and width, metres. */
  len: number;
  w: number;
}

function cutAt(c: Cut, n: number, h: number, top: number): number {
  let v: number;
  // A gully is a V: deep and wide at the brow, narrowing to its floor.
  let widen = 1;
  if (c.gully) {
    v = smoothstep(c.h0, c.h0 + 0.55 * (top - c.h0), h);
    widen = 0.3 + 0.7 * v;
  } else
    v =
      smoothstep(c.h0 - 1.2, c.h0 + 1.6, h) *
      (1 - smoothstep(c.h1 - 1.6, c.h1 + 1.2, h));
  if (v <= 0) return 0;
  const u = n >= c.n ? (n - c.n) / (c.wn * widen) : (c.n - n) / (c.ws * widen);
  if (u >= 1) return 0;
  // Flat walls meeting at the back: each wall one facet in one light.
  return c.depth * (1 - u) * v;
}

/** The face's east at sample `i` and true height `h`. */
export function faceE(f: Face, i: number, h: number): number {
  const top = f.top[i];
  const k = Math.min(1, Math.max(0, (h - FOOT) / Math.max(1, top - FOOT)));
  let e = f.plan[i] - LEAN * (1 - k);
  const n = f.ns[i];
  for (const ci of f.near[i]) e += cutAt(f.cuts[ci], n, h, top);
  return e;
}

/** A point of the face, layer units. */
export function facePt(f: Face, i: number, h: number): Pt {
  return project(faceE(f, i, h), f.ns[i], h * VEX);
}

/**
 * A point of the face at sample `i` and true height `h`, from the cached
 * bed boundaries (linear between them: the face is near enough plane
 * from one boundary to the next).
 */
export function atH(f: Face, i: number, h: number): Pt {
  const hc = f.hc;
  const last = hc.length - 1;
  if (h <= hc[0][i]) return f.bp[0][i];
  if (h >= hc[last][i]) return f.bp[last][i];
  let j = 0;
  while (j < last - 1 && hc[j + 1][i] < h) j++;
  const h0 = hc[j][i];
  const h1 = hc[j + 1][i];
  const t = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const a = f.bp[j][i];
  const b = f.bp[j + 1][i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** How square the face stands to the sun at sample `i`, height `h`: 0 (shade) to 1. */
function lightAt(f: Face, i: number, h: number): number {
  const i0 = Math.max(0, i - 1);
  const i1 = Math.min(f.ns.length - 1, i + 1);
  const dedn = (faceE(f, i0, h) - faceE(f, i1, h)) / (f.ns[i0] - f.ns[i1]);
  const lit = (-SUN_E + SUN_N * dedn) / Math.hypot(1, dedn);
  return Math.min(1, Math.max(0, (lit - 0.05) / 0.86));
}

/** Sample index nearest to `n`. */
export function indexOf(f: Face, n: number): number {
  return Math.max(0, Math.min(f.ns.length - 1, Math.round((N_MAX - n) / STEP)));
}

/** A point on the brow at `n`, `back` metres behind the edge and `up` drawn metres above it. */
export function browAt(f: Face, n: number, back: number, up: number): Pt {
  const i = indexOf(f, n);
  const top = f.top[i];
  const dip = (f.top[i] - edgeTop(f, i)) * Math.exp(-back / 60);
  return project(faceE(f, i, top) + back, n, (edgeTop(f, i) + dip) * VEX + up);
}

/** The brow's height before the notches: the plateau's edge. */
function edgeTop(f: Face, i: number): number {
  return f.top[i] + notchAt(f, i);
}

function notchAt(f: Face, i: number): number {
  let g = 0;
  const n = f.ns[i];
  for (const ci of f.near[i]) {
    const c = f.cuts[ci];
    const u = n >= c.n ? (n - c.n) / c.wn : (c.n - n) / c.ws;
    if (u < 1) g = Math.max(g, c.notch * (1 - u * u) ** 1.5);
  }
  return g;
}

export function buildFace(): Face {
  const rng = createRng(301);
  const ns: number[] = [];
  for (let n = N_MAX; n >= N_MIN - 1e-6; n -= STEP) ns.push(n);
  const line = wobble(303, [
    [170, 4.5],
    [64, 1.8],
    [23, 0.6],
  ]);
  const plan = ns.map((n) => edgeAt(n)[0] + line(n) * smoothstep(60, 200, n));
  const cuts: Cut[] = [];
  for (const [n, depth, w, notch, floor] of GULLIES)
    cuts.push({
      n,
      depth,
      wn: w * 0.72,
      ws: w * 1.3,
      h0: floor,
      h1: TOP_OF_ALL,
      notch,
      gully: true,
    });
  // Clefts: joints opened into chimneys and re-entrants, a few through the
  // whole face, most through a few beds.
  const hardBases = BEDS.filter((b) => b.hard).map((b) => b.h);
  for (let n = N_MAX + 10 - rng() * 20; n > 60; n -= 7 + rng() * 26) {
    if (GULLIES.some(([g, , w]) => Math.abs(n - g) < w * 1.4)) continue;
    const depth = 1.4 + rng() ** 1.8 * 9;
    const from = Math.floor(rng() * hardBases.length);
    const whole = rng() < 0.3;
    const to = whole
      ? TOP_OF_ALL
      : (hardBases[from + 1 + Math.floor(rng() * 2)] ?? TOP_OF_ALL);
    cuts.push({
      n,
      depth,
      wn: depth * (0.7 + rng() * 0.45),
      ws: depth * (1.2 + rng() * 0.6),
      h0: hardBases[from] - 0.5,
      h1: to,
      notch: to >= TOP_OF_ALL ? depth * 0.3 : 0,
      gully: false,
    });
  }
  const near: number[][] = ns.map(() => []);
  cuts.forEach((c, k) => {
    const i0 = Math.max(0, Math.floor((N_MAX - c.n - c.wn) / STEP));
    const i1 = Math.min(ns.length - 1, Math.ceil((N_MAX - c.n + c.ws) / STEP));
    for (let i = i0; i <= i1; i++)
      if (ns[i] < c.n + c.wn && ns[i] > c.n - c.ws) near[i].push(k);
  });
  const f: Face = {
    ns,
    plan,
    top: [],
    cuts,
    near,
    bh: [],
    ahead: [],
    edge: [],
    base: [],
    talusH: [],
    talusTop: [],
    talusFoot: [],
    hw: [],
    back: [],
    joints: [],
    hc: [],
    bp: [],
    light: [],
    eb: [],
  };
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    // The brow, notched; at the harbour's end it comes down to the quay.
    const h = edgeAt(n)[1];
    f.top.push(h);
    f.top[i] = h - notchAt(f, i);
    f.top[i] += (FOOT + 0.4 - f.top[i]) * smoothstep(46, N_MIN, n);
  }
  // Bed boundaries: level beds dipping gently north, each a little uneven.
  for (let j = 0; j <= BEDS.length; j++) {
    const soft = j < BEDS.length && !BEDS[j].hard;
    const w = wobble(700 + j, [
      [160, soft ? 0.55 : 0.35],
      [47, soft ? 0.3 : 0.18],
      [13, 0.07],
    ]);
    // Some thin beds pinch out and swell again along the face.
    const lens = wobble(760 + j, [
      [230, 1],
      [90, 0.5],
    ]);
    const row: number[] = [];
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      let h = j < BEDS.length ? BEDS[j].h - DIP * (n - 500) + w(n) : 999;
      if (j === 0) h = -5;
      if (j > 0) {
        const below = f.bh[j - 1][i];
        const thick = j < BEDS.length ? BEDS[j].h - BEDS[j - 1].h : 99;
        if (thick < 3 && j < BEDS.length) {
          const k = 0.15 + 0.85 * smoothstep(-0.6, 0.5, lens(n));
          h = below + Math.max(0.3, (h - below) * k);
        }
        h = Math.max(h, below + 0.3);
      }
      row.push(h);
    }
    f.bh.push(row);
  }
  return f;
}

/** The face's second stage: the talus along its foot, the beds' points and light. */
export function shapeFace(f: Face): void {
  const { ns, cuts } = f;
  const talus = wobble(311, [
    [140, 1.6],
    [47, 0.9],
    [15, 0.35],
  ]);
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    let t = 5.2 + talus(n);
    for (const c of cuts) {
      const reach = c.gully ? 1.8 : 1.3;
      const u = Math.abs(n - c.n) / ((c.wn + c.ws) * 0.5 * reach);
      if (u < 1) {
        const cone = c.gully ? 1.5 + c.depth * 0.18 : c.depth * 0.28;
        t = Math.max(t, 5.6 + cone * (1 - u * u) ** 2);
      }
    }
    t = Math.min(t, f.top[i] - 1);
    f.talusH.push(Math.max(FOOT + 0.3, t));
  }
  // The boundaries' points and each bed's light, once.
  const eb = f.eb;
  for (let j = 0; j < f.bh.length; j++) {
    const hRow: number[] = [];
    const eRow: number[] = [];
    const pRow: Pt[] = [];
    for (let i = 0; i < ns.length; i++) {
      const h =
        j === f.bh.length - 1
          ? f.top[i]
          : Math.min(f.top[i], Math.max(FOOT, f.bh[j][i]));
      const e = faceE(f, i, h);
      hRow.push(h);
      eRow.push(e);
      pRow.push(project(e, ns[i], h * VEX));
    }
    f.hc.push(hRow);
    f.bp.push(pRow);
    eb.push(eRow);
  }
}

/** The face's third stage: its outlines, the talus's and the beach's lines, the joints. */
export function lineFace(f: Face): void {
  const { ns, eb } = f;
  for (let b = 0; b < BEDS.length; b++) {
    const row: number[] = [];
    for (let i = 0; i < ns.length; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(ns.length - 1, i + 1);
      const e0 = (eb[b][i0] + eb[b + 1][i0]) / 2;
      const e1 = (eb[b][i1] + eb[b + 1][i1]) / 2;
      const dedn = (e0 - e1) / (ns[i0] - ns[i1]);
      const lit = (-SUN_E + SUN_N * dedn) / Math.hypot(1, dedn);
      row.push(Math.min(1, Math.max(0, (lit - 0.05) / 0.86)));
    }
    f.light.push(row);
  }
  const last = f.bp.length - 1;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    const top = f.top[i];
    f.edge.push(f.bp[last][i]);
    f.base.push(f.bp[0][i]);
    const th = f.talusH[i];
    f.talusTop.push(atH(f, i, th));
    const spread = 3 + (th - FOOT) * 1.25;
    f.talusFoot.push(project(faceE(f, i, FOOT) - spread, n, FOOT * VEX * 0.85));
    f.hw.push(project(shoreAt(n), n, -0.6));
    f.ahead.push(viewOf(eb[last][i], n)[0]);
    const back = 36;
    const dip = (edgeTop(f, i) - top) * Math.exp(-back / 60);
    f.back.push(
      project(
        eb[last][i] + back,
        n,
        Math.max(northUp(n, back) - dip * VEX, top * VEX),
      ),
    );
  }
  const jr = createRng(921);
  BEDS.forEach((bed, b) => {
    if (!bed.hard) return;
    for (
      let n = N_MAX - jr() * 9;
      n > N_MIN + 30;
      n -= 3.5 + jr() ** 1.5 * 13
    ) {
      const i = indexOf(f, n);
      const b0 = f.bh[b][i] + 0.3;
      const b1 = Math.min(f.top[i] - 0.4, f.bh[b + 1][i] - 0.2);
      const part = jr() < 0.5 ? 1 : 0.35 + jr() * 0.5;
      const lo = b0 + (b1 - b0) * (1 - part) * jr();
      const hi = lo + (b1 - lo) * part;
      const r = jr();
      const len = 3 + jr() * 9;
      const w = 0.5 + jr() * 1.2;
      if (hi - lo < 0.5 || lo < f.talusH[i]) continue;
      f.joints.push({
        i,
        hi,
        lo,
        stain: r < 0.08 ? 2 : r < 0.18 ? 1 : 0,
        len,
        w,
      });
    }
  });
}

// ------------------------------------------------------------ the beds

interface BandSamples {
  count: number;
  x: number[];
  top: number[];
  bot: number[];
  /** True heights of the band's top and bottom at each sample. */
  hTop: number[];
  hBot: number[];
  light: number[];
  idx: number[];
}

/** The visible part of bed `b` along the face, sample by sample, x increasing (north to south). */
function bedBand(f: Face, b: number): BandSamples {
  const s: BandSamples = {
    count: 0,
    x: [],
    top: [],
    bot: [],
    hTop: [],
    hBot: [],
    light: [],
    idx: [],
  };
  let lastX = Number.NEGATIVE_INFINITY;
  const lo = f.bp[b];
  const hi = f.bp[b + 1];
  for (let i = 0; i < f.ns.length; i++) {
    const x = (lo[i][0] + hi[i][0]) / 2;
    if (x <= lastX) continue;
    lastX = x;
    s.x.push(x);
    s.top.push(hi[i][1]);
    s.bot.push(lo[i][1]);
    s.hTop.push(f.hc[b + 1][i]);
    s.hBot.push(f.hc[b][i]);
    s.light.push(f.light[b][i]);
    s.idx.push(i);
    s.count++;
  }
  return s;
}

const SKY_COOL = rgbOf("#b9b6c2");

/** A bed's colour at a sample for its light, its slope (soft beds lean back under the sky) and its unevenness. */
function bedColour(bed: Bed, light: number, vary: number, ahead: number): RGB {
  const m = bed.m;
  const lit = bed.hard ? m.lit : lerp3(m.lit, SKY_COOL, 0.14);
  const l = bed.hard ? light : light * 0.84;
  const c = lerp3(m.shade, lit, l ** 0.85);
  return hazed(scale3(c, 1 + vary), ahead);
}

function bandPath(f: Face, b: number): Path2D {
  return band(f.bp[b + 1], f.bp[b]);
}

/** Colour: one bed, its colour sample by sample from the light on that bit of face. */
function paintBed(c: PlateCanvas, f: Face, b: number): void {
  const s = bedBand(f, b);
  if (s.count < 2) return;
  const bed = BEDS[b];
  const vary = wobble(810 + b, [
    [150, 0.05],
    [41, 0.03],
    [11, 0.012],
  ]);
  const x0 = s.x[0];
  const x1 = s.x[s.count - 1];
  const g = c.ctx.createLinearGradient(x0, 0, x1, 0);
  for (let j = 0; j < s.count; j++) {
    const i = s.idx[j];
    g.addColorStop(
      (s.x[j] - x0) / (x1 - x0),
      css(bedColour(bed, s.light[j], vary(f.ns[i]), f.ahead[i])),
    );
  }
  fill(c, bandPath(f, b), g);
}

/**
 * Colour: weathering over the beds: patches of grey where the rock has
 * stood longest, of fresh ochre where it has lately fallen, each running
 * over a stretch of a bed or two, so the bands break into blocks.
 */
function paintWeather(c: PlateCanvas, f: Face): void {
  const rng = createRng(911);
  const grey = new Path2D();
  const fresh = new Path2D();
  const dark = new Path2D();
  BEDS.forEach((bed, b) => {
    if (b === 0) return;
    for (let n = N_MAX - rng() * 30; n > N_MIN + 40; n -= 12 + rng() * 44) {
      const len = 6 + rng() ** 1.4 * 46;
      const span = bed.hard && rng() < 0.3 ? 2 : 1;
      const i0 = indexOf(f, n);
      const i1 = indexOf(f, n - len);
      if (i1 - i0 < 2) continue;
      const fTop = 0.55 + rng() * 0.45;
      const fBot = rng() * 0.35;
      const top: Pt[] = [];
      const bot: Pt[] = [];
      const lean = (rng() - 0.5) * 0.5;
      const edge = wobble(919 + b * 97 + i0, [
        [11, 0.22],
        [4, 0.1],
      ]);
      const cutL = rng() * 0.3;
      const cutR = rng() * 0.3;
      for (let i = i0; i <= i1; i += i < i1 - 1 ? 2 : 1) {
        const t = (i - i0) / (i1 - i0);
        const lo = f.bh[b][i];
        const hi = f.bh[Math.min(BEDS.length, b + span)][i];
        // Square-ish ends cut on a slant, a ragged top.
        const shapeT = Math.min(1, t / (0.05 + cutL), (1 - t) / (0.05 + cutR));
        const hT = Math.min(
          f.top[i],
          lo +
            (hi - lo) *
              (fBot +
                (fTop - fBot) * shapeT +
                lean * (t - 0.5) +
                edge(i * STEP) * shapeT),
        );
        const hB = Math.min(
          f.top[i],
          Math.max(f.talusH[i], lo + (hi - lo) * fBot),
        );
        top.push(atH(f, i, Math.max(hB, hT)));
        bot.push(atH(f, i, hB));
      }
      const r = rng();
      addLine(
        r < 0.5 ? grey : r < 0.82 ? fresh : dark,
        [...top, ...bot.reverse()],
        true,
      );
    }
  });
  c.ctx.fillStyle = css(hazed(rgbOf("#a39e98"), 1350), 0.2);
  c.ctx.fill(grey);
  c.ctx.fillStyle = css(hazed(rgbOf("#d9a668"), 1350), 0.2);
  c.ctx.fill(fresh);
  c.ctx.fillStyle = css(hazed(rgbOf("#7d7270"), 1350), 0.14);
  c.ctx.fill(dark);
}

/** How far a hard bed overhangs the soft one under it at `n`, true metres (0: flush). */
function overhang(b: number): (n: number) => number {
  const w = wobble(900 + b, [
    [60, 0.5],
    [19, 0.3],
  ]);
  return (n) => Math.max(0, 0.12 + 0.45 * w(n));
}

/** Colour: the shade under each hard bed's overhang, and the soft bed's upper edge tucked under it. */
function paintOverhangs(c: PlateCanvas, f: Face): void {
  const deep = css(hazed(rgbOf("#6a6579"), 1350), 0.55);
  const soft = css(hazed(rgbOf("#7b7686"), 1350), 0.22);
  const p = new Path2D();
  const q = new Path2D();
  BEDS.forEach((bed, b) => {
    if (!bed.hard || b === 0) return;
    const over = overhang(b);
    const top: Pt[] = [];
    const bot: Pt[] = [];
    const low: Pt[] = [];
    for (let i = 0; i < f.ns.length; i++) {
      const h = f.bh[b][i];
      if (h >= f.top[i] - 0.3) {
        top.push(atH(f, i, f.top[i]));
        bot.push(atH(f, i, f.top[i]));
        low.push(atH(f, i, f.top[i]));
        continue;
      }
      const t = over(f.ns[i]);
      top.push(atH(f, i, h));
      bot.push(atH(f, i, h - t));
      low.push(atH(f, i, h - t - 0.9));
    }
    addLine(p, top);
    for (let i = bot.length - 1; i >= 0; i--) p.lineTo(bot[i][0], bot[i][1]);
    p.closePath();
    addLine(q, bot);
    for (let i = low.length - 1; i >= 0; i--) q.lineTo(low[i][0], low[i][1]);
    q.closePath();
  });
  c.ctx.fillStyle = soft;
  c.ctx.fill(q);
  c.ctx.fillStyle = deep;
  c.ctx.fill(p);
}

/** Colour: joints in the hard beds, a dark crack with a lit lip to its right; rust stains and dark seeps run down from some. */
function paintJoints(c: PlateCanvas, f: Face): void {
  const dark = new Path2D();
  const lip = new Path2D();
  const seep = new Path2D();
  const rust = new Path2D();
  const unit = c.pen(1);
  for (const j of f.joints) {
    const a = atH(f, j.i, j.hi);
    const z = atH(f, j.i, j.lo);
    dark.moveTo(a[0], a[1]);
    dark.lineTo(z[0], z[1]);
    lip.moveTo(a[0] + unit * 0.9, a[1]);
    lip.lineTo(z[0] + unit * 0.9, z[1]);
    if (!j.stain) continue;
    const left: Pt[] = [];
    const right: Pt[] = [];
    const ii = Math.min(f.ns.length - 1, j.i + 1);
    for (let k = 0; k <= 4; k++) {
      const h = j.lo - (j.len * k) / 4;
      if (h < f.talusH[j.i]) break;
      const wk = j.w * (1 - k / 5);
      const L = atH(f, j.i, h);
      const R = atH(f, ii, h);
      const dx = (R[0] - L[0]) * (wk / STEP);
      left.push([L[0] - dx * 0.2, L[1]]);
      right.push([L[0] + dx * 0.8, L[1]]);
    }
    if (left.length > 1)
      addLine(j.stain === 2 ? rust : seep, [...left, ...right.reverse()], true);
  }
  stroke(c, dark, 0.65, css(hazed(rgbOf("#5f5a68"), 1350)), 0.3);
  stroke(c, lip, 0.5, "#fff0cc", 0.2);
  c.ctx.fillStyle = css(hazed(rgbOf("#6f655a"), 1350), 0.2);
  c.ctx.fill(seep);
  c.ctx.fillStyle = css(hazed(rgbOf("#b98a52"), 1350), 0.22);
  c.ctx.fill(rust);
}

/** Colour: dark streaks from the turf down the upper beds, where rain runs off the brow. */
function paintStreaks(c: PlateCanvas, f: Face): void {
  const rng = createRng(931);
  const p = new Path2D();
  for (let n = N_MAX - rng() * 10; n > 80; n -= 4 + rng() * 22) {
    const i = indexOf(f, n);
    const ii = Math.min(f.ns.length - 1, i + 1);
    const top = f.top[i] - 0.8;
    const len = 4 + rng() ** 1.5 * 14;
    const w = 0.6 + rng() * 2.2;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const h = top - (len * k) / 6;
      if (h < f.talusH[i] + 1) break;
      const wk = w * (1 - (k / 7) ** 0.8) * (0.8 + 0.4 * rng());
      const L = atH(f, i, h);
      const R = atH(f, ii, h);
      const dx = (R[0] - L[0]) / STEP;
      left.push([L[0] - dx * wk * 0.5, L[1]]);
      right.push([L[0] + dx * wk * 0.5, L[1]]);
    }
    if (left.length > 2) addLine(p, [...left, ...right.reverse()], true);
  }
  c.ctx.fillStyle = css(hazed(rgbOf("#6c6352"), 1350), 0.14);
  c.ctx.fill(p);
}

const GRASS_LIT = rgbOf("#b3a85f");
const GRASS_SHADE = rgbOf("#6c7660");
const SCRUB = rgbOf("#7d8455");
const SCRUB_SHADE = rgbOf("#56604f");

/** Colour: grass on the soft beds' slopes and tufts on the ledges; scrub down the gullies. */
function paintGreens(c: PlateCanvas, f: Face): void {
  const rng = createRng(941);
  BEDS.forEach((bed, b) => {
    if (bed.hard || b === 0) return;
    const s = bedBand(f, b);
    let j = Math.floor(rng() * 20);
    while (j < s.count - 4) {
      const len = 4 + Math.floor(rng() * 22);
      const k1 = Math.min(s.count - 1, j + len);
      if (rng() < 0.5) {
        const top: Pt[] = [];
        const bot: Pt[] = [];
        let light = 0;
        const rag = wobble(950 + j + b * 1000, [
          [16, 0.28],
          [7, 0.1],
        ]);
        for (let k = j; k <= k1; k++) {
          const t = (k - j) / Math.max(1, k1 - j);
          const ends = Math.min(1, Math.sin(Math.PI * t) * 2.5);
          const thick = Math.max(0.08, (0.35 + rag(k * STEP)) * ends);
          const hT = s.hTop[k] - 0.15;
          const hB =
            s.hTop[k] - (s.hTop[k] - s.hBot[k]) * Math.min(0.95, thick);
          const i = s.idx[k];
          top.push(atH(f, i, hT));
          bot.push(atH(f, i, Math.min(hT, hB)));
          light += s.light[k];
        }
        light /= k1 - j + 1;
        const col = hazed(lerp3(GRASS_SHADE, GRASS_LIT, light), 1350);
        fill(c, band(top, bot), css(col, 0.55 + rng() * 0.3));
        const edge = new Path2D();
        addLine(edge, bot);
        stroke(c, edge, 0.6, css(hazed(GRASS_SHADE, 1350)), 0.35);
      }
      j = k1 + 2 + Math.floor(rng() * 14);
    }
  });
  // Tufts along the ledges' tops.
  const tufts = new Path2D();
  BEDS.forEach((bed, b) => {
    if (!bed.hard || b === BEDS.length - 1) return;
    for (let n = N_MAX - rng() * 9; n > N_MIN + 40; n -= 3 + rng() * 14) {
      const i = indexOf(f, n);
      const h = f.bh[b + 1][i];
      if (h > f.top[i] - 1 || h < f.talusH[i]) continue;
      const a = atH(f, i, h);
      const w = (0.8 + rng() * 2.4) * c.pen(1.5);
      const hgt = (0.4 + rng() * 0.8) * c.pen(1.5);
      tufts.moveTo(a[0] - w, a[1] - hgt * 0.3);
      tufts.quadraticCurveTo(a[0], a[1] + hgt, a[0] + w, a[1] - hgt * 0.4);
      tufts.closePath();
    }
  });
  c.ctx.fillStyle = css(hazed(GRASS_LIT, 1350), 0.75);
  c.ctx.fill(tufts);
  paintScrub(c, f);
}

/** Colour: scrub up each gully's floor from the talus, a dark mass with a lumpy top lit on its upper left, a few bushes above it. */
function paintScrub(c: PlateCanvas, f: Face): void {
  const rng = createRng(945);
  const dark = new Path2D();
  const lit = new Path2D();
  for (const cut of f.cuts) {
    if (!cut.gully) continue;
    const ia = indexOf(f, cut.n);
    const top = f.top[ia];
    const foot = f.talusH[ia] - 1.5;
    const reach = cut.h0 + (top - cut.h0) * (0.22 + rng() * 0.15);
    // The mass: between the gully's lips from the foot up to `reach`, its top in lumps.
    const left: Pt[] = [];
    const right: Pt[] = [];
    const K = 6;
    for (let k = 0; k <= K; k++) {
      const h = foot + ((reach - foot) * k) / K;
      const v = smoothstep(cut.h0, cut.h0 + 0.55 * (top - cut.h0), h);
      const widen = 0.3 + 0.7 * v;
      // Spilling out over the talus at its foot, narrowing up the V.
      const spill = 1 + 1.6 * (1 - k / K) ** 2.5;
      const jl = 0.85 + rng() * 0.3;
      const jr = 0.85 + rng() * 0.3;
      left.push(
        atH(f, indexOf(f, cut.n + cut.wn * widen * 0.85 * spill * jl), h),
      );
      right.push(
        atH(f, indexOf(f, cut.n - cut.ws * widen * 0.7 * spill * jr), h),
      );
    }
    const mass: Pt[] = [...left];
    const a = left[K];
    const z = right[K];
    const lumps = 3 + Math.floor(rng() * 3);
    for (let k = 1; k < lumps; k++) {
      const t = k / lumps;
      const r = Math.abs(z[0] - a[0]) / lumps;
      mass.push([
        a[0] + (z[0] - a[0]) * (t - 0.5 / lumps),
        a[1] + (z[1] - a[1]) * t + r * (0.5 + rng() * 0.5),
      ]);
      mass.push([a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t + r * 0.1]);
    }
    mass.push(...right.slice().reverse());
    addLine(dark, mass, true);
    // Its lit upper left.
    for (let k = 0; k < lumps; k++) {
      const t = (k + 0.3) / lumps;
      const r = Math.abs(z[0] - a[0]) / lumps;
      const x = a[0] + (z[0] - a[0]) * t;
      const y = a[1] + (z[1] - a[1]) * t;
      bush(lit, x - r * 0.15, y + r * 0.25, r * 0.45, r * 0.35, rng);
    }
    // Bushes clinging higher up.
    for (let k = 0; k < 4; k++) {
      if (rng() < 0.4) continue;
      const h = reach + 1 + rng() * (top - reach) * 0.45;
      const n = cut.n + (rng() - 0.2) * cut.wn * 0.7;
      const p = atH(f, indexOf(f, n), h);
      const r = c.pen(1.2 + rng() * 2.2);
      bush(dark, p[0], p[1], r, r * 0.65, rng);
      bush(lit, p[0] - r * 0.2, p[1] + r * 0.2, r * 0.55, r * 0.4, rng);
    }
  }
  c.ctx.fillStyle = css(hazed(SCRUB_SHADE, 1350), 0.82);
  c.ctx.fill(dark);
  c.ctx.fillStyle = css(hazed(SCRUB, 1350), 0.7);
  c.ctx.fill(lit);
}

/** Adds a bush: a lumpy rounded shape about `rx` by `ry`, its foot flattish. */
function bush(
  p: Path2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rng: () => number,
): void {
  const k = 11;
  const lean = (rng() - 0.5) * 0.5;
  for (let j = 0; j <= k; j++) {
    const a = Math.PI * (j / k) + lean * Math.sin((Math.PI * j) / k);
    const bump = 0.72 + rng() * 0.5;
    const px = x + Math.cos(a) * rx * bump;
    const py = y + Math.sin(a) * ry * bump;
    if (j === 0) p.moveTo(px, py - ry * 0.25);
    else p.lineTo(px, py);
  }
  p.lineTo(x - rx * 0.9, y - ry * 0.3);
  p.closePath();
}

const DEBRIS = rgbOf("#c6ae88");

/** A debris fan under a cut: its outline (concave flanks spreading to the foot) and its north flank. */
function fanOf(
  f: Face,
  cut: Cut,
): { shape: Path2D; flank: Path2D; apex: Pt; left: Pt; right: Pt } {
  const i = indexOf(f, cut.n);
  const apex = atH(f, i, f.talusH[i] - 0.3);
  const half = (cut.wn + cut.ws) * 0.5 * (cut.gully ? 1.6 : 1.15);
  const left = f.talusFoot[indexOf(f, cut.n + half)];
  const right = f.talusFoot[indexOf(f, cut.n - half)];
  const shape = new Path2D();
  shape.moveTo(left[0], left[1]);
  shape.quadraticCurveTo(
    apex[0] - (apex[0] - left[0]) * 0.3,
    left[1] + (apex[1] - left[1]) * 0.18,
    apex[0] - (apex[0] - left[0]) * 0.06,
    apex[1],
  );
  shape.quadraticCurveTo(
    apex[0],
    apex[1] + (apex[1] - left[1]) * 0.05,
    apex[0] + (right[0] - apex[0]) * 0.06,
    apex[1],
  );
  shape.quadraticCurveTo(
    apex[0] + (right[0] - apex[0]) * 0.3,
    right[1] + (apex[1] - right[1]) * 0.18,
    right[0],
    right[1],
  );
  shape.closePath();
  const flank = new Path2D();
  const mid: Pt = [
    left[0] + (right[0] - left[0]) * 0.3,
    left[1] + (right[1] - left[1]) * 0.3,
  ];
  flank.moveTo(left[0], left[1]);
  flank.quadraticCurveTo(
    apex[0] - (apex[0] - left[0]) * 0.3,
    left[1] + (apex[1] - left[1]) * 0.18,
    apex[0] - (apex[0] - left[0]) * 0.06,
    apex[1],
  );
  flank.quadraticCurveTo(
    apex[0] - (apex[0] - mid[0]) * 0.5,
    mid[1] + (apex[1] - mid[1]) * 0.3,
    mid[0],
    mid[1],
  );
  flank.closePath();
  return { shape, flank, apex, left, right };
}
const DEBRIS_FRESH = rgbOf("#d9c197");
const DEBRIS_SHADE = rgbOf("#8d8488");

/** Colour: the talus of fallen rock and slumped clay along the foot, cones under the gullies, grass on the old slumps. */
function paintTalus(c: PlateCanvas, f: Face): void {
  const rng = createRng(951);
  const ctx = c.ctx;
  const shape = band(f.talusTop, f.talusFoot);
  ctx.fillStyle = vertical(c, 18, 0, [
    css(hazed(lerp3(DEBRIS, DEBRIS_SHADE, 0.12), 1350)),
    css(hazed(DEBRIS, 1350)),
    css(hazed(lerp3(DEBRIS, DEBRIS_SHADE, 0.3), 1350)),
  ]);
  ctx.fill(shape);
  ctx.save();
  ctx.clip(shape);
  // Debris fans under the gullies and big clefts: concave aprons, a little
  // paler than the old talus, their north flanks turned from the sun.
  for (const cut of f.cuts) {
    if (!cut.gully && cut.depth < 5) continue;
    const fan = fanOf(f, cut);
    fill(c, fan.shape, css(hazed(DEBRIS_FRESH, 1350), 0.55));
    fill(c, fan.flank, css(hazed(DEBRIS_SHADE, 1350), 0.22));
  }
  // Grass over the older slumps, lit along their tops.
  let i = Math.floor(rng() * 30);
  while (i < f.ns.length - 6) {
    const len = 8 + Math.floor(rng() * 40);
    const i1 = Math.min(f.ns.length - 1, i + len);
    if (rng() < 0.55) {
      const top: Pt[] = [];
      const bot: Pt[] = [];
      for (let k = i; k <= i1; k++) {
        const t = (k - i) / Math.max(1, i1 - i);
        const bulge = Math.sin(Math.PI * t) ** 0.7;
        const a = f.talusTop[k];
        const z = f.talusFoot[k];
        const s0 = 0.05 + 0.25 * (1 - bulge);
        const s1 = 0.35 + 0.55 * bulge;
        top.push([a[0] + (z[0] - a[0]) * s0, a[1] + (z[1] - a[1]) * s0]);
        bot.push([a[0] + (z[0] - a[0]) * s1, a[1] + (z[1] - a[1]) * s1]);
      }
      fill(
        c,
        band(top, bot),
        css(hazed(lerp3(GRASS_SHADE, GRASS_LIT, 0.75), 1350), 0.6),
      );
      const lip = new Path2D();
      addLine(lip, top);
      stroke(c, lip, 0.6, css(hazed(rgbOf("#d6c77a"), 1350)), 0.45);
    }
    i = i1 + 3 + Math.floor(rng() * 20);
  }
  // Rubble: small stones, lit to the left.
  const stones = new Path2D();
  const shade = new Path2D();
  for (let k = 0; k < f.ns.length; k += 1) {
    if (rng() > 0.45) continue;
    const a = f.talusTop[k];
    const z = f.talusFoot[k];
    const t = 0.3 + rng() * 0.7;
    const x = a[0] + (z[0] - a[0]) * t;
    const y = a[1] + (z[1] - a[1]) * t;
    const r = (0.35 + rng() * 0.8) * c.pen(1.5);
    stones.moveTo(x - r, y);
    stones.lineTo(x - r * 0.6, y + r * 0.9);
    stones.lineTo(x + r * 0.5, y + r * 0.8);
    stones.lineTo(x + r, y);
    stones.closePath();
    shade.moveTo(x + r * 0.15, y);
    shade.lineTo(x + r * 0.5, y + r * 0.8);
    shade.lineTo(x + r, y);
    shade.closePath();
  }
  fill(c, stones, css(hazed(rgbOf("#dcc49a"), 1350)), 0.85);
  fill(c, shade, css(hazed(DEBRIS_SHADE, 1350)), 0.7);
  ctx.restore();
  // The talus's top where it leans on the face: a soft cool line.
  const seam = new Path2D();
  addBroken(seam, f.talusTop, 10, 2, rng);
  stroke(c, seam, 0.8, css(hazed(DEBRIS_SHADE, 1350)), 0.35);
}

function vertical(
  c: PlateCanvas,
  yTop: number,
  yBot: number,
  stops: readonly string[],
): CanvasGradient {
  const g = c.ctx.createLinearGradient(0, yTop, 0, yBot);
  stops.forEach((s, k) => {
    g.addColorStop(k / (stops.length - 1), s);
  });
  return g;
}

const SAND = rgbOf("#e2cb9c");
const SAND_DAMP = rgbOf("#c4b293");

/** Colour: the beach under the cliff, above the high-water line: dry sand and shingle, the wrack line. */
function paintBeach(c: PlateCanvas, f: Face): void {
  const rng = createRng(961);
  fill(
    c,
    band(f.talusFoot, f.hw),
    vertical(c, 2, -6, [
      css(hazed(SAND, 1350)),
      css(hazed(lerp3(SAND, SAND_DAMP, 0.5), 1350)),
      css(hazed(SAND_DAMP, 1350)),
    ]),
  );
  const shingle = new Path2D();
  for (const t of [0.35, 0.62, 0.8]) {
    const pts = f.talusFoot.map(
      (a, k) =>
        [a[0] + (f.hw[k][0] - a[0]) * t, a[1] + (f.hw[k][1] - a[1]) * t] as Pt,
    );
    addBroken(shingle, pts, 5, 4, rng, () => 0.6);
  }
  stroke(c, shingle, 0.6, css(hazed(rgbOf("#a99a85"), 1350)), 0.4);
  const wrack = new Path2D();
  addBroken(
    wrack,
    f.hw.map(([x, y]) => [x, y + 0.6] as Pt),
    3,
    1.2,
    rng,
  );
  stroke(c, wrack, 0.9, css(hazed(rgbOf("#6e6458"), 1350)), 0.5);
}

/** Colour: the turf and soil capping the brow, the sod overhanging, grass hanging down; the strip of ground behind. */
function paintBrow(c: PlateCanvas, f: Face): void {
  const rng = createRng(971);
  // The ground behind the brow, up to the batteries' line.
  fill(c, band(f.back, f.edge), css(hazed(rgbOf("#bdb063"), 1400)));
  const soil: Pt[] = [];
  const grass: Pt[] = [];
  const shade: Pt[] = [];
  const w = wobble(973, [
    [40, 0.35],
    [13, 0.2],
  ]);
  for (let i = 0; i < f.ns.length; i++) {
    const top = f.top[i];
    const g = 0.5 + Math.max(0, w(f.ns[i])) * 0.6;
    const s = g + 0.9 + Math.max(0, -w(f.ns[i] + 50)) * 0.9;
    grass.push(atH(f, i, Math.max(FOOT, top - g)));
    soil.push(atH(f, i, Math.max(FOOT, top - s)));
    shade.push(atH(f, i, Math.max(FOOT, top - s - 0.7)));
  }
  fill(c, band(soil, shade), css(hazed(rgbOf("#7a6c66"), 1350), 0.45));
  fill(c, band(grass, soil), css(hazed(rgbOf("#a98a5c"), 1350), 0.9));
  fill(c, band(f.edge, grass), css(hazed(rgbOf("#c2b467"), 1350)));
  // Grass hanging over the edge.
  const hang = new Path2D();
  for (let n = N_MAX - rng() * 5; n > N_MIN + 50; n -= 2 + rng() * 9) {
    const i = indexOf(f, n);
    const a = soil[i];
    const len = (0.6 + rng() * 2.2) * VEX * (1000 / f.ahead[i]);
    const wd = (0.6 + rng() * 1.6) * c.pen(1.5);
    hang.moveTo(a[0] - wd, a[1] + 0.3);
    hang.quadraticCurveTo(
      a[0] - wd * 0.2,
      a[1] - len * 0.6,
      a[0] + wd * 0.1,
      a[1] - len,
    );
    hang.quadraticCurveTo(
      a[0] + wd * 0.4,
      a[1] - len * 0.4,
      a[0] + wd,
      a[1] + 0.3,
    );
    hang.closePath();
  }
  fill(c, hang, css(hazed(rgbOf("#a69f5c"), 1350)), 0.8);
  const lip = new Path2D();
  addLine(lip, f.edge);
  stroke(c, lip, 0.8, css(hazed(rgbOf("#e2d38a"), 1350)), 0.6);
}

/** The face's colour jobs, beach first, in paint order. */
export function faceColourJobs(get: () => Face): PlateJob[] {
  const jobs: PlateJob[] = [
    (c) => paintBeach(c, get()),
    (c) => {
      const f = get();
      fill(c, band(f.edge, f.base), css(hazed(M.sand.lit, 1350)));
    },
  ];
  for (let b = 0; b < BEDS.length; b++) jobs.push((c) => paintBed(c, get(), b));
  jobs.push(
    (c) => paintWeather(c, get()),
    (c) => paintOverhangs(c, get()),
    (c) => paintJoints(c, get()),
    (c) => paintStreaks(c, get()),
    (c) => paintGreens(c, get()),
    (c) => paintTalus(c, get()),
    (c) => paintBrow(c, get()),
  );
  return jobs;
}

// ------------------------------------------------------------ the engraving

/**
 * Ink: hatching down the fall line over one bed where the face turns from
 * the sun, closer and heavier the deeper the shade, crossed in the
 * deepest; sparse short strokes over the lit rock, so the paper shows.
 */
function engraveBed(
  c: PlateCanvas,
  f: Face,
  b: number,
  rng: () => number,
  out: { light: Path2D; dark: Path2D; cross: Path2D; grain: Path2D },
): void {
  const s = bedBand(f, b);
  if (s.count < 2) return;
  const bed = BEDS[b];
  const unit = c.pen(1);
  const grainAt = field(1013 + b, 40, 2);
  let j = 0;
  let x = s.x[0] + rng() * 2 * unit;
  const xEnd = s.x[s.count - 1];
  let crossNext = x;
  while (x < xEnd) {
    while (j < s.count - 2 && s.x[j + 1] < x) j++;
    const t = Math.min(
      1,
      Math.max(0, (x - s.x[j]) / (s.x[j + 1] - s.x[j] || 1)),
    );
    const L = s.light[j] + (s.light[j + 1] - s.light[j]) * t;
    const yT = s.top[j] + (s.top[j + 1] - s.top[j]) * t;
    const yB = s.bot[j] + (s.bot[j + 1] - s.bot[j]) * t;
    const tall = yT - yB;
    const tone = bed.hard ? L : L * 0.84;
    if (tall > 0.6 * unit) {
      if (tone < 0.64) {
        const target = tone < 0.3 ? out.dark : out.light;
        const inset = rng() * 0.25 * tall;
        target.moveTo(x, yT - inset * 0.3);
        target.lineTo(x + (rng() - 0.5) * 0.4 * unit, yB + inset * 0.2);
        if (tone < 0.22 && x >= crossNext) {
          out.cross.moveTo(x - tall * 0.3, yT);
          out.cross.lineTo(x + tall * 0.3, yB);
          crossNext = x + 2.6 * unit;
        }
      } else if (bed.hard && grainAt(x, yB) > 0.35 && rng() < 0.45) {
        // Lit rock: a short grain stroke rising from the bed's base, in patches.
        const h = tall * (0.15 + rng() * 0.35);
        out.grain.moveTo(x, yB + tall * 0.12);
        out.grain.lineTo(x, yB + tall * 0.12 + h);
      } else if (!bed.hard && grainAt(x, yB + 50) > 0.1 && rng() < 0.4) {
        // Lit clay: a short stroke along the bed.
        const y = yB + tall * (0.2 + rng() * 0.6);
        out.grain.moveTo(x, y);
        out.grain.lineTo(x + (1.5 + rng() * 2) * unit, y);
      }
    }
    const step = tone < 0.64 ? 1.25 + 2.9 * tone : bed.hard ? 2.6 : 3.4;
    x += step * unit * (0.88 + rng() * 0.24);
  }
}

/** Ink: the beds' lines along the face: firm where a hard bed overhangs, its shade under it in short close strokes; fine and broken elsewhere, with a little bedding inside the thick beds. */
function engraveStrata(c: PlateCanvas, f: Face): void {
  const rng = createRng(1011);
  const firm = new Path2D();
  const fine = new Path2D();
  const ticks = new Path2D();
  const unit = c.pen(1);
  BEDS.forEach((bed, b) => {
    if (b === 0) return;
    const over = bed.hard ? overhang(b) : () => 0;
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) addBroken(firm, run, 14, 1.4, rng, () => 0.95);
      run = [];
    };
    const plain: Pt[] = [];
    let lastTick = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < f.ns.length; i++) {
      const h = f.bh[b][i];
      const visible = h < f.top[i] - 0.2 && h > f.talusH[i];
      const p = atH(f, i, Math.min(f.top[i], Math.max(f.talusH[i], h)));
      plain.push(p);
      const t = over(f.ns[i]);
      if (visible && t > 0.18) {
        run.push(p);
        if (p[0] - lastTick > 1.3 * unit && rng() < 0.85) {
          const q = atH(
            f,
            i,
            Math.max(f.talusH[i], h - (t + 0.4) * (0.5 + rng() * 0.9)),
          );
          ticks.moveTo(p[0], p[1]);
          ticks.lineTo(q[0], q[1]);
          lastTick = p[0];
        }
      } else flush();
    }
    flush();
    if (!bed.hard) addBroken(fine, plain, 9, 2.5, rng, () => 0.75);
    else addBroken(fine, plain, 4, 5, rng, () => 0.5);
    if (bed.hard) {
      const thick = BEDS[b + 1] ? BEDS[b + 1].h - bed.h : 8;
      const inner = thick > 4 ? 2 : thick > 2.2 ? 1 : 0;
      for (let k = 1; k <= inner; k++) {
        const line: Pt[] = [];
        for (let i = 0; i < f.ns.length; i++) {
          const h =
            f.bh[b][i] + ((f.bh[b + 1][i] - f.bh[b][i]) * k) / (inner + 1);
          line.push(atH(f, i, Math.min(f.top[i], Math.max(f.talusH[i], h))));
        }
        addBroken(fine, line, 5, 4, rng, () => 0.45);
      }
    }
  });
  stroke(c, ticks, 0.5, INK.hatch, 0.75);
  stroke(c, firm, 0.85, INK.line, 0.85);
  stroke(c, fine, 0.5, INK.hatch, 0.55);
}

/** Ink: the joints in the hard beds, a short stroke for most. */
function engraveJoints(c: PlateCanvas, f: Face): void {
  const p = new Path2D();
  f.joints.forEach((j, k) => {
    if (k % 5 === 1) return;
    const m = (j.hi - j.lo) * 0.15;
    const a = atH(f, j.i, j.hi - m);
    const z = atH(f, j.i, j.lo + m);
    p.moveTo(a[0], a[1]);
    p.lineTo(z[0], z[1]);
  });
  stroke(c, p, 0.5, INK.line, 0.6);
}

/** Ink: the talus, strokes down its slope; the fans' runnels; the old slumps' grass in ticks. */
function engraveTalus(c: PlateCanvas, f: Face): void {
  const rng = createRng(1021);
  fill(c, band(f.talusTop, f.talusFoot), PAPER.low);
  const slope = new Path2D();
  for (let i = 0; i < f.ns.length; i += 1) {
    if (rng() > 0.5) continue;
    const a = f.talusTop[i];
    const z = f.talusFoot[i];
    const t0 = 0.05 + rng() * 0.3;
    const t1 = t0 + 0.25 + rng() * 0.4;
    slope.moveTo(a[0] + (z[0] - a[0]) * t0, a[1] + (z[1] - a[1]) * t0);
    slope.lineTo(a[0] + (z[0] - a[0]) * t1, a[1] + (z[1] - a[1]) * t1);
  }
  stroke(c, slope, 0.5, INK.hatch, 0.55);
  const fans = new Path2D();
  for (const cut of f.cuts) {
    if (!cut.gully && cut.depth < 5) continue;
    const { apex, left, right } = fanOf(f, cut);
    // The north flank, turned from the sun: a few strokes down it.
    for (let k = 1; k <= 3; k++) {
      const t = k / 11;
      const end: Pt = [
        left[0] + (right[0] - left[0]) * t,
        left[1] + (right[1] - left[1]) * t,
      ];
      fans.moveTo(
        apex[0] - (apex[0] - end[0]) * 0.15,
        apex[1] - (apex[1] - end[1]) * 0.15,
      );
      fans.quadraticCurveTo(
        apex[0] - (apex[0] - end[0]) * 0.75,
        end[1] + (apex[1] - end[1]) * 0.2,
        end[0],
        end[1],
      );
    }
  }
  stroke(c, fans, 0.5, INK.hatch, 0.6);
  const top = new Path2D();
  addBroken(top, f.talusTop, 8, 2.5, rng);
  stroke(c, top, 0.7, INK.line, 0.6);
}

/** Ink: the beach, a few strokes of shingle and the wrack line, dotted. */
function engraveBeach(c: PlateCanvas, f: Face): void {
  const rng = createRng(1031);
  fill(c, band(f.talusFoot, f.hw), PAPER.low);
  const s = new Path2D();
  for (const t of [0.4, 0.75]) {
    const pts = f.talusFoot.map(
      (a, k) =>
        [a[0] + (f.hw[k][0] - a[0]) * t, a[1] + (f.hw[k][1] - a[1]) * t] as Pt,
    );
    addBroken(s, pts, 2.5, 4, rng, () => 0.5);
  }
  stroke(c, s, 0.45, INK.hatch, 0.5);
  const wrack = new Path2D();
  addBroken(
    wrack,
    f.hw.map(([x, y]) => [x, y + 0.6] as Pt),
    0.8,
    1.2,
    rng,
  );
  stroke(c, wrack, 0.65, INK.hatch, 0.7);
}

/** Ink: the brow's contour, firm; the turf in short ticks; the sod's shade. */
function engraveBrow(c: PlateCanvas, f: Face): void {
  const rng = createRng(1041);
  fill(c, band(f.back, f.edge), PAPER.low);
  const ticks = new Path2D();
  const sod = new Path2D();
  for (let i = 0; i < f.ns.length; i += 1) {
    const a = f.edge[i];
    if (rng() < 0.55) {
      const len = (0.8 + rng() * 1.6) * c.pen(1);
      ticks.moveTo(a[0], a[1] - 0.2 * c.pen(1));
      ticks.lineTo(a[0] + (rng() - 0.3) * len * 0.6, a[1] - len);
    }
    if (rng() < 0.7) {
      const b = atH(f, i, Math.max(FOOT, f.top[i] - 1.6 - rng() * 0.8));
      sod.moveTo(b[0], b[1]);
      sod.lineTo(b[0], b[1] - (0.6 + rng()) * c.pen(1));
    }
  }
  stroke(c, ticks, 0.5, INK.hatch, 0.7);
  stroke(c, sod, 0.55, INK.line, 0.6);
  const edge = new Path2D();
  addLine(edge, f.edge);
  stroke(c, edge, 1.35, INK.line, 0.92);
  const back = new Path2D();
  addBroken(back, f.back, 6, 3, rng, () => 0.6);
  stroke(c, back, 0.5, INK.hatch, 0.45);
}

/** The face's ink jobs, in paint order. */
export function faceInkJobs(get: () => Face): PlateJob[] {
  const jobs: PlateJob[] = [
    (c) => engraveBeach(c, get()),
    (c) => {
      const f = get();
      fill(c, band(f.edge, f.base), PAPER.low);
    },
  ];
  for (let b = 0; b < BEDS.length; b += 4) {
    jobs.push((c) => {
      const f = get();
      const rng = createRng(1001 + b);
      const out = {
        light: new Path2D(),
        dark: new Path2D(),
        cross: new Path2D(),
        grain: new Path2D(),
      };
      for (let k = b; k < Math.min(BEDS.length, b + 4); k++)
        engraveBed(c, f, k, rng, out);
      stroke(c, out.grain, 0.45, INK.hatch, 0.45);
      stroke(c, out.light, 0.5, INK.hatch, 0.8);
      stroke(c, out.dark, 0.65, INK.line, 0.75);
      stroke(c, out.cross, 0.5, INK.line, 0.6);
    });
  }
  jobs.push(
    (c) => engraveStrata(c, get()),
    (c) => engraveJoints(c, get()),
    (c) => engraveTalus(c, get()),
    (c) => engraveBrow(c, get()),
  );
  return jobs;
}
