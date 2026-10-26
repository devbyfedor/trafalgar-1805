import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
} from "three";
import { buildShip } from "@/components/ship/geometry/index";
import type { ShipSpec } from "@/components/ship/types";

/**
 * The ship glyphs' atlas: scene 1's silhouettes of each ship type, drawn
 * once at load from the same pure geometry (`buildShip`), so the chart's
 * glyphs are the very ships of scene 1. Each drawing is cut at the
 * waterline, as scene 1 sets its ships into the sea.
 *
 * The atlas holds coverage, not colour: red is the canvas (sails), green
 * the dark parts drawn over it (hull, spars, rigging), so the shader can
 * colour a glyph by side and by light. Every type is drawn at one scale,
 * metres to pixels, so a seventy-four stands smaller than a first rate;
 * the hull's middle sits at the cell's centre and its waterline on the
 * cell's baseline.
 */

export interface GlyphType {
  id: string;
  spec: ShipSpec;
}

export interface GlyphAtlas {
  texture: CanvasTexture;
  cols: number;
  rows: number;
  /** Cell width over height. */
  aspect: number;
  /** The cell's height in metres (all types share the scale). */
  cellMetres: number;
  /** Atlas cell of each type id. */
  index: ReadonlyMap<string, number>;
  /** Bytes on the GPU, mipmaps included. */
  gpuBytes: number;
}

/** Cell height in pixels: about twice the largest glyph on screen. */
const CELL_PX = 192;
/** Room around each drawing, pixels, so low mipmaps don't bleed between cells. */
const PAD_PX = 16;
/** Pen width of the rigging, metres (as scene 1's silhouettes). */
const RIGGING_M = 0.16;

export function buildGlyphAtlas(types: readonly GlyphType[]): GlyphAtlas {
  const shapes = types.map((t) => {
    const g = buildShip(t.spec);
    const half = t.spec.hull.gunDeckLength / 2;
    const vb = g.viewBox;
    return {
      g,
      // Extents about the hull's middle, above the waterline.
      left: half - vb.x,
      right: vb.x + vb.width - half,
      top: -vb.y,
    };
  });
  const top = Math.max(...shapes.map((s) => s.top));
  const side = Math.max(...shapes.map((s) => Math.max(s.left, s.right)));
  const scale = (CELL_PX - 2 * PAD_PX) / top;
  const cellH = CELL_PX;
  const cellW = Math.ceil(2 * side * scale + 2 * PAD_PX);
  const cols = Math.min(types.length, Math.max(1, Math.floor(2048 / cellW)));
  const rows = Math.ceil(types.length / cols);

  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW;
  canvas.height = rows * cellH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("glyph atlas: no 2D context");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";

  const index = new Map<string, number>();
  shapes.forEach((s, i) => {
    index.set(types[i].id, i);
    const cx = (i % cols) * cellW + cellW / 2;
    const baseline = Math.floor(i / cols) * cellH + cellH - PAD_PX;
    const half = types[i].spec.hull.gunDeckLength / 2;
    ctx.save();
    // Ship metres (y down, waterline at 0) to atlas pixels.
    ctx.setTransform(scale, 0, 0, scale, cx - half * scale, baseline);
    ctx.beginPath();
    ctx.rect(-1e3, -1e3, 2e3, 1e3);
    ctx.clip();
    const sil = s.g.silhouette;
    ctx.fillStyle = "#f00";
    ctx.fill(new Path2D(sil.sails));
    ctx.fillStyle = "#0f0";
    ctx.fill(new Path2D(sil.spars));
    ctx.fill(new Path2D(sil.hull));
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = RIGGING_M;
    ctx.stroke(new Path2D(sil.rigging));
    ctx.restore();
  });

  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  return {
    texture,
    cols,
    rows,
    aspect: cellW / cellH,
    cellMetres: cellH / scale,
    index,
    gpuBytes: Math.round(canvas.width * canvas.height * 4 * (4 / 3)),
  };
}
