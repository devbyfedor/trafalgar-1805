import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import sharp from "sharp";
import { ORIGIN } from "../../src/components/chart/geo/mercator.ts";
import {
  HEIGHT_CODE,
  NATURAL_EARTH,
  OUT_DIR,
  SDF_CODE,
  TILES,
  type TileConfig,
} from "./config.ts";
import { etopoBands, naturalEarthFile } from "./download.ts";
import { coastField, type Ring } from "./lib/coast.ts";
import { encodeDistance, encodeHeight, sdfTail } from "./lib/encode.ts";
import { readEtopoBands } from "./lib/etopo.ts";
import { resampleToTile, type TileGrid, tileGrid } from "./lib/grid.ts";
import { extractRivers, packRivers } from "./lib/rivers.ts";

/**
 * Builds the chart's assets in public/chart/ from the raw downloads:
 *
 * - <tile>.webp per tile, lossless RGB: R and G are the height's 16-bit
 *   asinh code (high byte, low byte), B the coast's signed distance. The
 *   app decodes them on the GPU into half-float textures.
 * - lowres.bin (gzip): the overview's highest land in blocks of 4 × 4 cells,
 *   u16 metres, for placing lettering on the relief from the CPU.
 * - rivers.bin (gzip): Natural Earth rivers as world-space polylines.
 * - manifest.json: grids, encodings and files, read by the app.
 *
 * Run with `npm run data:build`, which downloads first.
 */

const LOWRES_BLOCK = 4;

type Polygon = readonly Ring[];
interface PolygonFeature {
  geometry:
    | { type: "Polygon"; coordinates: Polygon }
    | { type: "MultiPolygon"; coordinates: Polygon[] }
    | null;
}

async function readGeoJson<T>(name: string): Promise<T[]> {
  const text = await readFile(naturalEarthFile(name), "utf8");
  return (JSON.parse(text) as { features: T[] }).features;
}

function ringsOf(features: readonly PolygonFeature[]): Ring[] {
  const rings: Ring[] = [];
  for (const { geometry } of features) {
    if (!geometry) continue;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    for (const polygon of polygons) rings.push(...polygon);
  }
  return rings;
}

async function buildTile(tile: TileConfig, landGroups: Ring[][]) {
  const started = Date.now();
  const grid = tileGrid(tile);
  const source = await readEtopoBands(
    etopoBands(tile).map((band) => band.file),
  );
  const heights = resampleToTile(grid, source.values, source.lats, source.lons);
  const coast = coastField(grid, landGroups, tile.sdfRange);
  const tail = sdfTail(tile.sdfRange);

  // Natural Earth decides land and sea; ETOPO's heights follow it, so the
  // relief never pokes out of the sea and no land sits below the waterline.
  const n = grid.cols * grid.rows;
  const rgb = Buffer.alloc(n * 3);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let fixedLand = 0;
  let fixedSea = 0;
  for (let i = 0; i < n; i++) {
    let h = heights[i];
    if (coast.land[i]) {
      if (h < 0.5) {
        h = 0.5;
        fixedLand++;
      }
    } else if (h > -1) {
      h = -1;
      fixedSea++;
    }
    heights[i] = h;
    min = Math.min(min, h);
    max = Math.max(max, h);
    const code = encodeHeight(h);
    rgb[i * 3] = code >> 8;
    rgb[i * 3 + 1] = code & 255;
    rgb[i * 3 + 2] = encodeDistance(coast.distance[i], tile.sdfRange, tail);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const file = `${tile.id}.webp`;
  const image = sharp(rgb, {
    raw: { width: grid.cols, height: grid.rows, channels: 3 },
  });
  const info = await image
    .webp({ lossless: true, effort: 6, exact: true })
    .toFile(path.join(OUT_DIR, file));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `  ${tile.id}: ${grid.cols} × ${grid.rows} cells of ${grid.cellKm.toFixed(3)} km, ` +
      `heights ${min.toFixed(0)}..${max.toFixed(0)} m, ` +
      `${fixedLand} land and ${fixedSea} sea cells reconciled, ` +
      `${(info.size / 1e6).toFixed(2)} MB (${seconds} s)`,
  );
  return { grid, heights, bytes: info.size, file, tail };
}

/** Highest land in blocks of the overview, for the CPU. */
function lowres(grid: TileGrid, heights: Float32Array) {
  const cols = Math.ceil(grid.cols / LOWRES_BLOCK);
  const rows = Math.ceil(grid.rows / LOWRES_BLOCK);
  const out = new Uint16Array(cols * rows);
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i =
        Math.floor(r / LOWRES_BLOCK) * cols + Math.floor(c / LOWRES_BLOCK);
      const h = Math.max(0, Math.round(heights[r * grid.cols + c]));
      if (h > out[i]) out[i] = h;
    }
  }
  return { cols, rows, data: out };
}

async function main() {
  console.log("Natural Earth land and islands");
  const land = ringsOf(await readGeoJson<PolygonFeature>("ne_10m_land"));
  const islands = ringsOf(
    await readGeoJson<PolygonFeature>("ne_10m_minor_islands"),
  );
  console.log(`  ${land.length} land rings, ${islands.length} island rings`);

  console.log("Tiles");
  const built = [];
  for (const tile of TILES)
    built.push({ tile, ...(await buildTile(tile, [land, islands])) });

  const overview = built.find((b) => b.tile.id === "overview");
  if (!overview) throw new Error("no overview tile");
  const low = lowres(overview.grid, overview.heights);
  const lowFile = "lowres.bin";
  const lowBytes = gzipSync(Buffer.from(low.data.buffer), { level: 9 });
  await writeFile(path.join(OUT_DIR, lowFile), lowBytes);
  console.log(
    `  lowres: ${low.cols} × ${low.rows}, ${(lowBytes.length / 1e3).toFixed(0)} kB`,
  );

  console.log("Rivers");
  const g = overview.grid;
  const box = { west: g.west, east: g.east, south: g.south, north: g.north };
  type RiverFeature = Parameters<typeof extractRivers>[0][number];
  const rivers = [
    ...extractRivers(
      await readGeoJson<RiverFeature>("ne_10m_rivers_lake_centerlines"),
      box,
      9,
      0.35,
    ),
    ...extractRivers(
      await readGeoJson<RiverFeature>("ne_10m_rivers_europe"),
      box,
      10,
      0.35,
    ),
  ];
  const riverFile = "rivers.bin";
  const riverBytes = gzipSync(packRivers(rivers), { level: 9 });
  await writeFile(path.join(OUT_DIR, riverFile), riverBytes);
  const riverPoints = rivers.reduce((s, r) => s + r.points.length / 2, 0);
  console.log(
    `  ${rivers.length} polylines, ${riverPoints} points, ${(riverBytes.length / 1e3).toFixed(0)} kB`,
  );

  const manifest = {
    version: 1,
    origin: ORIGIN,
    height: HEIGHT_CODE,
    sdf: SDF_CODE,
    tiles: built.map(({ tile, grid, bytes, file, tail }) => ({
      id: tile.id,
      file,
      bytes,
      cols: grid.cols,
      rows: grid.rows,
      cellKm: grid.cellKm,
      x0: grid.x0,
      yTop: grid.yTop,
      west: grid.west,
      east: grid.east,
      south: grid.south,
      north: grid.north,
      sdfRange: tile.sdfRange,
      sdfTail: tail,
    })),
    lowres: {
      file: lowFile,
      bytes: lowBytes.length,
      cols: low.cols,
      rows: low.rows,
      cellKm: g.cellKm * LOWRES_BLOCK,
      x0: g.x0,
      yTop: g.yTop,
    },
    rivers: {
      file: riverFile,
      bytes: riverBytes.length,
      count: rivers.length,
      points: riverPoints,
    },
    sources: {
      relief:
        "NOAA NCEI ETOPO 2022 (15 arc-second, surface), via ERDDAP griddap",
      coast: `Natural Earth 5.1.2: ${NATURAL_EARTH.files.join(", ")}`,
    },
  };
  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const total =
    built.reduce((s, b) => s + b.bytes, 0) +
    lowBytes.length +
    riverBytes.length;
  console.log(`Done: ${(total / 1e6).toFixed(2)} MB in public/chart/`);
}

if (import.meta.main) await main();
