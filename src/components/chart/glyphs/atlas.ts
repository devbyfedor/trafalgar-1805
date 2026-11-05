import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  UnsignedByteType,
} from "three";
import { buildShip } from "@/components/ship/geometry/index";
import type { ShipSpec } from "@/components/ship/types";

/**
 * The ship glyphs' atlas: scene 1's ships of each type, drawn at load from
 * the same pure geometry (`buildShip`), so the chart's glyphs are the very
 * ships of scene 1; and silhouettes given as paths in the same manner (the
 * small craft of the Boulogne flotilla). Each drawing is cut at the
 * waterline, as scene 1 sets its ships into the sea.
 *
 * A glyph stands anywhere from a dozen to a hundred-odd device pixels tall,
 * and one drawing scaled down by mipmaps blurs its sails into one pale blot
 * and loses its masts and yards. So each type is drawn at a ladder of cell
 * heights a factor of √2 apart (LEVEL_PX), each drawing made for its size,
 * as an engraver redraws a symbol for a smaller plate rather than reducing
 * it: spars never thinner than about a pixel, a hairline of daylight
 * between sails that would run together, the rigging only where its lines
 * resolve, and from about 30 px up the hull's ochre bands, the port lids
 * on them and the sails' lit and shaded cloths, as scene 1 paints them.
 * The shader blends the two levels nearest the glyph's size on screen, so
 * the detail comes and goes smoothly as the camera moves.
 *
 * The atlas holds coverage, not colour, so the shader colours a glyph by
 * side and by light: red is the canvas that shows, green the dark parts
 * (hull, spars, rigging, port lids), blue the hull's bands, alpha the share
 * of the canvas in sunlight (the rest is its shaded tone). Every type is
 * drawn at one scale, metres to pixels, and a cell is drawn for the tallest
 * ship of 1805 (FULL_HEIGHT_M), so a seventy-four stands smaller than a
 * first rate and a gun-brig far smaller. The hull's middle sits at the
 * cell's centre and its waterline FOOT of the cell's height above its foot.
 */

/**
 * A drawing given as paths instead of a ShipSpec, in buildShip's manner:
 * metres, SVG's y down, the waterline at y = 0, x from the stern. Written
 * with absolute M, L, Q and C commands only, as the ship geometry's path
 * builder writes them; the atlas reads the drawing's bounds from them.
 */
export interface GlyphSilhouette {
  hull: string;
  spars: string;
  sails: string;
  rigging: string;
  /** The hull's length from x = 0: its middle stands on the glyph's anchor. */
  length: number;
}

export type GlyphType =
  | { id: string; spec: ShipSpec }
  | { id: string; silhouette: GlyphSilhouette };

/** One level of the ladder: where its cells lie in the atlas, texels. */
export interface GlyphLevel {
  /** The cell's height on screen this level is drawn for, device px. */
  px: number;
  /** Top left of its first cell. */
  x: number;
  y: number;
  /** A cell's size, and the step from one cell to the next. */
  cellW: number;
  cellH: number;
  strideX: number;
  strideY: number;
  /** Cells per row. */
  cols: number;
}

export interface GlyphAtlas {
  texture: DataTexture;
  width: number;
  height: number;
  levels: readonly GlyphLevel[];
  /** Cell width over height (the same at every level). */
  aspect: number;
  /** The cell's height in metres (all types share the scale). */
  cellMetres: number;
  /** Atlas cell of each type id. */
  index: ReadonlyMap<string, number>;
  /** How much of its cell a type's drawing fills, width and height (0..1). */
  fill: ReadonlyMap<string, { width: number; height: number }>;
  /** Bytes on the GPU, mipmaps included. */
  gpuBytes: number;
}

/** The ladder of cell heights, device px, a factor of √2 apart. */
export const LEVEL_PX: readonly number[] = [12, 17, 24, 34, 48, 68, 96, 136];

/** The waterline's height above the cell's foot, and the room over the trucks, as shares of the cell. */
export const FOOT = 1 / 12;

/**
 * The height (m above the waterline) a cell is drawn for: the Santísima
 * Trinidad's main truck with buildShip's margin above it, the tallest of
 * the glyph types of 1805.
 */
export const FULL_HEIGHT_M = 66;

/** Empty texels between cells, so the lower mipmaps don't bleed between them. */
const GUTTER = 8;
const ATLAS_W = 2048;
/** Pen width of the rigging, metres (as scene 1's silhouettes). */
const RIGGING_M = 0.16;

/** What a type gives the atlas: its layers as path data, and its extents. */
interface Shape {
  hull: string;
  spars: string;
  /** Each sail's outline, and the lit part of it. */
  sails: { outline: string; lit: string }[];
  rigging: string;
  bands: string;
  lids: string;
  /** x of the anchor, the hull's middle. */
  half: number;
  /** Extents about the anchor, and above the waterline, metres. */
  left: number;
  right: number;
  top: number;
}

/** Bounds of path data written with absolute M, L, Q and C commands. */
function pathBounds(paths: readonly string[]): {
  minX: number;
  maxX: number;
  minY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = 0;
  for (const d of paths) {
    const values = d.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
    for (let i = 0; i + 1 < values.length; i += 2) {
      const x = Number(values[i]);
      const y = Number(values[i + 1]);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
    }
  }
  return { minX, maxX, minY };
}

function shapeOf(type: GlyphType): Shape {
  if ("spec" in type) {
    const g = buildShip(type.spec);
    const half = type.spec.hull.gunDeckLength / 2;
    const vb = g.viewBox;
    return {
      hull: g.silhouette.hull,
      spars: g.silhouette.spars,
      sails: [...g.sails.square, ...g.sails.foreAndAft].map((s) => ({
        outline: s.outline,
        lit: s.lit,
      })),
      rigging: g.silhouette.rigging,
      bands: g.hull.bands,
      lids: g.hull.lids,
      half,
      left: half - vb.x,
      right: vb.x + vb.width - half,
      top: -vb.y,
    };
  }
  const s = type.silhouette;
  const half = s.length / 2;
  const b = pathBounds([s.hull, s.spars, s.sails, s.rigging]);
  // Half a pen's width of room round the drawing, as buildShip's margins.
  const pen = RIGGING_M;
  return {
    hull: s.hull,
    spars: s.spars,
    sails: [{ outline: s.sails, lit: s.sails }],
    rigging: s.rigging,
    bands: "",
    lids: "",
    half,
    left: half - b.minX + pen,
    right: b.maxX - half + pen,
    top: -b.minY + pen,
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * How a level draws, from its scale (px per metre): pens in pixels, and how
 * much of each detail it shows.
 */
function hinting(s: number) {
  return {
    // Spars stroked so the thinnest reads as about 0.85 px; nothing added
    // once they are wide enough on their own.
    sparPen: Math.max(0, 0.85 - 0.5 * s) / s,
    // Rigging: a hairline never under 0.4 px, coming in from 0.45 px/m.
    rigging: smooth(0.45, 0.95, s) * Math.min(1, (RIGGING_M * s) / 0.4 + 0.4),
    riggingPen: Math.max(RIGGING_M, 0.4 / s),
    // Daylight between sails that would run together when small.
    sailGap: (0.55 * (1 - smooth(0.7, 1.5, s))) / s,
    // The sails' edges inked, as an engraving outlines them, close up.
    sailEdge: 0.35 * smooth(0.9, 1.6, s),
    sailEdgePen: 0.4 / s,
    // Lit and shaded cloths once a sail is a few pixels across.
    litTone: smooth(0.3, 0.6, s),
    bands: smooth(0.28, 0.5, s),
    lids: smooth(0.75, 1.25, s),
  };
}

/** Lays the levels out in shelves across the atlas. */
function layout(aspect: number, types: number) {
  const levels: GlyphLevel[] = [];
  let y = GUTTER;
  for (const px of LEVEL_PX) {
    const cellH = px;
    const cellW = Math.ceil(px * aspect);
    const strideX = cellW + GUTTER;
    const strideY = cellH + GUTTER;
    const cols = Math.max(1, Math.floor((ATLAS_W - GUTTER) / strideX));
    const rows = Math.ceil(types / cols);
    levels.push({ px, x: GUTTER, y, cellW, cellH, strideX, strideY, cols });
    y += rows * strideY;
  }
  return { levels, height: y };
}

/** Yields to the browser between levels, so no task runs long. */
const pause = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/** Channels drawn on their own canvases, as alpha. */
type Channel = "canvas" | "dark" | "band" | "lit";

export async function buildGlyphAtlas(
  types: readonly GlyphType[],
): Promise<GlyphAtlas> {
  const shapes = types.map(shapeOf);
  const top = Math.max(FULL_HEIGHT_M, ...shapes.map((s) => s.top));
  const side = Math.max(...shapes.map((s) => Math.max(s.left, s.right)));
  // Metres to cell heights: the trucks FOOT under the top, the waterline FOOT over the foot.
  const unit = (1 - 2 * FOOT) / top;
  const aspect = 2 * side * unit + 2 * FOOT;
  const { levels, height } = layout(aspect, types.length);
  const width = ATLAS_W;
  const data = new Uint8Array(width * height * 4);

  const index = new Map<string, number>();
  const fill = new Map<string, { width: number; height: number }>();
  shapes.forEach((s, i) => {
    index.set(types[i].id, i);
    fill.set(types[i].id, {
      width: ((s.left + s.right) * unit) / aspect,
      height: s.top * unit + FOOT,
    });
  });

  for (const level of levels) {
    const rows = Math.ceil(types.length / level.cols);
    const w = level.cols * level.strideX;
    const h = rows * level.strideY;
    const canvases = {} as Record<Channel, CanvasRenderingContext2D>;
    for (const c of ["canvas", "dark", "band", "lit"] as const) {
      const el = document.createElement("canvas");
      el.width = w;
      el.height = h;
      const ctx = el.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("glyph atlas: no 2D context");
      canvases[c] = ctx;
    }
    const s = level.cellH * unit; // px per metre
    const hint = hinting(s);
    shapes.forEach((shape, i) => {
      const col = i % level.cols;
      const row = Math.floor(i / level.cols);
      const cx = col * level.strideX + level.cellW / 2;
      // The waterline on a whole pixel row, so the hull's foot is crisp.
      const baseline = Math.round(
        row * level.strideY + level.cellH * (1 - FOOT),
      );
      for (const ctx of Object.values(canvases)) {
        ctx.save();
        // Ship metres (y down, waterline at 0) to the level's pixels.
        ctx.setTransform(s, 0, 0, s, cx - shape.half * s, baseline);
        ctx.beginPath();
        ctx.rect(-1e3, -1e3, 2e3, 1e3);
        ctx.clip();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#fff";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
      }
      drawShape(canvases, shape, hint);
      for (const ctx of Object.values(canvases)) ctx.restore();
    });
    // The lit share only where the canvas shows: alpha = lit × canvas, so
    // the shader reads the lit share as alpha over red, mipmaps and all.
    const lit = canvases.lit;
    lit.setTransform(1, 0, 0, 1, 0, 0);
    lit.globalCompositeOperation = "destination-in";
    lit.drawImage(canvases.canvas.canvas, 0, 0);
    lit.globalCompositeOperation = "source-over";
    // Coverage (each canvas's alpha) into the atlas's channels.
    const read = (c: Channel) => canvases[c].getImageData(0, 0, w, h).data;
    const [cv, dk, bd, lt] = [
      read("canvas"),
      read("dark"),
      read("band"),
      read("lit"),
    ];
    for (let y = 0; y < h; y++) {
      const out = ((level.y + y) * width + level.x) * 4;
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4 + 3;
        const o = out + x * 4;
        data[o] = cv[k];
        data[o + 1] = dk[k];
        data[o + 2] = bd[k];
        data[o + 3] = lt[k];
      }
    }
    await pause();
  }

  const texture = new DataTexture(
    data,
    width,
    height,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  // A glyph narrows as its heading turns toward the camera: sharp across
  // the squeeze, as tall as ever.
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return {
    texture,
    width,
    height,
    levels,
    aspect,
    cellMetres: 1 / unit,
    index,
    fill,
    gpuBytes: Math.round(width * height * 4 * (4 / 3)),
  };
}

/**
 * One type at one level, in scene 1's painting order: the sails, the hull
 * and spars over them, the bands on the hull, then the port lids and the
 * rigging over everything. Each channel keeps only what shows of it: what
 * is drawn over a part is cut out of that part's channel.
 */
function drawShape(
  c: Record<Channel, CanvasRenderingContext2D>,
  shape: Shape,
  hint: ReturnType<typeof hinting>,
): void {
  const hull = new Path2D(shape.hull);
  const spars = new Path2D(shape.spars);
  const rigging = shape.rigging ? new Path2D(shape.rigging) : null;
  const bands = shape.bands ? new Path2D(shape.bands) : null;
  const lids = shape.lids ? new Path2D(shape.lids) : null;
  const sails = shape.sails.map((s) => ({
    outline: new Path2D(s.outline),
    lit: new Path2D(s.lit),
  }));

  // Paints a shape into a channel (or cuts it out of one).
  const paint = (
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    alpha: number,
    how: "fill" | "stroke",
    pen = 0,
    cut = false,
  ) => {
    if (alpha <= 0.002 || (how === "stroke" && pen <= 0)) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.globalCompositeOperation = cut ? "destination-out" : "source-over";
    if (how === "fill") ctx.fill(path);
    else {
      ctx.lineWidth = pen;
      ctx.stroke(path);
    }
  };
  // Paints a dark part: into the dark channel, cut from those under it.
  const dark = (
    path: Path2D,
    alpha: number,
    how: "fill" | "stroke",
    pen = 0,
    over: Channel[] = ["canvas", "band"],
  ) => {
    paint(c.dark, path, alpha, how, pen);
    for (const ch of over) paint(c[ch], path, alpha, how, pen, true);
  };

  // The canvas, each sail with its lit cloths; small, every sail in the lit
  // tone, so a few pixels of sail don't mottle.
  for (const s of sails) {
    paint(c.canvas, s.outline, 1, "fill");
    paint(c.lit, s.outline, 1 - hint.litTone, "fill");
    paint(c.lit, s.lit, 1, "fill");
  }
  // Daylight between sails that run together, and their inked edges.
  for (const s of sails) {
    paint(c.canvas, s.outline, 1, "stroke", hint.sailGap, true);
  }
  // The hull and the spars over the sails.
  dark(hull, 1, "fill");
  dark(spars, 1, "fill");
  dark(spars, 1, "stroke", hint.sparPen);
  for (const s of sails)
    dark(s.outline, hint.sailEdge, "stroke", hint.sailEdgePen, ["canvas"]);
  // The bands on the hull.
  if (bands) {
    paint(c.band, bands, hint.bands, "fill");
    paint(c.dark, bands, hint.bands, "fill", 0, true);
  }
  // The port lids on the bands, and the rigging over everything.
  if (lids) dark(lids, hint.lids, "fill");
  if (rigging) dark(rigging, hint.rigging, "stroke", hint.riggingPen);
  for (const ctx of Object.values(c)) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
