import type { Vec } from "../geometry/vec";

/**
 * The invasion flotilla's craft at hero size: a prame, a chaloupe
 * canonnière, a bateau canonnier and a péniche at anchor in Boulogne's
 * roads, August 1805.
 *
 * Units and axes as the ships of the line's and smallcraft.ts's: metres,
 * starboard elevation, bow to the right; x from the sternpost at the load
 * waterline toward the bow, y up from the waterline. The path builder
 * writes SVG's y down, one unit one metre.
 *
 * The numbers the chart's glyphs are drawn from (smallcraft.ts: the hull's
 * length, rails and rakes, the masts' places, rakes and heights, the yards,
 * the bowsprits, booms and gaffs) are copied here unchanged, so a painted
 * craft and its glyph agree; scripts/dev/craft-bounds.mjs checks them.
 */

export type CraftType = "prame" | "chaloupe" | "bateau" | "peniche";

/** "evening": a low sun behind the viewer, a little to his left; "neutral": soft daylight from above. */
export type CraftLighting = "neutral" | "evening";

/** "hero": the full drawing; "reflection": dark simplified shapes, cut at the waterline. */
export type CraftVariant = "hero" | "reflection";

/** A line along the side that follows the sheer: its drop below the rail at the low point, and how much of the rail's rise it keeps. */
export interface SheerBand {
  drop: number;
  height: number;
  /** 1: parallel to the rail; less: flatter toward the ends, as a wale low on the side runs. */
  sheer: number;
}

export interface PortSpec {
  /** Port centres, x. */
  xs: readonly number[];
  /** Sill above the deck, width and height. */
  sill: number;
  width: number;
  height: number;
  /** A gun run out in each: the diameter of its muzzle's face. */
  muzzle: number;
}

export interface RudderSpec {
  /** Width of the blade aft of the post at the waterline and at the head. */
  width: number;
  headWidth: number;
  /** Height of the rudder's head above the waterline. */
  head: number;
  /** An outboard rudder's tiller, reaching forward over the stern: length and rise. */
  tiller?: { length: number; rise: number };
}

export interface CraftHullSpec {
  /** Waterline length, sternpost (x = 0) to stem. */
  length: number;
  /** Height of the top of the side at the stern, its lowest point and the bow. */
  rail: readonly [number, number, number];
  /** x of the sheer's lowest point. */
  lowX: number;
  /** How far the stern's top stands aft of x = 0, and the stem's forward of the waterline's end. */
  sternRake: number;
  stemRake: number;
  /** A double-ended hull, its sternpost curved as the stem is. */
  pointed?: boolean;
  /** An open boat: no deck, the side's inside seen over the gunwale. */
  open?: boolean;
  /** The deck (an open boat's floor) at the low point; it keeps the sheer. */
  deck: number;
  /** Draught, toward which the planking flattens. */
  draught: number;
  /** How far below the waterline the drawing reaches (the sea covers it). */
  depthShown: number;
  /** Width of a strake, and the length of a plank, for the seams and butts. */
  strake: number;
  plankLength: number;
  /** Depth of the rail cap (an open boat's gunwale). */
  railCap: number;
  wales: readonly SheerBand[];
  /** A painted strake. */
  band?: SheerBand;
  ports?: PortSpec;
  /** Scuppers along the deck, x. */
  scuppers?: readonly number[];
  rudder: RudderSpec;
  /** Height of the stem's head above the rail at the bow (a stem post standing proud). */
  stemHead?: number;
}

export interface YardSpec {
  /** Height of the yard's centre and its length, as smallcraft.ts. */
  y: number;
  length: number;
  /** A square sail furled on it; a bare yard (the crossjack) when false. */
  furled: boolean;
}

export interface MastSpec {
  id: string;
  /** Where the mast stands at the deck, and its rake aft of vertical, degrees. */
  x: number;
  rake: number;
  deck: number;
  /** The top's platform and the lower masthead; a pole mast has neither. */
  top?: number;
  head?: number;
  topmastHead?: number;
  truck: number;
  /** Diameters: the lower mast, the topmast, the topgallant pole. */
  d: readonly [number, number, number];
  /** Fore-and-aft width of the top. */
  topWidth?: number;
  yards?: readonly YardSpec[];
  /** Lower shrouds' feet, x from the mast, and the height they reach. */
  shrouds: readonly number[];
  shroudHead: number;
  /** Channels, deadeyes and chain plates (else the shrouds set up at the gunwale). */
  channel: boolean;
  ratlines: boolean;
  /** A backstay from the topmast head to the side, this far aft of the mast. */
  backstay?: number;
}

/** A point on the rig, for stays and running gear. */
export type RigPoint =
  | { mast: string; on: "lower" | "topmast" | "pole"; y: number }
  | { bowsprit: number }
  | { at: "cap" | "jibBoomEnd" | "runningBowspritEnd" }
  | { rail: number }
  | { point: Vec };

export interface StaySpec {
  from: RigPoint;
  to: RigPoint;
  heavy: boolean;
}

export interface BowspritSpec {
  /** The heel at the stem head, the steeve (degrees), the length outboard to the cap and inboard. */
  heel: Vec;
  angle: number;
  length: number;
  inboard: number;
  d: readonly [number, number];
  jibBoom: {
    /** How far back from the cap it starts, how far above the bowsprit's axis, and its length. */
    overlap: number;
    lift: number;
    length: number;
    d: readonly [number, number];
  };
  /** Martingale (dolphin striker) under the cap. */
  martingale: number;
}

/** A spar from one point to another: a lugger's running bowsprit, her bumkin. */
export interface PlainSpar {
  from: Vec;
  to: Vec;
  d: readonly [number, number];
}

export interface GaffSpec {
  mast: string;
  /** Throat height, length, peak angle above horizontal and the ease toward the viewer, degrees. */
  throat: number;
  length: number;
  angle: number;
  ease: number;
  d: readonly [number, number];
  boom: {
    at: number;
    length: number;
    rise: number;
    d: readonly [number, number];
  };
}

/** A lug yard lowered with its sail rolled on it, lying fore and aft. */
export interface LugSpec {
  mast: string;
  length: number;
  d: number;
  /** Where it lies: the x of its after end, the height of its axis there and at the fore end. */
  aftX: number;
  aftY: number;
  foreY: number;
  /** Thickness of the canvas rolled on it. */
  roll: number;
}

export interface GunSpec {
  /** The breech's x and the bore's height, the barrel's length, the muzzle's diameter; pointing to the bow (1) or the stern (-1). */
  x: number;
  y: number;
  length: number;
  bore: number;
  dir: 1 | -1;
  /** A howitzer is short and fat. */
  kind: "long" | "howitzer";
}

export interface AnchorSpec {
  /** Where the cable leaves the hull: a hawse, or a chock at the stem head. */
  hawse: Vec;
  hawseHole: boolean;
  /** The cable's diameter and its angle below horizontal at the hawse, degrees. */
  cable: number;
  angle: number;
  /** A second anchor catted at the bow: the cathead's end, the shank's length. */
  catted?: { at: Vec; length: number };
}

export interface OarSpec {
  /** Thole pins: the first and last pair's x, and how many pairs. */
  from: number;
  to: number;
  pairs: number;
  /** Oars laid in fore and aft on the thwarts: how many show over the gunwale, their length. */
  shown: number;
  length: number;
}

/** A boat lying astern on her painter. */
export interface BoatSpec {
  length: number;
  /** Gunwale height above the water, amidships. */
  height: number;
  /** Gap between her stem and the craft's stern. */
  gap: number;
}

export interface EnsignSpec {
  /** On an ensign staff at the stern, at the gaff's peak, or at a masthead. */
  at: "staff" | "peak" | "masthead";
  /** The mast, for "masthead". */
  mast?: string;
  /** The staff's foot, height and rake aft (degrees). */
  staff?: { foot: Vec; height: number; rake: number; d: number };
  fly: number;
  hoist: number;
}

export interface PennantSpec {
  mast: string;
  length: number;
  hoist: number;
}

/**
 * Materials as their colour in white light (sRGB). The lighting turns each
 * into a lit tone and a shade tone; see light.ts.
 */
export interface CraftPaint {
  /** The topsides. */
  hull: string;
  /** Wales, if not the hull's colour. */
  wale?: string;
  /** The painted strake. */
  band?: string;
  /** The rail cap or gunwale. */
  rail: string;
  /** The bottom, below the boot-top. */
  bottom: string;
  /** Lower masts, topmasts and poles. */
  mast: string;
  /** Yards, tops, caps, mastheads, gaffs and booms. */
  spar: string;
  canvas: string;
  /** Standing and running rigging. */
  rope: string;
  running: string;
  iron: string;
  /** Inside the bulwarks, as seen through a port or over an open boat's gunwale. */
  inside: string;
}

export interface CraftSpec {
  /** Unique: the geometry cache's key with the seed. */
  id: string;
  type: CraftType;
  name: string;
  seed: number;
  rig: "ship" | "brig" | "lugger";
  hull: CraftHullSpec;
  masts: readonly MastSpec[];
  stays: readonly StaySpec[];
  bowsprit?: BowspritSpec;
  runningBowsprit?: PlainSpar;
  bumkin?: PlainSpar;
  gaff?: GaffSpec;
  lugs?: readonly LugSpec[];
  /** Stowed headsails: rolled on the jib-boom and the bowsprit. */
  stowedHeadsails?: boolean;
  guns: readonly GunSpec[];
  anchor: AnchorSpec;
  oars?: OarSpec;
  boat?: BoatSpec;
  /** A galley chimney on deck: x and height above the deck. */
  chimney?: { x: number; height: number };
  ensign: EnsignSpec;
  pennant?: PennantSpec;
  paint: CraftPaint;
}
