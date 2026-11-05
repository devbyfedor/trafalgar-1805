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

/** The fleets' centres and the moments they pass them. */
const COMBINED_TRACK = [
  // Outside the port on the morning of the 20th, forming.
  { day: day(10, 20, 11), lon: -6.42, lat: 36.565 },
  // At nightfall at most 8–10 miles south-west of Cádiz.
  { day: day(10, 20, 18.5), lon: -6.45, lat: 36.417 },
  // Midnight: interpolated, standing about S by W.
  { day: day(10, 21, 0), lon: -6.35, lat: 36.3 },
] as const;

const BRITISH_TRACK = [
  // The station, 15–20 leagues west of Cádiz; the Victory at 9.30 a.m. on
  // the 19th about 36°34.5′ N 7°24′ W.
  { day: day(10, 19, 9.5), lon: -7.4, lat: 36.575 },
  // The general chase for the Strait, hove to at 1 a.m. on the 20th.
  { day: day(10, 20, 1), lon: -6.12, lat: 36.05 },
  // Daybreak on the 20th, between Trafalgar and Cape Spartel.
  { day: day(10, 20, 6.5), lon: -5.97, lat: 36.0 },
  // Noon, Cádiz NE 9 leagues (by compass).
  { day: day(10, 20, 12), lon: -6.55, lat: 36.117 },
  // Midnight, the fleet's light south and west of the Euryalus.
  { day: day(10, 21, 0), lon: -6.45, lat: 36.25 },
  // Wore at 4 a.m.; the tracks end on the dawn positions.
  { day: day(10, 21, 4), lon: -6.53, lat: 36.15 },
] as const;

/** Dawn on 21 October, as the scene shows it (the sun rose at 06:27). */
export const DAWN_DAY = day(10, 21, 6.6);

/** Nelson's arrival: the start of beat 4's story. */
const SEPT_28 = day(9, 28, 12);

/** The seven of the line that got out on 19 October. */
const SORTIE = new Set([
  "Algésiras",
  "Achille",
  "Argonaute",
  "Neptune",
  "Héros",
  "Duguay-Trouin",
  "Bahama",
]);

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
  const ofLine = ship.group !== "frigates";
  const centre = centroid(
    COMBINED.filter((s) => s.group !== "frigates"),
    DAWN,
  );
  const [ox, oy] = dawnOffset(ship, centre);
  const sortie = SORTIE.has(ship.name);
  // Weighing: the seven from first light on the 19th; the rest from 6 a.m.
  // on the 20th, the whole fleet out by about 8.30, the Rayo last at 10.
  const weigh = sortie
    ? day(10, 19, 7) + (index % 7) * 0.04
    : day(10, 20, 6) + (index % 26) * 0.012 + (ofLine ? 0 : 0.05);
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
    keys.push({ day: c.day, x: cx + ox, y: cy + oy, heading: 193 });
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
    keys.push({ day: c.day, x: cx + ox, y: cy + oy });
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

const KEYS = new Map<Ship, Key[]>();
COMBINED.forEach((s, i) => {
  KEYS.set(s, combinedKeys(s, i));
});
for (const s of BRITISH) KEYS.set(s, britishKeys(s));

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/** The shorter way from angle a to b (radians). */
function turn(a: number, b: number, t: number): number {
  const d = ((((b - a) % TAU) + TAU * 1.5) % TAU) - Math.PI;
  return a + d * t;
}

/**
 * A ship's place at a day (days since 1 January 1805), written into `out`;
 * false before her first key. Positions move linearly between keys; the
 * heading follows the leg she is on, or eases to a key's own heading near
 * that key.
 */
export function shipAt(ship: Ship, d: number, out: ShipState): boolean {
  const keys = KEYS.get(ship);
  if (!keys || keys.length === 0 || d < keys[0].day) return false;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].day <= d) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = b.day - a.day;
  const t = span > 0 ? Math.min(1, Math.max(0, (d - a.day) / span)) : 1;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.anchored = Boolean(a.anchored && (b.anchored || t === 0));
  const into = (e0: number, e1: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return u * u * (3 - 2 * u);
  };
  if (a.anchored && b.anchored) out.anchorage = 1;
  else if (a.anchored) out.anchorage = 1 - into(a.day, a.day + WEIGH_DAYS, d);
  else if (b.anchored && span > 0)
    out.anchorage = into(b.day - Math.min(WEIGH_DAYS, span), b.day, d);
  else out.anchorage = i === keys.length - 1 && a.anchored ? 1 : 0;
  // The leg's own course, unless a key gives one.
  const moving = Math.hypot(b.x - a.x, b.y - a.y) > 0.05;
  const leg = moving
    ? Math.atan2(b.x - a.x, b.y - a.y)
    : (a.heading ?? 0) * RAD;
  const from = a.heading !== undefined ? a.heading * RAD : leg;
  const to = b.heading !== undefined ? b.heading * RAD : leg;
  // Ease from the key's heading onto the leg's and onto the next key's.
  const h1 = turn(from, leg, Math.min(1, t * 4));
  out.heading = turn(h1, to, Math.max(0, t * 4 - 3));
  return true;
}

/** Degrees of a world point, for checks and labels. */
export function lonLat(x: number, y: number): [number, number] {
  return [lonOfWorldX(x), latOfWorldY(y)];
}
