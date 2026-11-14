import { PLACES, RAMPARTS } from "../../geo";
import { createRng, field, mix, type Pt } from "../../paint/kit";
import { BUILD, project, VEX, viewOf } from "../../scene";
import {
  type Building,
  build,
  CHIMNEY_TOP,
  ROOFS,
  type Spec,
  type Tone,
  WALLS,
} from "./houses";
import { distToPoly, RIVER, riverSide, townGround } from "./kit";

/**
 * The lower town's plan (brief: separate houses, each a little different,
 * from the quays up the valley and the slopes to the upper town; la
 * Beurrière stepping up under the north cliff; Saint-Nicolas; the
 * flotilla's store at the harbour's head): terraces along streets that
 * follow the quays and, behind them, the slope's contours (offsets of
 * the Liane's line), cut by cross streets that climb the slope, with
 * gardens and trees between; every house its own frontage, depth,
 * storeys, roof and materials. Houses are drawn at the licence for
 * buildings (scene.ts BUILD) and laid out at that size, so a terrace
 * reads as a terrace: the painter's town has fewer, larger houses than
 * the real one, as period views drew it.
 */

/** A tree in a garden or on a slope: a few foliage masses. */
export interface Tree {
  x: number;
  y: number;
  /** Crown's half width and height, layer units. */
  rx: number;
  ry: number;
  distance: number;
  seed: number;
}

export type Item =
  | { type: "house"; b: Building }
  | { type: "tree"; t: Tree; distance: number };

/** The smoke's chimneys (metres east, north): a house is built at each, its chimney smoking. */
export const SMOKE_SITES: readonly Pt[] = [
  [530, 150],
  [700, -110],
  [905, -390],
  [1010, -640],
  [820, 90],
];

/** The houses standing at the smoke's sites: their size and roof (so TOWN_SMOKE knows their chimneys' tops). */
export const SMOKE_HOUSE = { w: 7.5, d: 10, h: 9.2, pitch: 0.9 } as const;

/** The top of a smoke site's chimney, metres as drawn. */
export function smokeTop(e: number, n: number): number {
  const g = townGround(e, n) * VEX;
  const h = SMOKE_HOUSE.h * BUILD;
  const rise = ((SMOKE_HOUSE.d * BUILD) / 2) * SMOKE_HOUSE.pitch;
  return Math.round(g + h + rise + CHIMNEY_TOP);
}

/** The river's frame at arc length s: a point and its direction, smoothed over the bends. */
function riverFrame(): {
  at(s: number): { e: number; n: number; te: number; tn: number };
  length: number;
} {
  const cum: number[] = [0];
  for (let i = 1; i < RIVER.length; i++)
    cum.push(
      cum[i - 1] +
        Math.hypot(
          RIVER[i][0] - RIVER[i - 1][0],
          RIVER[i][1] - RIVER[i - 1][1],
        ),
    );
  const length = cum[cum.length - 1];
  const point = (s: number): Pt => {
    const k = Math.max(0, Math.min(length, s));
    let i = 0;
    while (i < cum.length - 2 && cum[i + 1] < k) i++;
    const t = (k - cum[i]) / (cum[i + 1] - cum[i]);
    return [
      RIVER[i][0] + (RIVER[i + 1][0] - RIVER[i][0]) * t,
      RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * t,
    ];
  };
  return {
    length,
    at(s: number) {
      const [e, n] = point(s);
      const a = point(s - 45);
      const b = point(s + 45);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { e, n, te: (b[0] - a[0]) / l, tn: (b[1] - a[1]) / l };
    },
  };
}

/** Where a house may stand: the town's bank, off the quay's edge, clear of the walls' ditch and glacis, below the upper town's plateau, inside the view. */
function allowed(e: number, n: number): boolean {
  const { d, side } = riverSide(e, n);
  if (side <= 0 || d < 34) return false;
  if (e < 236) return false;
  // Under the north cliff: la Beurrière on the slope by the harbour, not on the cliff's face or the plateau.
  if (n > 235) return false;
  if (n > 95 && e < 300 + (n - 95) * 0.6) return false;
  if (n < -1060) return false;
  if (distToPoly(RAMPARTS, e, n) < 108) return false;
  if (townGround(e, n) > 44) return false;
  const [ahead, right] = viewOf(e, n);
  const x = (1000 * right) / ahead;
  return x > -244 && x < 256 && ahead > 1300 && ahead < 2520;
}

function pick<T>(
  rng: () => number,
  table: readonly (readonly [T, number])[],
): T {
  let r = rng();
  for (const [v, p] of table) {
    if (r < p) return v;
    r -= p;
  }
  return table[table.length - 1][0];
}

const WALL_TABLE: readonly (readonly [Tone, number])[] = [
  [WALLS.cream, 0.33],
  [WALLS.white, 0.2],
  [WALLS.ochre, 0.14],
  [WALLS.stone, 0.22],
  [WALLS.brown, 0.11],
];

const ROOF_TABLE: readonly (readonly [Tone, number])[] = [
  [ROOFS.tile, 0.47],
  [ROOFS.tileDeep, 0.18],
  [ROOFS.tileOld, 0.18],
  [ROOFS.slate, 0.12],
  [ROOFS.slateDark, 0.05],
];

/** A material a little off its kind: no two houses quite alike. */
function vary(rng: () => number, t: Tone, other: Tone): Tone {
  const k = rng() * 0.32;
  return {
    lit: mix(t.lit, other.lit, k),
    graze: mix(t.graze, other.graze, k),
    shade: mix(t.shade, other.shade, k),
  };
}

interface Gen {
  rng: () => number;
  garden: (x: number, y: number) => number;
  items: Item[];
  /** The next row's offset from the river, metres. */
  d: number;
  row: number;
}

let gen: Gen | undefined;
let done: Item[] | undefined;

let frameRef: ReturnType<typeof riverFrame> | undefined;

function riverAt(): ReturnType<typeof riverFrame> {
  if (!frameRef) frameRef = riverFrame();
  return frameRef;
}

/** The cross streets climbing the slope: river arc lengths where every row breaks. */
let streets: number[] | undefined;

function crossStreets(rng: () => number): number[] {
  const out: number[] = [];
  for (let s = 470; s < 2100; s += 70 + rng() * 60) out.push(s);
  return out;
}

/** Lays out the next row of the lower town (a few jobs' worth each). */
export function lowerRow(): boolean {
  if (done) return false;
  gen ??= {
    rng: createRng(4127),
    garden: field(77, 210, 2),
    items: [],
    d: 38,
    row: 0,
  };
  const g = gen;
  const { rng, items } = g;
  streets ??= crossStreets(createRng(91));
  if (g.d > 700) return false;
  const d = g.d;
  const frame = riverAt();
  const quay = g.row === 0;
  // Walk the row along the river's arc, placing terraced houses at their drawn frontage.
  const offset = (s: number) => {
    const f = frame.at(s);
    return { e: f.e - f.tn * d, n: f.n + f.te * d, te: f.te, tn: f.tn };
  };
  let s = 300;
  let street = 0;
  while (s < frame.length - 150) {
    const a = offset(s);
    const b = offset(s + 2);
    // Row metres per river metre (the offset line stretches on a bend's outer side).
    const stretch = Math.max(0.25, Math.hypot(b.e - a.e, b.n - a.n) / 2);
    const w = (quay ? 6.5 + rng() * 5.5 : 5 + rng() * 5.5) * BUILD;
    const span = w / stretch;
    while (street < streets.length && streets[street] < s) street++;
    const st = streets[street];
    if (st !== undefined && st < s + span) {
      // A cross street climbs the slope here: a gap, every row alike.
      s = st + ((6 + rng() * 4) * BUILD) / stretch;
      street++;
      continue;
    }
    const m = offset(s + span / 2);
    if (allowed(m.e, m.n)) {
      const gl = g.garden(m.e, m.n);
      const gardenChance = 0.05 + 0.18 * Math.max(0, gl) + (d > 300 ? 0.1 : 0);
      if (rng() < gardenChance) {
        if (rng() < 0.75) {
          const [ahead] = viewOf(m.e, m.n);
          const u = 1000 / ahead;
          const te = m.e - m.tn * 6;
          const tn = m.n + m.te * 6;
          const [x, y] = project(te, tn, townGround(te, tn) * VEX);
          items.push({
            type: "tree",
            t: {
              x,
              y,
              rx: (3 + rng() * 2.2) * BUILD * u,
              ry: (3.4 + rng() * 2.6) * BUILD * u,
              distance: ahead + 6,
              seed: Math.floor(rng() * 1e6),
            },
            distance: ahead + 6,
          });
        }
      } else
        items.push({
          type: "house",
          b: house(rng, m.e, m.n, m.te, m.tn, w, quay),
        });
    }
    s += span + (rng() < 0.1 ? ((2 + rng() * 4) * BUILD) / stretch : 0);
  }
  g.row++;
  g.d += 26 + rng() * 12;
  return true;
}

function house(
  rng: () => number,
  e: number,
  n: number,
  te: number,
  tn: number,
  w: number,
  quay: boolean,
): Building {
  const high = townGround(e, n) > 30;
  const storeys = quay
    ? 3 + (rng() < 0.35 ? 1 : 0)
    : rng() < (high ? 0.75 : 0.5)
      ? 2
      : 3;
  const roof = pick(rng, ROOF_TABLE);
  const slate = roof === ROOFS.slate || roof === ROOFS.slateDark;
  const wall = pick(rng, WALL_TABLE);
  const spec: Spec = {
    e,
    n,
    ground: townGround(e, n) * VEX,
    te,
    tn,
    w: w * 0.97,
    d: (8 + rng() * 5) * BUILD,
    h: (storeys * 3.1 + 0.6 + rng() * 0.8) * BUILD,
    pitch: slate ? 1 + rng() * 0.3 : 0.72 + rng() * 0.3,
    ridge: rng() < 0.3 ? "across" : "along",
    hip: rng() < 0.08,
    wall: vary(rng, wall, pick(rng, WALL_TABLE)),
    roof: vary(rng, roof, pick(rng, ROOF_TABLE)),
    storeys,
    chimneys: rng() < 0.85 ? 1 + (rng() < 0.45 ? 1 : 0) : 0,
    seed: Math.floor(rng() * 1e9),
  };
  return build(spec);
}

/** The town's landmarks and the smoking chimneys' houses. */
function landmarks(rng: () => number): Item[] {
  const out: Item[] = [];
  // Saint-Nicolas: its nave running east, the west front's gable to the roads; a low bell-cote, no tower.
  const [se, sn] = PLACES.saintNicolas;
  const g = townGround(se, sn) * VEX;
  out.push({
    type: "house",
    b: build({
      e: se,
      n: sn,
      ground: g,
      te: 0,
      tn: -1,
      w: 17 * BUILD,
      d: 38 * BUILD,
      h: 13 * BUILD,
      pitch: 0.95,
      ridge: "across",
      hip: false,
      wall: WALLS.stone,
      roof: ROOFS.slate,
      storeys: 2,
      chimneys: 0,
      seed: 7001,
    }),
  });
  out.push({
    type: "house",
    b: build({
      e: se + 7 * BUILD,
      n: sn,
      ground: g + 13 * BUILD + 8.5 * 0.95 * BUILD - 4,
      te: 0,
      tn: -1,
      w: 4.2 * BUILD,
      d: 4.2 * BUILD,
      h: 5.5 * BUILD,
      pitch: 1.6,
      ridge: "across",
      hip: true,
      wall: WALLS.stone,
      roof: ROOFS.slateDark,
      storeys: 1,
      chimneys: 0,
      seed: 7002,
    }),
  });
  // The flotilla's store at the harbour's head: three storeys, about 76 m along the quay, hipped.
  const [qe, qn] = [655, -330];
  const fr = riverAt();
  // The quay's direction there.
  let best = 0;
  let bd = Number.POSITIVE_INFINITY;
  for (let s = 600; s < 1300; s += 5) {
    const p = fr.at(s);
    const dd = Math.hypot(p.e - qe, p.n - qn);
    if (dd < bd) {
      bd = dd;
      best = s;
    }
  }
  const q = fr.at(best);
  out.push({
    type: "house",
    b: build({
      e: qe,
      n: qn,
      ground: townGround(qe, qn) * VEX,
      te: q.te,
      tn: q.tn,
      w: 76 * 1.5,
      d: 13 * BUILD,
      h: 11.5 * BUILD,
      pitch: 0.7,
      ridge: "along",
      hip: true,
      wall: WALLS.white,
      roof: ROOFS.slate,
      storeys: 3,
      chimneys: 4,
      seed: 7003,
    }),
  });
  // The houses whose chimneys smoke (TOWN_SMOKE): each centred on its site, its one chimney on the ridge's middle.
  for (const [e, n] of SMOKE_SITES) {
    let bs = 0;
    let bd2 = Number.POSITIVE_INFINITY;
    for (let s = 300; s < fr.length; s += 5) {
      const p = fr.at(s);
      const dd = Math.hypot(p.e - e, p.n - n);
      if (dd < bd2) {
        bd2 = dd;
        bs = s;
      }
    }
    const f = fr.at(bs);
    const depth = SMOKE_HOUSE.d * BUILD;
    // The front's middle half a depth toward the river from the site (the house runs back to the left of its street).
    const fe = e + f.tn * (depth / 2);
    const fn = n - f.te * (depth / 2);
    out.push({
      type: "house",
      b: build({
        e: fe,
        n: fn,
        ground: townGround(e, n) * VEX,
        te: f.te,
        tn: f.tn,
        w: SMOKE_HOUSE.w * BUILD,
        d: depth,
        h: SMOKE_HOUSE.h * BUILD,
        pitch: SMOKE_HOUSE.pitch,
        ridge: "along",
        hip: false,
        wall: WALLS.cream,
        roof: ROOFS.tile,
        storeys: 3,
        chimneys: 1,
        chimneyAt: 0.5,
        seed: Math.floor(rng() * 1e9),
      }),
    });
  }
  return out;
}

/** Every item of the lower town, far to near (built on the first call after the rows). */
export function lowerItems(): Item[] {
  if (done) return done;
  while (lowerRow()) {
    /* rows */
  }
  const items = gen?.items ?? [];
  const extra = landmarks(createRng(5521));
  // Clear the plots the landmarks stand on.
  const near = (b: Building, o: Building) =>
    Math.abs(b.x - o.x) < 5 &&
    Math.abs(b.y - o.y) < 4 &&
    Math.abs(b.distance - o.distance) < 40;
  const kept = items.filter(
    (it) =>
      it.type !== "house" ||
      !extra.some((x) => x.type === "house" && near(it.b, x.b)),
  );
  const all = [...kept, ...extra];
  const dist = (it: Item) =>
    it.type === "house" ? it.b.distance : it.distance;
  all.sort((a, b) => dist(b) - dist(a));
  done = all;
  return done;
}

/** The distance of an item, metres ahead. */
export function itemDistance(it: Item): number {
  return it.type === "house" ? it.b.distance : it.distance;
}
