import {
  createRng,
  field,
  mix,
  type Pt,
  rgba,
  softBlob,
  wobble,
} from "../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../paint/plate";
import { aerial } from "../scene";
import { type Box, brokenLine, penAt, strokeLines } from "./town/kit";

/**
 * The hills inland (brief, "Owner review": hills with fields and hedges,
 * drawn in hatching, not flat fill): Mont Lambert's broad top standing
 * behind the upper town, so the belfry and its telegraph stand against
 * its slope; the Boulonnais' ridges falling away to the north and, past
 * the Liane's valley, rising again to the south; a farther, paler ridge
 * showing through the gaps. Hazy, cool and low in contrast, but drawn:
 * a patchwork of harvest fields and pasture under fine hatching, hedges
 * as broken lines, copses as dark clumps; the slopes turned to the west
 * warmer, those turned south-west cooler.
 *
 * Heights at the land's licence (scene.ts VEX): Mont Lambert, 187 m about
 * 5.3 km off, tops at y ≈ 86.8 just right of the belfry (x ≈ 123). Its
 * skyline is kept smooth from x 40 to 250 for the moon to rise on.
 */

const NEAR_DEPTH = 5300;
const FAR_DEPTH = 7400;
const NEAR_BOX: Box = [-915, 915, -8, 93];
const FAR_BOX: Box = [-915, 915, 28, 82];

/** The near hills' skyline control points (layer units). */
const NEAR_RIDGE: readonly Pt[] = [
  [-940, 56],
  [-800, 61],
  [-650, 55],
  [-500, 64],
  [-360, 68],
  [-230, 72.5],
  [-110, 78],
  [-10, 84.6],
  [60, 87.6],
  [123, 88.2],
  [190, 87.4],
  [250, 83.6],
  [305, 75],
  [360, 61],
  [420, 51.5],
  [490, 52.5],
  [580, 59],
  [690, 63],
  [800, 58],
  [940, 62],
];

const FAR_RIDGE: readonly Pt[] = [
  [-940, 64],
  [-780, 70],
  [-600, 67.5],
  [-470, 73],
  [-330, 70],
  [-180, 74],
  [0, 70],
  [200, 69],
  [330, 66],
  [430, 68.5],
  [560, 72],
  [700, 67],
  [820, 70.5],
  [940, 66],
];

/** Catmull-Rom through control points, sampled every `step` units of x, plus a seeded wobble kept calm where `calm` says. */
function skyline(
  ctrl: readonly Pt[],
  step: number,
  seed: number,
  amp: number,
  calm: (x: number) => number,
): Pt[] {
  const out: Pt[] = [];
  const w = wobble(seed, [
    [140, amp],
    [47, amp * 0.45],
    [13, amp * 0.15],
  ]);
  for (let x = ctrl[0][0]; x <= ctrl[ctrl.length - 1][0]; x += step) {
    let i = 0;
    while (i < ctrl.length - 2 && ctrl[i + 1][0] < x) i++;
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    out.push([x, y + w(x) * calm(x)]);
  }
  return out;
}

const calmLambert = (x: number) =>
  x > 20 && x < 270 ? 0.15 : x > -40 && x < 320 ? 0.5 : 1;

interface Hills {
  ridge: Pt[];
  /** The face's y for x and a depth into the face t (0 at the skyline, 1 at the foot). */
  faceY(x: number, t: number): number;
  /** Local slope of the ridge (dy/dx), smoothed. */
  slope(x: number): number;
  fields: { poly: Pt[]; tone: string; angle: number; seed: number }[];
  hedges: Pt[][];
  copses: { x: number; y: number; r: number }[];
}

let nearCache: Hills | undefined;

const FIELD_TONES = [
  "#d3bb6a",
  "#c9b373",
  "#a7a75e",
  "#8d9455",
  "#b59f70",
  "#d8c58e",
  "#9aa063",
] as const;

function nearHills(): Hills {
  if (nearCache) return nearCache;
  const ridge = skyline(NEAR_RIDGE, 3, 501, 1.6, calmLambert);
  const x0 = ridge[0][0];
  const at = (x: number) => {
    const i = Math.max(0, Math.min(ridge.length - 1, Math.round((x - x0) / 3)));
    return ridge[i][1];
  };
  const foot = NEAR_BOX[2];
  const faceY = (x: number, t: number) => at(x) - (at(x) - foot) * t ** 1.25;
  const slope = (x: number) => (at(x + 24) - at(x - 24)) / 48;
  const rng = createRng(733);
  const fields: Hills["fields"] = [];
  const hedges: Pt[][] = [];
  const copses: Hills["copses"] = [];
  // A patchwork: columns of irregular width across the face, each cut
  // into fields by its own boundaries down the slope, so no line runs on
  // from one column to the next.
  let a = x0;
  while (a < 940) {
    const b = a + 22 + rng() * 40;
    let t0 = 0.008 + rng() * 0.02;
    while (t0 < 0.97) {
      const t1 = Math.min(1, t0 + 0.03 + rng() * 0.07);
      const lean0 = (rng() - 0.5) * 0.02;
      const lean1 = (rng() - 0.5) * 0.02;
      const poly: Pt[] = [];
      for (let x = a; x <= b; x += 3)
        poly.push([x, faceY(x, t0 + lean0 * ((x - a) / (b - a)))]);
      poly.push([b, faceY(b, t0 + lean0)]);
      for (let x = b; x >= a; x -= 3)
        poly.push([x, faceY(x, t1 + lean1 * ((x - a) / (b - a)))]);
      poly.push([a, faceY(a, t1)]);
      fields.push({
        poly,
        tone: FIELD_TONES[Math.floor(rng() * FIELD_TONES.length)],
        angle: rng() < 0.5 ? (rng() - 0.5) * 16 : 60 + rng() * 60,
        seed: Math.floor(rng() * 1e6),
      });
      if (rng() < 0.35) hedges.push(poly.slice(0, Math.ceil(poly.length / 2)));
      if (rng() < 0.4)
        hedges.push([
          [a, faceY(a, t0)],
          [a + (rng() - 0.5) * 3, faceY(a, (t0 + t1) / 2)],
          [a, faceY(a, t1)],
        ]);
      if (rng() < 0.1)
        copses.push({
          x: (a + b) / 2 + (rng() - 0.5) * (b - a) * 0.6,
          y: faceY((a + b) / 2, (t0 + t1) / 2),
          r: 3 + rng() * 6,
        });
      t0 = t1;
    }
    a = b;
  }
  nearCache = { ridge, faceY, slope, fields, hedges, copses };
  return nearCache;
}

function facePath(ridge: readonly Pt[], foot: number): Path2D {
  const p = new Path2D();
  p.moveTo(ridge[0][0], foot);
  for (const [x, y] of ridge) p.lineTo(x, y);
  p.lineTo(ridge[ridge.length - 1][0], foot);
  p.closePath();
  return p;
}

const AIR = NEAR_DEPTH;

function nearWash(c: PlateCanvas): void {
  const { ctx } = c;
  const h = nearHills();
  const p = facePath(h.ridge, NEAR_BOX[2]);
  if (c.mode === "ink") {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    return;
  }
  const top = aerial("#c0b276", AIR);
  const mid = aerial("#a39f6a", AIR);
  const low = aerial("#8a8a72", AIR);
  const g = ctx.createLinearGradient(0, 88, 0, NEAR_BOX[2]);
  g.addColorStop(0, top);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, low);
  ctx.fillStyle = g;
  ctx.fill(p);
}

function nearFields(c: PlateCanvas, from: number, to: number): void {
  const { ctx } = c;
  const h = nearHills();
  const list = h.fields.slice(from, to);
  const light = field(91, 300, 2);
  for (const f of list) {
    const path = new Path2D();
    path.moveTo(f.poly[0][0], f.poly[0][1]);
    for (const q of f.poly) path.lineTo(q[0], q[1]);
    path.closePath();
    const cx = f.poly[0][0];
    // West-facing (the ridge rising to the right) warmer; south-west-facing cooler.
    const s = h.slope(cx);
    const lit =
      Math.max(-1, Math.min(1, s * 3)) * 0.5 +
      0.5 +
      light(cx, f.poly[0][1]) * 0.15;
    if (c.mode === "colour") {
      const tone = aerial(
        mix(mix(f.tone, "#7c8174", 0.45 - lit * 0.45), "#e2c68e", lit * 0.18),
        AIR,
      );
      ctx.fillStyle = rgba(tone, 0.6);
      ctx.fill(path);
      ctx.save();
      ctx.clip(path);
      fieldStrokes(
        c,
        f,
        aerial(mix(f.tone, "#6f7556", 0.5), AIR),
        0.33,
        1.6,
        0.55,
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.clip(path);
      if ((f.seed & 3) !== 0)
        fieldStrokes(
          c,
          f,
          INK.hatch,
          0.32 + (1 - lit) * 0.3,
          2.4 - (1 - lit) * 0.7,
          0.5,
        );
      ctx.restore();
    }
  }
}

function fieldStrokes(
  c: PlateCanvas,
  f: { poly: Pt[]; angle: number; seed: number },
  colour: string,
  alpha: number,
  spacing: number,
  width: number,
): void {
  const { ctx } = c;
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of f.poly) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const a = (f.angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a) * 0.45;
  const n = Math.hypot(ux, uy);
  const dx = ux / n;
  const dy = uy / n;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
  const step = c.pen(spacing);
  const rng = createRng(f.seed);
  ctx.beginPath();
  for (let s = -half; s <= half; s += step * (0.8 + rng() * 0.4)) {
    const bx = cx - dy * s;
    const by = cy + dx * s;
    const l = half * (0.7 + rng() * 0.3);
    ctx.moveTo(bx - dx * l, by - dy * l);
    ctx.lineTo(bx + dx * l, by + dy * l);
  }
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = c.pen(width);
  ctx.stroke();
}

function nearHedges(c: PlateCanvas): void {
  const h = nearHills();
  const pen = penAt(AIR);
  const lines: Pt[][] = [];
  h.hedges.forEach((l, i) => {
    lines.push(...brokenLine(l, 5, 1.6, 900 + i));
  });
  if (c.mode === "colour") {
    strokeLines(c, lines, 1.1, aerial("#556043", AIR), 0.7);
    strokeLines(
      c,
      lines.map((l) => l.map(([x, y]) => [x - 0.25, y + 0.35] as Pt)),
      0.6,
      aerial("#a8a35e", AIR),
      0.5,
    );
  } else {
    // Hedges as dotted lines.
    const { ctx } = c;
    ctx.fillStyle = rgba(INK.line, 0.7);
    const r = c.pen(pen * 0.55);
    ctx.beginPath();
    for (const l of h.hedges)
      for (let i = 0; i < l.length; i++) {
        const [x, y] = l[i];
        if (i % 2) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    ctx.fill();
  }
}

function nearCopses(c: PlateCanvas): void {
  const { ctx } = c;
  const h = nearHills();
  const dark = aerial("#4f5c45", AIR);
  const lit = aerial("#8c8d52", AIR);
  for (const k of h.copses) {
    const rng = createRng(Math.floor(k.x * 13 + k.y * 7));
    const blobs: [number, number, number, number][] = [];
    for (let i = 0; i < 6; i++)
      blobs.push([
        k.x + (rng() - 0.5) * k.r * 1.6,
        k.y + rng() * k.r * 0.35,
        k.r * (0.3 + rng() * 0.25),
        k.r * (0.18 + rng() * 0.12),
      ]);
    if (c.mode === "colour") {
      for (const [x, y, rx, ry] of blobs) {
        ctx.fillStyle = rgba(dark, 0.85);
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(lit, 0.6);
        ctx.beginPath();
        ctx.ellipse(
          x - rx * 0.3,
          y + ry * 0.25,
          rx * 0.5,
          ry * 0.5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else {
      const p = new Path2D();
      for (const [x, y, rx, ry] of blobs) {
        p.moveTo(x + rx, y);
        p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = PAPER.low;
      ctx.fill(p);
      ctx.strokeStyle = rgba(INK.line, 0.65);
      ctx.lineWidth = c.pen(0.6);
      ctx.stroke(p);
    }
  }
}

/** The near hills' modelling: the south-west flanks cooler, the summit band lighter in the haze. */
function nearModel(c: PlateCanvas): void {
  const { ctx } = c;
  const h = nearHills();
  const p = facePath(h.ridge, NEAR_BOX[2]);
  ctx.save();
  ctx.clip(p);
  if (c.mode === "colour") {
    for (let x = -900; x < 900; x += 28) {
      const s = h.slope(x);
      if (s < -0.04)
        softBlob(
          c,
          x,
          h.faceY(x, 0.18),
          28,
          14,
          aerial("#6e7489", AIR),
          Math.min(0.32, -s * 1.1),
        );
      if (s > 0.04)
        softBlob(
          c,
          x,
          h.faceY(x, 0.12),
          26,
          10,
          aerial("#e8c991", AIR),
          Math.min(0.22, s * 0.9),
        );
    }
    // The haze over the hills' feet.
    const g = ctx.createLinearGradient(0, 40, 0, NEAR_BOX[2]);
    g.addColorStop(0, rgba(aerial("#c9bcb6", AIR), 0));
    g.addColorStop(1, rgba(aerial("#c9bcb6", AIR), 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(NEAR_BOX[0], NEAR_BOX[2], NEAR_BOX[1] - NEAR_BOX[0], 50);
  } else {
    // Contour-following hatching, closer on the flanks turned from the sun.
    const lines: Pt[][] = [];
    for (let k = 1; k < 26; k++) {
      const t = k * 0.034;
      const l: Pt[] = [];
      for (let x = -912; x <= 912; x += 3) {
        const s = h.slope(x);
        if (s < -0.03 || k % 3 === 0) l.push([x, h.faceY(x, t)]);
        else if (l.length) {
          lines.push(...brokenLine(l.splice(0), 9, 4, k * 31 + Math.floor(x)));
        }
      }
      if (l.length > 1) lines.push(...brokenLine(l, 9, 4, k * 17));
    }
    strokeLines(c, lines, penAt(AIR) * 0.55, INK.hatch, 0.5);
  }
  ctx.restore();
  // The skyline: a fine contour.
  if (c.mode === "ink")
    strokeLines(
      c,
      brokenLine(h.ridge, 120, 2.5, 5),
      penAt(AIR),
      INK.line,
      0.85,
    );
  else strokeLines(c, [h.ridge], 0.7, aerial("#d9c79a", AIR), 0.6);
}

function nearPlate(): Plate {
  const jobs = (): PlateJob[] => {
    const out: PlateJob[] = [() => void nearHills(), (c) => nearWash(c)];
    for (let i = 0; i < 2000; i += 45)
      out.push((c) => nearFields(c, i, i + 45));
    out.push((c) => nearModel(c));
    out.push((c) => nearHedges(c));
    out.push((c) => nearCopses(c));
    return out;
  };
  return { id: "hills", depth: NEAR_DEPTH, box: NEAR_BOX, group: "land", jobs };
}

function farPlate(): Plate {
  const ridge = () => skyline(FAR_RIDGE, 4, 77, 1.2, () => 1);
  const jobs = (mode: PlateMode): PlateJob[] => [
    (c) => {
      const { ctx } = c;
      const r = ridge();
      const p = facePath(r, FAR_BOX[2]);
      if (mode === "colour") {
        const g = ctx.createLinearGradient(0, 75, 0, FAR_BOX[2]);
        g.addColorStop(0, aerial("#a9a493", FAR_DEPTH));
        g.addColorStop(1, aerial("#9c9aa6", FAR_DEPTH));
        ctx.fillStyle = g;
        ctx.fill(p);
        ctx.save();
        ctx.clip(p);
        const rng = createRng(19);
        for (let i = 0; i < 50; i++)
          softBlob(
            c,
            -900 + rng() * 1800,
            40 + rng() * 30,
            30 + rng() * 60,
            4 + rng() * 5,
            rng() < 0.5
              ? aerial("#8f93a6", FAR_DEPTH)
              : aerial("#cdbd98", FAR_DEPTH),
            0.22,
          );
        ctx.restore();
      } else {
        ctx.fillStyle = PAPER.low;
        ctx.fill(p);
        const lines: Pt[][] = [];
        for (let k = 1; k < 7; k++)
          lines.push(
            ...brokenLine(
              r.map(([x, y]) => [x, y - k * k * 0.5] as Pt),
              14,
              9,
              600 + k,
            ),
          );
        ctx.save();
        ctx.clip(p);
        strokeLines(c, lines, 0.5, INK.hatch, 0.45);
        ctx.restore();
        strokeLines(c, brokenLine(r, 80, 4, 8), 0.55, INK.hatch, 0.8);
      }
    },
  ];
  return {
    id: "hills-far",
    depth: FAR_DEPTH,
    box: FAR_BOX,
    group: "land",
    jobs,
    resolution: { colour: 0.5 },
  };
}

/** The hills' plates, far to near. */
export function hillsPlates(): Plate[] {
  return [farPlate(), nearPlate()];
}
