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

/** Which raster a job paints. */
export type PlateMode = "colour" | "ink";

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
  /** Jobs for a raster, in paint order. An empty list: no raster of that mode. */
  jobs(mode: PlateMode): readonly PlateJob[];
  rock?: PlateRock;
  swell?: PlateSwell;
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
