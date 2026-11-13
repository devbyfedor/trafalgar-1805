import { createRng, mix, rgba, softBlob, wobble } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import { skyAt } from "./ground";

/**
 * Broken cloud in the east on a fine August evening, lit from behind the
 * eye by the sun 5° up and a little to the left: groups of cumulus and
 * stratocumulus built from many overlapping forms, never one blob. Each
 * form's face toward the eye is lit warm cream, its upper left brightest;
 * its lower right turns into cool lilac shade, so the crevices between the
 * forms model the cloud; the cores are cool, the undersides warmed by the
 * low sun, the bases uneven and sloping, with wisps; crisp lit rims where
 * the light grazes the outline. Lower and nearer the horizon, softer and
 * lower in contrast in the haze. Thin high streaks catch pink. Nothing
 * bright in the chapter title's corner (top left).
 *
 * The engraving: each cloud paper-backed (the sky's strokes stop at it),
 * drawn by curved strokes along its forms, light on the lit side, its
 * shaded parts and undersides hatched in arcs following the forms.
 */

interface Puff {
  x: number;
  y: number;
  r: number;
  /** Vertical squash of the form (1: round). */
  sq: number;
}

/** A cloud's forms, painted bottom first, and its extent. */
interface Form {
  puffs: Puff[];
  base: number;
  top: number;
  x0: number;
  x1: number;
}

interface CumulusSpec {
  seed: number;
  x0: number;
  x1: number;
  /** The base's height at the middle, and its slope (units up per unit right). */
  base: number;
  tilt: number;
  /** The tallest tower's height above the base. */
  height: number;
  /** Towers (heads) along the top. */
  towers: number;
  /** Squash of the forms (stratocumulus flatter). */
  flat?: number;
}

/**
 * A cumulus: towers of different heights merging over a broad, sloping,
 * uneven base; forms along the top so the outline billows, forms filling
 * the body, flatter forms along the base, some hanging lower.
 */
function cumulus(s: CumulusSpec): Form {
  const rng = createRng(s.seed);
  const w = s.x1 - s.x0;
  const flat = s.flat ?? 1;
  const heads = Array.from({ length: s.towers }, () => ({
    c: 0.14 + 0.72 * rng(),
    w: 0.1 + 0.2 * rng(),
    h: 0.4 + 0.6 * rng(),
  }));
  heads[0].h = 1;
  const baseWob = wobble(s.seed + 3, [
    [w * 0.4, s.height * 0.08],
    [w * 0.13, s.height * 0.045],
  ]);
  const env = (t: number): number => {
    let m = 0;
    for (const k of heads)
      m = Math.max(m, k.h * Math.exp(-(((t - k.c) / k.w) ** 2)));
    const taper = Math.max(0, Math.sin(Math.PI * t)) ** 0.45;
    return Math.min(1, (m * 0.85 + 0.18) * taper);
  };
  const baseAt = (t: number): number =>
    s.base + s.tilt * (t - 0.5) * w + baseWob(t * w);
  const puffs: Puff[] = [];
  // The body.
  const nBody = Math.round((w / s.height) * 7) + 8;
  for (let i = 0; i < nBody; i++) {
    const t = 0.05 + 0.9 * rng();
    const e = env(t);
    const b = baseAt(t);
    const span = s.height * e;
    if (span < s.height * 0.12) continue;
    const r = Math.min(span * 0.48, s.height * (0.12 + 0.16 * rng()));
    const y = b + r * 0.6 * flat + rng() * Math.max(0, span - r * 1.5);
    puffs.push({ x: s.x0 + t * w, y, r, sq: (0.82 + rng() * 0.2) * flat });
  }
  // The heads along the top.
  const nTop = Math.round((w / s.height) * 6) + 5;
  for (let i = 0; i < nTop; i++) {
    const t = (i + 0.5 + (rng() - 0.5) * 0.8) / nTop;
    const e = env(t);
    if (e < 0.14) continue;
    const r = s.height * (0.07 + 0.12 * rng()) * (0.45 + 0.55 * e);
    const sq = (0.86 + rng() * 0.16) * flat;
    const top = baseAt(t) + s.height * e;
    puffs.push({ x: s.x0 + t * w, y: top - r * sq * 0.92, r, sq });
  }
  // The base: flatter forms on an uneven, sloping line, some hanging lower.
  const nBase = Math.round((w / s.height) * 4) + 4;
  for (let i = 0; i < nBase; i++) {
    const t = (i + 0.5 + (rng() - 0.5) * 0.9) / nBase;
    if (env(t) < 0.16) continue;
    const r = s.height * (0.06 + 0.09 * rng());
    const sag = rng() < 0.3 ? rng() * s.height * 0.09 : 0;
    const sq = (0.45 + rng() * 0.2) * flat;
    puffs.push({ x: s.x0 + t * w, y: baseAt(t) + r * sq * 0.5 - sag, r, sq });
  }
  puffs.sort((a, b) => a.y - b.y);
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const p of puffs) {
    lo = Math.min(lo, p.y - p.r * p.sq);
    hi = Math.max(hi, p.y + p.r * p.sq);
  }
  return { puffs, base: lo, top: hi, x0: s.x0, x1: s.x1 };
}

// ------------------------------------------------------------------ colour

interface Tones {
  halo: string;
  fringe: string;
  shade: string;
  deep: string;
  lit: string;
  high: string;
  warm: string;
  rim: string;
}

/** The cloud's tones at a height in the sky, `haze` taken toward the sky behind. */
function tones(y: number, haze: number): Tones {
  const sky = skyAt(y);
  const h = (c: string, k = 1) => mix(c, sky, haze * k);
  return {
    halo: h("#f6dfbd", 0.5),
    fringe: mix("#d9c4c0", sky, 0.35 + haze * 0.4),
    shade: h("#ae9fb4"),
    deep: h("#8b86a6"),
    lit: h("#f6dfbb"),
    high: h("#fdf0d9"),
    warm: h("#f2bf8f", 0.6),
    rim: h("#fff6e4", 0.4),
  };
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.moveTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function inside(p: Puff, x: number, y: number): boolean {
  const dx = (x - p.x) / p.r;
  const dy = (y - p.y) / (p.r * p.sq);
  return dx * dx + dy * dy < 1;
}

/** Whether a point is under any puff from `from` on (painted later, so in front). */
function covered(puffs: readonly Puff[], from: number, x: number, y: number) {
  for (let j = from; j < puffs.length; j++)
    if (inside(puffs[j], x, y)) return true;
  return false;
}

function outer(puffs: readonly Puff[], i: number, x: number, y: number) {
  for (let j = 0; j < puffs.length; j++)
    if (j !== i && inside(puffs[j], x, y)) return false;
  return true;
}

/** The forms: a soft halo, a fringe, then each form shade, lit face and highlight. */
function paintForms(c: PlateCanvas, f: Form, t: Tones): void {
  const { ctx } = c;
  for (const p of f.puffs)
    softBlob(c, p.x, p.y, p.r * 1.45, p.r * 1.45 * p.sq, t.halo, 0.09);
  ctx.beginPath();
  for (const p of f.puffs)
    ellipse(ctx, p.x, p.y, p.r * 1.07, p.r * p.sq * 1.07);
  ctx.fillStyle = rgba(t.fringe, 0.38);
  ctx.fill();
  for (const p of f.puffs) {
    const ry = p.r * p.sq;
    ctx.beginPath();
    ellipse(ctx, p.x, p.y, p.r, ry);
    ctx.fillStyle = t.shade;
    ctx.fill();
    ctx.beginPath();
    ellipse(ctx, p.x - 0.15 * p.r, p.y + 0.2 * ry, p.r * 0.84, ry * 0.84);
    ctx.fillStyle = rgba(t.lit, 0.93);
    ctx.fill();
    ctx.beginPath();
    ellipse(ctx, p.x - 0.3 * p.r, p.y + 0.38 * ry, p.r * 0.5, ry * 0.5);
    ctx.fillStyle = rgba(t.high, 0.5);
    ctx.fill();
  }
}

/** Cool cores, the warm undersides, the lit rims and the wisps. */
function paintLight(c: PlateCanvas, f: Form, t: Tones, seed: number): void {
  const { ctx } = c;
  const rng = createRng(seed);
  const h = f.top - f.base;
  const w = f.x1 - f.x0;
  ctx.globalCompositeOperation = "source-atop";
  // Cool cores deep in the body.
  for (let i = 0; i < 5; i++) {
    const x = f.x0 + w * (0.15 + 0.7 * rng());
    softBlob(
      c,
      x,
      f.base + h * (0.28 + 0.2 * rng()),
      w * 0.16,
      h * 0.2,
      t.deep,
      0.3,
    );
  }
  // The undersides warmed by the low sun.
  const g = ctx.createLinearGradient(0, f.base, 0, f.base + h * 0.55);
  g.addColorStop(0, rgba(t.warm, 0.62));
  g.addColorStop(0.45, rgba(t.warm, 0.3));
  g.addColorStop(1, rgba(t.warm, 0));
  ctx.fillStyle = g;
  ctx.fillRect(f.x0 - h, f.base - 2, w + 2 * h, h * 0.6);
  ctx.globalCompositeOperation = "source-over";
  // Crisp lit rims on the outline's upper left.
  ctx.beginPath();
  f.puffs.forEach((p, i) => {
    let pen = false;
    for (let a = 70; a <= 215; a += 6) {
      const r = (a * Math.PI) / 180;
      const x = p.x + Math.cos(r) * p.r;
      const y = p.y + Math.sin(r) * p.r * p.sq;
      if (outer(f.puffs, i, x, y)) {
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      } else pen = false;
    }
  });
  ctx.strokeStyle = rgba(t.rim, 0.75);
  ctx.lineWidth = c.pen(1.1);
  ctx.lineJoin = "round";
  ctx.stroke();
  // Wisps trailing from the base.
  for (let i = 0; i < 4; i++) {
    const x = f.x0 + w * (0.1 + 0.8 * rng());
    const y = f.base - h * (0.02 + 0.1 * rng());
    softBlob(c, x, y, w * (0.12 + 0.12 * rng()), h * 0.05, t.lit, 0.22);
    softBlob(c, x + w * 0.04, y - h * 0.03, w * 0.08, h * 0.03, t.warm, 0.18);
  }
}

// ------------------------------------------------------------------ ink

/** Paper under the forms, so the sky's strokes stop at the cloud. */
function inkPaper(c: PlateCanvas, f: Form): void {
  const { ctx } = c;
  ctx.beginPath();
  for (const p of f.puffs) ellipse(ctx, p.x, p.y, p.r, p.r * p.sq);
  ctx.fillStyle = PAPER.low;
  ctx.fill();
}

/** Curved strokes along the forms: the outline, light on the lit side; the crevices; arcs of hatching in the shade, denser low down. */
function inkForms(
  c: PlateCanvas,
  f: Form,
  seed: number,
  weight: number,
  from: number,
  to: number,
): void {
  const { ctx } = c;
  const rng = createRng(seed);
  const h = f.top - f.base;
  const lit = new Path2D();
  const shade = new Path2D();
  const hatch = new Path2D();
  const n = f.puffs.length;
  for (let i = Math.floor(n * from); i < Math.floor(n * to); i++) {
    const p = f.puffs[i];
    // The outline and the crevices.
    let pen: Path2D | null = null;
    for (let a = 0; a <= 360; a += 7) {
      const r = (a * Math.PI) / 180;
      const x = p.x + Math.cos(r) * p.r;
      const y = p.y + Math.sin(r) * p.r * p.sq;
      const vis = !covered(f.puffs, i + 1, x, y);
      const out = vis && outer(f.puffs, i, x, y);
      const litSide = a > 50 && a < 235;
      const crevice = vis && !out && a > 195 && a < 345 && rng() < 0.75;
      const target = out ? (litSide ? lit : shade) : crevice ? shade : null;
      if (target && rng() > 0.08) {
        if (pen === target) target.lineTo(x, y);
        else target.moveTo(x, y);
        pen = target;
      } else pen = null;
    }
    // Arcs of hatching in the shaded lower right, more toward the base.
    const low = 1 - Math.min(1, Math.max(0, (p.y - f.base) / h));
    const arcs = Math.round(1 + low * 3 + rng());
    for (let k = 0; k < arcs; k++) {
      const rr = 0.9 - k * 0.13;
      let on = false;
      for (let a = -120; a <= 15; a += 6) {
        const r = (a * Math.PI) / 180;
        const x = p.x + Math.cos(r) * p.r * rr;
        const y = p.y + Math.sin(r) * p.r * p.sq * rr;
        const vis = !covered(f.puffs, i + 1, x, y) && rng() > 0.1;
        if (vis) {
          if (on) hatch.lineTo(x, y);
          else hatch.moveTo(x, y);
        }
        on = vis;
      }
    }
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = c.pen(0.6 * weight);
  ctx.strokeStyle = rgba(INK.hatch, 0.32);
  ctx.stroke(lit);
  ctx.lineWidth = c.pen(0.75 * weight);
  ctx.strokeStyle = rgba(INK.hatch, 0.72);
  ctx.stroke(shade);
  ctx.lineWidth = c.pen(0.5 * weight);
  ctx.strokeStyle = rgba(INK.hatch, 0.5);
  ctx.stroke(hatch);
}

// ------------------------------------------------------------------ streaks

interface Streak {
  x0: number;
  x1: number;
  y: number;
  bow: number;
  thick: number;
}

/** Thin high streaks (cirrus) catching the pink of the low sun. */
function streaks(seed: number): Streak[] {
  const rng = createRng(seed);
  const out: Streak[] = [];
  const rows = [
    { x0: -140, x1: 420, y: 352 },
    { x0: 160, x1: 892, y: 318 },
    { x0: 380, x1: 892, y: 388 },
    { x0: -60, x1: 260, y: 404 },
    { x0: 520, x1: 892, y: 430 },
  ];
  for (const row of rows) {
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const len = (row.x1 - row.x0) * (0.25 + 0.35 * rng());
      const x0 = row.x0 + rng() * (row.x1 - row.x0 - len);
      out.push({
        x0,
        x1: x0 + len,
        y: row.y + (rng() - 0.5) * 16,
        bow: (rng() - 0.3) * 6,
        thick: 1.2 + rng() * 2.6,
      });
    }
  }
  return out;
}

function streakPath(s: Streak, scale = 1, lift = 0): Path2D {
  const p = new Path2D();
  const n = 24;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = s.x0 + (s.x1 - s.x0) * t;
    const mid = s.y + lift + s.bow * Math.sin(Math.PI * t);
    pts.push([x, mid]);
  }
  const th = (t: number) =>
    s.thick *
    scale *
    Math.sin(Math.PI * t) ** 0.7 *
    (0.8 + 0.2 * Math.sin(t * 9));
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n; i++)
    p.lineTo(pts[i][0], pts[i][1] + th(i / n) * 0.35);
  for (let i = n; i >= 0; i--)
    p.lineTo(pts[i][0], pts[i][1] - th(i / n) * 0.65);
  p.closePath();
  return p;
}

// ------------------------------------------------------------------ groups

interface Group {
  id: string;
  box: readonly [number, number, number, number];
  /** Haze taken toward the sky behind: lower clouds softer. */
  haze: number;
  /** Line weight of the engraving (far clouds lighter). */
  weight: number;
  specs: CumulusSpec[];
}

const GROUPS: readonly Group[] = [
  {
    // Over the cliffs to the north: a low group in the haze.
    id: "cloud-north",
    box: [-900, -360, 112, 282],
    haze: 0.32,
    weight: 0.85,
    specs: [
      {
        seed: 611,
        x0: -840,
        x1: -560,
        base: 150,
        tilt: 0.05,
        height: 74,
        towers: 3,
      },
      {
        seed: 612,
        x0: -620,
        x1: -430,
        base: 162,
        tilt: -0.04,
        height: 52,
        towers: 2,
      },
      {
        seed: 613,
        x0: -880,
        x1: -760,
        base: 136,
        tilt: 0.02,
        height: 30,
        towers: 2,
        flat: 0.8,
      },
    ],
  },
  {
    // A larger bank over the Outreau heights to the south-east.
    id: "cloud-east",
    box: [268, 892, 52, 246],
    haze: 0.26,
    weight: 0.9,
    specs: [
      {
        seed: 621,
        x0: 360,
        x1: 700,
        base: 84,
        tilt: -0.03,
        height: 112,
        towers: 4,
      },
      {
        seed: 622,
        x0: 640,
        x1: 892,
        base: 76,
        tilt: 0.02,
        height: 88,
        towers: 3,
      },
      {
        seed: 623,
        x0: 300,
        x1: 430,
        base: 74,
        tilt: 0.04,
        height: 34,
        towers: 2,
        flat: 0.75,
      },
    ],
  },
  {
    // Stratocumulus higher up, in loose rows, flatter and smaller.
    id: "cloud-rows",
    box: [-330, 892, 168, 318],
    haze: 0.1,
    weight: 0.75,
    specs: [
      {
        seed: 631,
        x0: -280,
        x1: -120,
        base: 210,
        tilt: 0.03,
        height: 22,
        towers: 2,
        flat: 0.7,
      },
      {
        seed: 632,
        x0: -60,
        x1: 150,
        base: 196,
        tilt: -0.02,
        height: 26,
        towers: 3,
        flat: 0.68,
      },
      {
        seed: 633,
        x0: 230,
        x1: 400,
        base: 224,
        tilt: 0.02,
        height: 22,
        towers: 2,
        flat: 0.7,
      },
      {
        seed: 634,
        x0: 470,
        x1: 720,
        base: 205,
        tilt: -0.03,
        height: 30,
        towers: 3,
        flat: 0.66,
      },
      {
        seed: 635,
        x0: 760,
        x1: 892,
        base: 238,
        tilt: 0.02,
        height: 24,
        towers: 2,
        flat: 0.7,
      },
      {
        seed: 636,
        x0: 40,
        x1: 210,
        base: 262,
        tilt: 0.01,
        height: 20,
        towers: 2,
        flat: 0.72,
      },
      {
        seed: 637,
        x0: 560,
        x1: 760,
        base: 276,
        tilt: -0.02,
        height: 22,
        towers: 2,
        flat: 0.7,
      },
    ],
  },
];

const STREAK_BOX = [-200, 892, 296, 448] as const;

function groupPlate(g: Group): Plate {
  let forms: Form[] | null = null;
  const get = (): Form[] => {
    forms ??= g.specs.map(cumulus);
    return forms;
  };
  const midY = (f: Form) => (f.base + f.top) / 2;
  return {
    id: g.id,
    depth: Number.POSITIVE_INFINITY,
    box: g.box,
    group: "sky",
    jobs: (mode) => {
      const jobs: PlateJob[] = [];
      g.specs.forEach((s, i) => {
        if (mode === "colour") {
          jobs.push((c) => {
            const f = get()[i];
            paintForms(c, f, tones(midY(f), g.haze));
          });
          jobs.push((c) => {
            const f = get()[i];
            paintLight(c, f, tones(midY(f), g.haze), s.seed + 50);
          });
        } else {
          jobs.push((c) => inkPaper(c, get()[i]));
          jobs.push((c) =>
            inkForms(c, get()[i], s.seed + 70, g.weight, 0, 0.5),
          );
          jobs.push((c) =>
            inkForms(c, get()[i], s.seed + 71, g.weight, 0.5, 1),
          );
        }
      });
      return jobs;
    },
  };
}

function streakPlate(): Plate {
  let list: Streak[] | null = null;
  const get = (): Streak[] => {
    list ??= streaks(651);
    return list;
  };
  return {
    id: "cloud-high",
    depth: Number.POSITIVE_INFINITY,
    box: STREAK_BOX,
    group: "sky",
    jobs: (mode) =>
      mode === "colour"
        ? [
            (c) => {
              const { ctx } = c;
              for (const s of get()) {
                const sky = skyAt(s.y);
                ctx.fillStyle = rgba(mix("#f0c7b4", sky, 0.3), 0.42);
                ctx.fill(streakPath(s));
                ctx.fillStyle = rgba(mix("#fbe3cc", sky, 0.2), 0.4);
                ctx.fill(streakPath(s, 0.45, -0.3));
              }
            },
          ]
        : [
            (c) => {
              const { ctx } = c;
              const rng = createRng(652);
              ctx.beginPath();
              for (const s of get()) {
                for (let k = 0; k < 2; k++) {
                  const off = (k - 0.5) * s.thick * 0.5;
                  let on = false;
                  for (let i = 0; i <= 30; i++) {
                    const t = i / 30;
                    const x = s.x0 + (s.x1 - s.x0) * t;
                    const y = s.y + off + s.bow * Math.sin(Math.PI * t);
                    const keep = t > 0.06 && t < 0.94 && rng() > 0.2;
                    if (keep) {
                      if (on) ctx.lineTo(x, y);
                      else ctx.moveTo(x, y);
                    }
                    on = keep;
                  }
                }
              }
              ctx.lineCap = "round";
              ctx.lineWidth = c.pen(0.5);
              ctx.strokeStyle = rgba(INK.hatch, 0.45);
              ctx.stroke();
            },
          ],
  };
}

export function cloudPlates(): Plate[] {
  return [streakPlate(), ...GROUPS.map(groupPlate)];
}
