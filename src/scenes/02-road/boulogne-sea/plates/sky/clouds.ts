import { createRng, mix, rgba } from "../../paint/kit";
import { INK, type Plate } from "../../paint/plate";
import { type CloudSpec, cloudJobs, newSlot } from "./cumulus";
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

/** A stratocumulus cell's common traits. */
function cell(
  seed: number,
  x0: number,
  x1: number,
  base: number,
  height: number,
  o: Partial<CloudSpec> = {},
): CloudSpec {
  const rng = createRng(seed);
  return {
    seed,
    x0,
    x1,
    base,
    tilt: (rng() - 0.5) * 0.03,
    height,
    heads: Array.from({ length: 2 + Math.floor(rng() * 3) }, () => [
      0.12 + 0.76 * rng(),
      0.08 + 0.14 * rng(),
      0.5 + 0.5 * rng(),
    ]),
    flat: 0.6,
    floor: 0.5,
    taper: 0.3,
    haze: 0.1,
    soft: 3,
    billow: 1.6,
    lumps: 0.15,
    fragments: 1,
    under: 0.14,
    rag: 0.07,
    crisp: 0.45,
    lost: 6,
    ...o,
  };
}

/**
 * The far strand: long flat pieces of stratocumulus with small heads, as
 * scene 1's strands are, broken by short gaps; lower, thinner and hazier
 * toward the far end (right), short of the moon.
 */
function strand(): CloudSpec[] {
  const rng = createRng(977);
  const out: CloudSpec[] = [];
  let x = -338;
  while (x < 112) {
    const t = (x + 338) / 450;
    const sc = 1 - 0.55 * t;
    const q = rng();
    const len = Math.min(118 - x, (22 + 150 * q * q) * sc);
    if (len < 10) break;
    // Now and then a thin wisp instead of a piece with heads.
    const wisp = rng() < 0.25;
    const y = 182 - 30 * t + (rng() - 0.5) * 7;
    out.push(
      cell(
        990 + out.length * 13,
        x,
        x + len,
        y,
        (wisp ? 3 + 2 * rng() : 7 + 7 * rng()) * sc,
        {
          flat: 0.5,
          floor: wisp ? 0.7 : 0.42,
          haze: 0.3 + 0.24 * t + (wisp ? 0.1 : 0),
          soft: 1.8,
          under: wisp ? 0 : 0.12,
          fragments: rng() < 0.5 ? 1 : 0,
          rag: 0.1,
          billow: 1.3,
          crisp: 0.5,
          lost: wisp ? 2 : 3,
        },
      ),
    );
    // A second, smaller piece a little above, overlapping, now and then.
    if (!wisp && len > 40 * sc && rng() < 0.35) {
      const l2 = len * (0.3 + 0.3 * rng());
      const x2 = x + len * (0.2 + 0.4 * rng());
      out.push(
        cell(1500 + out.length * 11, x2, x2 + l2, y + 5 * sc, 6 * sc, {
          flat: 0.5,
          floor: 0.5,
          haze: 0.36 + 0.24 * t,
          soft: 1.6,
          under: 0,
          fragments: 0,
          crisp: 0.5,
          lost: 2.5,
        }),
      );
    }
    const gap = rng() < 0.2 ? 30 + 40 * rng() : 4 + 20 * rng();
    x += len + gap * sc * (1 - 0.6 * t);
  }
  return out;
}

const GROUPS: readonly Group[] = [
  {
    // A cumulus congestus over the Outreau heights to the south-east,
    // nearer than the heights' skyline suggests: its flat base about 12°
    // up, high enough that the left camp's kitchen smoke rises under it
    // against open sky, and the underside shows. One leading tower, three
    // lower ones of different widths.
    id: "cloud-east",
    box: [296, 880, 178, 396],
    weight: 0.9,
    specs: [
      {
        seed: 924,
        x0: 330,
        x1: 840,
        base: 220,
        tilt: -0.018,
        height: 150,
        heads: [
          [0.1, 0.07, 0.4],
          [0.3, 0.12, 1],
          [0.58, 0.085, 0.62],
          [0.84, 0.09, 0.45],
        ],
        haze: 0.08,
        soft: 5,
        fragments: 2,
        taper: 0.5,
        under: 0.13,
        rag: 0.035,
        lost: 3,
      },
    ],
  },
  {
    // Stratocumulus at one height, in perspective: a few large cells
    // high in the sky (nearer, nearly overhead), their undersides showing
    // as cool shelves under a warm lip, with open sky between them; and
    // far off, low over the cliffs and the harbour mouth, a strand of
    // small flat crowded cells deep in the haze, leading toward the town.
    // The sky round the moon and over the town stays open.
    id: "cloud-band",
    box: [-372, 296, 132, 372],
    weight: 0.75,
    specs: [
      ...strand(),
      cell(1101, -300, -40, 300, 46, { under: 0.16 }),
      cell(1104, -95, 60, 322, 26, { under: 0.12, haze: 0.05, floor: 0.35 }),
      cell(1102, 70, 196, 262, 30, { under: 0.12, haze: 0.12 }),
      cell(1103, 214, 262, 244, 13, { under: 0.1, haze: 0.18, lost: 4 }),
    ],
  },
];

function groupPlate(g: Group): Plate {
  const slots = g.specs.map(() => newSlot());
  return {
    id: g.id,
    depth: Number.POSITIVE_INFINITY,
    box: g.box,
    group: "sky",
    jobs: (mode) =>
      g.specs.flatMap((spec, i) =>
        cloudJobs(spec, g.box, mode, g.weight, slots[i]),
      ),
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
