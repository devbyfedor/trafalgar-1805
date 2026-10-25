import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DOWNLOAD_MARGIN_DEG,
  ETOPO,
  NATURAL_EARTH,
  RAW_DIR,
  TILES,
  type TileConfig,
} from "./config.ts";

/**
 * Downloads the raw data into data/raw/ (git-ignored), skipping files that
 * are already there; `--force` downloads everything again.
 *
 * - ETOPO 2022 (NOAA NCEI, public domain): only each tile's region, through
 *   ERDDAP griddap subsetting with a stride over the 15″ grid, split into
 *   latitude bands so no request is huge. Never the global grid.
 * - Natural Earth 5.1.2 (public domain): land, minor islands and rivers.
 */

const force = process.argv.includes("--force");

async function exists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function fetchTo(url: string, file: string, attempts = 4) {
  if (!force && (await exists(file))) {
    console.log(`  have ${path.relative(RAW_DIR, file)}`);
    return;
  }
  await mkdir(path.dirname(file), { recursive: true });
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const started = Date.now();
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15 * 60_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const partial = `${file}.part`;
      await writeFile(partial, bytes);
      await rename(partial, file);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const mb = (bytes.length / 1e6).toFixed(1);
      console.log(
        `  got ${path.relative(RAW_DIR, file)} (${mb} MB, ${seconds} s)`,
      );
      return;
    } catch (error) {
      console.warn(`  attempt ${attempt} failed for ${url}: ${error}`);
      await rm(`${file}.part`, { force: true });
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
    }
  }
}

/** Index of the 15″ cell containing a latitude or longitude (from `start`). */
const cellIndex = (value: number, start: number) =>
  Math.floor((value - start) / ETOPO.sourceCellDeg);

/**
 * The latitude bands of one tile's download, south to north. Requests use
 * grid indices, so every band keeps the same stride phase: requesting by
 * value would restart the stride at each band's first row.
 */
export function etopoBands(tile: TileConfig) {
  // The grid's northern edge can pass the configured minimum by one row.
  const north = tile.north + DOWNLOAD_MARGIN_DEG + tile.cellArcSec / 3600;
  const lat0 = cellIndex(tile.south - DOWNLOAD_MARGIN_DEG, -90);
  const lat1 = cellIndex(north, -90);
  const lon0 = cellIndex(tile.west - DOWNLOAD_MARGIN_DEG, -180);
  const lon1 = cellIndex(tile.east + DOWNLOAD_MARGIN_DEG, -180);
  const band = tile.rowsPerRequest * tile.stride;
  const bands: { file: string; url: string }[] = [];
  for (let start = lat0, i = 0; start <= lat1; start += band, i++) {
    // Bands overlap by one sample row; the reader de-duplicates.
    const end = Math.min(lat1, start + band);
    const query = `z[${start}:${tile.stride}:${end}][${lon0}:${tile.stride}:${lon1}]`;
    bands.push({
      file: path.join(
        RAW_DIR,
        "etopo",
        `${tile.id}-${String(i).padStart(2, "0")}.nc`,
      ),
      url: `${ETOPO.server}/${ETOPO.dataset}.nc?${encodeURIComponent(query)}`,
    });
  }
  return bands;
}

export function naturalEarthFile(name: string): string {
  return path.join(RAW_DIR, "natural-earth", `${name}.geojson`);
}

async function main() {
  console.log("ETOPO 2022 (ERDDAP griddap subsets)");
  for (const tile of TILES) {
    for (const band of etopoBands(tile)) await fetchTo(band.url, band.file);
  }
  console.log("Natural Earth 5.1.2");
  for (const name of NATURAL_EARTH.files) {
    await fetchTo(
      `${NATURAL_EARTH.base}/${name}.geojson`,
      naturalEarthFile(name),
    );
  }
}

if (import.meta.main) await main();
