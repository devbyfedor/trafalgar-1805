import {
  latOfWorldY,
  lonOfWorldX,
  worldX,
  worldY,
} from "@/components/chart/geo/mercator";
import { day } from "./dates";
import {
  ANCHORAGE,
  type Berth,
  BRITISH,
  COMBINED,
  DAWN,
  type Ship,
  VICTORY_AT_DAWN,
} from "./fleets";

/**
 * Where each ship of both fleets is from Nelson's arrival off Cádiz (28
 * September) to first light on 21 October, as keyframes by day, for beats
 * 0, 4 and 5 (docs/history-notes.md, "Scene 2": "Nelson off Cádiz",
 * "Orders, Rosily and the sortie", "The signal chain, 19 to 21 October",
 * "Positions on the chart"). Fixes are few: the anchorage, the station, the
 * chain and the frigates on 19 October, the combined fleet at nightfall and
 * midnight on the 20th, and both fleets at dawn. Between them the tracks are
 * drawn loosely and end on the dawn positions, as the history notes say
 * they must (no night position joins the dawn to better than 5–15 nm).
 */

interface Key {
  day: number;
  /** World km. */
  x: number;
  y: number;
  /** Degrees true; omitted: the heading of the leg toward the next key. */
  heading?: number;
  anchored?: boolean;
}

export interface ShipState {
  x: number;
  y: number;
  /** Radians from north, clockwise. */
  heading: number;
  anchored: boolean;
  /**
   * How far she is at anchor, 0..1: 1 riding at anchor, 0 under sail, and
   * between them over WEIGH_DAYS as she weighs and makes sail or comes to
   * and furls, so her glyph changes smoothly.
   */
  anchorage: number;
}

/** How long a ship takes to weigh and make sail, or to come to and furl, days. */
const WEIGH_DAYS = 0.12;

const at = (lon: number, lat: number): [number, number] => [
  worldX(lon),
  worldY(lat),
];

/**
 * The fleets' centres and the moments they pass them. Each ship keeps her
 * place in her fleet's dawn order, drawn closer (`spread`, a share of her
 * dawn offset) while the fleet sailed in closer order: the combined fleet
 * forming off the port, the British in the order of sailing as they chased
 * into the mouth of the Strait. At the dawn spread the fleets' northern
 * ships (the Africa above all) would have stood on the coast there.
 */
const COMBINED_TRACK = [
  // Outside the port on the morning of the 20th, forming.
  { day: day(10, 20, 11), lon: -6.42, lat: 36.565, spread: 0.45 },
  // At nightfall at most 8–10 miles south-west of Cádiz.
  { day: day(10, 20, 18.5), lon: -6.45, lat: 36.417, spread: 0.75 },
  // Midnight: interpolated, standing about S by W.
  { day: day(10, 21, 0), lon: -6.35, lat: 36.3, spread: 0.9 },
] as const;

const BRITISH_TRACK = [
  // The station, 15–20 leagues west of Cádiz; the Victory at 9.30 a.m. on
  // the 19th about 36°34.5′ N 7°24′ W.
  { day: day(10, 19, 9.5), lon: -7.4, lat: 36.575, spread: 1 },
  // The general chase for the Strait, hove to at 1 a.m. on the 20th.
  { day: day(10, 20, 1), lon: -6.12, lat: 36.05, spread: 0.4 },
  // Daybreak on the 20th, between Trafalgar and Cape Spartel.
  { day: day(10, 20, 6.5), lon: -5.97, lat: 36.0, spread: 0.4 },
  // Noon, Cádiz NE 9 leagues (by compass).
  { day: day(10, 20, 12), lon: -6.55, lat: 36.117, spread: 0.6 },
  // Midnight, the fleet's light south and west of the Euryalus.
  { day: day(10, 21, 0), lon: -6.45, lat: 36.25, spread: 0.85 },
  // Wore at 4 a.m.; the tracks end on the dawn positions.
  { day: day(10, 21, 4), lon: -6.53, lat: 36.15, spread: 0.95 },
] as const;

/** Dawn on 21 October, as the scene shows it (the sun rose at 06:27). */
export const DAWN_DAY = day(10, 21, 6.6);

/** Nelson's arrival: the start of beat 4's story. */
const SEPT_28 = day(9, 28, 12);

/**
 * Who got out on 19 October: seven of the line with the frigates Rhin and
 * Hermione, the Thémis following in the evening (history notes, "Orders,
 * Rosily and the sortie").
 */
const SORTIE = [
  "Algésiras",
  "Achille",
  "Argonaute",
  "Neptune",
  "Héros",
  "Duguay-Trouin",
  "Bahama",
  "Rhin",
  "Hermione",
];
const SORTIE_EVENING = "Thémis";

/**
 * When each ship weighs (days). On the 19th from first light, about an
 * hour apart, the Thémis at 5 p.m. On the 20th the signal came at first
 * light, 6 a.m.: the ships of the line weighed by about 6.50 and were out
 * of the bay by about 8.30, the Rayo last at about 10, the frigates behind
 * them (history notes, "20 October").
 */
const WEIGH = new Map<string, number>();
{
  const ofLine = COMBINED.filter((s) => s.group !== "frigates");
  let first = 0;
  let rest = 0;
  let frigates = 0;
  for (const s of [
    ...ofLine,
    ...COMBINED.filter((x) => x.group === "frigates"),
  ]) {
    if (SORTIE.includes(s.name))
      WEIGH.set(s.name, day(10, 19, 7) + first++ * 0.04);
    else if (s.name === SORTIE_EVENING) WEIGH.set(s.name, day(10, 19, 17));
    else if (s.name === "Rayo") WEIGH.set(s.name, day(10, 20, 8.3));
    else if (s.group === "frigates")
      WEIGH.set(s.name, day(10, 20, 7) + frigates++ * 0.003);
    else WEIGH.set(s.name, day(10, 20, 6) + rest++ * 0.0014);
  }
}

/** The passes between Las Puercas and El Diamante, the harbour mouth. */
const MOUTH = at(-6.29, 36.558);

/** The chain on 19 October (history notes, "Positions, 19 October"). */
const CHAIN: Record<string, readonly [number, number]> = {
  Defence: [-6.85, 36.367],
  Agamemnon: [-6.875, 36.375],
  Colossus: [-7.067, 36.533],
  Mars: [-7.083, 36.55],
};

function centroid(ships: readonly Ship[], berths: ReadonlyMap<Ship, Berth>) {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const s of ships) {
    const b = berths.get(s);
    if (!b) continue;
    x += worldX(b.lon);
    y += worldY(b.lat);
    n++;
  }
  return [x / Math.max(1, n), y / Math.max(1, n)] as const;
}

/** A ship's offset from her fleet's centre at dawn, world km. */
function dawnOffset(ship: Ship, centre: readonly [number, number]) {
  const b = DAWN.get(ship);
  return b ? [worldX(b.lon) - centre[0], worldY(b.lat) - centre[1]] : [0, 0];
}

function combinedKeys(ship: Ship, index: number): Key[] {
  const keys: Key[] = [];
  const berth = ANCHORAGE.get(ship);
  const dawn = DAWN.get(ship);
  if (!berth || !dawn) return keys;
  const [bx, by] = at(berth.lon, berth.lat);
  keys.push({
    day: SEPT_28,
    x: bx,
    y: by,
    heading: berth.heading,
    anchored: true,
  });
  const centre = centroid(
    COMBINED.filter((s) => s.group !== "frigates"),
    DAWN,
  );
  const [ox, oy] = dawnOffset(ship, centre);
  const sortie = SORTIE.includes(ship.name) || ship.name === SORTIE_EVENING;
  const weigh = WEIGH.get(ship.name) ?? day(10, 20, 6);
  keys.push({
    day: weigh,
    x: bx,
    y: by,
    heading: berth.heading,
    anchored: true,
  });
  // Out through the passes in an hour or two of light airs.
  keys.push({ day: weigh + 0.07, x: MOUTH[0], y: MOUTH[1] });
  if (sortie) {
    // Off the port through the afternoon and night of the 19th: about the
    // Algésiras's 4 p.m. bearing, 3¾ nm W by S of the passes.
    const [hx, hy] = at(
      -6.365 - (index % 3) * 0.01,
      36.552 - (index % 4) * 0.008,
    );
    keys.push({ day: weigh + 0.3, x: hx, y: hy });
    keys.push({ day: day(10, 20, 8), x: hx + 1.5, y: hy - 1, heading: 290 });
  }
  // In the fleet's order from the forenoon of the 20th, the formation
  // carried along the fleet's track to its dawn place.
  for (const c of COMBINED_TRACK) {
    const [cx, cy] = at(c.lon, c.lat);
    keys.push({
      day: c.day,
      x: cx + ox * c.spread,
      y: cy + oy * c.spread,
      heading: 193,
    });
  }
  const [dx, dy] = at(dawn.lon, dawn.lat);
  keys.push({ day: DAWN_DAY, x: dx, y: dy, heading: dawn.heading });
  return keys.sort((a, b) => a.day - b.day);
}

function britishKeys(ship: Ship): Key[] {
  const keys: Key[] = [];
  const dawn = DAWN.get(ship);
  if (!dawn) return keys;
  const [dx, dy] = at(dawn.lon, dawn.lat);
  const victory = at(VICTORY_AT_DAWN.lon, VICTORY_AT_DAWN.lat);
  const ox = dx - victory[0];
  const oy = dy - victory[1];
  const chain = CHAIN[ship.name];
  if (ship.group === "frigates") {
    return frigateKeys(ship, dx, dy, dawn.heading);
  }
  // At the station, lying to in loose order, the Victory at its centre.
  const station = at(BRITISH_TRACK[0].lon, BRITISH_TRACK[0].lat);
  if (chain) {
    const [cx, cy] = at(chain[0], chain[1]);
    keys.push({ day: SEPT_28, x: cx, y: cy, heading: 100 });
    keys.push({ day: day(10, 19, 9.5), x: cx, y: cy, heading: 100 });
  } else {
    keys.push({
      day: SEPT_28,
      x: station[0] + ox,
      y: station[1] + oy,
      heading: 100,
    });
    keys.push({
      day: day(10, 19, 9.5),
      x: station[0] + ox,
      y: station[1] + oy,
      heading: 103,
    });
  }
  for (const c of BRITISH_TRACK.slice(1)) {
    const [cx, cy] = at(c.lon, c.lat);
    keys.push({ day: c.day, x: cx + ox * c.spread, y: cy + oy * c.spread });
  }
  // Bearing up at 6.50 by the Victory's clock: 047° true (the owner's
  // licence, for continuity with scene 1).
  keys.push({ day: DAWN_DAY, x: dx, y: dy, heading: dawn.heading });
  return keys;
}

/**
 * The inshore frigates: off the port on the 19th (the Sirius and Euryalus
 * within a few miles of San Sebastián, the Phoebe sent west at 7.20, the
 * Naiad between from 8.10), shadowing the enemy on the 20th, by him in
 * the night, between the fleets at dawn.
 */
function frigateKeys(ship: Ship, dx: number, dy: number, dh: number): Key[] {
  const path: Record<string, [number, number, number][]> = {
    Sirius: [
      [SEPT_28, -6.36, 36.473],
      [day(10, 19, 4), -6.363, 36.473],
      [day(10, 20, 9), -6.45, 36.5],
      [day(10, 21, 0), -6.433, 36.283],
    ],
    Euryalus: [
      [SEPT_28, -6.35, 36.467],
      [day(10, 19, 7.3), -6.35, 36.467],
      [day(10, 19, 8), -6.383, 36.47],
      [day(10, 19, 12), -6.455, 36.472],
      [day(10, 20, 9), -6.48, 36.52],
      [day(10, 21, 0), -6.4, 36.333],
    ],
    Phoebe: [
      [SEPT_28, -6.34, 36.48],
      [day(10, 19, 7.3), -6.34, 36.48],
      [day(10, 19, 8), -6.45, 36.5],
      [day(10, 19, 12), -6.667, 36.517],
      [day(10, 20, 20), -6.583, 36.4],
      [day(10, 21, 0), -6.45, 36.3],
    ],
    Naiad: [
      [SEPT_28, -6.37, 36.49],
      [day(10, 19, 8.1), -6.4, 36.49],
      [day(10, 19, 12), -6.567, 36.508],
      [day(10, 21, 0), -6.44, 36.27],
    ],
  };
  const keys: Key[] = (path[ship.name] ?? []).map(([d, lon, lat]) => {
    const [x, y] = at(lon, lat);
    return { day: d, x, y };
  });
  keys.push({ day: DAWN_DAY, x: dx, y: dy, heading: dh });
  return keys;
}

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/** The shorter way from angle a to b (radians). */
function turn(a: number, b: number, t: number): number {
  const d = ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI;
  return a + d * t;
}

/** A ship's keys, with what every frame needs worked out once. */
interface Track {
  keys: readonly Key[];
  /**
   * Radians at each key: its own heading, or halfway through the turn
   * between the legs in and out of it (the one leg's at either end), so the
   * heading never jumps at a key; a ship lying still keeps the last one.
   */
  heading: Float64Array;
  /** Each leg's own course (radians): toward the next key, or the key's heading while she lies still. */
  leg: Float64Array;
  /**
   * For the stretch under way that each leg belongs to: the day she weighed
   * to begin it and the day she comes to anchor at its end (NaN for none).
   */
  weighed: Float64Array;
  anchors: Float64Array;
}

function track(keys: readonly Key[]): Track {
  const n = keys.length;
  const moves = (k: number) =>
    k + 1 < n &&
    Math.hypot(keys[k + 1].x - keys[k].x, keys[k + 1].y - keys[k].y) > 0.05;
  const course = (k: number) =>
    Math.atan2(keys[k + 1].x - keys[k].x, keys[k + 1].y - keys[k].y);
  const heading = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const own = keys[k].heading;
    const inward = k > 0 && moves(k - 1) ? course(k - 1) : undefined;
    const outward = moves(k) ? course(k) : undefined;
    if (own !== undefined) heading[k] = own * RAD;
    else if (inward !== undefined && outward !== undefined)
      heading[k] = turn(inward, outward, 0.5);
    else heading[k] = inward ?? outward ?? (k > 0 ? heading[k - 1] : 0);
  }
  const leg = new Float64Array(n);
  for (let k = 0; k < n; k++) leg[k] = moves(k) ? course(k) : heading[k];
  // Under way from an anchored key followed by one that isn't, until the
  // next anchored key.
  const weighed = new Float64Array(n).fill(Number.NaN);
  const anchors = new Float64Array(n).fill(Number.NaN);
  let w = Number.NaN;
  for (let k = 0; k < n; k++) {
    if (keys[k].anchored && k + 1 < n && !keys[k + 1].anchored) w = keys[k].day;
    else if (keys[k].anchored) w = Number.NaN;
    weighed[k] = w;
  }
  let c = Number.NaN;
  for (let k = n - 1; k >= 0; k--) {
    anchors[k] = keys[k].anchored ? Number.NaN : c;
    if (keys[k].anchored && k > 0 && !keys[k - 1].anchored) c = keys[k].day;
    else if (keys[k].anchored) c = Number.NaN;
  }
  return { keys, heading, leg, weighed, anchors };
}

const TRACKS = new Map<Ship, Track>();
COMBINED.forEach((s, i) => {
  TRACKS.set(s, track(combinedKeys(s, i)));
});
for (const s of BRITISH) TRACKS.set(s, track(britishKeys(s)));

const into = (e0: number, e1: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
};

/**
 * A ship's place at a day (days since 1 January 1805), written into `out`;
 * false before her first key. Positions move linearly between keys; the
 * heading eases from each key's heading onto the leg's course and on to the
 * next key's, so it never jumps (Track.heading). She weighs at the day of
 * an anchored key whose next key isn't, and comes to anchor at the day of
 * the anchored key she sails to; her glyph changes over WEIGH_DAYS after
 * the one and before the other, however short the legs between.
 */
export function shipAt(ship: Ship, d: number, out: ShipState): boolean {
  const tr = TRACKS.get(ship);
  const keys = tr?.keys;
  if (!tr || !keys || keys.length === 0 || d < keys[0].day) return false;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].day <= d) i++;
  const a = keys[i];
  const j = Math.min(i + 1, keys.length - 1);
  const b = keys[j];
  const span = b.day - a.day;
  const t = span > 0 ? Math.min(1, Math.max(0, (d - a.day) / span)) : 1;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.anchored = Boolean(a.anchored && (b.anchored || t === 0));
  if (a.anchored && (b.anchored || i === j)) out.anchorage = 1;
  else {
    // The stretch under way this leg belongs to: weighed at its start (an
    // anchored a weighs now), anchoring at its end.
    const w = a.anchored ? a.day : tr.weighed[i];
    const c = b.anchored ? b.day : tr.anchors[j];
    out.anchorage = Math.max(
      Number.isNaN(w) ? 0 : 1 - into(w, w + WEIGH_DAYS, d),
      Number.isNaN(c) ? 0 : into(c - WEIGH_DAYS, c, d),
    );
  }
  // Ease from the key's heading onto the leg's and onto the next key's.
  const leg = tr.leg[i];
  const h1 = turn(tr.heading[i], leg, Math.min(1, t * 4));
  out.heading = turn(h1, tr.heading[j], Math.max(0, t * 4 - 3));
  return true;
}

/** Degrees of a world point, for checks and labels. */
export function lonLat(x: number, y: number): [number, number] {
  return [lonOfWorldX(x), latOfWorldY(y)];
}
