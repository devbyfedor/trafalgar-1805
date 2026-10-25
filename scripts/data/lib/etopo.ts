import { readFile } from "node:fs/promises";
import { NetCDFReader } from "netcdfjs";

/**
 * Reads the ERDDAP NetCDF bands of one tile and joins them into a single
 * grid: rows of ascending latitude, columns of ascending longitude, heights
 * in metres (ETOPO 2022 surface elevation, EGM2008).
 */
export interface SourceGrid {
  lats: Float64Array;
  lons: Float64Array;
  values: Float32Array;
}

export async function readEtopoBands(
  files: readonly string[],
): Promise<SourceGrid> {
  const rows = new Map<string, { lat: number; values: Float32Array }>();
  let lons: Float64Array | null = null;
  for (const file of files) {
    const reader = new NetCDFReader(await readFile(file));
    const lat = reader.getDataVariable("latitude") as number[];
    const lon = reader.getDataVariable("longitude") as number[];
    const z = reader.getDataVariable("z") as number[];
    if (!lons) lons = Float64Array.from(lon);
    else if (lon.length !== lons.length || Math.abs(lon[0] - lons[0]) > 1e-9) {
      throw new Error(`${file}: longitudes differ from the first band`);
    }
    for (let r = 0; r < lat.length; r++) {
      const key = lat[r].toFixed(7);
      if (rows.has(key)) continue;
      const values = new Float32Array(lon.length);
      for (let c = 0; c < lon.length; c++) {
        const v = z[r * lon.length + c];
        if (!Number.isFinite(v))
          throw new Error(`${file}: missing value at ${lat[r]}, ${lon[c]}`);
        values[c] = v;
      }
      rows.set(key, { lat: lat[r], values });
    }
  }
  if (!lons) throw new Error("no bands");
  const sorted = [...rows.values()].sort((a, b) => a.lat - b.lat);
  const values = new Float32Array(sorted.length * lons.length);
  for (const [r, row] of sorted.entries())
    values.set(row.values, r * lons.length);
  // Rows must be evenly spaced: a gap means a band failed silently.
  const step = sorted[1].lat - sorted[0].lat;
  for (let r = 1; r < sorted.length; r++) {
    if (Math.abs(sorted[r].lat - sorted[r - 1].lat - step) > step * 0.01) {
      throw new Error(
        `latitude gap between ${sorted[r - 1].lat} and ${sorted[r].lat}`,
      );
    }
  }
  return {
    lats: Float64Array.from(sorted.map((row) => row.lat)),
    lons,
    values,
  };
}
