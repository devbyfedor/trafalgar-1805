import { SEA_DRIFT } from "../../../interludes";
import { createRng, luminance, mix, rgba } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { EYE_H } from "../../scene";
import {
  distanceAt,
  numByDistance,
  waterBody,
  waterDark,
  waterLight,
  waterSlick,
} from "./shore";

/**
 * The water of the roads from the strand's edge in to the eye, on the
 * evening of 10 August 1805 with one light westerly air (docs/history-
 * notes.md): a low swell, long and gentle, ruffled by wavelets in patches
 * (catspaws) between glassy slicks. Facing east with the sun behind, the
 * sea mirrors the cool eastern sky: the backs of the wavelets, tilted away
 * from the eye, catch the low sky's pearl; their faces, tilted toward it,
 * the higher, bluer sky; and the whole deepens toward the eye (shore.ts,
 * waterBody). Scene 1's sea language: strips of swell far to near, each a
 * long crest with broad tone bands under it, drawn with restraint so the
 * craft's reflections carry the picture (the bar the owner set,
 * .claude/s27/craft-vs-victory.png).
 *
 * Each strip is a plate with `swell` (paint/plate.ts): its art repeats
 * across every `period` units and its box reaches a period beyond the
 * frame's right edge, as BoulogneSea.tsx loops it while its crests drift
 * (to the left: the swell runs north-east, away and to the left) and it
 * rises and falls, the nearer strips later. Each reaches below its near
 * edge as far as the dive needs: the camera comes down from 60 m, nearer
 * strips move down more, and the gap a farther strip must fill opens
 * until the frame's bottom passes it. That reach is painted as the
 * strip's own near edge (its distance, its rows' spacing), so no seam
 * opens between strips at any height of the camera.
 *
 * The wavelets change with distance, as the eye sees them: far off, long
 * hair-thin streaks; in the middle distance, slivers with one crisp edge
 * (the crest) in clusters with calm gaps; near the eye, a broken net of
 * larger light and dark facets, low in contrast. Their clusters come and
 * go across each strip (the catspaws), so no row reads as a ruled line.
 *
 * The slicks lie on plates of their own, one over each strip at its depth
 * and still (no `swell`): their lanes are painted across the whole frame
 * without a repeat, so the ripples drift through them as through real
 * slicks, and the strips' repeats never show.
 *
 * Its engraving: paper, short broken strokes along the crests and in the
 * troughs, following the waves, denser and heavier near.
 */

/** The strips' far edges, metres ahead at the hold, far to near. */
const EDGES = [190, 135, 97, 70, 52, 39, 30, 23] as const;

/**
 * Each strip's repeat across, layer units: long near (the laptop's frame
 * is about 1300 units wide, so no near shape shows twice close by), and no
 * two strips alike, so their repeats never line up.
 */
const PERIODS = [331, 389, 523, 701, 853, 947, 1031, 1129] as const;

/** The frame's bottom at the hold and at the transition's start (layer units at the hold's horizon), and how far the camera comes down (m). */
const HOLD_BOTTOM = -283;
const DIVE_BOTTOM = -355;
const DIVE_DROP = 54;
const RIGHT = 892;

/** Where the wind's lanes run to on the horizon (the flags' wind, plates/heroes/flags.ts), layer units across. */
const WIND_VP = -140;

interface Strip {
  i: number;
  depth: number;
  /** Its crest's mean height, layer units at the hold. */
  top: number;
  bottom: number;
  /** The next nearer strip's crest (the frame's bottom for the last). */
  nextTop: number;
  /** From its crest to the next one, layer units. */
  gap: number;
  /** Its near edge, metres: the distance its reach below the next crest keeps. */
  near: number;
  period: number;
  /** The swell crest's rise and fall along it, layer units. */
  amp: number;
  /** The strip's rise and fall with the swell (plate.swell.amp). */
  bob: number;
}

/** A strip's place: its crest at the hold, and how far below it must reach for the dive. */
function strip(i: number): Strip {
  const depth = EDGES[i];
  const top = (-1000 * EYE_H) / depth;
  const next = EDGES[i + 1];
  let bottom: number;
  let nextTop: number;
  if (next === undefined) {
    nextTop = HOLD_BOTTOM;
    bottom = HOLD_BOTTOM - 9;
  } else {
    nextTop = (-1000 * EYE_H) / next;
    const h = Math.min(DIVE_DROP, (-DIVE_BOTTOM * next - 1000 * EYE_H) / 1000);
    bottom = nextTop - h * 1000 * (1 / next - 1 / depth) - 6;
  }
  const gap = top - nextTop;
  return {
    i,
    depth,
    top,
    bottom,
    nextTop,
    gap,
    near: next ?? (1000 * EYE_H) / -HOLD_BOTTOM,
    period: PERIODS[i],
    amp: Math.min(7, 0.14 * gap),
    bob: Math.min(2.4, 60 / depth + 0.3),
  };
}

/** The distance a strip paints at height y: the hold's, but never nearer than its near edge (the reach for the dive keeps the edge's look). */
function dAt(s: Strip, y: number): number {
  return Math.max(s.near, distanceAt(Math.min(-1, y)));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** A periodic function of x (period P): a sum of sines of whole harmonics. */
function periodic(
  seed: number,
  period: number,
  harmonics: readonly (readonly [number, number])[],
): (x: number) => number {
  const rng = createRng(seed);
  const parts = harmonics.map(([n, a]) => ({
    k: (2 * Math.PI * Math.max(1, Math.round(n))) / period,
    a,
    ph: rng() * Math.PI * 2,
  }));
  return (x: number) => {
    let v = 0;
    for (const p of parts) v += p.a * Math.sin(p.k * x + p.ph);
    return v;
  };
}

// ------------------------------------------------------------------ the swell

/** The swell's crest along the strip's top: long and gentle, with the wavelets' small teeth on it. */
function swellCrest(s: Strip): (x: number) => number {
  const long = periodic(700 + s.i * 17, s.period, [
    [1, 0.42],
    [2, 0.3],
    [3, 0.18],
    [5, 0.1],
  ]);
  const lw = Math.max(10, 900 / s.depth);
  const small = periodic(760 + s.i * 17, s.period, [
    [s.period / (lw * 3.1), 0.5],
    [s.period / (lw * 1.7), 0.3],
    [s.period / lw, 0.2],
  ]);
  const teeth = Math.min(1.2, 0.2 * s.amp + 0.25);
  return (x) => s.top + s.amp * long(x) + teeth * small(x);
}

/** The lowest the crest comes, layer units. */
function crestLow(s: Strip): number {
  return s.top - s.amp - Math.min(1.2, 0.2 * s.amp + 0.25);
}

function xs(c: PlateCanvas, step: number): number[] {
  const [x0, x1] = c.box;
  const out: number[] = [];
  const n = Math.ceil((x1 - x0) / step);
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n);
  return out;
}

/** The strip's water: its crest down to its bottom. */
function bodyPath(c: PlateCanvas, s: Strip, crest: (x: number) => number) {
  const p = new Path2D();
  const pts = xs(c, Math.min(4, Math.max(1.5, s.depth / 40)));
  p.moveTo(pts[0], s.bottom);
  for (const x of pts) p.lineTo(x, crest(x));
  p.lineTo(pts[pts.length - 1], s.bottom);
  p.closePath();
  return p;
}

/**
 * The strip's tone at height y: the water's body at its distance, a shade
 * darker just under the crest, a shade lighter toward the next crest. The
 * reach below the next crest keeps the near edge's tone. The swell's own
 * faces are drawn over it (paintFaces), patchy along the crest.
 */
function bodyTone(s: Strip, y: number): string {
  const d = dAt(s, y);
  const u = clamp01((s.top - y) / s.gap);
  const face = 0.07 * Math.exp(-u / 0.3);
  const back = 0.06 * smooth(0.4, 1, u);
  return mix(mix(waterBody(d), waterDark(d), face), waterLight(d), back);
}

function paintBody(c: PlateCanvas, s: Strip, crest: (x: number) => number) {
  const { ctx } = c;
  const top = s.top + s.amp + 1.5;
  const g = ctx.createLinearGradient(0, top, 0, s.bottom);
  const n = 18;
  for (let k = 0; k <= n; k++) {
    const y = top + ((s.bottom - top) * k) / n;
    g.addColorStop(k / n, bodyTone(s, y));
  }
  ctx.fillStyle = g;
  ctx.fill(bodyPath(c, s, crest));
}

/**
 * The swell's faces: under the crest, where the swell tilts toward the eye
 * and mirrors the higher, bluer sky, long soft shadows hang from it, some
 * deep, some barely there, some none, as a real swell's crest rises and
 * falls along its length; so no strip's edge reads as a ruled band.
 */
function paintFaces(c: PlateCanvas, s: Strip, crest: (x: number) => number) {
  const { ctx } = c;
  const rng = createRng(7300 + s.i * 29);
  const P = s.period;
  const [x0, x1] = c.box;
  const col = waterDark(s.depth * 0.9);
  const items: { a: number; b: number; h: number; al: number; pk: number }[] =
    [];
  let x = rng() * 60;
  while (x < P) {
    const len = P * (0.12 + 0.28 * rng());
    items.push({
      a: x,
      b: x + len,
      h: s.gap * (0.25 + 0.45 * rng()),
      al: 0.06 + 0.26 * rng() ** 1.5,
      pk: 0.25 + 0.5 * rng(),
    });
    x += len * (0.45 + 0.7 * rng());
  }
  for (const f of items) {
    for (let k = Math.floor((x0 - f.b) / P); k * P + f.a < x1; k++) {
      const a = f.a + k * P;
      const b = f.b + k * P;
      if (b < x0) continue;
      const top = s.top + s.amp;
      const g = ctx.createLinearGradient(0, top, 0, s.top - f.h);
      g.addColorStop(0, rgba(col, f.al));
      g.addColorStop(0.45, rgba(col, f.al * 0.55));
      g.addColorStop(1, rgba(col, 0));
      const n = Math.max(8, Math.ceil((b - a) / 6));
      const p = new Path2D();
      p.moveTo(a, crest(a));
      for (let i = 1; i <= n; i++) {
        const xx = a + ((b - a) * i) / n;
        p.lineTo(xx, crest(xx));
      }
      for (let i = n; i >= 0; i--) {
        const t = i / n;
        const xx = a + (b - a) * t;
        p.lineTo(xx, crest(xx) - f.h * prof(t, f.pk) ** 0.6);
      }
      p.closePath();
      ctx.fillStyle = g;
      ctx.fill(p);
    }
  }
}

/** The crest's rim: a thin light edge where the swell's crest catches the low sky, swelling and vanishing along it. */
function paintRim(c: PlateCanvas, s: Strip, crest: (x: number) => number) {
  const { ctx } = c;
  const vary = periodic(780 + s.i * 17, s.period, [
    [2, 0.35],
    [3, 0.3],
    [5, 0.2],
    [9, 0.15],
  ]);
  const th = c.pen(1.1) + 0.05 * s.amp;
  const pts = xs(c, 2);
  const p = new Path2D();
  p.moveTo(pts[0], crest(pts[0]));
  for (const x of pts) p.lineTo(x, crest(x));
  for (let k = pts.length - 1; k >= 0; k--) {
    const x = pts[k];
    p.lineTo(x, crest(x) - th * Math.max(0, 1.1 * vary(x) - 0.05));
  }
  p.closePath();
  ctx.fillStyle = rgba(waterLight(s.depth * 1.15), rimAlpha(s.depth));
  ctx.fill(p);
}

const rimAlpha = numByDistance([
  [190, 0.45],
  [97, 0.34],
  [62, 0.22],
  [52, 0.12],
  [30, 0.1],
]);

// ------------------------------------------------------------------ the wavelets

interface Row {
  y: number;
  d: number;
  dy: number;
  /** How far its line wanders up and down, layer units. */
  amp: number;
  seed: number;
}

function rows(s: Strip): Row[] {
  const rng = createRng(800 + s.i * 31);
  const out: Row[] = [];
  let y = crestLow(s) - 0.8;
  let k = 0;
  while (y > s.bottom) {
    const d = dAt(s, y);
    const dy = Math.min(12, Math.max(2, 6000 / (d * d))) * (0.75 + rng() * 0.5);
    out.push({
      y,
      d,
      dy,
      amp: Math.min(3, 0.18 * dy + 25 / d) * (0.7 + rng() * 0.6),
      seed: 900 + s.i * 97 + k * 13,
    });
    y -= dy;
    k++;
  }
  return out;
}

/** Mean length of a mark along its row, layer units, by distance: long streaks far off, short slivers in between, larger facets near. */
const markLen = numByDistance([
  [220, 64],
  [150, 50],
  [110, 32],
  [75, 24],
  [52, 28],
  [38, 38],
  [28, 50],
  [20, 64],
]);

/** A mark's thickness, layer units. */
const markTh = numByDistance([
  [220, 0.5],
  [150, 0.65],
  [110, 0.95],
  [75, 1.1],
  [52, 1.8],
  [38, 2.6],
  [28, 3.6],
  [20, 4.8],
]);

/** How much of a row the marks cover where the catspaws are. */
const markCover = numByDistance([
  [220, 0.42],
  [110, 0.48],
  [60, 0.5],
  [35, 0.55],
  [20, 0.6],
]);

/** The share of light marks (far off the faces hide the backs). */
const markLight = numByDistance([
  [220, 0.4],
  [120, 0.45],
  [60, 0.5],
  [30, 0.5],
]);

/** The share of marks that are a pair, a light back over a dark face. */
const markPair = numByDistance([
  [150, 0],
  [90, 0.2],
  [50, 0.5],
  [25, 0.65],
]);

const lightAlpha = numByDistance([
  [220, 0.6],
  [130, 0.55],
  [85, 0.44],
  [62, 0.22],
  [45, 0.19],
  [25, 0.19],
]);

const darkAlpha = numByDistance([
  [220, 0.3],
  [130, 0.36],
  [85, 0.4],
  [50, 0.42],
  [25, 0.44],
]);

/**
 * The catspaws: where the light air ruffles the water and where it lies
 * still, 0..1, across a strip (whole harmonics of its period, so it
 * repeats with the strip) and slowly changing down it, so patches span a
 * few rows and lean a little.
 */
function catspaws(s: Strip): (x: number, y: number) => number {
  const rng = createRng(6100 + s.i * 41);
  const waves = Array.from({ length: 6 }, (_, k) => ({
    k: (2 * Math.PI * (1 + Math.floor(rng() * (3 + k)))) / s.period,
    ky: ((rng() - 0.5) * 0.5) / Math.max(4, s.gap * 0.25),
    a: 1 / (1 + k * 0.4),
    ph: rng() * Math.PI * 2,
  }));
  const sum = waves.reduce((t, w) => t + w.a, 0);
  return (x, y) => {
    let v = 0;
    for (const w of waves) v += w.a * Math.sin(w.k * x + w.ky * y + w.ph);
    return clamp01(0.5 + (0.95 * v) / sum);
  };
}

interface Mark {
  x0: number;
  x1: number;
  /** Up from the row's line, layer units. */
  off: number;
  /** Bow of its middle (up positive) and its S-bend, layer units. */
  bow: number;
  bend: number;
  th: number;
  /** Where along it its thickness peaks, 0..1. */
  peak: number;
  kind: "light" | "dark" | "pair";
  strong: boolean;
}

/** The marks of a row over one period, seeded: runs of them in the catspaws, few in the still water. */
function marksOf(s: Strip, r: Row, cat: (x: number, y: number) => number) {
  const rng = createRng(r.seed);
  const L = markLen(r.d);
  const th = markTh(r.d);
  const cover = markCover(r.d);
  const pLight = markLight(r.d);
  const pPair = markPair(r.d);
  const out: Mark[] = [];
  let x = rng() * L * 2;
  let off = (rng() - 0.5) * 0.4 * r.dy;
  while (x < s.period) {
    const len = L * (0.35 + 1.1 * rng() ** 1.5 + 0.5 * rng());
    const c = cat(x + len / 2, r.y);
    if (c > 0.1 && rng() < cover * (0.2 + 1.2 * c)) {
      const kind = rng() < pPair ? "pair" : rng() < pLight ? "light" : "dark";
      out.push({
        x0: x,
        x1: x + len,
        off,
        bow: (rng() - 0.4) * 0.35 * r.dy,
        bend: (rng() - 0.5) * 0.3 * r.dy,
        th: th * (0.6 + 0.8 * rng()) * (0.75 + 0.45 * c),
        peak: 0.3 + 0.4 * rng(),
        kind,
        strong: rng() < 0.25 + 0.4 * c,
      });
    }
    // The next mark: a step up or down from this one, as the wavelets'
    // crests stagger, so runs of marks weave rather than line up.
    off = Math.max(
      -0.5 * r.dy,
      Math.min(0.5 * r.dy, off + (rng() - 0.5) * 0.6 * r.dy),
    );
    const still = 1 - c;
    x +=
      len * (0.55 + 0.3 * rng()) +
      (L * (0.2 + 1.4 * rng()) * (0.4 + 2.4 * still * still)) / (0.6 + cover);
  }
  return out;
}

function prof(t: number, peak: number): number {
  return t < peak
    ? Math.sin((Math.PI / 2) * (t / peak))
    : Math.sin((Math.PI / 2) * ((1 - t) / (1 - peak)));
}

/**
 * A spindle along `centre` from a to b, `up` thick above it and `down`
 * below, tapering to both ends.
 */
function spindle(
  p: Path2D,
  a: number,
  b: number,
  centre: (x: number) => number,
  up: number,
  down: number,
  peak: number,
) {
  const n = Math.max(5, Math.min(24, Math.ceil((b - a) / 3)));
  p.moveTo(a, centre(a));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = a + (b - a) * t;
    p.lineTo(x, centre(x) + up * prof(t, peak));
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / n;
    const x = a + (b - a) * t;
    p.lineTo(x, centre(x) - down * prof(t, peak));
  }
  p.closePath();
}

function paintRows(
  c: PlateCanvas,
  s: Strip,
  rs: readonly Row[],
  cat: (x: number, y: number) => number,
) {
  const { ctx } = c;
  const [x0, x1] = c.box;
  const P = s.period;
  const hair = c.pen(0.45);
  for (const r of rs) {
    const wob = periodic(r.seed + 5, P, [
      [P / 260, 0.5],
      [P / 120, 0.3],
      [P / 55, 0.2],
    ]);
    const line = (x: number) => r.y + r.amp * wob(x);
    const ms = marksOf(s, r, cat);
    // Two strengths per kind; each mark a soft body and a crisp core on
    // its crest side (the light back's lower edge, the dark face's upper).
    const soft = {
      light: [new Path2D(), new Path2D()],
      dark: [new Path2D(), new Path2D()],
    };
    const core = {
      light: [new Path2D(), new Path2D()],
      dark: [new Path2D(), new Path2D()],
    };
    for (const m of ms) {
      const st = m.strong ? 1 : 0;
      for (let k = Math.floor((x0 - m.x1) / P); k * P + m.x0 < x1; k++) {
        const a = m.x0 + k * P;
        const b = m.x1 + k * P;
        if (b < x0) continue;
        const span = b - a;
        const centre = (x: number) => {
          const t = (x - a) / span;
          return (
            line(x) +
            m.off +
            m.bow * 4 * t * (1 - t) +
            m.bend * Math.sin(2 * Math.PI * t)
          );
        };
        const coreTh = Math.max(hair, m.th * 0.22);
        if (m.kind !== "dark") {
          spindle(soft.light[st], a, b, centre, m.th * 0.2, m.th, m.peak);
          spindle(
            core.light[st],
            a + span * 0.06,
            b - span * 0.1,
            centre,
            coreTh * 0.5,
            coreTh,
            m.peak,
          );
        }
        if (m.kind !== "light") {
          const pair = m.kind === "pair";
          const da = pair ? a + span * 0.18 : a;
          const db = pair ? b + span * 0.06 : b;
          const below = (x: number) => centre(x) - (pair ? m.th * 0.9 : 0);
          spindle(
            soft.dark[st],
            da,
            db,
            below,
            m.th * 0.15,
            m.th * 1.1,
            1 - m.peak,
          );
          spindle(
            core.dark[st],
            da + span * 0.05,
            db - span * 0.08,
            below,
            coreTh * 0.5,
            coreTh,
            1 - m.peak,
          );
        }
      }
    }
    const la = lightAlpha(r.d);
    const lc = waterLight(r.d);
    const da = darkAlpha(r.d);
    const dc = waterDark(r.d);
    for (const k of [0, 1]) {
      const sw = k ? 1 : 0.62;
      ctx.fillStyle = rgba(dc, da * 0.5 * sw);
      ctx.fill(soft.dark[k]);
      ctx.fillStyle = rgba(dc, da * sw);
      ctx.fill(core.dark[k]);
      ctx.fillStyle = rgba(lc, la * 0.45 * sw);
      ctx.fill(soft.light[k]);
      ctx.fillStyle = rgba(lc, la * sw);
      ctx.fill(core.light[k]);
    }
  }
}

// ------------------------------------------------------------------ the engraving

/**
 * The engraving's tone for the colour's value (docs/reviews/boulogne-sea/
 * s27-critique-whole.md, finding 3): the lines' spacing about k / (1 - L)
 * for the colour's relative luminance L, so the engraving is the
 * painting's value map in line: close, heavier lines where the water is
 * dark (near the eye), wide, fine ones where it is light (far off).
 */
function inkTone(s: Strip, y: number): number {
  return luminance(bodyTone(s, y));
}

interface InkRow {
  y: number;
  d: number;
  /** The colour's value here, 0..1. */
  L: number;
  /** How far its line wanders, layer units. */
  amp: number;
  /** In the swell's face, just under the crest: the lines tightest there. */
  face: boolean;
  seed: number;
}

function inkRowsOf(s: Strip): InkRow[] {
  const rng = createRng(1800 + s.i * 31);
  const out: InkRow[] = [];
  let y = crestLow(s) - 0.6;
  let k = 0;
  while (y > s.bottom) {
    const d = dAt(s, y);
    const L = inkTone(s, y);
    const u = clamp01((s.top - y) / s.gap);
    const face = u < 0.22;
    out.push({
      y,
      d,
      L,
      amp: Math.min(1.6, 0.25 + 30 / d) * (0.7 + rng() * 0.6),
      face,
      seed: 1900 + s.i * 97 + k * 13,
    });
    const sp = (2.5 / (1 - L)) * (face ? 0.72 : 1) * (0.85 + rng() * 0.3);
    y -= sp;
    k++;
  }
  return out;
}

/**
 * The engraved water: long horizontal lines that follow the wavelets,
 * fine and nearly unbroken far off, opening to bare paper in the still
 * patches (the slicks' glassy lanes, bright with the low sky); shorter,
 * wavier strokes in the middle distance; closer and heavier near the eye,
 * tightest in the swell's faces. Over one period, repeated across.
 */
function inkRows(
  c: PlateCanvas,
  s: Strip,
  rs: readonly InkRow[],
  cat: (x: number, y: number) => number,
): void {
  const { ctx } = c;
  const [x0, x1] = c.box;
  const P = s.period;
  for (const r of rs) {
    const rng = createRng(r.seed);
    const dark = 1 - r.L;
    const wob = periodic(r.seed + 5, P, [
      [P / 300, 0.45],
      [P / 140, 0.3],
      [P / 60, 0.25],
    ]);
    // Wavelets along the line: small bumps, larger near.
    const ripple = periodic(r.seed + 7, P, [
      [P / Math.max(6, 900 / r.d), 0.6],
      [P / Math.max(4, 500 / r.d), 0.4],
    ]);
    const bump = Math.min(0.9, 12 / r.d);
    const line = (x: number) => r.y + r.amp * wob(x) + bump * ripple(x);
    // Strokes: long far off, shorter in the middle, long and heavy near.
    const len =
      r.d > 110 ? 70 + 0.3 * r.d : r.d > 50 ? 22 + 0.35 * r.d : 50 + 900 / r.d;
    const strokes: [number, number][] = [];
    let x = rng() * len;
    while (x < P) {
      const l = len * (0.4 + 1.2 * rng());
      const calm = 1 - cat(x + l / 2, r.y);
      // The still patches are bright far off: open paper there; near, the
      // lines only thin out.
      const open = r.d > 70 ? calm * calm * 1.2 : calm * 0.5;
      if (rng() > open) strokes.push([x, x + l]);
      x += l + len * (0.08 + 0.35 * rng()) * (0.4 + 1.6 * (1 - dark));
    }
    // Each stroke a burin's line: swelling in its middle, tapering to
    // nothing at both ends.
    const p = new Path2D();
    const step = Math.max(1.5, Math.min(6, len / 10));
    const w = c.pen(0.55 + 1.5 * dark * dark + (r.face ? 0.2 : 0)) / 2;
    for (const [a0, b0] of strokes) {
      const peak = 0.3 + 0.4 * rng();
      const swell = 0.6 + 0.7 * rng();
      for (let k = Math.floor((x0 - b0) / P); k * P + a0 < x1; k++) {
        const a = a0 + k * P;
        const b = b0 + k * P;
        if (b < x0) continue;
        const n = Math.max(3, Math.ceil((b - a) / step));
        p.moveTo(a, line(a));
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const xx = a + (b - a) * t;
          p.lineTo(xx, line(xx) + w * swell * prof(t, peak) ** 0.6);
        }
        for (let i = n - 1; i > 0; i--) {
          const t = i / n;
          const xx = a + (b - a) * t;
          p.lineTo(xx, line(xx) - w * swell * prof(t, peak) ** 0.6);
        }
        p.closePath();
      }
    }
    ctx.fillStyle = rgba(dark > 0.85 ? INK.line : INK.hatch, 0.5 + 0.4 * dark);
    ctx.fill(p);
  }
}

// ------------------------------------------------------------------ the slicks

interface Slick {
  a: number;
  b: number;
  /** Its middle's height, layer units, and its tilt toward the wind's lanes. */
  y: number;
  tilt: number;
  /** Up from the middle (its crisp far edge) and down (its ragged near edge), layer units. */
  up: number;
  down: number;
  d: number;
  alpha: number;
  seed: number;
}

/** The slicks' reach across: the frame and the hold's drift (a still plate slides by the drift at its depth). */
function slickBox(s: Strip): [number, number, number, number] {
  return [
    -RIGHT,
    RIGHT + (1000 * SEA_DRIFT) / s.depth + 12,
    s.bottom,
    crestLow(s) - s.bob - 1,
  ];
}

const slickAlpha = numByDistance([
  [190, 0.72],
  [120, 0.62],
  [80, 0.5],
  [55, 0.55],
  [30, 0.6],
]);

/**
 * The slicks on a strip, painted without a repeat across the whole frame:
 * glassy patches of the light air's evening sea, each a lane longer than
 * wide (perspective flattens it), leaning a little toward the wind's lanes
 * on the horizon; fewer and thinner toward the horizon.
 */
function slicksOf(s: Strip): Slick[] {
  const rng = createRng(5100 + s.i * 53);
  const [x0, x1, y0, y1] = slickBox(s);
  const out: Slick[] = [];
  const area = (x1 - x0) * (y1 - y0);
  // A broad field of where the water lies glassy: wide lanes across the frame.
  const field = (x: number) =>
    0.55 +
    0.3 * Math.sin(x * 0.0042 + s.i * 1.7) +
    0.2 * Math.sin(x * 0.011 + s.i * 0.9);
  let covered = 0;
  const target = area * (0.16 + 0.1 * (s.i / 7));
  let guard = 0;
  while (covered < target && guard++ < 400) {
    const y = y0 + (y1 - y0) * rng();
    const d = dAt(s, y);
    const xm = x0 + (x1 - x0) * rng();
    if (rng() > field(xm)) continue;
    // A patch some 20-70 m across and 4-20 m along the view, seen from the eye.
    const across = 20 + 50 * rng() ** 1.4;
    const along = 4 + 16 * rng();
    const len = Math.min(560, (1000 * across) / d);
    const tall = Math.min(0.45 * s.gap + 4, (1000 * EYE_H * along) / (d * d));
    const up = Math.max(0.6, tall * (0.3 + 0.15 * rng()));
    const down = Math.max(0.8, tall * (0.45 + 0.3 * rng()));
    const toVp = -y / (WIND_VP - xm);
    const tilt = Math.max(-0.035, Math.min(0.035, 0.15 * toVp));
    out.push({
      a: xm - len / 2,
      b: xm + len / 2,
      y,
      tilt,
      up,
      down,
      d,
      alpha: slickAlpha(d) * (0.7 + 0.3 * rng()),
      seed: 5200 + s.i * 101 + out.length * 7,
    });
    covered += len * (up + down) * 0.6;
  }
  return out;
}

function slickPath(m: Slick): Path2D {
  const rng = createRng(m.seed);
  const n = Math.max(10, Math.min(48, Math.ceil((m.b - m.a) / 8)));
  const mid = (m.a + m.b) / 2;
  const ph = rng() * 6;
  const ph2 = rng() * 6;
  const lobes = 2 + Math.floor(rng() * 4);
  const peak = 0.35 + 0.3 * rng();
  const centre = (x: number) =>
    m.y +
    m.tilt * (x - mid) +
    0.25 * m.down * Math.sin(ph + ((x - m.a) / (m.b - m.a)) * 3.1);
  const p = new Path2D();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = m.a + (m.b - m.a) * t;
    const y = centre(x) + m.up * prof(t, peak) ** 0.7;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const x = m.a + (m.b - m.a) * t;
    const rag =
      0.75 +
      0.2 * Math.sin(ph2 + t * Math.PI * 2 * lobes) +
      0.12 * Math.sin(ph2 * 2.3 + t * Math.PI * 2 * lobes * 2.7);
    p.lineTo(x, centre(x) - m.down * rag * prof(t, 1 - peak) ** 0.9);
  }
  p.closePath();
  return p;
}

function paintSlicks(c: PlateCanvas, ms: readonly Slick[]) {
  const { ctx } = c;
  for (const m of ms) {
    const col = waterSlick(m.d);
    const g = ctx.createLinearGradient(0, m.y + m.up, 0, m.y - m.down);
    g.addColorStop(0, rgba(col, m.alpha));
    g.addColorStop(0.35, rgba(col, m.alpha * 0.9));
    g.addColorStop(0.75, rgba(col, m.alpha * 0.5));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill(slickPath(m));
  }
}

function slickPlate(i: number): Plate {
  const s = strip(i);
  let memo: Slick[] | null = null;
  const get = (): Slick[] => {
    memo ??= slicksOf(s);
    return memo;
  };
  const parts = 3;
  return {
    id: `swell-${i}-slicks`,
    depth: s.depth - 0.01,
    box: slickBox(s),
    group: "water",
    resolution: { colour: 0.5 },
    jobs: (mode) =>
      mode === "colour"
        ? Array.from({ length: parts }, (_, k) => (c: PlateCanvas) => {
            const ms = get();
            const n = Math.ceil(ms.length / parts);
            paintSlicks(c, ms.slice(k * n, (k + 1) * n));
          })
        : [],
  };
}

// ------------------------------------------------------------------ plates

function swellPlate(i: number): Plate {
  const s = strip(i);
  let memo: Row[] | null = null;
  let inkMemo: InkRow[] | null = null;
  const crest = swellCrest(s);
  const cat = catspaws(s);
  const get = (): Row[] => {
    memo ??= rows(s);
    return memo;
  };
  const getInk = (): InkRow[] => {
    inkMemo ??= inkRowsOf(s);
    return inkMemo;
  };
  const chunk = <T>(rs: T[], k: number, n: number): T[] => {
    const size = Math.ceil(rs.length / n);
    return rs.slice(k * size, (k + 1) * size);
  };
  const rng = createRng(4200 + i);
  const seconds = 8 + rng() * 2.5;
  // Jobs are listed before the rows exist; each picks its chunk when it runs.
  const parts = i < 3 ? 28 : 16;
  return {
    id: `swell-${i}`,
    depth: s.depth,
    box: [-RIGHT, RIGHT + s.period, s.bottom, s.top + s.amp + 1.5],
    group: "water",
    swell: {
      drift: -1200 / s.depth,
      period: s.period,
      amp: s.bob,
      seconds,
      delay: 0.45 * i,
    },
    jobs: (mode) => {
      const jobs: PlateJob[] = [];
      if (mode === "colour") {
        jobs.push((c) => {
          paintBody(c, s, crest);
          paintFaces(c, s, crest);
        });
        for (let k = 0; k < parts; k++)
          jobs.push((c) => paintRows(c, s, chunk(get(), k, parts), cat));
        jobs.push((c) => paintRim(c, s, crest));
      } else {
        jobs.push((c) => {
          c.ctx.fillStyle = PAPER.low;
          c.ctx.fill(bodyPath(c, s, crest));
        });
        for (let k = 0; k < parts; k++)
          jobs.push((c) => inkRows(c, s, chunk(getInk(), k, parts), cat));
      }
      return jobs;
    },
  };
}

export function swellPlates(): Plate[] {
  return EDGES.flatMap((_, i) => [swellPlate(i), slickPlate(i)]);
}
