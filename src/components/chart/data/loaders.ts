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
export function landIndex(
  low: LowresHeights,
): (x0: number, y0: number, size: number, marginKm: number) => boolean {
  const { cols, rows, cellKm, data } = low;
  const w = cols + 1;
  const sums = new Uint32Array(w * (rows + 1));
  for (let r = 0; r < rows; r++) {
    let line = 0;
    for (let c = 0; c < cols; c++) {
      line += data[r * cols + c] > 0 ? 1 : 0;
      sums[(r + 1) * w + c + 1] = sums[r * w + c + 1] + line;
    }
  }
  return (x0, y0, size, marginKm) => {
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
    if (c0 > c1 || r0 > r1) return false;
    const count =
      sums[(r1 + 1) * w + c1 + 1] -
      sums[r0 * w + c1 + 1] -
      sums[(r1 + 1) * w + c0] +
      sums[r0 * w + c0];
    return count > 0;
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
