import type { LightSink } from "./lights";

/**
 * A plate of Boulogne's painting (docs/scene-02-boulogne-brief.md, "Owner
 * review, 13 November"): one flat layer standing at a depth, painted ONCE,
 * before the dive, into two rasters, and never again: its colour (the
 * painting) and its engraving (the same view in lines on paper, for the
 * transition from the chart). Per frame only the wrappers move (view.ts,
 * shiftFor) and fade; the art inside is static, so detail costs nothing
 * per frame.
 *
 * A plate's art is a list of small jobs, each a few milliseconds at most
 * on the owner's laptop, run in idle slices (raster.ts), so preparing the
 * painting never makes a long task.
 *
 * Coordinates: layer units (view.ts), x to the right of the hold's axis,
 * y UP from the horizon, as `project()` (scene.ts) gives them. The
 * context's transform maps them to the plate's canvas, so a job draws in
 * units and gets a pen width for a size in device pixels from `pen()`.
 */

/**
 * Which raster a job paints: the colour (the golden evening of 18:33), the
 * engraving, and the dusk (the same view about twenty minutes after
 * sunset, paint/dusk.ts), which comes in over the colour through the hold.
 */
export type PlateMode = "colour" | "ink" | "glow" | "dusk";

/** The rasters an area's painter paints with `Plate.jobs` (the dusk is made from the colour: paint/dusk.ts). */
export type PaintMode = "colour" | "ink";

/**
 * Groups that come in together in the transition (interludes.ts,
 * TRANSITION): the sky, the land (with the town and the shore), the water
 * (with the strand), the craft.
 */
export type PlateGroup = "sky" | "land" | "water" | "craft";

/** What a job draws with. */
export interface PlateCanvas {
  ctx: CanvasRenderingContext2D;
  mode: PlateMode;
  /** Device pixels per layer unit. */
  k: number;
  /** A line width in layer units for `px` device pixels. */
  pen(px: number): number;
  /** The plate's box, layer units: x0, x1, y0 (bottom), y1 (top). */
  box: readonly [number, number, number, number];
  /** For a dusk job: the plate's colour raster, painted already (paint/dusk.ts grades it). */
  colour?: HTMLCanvasElement;
  /**
   * In the colour pass: where the area's painter records its lights and
   * what hides them, in paint order (paint/lights.ts), for its lights
   * plates' dusk.
   */
  lights?: LightSink;
}

export type PlateJob = (c: PlateCanvas) => void;

/**
 * Rocking at anchor, for a plate that is one craft (or its reflection):
 * a roll about its waterline at mid-length and a little heave, each craft
 * its own period and phase (scene 1's Victory rides the swell the same
 * way). The reflection rolls the other way (`mirror`).
 */
export interface PlateRock {
  /** The pivot, layer units: the waterline at the hull's mid-length. */
  pivot: readonly [number, number];
  /** Degrees, either way. */
  roll: number;
  /** Metres up and down. */
  heave: number;
  /** Seconds. */
  period: number;
  /** Seconds added to the clock. */
  phase: number;
  mirror?: boolean;
}

/**
 * The swell's motion, for a plate that is a strip of water (scene 1's
 * strips): its crests drift sideways, looping every `period` units (so its
 * art must repeat across with that period and its box reach one period
 * beyond the view's edges), and it rises and falls a little, the nearer
 * strips later.
 */
export interface PlateSwell {
  /** Crest drift, layer units per second (positive: to the right). */
  drift: number;
  /** The art's repeat across, layer units. */
  period: number;
  /** Rise and fall, layer units either way; its period and delay, seconds. */
  amp: number;
  seconds: number;
  delay: number;
}

/**
 * A plate that rises and falls with the swell all of a piece, without
 * rolling: a stretch of a moored row, whose craft lie along the crests
 * and rise together (flotilla-check.md item 12).
 */
export interface PlateBob {
  /** Metres up and down. */
  heave: number;
  /** Seconds. */
  period: number;
  /** Seconds added to the clock. */
  phase: number;
}

/**
 * A plate's dusk (paint/dusk.ts). Its dusk raster is its colour raster
 * graded (`grade`), then its own dusk jobs (`jobs("dusk")`) over that; a
 * plate with no colour raster (the lights) has its dusk jobs alone.
 */
export interface PlateDusk {
  /** The hold's progress (0..1) over which its dusk raster comes in, eased. */
  at: readonly [number, number];
  /** How its colour raster turns to dusk; null: not graded (its dusk jobs paint it all). */
  grade: DuskGrade | null;
  /** Layer units its dusk raster rises as it comes in (the sky: the Earth's shadow climbing). */
  rise?: number;
  /** Flicker of its dusk raster's opacity (fires): the share it can dip, 0..1. */
  flicker?: number;
  /** Its own dusk painting, over the grade (or alone). */
  jobs?: () => readonly PlateJob[];
  /**
   * The sun's last light before the dusk (paint/dusk.ts): a raster graded
   * from the colour that comes in over it first, when, and how.
   */
  glow?: { at: readonly [number, number]; grade: DuskGrade };
}

/**
 * A grade from the golden light to dusk, made on the GPU from the colour
 * raster with alpha kept: the colour times `keep` (the light that is left),
 * then `mix` of the way to `tint` (the dusk's diffuse light from the sky
 * behind the eye: values close up, warm turns cool). `tint` may be a ramp
 * by height, layer units, so a cloud's top keeps a rose its base has lost.
 */
export interface DuskGrade {
  /** The light that is left, 0..1: a number, or a ramp by height (layer units). */
  keep: number | readonly (readonly [number, number])[];
  tint: string | readonly (readonly [number, string])[];
  mix: number;
  /**
   * First, before the dimming: `amount` of the way to `colour`'s hue and
   * saturation, each pixel keeping its lightness (the "color" blend): the
   * sun's warm local colour gone to the dusk's cool, the painting's
   * values and drawing kept. Without it the dimmed warm and the cool tint
   * mix to a brown grey.
   */
  hue?: { colour: string; amount: number };
  /**
   * The raster multiplied by itself by this much, after the hue: dark
   * pixels sink further than light ones, so what faces the bright western
   * sky (the chalk, the limewash) holds the light longest.
   */
  lift?: number;
}

/** Paint-order keys (Plate.order): every reflection over all the water, every craft over every reflection. */
export const ORDER = {
  /** Reflections, farther first: nearer than the nearest strip of swell (23 m). */
  reflection: (depth: number) => 20 + depth / 1e4,
  /** Craft, farther first, over all the reflections. */
  craft: (depth: number) => 10 + depth / 1e4,
} as const;

/** A plate's key in the paint order, far (large) to near. */
export function paintOrder(p: Plate): number {
  return p.order ?? p.depth;
}

export interface Plate {
  id: string;
  /** Metres ahead of the hold's eye it moves as (Infinity: the sky). */
  depth: number;
  /**
   * Its place in the paint order, far (large) to near, when that differs
   * from its depth (`paintOrder`): a craft's reflection lies on the water
   * between the eye and the craft (a masthead 20 m up at 300 m is mirrored
   * about 70 m from a 6 m eye), so it is painted over the nearer strips of
   * swell, and the craft over its reflection; it still moves as `depth`.
   */
  order?: number;
  /** Its box, layer units: x0, x1, y0 (bottom), y1 (top). */
  box: readonly [number, number, number, number];
  group: PlateGroup;
  /** The rasters it has (by default the engraving, the colour, and the dusk if `duskOf` gives one). */
  rasters?: readonly PlateMode[];
  /** Jobs for a raster, in paint order. An empty list: no raster of that mode. */
  jobs(mode: PaintMode): readonly PlateJob[];
  rock?: PlateRock;
  bob?: PlateBob;
  swell?: PlateSwell;
  /**
   * Layer units the whole plate climbs over a stretch of the hold (the
   * moon rising through the evening), eased; it stays up on the rise.
   */
  climb?: { units: number; at: readonly [number, number] };
  /**
   * How the plate turns to dusk through the hold (paint/dusk.ts,
   * `duskOf`): when, and how its dusk raster is made. Absent: by its
   * group and depth. `false`: it has no dusk raster and stays as it is.
   */
  dusk?: PlateDusk | false;
  /**
   * A raster's resolution as a share of the viewport's (1 by default): a
   * smooth backdrop (a sky's ramp, the deep water's body) can be painted
   * at a half, so its canvas costs a quarter of the memory, and the
   * compositor stretches it. Never below 1 for fine lines: `pen()` gives
   * device pixels of the raster, which then cover more of the screen.
   */
  resolution?: Partial<Record<PlateMode, number>>;
}

/**
 * The engraving's paper and inks: the chart's own (components/chart/light/
 * states.ts, the campaign light), so the chart's lines turn into the
 * engraving's without a change of colour.
 */
export const PAPER = {
  low: "#e6dbc3",
  high: "#cdb185",
} as const;

export const INK = {
  /** The coast's ink: outlines, the strongest lines. */
  line: "#2a221c",
  /** Hatching and lighter work. */
  hatch: "#5b4a38",
} as const;
