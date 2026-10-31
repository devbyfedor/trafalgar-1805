import type { GlyphType, ShipMark } from "@/components/chart/glyphs/Glyphs";
import { type DeriveOptions, deriveSpec } from "@/components/ship/specs/derive";
import {
  BRITISH_74,
  BRITISH_98,
  ENEMY_TYPES,
} from "@/components/ship/specs/fleet-1805";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";

/**
 * The ships on the chart: their glyph types and where they stand. Sources
 * and doubts: docs/history-notes.md, "Scene 2".
 */

/** A type of scene 1's enemy line, at anchor (no sail set). */
function anchored(id: string, o: Omit<DeriveOptions, "id" | "sailSet">) {
  return {
    id,
    spec: deriveSpec(VICTORY_1805, { ...o, id, sailSet: "furled" }),
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
  anchored("santisima-trinidad-anchored", {
    name: "Santísima Trinidad at anchor",
    nation: "spain",
    guns: 136,
    decks: 4,
    scale: 1.06,
    seed: 2236,
  }),
];

/**
 * How much of the chart a glyph at anchor may stand on, km: in the outer
 * bay of Cádiz, between the entrance shoals and the shore of El Puerto,
 * and in the narrows between Puntal and Matagorda. Seen from farther off,
 * the anchored ships shrink with the bay, so they stay on its water.
 */
const ROOM_OUTER_BAY = 3.6;
const ROOM_NARROWS = 1.5;

/**
 * Stage A's proof: the fleets near Cape Trafalgar at dawn on 21 October
 * (the British in loose order about 20 nautical miles west of the cape,
 * the combined fleet in its ragged line between them and the coast,
 * heading south), and the combined fleet at anchor off Cádiz as it lay
 * before the sortie. The lab shows both moments at once; Stage B gives
 * each its beat. Spacing within each group is opened up a few times over
 * the true cables, as the glyphs are, so the ships read one by one.
 */
export const LAB_MARKS: readonly ShipMark[] = [
  // The British, some 20 nm west of Cape Trafalgar, still in loose order
  // (the columns formed over the next two hours) in two groups strung
  // north and south, Victory's and Collingwood's, on the course they
  // steered from bearing up for the enemy at about 6.45: ENE by compass,
  // about 047° true (history notes, "Scene 2"; scene 1, "The setting").
  {
    type: "victory",
    side: "british",
    lon: -6.467,
    lat: 36.133,
    heading: 47,
    underWay: true,
  },
  {
    type: "british-98",
    side: "british",
    lon: -6.5,
    lat: 36.172,
    heading: 47,
    underWay: true,
  },
  {
    type: "british-98",
    side: "british",
    lon: -6.438,
    lat: 36.19,
    heading: 47,
    underWay: true,
  },
  {
    type: "british-74",
    side: "british",
    lon: -6.522,
    lat: 36.104,
    heading: 47,
    underWay: true,
  },
  {
    type: "british-98",
    side: "british",
    lon: -6.475,
    lat: 36.035,
    heading: 47,
    underWay: true,
  },
  {
    type: "british-74",
    side: "british",
    lon: -6.418,
    lat: 36.008,
    heading: 47,
    underWay: true,
  },
  // The combined fleet, its centre 9–12 nm east of Victory, in a ragged
  // line strung north to south, standing south on the starboard tack
  // (180–195° true) under easy sail.
  {
    type: "french-74",
    side: "combined",
    lon: -6.25,
    lat: 36.27,
    heading: 186,
    underWay: true,
  },
  {
    type: "spanish-112",
    side: "combined",
    lon: -6.22,
    lat: 36.21,
    heading: 190,
    underWay: true,
  },
  {
    type: "french-80",
    side: "combined",
    lon: -6.24,
    lat: 36.16,
    heading: 183,
    underWay: true,
  },
  {
    type: "santisima-trinidad",
    side: "combined",
    lon: -6.21,
    lat: 36.11,
    heading: 188,
    underWay: true,
  },
  {
    type: "spanish-74",
    side: "combined",
    lon: -6.23,
    lat: 36.05,
    heading: 192,
    underWay: true,
  },
  {
    type: "french-74",
    side: "combined",
    lon: -6.2,
    lat: 36,
    heading: 185,
    underWay: true,
  },
  // At anchor off Cádiz, out of range of the city's guns: a line strung
  // WNW–ESE in the outer bay north-east of the entrance shoals (Las Puercas,
  // El Diamante), the outermost ship toward the entrance roads, and one
  // still in the narrows between Puntal and Matagorda. Moored with anchors
  // to the SE and NW by compass, heads to the NW, about 294° true
  // (a-h2c.md, H2-36c–e, H2-40b).
  {
    type: "french-80-anchored",
    side: "combined",
    lon: -6.2867,
    lat: 36.5617,
    heading: 294,
    underWay: false,
    room: ROOM_OUTER_BAY,
  },
  {
    type: "french-74-anchored",
    side: "combined",
    lon: -6.284,
    lat: 36.5665,
    heading: 294,
    underWay: false,
    room: ROOM_OUTER_BAY,
  },
  {
    type: "santisima-trinidad-anchored",
    side: "combined",
    lon: -6.2765,
    lat: 36.5645,
    heading: 294,
    underWay: false,
    room: ROOM_OUTER_BAY,
  },
  {
    type: "spanish-74-anchored",
    side: "combined",
    lon: -6.2685,
    lat: 36.562,
    heading: 294,
    underWay: false,
    room: ROOM_OUTER_BAY,
  },
  {
    type: "french-74-anchored",
    side: "combined",
    lon: -6.2605,
    lat: 36.5598,
    heading: 294,
    underWay: false,
    room: ROOM_OUTER_BAY,
  },
  {
    type: "french-74-anchored",
    side: "combined",
    lon: -6.2488,
    lat: 36.5178,
    heading: 294,
    underWay: false,
    room: ROOM_NARROWS,
  },
];

/** Villeneuve's squadron sailing at the drawing head of the Toulon–Cádiz route. */
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
