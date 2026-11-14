import { createRng, mix, rgba } from "../../paint/kit";
import {
  INK,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../../paint/plate";
import {
  type Cloud,
  type CloudSpec,
  cloudOf,
  gridRows,
  inkRows,
  paintRows,
  type Surface,
  surfaceFor,
} from "./cumulus";
import { skyAt } from "./ground";

/**
 * Broken cloud in the east on a fine August evening, lit from behind the
 * eye by the sun 5° up and a little to the left (sky/cumulus.ts paints
 * each cloud): a bank of cumulus rising over the Outreau heights to the
 * south-east, a lower group in the haze over the cliffs to the north,
 * stratocumulus in loose patches higher up, and thin high streaks
 * catching pink. The chapter title's corner (top left) stays clear deep
 * blue, and the sky round the rising moon open.
 */

interface Group {
  id: string;
  box: readonly [number, number, number, number];
  /** Line weight of the engraving (far clouds lighter). */
  weight: number;
  /** Back to front. */
  specs: CloudSpec[];
}

const GROUPS: readonly Group[] = [
  {
    // Over the cliffs to the north: a low group in the haze.
    id: "cloud-north",
    box: [-905, -330, 104, 262],
    weight: 0.8,
    specs: [
      {
        seed: 913,
        x0: -905,
        x1: -790,
        base: 130,
        tilt: 0.03,
        height: 30,
        towers: 2,
        flat: 0.8,
        haze: 0.42,
        soft: 5,
        fragments: 1,
      },
      {
        seed: 911,
        x0: -860,
        x1: -575,
        base: 142,
        tilt: 0.04,
        height: 82,
        towers: 3,
        haze: 0.32,
        soft: 6,
        fragments: 2,
      },
      {
        seed: 912,
        x0: -600,
        x1: -390,
        base: 152,
        tilt: -0.03,
        height: 50,
        towers: 3,
        flat: 0.9,
        haze: 0.34,
        soft: 5,
        fragments: 2,
      },
    ],
  },
  {
    // A bank of cumulus over the Outreau heights to the south-east:
    // cells of it one behind another, the farther hazier.
    id: "cloud-east",
    box: [282, 892, 56, 282],
    weight: 0.9,
    specs: [
      {
        seed: 924,
        x0: 600,
        x1: 910,
        base: 86,
        tilt: 0.02,
        height: 124,
        towers: 3,
        haze: 0.36,
        soft: 7,
        fragments: 1,
      },
      {
        seed: 925,
        x0: 430,
        x1: 640,
        base: 94,
        tilt: -0.01,
        height: 96,
        towers: 3,
        haze: 0.32,
        soft: 6,
        fragments: 1,
      },
      {
        seed: 921,
        x0: 335,
        x1: 610,
        base: 82,
        tilt: -0.02,
        height: 150,
        towers: 3,
        haze: 0.18,
        soft: 7,
        fragments: 2,
        taper: 0.4,
      },
      {
        seed: 922,
        x0: 600,
        x1: 830,
        base: 76,
        tilt: 0.02,
        height: 104,
        towers: 3,
        haze: 0.22,
        soft: 7,
        fragments: 2,
        taper: 0.45,
      },
      {
        seed: 923,
        x0: 288,
        x1: 380,
        base: 98,
        tilt: 0.05,
        height: 34,
        towers: 2,
        flat: 0.85,
        haze: 0.3,
        soft: 4,
        fragments: 1,
      },
    ],
  },
  {
    // Stratocumulus higher up, in loose patches, flatter.
    id: "cloud-rows",
    box: [-330, 892, 166, 326],
    weight: 0.7,
    specs: [
      {
        seed: 931,
        x0: -290,
        x1: -130,
        base: 212,
        tilt: 0.03,
        height: 24,
        towers: 3,
        flat: 0.62,
        haze: 0.16,
        soft: 4,
        billow: 1.3,
        fragments: 1,
        taper: 0.32,
      },
      {
        seed: 932,
        x0: -70,
        x1: 150,
        base: 196,
        tilt: -0.02,
        height: 28,
        towers: 3,
        flat: 0.6,
        haze: 0.16,
        soft: 4,
        billow: 1.3,
        fragments: 1,
        taper: 0.32,
      },
      {
        seed: 933,
        x0: 220,
        x1: 400,
        base: 226,
        tilt: 0.02,
        height: 24,
        towers: 2,
        flat: 0.62,
        haze: 0.12,
        soft: 4,
        billow: 1.3,
        fragments: 1,
        taper: 0.32,
      },
      {
        seed: 934,
        x0: 470,
        x1: 730,
        base: 206,
        tilt: -0.03,
        height: 32,
        towers: 3,
        flat: 0.6,
        haze: 0.14,
        soft: 4,
        billow: 1.3,
        fragments: 1,
        taper: 0.32,
      },
      {
        seed: 935,
        x0: 760,
        x1: 892,
        base: 240,
        tilt: 0.02,
        height: 26,
        towers: 2,
        flat: 0.62,
        haze: 0.1,
        soft: 4,
        billow: 1.3,
        fragments: 0,
        taper: 0.32,
      },
      {
        seed: 936,
        x0: 30,
        x1: 215,
        base: 266,
        tilt: 0.01,
        height: 22,
        towers: 2,
        flat: 0.62,
        haze: 0.1,
        soft: 4,
        billow: 1.3,
        fragments: 0,
        taper: 0.32,
      },
      {
        seed: 937,
        x0: 560,
        x1: 770,
        base: 280,
        tilt: -0.02,
        height: 24,
        towers: 2,
        flat: 0.62,
        haze: 0.08,
        soft: 4,
        billow: 1.3,
        fragments: 0,
        taper: 0.32,
      },
    ],
  },
];

/** Device px per unit at the owner's laptop, for sizing jobs. */
const K_EST = 1.48;
/** Pixels a colour job shades, at most (about 3 ms). */
const PX_PER_JOB = 36000;

/** A cloud's painting state on the plate's canvas, made by its first job and dropped by its last. */
interface Slot {
  cloud: Cloud | null;
  surface: Surface | null;
  key: string;
}

function surfaceOf(slot: Slot, spec: CloudSpec, c: PlateCanvas): Surface {
  slot.cloud ??= cloudOf(spec);
  const t = c.ctx.getTransform();
  const key = `${t.a},${t.d},${t.e},${t.f},${c.ctx.canvas.width}`;
  if (!slot.surface || slot.key !== key) {
    slot.surface = surfaceFor(slot.cloud, c);
    slot.key = key;
  }
  return slot.surface;
}

/** Bands of the cloud's box (layer units, top down) for its jobs. */
function bands(spec: CloudSpec, box: Group["box"]): number {
  const w = Math.min(spec.x1, box[1]) - Math.max(spec.x0, box[0]) + 40;
  const h = spec.height * 1.6 + 30;
  return Math.max(1, Math.ceil((w * h * K_EST * K_EST) / PX_PER_JOB));
}

/** Canvas pixel rows of band b of n over the cloud's box. */
function bandRows(sf: Surface, b: number, n: number): [number, number] {
  const h = sf.ry1 - sf.ry0;
  return [
    sf.ry0 + Math.round((h * b) / n),
    sf.ry0 + Math.round((h * (b + 1)) / n),
  ];
}

function groupPlate(g: Group): Plate {
  const slots: Slot[] = g.specs.map(() => ({
    cloud: null,
    surface: null,
    key: "",
  }));
  return {
    id: g.id,
    depth: Number.POSITIVE_INFINITY,
    box: g.box,
    group: "sky",
    jobs: (mode) => {
      const jobs: PlateJob[] = [];
      g.specs.forEach((spec, i) => {
        const slot = slots[i];
        const n = bands(spec, g.box);
        for (let b = 0; b < n; b++) {
          jobs.push((c) => {
            const sf = surfaceOf(slot, spec, c);
            const [r0, r1] = bandRows(sf, b, n);
            paintRows(slot.cloud as Cloud, sf, c, r0, r1, mode === "ink");
          });
        }
        if (mode === "ink") {
          for (let b = 0; b < n; b++) {
            jobs.push((c) => {
              const sf = surfaceOf(slot, spec, c);
              const [r0, r1] = bandRows(sf, b, n);
              const [j0, j1] = gridRows(sf, r0, r1);
              inkRows(slot.cloud as Cloud, sf, c, j0, j1, g.weight);
              // The engraving is the last to use the surface.
              if (b === n - 1) slot.surface = null;
            });
          }
        }
      });
      return jobs;
    },
  };
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

const STREAK_BOX = [-200, 892, 296, 448] as const;

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
