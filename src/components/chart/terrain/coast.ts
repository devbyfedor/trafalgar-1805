/**
 * The terrain field on the CPU: each tile's coast distance (km, positive at
 * sea) and height (m), read back once after the tiles are decoded
 * (TerrainField.readBack) and layered exactly as GLSL_FIELD's layered()
 * reads them on the GPU: the coarse surround under everything (open sea
 * beyond it), the overview over it and the detail tile the GPU's one detail
 * layer holds over that, at its weight (TerrainField.binding: the detail
 * tiles share that layer, terrain/slot.ts), each blended in across its edge
 * band, a finer layer's distance handing over to the coarser one's where it
 * nears its cap. Reads are bilinear between texel centres, as the GPU's
 * base level. Every detail tile is read back; one the layer doesn't hold
 * counts for nothing, as on the GPU, so the coast the glyph layout keeps
 * ships off is the coast the frame draws.
 *
 * Laying ship glyphs out on screen needs to know, for any point, how far it
 * lies from land (glyphs/layout.ts): the distance field is 1-Lipschitz, so
 * a disc round a point whose radius is under its distance holds no land.
 */

/** One tile as read back: 16-bit codes, distance in R G, height in B A. */
export interface CoastTile {
  role: "surround" | "overview" | "detail";
  /** World rectangle: west edge x, north edge y, width, height (km). */
  x0: number;
  yTop: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  cellKm: number;
  /** Distance codes span ±range km; heights span [hMin, hMax] m. */
  range: number;
  hMin: number;
  hMax: number;
  /** Where the distance hands over to the layer below (GLSL uSat), km; 0 for none. */
  sat: number;
  /** The edge band over which the tile blends in, km. */
  fade: number;
  bytes: Uint8Array;
}

/**
 * Which detail tile the GPU's detail layer holds (an index into the detail
 * tiles, in the order they were read back) and its weight, 0..1
 * (TerrainField.binding, kept current by the field).
 */
export interface DetailBinding {
  readonly index: number;
  readonly weight: number;
}

/** The distance of the open sea beyond the surround (GLSL OPEN_SEA). */
const OPEN_SEA_KM = 1e4;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export class CoastField {
  private readonly surround: CoastTile | null;
  private readonly overview: CoastTile | null;
  private readonly details: CoastTile[];

  /** Without a binding, every detail tile counts in full. */
  constructor(
    tiles: readonly CoastTile[],
    private readonly binding: DetailBinding | null = null,
  ) {
    this.surround = tiles.find((t) => t.role === "surround") ?? null;
    this.overview = tiles.find((t) => t.role === "overview") ?? null;
    this.details = tiles.filter((t) => t.role === "detail");
  }

  /** The coast distance at a world point, km (positive at sea). */
  distance(x: number, y: number): number {
    let d = OPEN_SEA_KM;
    const c = this.surround;
    if (c && inside(c, x, y) > 0) d = read(c, x, y, 0);
    const a = this.overview;
    if (a) {
      const k = cover(a, x, y);
      if (k > 0) d += (handOver(read(a, x, y, 0), d, a.sat) - d) * k;
    }
    for (let i = 0; i < this.details.length; i++) {
      const b = this.details[i];
      const k = this.weight(i) * cover(b, x, y);
      if (k > 0) d += (handOver(read(b, x, y, 0), d, b.sat) - d) * k;
    }
    return d;
  }

  /** The height at a world point, m (the finest layer that covers it, blended in). */
  height(x: number, y: number): number {
    let h = -4000;
    const c = this.surround;
    if (c && inside(c, x, y) > 0) h = read(c, x, y, 2);
    const a = this.overview;
    if (a) {
      const k = cover(a, x, y);
      if (k > 0) h += (read(a, x, y, 2) - h) * k;
    }
    for (let i = 0; i < this.details.length; i++) {
      const b = this.details[i];
      const k = this.weight(i) * cover(b, x, y);
      if (k > 0) h += (read(b, x, y, 2) - h) * k;
    }
    return h;
  }

  /**
   * The texel whose error bounds the distance read at a point, km: the
   * finest layer's where it covers in full, else the coarser one's below
   * (as GLSL_SURFACE's finestTexelKm).
   */
  texelKm(x: number, y: number): number {
    for (let i = 0; i < this.details.length; i++) {
      const b = this.details[i];
      if (this.weight(i) * cover(b, x, y) >= 1) return b.cellKm;
    }
    const a = this.overview;
    if (a && cover(a, x, y) >= 1) return a.cellKm;
    return this.surround?.cellKm ?? a?.cellKm ?? 1;
  }

  /** How much detail tile i counts (GLSL uHasB for the tile layer B holds). */
  private weight(i: number): number {
    const b = this.binding;
    if (!b) return 1;
    return b.index === i ? b.weight : 0;
  }
}

/** Distance inside a tile from its nearest edge, km (negative outside). */
function inside(t: CoastTile, x: number, y: number): number {
  const u = (x - t.x0) / t.width;
  const v = (t.yTop - y) / t.height;
  return Math.min(Math.min(u, 1 - u) * t.width, Math.min(v, 1 - v) * t.height);
}

function cover(t: CoastTile, x: number, y: number): number {
  return smoothstep(0, 1, Math.min(1, Math.max(0, inside(t, x, y) / t.fade)));
}

function handOver(fine: number, below: number, sat: number): number {
  if (sat <= 0) return fine;
  return fine + (below - fine) * smoothstep(0.85 * sat, sat, Math.abs(fine));
}

/** A bilinear read of a tile's distance (channel 0) or height (channel 2). */
function read(t: CoastTile, x: number, y: number, channel: 0 | 2): number {
  const fx = ((x - t.x0) / t.width) * t.cols - 0.5;
  const fy = ((t.yTop - y) / t.height) * t.rows - 0.5;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const x0 = Math.min(t.cols - 1, Math.max(0, ix));
  const x1 = Math.min(t.cols - 1, Math.max(0, ix + 1));
  const y0 = Math.min(t.rows - 1, Math.max(0, iy));
  const y1 = Math.min(t.rows - 1, Math.max(0, iy + 1));
  const b = t.bytes;
  const at = (cx: number, cy: number) => {
    const o = (cy * t.cols + cx) * 4 + channel;
    return (b[o] << 8) | b[o + 1];
  };
  const c00 = at(x0, y0);
  const c10 = at(x1, y0);
  const c01 = at(x0, y1);
  const c11 = at(x1, y1);
  const code =
    (c00 + (c10 - c00) * tx) * (1 - ty) + (c01 + (c11 - c01) * tx) * ty;
  const u = code / 65535;
  return channel === 0 ? (u * 2 - 1) * t.range : t.hMin + u * (t.hMax - t.hMin);
}
