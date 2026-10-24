/**
 * Data model for a ship of the line, seen in starboard elevation.
 *
 * Units: metres. Ship space puts x = 0 at the aft perpendicular (where the
 * sternpost meets the load waterline), x grows toward the bow, and y = 0 is
 * the load waterline with y growing upward. Geometry functions turn a spec
 * into SVG path data; the React component only renders it.
 *
 * Shaped for all sixty ships at Trafalgar (two-, three- and four-deckers,
 * British, French and Spanish). Scene 1 fills in Victory and the generic
 * silhouettes only.
 */

export type Nation = "britain" | "france" | "spain";
export type MastId = "fore" | "main" | "mizzen";
export type Detail = "hero" | "silhouette";

/**
 * Lighting variants the component can render. "dawn" adds a separate warm
 * light layer (sunward edges) whose opacity the scene animates; the base art
 * never changes colour.
 */
export type Lighting = "neutral" | "dawn";

/** A smooth sheer curve: heights of one line at the stern, low point and bow. */
export interface SheerLine {
  /** Height above the waterline at the sheer's lowest station. */
  y: number;
  /** Rise above `y` at the aft end of the line. */
  riseAft: number;
  /** Rise above `y` at the forward end of the line. */
  riseFwd: number;
}

export interface SheerSpec {
  /** x of the sheer's lowest point (usually a little aft of midships). */
  lowX: number;
  /** x where aft rises are measured (near the stern). */
  aftX: number;
  /** x where forward rises are measured (near the bow). */
  fwdX: number;
}

export interface HullSpec {
  /** Gun deck length, stem rabbet to sternpost rabbet. */
  gunDeckLength: number;
  /** Load waterline length from the sternpost (x = 0) to the stem. */
  waterlineLength: number;
  /** Load draught, used for the depth of hull drawn below the waterline. */
  draught: number;
  /** Rake of the sternpost aft of vertical, degrees. */
  sternpostRakeDeg: number;
  /** Horizontal overhang of the counter/taffrail aft of x = 0 at rail height. */
  sternOverhang: number;
  /** Horizontal reach of the stem above the waterline, at the main wale. */
  stemOverhang: number;
  sheer: SheerSpec;
  /** Top of the side in the waist, following the sheer. */
  rail: SheerLine;
  /** Raised decks: extents along the hull and the rail height above them. */
  forecastle: { endX: number; rail: number };
  quarterdeck: { startX: number; rail: number };
  poop?: { startX: number; rail: number };
  /** Copper sheathing shows this far above the load waterline. */
  copperAbove: number;
}

export interface GunDeckSpec {
  id: "lower" | "middle" | "upper" | "fourth" | "quarterdeck" | "forecastle";
  portsPerSide: number;
  /** Port sill height above the waterline at the sheer's low point. */
  sill: SheerLine;
  port: { width: number; height: number };
  /** x of the first (aftmost) and last (foremost) port centres. */
  firstX: number;
  lastX: number;
  /** Optional explicit port centres, overriding even spacing. */
  xs?: readonly number[];
  /**
   * The painted band around this deck's ports, if any. `taper` is how much
   * further the lower edge rises toward bow and stern than the sills do, so
   * the band narrows at the ends.
   */
  band?: { below: number; above: number; taper?: number };
  /** Port indices (from aft, 0-based) that have no lids and stay open. */
  openPorts?: readonly number[];
  /** A small double-door bow port forward of the broadside ports. */
  bowPort?: { x: number };
}

export interface WaleSpec {
  /** Bottom edge of the wale, following the sheer. */
  line: SheerLine;
  thickness: number;
}

export interface ChannelSpec {
  mast: MastId;
  /** Height of the channel (the ledge) above the waterline at the mast. */
  y: number;
  startX: number;
  endX: number;
}

export interface QuarterGallerySpec {
  /** Fore-and-aft extent at the gallery's widest tier. */
  startX: number;
  endX: number;
  /** Bottom and top heights of the gallery body above the waterline. */
  bottom: number;
  top: number;
  tiers: number;
  windowsPerTier: number;
}

export interface HeadSpec {
  /** How far the knee of the head reaches forward of the stem at the wale. */
  length: number;
  /** Height of the figurehead's crown above the waterline. */
  figureheadTop: number;
  /** Height of the figurehead's base. */
  figureheadBase: number;
  rails: number;
}

export interface DetailSpec {
  quarterGallery?: QuarterGallerySpec;
  head: HeadSpec;
  /** Entry port position (centre x) and the deck it opens on. */
  entryPort?: { x: number; deck: GunDeckSpec["id"] };
  /** A ladder of side steps from the rail to the waterline. */
  sideSteps?: { x: number };
  /** The beakhead bulkhead closing the forecastle at the bow. */
  beakhead?: { x: number; bottom: number };
  /** Hawse holes on the bow. */
  hawse?: readonly { x: number; y: number }[];
  /** Number of poop lanterns on the taffrail (side view shows two at most). */
  lanterns?: number;
  /** Boats stowed on the skid beams over the waist, showing above the rail. */
  boats?: { startX: number; endX: number; rise: number };
  channels: readonly ChannelSpec[];
  /** Cathead and catted anchor at the bow. */
  cathead: { x: number; y: number };
  /** Stern window tiers visible behind the quarter gallery. */
  sternTiers: number;
  /** Hammocks stowed in the nettings along the rails. */
  hammockNettings: boolean;
}

export type YardId =
  | "course"
  | "topsail"
  | "topgallant"
  | "royal"
  | "crossjack"
  | "mizzenTopsail"
  | "mizzenTopgallant";

export interface SquareSailSpec {
  set: boolean;
  /** Reef bands sewn across the sail, from the head down. */
  reefBands: number;
  /** Upward curve of the foot at its middle (roach), metres. */
  footRoach: number;
  /** Depth of a course from its yard to its foot (courses only). */
  drop?: number;
  /**
   * Reef band spacing as a fraction of the sail's depth (Steel: an eighth
   * for topsails, a sixth for courses), plus a middle band halfway between
   * the lowest reef and the foot.
   */
  reefStep?: number;
  middleBand?: boolean;
  /** Buntline cloths sewn on the fore side (4 on courses, 2 on topsails). */
  buntlineCloths?: number;
}

export interface YardSpec {
  id: YardId;
  /** Height of the yard on the mast when the sail is set. */
  y: number;
  length: number;
  diameter: number;
  /** The sail bent to this yard; its foot goes to the next yard down. */
  sail?: SquareSailSpec;
}

export interface MastSpec {
  id: MastId;
  /** x where the mast stands at upper deck level. */
  x: number;
  rakeDeg: number;
  /** Heights above the waterline. */
  deckY: number;
  topY: number;
  lowerHeadY: number;
  topmastHeadY: number;
  crosstreesY: number;
  topgallantHeadY: number;
  truckY: number;
  /** Fore-and-aft width of the fighting top as seen from the side. */
  topWidth: number;
  /** Diameters at the partners of each mast section. */
  diameters: { lower: number; topmast: number; topgallant: number };
  /** Yards from the lowest up. */
  yards: readonly YardSpec[];
  shroudsPerSide: number;
  topmastShroudsPerSide: number;
  topgallantShroudsPerSide: number;
  backstaysPerSide: number;
}

export interface BowspritSpec {
  /** Where the bowsprit leaves the hull above the stem. */
  heelX: number;
  heelY: number;
  steeveDeg: number;
  /** Outboard length to the cap. */
  length: number;
  diameter: number;
  jibBoom: { length: number; overlap: number };
  flyingJibBoom?: { length: number; overlap: number };
  /** Spritsail yard crossed under the bowsprit (sail furled), if carried. */
  spritsailYard?: { along: number; length: number; diameter: number };
  /** Dolphin striker hanging under the cap. */
  dolphinStriker: number;
}

export interface SpankerSpec {
  set: boolean;
  /** Gaff: throat height on the mizzen, length and peak angle above horizontal. */
  gaffThroatY: number;
  gaffLength: number;
  gaffAngleDeg: number;
  /** Boom: height at the mast and length aft. */
  boomY: number;
  boomLength: number;
  /** How far the boom end rises above its jaws. */
  boomRise: number;
  /**
   * Gaff and boom eased off toward the viewer (degrees): in elevation they
   * shorten by the cosine of this angle.
   */
  easeDeg: number;
}

export type HeadsailId =
  | "foreTopmastStaysail"
  | "jib"
  | "flyingJib"
  | "foreStaysail";

export interface HeadsailSpec {
  id: HeadsailId;
  set: boolean;
  /** Portion of the stay the luff occupies (0..1, from the tack up). */
  luffFraction: number;
  /** Angle between luff and foot at the tack, degrees. */
  tackAngleDeg: number;
  /** Foot length as a fraction of the luff. */
  footRatio: number;
}

export interface RigSpec {
  masts: readonly MastSpec[];
  bowsprit: BowspritSpec;
  spanker: SpankerSpec;
  headsails: readonly HeadsailSpec[];
  /**
   * Horizontal foreshortening of yards and square sails. A strict broadside of
   * a ship running before the wind shows square sails nearly edge-on; like
   * the period ship portraitists we show them face-on, as if braced round.
   */
  braceForeshortening: number;
  ratlineSpacing: number;
}

export type FlagDesign =
  | "vice-admiral-white"
  | "white-ensign"
  | "union-flag"
  | "french-ensign"
  | "spanish-ensign";

export interface FlagSpec {
  id: string;
  design: FlagDesign;
  /** Where the flag is bent on. */
  at: { kind: "masthead"; mast: MastId } | { kind: "gaffPeak" };
  hoist: number;
  fly: number;
}

export interface CanvasPaint {
  lit: string;
  shade: string;
  seam: string;
  boltRope: string;
  reef: string;
}

export interface PaintSpec {
  hull: string;
  wale: string;
  band: string;
  /** Chequer: lids in hull colour on the band. Plain: lids in band colour. */
  bandStyle: "chequer" | "plain";
  portLid: string;
  upperWorks: string;
  copper: string;
  copperShade: string;
  sternBase: string;
  sternTrim: string;
  glass: string;
  hammocks: string;
  spar: string;
  sparDark: string;
  figurehead: string;
  /** Figurehead accents: the crown, and the supporters' sashes. */
  figureAccents: { crown: string; sashStarboard: string; scroll: string };
  /** Linings of open ports, and the inner faces of lids. */
  portLining: string;
  /** Ground colour of the beakhead bulkhead. */
  beakhead: string;
  /** Quarter gallery: ground and carved mouldings. */
  galleryGround: string;
  galleryTrim: string;
  /** Lower masts (Nelson had them painted yellow, hoops included). */
  lowerMast: string;
  canvas: CanvasPaint;
  rigging: { standing: string; running: string };
  /** Warm light colour for the dawn layer. */
  warmLight: string;
}

export interface ShipSpec {
  id: string;
  name: string;
  nation: Nation;
  /** Year the spec describes. */
  year: number;
  guns: number;
  decks: 2 | 3 | 4;
  /** Seed for deterministic irregularity (cloth tones, reef points). */
  seed: number;
  hull: HullSpec;
  gunDecks: readonly GunDeckSpec[];
  wales: readonly WaleSpec[];
  details: DetailSpec;
  rig: RigSpec;
  flags: readonly FlagSpec[];
  paint: PaintSpec;
}
