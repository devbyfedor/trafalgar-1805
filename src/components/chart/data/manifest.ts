/**
 * public/chart/manifest.json, written by scripts/data/build.ts. The types
 * mirror what the build writes; the loaders read nothing else.
 */

/** How a tile is layered: surround under the overview, detail over it. */
export type TileRole = "surround" | "overview" | "detail";

export interface TileInfo {
  id: string;
  role: TileRole;
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
  /** The coast distance code spans ± this many cells. */
  sdfRange: number;
}

export interface ChartManifest {
  version: number;
  origin: { lon: number; lat: number };
  height: { scale: number; min: number; max: number; bits: number };
  sdf: { bits: number };
  tiles: TileInfo[];
  lowres: {
    file: string;
    bytes: number;
    cols: number;
    rows: number;
    cellKm: number;
    /** Metres per step of the one-byte height code (0 is sea). */
    stepM: number;
    x0: number;
    yTop: number;
  };
  rivers: { file: string; bytes: number; count: number; points: number };
}

/** The manifest layout these types describe (4: rivers carry their flow). */
const MANIFEST_VERSION = 4;

/** Where the chart's assets are served from (same origin, public/chart/). */
export const CHART_BASE = "/chart/";

export async function loadManifest(
  signal?: AbortSignal,
): Promise<ChartManifest> {
  const response = await fetch(`${CHART_BASE}manifest.json`, { signal });
  if (!response.ok) throw new Error(`chart manifest: HTTP ${response.status}`);
  const manifest = (await response.json()) as ChartManifest;
  if (manifest.version !== MANIFEST_VERSION) {
    throw new Error(`chart manifest: unknown version ${manifest.version}`);
  }
  return manifest;
}

/** A tile's rectangle in world km: west, north, width, height. */
export function tileRect(tile: TileInfo): [number, number, number, number] {
  return [tile.x0, tile.yTop, tile.cols * tile.cellKm, tile.rows * tile.cellKm];
}
