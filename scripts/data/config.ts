import path from "node:path";

/**
 * Configuration of the chart's data pipeline (docs/decisions.md, "Data
 * pipeline"). `npm run data:build` downloads what is missing into data/raw/
 * (git-ignored) and writes the processed assets to public/chart/.
 */

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const RAW_DIR = path.join(ROOT, "data", "raw");
export const OUT_DIR = path.join(ROOT, "public", "chart");

/**
 * A tile is a Mercator grid with square cells: `cellArcSec` of longitude
 * wide and the same map distance tall, so rows grow shorter in latitude
 * toward the north. Row 0 is the northern edge (images read like a map).
 */
export interface TileConfig {
  id: string;
  west: number;
  east: number;
  south: number;
  /** The grid's northern edge follows from the row count; this is a minimum. */
  north: number;
  cellArcSec: number;
  /** Stride over ETOPO 2022's 15 arc-second grid when downloading. */
  stride: number;
  /** Signed-distance range of the coast field, in cells (see SDF_CODE). */
  sdfRange: number;
  /** Latitude rows per ERDDAP request, so no single request is huge. */
  rowsPerRequest: number;
}

export const TILES: readonly TileConfig[] = [
  {
    // From the Caribbean to the upper Danube, with room for haze at the edges.
    id: "overview",
    west: -72,
    east: 20,
    south: 5,
    north: 57,
    cellArcSec: 180,
    stride: 4,
    sdfRange: 64,
    rowsPerRequest: 360,
  },
  {
    // The Gulf of Cádiz from Cape St Vincent, with the Strait of Gibraltar.
    id: "cadiz",
    west: -9.6,
    east: -4.3,
    south: 34.9,
    north: 37.8,
    cellArcSec: 15,
    stride: 1,
    sdfRange: 128,
    rowsPerRequest: 360,
  },
];

/**
 * Heights (metres, land positive, depths negative) are stored as an asinh
 * code: fine steps near sea level, coarser on high ground and in the deep
 * ocean, where contours and isobaths are far apart. 12 bits in two bytes
 * (the low four bits constant, so they compress away): steps of 0.14 m at
 * sea level, 1.4 m at 500 m, 5 m at 1,500 m and 11 m at 4,000 m, finer
 * than any line the chart draws. Against 16 bits it saves a third of the
 * download (4.7 MB to 3.0 MB) with no visible terracing.
 */
export const HEIGHT_CODE = {
  scale: 50,
  min: -Math.asinh(9000 / 50),
  max: Math.asinh(5000 / 50),
  bits: 12,
} as const;

/**
 * The coast's signed distance (positive at sea, negative on land), in cells,
 * as one byte: linear within `core` cells of the coast (sub-cell precision
 * where the inked coast and the first waterlines are drawn), logarithmic
 * beyond, out to the tile's `sdfRange`. The two pieces meet with matching
 * slope, so interpolated values bend nowhere visible.
 */
export const SDF_CODE = {
  core: 4,
  coreShare: 0.5,
} as const;

export const ETOPO = {
  dataset: "ETOPO_2022_v1_15s",
  server: "https://coastwatch.pfeg.noaa.gov/erddap/griddap",
  /** 15 arc-seconds. */
  sourceCellDeg: 1 / 240,
} as const;

/** Natural Earth 5.1.2, the official GeoJSON in the project's repository. */
export const NATURAL_EARTH = {
  base: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson",
  files: [
    "ne_10m_land",
    "ne_10m_minor_islands",
    "ne_10m_rivers_lake_centerlines",
    "ne_10m_rivers_europe",
  ],
} as const;

/** Margin downloaded around each tile for the resampling filter, degrees. */
export const DOWNLOAD_MARGIN_DEG = 0.1;
