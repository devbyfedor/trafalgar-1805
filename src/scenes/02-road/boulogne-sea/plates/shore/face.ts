import { createRng, field, type Pt, wobble } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";
import { project, VEX, viewOf } from "../../scene";
import { addBroken, addLine, band, fill, poly, stroke } from "./draw";
import { edgeAt, northUp, shoreAt, smoothstep } from "./terrain";
import { css, hazed, lerp3, type RGB, rgbOf, scale3 } from "./tone";

/**
 * The cliff face north of the harbour, sample by sample along it: a few
 * distinct units, as the Boulonnais shows them (history-notes, "The
 * cliffs": grey, brown, yellow and reddish beds): a dark grey-olive clay
 * at the foot, slumped and grassed; a thin rusty sandstone; a thick
 * golden sandstone in blocks in the middle of the face; grey shaly
 * partings; a second sandstone; a grey-brown marl; a pale limestone under
 * a rubbly cap. No bed keeps its thickness or its edge for long: each
 * swells and thins along the face, a hard bed's top steps from block to
 * block at its joints, here and there a hard bed has collapsed and the
 * soft bed above has slumped into the gap, and in a few bays the upper
 * beds are gone and a grassed slump fills down to a ledge. Clefts open
 * along joints through a bed or two; gullies cut the face as V's from
 * the brow to their floors of scrub and clay.
 *
 * The light follows the form, block by block, as the vessels' planks
 * each take their own tone: every block of a hard bed is a facet turned a
 * little about the vertical, and takes its light from how square it then
 * stands to the sun (azimuth 294, behind the eye); a gully's or a cleft's
 * north wall (to the left of it, as seen) is turned to the south, into
 * the sky's cool shade. The soft beds lie back under the hard ones,
 * cooler and darker, in the hard beds' shadow.
 *
 * The engraving draws the same face: the beds' lines, firm under the hard
 * ones; hatching down the fall line where the face turns from the sun,
 * closer and heavier the deeper the shade; the joints; the talus's slope;
 * the brow's contour.
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
  clay: mat("#8f8471", "#3b3a41"),
  shale: mat("#b4a387", "#46413f"),
  rust: mat("#d29f69", "#4a3f40"),
  gold: mat("#e5b170", "#4e4648"),
  warm: mat("#dcab6f", "#4c4546"),
  marl: mat("#bba483", "#484342"),
  lime: mat("#e6d3a8", "#55525b"),
  cap: mat("#d6bd8c", "#4e494a"),
} as const;

/** Local colours a block takes over its material's: fresh rock where it has lately fallen, weathered grey, a rust stain. */
const FRESH = rgbOf("#f0c27c");
const WEATHERED = rgbOf("#b8ae9f");
const RUST = rgbOf("#c58450");
/** A dark wet stain where water seeps out over a clay. */
const STAINED = rgbOf("#6f6458");
/** A soft slope greened over. */
const GREENED = rgbOf("#8f9258");

interface Bed {
  /** Its base, true metres above high water at n = 500 (the beds dip gently north). */
  h: number;
  m: Material;
  hard: boolean;
  /** A hard bed's mean spacing of joints, metres: wide in the thick beds. */
  joint?: number;
  /** How far a soft bed's slope lies back from the sun (its share of a wall's light; 0.62 by default). */
  back?: number;
}

/** The beds, bottom up. */
const BEDS: readonly Bed[] = [
  { h: 0, m: M.clay, hard: false },
  { h: 8, m: M.rust, hard: true, joint: 6 },
  { h: 10.6, m: M.shale, hard: false },
  { h: 13, m: M.gold, hard: true, joint: 16 },
  { h: 24.2, m: M.shale, hard: false },
  { h: 25.8, m: M.warm, hard: true, joint: 11 },
  { h: 32, m: M.marl, hard: false },
  { h: 36.2, m: M.lime, hard: true, joint: 8 },
  { h: 46.6, m: M.cap, hard: false, back: 0.88 },
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
    [1005, 26, 22, 13, 9],
    [905, 18, 16, 9, 12],
    [748, 30, 26, 15, 7],
    [540, 22, 20, 11, 10],
    [292, 16, 16, 8, 13],
  ];

/** Landslip bays: n of their middle, half-width, the bed whose top is the ledge the slump comes down to, the brow's drop (m). */
const BAYS: readonly (readonly [number, number, number, number])[] = [
  [800, 22, 5, 6],
  [583, 20, 5, 4],
  [150, 24, 3, 5],
];

/** A soft reach's local colour: sand washed down from above, weathered grey, greened over, rust-stained. */
function softTint(rng: () => number): { tint: RGB; tintK: number } {
  const r = rng();
  if (r < 0.32) return { tint: FRESH, tintK: 0.12 + rng() * 0.3 };
  if (r < 0.6) return { tint: WEATHERED, tintK: rng() * 0.2 };
  if (r < 0.82) return { tint: GREENED, tintK: 0.2 + rng() * 0.3 };
  return { tint: RUST, tintK: 0.1 + rng() * 0.18 };
}

/** A stretch of a bed painted as one facet: a block of a hard bed between its joints, a reach of a soft one. */
interface Block {
  i0: number;
  i1: number;
  /** The facet's turn about the vertical, radians. */
  turn: number;
  /** Its local colour and how far toward it. */
  tint: RGB;
  tintK: number;
  /** Its light, 0..1, set in the third stage. */
  light: number;
  /** A crack at its left joint. */
  crack: boolean;
}

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
  /** Joints in the hard beds drawn as cracks: their sample and their ends' true heights. */
  joints: Joint[];
  /** The bed boundaries clamped to the face (its foot to its brow), true metres, [boundary][sample]. */
  hc: number[][];
  /** Their points, layer units. */
  bp: Pt[][];
  /** Each bed's light at its mid-height, [bed][sample]. */
  light: number[][];
  /** The face's east at each clamped boundary, [boundary][sample]. */
  eb: number[][];
  /** Each bed's blocks (hard) or reaches (soft), north to south. */
  blocks: Block[][];
  /** Erosion bites: the hard bed, its samples, and its top before it fell. */
  bites: { b: number; i0: number; i1: number; was: number[] }[];
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
  // A gully is a V: wide and deep at the brow, narrowing all the way to its floor.
  let widen = 1;
  if (c.gully) {
    v = smoothstep(c.h0 - 1, top, h);
    widen = 0.15 + 0.85 * v;
    v = 0.25 + 0.75 * v;
    if (h < c.h0 - 1) return 0;
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

/** How square a facet stands to the sun, 0 (shade) to 1: the face's slope in plan `dedn` (east per metre north), turned `turn` about the vertical. */
function facetLight(dedn: number, turn: number): number {
  const len = Math.hypot(1, dedn);
  const ne = -1 / len;
  const nn = dedn / len;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const re = ne * c - nn * s;
  const rn = ne * s + nn * c;
  const lit = re * SUN_E + rn * SUN_N;
  return Math.min(1, Math.max(0, (lit - 0.05) / 0.86));
}

/** Sample index nearest to `n`. */
export function indexOf(f: Face, n: number): number {
  return Math.max(0, Math.min(f.ns.length - 1, Math.round((N_MAX - n) / STEP)));
}

/** The ground `back` metres behind the brow at `n`: its east (m) and its true height (m), following the brow's notches as they die away inland. */
export function browGround(
  f: Face,
  n: number,
  back: number,
): { e: number; h: number } {
  const i = indexOf(f, n);
  const top = f.top[i];
  const dip = (top - edgeTop(f, i)) * Math.exp(-back / 60);
  return { e: faceE(f, i, top) + back, h: edgeTop(f, i) + dip };
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

/** How far the cuts notch the brow at sample `i`: a crisp V at each gully. */
function notchAt(f: Face, i: number): number {
  let g = 0;
  const n = f.ns[i];
  for (const ci of f.near[i]) {
    const c = f.cuts[ci];
    if (c.notch <= 0) continue;
    const u = n >= c.n ? (n - c.n) / c.wn : (c.n - n) / c.ws;
    if (u < 1) g = Math.max(g, c.notch * (1 - u) ** 1.25);
  }
  return g;
}

/** Slump scars on the brow, where the turf has broken away: n of their middle, half-width, depth (m). */
const SCARS: readonly (readonly [number, number, number])[] = [
  [950, 10, 1.8],
  [690, 12, 2.2],
  [490, 9, 1.6],
];

/** How far a slump scar has bitten into the brow at `n`, metres: a concave bite. */
function scarDrop(n: number): number {
  let g = 0;
  for (const [m, half, depth] of SCARS) {
    const u = Math.abs(n - m) / half;
    if (u < 1) g = Math.max(g, depth * (1 - u * u));
  }
  return g;
}

/** How far a landslip bay has taken the brow down at `n`, metres. */
function bayDrop(n: number): number {
  let g = 0;
  for (const [m, half, , drop] of BAYS) {
    const u = Math.abs(n - m) / half;
    if (u < 1.25) g = Math.max(g, drop * (1 - smoothstep(0.55, 1.25, u)));
  }
  return g;
}

export function buildFace(): Face {
  const ns: number[] = [];
  for (let n = N_MAX; n >= N_MIN - 1e-6; n -= STEP) ns.push(n);
  const line = wobble(303, [
    [190, 10],
    [96, 4.5],
    [64, 1.8],
    [23, 0.6],
  ]);
  const plan = ns.map((n) => edgeAt(n)[0] + line(n) * smoothstep(60, 200, n));
  const f: Face = {
    ns,
    plan,
    top: [],
    cuts: [],
    near: ns.map(() => []),
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
    blocks: [],
    bites: [],
  };
  // Bed boundaries, bottom up: each bed's thickness swells and thins along
  // the face (by a third either way over a few hundred metres), so the
  // beds above rise and fall with the sum of those below; the whole dips
  // gently north.
  const lenses = BEDS.map((_, j) =>
    wobble(760 + j, [
      [260, 0.65],
      [130, 0.3],
      [47, 0.08],
    ]),
  );
  for (let j = 0; j <= BEDS.length; j++) {
    const row: number[] = [];
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i];
      if (j === 0) row.push(-5);
      else if (j === BEDS.length) row.push(999);
      else {
        const below = f.bh[j - 1][i];
        const nominal =
          BEDS[j].h - (j > 1 ? BEDS[j - 1].h : 0) - (j === 1 ? -5 : 0);
        // A thin soft bed pinches out here and there, the hard beds meeting.
        const thin = !BEDS[j - 1].hard && nominal < 3;
        const thick =
          nominal *
          (thin
            ? Math.max(0.05, 1 + 1.7 * lenses[j - 1](n))
            : 1 + 0.15 * lenses[j - 1](n));
        row.push(
          j === 1
            ? BEDS[1].h - DIP * (n - 500) + 1.6 * lenses[0](n)
            : Math.max(below + 0.4, below + thick),
        );
      }
    }
    f.bh.push(row);
  }
  return f;
}

/** The face's first stage, continued: the blocks and their steps, the bites, the cuts, the brow. */
export function carveFace(f: Face): void {
  const { ns } = f;
  // The hard beds' blocks between their joints; each block's top stepped
  // down by its own wear, so the bed's top is a staircase from joint to
  // joint; a few of the joints opened into clefts through the bed or two.
  const brng = createRng(331);
  BEDS.forEach((bed, b) => {
    const blocks: Block[] = [];
    if (!bed.hard) {
      let i = 0;
      while (i < ns.length - 1) {
        const len = Math.max(3, Math.round((10 + brng() * 34) / STEP));
        const i1 = Math.min(ns.length - 1, i + len);
        blocks.push({
          i0: i,
          i1,
          turn: (brng() - 0.5) * 0.12,
          ...softTint(brng),
          light: 0,
          crack: false,
        });
        i = i1;
      }
      f.blocks.push(blocks);
      return;
    }
    const spacing = bed.joint ?? 8;
    let i = 0;
    while (i < ns.length - 1) {
      const len = Math.max(
        2,
        Math.round((spacing * (0.45 + brng() * 1.1)) / STEP),
      );
      const i1 = Math.min(ns.length - 1, i + len);
      const r = brng();
      blocks.push({
        i0: i,
        i1,
        turn: (brng() - 0.5) * 2 * (0.17 + brng() * 0.35),
        tint: r < 0.45 ? FRESH : r < 0.85 ? WEATHERED : RUST,
        tintK: 0.08 + brng() * 0.26,
        light: 0,
        crack: brng() < 0.38,
      });
      // The block's top worn down by its own amount: a step at each joint.
      const wear = 0.3 + brng() ** 1.4 * 1.4;
      const thick = (k: number) => f.bh[b + 1][k] - f.bh[b][k];
      for (let k = i; k < i1; k++)
        f.bh[b + 1][k] -= Math.min(wear, thick(k) * 0.45);
      // A joint opened into a cleft through this bed and, now and then, the soft one over it.
      if (brng() < 0.13 && ns[i] > 60) {
        const depth = 1.2 + brng() ** 1.8 * 5.5;
        const through = brng() < 0.4 ? b + 2 : b + 1;
        const whole = brng() < 0.05;
        const atN = ns[i];
        f.cuts.push({
          n: atN,
          depth,
          wn: depth * (0.6 + brng() * 0.4),
          ws: depth * (1.1 + brng() * 0.6),
          h0: BEDS[b].h - DIP * (atN - 500) - 0.6,
          h1: whole
            ? TOP_OF_ALL
            : (BEDS[through]?.h ?? TOP_OF_ALL) - DIP * (atN - 500),
          notch: whole ? depth * 0.35 : 0,
          gully: false,
        });
      }
      i = i1;
    }
    f.blocks.push(blocks);
  });
  // Zones across several beds: a fresh scar where a mass has lately
  // fallen, rock weathered grey where it has stood longest, a dark wet
  // stain; their edges keep to each bed's own joints, so they step from
  // bed to bed and no edge runs down the face.
  const zrng = createRng(351);
  for (let k = 0; k < 9; k++) {
    const nC = 60 + zrng() * 980;
    const half = 10 + zrng() * 35;
    const b0 = 1 + Math.floor(zrng() * 5);
    const b1 = Math.min(BEDS.length - 1, b0 + 1 + Math.floor(zrng() * 4));
    const r = zrng();
    const tint = r < 0.4 ? FRESH : r < 0.8 ? WEATHERED : STAINED;
    const tintK = r < 0.4 ? 0.45 : r < 0.8 ? 0.5 : 0.35;
    for (let b = b0; b <= b1; b++) {
      const off = (zrng() - 0.5) * half * 0.7;
      const w = half * (0.55 + zrng() * 0.6);
      for (const blk of f.blocks[b]) {
        const mid = ns[Math.floor((blk.i0 + blk.i1) / 2)];
        if (Math.abs(mid - nC - off) < w) {
          blk.tint = tint;
          blk.tintK = Math.min(
            0.75,
            tintK * (BEDS[b].hard ? 1 : 0.7) + zrng() * 0.12,
          );
        }
      }
    }
  }
  // Erosion bites: a hard bed collapsed over 8–40 m, its top fallen nearly
  // to its base in steps, the soft bed above slumped into the gap.
  const hardBeds = BEDS.map((b, k) => (b.hard ? k : -1)).filter((k) => k > 0);
  const erng = createRng(341);
  for (let k = 0; k < 15; k++) {
    const b = hardBeds[Math.floor(erng() * hardBeds.length)];
    const mid = 80 + erng() * 920;
    if (GULLIES.some(([g, , w]) => Math.abs(mid - g) < w * 1.6)) continue;
    const half = 4 + erng() * 16;
    const steps = 2 + Math.floor(erng() * 2);
    const depth = 0.35 + erng() * 0.3;
    const i0 = indexOf(f, mid + half);
    const i1 = indexOf(f, mid - half);
    f.bites.push({ b, i0, i1, was: f.bh[b + 1].slice(i0, i1 + 1) });
    for (let i = i0; i <= i1; i++) {
      const u = Math.abs(ns[i] - mid) / half;
      if (u >= 1) continue;
      // A flat floor, its ends stepped down in a few treads.
      const fall = Math.ceil(smoothstep(1, 0.6, u) * steps) / steps;
      const lo = f.bh[b][i] + 0.35;
      const hi = f.bh[b + 1][i];
      f.bh[b + 1][i] = Math.max(lo, hi - (hi - lo) * depth * fall);
    }
  }
  // Gullies.
  for (const [n, depth, w, notch, floor] of GULLIES)
    f.cuts.push({
      n,
      depth,
      wn: w * 1.05,
      ws: w * 1.5,
      h0: floor,
      h1: TOP_OF_ALL,
      notch,
      gully: true,
    });
  f.cuts.forEach((c, k) => {
    const i0 = Math.max(0, Math.floor((N_MAX - c.n - c.wn) / STEP));
    const i1 = Math.min(ns.length - 1, Math.ceil((N_MAX - c.n + c.ws) / STEP));
    for (let i = i0; i <= i1; i++)
      if (ns[i] < c.n + c.wn && ns[i] > c.n - c.ws) f.near[i].push(k);
  });
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    // The brow, notched at the gullies, let down in the bays; at the
    // harbour's end it comes down to the quay.
    let h = edgeAt(n)[1];
    f.top.push(h);
    h -= notchAt(f, i) + bayDrop(n) + scarDrop(n);
    h += (FOOT + 0.4 - h) * smoothstep(46, N_MIN, n);
    f.top[i] = h;
  }
}

/** The face's second stage: the talus along its foot, the beds' points. */
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
      if (!c.gully && c.depth < 4) continue;
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
}

/** The face's second stage, continued: the beds' boundaries as points, each hard bed set out or back by its own measure. */
export function pointFace(f: Face, from = 0, to = f.bh.length): void {
  const { ns } = f;
  // The boundaries' points, once.
  const eb = f.eb;
  // Each hard bed stands out and falls back along the face by its own
  // measure, so its walls turn to the sun and from it in its own places,
  // the soft beds sloping between them: no two beds share a light.
  const setback = BEDS.map((bed, k) =>
    bed.hard
      ? wobble(980 + k, [
          [150, 4.5],
          [70, 3.4],
          [31, 1.2],
        ])
      : () => 0,
  );
  const last = f.bh.length - 1;
  for (let j = from; j < to; j++) {
    const hRow: number[] = [];
    const eRow: number[] = [];
    const pRow: Pt[] = [];
    const own =
      j === 0 || j === last
        ? null
        : BEDS[j].hard
          ? setback[j]
          : BEDS[j - 1].hard
            ? setback[j - 1]
            : null;
    for (let i = 0; i < ns.length; i++) {
      const h =
        j === last ? f.top[i] : Math.min(f.top[i], Math.max(FOOT, f.bh[j][i]));
      const fade =
        (1 - smoothstep(f.top[i] - 3, f.top[i], h)) *
        smoothstep(FOOT, FOOT + 3, h);
      const e = faceE(f, i, h) + (own ? own(ns[i]) * fade : 0);
      hRow.push(h);
      eRow.push(e);
      pRow.push(project(e, ns[i], h * VEX));
    }
    f.hc.push(hRow);
    f.bp.push(pRow);
    eb.push(eRow);
  }
}

/** The face's slope in plan for bed `b` at sample `i` (east per metre north, at the bed's mid-height). */
function dednAt(f: Face, b: number, i: number): number {
  const { ns, eb } = f;
  const i0 = Math.max(0, i - 1);
  const i1 = Math.min(ns.length - 1, i + 1);
  const e0 = (eb[b][i0] + eb[b + 1][i0]) / 2;
  const e1 = (eb[b][i1] + eb[b + 1][i1]) / 2;
  return (e0 - e1) / (ns[i0] - ns[i1]);
}

/** The face's third stage: each bed's light; its blocks split where a wall turns, each lit as a facet; the outlines and the joints. */
export function lineFace(f: Face): void {
  const { ns } = f;
  for (let b = 0; b < BEDS.length; b++) {
    const row: number[] = [];
    for (let i = 0; i < ns.length; i++)
      row.push(facetLight(dednAt(f, b, i), 0));
    f.light.push(row);
    // Split a block where the face turns (a cleft's or a gully's wall), so
    // each wall is a facet of its own, its light flat across it.
    const out: Block[] = [];
    for (const blk of f.blocks[b]) {
      let s = blk.i0;
      for (let i = blk.i0 + 1; i <= blk.i1; i++) {
        if (i === blk.i1 || Math.abs(row[i] - row[s]) > 0.14) {
          const e = i;
          if (e > s) {
            const mid = Math.floor((s + e) / 2);
            out.push({
              ...blk,
              i0: s,
              i1: e,
              crack: s === blk.i0 ? blk.crack : false,
              light: facetLight(dednAt(f, b, mid), blk.turn),
            });
          }
          s = e;
        }
      }
    }
    f.blocks[b] = out;
  }
}

/** The face's third stage, continued: the outlines, the talus's and the beach's lines, the cracks. */
export function edgeFace(f: Face): void {
  const { ns, eb } = f;
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
  // The cracks: the joints at the blocks' left ends drawn (one in three or so).
  const jr = createRng(921);
  BEDS.forEach((bed, b) => {
    if (!bed.hard) return;
    for (const blk of f.blocks[b]) {
      if (!blk.crack) continue;
      const i = blk.i0;
      const b0 = f.bh[b][i] + 0.2;
      const b1 = Math.min(f.top[i] - 0.4, f.bh[b + 1][i] - 0.1);
      const part = jr() < 0.45 ? 1 : 0.4 + jr() * 0.5;
      const hi = b1;
      const lo = b1 - (b1 - b0) * part;
      const r = jr();
      if (hi - lo < 0.5 || lo < f.talusH[i]) continue;
      f.joints.push({
        i,
        hi,
        lo,
        stain: r < 0.1 ? 2 : r < 0.2 ? 1 : 0,
        len: 3 + jr() * 9,
        w: 0.5 + jr() * 1.2,
      });
    }
  });
}

// ------------------------------------------------------------ the beds

const SKY_COOL = rgbOf("#aeb0c4");
const DEEP = rgbOf("#34303b");

/** A bed's colour for a facet's light and its local colour; a soft bed lies back, cooler and darker, in the sky's light. */
function bedColour(
  bed: Bed,
  light: number,
  tint: RGB,
  k: number,
  ahead: number,
): RGB {
  const m = bed.m;
  const lit = lerp3(m.lit, tint, k);
  let c: RGB;
  if (bed.hard) c = lerp3(m.shade, lit, light ** 0.8);
  else {
    c = lerp3(m.shade, lit, (light * (bed.back ?? 0.74)) ** 0.85);
    c = lerp3(c, SKY_COOL, 0.05);
  }
  return hazed(c, ahead);
}

/** Bed `b`'s top boundary between two samples, nudged `up` metres (so a nearer bed's edge overlaps the seam). */
function bedPolygon(
  f: Face,
  b: number,
  i0: number,
  i1: number,
  up: number,
): Pt[] {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = i0; i <= i1; i++) {
    const hT = Math.min(f.top[i], f.hc[b + 1][i] + up);
    top.push(atH(f, i, hT));
    bot.push(f.bp[b][i]);
  }
  return [...top, ...bot.reverse()];
}

/** Colour: one bed, block by block: each a flat facet in its own light and local colour; a hard block's lip lit where the sun grazes its top, its foot a little darker. */
function paintBed(c: PlateCanvas, f: Face, b: number): void {
  const bed = BEDS[b];
  const ctx = c.ctx;
  const last = f.ns.length - 1;
  for (const blk of f.blocks[b]) {
    let shown = false;
    for (let i = blk.i0; i <= blk.i1 && !shown; i++)
      shown = f.hc[b + 1][i] - f.hc[b][i] > 0.05;
    if (!shown) continue;
    // One sample past its end: the next block, painted after it, covers the seam.
    const pts = bedPolygon(f, b, blk.i0, Math.min(last, blk.i1 + 1), 0.35);
    const mid = Math.floor((blk.i0 + blk.i1) / 2);
    // A wall turned from the sun into a recess (a gully's or a cleft's
    // north wall) takes no light back from the sky beyond it: the face's
    // real darks.
    const deep = blk.light < 0.2 ? 0.78 + blk.light * 1.1 : 1;
    const col = scale3(
      bedColour(bed, blk.light, blk.tint, blk.tintK, f.ahead[mid]),
      deep,
    );
    if (bed.hard) {
      let yTop = Number.NEGATIVE_INFINITY;
      let yBot = Number.POSITIVE_INFINITY;
      for (const p of pts) {
        yTop = Math.max(yTop, p[1]);
        yBot = Math.min(yBot, p[1]);
      }
      const g = ctx.createLinearGradient(0, yTop, 0, yBot);
      g.addColorStop(0, css(scale3(col, 1.06)));
      g.addColorStop(0.14, css(col));
      g.addColorStop(0.7, css(col));
      g.addColorStop(1, css(scale3(col, 0.86)));
      ctx.fillStyle = g;
    } else ctx.fillStyle = css(col);
    ctx.fill(poly(pts));
  }
}

/** How far a hard bed overhangs the soft one under it at `n`, true metres. */
function overhang(b: number): (n: number) => number {
  const w = wobble(900 + b, [
    [45, 0.5],
    [13, 0.35],
  ]);
  // In places the hard bed sits flush on the soft one: no overhang, no shadow.
  return (n) => Math.max(0, 0.15 + 1.05 * w(n));
}

/** Colour: the shade under each hard bed's overhang, the deepest dark on the face, and the soft bed's top tucked under it. */
function paintOverhangs(c: PlateCanvas, f: Face): void {
  const deep = css(hazed(DEEP, 1350), 0.82);
  const soft = css(hazed(rgbOf("#5e5966"), 1350), 0.32);
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
      if (h >= f.top[i] - 0.3 || h < f.talusH[i]) {
        const z = atH(f, i, Math.min(f.top[i], Math.max(f.talusH[i], h)));
        top.push(z);
        bot.push(z);
        low.push(z);
        continue;
      }
      // Deeper under a thick soft bed (it has weathered further back).
      const room = f.bh[b][i] - f.bh[b - 1][i];
      const t = room < 0.6 ? 0 : over(f.ns[i]) * Math.min(1.4, 0.5 + room / 5);
      top.push(atH(f, i, h + 0.1));
      bot.push(atH(f, i, h - t));
      low.push(atH(f, i, h - t - Math.min(1.4, room * 0.35)));
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

/**
 * Colour: the erosion bites, where a hard bed has collapsed: the recess
 * its fall has left, in shade at its back, the rubble of the fall on
 * its floor lit on top.
 */
function paintBites(c: PlateCanvas, f: Face): void {
  const rng = createRng(907);
  for (const bite of f.bites) {
    const { b, i0, i1, was } = bite;
    const top: Pt[] = [];
    const floor: Pt[] = [];
    let any = false;
    for (let i = i0; i <= i1; i++) {
      const hTop = Math.min(f.top[i] - 0.3, was[i - i0]);
      const hFloor = Math.min(hTop, f.bh[b + 1][i]);
      if (hTop - hFloor > 0.3) any = true;
      top.push(atH(f, i, hTop));
      floor.push(atH(f, i, hFloor));
    }
    if (!any) continue;
    const ahead = f.ahead[i0];
    const rock = BEDS[b].m;
    const recess = poly([...top, ...floor.slice().reverse()]);
    const yT = Math.max(...top.map((p) => p[1]));
    const yB = Math.min(...floor.map((p) => p[1]));
    const g = c.ctx.createLinearGradient(0, yT, 0, yB);
    g.addColorStop(0, css(hazed(DEEP, ahead)));
    g.addColorStop(0.3, css(hazed(lerp3(rock.shade, rock.lit, 0.3), ahead)));
    g.addColorStop(1, css(hazed(lerp3(rock.shade, rock.lit, 0.55), ahead)));
    fill(c, recess, g);
    // The rubble on its floor: a low heap of blocks, lit on the left.
    const heap = new Path2D();
    const lit = new Path2D();
    const n = floor.length;
    for (let k = 0; k < 3 + Math.floor(rng() * 4); k++) {
      const j = Math.floor(n * (0.1 + rng() * 0.8));
      const p = floor[j];
      const r = 0.6 + rng() * 1.4;
      const h = r * (0.5 + rng() * 0.6);
      heap.moveTo(p[0] - r, p[1]);
      heap.lineTo(p[0] - r * 0.4, p[1] + h);
      heap.lineTo(p[0] + r * 0.5, p[1] + h * 0.8);
      heap.lineTo(p[0] + r, p[1]);
      heap.closePath();
      lit.moveTo(p[0] - r, p[1]);
      lit.lineTo(p[0] - r * 0.4, p[1] + h);
      lit.lineTo(p[0] - r * 0.05, p[1] + h * 0.9);
      lit.lineTo(p[0] - r * 0.2, p[1]);
      lit.closePath();
    }
    fill(c, heap, css(hazed(lerp3(rock.shade, rock.lit, 0.45), ahead)));
    fill(c, lit, css(hazed(rock.lit, ahead)), 0.9);
  }
}

/**
 * Colour: screes on the soft beds: cones of debris fallen from the hard
 * bed above, each spreading from under its overhang down the soft slope,
 * lit on its left flank, its right turned from the sun.
 */
function paintScree(c: PlateCanvas, f: Face): void {
  const rng = createRng(909);
  BEDS.forEach((bed, b) => {
    if (bed.hard || b + 1 >= BEDS.length || !BEDS[b + 1].hard) return;
    const above = BEDS[b + 1].m;
    // Three tones, by the light on the slope where each lies.
    const bodies = [new Path2D(), new Path2D(), new Path2D()];
    for (let n = N_MAX - rng() * 20; n > N_MIN + 40; n -= 12 + rng() * 40) {
      if (rng() < 0.5) continue;
      const ic = indexOf(f, n);
      const hA = Math.min(f.top[ic] - 0.6, f.bh[b + 1][ic]) - 0.1;
      const hB = f.bh[b][ic];
      const room = hA - hB;
      if (room < 1 || hB < f.talusH[ic]) continue;
      // A chute from under the overhang, spreading into a low apron at the slope's foot.
      const half = (2 + room * (1 + rng() * 1.6)) / STEP;
      const lean = (rng() - 0.35) * half * 0.5;
      const iL = Math.max(0, Math.round(ic - half + lean));
      const iR = Math.min(f.ns.length - 1, Math.round(ic + half + lean));
      const apex = atH(f, ic, hA);
      const neck = atH(f, Math.round(ic + lean * 0.3), hA - room * 0.35);
      const footY = (i: number) => Math.max(f.bh[b][i], hB) + 0.05;
      const left = atH(f, iL, footY(iL));
      const right = atH(f, iR, footY(iR));
      const p = bodies[Math.min(2, Math.floor(f.light[b][ic] * 3))];
      p.moveTo(apex[0] - 0.3, apex[1]);
      p.quadraticCurveTo(neck[0] - 0.5, neck[1], left[0], left[1]);
      p.lineTo(right[0], right[1]);
      p.quadraticCurveTo(neck[0] + 0.7, neck[1], apex[0] + 0.3, apex[1]);
      p.closePath();
    }
    for (let t = 0; t < 3; t++) {
      const l = (t + 0.5) / 3;
      const debris = lerp3(above.shade, above.lit, 0.35 + 0.5 * l);
      const slope = bedColour(bed, l, WEATHERED, 0.1, 1350);
      c.ctx.fillStyle = css(lerp3(slope, hazed(debris, 1350), 0.45), 0.85);
      c.ctx.fill(bodies[t]);
    }
  });
}

/**
 * Colour: the soft beds slumping over the hard ones below them in tongues
 * of wet clay, and short wavy rills down the soft slopes.
 */
function paintTongues(c: PlateCanvas, f: Face): void {
  const rng = createRng(905);
  const rills = new Path2D();
  BEDS.forEach((bed, b) => {
    if (bed.hard || b === 0 || !BEDS[b - 1].hard) return;
    const tongues: { path: Path2D; col: RGB }[] = [];
    for (let n = N_MAX - rng() * 20; n > N_MIN + 40; n -= 10 + rng() * 34) {
      if (rng() < 0.6) continue;
      const half = (1 + rng() * 3.5) / STEP;
      const len = 0.5 + rng() * 1.1;
      const ic = indexOf(f, n);
      const i0 = Math.max(0, Math.round(ic - half));
      const i1 = Math.min(f.ns.length - 1, Math.round(ic + half));
      if (i1 - i0 < 2) continue;
      const top: Pt[] = [];
      const bot: Pt[] = [];
      let hidden = false;
      for (let i = i0; i <= i1; i++) {
        const h = f.bh[b][i];
        if (h >= f.top[i] - 0.5 || h - len < f.talusH[i]) hidden = true;
        const u = (i - ic) / (half + 0.5);
        const drop = len * (1 - u * u) ** 0.7 * (0.85 + 0.3 * rng());
        top.push(atH(f, i, h + 0.25));
        bot.push(atH(f, i, Math.max(f.bh[b - 1][i] + 0.3, h - drop)));
      }
      if (hidden) continue;
      const path = new Path2D();
      addLine(path, [...top, ...bot.reverse()], true);
      const light = f.light[b][ic];
      tongues.push({
        path,
        col: scale3(bedColour(bed, light, RUST, 0.25, 1350), 0.82),
      });
    }
    for (const t of tongues) fill(c, t.path, css(t.col), 0.92);
    // Rills: short wavy runnels down the soft slope.
    for (let n = N_MAX - rng() * 10; n > N_MIN + 40; n -= 5 + rng() * 16) {
      const i = indexOf(f, n);
      const h1 = Math.min(f.top[i], f.bh[b + 1][i]) - 0.3;
      const h0 = f.bh[b][i];
      const room = h1 - h0;
      if (room < 1.2 || h0 < f.talusH[i]) continue;
      const len = room * (0.4 + rng() * 0.5);
      const wig = 0.35 + rng() * 0.5;
      for (let k = 0; k <= 5; k++) {
        const h = h1 - (len * k) / 5;
        const di = Math.round(Math.sin(k * 1.7 + n) * wig);
        const p = atH(f, Math.max(0, Math.min(f.ns.length - 1, i + di)), h);
        if (k === 0) rills.moveTo(p[0], p[1]);
        else rills.lineTo(p[0], p[1]);
      }
    }
  });
  stroke(c, rills, 0.55, css(hazed(rgbOf("#4e4a52"), 1350)), 0.4);
}

/** Colour: the cracks at the blocks' joints, irregular zigzags; rust stains and dark seeps run down from a few. */
function paintCracks(c: PlateCanvas, f: Face): void {
  const rng = createRng(913);
  const dark = new Path2D();
  const seep = new Path2D();
  const rust = new Path2D();
  for (const j of f.joints) {
    const zig = 3 + Math.floor(rng() * 3);
    for (let k = 0; k <= zig; k++) {
      const h = j.hi - ((j.hi - j.lo) * k) / zig;
      const off = k === 0 || k === zig ? 0 : (rng() - 0.5) * 1.6;
      const i = Math.max(0, Math.min(f.ns.length - 1, j.i + Math.round(off)));
      const p = atH(f, i, h);
      if (k === 0) dark.moveTo(p[0], p[1]);
      else dark.lineTo(p[0], p[1]);
    }
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
  stroke(c, dark, 0.7, css(hazed(DEEP, 1350)), 0.55);
  c.ctx.fillStyle = css(hazed(rgbOf("#5f574e"), 1350), 0.22);
  c.ctx.fill(seep);
  c.ctx.fillStyle = css(hazed(rgbOf("#b47a45"), 1350), 0.25);
  c.ctx.fill(rust);
}

/** Colour: a few broad dark streaks from the turf down the upper beds, where rain runs off the brow, fading as they fall. */
function paintStreaks(c: PlateCanvas, f: Face): void {
  const rng = createRng(931);
  const ctx = c.ctx;
  for (let n = N_MAX - rng() * 30; n > 80; n -= 30 + rng() * 50) {
    const i = indexOf(f, n);
    const ii = Math.min(f.ns.length - 1, i + 1);
    const top = f.top[i] - 0.6;
    const len = 7 + rng() * 15;
    const w = 2 + rng() * 3.5;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const h = top - (len * k) / 6;
      if (h < f.talusH[i] + 1) break;
      const wk = w * (1 - (k / 7) ** 1.3) * (0.85 + 0.3 * rng());
      const L = atH(f, i, h);
      const R = atH(f, ii, h);
      const dx = (R[0] - L[0]) / STEP;
      left.push([L[0] - dx * wk * 0.5, L[1]]);
      right.push([L[0] + dx * wk * 0.5, L[1]]);
    }
    if (left.length < 3) continue;
    const y0 = left[0][1];
    const y1 = left[left.length - 1][1];
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, css(hazed(rgbOf("#5b5348"), 1350), 0.2));
    g.addColorStop(1, css(hazed(rgbOf("#5b5348"), 1350), 0));
    ctx.fillStyle = g;
    ctx.fill(poly([...left, ...right.reverse()]));
  }
}

const GRASS_LIT = rgbOf("#b4aa5c");
const GRASS_SHADE = rgbOf("#5f6a52");
const SCRUB = rgbOf("#78804f");
const SCRUB_LIT = rgbOf("#a3a25c");
const SCRUB_SHADE = rgbOf("#47503f");

/** Adds a clump: a lumpy rounded shape about `rx` by `ry`, its foot flattish. */
function bush(
  p: Path2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rng: () => number,
): void {
  const k = 9;
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

/** Colour: grass in clumps on the soft slopes and along the ledges, each lit on top; none in strips. */
function paintGreens(c: PlateCanvas, f: Face, from: number, to: number): void {
  const rng = createRng(941 + from);
  // Three tones by the light where each patch grows, each with its lit tops.
  const bodies = [new Path2D(), new Path2D(), new Path2D()];
  const tops = [new Path2D(), new Path2D(), new Path2D()];
  const unit = 1000 / 1350;
  BEDS.forEach((bed, b) => {
    if (b === 0 || b === BEDS.length - 1 || b < from || b >= to) return;
    for (let n = N_MAX - rng() * 12; n > N_MIN + 40; n -= 7 + rng() * 26) {
      if (rng() < (bed.hard ? 0.45 : 0.3)) continue;
      const i = indexOf(f, n);
      // On a soft slope low down, where it meets the ledge; on a hard bed, along its top.
      const h0 = f.bh[b][i];
      const h1 = Math.min(f.top[i] - 0.8, f.bh[b + 1][i]);
      if (h1 - h0 < 0.4 || h0 < f.talusH[i]) continue;
      const tone = Math.min(2, Math.floor(f.light[b][i] * 3));
      // A patch: a few clumps of different sizes overlapping along the
      // ledge, now and then one trailing down the slope.
      const width = 2 + rng() ** 1.3 * 8;
      const count = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k++) {
        const nn = n + (rng() - 0.5) * width;
        const ii = indexOf(f, nn);
        const g0 = f.bh[b][ii];
        const g1 = Math.min(f.top[ii] - 0.8, f.bh[b + 1][ii]);
        if (g1 - g0 < 0.3 || g0 < f.talusH[ii]) continue;
        const trail = rng() < 0.2;
        const h = bed.hard
          ? g1 - 0.1 - (trail ? (g1 - g0) * 0.3 : 0)
          : g0 + (g1 - g0) * (0.04 + rng() ** 1.8 * (trail ? 0.7 : 0.35));
        const p = atH(f, ii, h);
        const rx = (0.5 + rng() ** 1.5 * (trail ? 1 : 2.4)) * unit;
        const ry = (0.25 + rng() * 0.45) * VEX * unit * 0.6;
        bush(bodies[tone], p[0], p[1], rx, ry, rng);
        bush(
          tops[tone],
          p[0] - rx * 0.2,
          p[1] + ry * 0.35,
          rx * 0.6,
          ry * 0.45,
          rng,
        );
      }
    }
  });
  for (let t = 0; t < 3; t++) {
    const l = (t + 0.5) / 3;
    c.ctx.fillStyle = css(
      hazed(lerp3(GRASS_SHADE, GRASS_LIT, 0.15 + 0.35 * l), 1350),
      0.92,
    );
    c.ctx.fill(bodies[t]);
    c.ctx.fillStyle = css(
      hazed(lerp3(GRASS_SHADE, GRASS_LIT, 0.45 + 0.55 * l), 1350),
      0.85,
    );
    c.ctx.fill(tops[t]);
  }
}

/**
 * Colour: each gully's floor, a ragged ribbon of scrub clumps of
 * different sizes from the talus up the V, lit on their tops, bare clay
 * between them; a few bushes clinging higher up its walls.
 */
function paintScrub(c: PlateCanvas, f: Face): void {
  const rng = createRng(945);
  const dark = new Path2D();
  const mid = new Path2D();
  const lit = new Path2D();
  const unit = 1000 / 1350;
  for (const cut of f.cuts) {
    if (!cut.gully) continue;
    const ia = indexOf(f, cut.n);
    const top = f.top[ia];
    const foot = f.talusH[ia] - 0.5;
    const reach = cut.h0 + (top - cut.h0) * (0.35 + rng() * 0.2);
    const count = 3 + Math.floor(rng() * 6);
    let h = foot;
    for (let k = 0; k < count && h < reach; k++) {
      const t = k / Math.max(1, count - 1);
      // Larger at the foot, where the floor spreads; smaller up the V.
      const size = (5.5 - 3.5 * t) * (0.6 + rng() * 0.7);
      const v = smoothstep(cut.h0 - 1, top, h);
      const across = (rng() - 0.6) * cut.wn * (0.15 + 0.85 * v) * 0.5;
      const p = atH(f, indexOf(f, cut.n + across), h);
      const rx = size * unit;
      const ry = size * 0.42 * unit * VEX * 0.55;
      bush(dark, p[0], p[1], rx, ry, rng);
      bush(mid, p[0] - rx * 0.1, p[1] + ry * 0.15, rx * 0.8, ry * 0.75, rng);
      bush(lit, p[0] - rx * 0.25, p[1] + ry * 0.45, rx * 0.45, ry * 0.4, rng);
      h += size * (0.5 + rng() * 0.9);
    }
    for (let k = 0; k < 4; k++) {
      if (rng() < 0.45) continue;
      const hh = reach + 1 + rng() * (top - reach) * 0.5;
      const n = cut.n + (rng() - 0.1) * cut.wn * 0.8;
      const p = atH(f, indexOf(f, n), hh);
      const r = (1 + rng() * 1.8) * unit;
      bush(dark, p[0], p[1], r, r * 0.65, rng);
      bush(lit, p[0] - r * 0.2, p[1] + r * 0.25, r * 0.5, r * 0.35, rng);
    }
  }
  c.ctx.fillStyle = css(hazed(SCRUB_SHADE, 1350), 0.95);
  c.ctx.fill(dark);
  c.ctx.fillStyle = css(hazed(SCRUB, 1350), 0.9);
  c.ctx.fill(mid);
  c.ctx.fillStyle = css(hazed(SCRUB_LIT, 1350), 0.85);
  c.ctx.fill(lit);
}

/** A landslip bay's slump at sample `i`: its top and bottom heights, or null outside it. */
function bayAt(
  f: Face,
  i: number,
): { top: number; bot: number; u: number } | null {
  const n = f.ns[i];
  for (const [m, half, ledge] of BAYS) {
    const u = Math.abs(n - m) / half;
    if (u >= 1) continue;
    const top = f.top[i] - 0.4;
    const shelf = f.bh[ledge + 1][i];
    // Its sides the scarps of the slip, curving up to the brow.
    const side = smoothstep(0.2, 1, u) ** 0.7;
    const bot = shelf + (top - shelf) * side;
    if (top - bot < 0.3) return null;
    return { top, bot, u };
  }
  return null;
}

/**
 * Colour: the landslip bays: the upper beds gone, a slump of clay and
 * grass lying back from the head scarp under the brow down to a ledge,
 * its foot in tongues over the ledge; the scarp bare ochre-brown under
 * the turf's dark undercut.
 */
function paintBays(c: PlateCanvas, f: Face): void {
  const rng = createRng(951);
  const ctx = c.ctx;
  for (const [m, half] of BAYS) {
    const i0 = indexOf(f, m + half);
    const i1 = indexOf(f, m - half);
    const top: Pt[] = [];
    const bot: Pt[] = [];
    const scarp: Pt[] = [];
    const lobe = wobble(957 + m, [
      [9, 0.6],
      [4, 0.3],
    ]);
    for (let i = i0; i <= i1; i++) {
      const s = bayAt(f, i);
      if (!s) continue;
      top.push(atH(f, i, s.top + 0.4));
      const tongue = Math.max(0, lobe(f.ns[i])) * 1.6 * (1 - s.u);
      bot.push(atH(f, i, Math.max(f.talusH[i], s.bot - tongue)));
      scarp.push(atH(f, i, s.top - (0.9 + 0.8 * (1 - s.u))));
    }
    if (top.length < 3) continue;
    const ahead = f.ahead[indexOf(f, m)];
    const slump = poly([...top, ...bot.slice().reverse()]);
    // The slump lies back from the sun: lit at a slant, grassed, its clay showing.
    const yT = Math.max(...top.map((p) => p[1]));
    const yB = Math.min(...bot.map((p) => p[1]));
    const g = ctx.createLinearGradient(0, yT, 0, yB);
    g.addColorStop(0, css(hazed(lerp3(M.clay.lit, GRASS_LIT, 0.35), ahead)));
    g.addColorStop(
      0.35,
      css(hazed(lerp3(GRASS_SHADE, GRASS_LIT, 0.55), ahead)),
    );
    g.addColorStop(1, css(hazed(lerp3(GRASS_SHADE, M.clay.lit, 0.45), ahead)));
    ctx.fillStyle = g;
    ctx.fill(slump);
    ctx.save();
    ctx.clip(slump);
    // The head scarp: bare earth under the brow.
    fill(
      c,
      poly([...top, ...scarp.slice().reverse()]),
      css(hazed(rgbOf("#b98f5e"), ahead)),
      0.95,
    );
    const under = new Path2D();
    addLine(
      under,
      top.map(([x, y]) => [x, y - 0.5] as Pt),
    );
    stroke(c, under, 1.1, css(hazed(DEEP, ahead)), 0.6);
    // Terracettes across the slump: a lit lip, its shadow under it, broken.
    const lips = new Path2D();
    const shades = new Path2D();
    const across = (t: number): Pt[] =>
      scarp.map((p, j) => {
        const q = bot[j];
        const tt = t + 0.05 * Math.sin(j * 0.9 + t * 20);
        return [p[0] + (q[0] - p[0]) * tt, p[1] + (q[1] - p[1]) * tt];
      });
    for (const t of [0.22, 0.4, 0.57, 0.74]) {
      const line = across(t + (rng() - 0.5) * 0.06);
      addBroken(lips, line, 6, 2.5, rng, () => 0.8);
      addBroken(
        shades,
        line.map(([x, y]) => [x + 0.2, y - 0.45] as Pt),
        6,
        2.5,
        rng,
        () => 0.8,
      );
    }
    stroke(c, shades, 0.8, css(hazed(SCRUB_SHADE, ahead)), 0.5);
    stroke(c, lips, 0.6, css(hazed(GRASS_LIT, ahead)), 0.6);
    // Bramble gathered at its foot, lit on top.
    const body = new Path2D();
    const lit = new Path2D();
    for (let k = 0; k < 9; k++) {
      const j = Math.floor(top.length * (0.15 + rng() * 0.7));
      const t = 0.72 + rng() * 0.24;
      const x = scarp[j][0] + (bot[j][0] - scarp[j][0]) * t;
      const y = scarp[j][1] + (bot[j][1] - scarp[j][1]) * t;
      const r = 0.7 + rng() ** 1.5 * 2.4;
      bush(body, x, y, r, r * 0.5, rng);
      bush(lit, x - r * 0.2, y + r * 0.2, r * 0.55, r * 0.28, rng);
    }
    ctx.fillStyle = css(hazed(SCRUB_SHADE, ahead), 0.85);
    ctx.fill(body);
    ctx.fillStyle = css(hazed(SCRUB_LIT, ahead), 0.75);
    ctx.fill(lit);
    ctx.restore();
    // Its foot's shadow on the ledge.
    const foot = new Path2D();
    addLine(foot, bot);
    stroke(c, foot, 0.8, css(hazed(rgbOf("#4b4750"), ahead)), 0.45);
  }
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

/** The turf on the brow: in the low sun at a slant, and where the brow comes down to the harbour, turned from it. */
const TURF = rgbOf("#aaa35a");
const TURF_DULL = rgbOf("#878669");
const SOIL = rgbOf("#9c7c55");
const SCAR = rgbOf("#b78f5f");

/** How far into the harbour's corner a sample lies, 0..1: the brow coming down to the quay, turned south, out of the sun. */
function cornerAt(n: number): number {
  return smoothstep(150, 35, n);
}

/**
 * Colour: the brow: the ground behind it up to the batteries' line; the
 * turf capping the edge, 0.3–1.5 m thick, overhanging in places with a
 * thin cool shadow under it, the soil under the turf; the slump scars,
 * bare earth under a dark undercut where the turf has broken away; grass
 * hanging over in tufts; where the brow comes down to the harbour, dull
 * and out of the sun.
 */
function paintBrow(c: PlateCanvas, f: Face): void {
  const rng = createRng(971);
  // The ground behind the brow: one fill, then the corner's shade over it.
  fill(c, band(f.back, f.edge), css(hazed(rgbOf("#a59f58"), 1400)));
  const soil: Pt[] = [];
  const grass: Pt[] = [];
  const shade: Pt[] = [];
  const thick = wobble(973, [
    [70, 0.5],
    [23, 0.3],
    [9, 0.12],
  ]);
  const hangs = wobble(977, [
    [40, 1],
    [13, 0.4],
  ]);
  for (let i = 0; i < f.ns.length; i++) {
    const n = f.ns[i];
    const top = f.top[i];
    const g = 0.3 + 1.2 * Math.min(1, Math.max(0, 0.5 + thick(n)));
    const s = g + 0.6 + Math.max(0, -thick(n + 60)) * 0.9;
    grass.push(atH(f, i, Math.max(FOOT, top - g)));
    soil.push(atH(f, i, Math.max(FOOT, top - s)));
    // Where the turf overhangs, its shadow falls on the soil under it.
    const over = Math.max(0, hangs(n) - 0.35) * 0.9;
    shade.push(atH(f, i, Math.max(FOOT, top - s - 0.25 - over)));
  }
  // Each band in reaches, its colour dulled toward the harbour's corner.
  for (let i0 = 0; i0 < f.ns.length - 1; i0 += 12) {
    const i1 = Math.min(f.ns.length - 1, i0 + 13);
    const k = cornerAt(f.ns[Math.floor((i0 + i1) / 2)]);
    const turf = hazed(lerp3(TURF, TURF_DULL, k), 1350);
    const soilC = hazed(lerp3(SOIL, rgbOf("#6f6157"), k * 0.7), 1350);
    fill(
      c,
      band(soil.slice(i0, i1 + 1), shade.slice(i0, i1 + 1)),
      css(hazed(rgbOf("#4f4954"), 1350), 0.55),
    );
    fill(
      c,
      band(grass.slice(i0, i1 + 1), soil.slice(i0, i1 + 1)),
      css(soilC),
      0.92,
    );
    fill(c, band(f.edge.slice(i0, i1 + 1), grass.slice(i0, i1 + 1)), css(turf));
  }
  // The slump scars: bare earth where the turf has broken away, the turf's
  // dark undercut along their top.
  for (const [m, half] of SCARS) {
    const i0 = indexOf(f, m + half);
    const i1 = indexOf(f, m - half);
    const low: Pt[] = [];
    const lip: Pt[] = [];
    for (let i = i0; i <= i1; i++) {
      const d = scarDrop(f.ns[i]);
      low.push(f.edge[i]);
      lip.push(
        project(faceE(f, i, f.top[i]) + 3, f.ns[i], (f.top[i] + d) * VEX),
      );
    }
    const ahead = f.ahead[indexOf(f, m)];
    fill(c, band(lip, low), css(hazed(SCAR, ahead)));
    const under = new Path2D();
    addLine(
      under,
      lip.map(([x, y]) => [x, y - 0.35] as Pt),
    );
    stroke(c, under, 1, css(hazed(DEEP, ahead)), 0.75);
    const turf = new Path2D();
    addLine(turf, lip);
    stroke(c, turf, 0.9, css(hazed(TURF, ahead)), 1);
  }
  // Grass hanging over the edge in tufts.
  const hang = new Path2D();
  for (let n = N_MAX - rng() * 5; n > N_MIN + 60; n -= 3 + rng() * 12) {
    if (rng() < 0.35) continue;
    const i = indexOf(f, n);
    const a = soil[i];
    const len = (0.5 + rng() * 1.8) * VEX * (1000 / f.ahead[i]);
    const wd = (0.5 + rng() * 1.3) * c.pen(1.5);
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
  fill(c, hang, css(hazed(rgbOf("#8f8d55"), 1350)), 0.85);
  // The lit lip of the turf, fading where the brow turns from the sun.
  const lit: Pt[] = [];
  for (let i = 0; i < f.ns.length; i++) {
    if (cornerAt(f.ns[i]) > 0.6) break;
    lit.push(f.edge[i]);
  }
  const lipP = new Path2D();
  addBroken(lipP, lit, 30, 2, rng, () => 0.9);
  stroke(c, lipP, 0.7, css(hazed(rgbOf("#cfc27a"), 1350)), 0.5);
}

/**
 * Colour: the harbour's corner, where the cliff comes down to the quay
 * and turns south from the sun: the face, its talus and the beach under
 * it in the cliff's own shade, deepening toward the town's first roofs.
 */
function paintCorner(c: PlateCanvas, f: Face): void {
  const i0 = indexOf(f, 170);
  const i1 = f.ns.length - 1;
  const top = f.edge.slice(i0, i1 + 1);
  const low = f.hw.slice(i0, i1 + 1);
  const xa = f.edge[indexOf(f, 160)][0];
  const xb = f.edge[indexOf(f, 40)][0];
  const g = c.ctx.createLinearGradient(xa, 0, xb, 0);
  const cool = hazed(rgbOf("#45434f"), 1350);
  g.addColorStop(0, css(cool, 0));
  g.addColorStop(0.55, css(cool, 0.22));
  g.addColorStop(1, css(cool, 0.5));
  fill(c, band(top, low), g);
}

/** The face's colour jobs, beach first, in paint order. */
export function faceColourJobs(get: () => Face): PlateJob[] {
  const jobs: PlateJob[] = [
    (c) => paintBeach(c, get()),
    (c) => {
      const f = get();
      fill(c, band(f.edge, f.base), css(hazed(M.warm.lit, 1350)));
    },
  ];
  for (let b = 0; b < BEDS.length; b++) jobs.push((c) => paintBed(c, get(), b));
  jobs.push(
    (c) => paintOverhangs(c, get()),
    (c) => {
      paintBites(c, get());
      paintScree(c, get());
    },
    (c) => paintTongues(c, get()),
    (c) => {
      paintCracks(c, get());
      paintStreaks(c, get());
    },
    (c) => paintGreens(c, get(), 0, 4),
    (c) => paintGreens(c, get(), 4, 7),
    (c) => paintGreens(c, get(), 7, BEDS.length),
    (c) => paintBays(c, get()),
    (c) => paintScrub(c, get()),
    (c) => paintTalus(c, get()),
    (c) => paintBrow(c, get()),
    (c) => paintCorner(c, get()),
  );
  return jobs;
}

// ------------------------------------------------------------ the engraving

/** The gully, if any, whose walls hold sample `i`: its floor's sample, to lean the strokes toward. */
function gullyOf(f: Face, i: number): number | null {
  for (const ci of f.near[i]) {
    const c = f.cuts[ci];
    if (c.gully) return indexOf(f, c.n);
  }
  return null;
}

/**
 * Ink: the tone of the hard beds, block by block: strokes down the fall
 * line from under each block's top, the darker the block the closer,
 * longer and heavier, fading downward; clustered by one field as an
 * engraver's strokes are; in a gully's walls leaning toward its floor,
 * crossed only in the deepest shade. A lit block stays paper.
 */
function engraveTone(
  c: PlateCanvas,
  f: Face,
  from: number,
  to: number,
  out: { light: Path2D; dark: Path2D; cross: Path2D },
): void {
  const unit = c.pen(1);
  const rng = createRng(1001 + from);
  const cluster = field(1013, 26, 2);
  for (let b = from; b < to; b++) {
    const bed = BEDS[b];
    for (const blk of f.blocks[b]) {
      const tone = 1 - (bed.hard ? blk.light : blk.light * (bed.back ?? 0.74));
      if (tone < 0.3) continue;
      const a = f.bp[b + 1][blk.i0];
      const z = f.bp[b + 1][blk.i1];
      const span = z[0] - a[0];
      if (span <= 0.2) continue;
      const step = (1.1 + 3.4 * (1 - tone)) * unit;
      for (
        let x = a[0] + rng() * step;
        x < z[0];
        x += step * (0.8 + rng() * 0.4)
      ) {
        const t = (x - a[0]) / span;
        const i = Math.min(
          blk.i1,
          Math.max(blk.i0, Math.round(blk.i0 + (blk.i1 - blk.i0) * t)),
        );
        const yT = f.bp[b + 1][i][1];
        const yB = f.bp[b][i][1];
        const tall = yT - yB;
        if (tall < 0.5 * unit || f.hc[b][i] < f.talusH[i]) continue;
        const k = cluster(x, yT);
        if (rng() > 0.35 + tone * 0.9 + k * 0.3) continue;
        // Longer strokes in deeper shade, from under the top, fading down.
        const len =
          tall *
          Math.min(1, 0.3 + 0.75 * tone + 0.2 * k) *
          (0.75 + rng() * 0.3);
        const g = gullyOf(f, i);
        let lean = (rng() - 0.5) * 0.3 * unit;
        if (g !== null)
          lean += (f.bp[b][g][0] - x) * 0.25 * (len / Math.max(tall, 1e-3));
        const target = tone > 0.72 ? out.dark : out.light;
        target.moveTo(x, yT - 0.15 * unit);
        target.lineTo(x + lean, yT - len);
        if (tone > 0.86 && rng() < 0.5) {
          out.cross.moveTo(x - len * 0.35, yT - len * 0.1);
          out.cross.lineTo(x + len * 0.2, yT - len * 0.75);
        }
      }
    }
  }
}

/**
 * Ink: the beds' lines: each hard block's top a firm stroke, broken at
 * its joints where the top steps; under each hard bed's overhang a band
 * of short close strokes, its shadow; over the soft slopes a few short
 * slanting strokes down the slope and a little stipple, no ruling.
 */
function engraveStrata(c: PlateCanvas, f: Face): void {
  const rng = createRng(1011);
  const firm = new Path2D();
  const under = new Path2D();
  const slope = new Path2D();
  const dots = new Path2D();
  const unit = c.pen(1);
  BEDS.forEach((bed, b) => {
    if (b === 0) return;
    if (bed.hard) {
      // The bed's top, one firm line stepping down and up with its
      // blocks and its bites, lifted only now and then.
      const pts: Pt[] = [];
      const flush = () => {
        if (pts.length > 1) addBroken(firm, pts, 60, 1.2, rng, () => 1);
        pts.length = 0;
      };
      for (let i = 0; i < f.ns.length; i++) {
        const h = f.bh[b + 1][i];
        if (h >= f.top[i] - 0.3 || h < f.talusH[i]) {
          flush();
          continue;
        }
        pts.push(atH(f, i, h));
      }
      flush();
      // The overhang's shadow under its base.
      const over = overhang(b);
      let last = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < f.ns.length; i++) {
        const h = f.bh[b][i];
        const room = h - f.bh[b - 1][i];
        const t = room < 0.6 ? 0 : over(f.ns[i]);
        if (t < 0.2 || h >= f.top[i] - 0.3 || h - t < f.talusH[i]) continue;
        const p = atH(f, i, h);
        if (p[0] - last < 0.9 * unit) continue;
        last = p[0];
        const q = atH(
          f,
          i,
          Math.max(f.talusH[i], h - (t + 0.5) * (0.6 + rng() * 0.6)),
        );
        under.moveTo(p[0], p[1]);
        under.lineTo(q[0] + 0.25 * unit, q[1]);
      }
      return;
    }
    // A soft slope: short strokes slanting down it, a few dots.
    for (let n = N_MAX - rng() * 6; n > N_MIN + 30; n -= 2.5 + rng() * 7) {
      const i = indexOf(f, n);
      const h0 = f.bh[b][i];
      const h1 = Math.min(f.top[i] - 0.4, f.bh[b + 1][i]);
      if (h1 - h0 < 0.6 || h0 < f.talusH[i]) continue;
      const tone = 1 - f.light[b][i] * (bed.back ?? 0.74);
      if (rng() > 0.3 + tone * 0.7) continue;
      const hA = h1 - (h1 - h0) * rng() * 0.3;
      const hB = hA - (h1 - h0) * (0.25 + rng() * 0.35);
      const p = atH(f, i, hA);
      const q = atH(f, Math.min(f.ns.length - 1, i + 1), Math.max(h0, hB));
      slope.moveTo(p[0], p[1]);
      slope.lineTo(q[0], q[1]);
      if (rng() < 0.3) {
        const d = atH(f, i, h0 + (h1 - h0) * rng());
        dots.moveTo(d[0], d[1]);
        dots.lineTo(d[0] + 0.3 * unit, d[1]);
      }
    }
  });
  stroke(c, under, 0.55, INK.line, 0.7);
  stroke(c, slope, 0.45, INK.hatch, 0.6);
  stroke(c, dots, 0.6, INK.hatch, 0.6);
  stroke(c, firm, 0.85, INK.line, 0.85);
}

/** Ink: the cracks, irregular zigzags, each with a few short strokes on its shaded side; and the bites' recesses hatched. */
function engraveJoints(c: PlateCanvas, f: Face): void {
  const rng = createRng(1017);
  const p = new Path2D();
  const side = new Path2D();
  const unit = c.pen(1);
  f.joints.forEach((j, k) => {
    if (k % 3 === 1) return;
    const zig = 3 + Math.floor(rng() * 3);
    let prev: Pt | null = null;
    for (let s = 0; s <= zig; s++) {
      const h = j.hi - 0.1 - ((j.hi - j.lo - 0.2) * s) / zig;
      const off = s === 0 || s === zig ? 0 : (rng() - 0.5) * 1.6;
      const i = Math.max(0, Math.min(f.ns.length - 1, j.i + Math.round(off)));
      const q = atH(f, i, h);
      if (prev) p.lineTo(q[0], q[1]);
      else p.moveTo(q[0], q[1]);
      prev = q;
      if (s > 0 && s < zig && rng() < 0.7) {
        side.moveTo(q[0] + 0.4 * unit, q[1] + 0.3 * unit);
        side.lineTo(q[0] + 0.5 * unit, q[1] - 0.9 * unit);
      }
    }
  });
  stroke(c, p, 0.5, INK.line, 0.65);
  stroke(c, side, 0.4, INK.hatch, 0.6);
  // The bites: their recesses in close strokes, their floors' rubble outlined.
  const h = new Path2D();
  const r = new Path2D();
  for (const bite of f.bites) {
    const { b, i0, i1, was } = bite;
    for (let i = i0; i <= i1; i++) {
      const hTop = Math.min(f.top[i] - 0.3, was[i - i0]);
      const hFloor = Math.min(hTop, f.bh[b + 1][i]);
      if (hTop - hFloor < 0.4) continue;
      const a = atH(f, i, hTop);
      const z = atH(f, i, hFloor);
      h.moveTo(a[0], a[1]);
      h.lineTo(z[0], z[1] + (a[1] - z[1]) * 0.15);
      if (i === i0 + 2 || rng() < 0.08) {
        r.moveTo(z[0] - 0.8 * unit, z[1]);
        r.lineTo(z[0], z[1] + 0.8 * unit);
        r.lineTo(z[0] + 0.8 * unit, z[1]);
      }
    }
  }
  stroke(c, h, 0.5, INK.line, 0.7);
  stroke(c, r, 0.5, INK.line, 0.7);
}

/** Ink: the screes' cones, a stroke down each flank, the far one hatched; the bays' slumps in strokes down the slope, their head scarps firm. */
function engraveFeatures(c: PlateCanvas, f: Face): void {
  const rng = createRng(1019);
  const flanks = new Path2D();
  const slump = new Path2D();
  const scarp = new Path2D();
  const unit = c.pen(1);
  BEDS.forEach((bed, b) => {
    if (bed.hard || b + 1 >= BEDS.length || !BEDS[b + 1].hard) return;
    for (let n = N_MAX - rng() * 20; n > N_MIN + 40; n -= 12 + rng() * 40) {
      if (rng() < 0.5) continue;
      const ic = indexOf(f, n);
      const hA = Math.min(f.top[ic] - 0.6, f.bh[b + 1][ic]) - 0.1;
      const hB = f.bh[b][ic];
      const room = hA - hB;
      if (room < 1 || hB < f.talusH[ic]) continue;
      const half = (2 + room * (1 + rng() * 1.6)) / STEP;
      const iL = Math.max(0, Math.round(ic - half));
      const iR = Math.min(f.ns.length - 1, Math.round(ic + half));
      const apex = atH(f, ic, hA);
      const left = atH(f, iL, f.bh[b][iL] + 0.05);
      const right = atH(f, iR, f.bh[b][iR] + 0.05);
      if (rng() < 0.45) continue;
      flanks.moveTo(left[0], left[1]);
      flanks.quadraticCurveTo(
        apex[0] - 0.4,
        apex[1] - room * 0.3,
        apex[0],
        apex[1],
      );
      for (let k = 2; k <= 3; k++) {
        const t = k / 4;
        flanks.moveTo(apex[0] + 0.3 * unit, apex[1] - 0.5 * unit);
        flanks.lineTo(
          apex[0] + (right[0] - apex[0]) * t * 0.8,
          apex[1] + (right[1] - apex[1]) * 0.7,
        );
      }
    }
  });
  for (const [m, half] of BAYS) {
    const i0 = indexOf(f, m + half);
    const i1 = indexOf(f, m - half);
    const head: Pt[] = [];
    for (let i = i0; i <= i1; i++) {
      const s = bayAt(f, i);
      if (!s) continue;
      head.push(atH(f, i, s.top - 0.2));
      if ((i - i0) % 2 === 0) {
        const a = atH(f, i, s.top - 0.9);
        const z = atH(
          f,
          Math.min(f.ns.length - 1, i + 1),
          s.bot + (s.top - s.bot) * rng() * 0.3,
        );
        slump.moveTo(a[0], a[1]);
        slump.lineTo(z[0], z[1]);
      }
    }
    addLine(scarp, head);
  }
  stroke(c, flanks, 0.45, INK.hatch, 0.65);
  stroke(c, slump, 0.45, INK.hatch, 0.65);
  stroke(c, scarp, 0.8, INK.line, 0.8);
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
  for (let b = 0; b < BEDS.length; b += 3) {
    jobs.push((c) => {
      const f = get();
      const out = {
        light: new Path2D(),
        dark: new Path2D(),
        cross: new Path2D(),
      };
      engraveTone(c, f, b, Math.min(BEDS.length, b + 3), out);
      stroke(c, out.light, 0.45, INK.hatch, 0.75);
      stroke(c, out.dark, 0.6, INK.line, 0.7);
      stroke(c, out.cross, 0.45, INK.line, 0.55);
    });
  }
  jobs.push(
    (c) => engraveStrata(c, get()),
    (c) => {
      engraveJoints(c, get());
      engraveFeatures(c, get());
    },
    (c) => engraveTalus(c, get()),
    (c) => engraveBrow(c, get()),
  );
  return jobs;
}
