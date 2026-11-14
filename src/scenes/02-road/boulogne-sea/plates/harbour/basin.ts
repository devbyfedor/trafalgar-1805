import { createRng, mix, type Pt, rgba } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { aerial, BUILD, EYE_EN, project, viewOf } from "../../scene";
import { RIVER } from "../town/kit";

/**
 * The craft aground in the drained harbour (brief: some 1,100 craft at
 * Boulogne in July 1805, moored side by side in tiers along the quays and
 * round the semicircular basin, sitting upright on the mud at low water,
 * bare masts and yards with their canvas furled: from the roads a dense
 * comb of thin verticals in front of the town; fine lines with yards and
 * canvas rolls catching the light, never a black thicket).
 *
 * Each craft is built in the map and projected through the eye: a hull
 * lying along the quay, its masts by type (prames ship-rigged with three,
 * gun-brigs with two square-rigged, gunboats and péniches with two or
 * three lugs), the shrouds converging on each mast's hounds, the stays
 * between the mastheads, a small heel where it sits on the mud. Drawn at
 * the licence for craft ashore (scene.ts BUILD) in height and a little
 * less in length and beam, in fewer, larger tiers than the real harbour.
 */

type Rig = "square" | "lug";

interface Mast {
  foot: Pt;
  head: Pt;
  /** Hounds (where the shrouds meet), layer units. */
  hounds: Pt;
  shrouds: Pt[][];
  yards: { a: Pt; b: Pt; roll: number }[];
  rig: Rig;
}

export interface Craft {
  hull: { bottom: Pt[]; sheer: Pt[]; wale: Pt[] };
  /** Whether the hull's side we see faces the sun (lit) or the sky (shade). */
  lit: number;
  masts: Mast[];
  stays: Pt[][];
  bowsprit?: Pt[];
  distance: number;
  seed: number;
}

/** The licence for the harbour's craft: heights at BUILD, lengths and beams a little less. */
const LEN = 1.6;

const SUN_AZ = 294;

/** The river's line with arc lengths, and a point and direction at an arc length. */
function riverAt(s: number): { e: number; n: number; te: number; tn: number } {
  let acc = 0;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, ay] = RIVER[i];
    const [bx, by] = RIVER[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (s <= acc + len || i === RIVER.length - 2) {
      const t = Math.max(0, Math.min(1, (s - acc) / len));
      return {
        e: ax + (bx - ax) * t,
        n: ay + (by - ay) * t,
        te: (bx - ax) / len,
        tn: (by - ay) / len,
      };
    }
    acc += len;
  }
  return { e: 0, n: 0, te: 1, tn: 0 };
}

interface Type {
  len: number;
  beam: number;
  /** Hull height above the mud (keel to sheer), metres. */
  side: number;
  masts: readonly (readonly [at: number, height: number, rig: Rig])[];
  bowsprit: boolean;
}

/** The flotilla's types (true metres): prames, gun-brigs, gunboats, péniches; and the transports' smacks. */
const TYPES: Record<string, Type> = {
  prame: {
    len: 34,
    beam: 8,
    side: 4.6,
    masts: [
      [0.3, 25, "square"],
      [-0.02, 27.5, "square"],
      [-0.33, 19, "square"],
    ],
    bowsprit: true,
  },
  brig: {
    len: 25,
    beam: 6.4,
    side: 3.8,
    masts: [
      [0.24, 19.5, "square"],
      [-0.14, 21, "square"],
    ],
    bowsprit: true,
  },
  gunboat: {
    len: 19,
    beam: 5,
    side: 3.2,
    masts: [
      [0.3, 14.5, "lug"],
      [-0.05, 15.5, "lug"],
      [-0.36, 9, "lug"],
    ],
    bowsprit: false,
  },
  peniche: {
    len: 19,
    beam: 3.8,
    side: 2.4,
    masts: [
      [0.26, 11, "lug"],
      [-0.12, 11.5, "lug"],
    ],
    bowsprit: false,
  },
  smack: {
    len: 15,
    beam: 4.6,
    side: 2.8,
    masts: [[0.12, 13, "lug"]],
    bowsprit: true,
  },
};

function pickType(rng: () => number): Type {
  const r = rng();
  if (r < 0.06) return TYPES.prame;
  if (r < 0.3) return TYPES.brig;
  if (r < 0.58) return TYPES.gunboat;
  if (r < 0.9) return TYPES.peniche;
  return TYPES.smack;
}

/**
 * A craft at (e, n), its keel along (de, dn) (bow forward), heeled
 * `heel` degrees (positive: masts lean to its port side).
 */
function craftAt(
  e: number,
  n: number,
  de: number,
  dn: number,
  type: Type,
  heel: number,
  seed: number,
): Craft {
  const rng = createRng(seed);
  // Across the hull: its port side (left of the bow).
  const pe = -dn;
  const pn = de;
  const L = type.len * LEN;
  const B = type.beam * LEN;
  const side = type.side * BUILD;
  const P = (along: number, across: number, up: number): Pt => {
    // The heel moves a point at height `up` across by up·sin(heel).
    const k = Math.sin((heel * Math.PI) / 180);
    return project(
      e + de * along + pe * (across + up * k),
      n + dn * along + pn * (across + up * k),
      up,
    ) as Pt;
  };
  // Which side faces the eye: the side whose outward normal points toward the eye.
  const [ahead] = viewOf(e, n);
  const toEye = pe * (EYE_EN[0] - e) + pn * (EYE_EN[1] - n) >= 0 ? 1 : -1;
  const s = (toEye * B) / 2;
  // Its outward normal's azimuth, and the sun on it.
  const ne = pe * toEye;
  const nn = pn * toEye;
  const az = (Math.atan2(ne, nn) * 180) / Math.PI;
  const lit = Math.max(0, Math.cos(((az - SUN_AZ) * Math.PI) / 180));
  const bottom: Pt[] = [];
  const sheer: Pt[] = [];
  const wale: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8 - 0.5;
    const along = t * L;
    // The sheer rises toward the ends; the bottom lifts at the bow and the stern (flat floors amidships).
    const rise = 0.5 * side * (2 * t) ** 2;
    const lift = side * 0.35 * Math.max(0, Math.abs(2 * t) - 0.55) ** 1.4;
    const narrow = 1 - 0.55 * Math.abs(2 * t) ** 3;
    bottom.push(P(along * 0.94, s * narrow * 0.7, lift));
    sheer.push(P(along, s * narrow, side + rise * 0.35));
    wale.push(P(along * 0.97, s * narrow, side * 0.62 + rise * 0.3));
  }
  const masts: Mast[] = [];
  const heads: Pt[] = [];
  for (const [at, h0, rig] of type.masts) {
    const h = h0 * BUILD * (0.95 + rng() * 0.1);
    const along = at * L;
    const foot = P(along, 0, side);
    const head = P(along, 0, side + h);
    const hounds = P(along, 0, side + h * (rig === "square" ? 0.62 : 0.8));
    heads.push(head);
    const shrouds: Pt[][] = [];
    for (const sgn of [-1, 1])
      for (const off of [-0.06, 0.06]) {
        const chain = P(along + off * L, (sgn * B) / 2, side);
        shrouds.push([chain, hounds]);
      }
    const yards: Mast["yards"] = [];
    if (rig === "square") {
      // Course, topsail and (on some) topgallant yards, square across the hull, the canvas furled on each.
      const set: (readonly [number, number])[] = [
        [0.6, 0.46],
        [0.8, 0.34],
      ];
      if (rng() < 0.4) set.push([0.94, 0.22]);
      for (const [f, wf] of set) {
        const half = (h * wf) / 2;
        const z = side + h * f;
        const skew = (rng() - 0.5) * 0.12;
        yards.push({
          a: P(along + skew * half, -half, z),
          b: P(along - skew * half, half, z),
          roll: 0.8,
        });
      }
    } else {
      // A lug yard slung fore and aft, its sail furled along it.
      const len = h * (0.5 + rng() * 0.12);
      const z = side + h * (0.78 + rng() * 0.08);
      yards.push({
        a: P(along + len * 0.62, 0, z - len * 0.2),
        b: P(along - len * 0.38, 0, z + len * 0.14),
        roll: 0.9,
      });
    }
    masts.push({ foot, head, hounds, shrouds, yards, rig });
  }
  const stays: Pt[][] = [];
  // Forestay to the stem (or the bowsprit's end); stays between the mastheads.
  const bowTip = type.bowsprit
    ? P(L * 0.62, 0, side + side * 0.9)
    : P(L * 0.5, 0, side + 0.6);
  if (heads.length) stays.push([masts[0].hounds, bowTip]);
  for (let i = 1; i < masts.length; i++)
    stays.push([masts[i].head, masts[i - 1].hounds]);
  // The stern's backstays to the last mast's head.
  if (masts.length)
    stays.push([masts[masts.length - 1].head, P(-L * 0.5, s * 0.5, side)]);
  return {
    hull: { bottom, sheer, wale },
    lit,
    masts,
    stays,
    bowsprit: type.bowsprit ? [P(L * 0.45, 0, side + 0.3), bowTip] : undefined,
    distance: ahead,
    seed,
  };
}

let cache: Craft[] | undefined;
let gen: { rng: () => number; s: number; out: Craft[] } | undefined;

/** The quays' tiers: from the jetties' roots up the harbour past the bend; each tier three to six abreast, gaps between tiers. */
export function basinTiers(count: number): boolean {
  if (cache) return false;
  gen ??= { rng: createRng(6113), s: 445, out: [] };
  const g = gen;
  const { rng, out } = g;
  for (let k = 0; k < count; k++) {
    if (g.s > 1900) return false;
    const st = riverAt(g.s);
    // The town's bank is to the left of the stream.
    const qe = -st.tn;
    const qn = st.te;
    const quay = 40;
    const abreast = 3 + Math.floor(rng() * 4);
    const type0 = pickType(rng);
    let longest = 0;
    let off = quay - type0.beam * LEN * 0.6;
    for (let j = 0; j < abreast; j++) {
      const type = j === 0 ? type0 : pickType(rng);
      longest = Math.max(longest, type.len * LEN);
      const e = st.e + qe * off + st.te * (rng() - 0.5) * 6;
      const n = st.n + qn * off + st.tn * (rng() - 0.5) * 6;
      // Bow up or down the harbour; a small heel on the mud.
      const dir = rng() < 0.5 ? 1 : -1;
      const heel = (rng() - 0.5) * 4;
      out.push(
        craftAt(
          e,
          n,
          st.te * dir,
          st.tn * dir,
          type,
          heel,
          Math.floor(rng() * 1e9),
        ),
      );
      off -= type.beam * LEN * (1.05 + rng() * 0.15);
    }
    // The next tier: a hull's length on, and a gap now and then.
    g.s +=
      longest * (1.02 + rng() * 0.12) + (rng() < 0.3 ? 10 + rng() * 25 : 0);
  }
  return true;
}

/** The semicircular basin's ring of craft by its quay, bows to the middle. */
function ring(rng: () => number): Craft[] {
  const out: Craft[] = [];
  for (let k = 0; k < 18; k++) {
    const a = Math.PI * (0.12 + (0.76 * k) / 17);
    const e = 545 + Math.cos(a) * 92;
    const n = -175 + Math.sin(a) * 74;
    const type = pickType(rng);
    const de = -Math.cos(a);
    const dn = -Math.sin(a);
    out.push(
      craftAt(e, n, de, dn, type, (rng() - 0.5) * 4, Math.floor(rng() * 1e9)),
    );
  }
  return out;
}

export function basinCraft(): Craft[] {
  if (cache) return cache;
  while (basinTiers(12)) {
    /* tiers */
  }
  const all = [...(gen?.out ?? []), ...ring(createRng(808))];
  all.sort((a, b) => b.distance - a.distance);
  cache = all;
  return all;
}

// ------------------------------------------------------------- drawing

function path(
  ctx: CanvasRenderingContext2D,
  lines: readonly (readonly Pt[])[],
): void {
  ctx.beginPath();
  for (const l of lines) {
    ctx.moveTo(l[0][0], l[0][1]);
    for (let i = 1; i < l.length; i++) ctx.lineTo(l[i][0], l[i][1]);
  }
}

function hullPath(c: Craft): Path2D {
  const p = new Path2D();
  const { bottom, sheer } = c.hull;
  p.moveTo(bottom[0][0], bottom[0][1]);
  for (const q of bottom) p.lineTo(q[0], q[1]);
  for (let i = sheer.length - 1; i >= 0; i--)
    p.lineTo(sheer[i][0], sheer[i][1]);
  p.closePath();
  return p;
}

/** Paints craft far to near: hull, wale, masts lit on their west faces, yards, the canvas furled, rigging fine and faint. */
export function paintCraft(c: PlateCanvas, list: readonly Craft[]): void {
  const { ctx } = c;
  for (const cr of list) {
    const air = (hex: string) => aerial(hex, cr.distance * 1.25);
    // Rigging first (behind the masts), very fine.
    ctx.strokeStyle = rgba(air("#5b4c40"), 0.38);
    ctx.lineWidth = c.pen(0.45);
    path(
      ctx,
      cr.masts.flatMap((m) => m.shrouds),
    );
    ctx.stroke();
    ctx.strokeStyle = rgba(air("#5b4c40"), 0.3);
    path(ctx, cr.stays);
    ctx.stroke();
    // The hull: tarred below, its topsides warm where the sun strikes, a lit wale.
    const hp = hullPath(cr);
    const sideLit = mix("#3f3631", "#7b5d43", cr.lit);
    ctx.fillStyle = air(sideLit);
    ctx.fill(hp);
    ctx.fillStyle = air("#2e2826");
    ctx.beginPath();
    const { bottom, wale, sheer } = cr.hull;
    ctx.moveTo(bottom[0][0], bottom[0][1]);
    for (const q of bottom) ctx.lineTo(q[0], q[1]);
    for (let i = wale.length - 1; i >= 0; i--) {
      const w = wale[i];
      const b = bottom[i];
      ctx.lineTo(w[0], b[1] + (w[1] - b[1]) * 0.55);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(
      air(mix("#a07a4e", "#f0cf8e", cr.lit)),
      0.55 + 0.4 * cr.lit,
    );
    ctx.lineWidth = c.pen(0.7);
    path(ctx, [wale]);
    ctx.stroke();
    ctx.strokeStyle = rgba(air("#d9b886"), 0.5 * cr.lit + 0.15);
    ctx.lineWidth = c.pen(0.5);
    path(ctx, [sheer]);
    ctx.stroke();
    // Masts: a warm brown line, its west face lit gold.
    const masts = cr.masts.map((m) => [m.foot, m.head]);
    ctx.strokeStyle = air("#5f4b39");
    ctx.lineWidth = c.pen(1);
    path(ctx, masts);
    if (cr.bowsprit) {
      ctx.moveTo(cr.bowsprit[0][0], cr.bowsprit[0][1]);
      ctx.lineTo(cr.bowsprit[1][0], cr.bowsprit[1][1]);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(air("#d8b07a"), 0.55);
    ctx.lineWidth = c.pen(0.45);
    path(
      ctx,
      masts.map(([a, b]) => [
        [a[0] - 0.12, a[1]],
        [b[0] - 0.12, b[1] - (b[1] - a[1]) * 0.05],
      ]),
    );
    ctx.stroke();
    // Yards, then the canvas furled on them catching the sun.
    const yards = cr.masts.flatMap((m) => m.yards);
    ctx.strokeStyle = air("#4a3c33");
    ctx.lineWidth = c.pen(0.7);
    path(
      ctx,
      yards.map((y) => [y.a, y.b]),
    );
    ctx.stroke();
    ctx.strokeStyle = rgba(air("#ecd6a4"), 0.85);
    ctx.lineWidth = c.pen(1.25);
    path(
      ctx,
      yards.map((y) => {
        const k = (1 - y.roll) / 2;
        const a: Pt = [
          y.a[0] + (y.b[0] - y.a[0]) * k,
          y.a[1] + (y.b[1] - y.a[1]) * k + 0.18,
        ];
        const b: Pt = [
          y.b[0] - (y.b[0] - y.a[0]) * k,
          y.b[1] - (y.b[1] - y.a[1]) * k + 0.18,
        ];
        return [a, b];
      }),
    );
    ctx.stroke();
    ctx.strokeStyle = rgba(air("#8e7e6c"), 0.45);
    ctx.lineWidth = c.pen(0.5);
    path(
      ctx,
      yards.map((y) => {
        const k = (1 - y.roll) / 2 + 0.05;
        const a: Pt = [
          y.a[0] + (y.b[0] - y.a[0]) * k,
          y.a[1] + (y.b[1] - y.a[1]) * k - 0.1,
        ];
        const b: Pt = [
          y.b[0] - (y.b[0] - y.a[0]) * k,
          y.b[1] - (y.b[1] - y.a[1]) * k - 0.1,
        ];
        return [a, b];
      }),
    );
    ctx.stroke();
  }
}

/** Engraves craft far to near: paper hulls with planking strokes denser below, fine masts and yards, rolls of canvas as small double strokes, rigging hairlines. */
export function engraveCraft(
  c: PlateCanvas,
  list: readonly Craft[],
  pen: number,
): void {
  const { ctx } = c;
  for (const cr of list) {
    ctx.strokeStyle = rgba(INK.hatch, 0.35);
    ctx.lineWidth = c.pen(pen * 0.3);
    path(ctx, [...cr.masts.flatMap((m) => m.shrouds), ...cr.stays]);
    ctx.stroke();
    const hp = hullPath(cr);
    ctx.fillStyle = PAPER.low;
    ctx.fill(hp);
    // Planking: strokes along the hull, closer toward the mud and on a shaded side.
    const { bottom, sheer, wale } = cr.hull;
    const rows = cr.lit > 0.5 ? 3 : 5;
    ctx.beginPath();
    for (let r = 1; r <= rows; r++) {
      const t = (r / (rows + 1)) ** 1.5;
      for (let i = 0; i < sheer.length; i++) {
        const x = bottom[i][0] + (sheer[i][0] - bottom[i][0]) * t;
        const y = bottom[i][1] + (sheer[i][1] - bottom[i][1]) * t;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = rgba(INK.hatch, 0.8);
    ctx.lineWidth = c.pen(pen * 0.4);
    ctx.stroke();
    // The hull's true contours: the sheer and the ends (its foot on the mud left open).
    ctx.beginPath();
    ctx.moveTo(bottom[0][0], bottom[0][1]);
    for (const q of sheer) ctx.lineTo(q[0], q[1]);
    ctx.lineTo(bottom[bottom.length - 1][0], bottom[bottom.length - 1][1]);
    ctx.moveTo(wale[0][0], wale[0][1]);
    for (const q of wale) ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = rgba(INK.line, 0.9);
    ctx.lineWidth = c.pen(pen * 0.7);
    ctx.stroke();
    ctx.strokeStyle = rgba(INK.line, 0.85);
    ctx.lineWidth = c.pen(pen * 0.6);
    path(
      ctx,
      cr.masts.map((m) => [m.foot, m.head]),
    );
    if (cr.bowsprit) {
      ctx.moveTo(cr.bowsprit[0][0], cr.bowsprit[0][1]);
      ctx.lineTo(cr.bowsprit[1][0], cr.bowsprit[1][1]);
    }
    ctx.stroke();
    const yards = cr.masts.flatMap((m) => m.yards);
    ctx.lineWidth = c.pen(pen * 0.45);
    path(
      ctx,
      yards.map((y) => [y.a, y.b]),
    );
    ctx.stroke();
    // The furled canvas: a short roll drawn by its two edges.
    ctx.strokeStyle = rgba(INK.hatch, 0.7);
    ctx.lineWidth = c.pen(pen * 0.35);
    path(
      ctx,
      yards.flatMap((y) => {
        const k = (1 - y.roll) / 2;
        const a: Pt = [
          y.a[0] + (y.b[0] - y.a[0]) * k,
          y.a[1] + (y.b[1] - y.a[1]) * k,
        ];
        const b: Pt = [
          y.b[0] - (y.b[0] - y.a[0]) * k,
          y.b[1] - (y.b[1] - y.a[1]) * k,
        ];
        return [
          [
            [a[0], a[1] + 0.35],
            [b[0], b[1] + 0.35],
          ],
          [
            [a[0], a[1] - 0.25],
            [b[0], b[1] - 0.25],
          ],
        ];
      }),
    );
    ctx.stroke();
  }
}
