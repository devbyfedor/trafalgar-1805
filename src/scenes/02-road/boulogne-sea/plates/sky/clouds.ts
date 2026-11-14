import { createRng, mix, rgba, wobble } from "../../paint/kit";
import { INK, PAPER, type Plate, type PlateCanvas } from "../../paint/plate";
import { type CloudSpec, cloudJobs, newSlot } from "./cumulus";

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

// ------------------------------------------------------------------ cirrus

/** A veil of cirrus: its spine's start and end, its width across, its fibres. */
interface Veil {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** The spine's bow, units (up +). */
  bow: number;
  width: number;
  fibres: number;
  /** How many fibres end in a hook at the spine's start (mares' tails). */
  hooks: number;
  seed: number;
}

/**
 * The veils' spines run toward one far point a little under the horizon,
 * off to the right: high bands seen in perspective, so they fan a little
 * rather than lie parallel. One group over the right half, a small one
 * left of centre; none near the chapter title.
 */
const VP = [4200, -80] as const;

function veil(
  x0: number,
  y0: number,
  len: number,
  o: Partial<Veil> & { seed: number },
): Veil {
  const dx = VP[0] - x0;
  const dy = VP[1] - y0;
  const m = Math.hypot(dx, dy);
  return {
    x0,
    y0,
    x1: x0 + (dx / m) * len,
    y1: y0 + (dy / m) * len,
    bow: 4,
    width: 18,
    fibres: 36,
    hooks: 4,
    ...o,
  };
}

const VEILS: readonly Veil[] = [
  veil(0, 437, 440, { seed: 701, width: 26, fibres: 52, bow: 6, hooks: 6 }),
  veil(330, 392, 470, { seed: 702, width: 16, fibres: 34, bow: -4 }),
  veil(600, 442, 330, { seed: 703, width: 20, fibres: 30, bow: 3, hooks: 5 }),
  veil(-236, 384, 220, { seed: 704, width: 11, fibres: 20, bow: 3, hooks: 2 }),
];

interface Fibre {
  path: Path2D;
  /** Its spine, for the engraving's stroke. */
  pts: [number, number][];
  alpha: number;
  warm: number;
}

/**
 * A veil's fibres: fine tapered threads along the spine, spread across it
 * (most near the middle), of different lengths and strengths, frayed at
 * the far end and, for a few, hooked up at the near one; each with its
 * own slight wave.
 */
function fibresOf(v: Veil): Fibre[] {
  const rng = createRng(v.seed);
  const out: Fibre[] = [];
  const len = Math.hypot(v.x1 - v.x0, v.y1 - v.y0);
  const ux = (v.x1 - v.x0) / len;
  const uy = (v.y1 - v.y0) / len;
  // Across the spine (up and to the side).
  const nx = -uy;
  const ny = ux;
  // A gently bowed spine with a slow S in it.
  const s2 = (rng() - 0.5) * v.bow * 1.2;
  const spine = (t: number): [number, number] => [
    v.x0 + (v.x1 - v.x0) * t,
    v.y0 +
      (v.y1 - v.y0) * t +
      v.bow * Math.sin(Math.PI * t) +
      s2 * Math.sin(2 * Math.PI * t),
  ];
  for (let i = 0; i < v.fibres; i++) {
    const g = (rng() + rng() + rng()) / 3 - 0.5;
    const off = g * 2 * v.width;
    const q = rng();
    const t0 = rng() * 0.55;
    const t1 = Math.min(1, t0 + 0.15 + 0.75 * q * q + 0.1 * rng());
    const hook = i < v.hooks;
    const th = 0.5 + 1.6 * rng() * (1 - Math.abs(g));
    const wave = rng() * Math.PI * 2;
    const waveK = 3 + 5 * rng();
    const spread = (rng() - 0.5) * 1.4;
    const n = Math.max(8, Math.round(((t1 - t0) * len) / 9));
    const pts: [number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const t = t0 + ((t1 - t0) * k) / n;
      const [sx, sy] = spine(t);
      // Fibres spread a little toward the far end, frayed.
      const o =
        off * (1 + Math.abs(spread) * (t - t0)) +
        spread * 6 * (t - t0) +
        2.2 * Math.sin(wave + t * waveK);
      pts.push([sx + nx * o, sy + ny * o]);
    }
    let head = 0;
    if (hook) {
      // The mares' tail: the near end, its head, curls up a little.
      const r = 4 + 6 * rng();
      const [hx, hy] = pts[0];
      const turn = 0.9 + 0.6 * rng();
      for (let k = 1; k <= 5; k++) {
        const a = (turn * k) / 5;
        pts.unshift([
          hx - ux * r * Math.sin(a) + nx * r * (1 - Math.cos(a)),
          hy - uy * r * Math.sin(a) + ny * r * (1 - Math.cos(a)),
        ]);
      }
      head = 5;
    }
    // A thin sliver tapering to nothing at both ends; a hooked fibre is
    // thickest at its head, a comma.
    const m = pts.length - 1;
    const width = (k: number) => {
      const u = k / m;
      const body =
        Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 0.6 * (1 - 0.5 * u);
      if (!head) return th * body;
      const hu = Math.max(0, 1 - Math.abs(k - head) / (head + 2));
      return th * Math.max(body, 1.8 * Math.sin((Math.PI * hu) / 2));
    };
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k <= m; k++)
      p.lineTo(
        pts[k][0] + nx * width(k) * 0.5,
        pts[k][1] + ny * width(k) * 0.5,
      );
    for (let k = m; k >= 0; k--)
      p.lineTo(
        pts[k][0] - nx * width(k) * 0.5,
        pts[k][1] - ny * width(k) * 0.5,
      );
    p.closePath();
    out.push({
      path: p,
      pts,
      alpha: (0.13 + 0.24 * rng()) * (1 - 0.6 * Math.abs(g)),
      warm: rng(),
    });
  }
  return out;
}

/**
 * The veil's body: a faint luminous band along the spine, under the
 * fibres, laid as a few stacked tapering bands of falling width, so its
 * edges are soft without any blur.
 */
function bodyOf(v: Veil): Path2D[] {
  const out: Path2D[] = [];
  const n = 40;
  const len = Math.hypot(v.x1 - v.x0, v.y1 - v.y0);
  const nx = -(v.y1 - v.y0) / len;
  const ny = (v.x1 - v.x0) / len;
  const wob = wobble(v.seed + 5, [
    [len * 0.31, 0.25],
    [len * 0.11, 0.15],
  ]);
  for (const k of [1.25, 0.9, 0.6, 0.32]) {
    const p = new Path2D();
    const side = (sgn: number) => {
      for (let i = 0; i <= n; i++) {
        const t = sgn > 0 ? i / n : 1 - i / n;
        const x = v.x0 + (v.x1 - v.x0) * t;
        const y = v.y0 + (v.y1 - v.y0) * t + v.bow * Math.sin(Math.PI * t);
        const w =
          v.width * k * Math.sin(Math.PI * t) ** 0.7 * (1 + wob(t * len));
        const px = x + nx * w * sgn;
        const py = y + ny * w * sgn;
        if (i === 0 && sgn > 0) p.moveTo(px, py);
        else p.lineTo(px, py);
      }
    };
    side(1);
    side(-1);
    p.closePath();
    out.push(p);
  }
  return out;
}

const CIRRUS_BOX = [-262, 892, 318, 448] as const;

/**
 * Cirrus high in the east, catching the cleanest of the low sun's light:
 * warm and light, not greyed toward the sky. In the engraving, the same
 * fibres reserved as paper over the sky's lines, a few drawn as fine
 * strokes: they give the engraved sky its direction.
 */
function cirrusPlate(): Plate {
  let list: Fibre[][] | null = null;
  const get = (): Fibre[][] => {
    list ??= VEILS.map(fibresOf);
    return list;
  };
  const colourJob = (k: number) => (c: PlateCanvas) => {
    const { ctx } = c;
    ctx.fillStyle = rgba("#f6d9cc", 0.035);
    for (const b of bodyOf(VEILS[k])) ctx.fill(b);
    for (const f of get()[k]) {
      ctx.fillStyle = rgba(mix("#f7dccb", "#fbe8d8", f.warm), f.alpha);
      ctx.fill(f.path);
    }
  };
  const inkJob = (k: number) => (c: PlateCanvas) => {
    const { ctx } = c;
    const rng = createRng(760 + k);
    const lines = new Path2D();
    // The veil reserved: the sky's lines broken along it.
    ctx.fillStyle = rgba(PAPER.low, 0.45);
    for (const b of bodyOf(VEILS[k]).slice(1)) ctx.fill(b);
    for (const f of get()[k]) {
      ctx.fillStyle = rgba(PAPER.low, Math.min(1, f.alpha * 2.4));
      ctx.fill(f.path);
      if (rng() < 0.35) {
        lines.moveTo(f.pts[0][0], f.pts[0][1]);
        for (const [x, y] of f.pts.slice(1)) lines.lineTo(x, y);
      }
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = c.pen(0.45);
    ctx.strokeStyle = rgba(INK.hatch, 0.32);
    ctx.stroke(lines);
  };
  return {
    id: "cloud-high",
    depth: Number.POSITIVE_INFINITY,
    box: CIRRUS_BOX,
    group: "sky",
    jobs: (mode) =>
      VEILS.map((_, k) => (mode === "colour" ? colourJob(k) : inkJob(k))),
  };
}

export function cloudPlates(): Plate[] {
  return [cirrusPlate(), ...GROUPS.map(groupPlate)];
}
