import { CLIFF_EDGE, NORTH_RISE, OUTREAU, SHORE_HIGH } from "../../geo";
import { type Pt, wobble } from "../../paint/kit";
import { project, VEX, viewOf } from "../../scene";

/**
 * The ground of the shore painter's area (the cliffs and the right camp
 * north of the harbour, the dunes, Châtillon and Outreau with the left camp
 * south of the Liane), read from geo.ts and drawn with scene.ts's licence
 * on heights, plus one licence of this area's own:
 *
 * RISE. From the boat 1.1 km out and 6 m up, the plateau north of the
 * harbour, rising only 37 m over 2 km inland (geo.ts NORTH_RISE), stays
 * wholly hidden behind its own 55 m cliff edge, and so would the right
 * camp. The period views from the roads show the camp's rows climbing in
 * tiers up the seaward slope to the crest (camps.md (b)): the plateau's
 * rise above its cliff edge is drawn RISE times on top of VEX, so the
 * tiers stand one above the other as those views draw them.
 */
export const RISE = 3.5;

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Distance ahead of the eye, metres (for aerial perspective and pens). */
export function aheadOf(e: number, n: number): number {
  return viewOf(e, n)[0];
}

// ---------------------------------------------------------------- north

const browNoise = wobble(61, [
  [230, 2.2],
  [80, 1.1],
  [27, 0.45],
]);

/**
 * The cliff's top edge north of the harbour at `n` metres north: its east
 * (metres) and its true height (metres), from geo.ts CLIFF_EDGE, a little
 * broken. South of its last point (the Tour d'Odre) the edge turns inland
 * along the harbour's north bank and falls toward the quays.
 */
export function edgeAt(n: number): readonly [east: number, height: number] {
  const t = CLIFF_EDGE;
  const last = t[t.length - 1];
  let e = t[0][0];
  let h = t[0][2];
  if (n <= last[1]) {
    const k = smoothstep(last[1], 15, n);
    e = last[0] + 240 * k;
    h = last[2] - 31 * k;
  } else if (n < t[0][1]) {
    for (let i = 0; i < t.length - 1; i++) {
      const [e0, n0, h0] = t[i];
      const [e1, n1, h1] = t[i + 1];
      if (n <= n0 && n >= n1) {
        const k = (n0 - n) / (n0 - n1);
        e = e0 + (e1 - e0) * k;
        h = h0 + (h1 - h0) * k;
        break;
      }
    }
  }
  return [e, h + browNoise(n) * smoothstep(40, 200, n)];
}

/** The plateau's true height at `d` metres inland of its edge (geo.ts NORTH_RISE). */
export function riseAt(d: number): number {
  const t = NORTH_RISE;
  if (d <= t[0][0]) return t[0][1];
  for (let i = 0; i < t.length - 1; i++) {
    const [d0, h0] = t[i];
    const [d1, h1] = t[i + 1];
    if (d <= d1) return h0 + ((h1 - h0) * (d - d0)) / (d1 - d0);
  }
  const [dl, hl] = t[t.length - 1];
  return hl + (d - dl) * 0.004;
}

const swell = wobble(71, [
  [900, 3.5],
  [380, 1.6],
]);

/**
 * The north ground's height as drawn (metres above the water, VEX and
 * RISE applied) at `d` metres inland of the cliff edge at `n` metres
 * north. Toward the harbour (south of the Tour d'Odre's site) the plateau
 * falls to the Liane's valley and the lower town.
 */
export function northUp(n: number, d: number): number {
  const [, h] = edgeAt(n);
  const camp = smoothstep(130, 520, n);
  const rise = (riseAt(d) - NORTH_RISE[0][1]) * RISE * camp;
  const undulate = swell(n) * smoothstep(0, 500, d) * camp;
  const valley = 34 * (1 - smoothstep(130, 430, n)) * smoothstep(30, 650, d);
  return VEX * (h + rise + undulate - valley);
}

/** A point of the north ground, layer units, `up` metres (drawn) above it. */
export function northAt(n: number, d: number, up = 0): Pt {
  const [e] = edgeAt(n);
  return project(e + d, n, northUp(n, d) + up);
}

/** The high-water shore's east at `n` metres north (geo.ts SHORE_HIGH). */
export function shoreAt(n: number): number {
  const t = SHORE_HIGH;
  if (n >= t[0][1]) return t[0][0];
  for (let i = 0; i < t.length - 1; i++) {
    const [e0, n0] = t[i];
    const [e1, n1] = t[i + 1];
    if (n <= n0 && n >= n1) return e0 + ((e1 - e0) * (n0 - n)) / (n0 - n1);
  }
  return t[t.length - 1][0];
}

// ---------------------------------------------------------------- south

/**
 * Outreau's brow (geo.ts OUTREAU.browLine), carried a little east along
 * the Liane's valley where it falls away, as a densely sampled line of
 * [east, north, true height].
 */
export function browLine(): [number, number, number][] {
  const pts: [number, number, number][] = [
    [2800, -470, 10],
    [2300, -560, 30],
    [1900, -640, 40],
    ...OUTREAU.browLine.map(
      ([e, n]) => [e, n, OUTREAU.brow] as [number, number, number],
    ),
  ];
  const out: [number, number, number][] = [];
  const noise = wobble(83, [
    [300, 1.6],
    [90, 0.7],
  ]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [e0, n0, h0] = pts[i];
    const [e1, n1, h1] = pts[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(e1 - e0, n1 - n0) / 18));
    for (let s = 0; s < steps; s++) {
      const k = s / steps;
      const e = e0 + (e1 - e0) * k;
      const n = n0 + (n1 - n0) * k;
      out.push([e, n, h0 + (h1 - h0) * k + noise(e - n)]);
    }
  }
  const lastPt = pts[pts.length - 1];
  out.push([lastPt[0], lastPt[1], lastPt[2]]);
  return out;
}

/**
 * The escarpment below Outreau's brow, at `f` of the way down (0 the
 * brow, 1 its foot on the flats or the dunes): each brow point carried
 * down the slope (to the north-west, away from the plateau), with its
 * true height.
 */
export function escarpment(
  brow: readonly (readonly [number, number, number])[],
  f: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < brow.length; i++) {
    const a = brow[Math.max(0, i - 1)];
    const b = brow[Math.min(brow.length - 1, i + 1)];
    let te = b[0] - a[0];
    let tn = b[1] - a[1];
    const len = Math.hypot(te, tn) || 1;
    te /= len;
    tn /= len;
    // Down the slope: the side away from the plateau (west-north-west).
    const ne = tn;
    const nn = -te;
    const [e, n, h] = brow[i];
    const run = 380 * f ** 0.85;
    const foot = OUTREAU.flats;
    // A convex brow, a long concave foot: the escarpment's profile.
    const drop = (h - foot) * (1 - (1 - f) ** 1.6);
    out.push([e + ne * run, n + nn * run, h - drop]);
  }
  return out;
}

/** Projects [east, north, true height] with VEX (plus `up` metres drawn). */
export function landPt(p: readonly [number, number, number], up = 0): Pt {
  return project(p[0], p[1], p[2] * VEX + up);
}

/**
 * Châtillon's ridge between the Liane's flats and the beach: its crest
 * [east, north, true height], north to south (geo.ts OUTREAU.chatillon;
 * its line is this area's inference: a rounded spur standing over the
 * dunes south of the harbour's mouth).
 */
export const CHATILLON: readonly (readonly [number, number, number])[] = [
  [215, -330, 9],
  [255, -440, 22],
  [295, -580, 35],
  [318, -700, OUTREAU.chatillon],
  [322, -830, 41],
  [290, -980, 33],
  [215, -1110, 21],
  [130, -1230, 12],
];

// ---------------------------------------------------------------- smoke

/**
 * The camps' kitchen fires (metres east and north of the jetty heads, and
 * up as drawn with VEX and RISE), at the back, landward edge of each camp,
 * where their smoke can rise into view: the right camp's behind its crest,
 * the left camp's behind Outreau's brow. For the smoke canvas.
 */
export const KITCHENS: readonly { east: number; north: number; up: number }[] =
  [
    ...[620, 900, 1180, 1460, 1760, 2080, 2400, 2750].map((n, i) => {
      const d = 1560 + (i % 3) * 70;
      const [e] = edgeAt(n);
      return { east: e + d, north: n, up: northUp(n, d) + 6 };
    }),
    ...(
      [
        [1250, -940],
        [900, -1080],
        [620, -1260],
        [380, -1520],
        [170, -1840],
      ] as const
    ).map(([east, north]) => ({
      east,
      north,
      up: OUTREAU.plateau * VEX + 6,
    })),
  ];
