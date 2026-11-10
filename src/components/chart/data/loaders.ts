import { SLICE_MS, Slicer } from "../engine/slice";
import { CHART_BASE, type ChartManifest } from "./manifest";

/**
 * Fetching the chart's assets. Images are decoded by the browser off the
 * main thread (createImageBitmap) with no colour conversion or
 * premultiplication, so their bytes arrive exactly as the build wrote them.
 * The small binaries are gzip, unpacked with the native DecompressionStream.
 */

export async function loadBitmap(
  file: string,
  signal?: AbortSignal,
): Promise<ImageBitmap> {
  const response = await fetch(`${CHART_BASE}${file}`, { signal });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const blob = await response.blob();
  return createImageBitmap(blob, {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
}

async function loadGzip(
  file: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await fetch(`${CHART_BASE}${file}`, { signal });
  if (!response.ok || !response.body)
    throw new Error(`${file}: HTTP ${response.status}`);
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/**
 * The highest land per cell of a coarse grid over the surround: where the
 * terrain needs detail, and where lettering clears the relief.
 */
export interface LowresHeights {
  cols: number;
  rows: number;
  cellKm: number;
  /** Metres per step of `data` (0 is sea). */
  stepM: number;
  x0: number;
  yTop: number;
  data: Uint8Array;
}

export async function loadLowres(
  manifest: ChartManifest,
  signal?: AbortSignal,
): Promise<LowresHeights> {
  const { file, ...grid } = manifest.lowres;
  const buffer = await loadGzip(file, signal);
  return { ...grid, data: new Uint8Array(buffer) };
}

/** Highest land (metres) around a world point, within `radiusKm`. */
export function highestLand(
  low: LowresHeights,
  x: number,
  y: number,
  radiusKm: number,
): number {
  const c0 = Math.floor((x - radiusKm - low.x0) / low.cellKm);
  const c1 = Math.floor((x + radiusKm - low.x0) / low.cellKm);
  const r0 = Math.floor((low.yTop - (y + radiusKm)) / low.cellKm);
  const r1 = Math.floor((low.yTop - (y - radiusKm)) / low.cellKm);
  let best = 0;
  for (let r = Math.max(0, r0); r <= Math.min(low.rows - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(low.cols - 1, c1); c++) {
      best = Math.max(best, low.data[r * low.cols + c]);
    }
  }
  return best * low.stepM;
}

/**
 * Whether any land lies within `marginKm` of a square (world km), in
 * constant time: a summed-area table counts the land blocks of the low
 * resolution grid. Beyond the stage there is only open sea.
 */
export async function landIndex(
  low: LowresHeights,
  signal?: AbortSignal,
): Promise<{
  /** True when a square (world km) or a margin around it holds any land. */
  any: (x0: number, y0: number, size: number, marginKm: number) => boolean;
}> {
  const { cols, rows, cellKm, data } = low;
  const w = cols + 1;
  const sums = new Uint32Array(w * (rows + 1));
  // By rows, in idle slices: in one go it was a 25 ms task as the chart
  // loaded (engine/slice.ts).
  const slicer = new Slicer(SLICE_MS, signal);
  for (let r = 0; r < rows; r++) {
    let line = 0;
    for (let c = 0; c < cols; c++) {
      line += data[r * cols + c] > 0 ? 1 : 0;
      sums[(r + 1) * w + c + 1] = sums[r * w + c + 1] + line;
    }
    await slicer.check();
  }
  // Land cells in a square with a margin (none past the grid's edge, which
  // is open sea).
  const count = (x0: number, y0: number, size: number, marginKm: number) => {
    const c0 = Math.max(0, Math.floor((x0 - marginKm - low.x0) / cellKm));
    const c1 = Math.min(
      cols - 1,
      Math.floor((x0 + size + marginKm - low.x0) / cellKm),
    );
    const r0 = Math.max(
      0,
      Math.floor((low.yTop - (y0 + size + marginKm)) / cellKm),
    );
    const r1 = Math.min(
      rows - 1,
      Math.floor((low.yTop - (y0 - marginKm)) / cellKm),
    );
    if (c0 > c1 || r0 > r1) return 0;
    return (
      sums[(r1 + 1) * w + c1 + 1] -
      sums[r0 * w + c1 + 1] -
      sums[(r1 + 1) * w + c0] +
      sums[r0 * w + c0]
    );
  };
  return {
    any: (x0, y0, size, marginKm) => count(x0, y0, size, marginKm) > 0,
  };
}

export interface RiverData {
  /** Offsets into `points` (in points), count + 1 entries. */
  offsets: Uint32Array;
  /** Interleaved world x, y, km, each river from its source downstream. */
  points: Float32Array;
  /** Per point, the distance from the river's source along it, whole km. */
  flow: Uint16Array;
  /** Natural Earth scalerank per river (0 = greatest). */
  ranks: Uint8Array;
}

/** rivers.bin: the layout scripts/data/lib/rivers.ts (packRivers) writes. */
export async function loadRivers(
  manifest: ChartManifest,
  signal?: AbortSignal,
): Promise<RiverData> {
  const buffer = await loadGzip(manifest.rivers.file, signal);
  const view = new DataView(buffer);
  const count = view.getUint32(0, true);
  const total = view.getUint32(4, true);
  const offsets = new Uint32Array(buffer.slice(8, 8 + (count + 1) * 4));
  const pointsStart = 8 + (count + 1) * 4;
  const flowStart = pointsStart + total * 8;
  const ranksStart = flowStart + total * 2;
  const points = new Float32Array(buffer.slice(pointsStart, flowStart));
  const flow = new Uint16Array(buffer.slice(flowStart, ranksStart));
  const ranks = new Uint8Array(buffer, ranksStart, count);
  return { offsets, points, flow, ranks: ranks.slice() };
}

/** One detail tile's soundings (scripts/data/lib/soundings.ts). */
export interface SoundingSet {
  tile: string;
  count: number;
  /** Interleaved per sounding: world x, y (km), depth in half-fathoms, rank. */
  points: Float32Array;
  /** Per sounding, the distance from the coast, km of chart. */
  coastKm: Float32Array;
}

export interface SoundingsIndex {
  version: number;
  /** The coarsest rank's spacing, km of chart; each rank halves it. */
  coarsestKm: number;
  ranks: number;
  sets: { tile: string; file: string; bytes: number; count: number }[];
}

/**
 * soundings.json and each detail tile's soundings-<tile>.bin: 8 bytes a
 * sounding (x and y as uint16 fractions of the tile, y from the north;
 * half-fathoms; rank; coast distance in tens of metres). None when the
 * index is missing, so a chart without soundings still runs.
 */
export async function loadSoundings(
  manifest: ChartManifest,
  signal?: AbortSignal,
): Promise<{ index: SoundingsIndex; sets: SoundingSet[] } | null> {
  const response = await fetch(`${CHART_BASE}soundings.json`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`soundings: HTTP ${response.status}`);
  const index = (await response.json()) as SoundingsIndex;
  const sets: SoundingSet[] = [];
  for (const entry of index.sets) {
    const tile = manifest.tiles.find((t) => t.id === entry.tile);
    if (!tile) continue;
    const view = new DataView(await loadGzip(entry.file, signal));
    const count = Math.floor(view.byteLength / 8);
    const width = tile.cols * tile.cellKm;
    const height = tile.rows * tile.cellKm;
    const points = new Float32Array(count * 4);
    const coastKm = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const o = i * 8;
      points[i * 4] = tile.x0 + (view.getUint16(o, true) / 65535) * width;
      points[i * 4 + 1] =
        tile.yTop - (view.getUint16(o + 2, true) / 65535) * height;
      points[i * 4 + 2] = view.getUint8(o + 4);
      points[i * 4 + 3] = view.getUint8(o + 5);
      coastKm[i] = view.getUint16(o + 6, true) / 100;
    }
    sets.push({ tile: entry.tile, count, points, coastKm });
  }
  return { index, sets };
}
