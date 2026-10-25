/**
 * public/chart/manifest.json, written by scripts/data/build.ts. The types
 * mirror what the build writes; the loaders read nothing else.
 */

export interface TileInfo {
  id: string;
  file: string;
  bytes: number;
  cols: number;
  rows: number;
  /** Map size of a cell, km (world units). */
  cellKm: number;
  /** World x of the western edge and world y of the northern edge, km. */
  x0: number;
  yTop: number;
  west: number;
  east: number;
  south: number;
  north: number;
  /** Signed-distance range of the coast field, cells, and its tail constant. */
  sdfRange: number;
  sdfTail: number;
}

export interface ChartManifest {
  version: number;
  origin: { lon: number; lat: number };
  height: { scale: number; min: number; max: number; bits: number };
  sdf: { core: number; coreShare: number };
  tiles: TileInfo[];
  lowres: {
    file: string;
    bytes: number;
    cols: number;
    rows: number;
    cellKm: number;
    x0: number;
    yTop: number;
  };
  rivers: { file: string; bytes: number; count: number; points: number };
}

/** Where the chart's assets are served from (same origin, public/chart/). */
export const CHART_BASE = "/chart/";

export async function loadManifest(signal?: AbortSignal): Promise<ChartManifest> {
  const response = await fetch(`${CHART_BASE}manifest.json`, { signal });
  if (!response.ok) throw new Error(`chart manifest: HTTP ${response.status}`);
  const manifest = (await response.json()) as ChartManifest;
  if (manifest.version !== 1) {
    throw new Error(`chart manifest: unknown version ${manifest.version}`);
  }
  return manifest;
}

/** A tile's rectangle in world km: west, north, width, height. */
export function tileRect(tile: TileInfo): [number, number, number, number] {
  return [tile.x0, tile.yTop, tile.cols * tile.cellKm, tile.rows * tile.cellKm];
}
