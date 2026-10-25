import {
  EARTH_RADIUS_KM,
  latFromMercatorY,
  mercatorY,
  ORIGIN_MERCATOR,
  worldX,
} from "../../../src/components/chart/geo/mercator.ts";
import type { TileConfig } from "../config.ts";

/**
 * A tile's Mercator grid. Columns are uniform in longitude, rows uniform in
 * Mercator y with the same map spacing, so cells are square on the chart.
 * Row 0 is the northern edge. Cell (c, r) has its centre at
 * world x = x0 + (c + 0.5) · cellKm, world y = yTop − (r + 0.5) · cellKm.
 */
export interface TileGrid {
  id: string;
  cols: number;
  rows: number;
  cellDeg: number;
  /** Map size of a cell, km. */
  cellKm: number;
  /** World x of the western edge and world y of the northern edge, km. */
  x0: number;
  yTop: number;
  west: number;
  east: number;
  south: number;
  north: number;
  /** Mercator y (before the origin shift) of the northern edge, km. */
  mercatorTop: number;
}

export function tileGrid(tile: TileConfig): TileGrid {
  const cellDeg = tile.cellArcSec / 3600;
  const cellKm = (EARTH_RADIUS_KM * cellDeg * Math.PI) / 180;
  const cols = Math.round((tile.east - tile.west) / cellDeg);
  const ySouth = mercatorY(tile.south);
  const rows = Math.ceil((mercatorY(tile.north) - ySouth) / cellKm);
  const mercatorTop = ySouth + rows * cellKm;
  return {
    id: tile.id,
    cols,
    rows,
    cellDeg,
    cellKm,
    x0: worldX(tile.west),
    yTop: mercatorTop - ORIGIN_MERCATOR.y,
    west: tile.west,
    east: tile.west + cols * cellDeg,
    south: tile.south,
    north: latFromMercatorY(mercatorTop),
    mercatorTop,
  };
}

/** Longitude of column c's centre. */
export function colLon(grid: TileGrid, c: number): number {
  return grid.west + (c + 0.5) * grid.cellDeg;
}

/** Latitude of row r's centre. */
export function rowLat(grid: TileGrid, r: number): number {
  return latFromMercatorY(grid.mercatorTop - (r + 0.5) * grid.cellKm);
}

/** Fractional grid coordinates of a geographic point (cell centres at k + 0.5). */
export function toGrid(
  grid: TileGrid,
  lon: number,
  lat: number,
): [number, number] {
  return [
    (lon - grid.west) / grid.cellDeg,
    (grid.mercatorTop - mercatorY(lat)) / grid.cellKm,
  ];
}

interface Weights {
  start: Int32Array;
  count: Int32Array;
  index: Int32Array;
  weight: Float32Array;
}

/**
 * Tent-filter weights from sorted source coordinates to target coordinates.
 * The half-width is the larger of the two spacings: an area filter when
 * shrinking, linear interpolation when enlarging.
 */
function tentWeights(
  source: Float64Array,
  target: Float64Array,
  targetSpacing: Float64Array,
): Weights {
  const n = target.length;
  const sourceSpacing = Math.abs(source[1] - source[0]);
  const start = new Int32Array(n);
  const count = new Int32Array(n);
  const indices: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = target[i];
    const h = Math.max(sourceSpacing, targetSpacing[i]);
    // First source index with coordinate > t − h (binary search).
    let lo = 0;
    let hi = source.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (source[mid] <= t - h) lo = mid + 1;
      else hi = mid;
    }
    start[i] = indices.length;
    let sum = 0;
    for (let k = lo; k < source.length && source[k] < t + h; k++) {
      const w = 1 - Math.abs(source[k] - t) / h;
      if (w <= 0) continue;
      indices.push(k);
      weights.push(w);
      sum += w;
    }
    if (sum === 0) throw new Error(`no source samples near ${t}`);
    for (let k = start[i]; k < indices.length; k++) weights[k] /= sum;
    count[i] = indices.length - start[i];
  }
  return {
    start,
    count,
    index: Int32Array.from(indices),
    weight: Float32Array.from(weights),
  };
}

/**
 * Resamples a source grid (rows of ascending latitude, columns of ascending
 * longitude, row-major) onto a tile grid, separably: columns first, then
 * rows. Returns the tile's values, row 0 north.
 */
export function resampleToTile(
  grid: TileGrid,
  values: Float32Array,
  lats: Float64Array,
  lons: Float64Array,
): Float32Array {
  const srcRows = lats.length;
  const srcCols = lons.length;

  const targetLons = new Float64Array(grid.cols);
  for (let c = 0; c < grid.cols; c++) targetLons[c] = colLon(grid, c);
  const lonSpacing = new Float64Array(grid.cols).fill(grid.cellDeg);
  const wx = tentWeights(lons, targetLons, lonSpacing);

  const targetLats = new Float64Array(grid.rows);
  const latSpacing = new Float64Array(grid.rows);
  for (let r = 0; r < grid.rows; r++) {
    const lat = rowLat(grid, r);
    targetLats[r] = lat;
    // A cell's height in latitude: its map size divided by sec φ.
    latSpacing[r] =
      ((grid.cellKm / EARTH_RADIUS_KM) *
        Math.cos((lat * Math.PI) / 180) *
        180) /
      Math.PI;
  }
  const wy = tentWeights(lats, targetLats, latSpacing);

  const across = new Float32Array(srcRows * grid.cols);
  for (let r = 0; r < srcRows; r++) {
    const row = r * srcCols;
    for (let c = 0; c < grid.cols; c++) {
      let sum = 0;
      const s = wx.start[c];
      for (let k = 0; k < wx.count[c]; k++) {
        sum += wx.weight[s + k] * values[row + wx.index[s + k]];
      }
      across[r * grid.cols + c] = sum;
    }
  }

  const out = new Float32Array(grid.rows * grid.cols);
  for (let r = 0; r < grid.rows; r++) {
    const s = wy.start[r];
    for (let c = 0; c < grid.cols; c++) {
      let sum = 0;
      for (let k = 0; k < wy.count[r]; k++) {
        sum += wy.weight[s + k] * across[wy.index[s + k] * grid.cols + c];
      }
      out[r * grid.cols + c] = sum;
    }
  }
  return out;
}
