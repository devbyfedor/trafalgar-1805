import {
  latOfWorldY,
  lonOfWorldX,
  worldX,
  worldY,
} from "@/components/chart/geo/mercator";
import type { GlyphType, ShipMark } from "@/components/chart/glyphs/Glyphs";
import { type DeriveOptions, deriveSpec } from "@/components/ship/specs/derive";
import {
  BRITISH_74,
  BRITISH_98,
  ENEMY_TYPES,
} from "@/components/ship/specs/fleet-1805";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";
import { createRng, jitter } from "@/lib/random";

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
}

/**
 * The British fleet at Trafalgar: 27 of the line (3 of 100 guns, 4 of 98,
 * 1 of 80, 16 of 74, 3 of 64) and four frigates (Nicolas VII 130). The
 * groups are the columns they formed in the morning; at dawn they lay in
 * loose order in two bodies strung north and south (history notes).
 */
export const BRITISH: readonly Ship[] = [
  ["Victory", RIGS.victory, "nelson", true],
  ["Téméraire", RIGS.british98, "nelson"],
  ["Neptune", RIGS.british98, "nelson"],
  ["Leviathan", RIGS.british74, "nelson"],
  ["Britannia", RIGS.firstRate, "nelson"],
  ["Conqueror", RIGS.british74, "nelson"],
  ["Agamemnon", RIGS.british64, "nelson"],
  ["Ajax", RIGS.british74, "nelson"],
  ["Orion", RIGS.british74, "nelson"],
  ["Minotaur", RIGS.british74, "nelson"],
  ["Spartiate", RIGS.british74, "nelson"],
  ["Africa", RIGS.british64, "nelson"],
  ["Royal Sovereign", RIGS.firstRate, "collingwood", true],
  ["Belleisle", RIGS.british74, "collingwood"],
  ["Mars", RIGS.british74, "collingwood"],
  ["Tonnant", RIGS.british80, "collingwood"],
  ["Bellerophon", RIGS.british74, "collingwood"],
  ["Colossus", RIGS.british74, "collingwood"],
  ["Achille", RIGS.british74, "collingwood"],
  ["Dreadnought", RIGS.british98, "collingwood"],
  ["Polyphemus", RIGS.british64, "collingwood"],
  ["Revenge", RIGS.british74, "collingwood"],
  ["Swiftsure", RIGS.british74, "collingwood"],
  ["Defiance", RIGS.british74, "collingwood"],
  ["Thunderer", RIGS.british74, "collingwood"],
  ["Defence", RIGS.british74, "collingwood"],
  ["Prince", RIGS.british98, "collingwood"],
  ["Euryalus", RIGS.britishFrigate, "frigates"],
  ["Naiad", RIGS.britishFrigate, "frigates"],
  ["Phoebe", RIGS.britishFrigate, "frigates"],
  ["Sirius", RIGS.britishFrigate, "frigates"],
].map(([name, rig, group, lead]) => ({
  name,
  side: "british",
  rig,
  group,
  lead: Boolean(lead),
})) as Ship[];

/**
 * The combined fleet: 33 of the line, 18 French (4 of 80, 14 of 74) and 15
 * Spanish (the Santísima Trinidad, two of 112, the Rayo of 100, two of 80,
 * eight of 74 and the San Leandro of 64), with five French frigates
 * (Collingwood's dispatch; James III 386). Gravina's squadron of
 * observation, twelve ships, lay to windward of the van at dawn.
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
  ["Santa Ana", RIGS.spanish112, "main"],
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
].map(([name, rig, group, lead]) => ({
  name,
  side: "combined",
  rig,
  group,
  lead: Boolean(lead),
})) as Ship[];

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
 * A ragged line: `count` ships from `from` to `to` (degrees), in uneven
 * steps with a gap where `breakAt` (0..1 along it) splits it into two
 * divisions, each ship off the line by up to `wander` km.
 */
function raggedLine(
  count: number,
  from: readonly [number, number],
  to: readonly [number, number],
  wander: number,
  breakAt: number,
  seed: number,
): [number, number][] {
  const rng = createRng(seed);
  const x0 = worldX(from[0]);
  const y0 = worldY(from[1]);
  const x1 = worldX(to[0]);
  const y1 = worldY(to[1]);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  // Uneven steps along the line, with a wider gap between the divisions.
  const steps: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const u = (i + 0.5) / (count - 1);
    const gap = Math.abs(u - breakAt) < 0.5 / (count - 1) ? 3.2 : 1;
    steps.push(gap * (0.55 + rng() * 0.9));
  }
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
function dawnBerths(): Map<Ship, Berth> {
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
  set(
    nelsonBody,
    strew(
      nelsonBody.length,
      [VICTORY_AT_DAWN.lon, VICTORY_AT_DAWN.lat],
      3.6,
      2.6,
      140,
      0.9,
      11,
      true,
    ),
    47,
  );
  if (africa) berths.set(africa, { lon: -6.5, lat: 36.35, heading: 47 });
  const collingwood = BRITISH.filter((s) => s.group === "collingwood");
  set(
    collingwood,
    strew(collingwood.length, [-6.452, 36.075], 3.8, 2.8, 150, 0.9, 12, true),
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
    0.55,
    0.45,
    13,
  );
  order.forEach((s, i) => {
    const [lon, lat] = line[i];
    berths.set(s, { lon, lat, heading: 186 + jitter(rng, 6) });
  });
  const gravina = COMBINED.filter((s) => s.group === "gravina");
  const squadron = raggedLine(
    gravina.length,
    [-6.262, 36.16],
    [-6.268, 36.098],
    0.7,
    2,
    14,
  );
  gravina.forEach((s, i) => {
    const [lon, lat] = squadron[i];
    berths.set(s, { lon, lat, heading: 188 + jitter(rng, 6) });
  });
  // Frigates: the British between the fleets, the French inshore of theirs.
  const frigates = [
    ["Euryalus", -6.33, 36.17],
    ["Naiad", -6.36, 36.14],
    ["Phoebe", -6.38, 36.12],
    ["Sirius", -6.34, 36.2],
    ["Cornélie", -6.19, 36.19],
    ["Hermione", -6.19, 36.15],
    ["Hortense", -6.2, 36.12],
    ["Rhin", -6.18, 36.17],
    ["Thémis", -6.2, 36.1],
  ] as const;
  for (const [name, lon, lat] of frigates) {
    const s = [...BRITISH, ...COMBINED].find(
      (x) => x.name === name && x.group === "frigates",
    );
    if (s) {
      berths.set(s, {
        lon,
        lat,
        heading: s.side === "british" ? 47 : 186 + jitter(rng, 5),
      });
    }
  }
  return berths;
}

export const DAWN: ReadonlyMap<Ship, Berth> = dawnBerths();

/**
 * Each ship's spacing at dawn (ShipMark.spacing): her distance from the
 * nearest ship of her group that lies nearer the group's lead, map km, so
 * seen from farther off a group closes in on its lead from the outside.
 */
export function dawnSpacing(ship: Ship): number {
  if (ship.lead || ship.group === "frigates") return 0;
  const group = [...BRITISH, ...COMBINED].filter(
    (s) => s.group === ship.group && s.side === ship.side,
  );
  const lead = group.find((s) => s.lead);
  const at = DAWN.get(ship);
  const leadAt = lead ? DAWN.get(lead) : undefined;
  if (!at || !leadAt) return 0;
  const d = (b: Berth, c: Berth) =>
    Math.hypot(worldX(b.lon) - worldX(c.lon), worldY(b.lat) - worldY(c.lat));
  const own = d(at, leadAt);
  let best = own;
  for (const other of group) {
    const o = DAWN.get(other);
    if (!o || other === ship) continue;
    if (d(o, leadAt) < own) best = Math.min(best, d(at, o));
  }
  return best;
}

/**
 * The combined fleet at anchor off Cádiz, 10–19 October: out of range of
 * the city's guns, moored with springs, heads to the north-west (about
 * 294° true): the main body in three lines strung WNW–ESE in the outer bay
 * north-east of the entrance shoals (36°33.4′–34.1′ N, 6°15.5′–17.2′ W),
 * the seven that got out on the 19th at its WNW end toward the passes, and
 * a few ships (the Fougueux among them) at the outer end of the narrows
 * between the Puntal and Matagorda forts (a-h2c.md, H2-36c–e; history
 * notes, "Positions on the chart"). The frigates lie inside the lines.
 */
function anchorage(): Map<Ship, Berth> {
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
  const narrows = ["Fougueux", "San Justo"];
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
  // The sortie's seven at the WNW ends of the rows, the rest after them.
  const queue = [...first, ...rest];
  const perRow = Math.ceil(queue.length / rows.length);
  queue.forEach((s, i) => {
    const r = rows[i % rows.length];
    const k = Math.floor(i / rows.length);
    const u = perRow > 1 ? k / (perRow - 1) : 0;
    berths.set(s, {
      lon: r.from[0] + (r.to[0] - r.from[0]) * u + jitter(rng, 0.0006),
      lat: r.from[1] + (r.to[1] - r.from[1]) * u + jitter(rng, 0.0004),
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
  const frigates = COMBINED.filter((s) => s.group === "frigates");
  frigates.forEach((s, i) => {
    berths.set(s, {
      lon: -6.272 + i * 0.0035,
      lat: 36.5555 + jitter(rng, 0.0004),
      heading: heading + jitter(rng, 3),
    });
  });
  return berths;
}

export const ANCHORAGE: ReadonlyMap<Ship, Berth> = anchorage();

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
    room: "coast" as const,
    spacing: dawnSpacing(ship) || undefined,
  })),
  ...[...ANCHORAGE].map(([ship, b]) => ({
    type: ship.rig.anchor ?? ship.rig.sail,
    side: ship.side,
    lon: b.lon,
    lat: b.lat,
    heading: b.heading,
    underWay: false,
    size: ship.rig.size,
    // The open water beyond the line toward El Puerto, about 4 km
    // (decisions.md, "No glyph stands on the shore").
    room: b.lat < 36.53 ? 4.1 : 4.2,
  })),
];

/**
 * Villeneuve's squadron sailing at the drawing head of the Toulon–Cádiz
 * route. Each ship's room is the water round her where she is, so passing
 * the Strait seen from far off the squadron draws small rather than on the
 * shore.
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
    room: "coast",
  },
  {
    type: "french-74",
    side: "combined",
    lon: 0,
    lat: 0,
    heading: 0,
    underWay: true,
    opacity: 0,
    room: "coast",
  },
  {
    type: "french-74",
    side: "combined",
    lon: 0,
    lat: 0,
    heading: 0,
    underWay: true,
    opacity: 0,
    room: "coast",
  },
];
