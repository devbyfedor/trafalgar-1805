import {
  latOfWorldY,
  lonOfWorldX,
  worldX,
  worldY,
} from "@/components/chart/geo/mercator";
import type { GlyphType, ShipMark } from "@/components/chart/glyphs/Glyphs";
import { buildCraft } from "@/components/ship/geometry/smallcraft";
import { type DeriveOptions, deriveSpec } from "@/components/ship/specs/derive";
import {
  BRITISH_74,
  BRITISH_98,
  ENEMY_TYPES,
} from "@/components/ship/specs/fleet-1805";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";
import { createRng, jitter } from "@/lib/random";
import { day } from "./dates";

/**
 * The ships on the chart: their glyph types, the two fleets ship by ship,
 * and where they stood at the moments the scene shows. Sources and doubts:
 * docs/history-notes.md, "Scene 2" ("Positions on the chart", "Fleet sizes
 * at each stage").
 */

/** A type of scene 1's enemy line, at anchor (no sail set). */
function anchored(id: string, o: Omit<DeriveOptions, "id" | "sailSet">) {
  return {
    id,
    spec: deriveSpec(VICTORY_1805, { ...o, id, sailSet: "furled" }),
  };
}

/**
 * A frigate: one gun deck, about three quarters of a first rate's length
 * and rig. At glyph size a two-decker's hull at that scale reads as a
 * frigate's (the silhouettes show no gun ports).
 */
function frigate(
  id: string,
  nation: DeriveOptions["nation"],
  sailSet: DeriveOptions["sailSet"],
  seed: number,
) {
  return {
    id,
    spec: deriveSpec(VICTORY_1805, {
      id,
      name: `${nation} frigate`,
      nation,
      guns: 38,
      decks: 2,
      scale: 0.74,
      sailSet,
      seed,
    }),
  };
}

export const GLYPH_TYPES: readonly GlyphType[] = [
  { id: "victory", spec: VICTORY_1805 },
  { id: "british-98", spec: BRITISH_98 },
  { id: "british-74", spec: BRITISH_74 },
  { id: "french-74", spec: ENEMY_TYPES["french-74"] },
  { id: "french-80", spec: ENEMY_TYPES["french-80"] },
  { id: "spanish-74", spec: ENEMY_TYPES["spanish-74"] },
  { id: "spanish-112", spec: ENEMY_TYPES["spanish-112"] },
  { id: "santisima-trinidad", spec: ENEMY_TYPES["santisima-trinidad"] },
  anchored("french-74-anchored", {
    name: "French 74 at anchor",
    nation: "france",
    guns: 74,
    decks: 2,
    scale: 0.93,
    seed: 1174,
  }),
  anchored("french-80-anchored", {
    name: "French 80 at anchor",
    nation: "france",
    guns: 80,
    decks: 2,
    scale: 0.98,
    seed: 1180,
  }),
  anchored("spanish-74-anchored", {
    name: "Spanish 74 at anchor",
    nation: "spain",
    guns: 74,
    decks: 2,
    scale: 0.9,
    seed: 2174,
  }),
  anchored("spanish-112-anchored", {
    name: "Spanish three-decker at anchor",
    nation: "spain",
    guns: 112,
    decks: 3,
    scale: 1.01,
    seed: 2212,
  }),
  anchored("santisima-trinidad-anchored", {
    name: "Santísima Trinidad at anchor",
    nation: "spain",
    guns: 136,
    decks: 4,
    scale: 1.06,
    seed: 2236,
  }),
  frigate("british-frigate", "britain", "full", 3801),
  frigate("french-frigate", "france", "easy", 3802),
  frigate("french-frigate-anchored", "france", "furled", 3803),
  // The vessels under the frigates (ship/geometry/smallcraft.ts), drawn at
  // the one scale of every type: a brig's main truck stands about half as
  // high as a seventy-four's.
  { id: "french-brig", silhouette: buildCraft("brig", true) },
  { id: "french-brig-anchored", silhouette: buildCraft("brig", false) },
  { id: "british-brig", silhouette: buildCraft("brig", true) },
  { id: "british-schooner", silhouette: buildCraft("schooner", true) },
  { id: "british-cutter", silhouette: buildCraft("cutter", true) },
];

/** The glyph type a ship flies under sail, and at anchor. */
interface Rig {
  sail: string;
  anchor?: string;
  /** Size against the type's own. */
  size?: number;
}

const RIGS = {
  victory: { sail: "victory" },
  firstRate: { sail: "british-98", size: 1.03 },
  british98: { sail: "british-98" },
  british80: { sail: "british-74", size: 1.03 },
  british74: { sail: "british-74" },
  british64: { sail: "british-74", size: 0.93 },
  britishFrigate: { sail: "british-frigate" },
  /** The Weazle, a Cruizer-class brig-sloop of 30.5 m, a little larger than the French brigs. */
  britishBrig: { sail: "british-brig", size: 1.03 },
  schooner: { sail: "british-schooner" },
  cutter: { sail: "british-cutter" },
  frenchBrig: { sail: "french-brig", anchor: "french-brig-anchored" },
  french80: { sail: "french-80", anchor: "french-80-anchored" },
  french74: { sail: "french-74", anchor: "french-74-anchored" },
  frenchFrigate: { sail: "french-frigate", anchor: "french-frigate-anchored" },
  trinidad: {
    sail: "santisima-trinidad",
    anchor: "santisima-trinidad-anchored",
  },
  spanish112: { sail: "spanish-112", anchor: "spanish-112-anchored" },
  spanish100: {
    sail: "spanish-112",
    anchor: "spanish-112-anchored",
    size: 0.97,
  },
  spanish80: { sail: "spanish-74", anchor: "spanish-74-anchored", size: 1.05 },
  spanish74: { sail: "spanish-74", anchor: "spanish-74-anchored" },
  spanish64: { sail: "spanish-74", anchor: "spanish-74-anchored", size: 0.93 },
} satisfies Record<string, Rig>;

export type Side = "british" | "combined";

/** The rigs of ships of the line (the rest: frigates and the small craft). */
const LINE_RIGS: ReadonlySet<Rig> = new Set<Rig>([
  RIGS.victory,
  RIGS.firstRate,
  RIGS.british98,
  RIGS.british80,
  RIGS.british74,
  RIGS.british64,
  RIGS.french80,
  RIGS.french74,
  RIGS.trinidad,
  RIGS.spanish112,
  RIGS.spanish100,
  RIGS.spanish80,
  RIGS.spanish74,
  RIGS.spanish64,
]);

export interface Ship {
  name: string;
  side: Side;
  rig: Rig;
  /**
   * The group the ship belongs to at dawn on 21 October: Nelson's or
   * Collingwood's, the combined fleet's main body or Gravina's squadron,
   * and the frigates.
   */
  group: "nelson" | "collingwood" | "main" | "gravina" | "frigates";
  /** The group's lead, which stands for it from far off. */
  lead?: boolean;
  /** Stayed at anchor in Cádiz when the fleet sailed: no place at dawn. */
  stays?: boolean;
  /** Left the story on this day (days since 1 January 1805): no place at dawn. */
  until?: number;
  /**
   * Joined the fleet off Cádiz (or in it) on this day; not with it before
   * (lineStrength; the director fades her in over the scroll).
   */
  joins?: number;
  /** Away from the fleet between these days (the Leviathan at Gibraltar). */
  away?: readonly [number, number];
}

/** Whether a ship is with her fleet on day d (Ship.joins, away, until). */
export function withFleet(ship: Ship, d: number): boolean {
  if (ship.stays) return false;
  if (ship.until !== undefined && d >= ship.until) return false;
  if (ship.joins !== undefined && d < ship.joins) return false;
  if (ship.away && d >= ship.away[0] && d < ship.away[1]) return false;
  return true;
}

/**
 * The British fleet at Trafalgar: 27 of the line (3 of 100 guns, 4 of 98,
 * 1 of 80, 16 of 74, 3 of 64), four frigates, the schooner Pickle and the
 * cutter Entreprenante (Nicolas VII 130, 215; the Conqueror's log at
 * daylight, NRS II 257); and the brig-sloop Weazle, with Blackwood's
 * frigates off Cádiz until 9 a.m. on 19 October, when she sailed for
 * Gibraltar and Tetuan with the news and missed the battle (NRS II 146,
 * 312). The groups are the columns they formed in the morning; at dawn
 * they lay in loose order in two bodies strung north and south (history
 * notes). The small craft are listed with the frigates.
 */
export const BRITISH: readonly Ship[] = [
  ["Victory", RIGS.victory, "nelson", true],
  ["Téméraire", RIGS.british98, "nelson"],
  ["Neptune", RIGS.british98, "nelson"],
  // At Gibraltar from the evening of 2 October (the day she went is not
  // recorded) until the 8th (strengths-by-date.md, 2.1).
  [
    "Leviathan",
    RIGS.british74,
    "nelson",
    false,
    { away: [day(10, 2, 18), day(10, 8, 16)] },
  ],
  ["Britannia", RIGS.firstRate, "nelson"],
  ["Conqueror", RIGS.british74, "nelson"],
  // The ships that joined Nelson off Cádiz in October, each from the day
  // she did (history-notes.md, "Scene 2: the strengths lettered at the
  // tracks' heads"); the Africa's joining, by the forenoon of the 14th, is
  // taken with the Prince of Wales's going on the evening of the 13th.
  ["Agamemnon", RIGS.british64, "nelson", false, { joins: day(10, 13, 10) }],
  ["Ajax", RIGS.british74, "nelson"],
  ["Orion", RIGS.british74, "nelson"],
  ["Minotaur", RIGS.british74, "nelson"],
  ["Spartiate", RIGS.british74, "nelson"],
  ["Africa", RIGS.british64, "nelson", false, { joins: day(10, 13, 18) }],
  [
    "Royal Sovereign",
    RIGS.firstRate,
    "collingwood",
    true,
    { joins: day(10, 8, 16) },
  ],
  [
    "Belleisle",
    RIGS.british74,
    "collingwood",
    false,
    { joins: day(10, 10, 15) },
  ],
  ["Mars", RIGS.british74, "collingwood"],
  ["Tonnant", RIGS.british80, "collingwood"],
  ["Bellerophon", RIGS.british74, "collingwood"],
  ["Colossus", RIGS.british74, "collingwood"],
  ["Achille", RIGS.british74, "collingwood"],
  ["Dreadnought", RIGS.british98, "collingwood"],
  ["Polyphemus", RIGS.british64, "collingwood"],
  ["Revenge", RIGS.british74, "collingwood"],
  ["Swiftsure", RIGS.british74, "collingwood"],
  ["Defiance", RIGS.british74, "collingwood", false, { joins: day(10, 7, 9) }],
  ["Thunderer", RIGS.british74, "collingwood"],
  ["Defence", RIGS.british74, "collingwood"],
  ["Prince", RIGS.british98, "collingwood"],
  ["Euryalus", RIGS.britishFrigate, "frigates"],
  ["Naiad", RIGS.britishFrigate, "frigates"],
  ["Phoebe", RIGS.britishFrigate, "frigates"],
  ["Sirius", RIGS.britishFrigate, "frigates"],
  ["Pickle", RIGS.schooner, "frigates"],
  ["Entreprenante", RIGS.cutter, "frigates"],
  ["Weazle", RIGS.britishBrig, "frigates", false, { until: day(10, 19, 16) }],
].map(([name, rig, group, lead, more]) => ({
  name,
  side: "british",
  rig,
  group,
  lead: Boolean(lead),
  ...(more as object),
})) as Ship[];

/**
 * The combined fleet: 33 of the line, 18 French (4 of 80, 14 of 74) and 15
 * Spanish (the Santísima Trinidad, two of 112, the Rayo of 100, two of 80,
 * eight of 74 and the San Leandro of 64), with five French frigates and
 * the brigs Argus and Furet (Collingwood's dispatch; James III 386; the
 * Euryalus at 8 a.m. on the 21st, NRS II 149); and the brig Observateur,
 * left at anchor in Cádiz by Villeneuve's order, her men drafted into the
 * fleet (her letter of 20 October, Desbrière 1907, annexes p. 158).
 * Gravina's squadron of observation, twelve ships, lay to windward of the
 * van at dawn, his flagship leading the whole line. The brigs are listed
 * with the frigates.
 */
export const COMBINED: readonly Ship[] = [
  ["Bucentaure", RIGS.french80, "main", true],
  ["Santísima Trinidad", RIGS.trinidad, "main"],
  ["Formidable", RIGS.french80, "main"],
  ["Neptune", RIGS.french80, "main"],
  ["Indomptable", RIGS.french80, "main"],
  ["Redoutable", RIGS.french74, "main"],
  ["Fougueux", RIGS.french74, "main"],
  ["Pluton", RIGS.french74, "main"],
  ["Mont-Blanc", RIGS.french74, "main"],
  ["Intrépide", RIGS.french74, "main"],
  ["Scipion", RIGS.french74, "main"],
  ["Duguay-Trouin", RIGS.french74, "main"],
  ["Héros", RIGS.french74, "main"],
  // Just out of dock at La Carraca on 28 September, ready with the fleet in
  // the first days of October (strengths-by-date.md, 3.2; the day taken).
  ["Santa Ana", RIGS.spanish112, "main", false, { joins: day(10, 3, 12) }],
  ["Rayo", RIGS.spanish100, "main"],
  ["Neptuno", RIGS.spanish80, "main"],
  ["Monarca", RIGS.spanish74, "main"],
  ["San Agustín", RIGS.spanish74, "main"],
  ["San Francisco de Asís", RIGS.spanish74, "main"],
  ["San Justo", RIGS.spanish74, "main"],
  ["San Leandro", RIGS.spanish64, "main"],
  ["Príncipe de Asturias", RIGS.spanish112, "gravina", true],
  ["Algésiras", RIGS.french74, "gravina"],
  ["Achille", RIGS.french74, "gravina"],
  ["Argonaute", RIGS.french74, "gravina"],
  ["Berwick", RIGS.french74, "gravina"],
  ["Aigle", RIGS.french74, "gravina"],
  ["Swiftsure", RIGS.french74, "gravina"],
  ["Bahama", RIGS.spanish74, "gravina"],
  ["Montañés", RIGS.spanish74, "gravina"],
  ["Argonauta", RIGS.spanish80, "gravina"],
  ["San Ildefonso", RIGS.spanish74, "gravina"],
  ["San Juan Nepomuceno", RIGS.spanish74, "gravina"],
  ["Cornélie", RIGS.frenchFrigate, "frigates"],
  ["Hermione", RIGS.frenchFrigate, "frigates"],
  ["Hortense", RIGS.frenchFrigate, "frigates"],
  ["Rhin", RIGS.frenchFrigate, "frigates"],
  ["Thémis", RIGS.frenchFrigate, "frigates"],
  ["Argus", RIGS.frenchBrig, "frigates"],
  ["Furet", RIGS.frenchBrig, "frigates"],
  ["Observateur", RIGS.frenchBrig, "frigates", false, { stays: true }],
].map(([name, rig, group, lead, more]) => ({
  name,
  side: "combined",
  rig,
  group,
  lead: Boolean(lead),
  ...(more as object),
})) as Ship[];

/** Whether a ship has a place at dawn on 21 October (not one left in port, or gone). */
export function atDawn(ship: Ship): boolean {
  return !ship.stays && ship.until === undefined;
}

/** A ship's place at a moment: position (degrees) and heading (degrees true). */
export interface Berth {
  lon: number;
  lat: number;
  heading: number;
}

/** Victory at first light on 21 October: some 20 nm west of Cape Trafalgar. */
export const VICTORY_AT_DAWN = { lon: -6.4667, lat: 36.1333 } as const;

/** Degrees of latitude and longitude for world km here. */
function place(x: number, y: number): [number, number] {
  return [lonOfWorldX(x), latOfWorldY(y)];
}

/**
 * Ships strewn round a centre in loose order, deterministic: an ellipse of
 * semi-axes (along, across) world km, its long axis on `axis` degrees true,
 * no two ships closer than `gap` km. The lead, if any, keeps the centre.
 */
function strew(
  count: number,
  centre: readonly [number, number],
  along: number,
  across: number,
  axis: number,
  gap: number,
  seed: number,
  leadAtCentre: boolean,
): [number, number][] {
  const rng = createRng(seed);
  const cx = worldX(centre[0]);
  const cy = worldY(centre[1]);
  const a = (axis * Math.PI) / 180;
  const ux = Math.sin(a);
  const uy = Math.cos(a);
  const points: [number, number][] = leadAtCentre ? [[cx, cy]] : [];
  let tries = 0;
  while (points.length < count && tries < 5000) {
    tries++;
    const s = jitter(rng, 1);
    const t = jitter(rng, 1);
    if (s * s + t * t > 1) continue;
    const x = cx + ux * s * along + uy * t * across;
    const y = cy + uy * s * along - ux * t * across;
    if (points.some(([px, py]) => Math.hypot(px - x, py - y) < gap)) continue;
    points.push([x, y]);
  }
  return points.map(([x, y]) => place(x, y));
}

/**
 * How a ragged line is drawn (DawnSpread). Session 16 drew the dawn lines
 * longer and evener through these; the owner's licence is now DAWN_EASE,
 * ship by ship, and the lines are drawn as the sources' estimate has them.
 */
interface LineDrawing {
  /** Each step between 1 ∓ uneven/2 of the mean (0.9 at the sources' raggedness). */
  uneven?: number;
  /** The line drawn this many times its length about its middle. */
  stretch?: number;
  /** The gap between the divisions, in steps. */
  divisionGap?: number;
  /**
   * The steps either side of ship `lead` this many times as long: a group's
   * lead is drawn at her full size, about twice the others' in a crowd, and
   * took her neighbours' room.
   */
  lead?: number;
  leadRoom?: number;
  /**
   * The steps at the line's start this much longer than the mean, at its
   * end as much shorter (in proportion): the start lies farther from the
   * last frame's camera, so its ships stood closer together on screen.
   */
  taper?: number;
}

/**
 * A ragged line: `count` ships from `from` to `to` (degrees), in uneven
 * steps with a gap where `breakAt` (0..1 along it) splits it into two
 * divisions, each ship off the line by up to `wander` km (LineDrawing).
 */
function raggedLine(
  count: number,
  from: readonly [number, number],
  to: readonly [number, number],
  wander: number,
  breakAt: number,
  seed: number,
  drawing: LineDrawing = {},
): [number, number][] {
  const {
    uneven = 0.9,
    stretch = 1,
    divisionGap = 3.2,
    lead = -1,
    leadRoom = 1,
    taper = 0,
  } = drawing;
  const rng = createRng(seed);
  const ax = worldX(from[0]);
  const ay = worldY(from[1]);
  const bx = worldX(to[0]);
  const by = worldY(to[1]);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const x0 = mx + (ax - mx) * stretch;
  const y0 = my + (ay - my) * stretch;
  const x1 = mx + (bx - mx) * stretch;
  const y1 = my + (by - my) * stretch;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  // Uneven steps along the line, with a wider gap between the divisions.
  const steps: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const u = (i + 0.5) / (count - 1);
    const gap = Math.abs(u - breakAt) < 0.5 / (count - 1) ? divisionGap : 1;
    steps.push(gap * (1 + (rng() - 0.5) * uneven) * (1 + taper * (1 - 2 * u)));
  }
  if (lead > 0) steps[lead - 1] *= leadRoom;
  if (lead >= 0 && lead < count - 1) steps[lead] *= leadRoom;
  const total = steps.reduce((s, v) => s + v, 0);
  const out: [number, number][] = [];
  let u = 0;
  for (let i = 0; i < count; i++) {
    const off = jitter(rng, wander);
    out.push(
      place(x0 + (x1 - x0) * u + nx * off, y0 + (y1 - y0) * u + ny * off),
    );
    if (i < count - 1) u += steps[i] / total;
  }
  return out;
}

/**
 * Both fleets at first light on 21 October, at the sources' spacing (the
 * owner's decision, 1 November 2026; history notes, "Dawn, 21 October").
 * - The British some 20 nm west of Cape Trafalgar in loose order, in two
 *   bodies strung north and south: Nelson's round the Victory (36°08′ N
 *   6°28′ W), Collingwood's about 3½ nm to the south (the Mars was 3–4 nm
 *   from the Victory at 4 a.m.), each within about two miles; the Africa,
 *   parted in the night, about 13 nm to the north (Cape Trafalgar SE 8–9
 *   leagues at 6 a.m.). All on 047° true, the course after bearing up at
 *   about 6.50: a licence (the owner's) for continuity with scene 1's
 *   Victory sailing east; at sunrise they steered N by E, about 350° true.
 * - The combined fleet 9–12 nm east of the Victory in a ragged line about
 *   five miles long north to south, centred about 36°09′ N 6°14′ W: the
 *   main body in two irregular divisions, Gravina's squadron to windward
 *   (west) of the van (the south end), heading 180–195° true on the
 *   starboard tack; its frigates to leeward, inshore.
 */
/** How the dawn fleets are laid out (SOURCES_SPREAD: the sources' estimate). */
interface DawnSpread {
  /** The main body's line and Gravina's squadron's, drawn this many times their lengths. */
  mainStretch: number;
  gravinaStretch: number;
  /** Their steps' unevenness (LineDrawing.uneven). */
  uneven: number;
  /** How far a ship stands off her line, km. */
  mainWander: number;
  gravinaWander: number;
  /** The gap between the main body's two divisions, in steps. */
  divisionGap: number;
  /** The steps either side of a line's lead, scaled (LineDrawing.leadRoom). */
  leadRoom: number;
  /** The steps at a line's far (northern) end longer, its near end shorter (LineDrawing.taper). */
  taper: number;
  /** The British bodies drawn this much wider about their leads. */
  britishStretch: number;
  /** The French frigates this far farther inshore (east), km. */
  frigatesInshore: number;
}

/** The layout of the sources' estimate, as session 9 drew it. */
const SOURCES_SPREAD: DawnSpread = {
  mainStretch: 1,
  gravinaStretch: 1,
  uneven: 0.9,
  mainWander: 0.55,
  gravinaWander: 0.7,
  divisionGap: 3.2,
  leadRoom: 1,
  taper: 0,
  britishStretch: 1,
  frigatesInshore: 0,
};

/** Places about a centre (degrees) drawn `k` times as far from it. */
function scaled(
  at: [number, number][],
  centre: readonly [number, number],
  k: number,
): [number, number][] {
  const cx = worldX(centre[0]);
  const cy = worldY(centre[1]);
  return at.map(([lon, lat]) =>
    place(cx + (worldX(lon) - cx) * k, cy + (worldY(lat) - cy) * k),
  );
}

/** Both fleets at first light on 21 October (see the comments above), as `spread` lays them out. */
function dawnBerths(spread: DawnSpread): Map<Ship, Berth> {
  const berths = new Map<Ship, Berth>();
  const rng = createRng(2110);
  const set = (ships: readonly Ship[], at: [number, number][], h: number) => {
    ships.forEach((s, i) => {
      const [lon, lat] = at[i];
      berths.set(s, { lon, lat, heading: h + jitter(rng, 4) });
    });
  };
  const nelson = BRITISH.filter((s) => s.group === "nelson");
  const africa = nelson.find((s) => s.name === "Africa");
  const nelsonBody = nelson.filter((s) => s !== africa);
  const victory = [VICTORY_AT_DAWN.lon, VICTORY_AT_DAWN.lat] as const;
  set(
    nelsonBody,
    scaled(
      strew(nelsonBody.length, victory, 3.6, 2.6, 140, 0.9, 11, true),
      victory,
      spread.britishStretch,
    ),
    47,
  );
  if (africa) berths.set(africa, { lon: -6.5, lat: 36.35, heading: 47 });
  const collingwood = BRITISH.filter((s) => s.group === "collingwood");
  const sovereign = [-6.452, 36.075] as const;
  set(
    collingwood,
    scaled(
      strew(collingwood.length, sovereign, 3.8, 2.8, 150, 0.9, 12, true),
      sovereign,
      spread.britishStretch,
    ),
    47,
  );
  const main = COMBINED.filter((s) => s.group === "main");
  // The flagships near the middle of the main body: order the line so the
  // Bucentaure and the Santísima Trinidad fall there.
  const order = [...main.slice(2), ...main.slice(0, 2)];
  const mid = Math.floor(order.length / 2);
  order.splice(mid, 0, ...order.splice(order.length - 2, 2));
  const line = raggedLine(
    order.length,
    [-6.222, 36.205],
    [-6.236, 36.118],
    spread.mainWander,
    0.45,
    13,
    {
      uneven: spread.uneven,
      stretch: spread.mainStretch,
      divisionGap: spread.divisionGap,
      lead: order.findIndex((s) => s.lead),
      leadRoom: spread.leadRoom,
      taper: spread.taper,
    },
  );
  order.forEach((s, i) => {
    const [lon, lat] = line[i];
    berths.set(s, { lon, lat, heading: 186 + jitter(rng, 6) });
  });
  // Gravina's flagship led the whole line at daybreak (the Príncipe de
  // Asturias's journal, Desbrière 1907, annexes pp. 379, 384; Desbrière p.
  // 165): on the starboard tack, heading south, the head is the south end.
  const gravina = COMBINED.filter((s) => s.group === "gravina");
  const squadron = raggedLine(
    gravina.length,
    [-6.262, 36.16],
    [-6.268, 36.098],
    spread.gravinaWander,
    2,
    14,
    {
      uneven: spread.uneven,
      stretch: spread.gravinaStretch,
      lead: gravina.findIndex((s) => s.lead),
      leadRoom: spread.leadRoom,
      taper: spread.taper,
    },
  );
  gravina.forEach((s, i) => {
    const [lon, lat] = squadron[gravina.length - 1 - i];
    berths.set(s, { lon, lat, heading: 188 + jitter(rng, 6) });
  });
  // Frigates and the small craft: no log fixes any of them at first light,
  // so each is an estimate from where the night left her (research note
  // scene-02/session-17/small-craft.md). The British frigates between the
  // fleets, where the night chain had them; the Pickle in company with the
  // Sirius, on the British side of her; the Entreprenante, the admiral's
  // tender, about a mile on the Victory's lee. The French: the Cornélie
  // close to leeward of the van since 11.30 p.m. (her report, annexes p.
  // 159); the Hortense and the Furet to leeward of Villeneuve's own
  // squadron, about the Bucentaure (order of battle of 6 October, annexes
  // p. 124; Desbrière p. 174); the Rhin inshore; the Argus about a mile on
  // the lee of the Príncipe de Asturias, her post (annexes p. 269); the
  // Hermione and the Thémis to windward of the line, sent to reconnoitre by
  // Villeneuve's signal at 6.15 a.m. (annexes p. 243; Desbrière pp. 166,
  // 173-174). (frigatesInshore and the lines' stretch move the French with
  // a drawing that spreads the lines; the sources' estimate leaves them
  // here.)
  const frigates = [
    ["Euryalus", -6.33, 36.17],
    ["Naiad", -6.36, 36.14],
    ["Phoebe", -6.38, 36.12],
    ["Sirius", -6.34, 36.2],
    ["Pickle", -6.35, 36.1917],
    ["Entreprenante", -6.4483, 36.1267],
    ["Cornélie", -6.214, 36.106],
    ["Hermione", -6.287, 36.142],
    ["Hortense", -6.205, 36.168],
    ["Rhin", -6.18, 36.17],
    ["Thémis", -6.29, 36.112],
    ["Argus", -6.248, 36.098],
    ["Furet", -6.211, 36.155],
  ] as const;
  // The allied line's middle, north and south.
  const lineMiddle = worldY(36.1615);
  const along = (spread.mainStretch + spread.gravinaStretch) / 2;
  for (const [name, lon, lat] of frigates) {
    const s = [...BRITISH, ...COMBINED].find(
      (x) => x.name === name && x.group === "frigates",
    );
    if (!s) continue;
    // The French along the line as it is drawn, and inshore of it.
    const [flon, flat] =
      s.side === "combined"
        ? place(
            worldX(lon) + spread.frigatesInshore,
            lineMiddle + (worldY(lat) - lineMiddle) * along,
          )
        : [lon, lat];
    berths.set(s, {
      lon: flon,
      lat: flat,
      heading:
        s.name === "Pickle"
          ? 75
          : s.side === "british"
            ? 47
            : 186 + jitter(rng, 5),
    });
  }
  return berths;
}

/** A ship's key: her side and name (both fleets had a Neptune, an Achille and a Swiftsure). */
export function shipKey(ship: Ship): string {
  return `${ship.side}:${ship.name}`;
}

/** Both fleets at first light as the sources' estimate lays them out (session 9). */
export const DAWN_SOURCES: ReadonlyMap<Ship, Berth> =
  dawnBerths(SOURCES_SPREAD);

/** Metres over the ground per degree of latitude (and of longitude at the equator). */
const M_PER_DEG = 111_195;

/** Each ship moved from her place in `from` by `ease` (metres east and north over the ground). */
function easedBerths(
  from: ReadonlyMap<Ship, Berth>,
  ease: Readonly<Record<string, readonly [number, number]>>,
): Map<Ship, Berth> {
  const out = new Map<Ship, Berth>();
  for (const [ship, b] of from) {
    const [east, north] = ease[shipKey(ship)] ?? [0, 0];
    out.set(ship, {
      lon: b.lon + east / (M_PER_DEG * Math.cos((b.lat * Math.PI) / 180)),
      lat: b.lat + north / M_PER_DEG,
      heading: b.heading,
    });
  }
  return out;
}

/**
 * Development: a trial ease from the browser's storage (`road.dawnEase`,
 * JSON in DAWN_EASE's form; `{}` for the sources' places), for
 * scripts/dev/fleet-ease.mjs. Never in production.
 */
function trialEase(): Record<string, readonly [number, number]> | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined")
    return null;
  try {
    const raw = window.localStorage.getItem("road.dawnEase");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * The owner's licence of 10 November 2026, narrowed at his request on 11
 * November: each ship's shift from her place at the sources' spacing,
 * metres east and north over the ground (keys as shipKey). Found by
 * scripts/dev/fleet-ease.mjs for the last frame on the owner's screen,
 * where it is tightest: the least shifts that let every ship there stand at
 * her group's common size, 10 CSS px or more, clear of every other glyph,
 * as the glyph layout lays them out. The allied main body's line is spread
 * along itself in its order (an L∞ isotonic fit: the least largest shift
 * for the room its 21 ships need side by side on screen, the gap between
 * its divisions kept); then the few ships still crowded (in the British
 * bodies, Gravina's squadron and the frigates) are eased apart by a few
 * tens of metres. Ships not listed stand at their places. Each shift over
 * a kilometre and why: docs/decisions.md, "the fleets eased apart".
 */
const DAWN_EASE: Readonly<Record<string, readonly [number, number]>> = {
  "british:Neptune": [23, 5],
  "british:Conqueror": [-66, -15],
  "british:Minotaur": [-20, -4],
  "british:Tonnant": [-2, -8],
  "british:Bellerophon": [2, 8],
  "british:Swiftsure": [26, 6],
  "british:Thunderer": [-5, -54],
  "british:Defence": [4, 58],
  "british:Prince": [-22, -5],
  "combined:Bucentaure": [-39, -272],
  "combined:Santísima Trinidad": [16, -923],
  "combined:Formidable": [186, 1904],
  "combined:Neptune": [176, 1865],
  "combined:Indomptable": [122, 1492],
  "combined:Redoutable": [60, 1052],
  "combined:Fougueux": [45, 975],
  "combined:Pluton": [-23, 474],
  "combined:Mont-Blanc": [-81, -15],
  "combined:Intrépide": [-125, -261],
  "combined:Scipion": [-169, -576],
  "combined:Duguay-Trouin": [-548, -951],
  "combined:Héros": [-24, -1090],
  "combined:Santa Ana": [-55, -1195],
  "combined:Rayo": [-104, -1550],
  "combined:Neptuno": [-137, -1587],
  "combined:Monarca": [-167, -1728],
  "combined:San Agustín": [-170, -1689],
  "combined:San Francisco de Asís": [-195, -1813],
  "combined:San Justo": [-221, -1962],
  "combined:San Leandro": [-207, -2007],
  "combined:Príncipe de Asturias": [-13, -876],
  "combined:Algésiras": [-105, 32],
  "combined:Achille": [13, -297],
  "combined:Argonaute": [-8, 91],
  "combined:Berwick": [-8, 96],
  "combined:Aigle": [-101, 45],
  "combined:Swiftsure": [22, -170],
  "combined:Bahama": [27, -187],
  "combined:Montañés": [53, -326],
  "combined:Argonauta": [-55, 218],
  "combined:San Ildefonso": [-54, 334],
  "combined:Cornélie": [12, -683],
  "combined:Hermione": [-29, 176],
  "combined:Hortense": [-130, 810],
  "combined:Rhin": [-39, 326],
  "combined:Thémis": [-6, 107],
  "combined:Argus": [0, -221],
  "combined:Furet": [72, -285],
};

export const DAWN: ReadonlyMap<Ship, Berth> = easedBerths(
  DAWN_SOURCES,
  trialEase() ?? DAWN_EASE,
);

/** The great-circle distance between two places (degrees), metres. */
function groundMetres(a: Berth, b: Berth): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Development: how far each ship stands at dawn, as drawn, from where the
 * sources' estimate put her, km over the ground. (Session 16 measured
 * this in the chart's Mercator km, which run sec φ, about 1.24 times, the
 * ground's here.)
 */
export function dawnSpreadShift(): { name: string; km: number }[] {
  return [...DAWN].map(([ship, b]) => ({
    name: shipKey(ship),
    km: groundMetres(DAWN_SOURCES.get(ship) ?? b, b) / 1000,
  }));
}

/**
 * Development: both fleets at first light for scripts/dev/fleet-ease.mjs:
 * each ship's key, group, lead, size and heading, and her place at the
 * sources' spacing and as drawn (world km), in the fleets layer's mark
 * order (BRITISH, then COMBINED).
 */
export function dawnFleet(): {
  key: string;
  side: Side;
  group: Ship["group"];
  lead: boolean;
  size: number;
  heading: number;
  lat: number;
  sources: [number, number];
  drawn: [number, number];
}[] {
  return [...BRITISH, ...COMBINED].map((ship) => {
    const a = DAWN_SOURCES.get(ship);
    const b = DAWN.get(ship);
    if (!atDawn(ship))
      return {
        key: shipKey(ship),
        side: ship.side,
        group: ship.group,
        lead: false,
        size: ship.rig.size ?? 1,
        heading: 0,
        lat: 36,
        sources: [Number.NaN, Number.NaN],
        drawn: [Number.NaN, Number.NaN],
      };
    if (!a || !b) throw new Error(`no dawn berth for ${ship.name}`);
    return {
      key: shipKey(ship),
      side: ship.side,
      group: ship.group,
      lead: Boolean(ship.lead),
      size: ship.rig.size ?? 1,
      heading: b.heading,
      lat: a.lat,
      sources: [worldX(a.lon), worldY(a.lat)],
      drawn: [worldX(b.lon), worldY(b.lat)],
    };
  });
}

/**
 * The combined fleet at anchor off Cádiz, 10–19 October: out of range of
 * the city's guns, moored with springs, heads to the north-west (about
 * 294° true): the main body in three lines strung WNW–ESE in the outer bay
 * north-east of the entrance shoals (36°33.4′–34.1′ N, 6°15.5′–17.2′ W),
 * the seven that got out on the 19th at its WNW end toward the passes, and
 * the Fougueux at the outer end of the narrows between the Puntal and
 * Matagorda forts, the one ship any source places there, until she warped
 * out to a berth abreast of the city at 5.30 p.m. on the 19th (her
 * reports, Desbrière 1907, annexes pp. 213, 216; a-h2c.md, H2-36c–e;
 * history notes, "Positions on the chart"). The Thémis lay at the head of
 * the anchorage with the outermost ships (annexes p. 273), and the
 * Hermione and Rhin, which weighed first that morning, with them; the
 * Cornélie and Hortense inside the lines; the brigs, the admirals'
 * repeaters, each by her admiral's flagship: the Furet and the
 * Observateur by the Bucentaure, the Argus by the Príncipe de Asturias
 * (no source gives their berths; research note
 * scene-02/session-17/anchorage-19oct.md).
 *
 * The owner's licence of 10 November 2026: the lines and the frigates
 * inside them are drawn ANCHORAGE_SPREAD times as far from the
 * anchorage's middle, so the harbour's close view (beat 4) shows every
 * ship; at the sources' spacing its glyphs stood closer than their width
 * and all but three were hidden. The narrows' ships stay where they were.
 */
const ANCHORAGE_SPREAD = 1.2;
const ANCHORAGE_MIDDLE = [-6.2726, 36.5636] as const;

function anchorage(spread: number): Map<Ship, Berth> {
  const berths = new Map<Ship, Berth>();
  const rng = createRng(1019);
  const heading = 294;
  const sortie = [
    "Algésiras",
    "Achille",
    "Argonaute",
    "Neptune",
    "Héros",
    "Duguay-Trouin",
    "Bahama",
  ];
  const narrows = ["Fougueux"];
  const ofLine = COMBINED.filter((s) => s.group !== "frigates");
  const first = ofLine.filter((s) => sortie.includes(s.name));
  const inner = ofLine.filter((s) => narrows.includes(s.name));
  const rest = ofLine.filter(
    (s) => !sortie.includes(s.name) && !narrows.includes(s.name),
  );
  // Lines run WNW–ESE (about 112°), spaced about 0.15 nm apart.
  const rows = [
    { from: [-6.2867, 36.5617], to: [-6.2595, 36.5585] },
    { from: [-6.2835, 36.5655], to: [-6.2585, 36.5622] },
    { from: [-6.2805, 36.5688], to: [-6.2605, 36.566] },
  ] as const;
  // Opened about the anchorage's middle (ANCHORAGE_SPREAD).
  const [mx, my] = ANCHORAGE_MIDDLE;
  const open = (lon: number, lat: number) => ({
    lon: mx + (lon - mx) * spread,
    lat: my + (lat - my) * spread,
  });
  // The sortie's seven at the WNW ends of the rows, the rest after them.
  const queue = [...first, ...rest];
  const perRow = Math.ceil(queue.length / rows.length);
  // The Argonaute, at the head of the outer row, stood beside the
  // Santísima Trinidad of the next row on screen in the harbour's view and
  // was drawn at half size there: a cable further toward the passes.
  const NUDGE: Record<string, readonly [number, number]> = {
    Argonaute: [-0.0012, 0.0003],
  };
  queue.forEach((s, i) => {
    const r = rows[i % rows.length];
    const k = Math.floor(i / rows.length);
    const u = perRow > 1 ? k / (perRow - 1) : 0;
    const [nx, ny] = NUDGE[s.name] ?? [0, 0];
    berths.set(s, {
      ...open(
        r.from[0] + (r.to[0] - r.from[0]) * u + jitter(rng, 0.0006) + nx,
        r.from[1] + (r.to[1] - r.from[1]) * u + jitter(rng, 0.0004) + ny,
      ),
      heading: heading + jitter(rng, 3),
    });
  });
  inner.forEach((s, i) => {
    berths.set(s, {
      lon: -6.2535 + i * 0.0035,
      lat: 36.5165 - i * 0.002,
      heading: heading + jitter(rng, 3),
    });
  });
  // The frigates: the Thémis, Hermione and Rhin at the head (the lines'
  // WNW ends), the Cornélie and Hortense inside the lines as before.
  const HEAD: Record<string, readonly [number, number]> = {
    Thémis: [-6.286, 36.5585],
    Rhin: [-6.2855, 36.564],
    Hermione: [-6.283, 36.5675],
  };
  const frigates = COMBINED.filter(
    (s) => s.group === "frigates" && s.rig === RIGS.frenchFrigate,
  );
  let inside = 0;
  for (const s of frigates) {
    const head = HEAD[s.name];
    const jx = jitter(rng, 0.0004);
    berths.set(s, {
      ...(head
        ? open(head[0], head[1])
        : open(-6.272 + inside++ * 0.0035 * 2.5, 36.5555 + jx)),
      heading: heading + jitter(rng, 3),
    });
  }
  // The brigs by their admirals' flagships, on the bay's side of them.
  const BY: Record<string, readonly [string, number, number]> = {
    Furet: ["Bucentaure", 0.0012, -0.0016],
    Observateur: ["Bucentaure", -0.0014, -0.0017],
    Argus: ["Príncipe de Asturias", 0.0012, -0.0016],
  };
  for (const s of COMBINED) {
    const by = BY[s.name];
    if (!by) continue;
    const flagship = COMBINED.find((x) => x.name === by[0]);
    const f = flagship && berths.get(flagship);
    if (!f) continue;
    berths.set(s, {
      lon: f.lon + by[1],
      lat: f.lat + by[2],
      heading: heading + jitter(rng, 3),
    });
  }
  return berths;
}

export const ANCHORAGE: ReadonlyMap<Ship, Berth> = anchorage(ANCHORAGE_SPREAD);

/**
 * Development: how far each ship at anchor stands, as drawn
 * (ANCHORAGE_SPREAD), from her berth at the sources' spacing, km.
 */
export function anchorageSpreadShift(): { name: string; km: number }[] {
  const sources = anchorage(1);
  return [...ANCHORAGE].map(([ship, b]) => ({
    name: shipKey(ship),
    km: groundMetres(sources.get(ship) ?? b, b) / 1000,
  }));
}

/**
 * Stage A's proof, kept for the lab: the fleets at dawn on 21 October (now
 * at their true spacing) and the combined fleet at anchor off Cádiz, both
 * at once.
 */
export const LAB_MARKS: readonly ShipMark[] = [
  ...[...DAWN].map(([ship, b]) => ({
    type: ship.rig.sail,
    side: ship.side,
    lon: b.lon,
    lat: b.lat,
    heading: b.heading,
    underWay: true,
    size: ship.rig.size,
  })),
  ...[...ANCHORAGE].map(([ship, b]) => ({
    type: ship.rig.anchor ?? ship.rig.sail,
    side: ship.side,
    lon: b.lon,
    lat: b.lat,
    heading: b.heading,
    underWay: false,
    size: ship.rig.size,
  })),
];

/**
 * Villeneuve's squadron sailing at the drawing head of the Toulon–Cádiz
 * route, laid out as a squadron's symbol (glyphs/layout.ts).
 */
export const ROUTE_SQUADRON: readonly ShipMark[] = [
  {
    type: "french-80",
    side: "combined",
    lon: 0,
    lat: 0,
    heading: 0,
    underWay: true,
    opacity: 0,
  },
  {
    type: "french-74",
    side: "combined",
    lon: 0,
    lat: 0,
    heading: 0,
    underWay: true,
    opacity: 0,
  },
  {
    type: "french-74",
    side: "combined",
    lon: 0,
    lat: 0,
    heading: 0,
    underWay: true,
    opacity: 0,
  },
];

/**
 * The ships of the line with the fleet off Cádiz in the weeks before the
 * battle that were not at Trafalgar, each until the day she left it
 * (history-notes.md, "Scene 2: the strengths lettered at the tracks'
 * heads"; research/scene-02/session-21/strengths-by-date.md): Louis's five
 * for Gibraltar and Tetuan on the evening of 2 October, the Prince of
 * Wales home with Calder on the evening of the 13th, the Donegal to
 * Gibraltar on the 17th. Counted in the fleet's strength while with it,
 * not drawn: the fleets' ships come in only where every one of them reads
 * one by one (glyphs/layout.ts, FreeGroup.gate), which off Cádiz is only
 * once all of these have gone (scripts/dev/fleet-gates.mjs shows each
 * side's gate, label and drawn ships over the scene).
 */
export const NOT_AT_TRAFALGAR: readonly {
  name: string;
  side: Side;
  until: number;
}[] = [
  { name: "Queen", side: "british", until: day(10, 2, 18) },
  { name: "Canopus", side: "british", until: day(10, 2, 18) },
  { name: "Spencer", side: "british", until: day(10, 2, 18) },
  { name: "Tigre", side: "british", until: day(10, 2, 18) },
  { name: "Zealous", side: "british", until: day(10, 2, 18) },
  { name: "Prince of Wales", side: "british", until: day(10, 13, 18) },
  { name: "Donegal", side: "british", until: day(10, 17, 15) },
];

/**
 * A fleet's strength on a day as lettered beside it on the far views
 * (HeadLabels): its ships of the line with it then, the unit in which the
 * dispatches gave a fleet's strength (withFleet; NOT_AT_TRAFALGAR); frigates
 * and the small craft are not counted, nor a ship left at anchor or gone.
 * By date, as the owner ruled on 12 November 2026: 29 on Nelson's arrival,
 * 23 by 5 October, then 24, 26, 27, 28 and 27 from the 17th; the combined
 * fleet 32 ready in Cádiz on 28 September, 33 with the Santa Ana.
 */
export function lineStrength(side: Side, d: number): number {
  let n = 0;
  for (const ship of side === "british" ? BRITISH : COMBINED)
    if (LINE_RIGS.has(ship.rig) && withFleet(ship, d)) n++;
  for (const ship of NOT_AT_TRAFALGAR)
    if (ship.side === side && d < ship.until) n++;
  return n;
}

/** Every day a fleet's ships of the line come or go (Ship.joins, away; NOT_AT_TRAFALGAR), sorted. */
export function strengthDays(side: Side): number[] {
  const days = new Set<number>();
  for (const ship of side === "british" ? BRITISH : COMBINED) {
    if (!LINE_RIGS.has(ship.rig)) continue;
    if (ship.joins !== undefined) days.add(ship.joins);
    if (ship.away) for (const d of ship.away) days.add(d);
  }
  for (const ship of NOT_AT_TRAFALGAR)
    if (ship.side === side) days.add(ship.until);
  return [...days].sort((a, b) => a - b);
}
