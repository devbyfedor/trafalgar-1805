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

/** The overview's highest land per block, for placing things on the relief. */
export interface LowresHeights {
  cols: number;
  rows: number;
  cellKm: number;
  x0: number;
  yTop: number;
  data: Uint16Array;
}

export async function loadLowres(
  manifest: ChartManifest,
  signal?: AbortSignal,
): Promise<LowresHeights> {
  const { file, ...grid } = manifest.lowres;
  const buffer = await loadGzip(file, signal);
  return { ...grid, data: new Uint16Array(buffer) };
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
  return best;
}

export interface RiverData {
  /** Offsets into `points` (in points), count + 1 entries. */
  offsets: Uint32Array;
  /** Interleaved world x, y, km. */
  points: Float32Array;
  /** Natural Earth scalerank per river (0 = greatest). */
  ranks: Uint8Array;
}

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
  const points = new Float32Array(
    buffer.slice(pointsStart, pointsStart + total * 8),
  );
  const ranks = new Uint8Array(buffer, pointsStart + total * 8, count);
  return { offsets, points, ranks: ranks.slice() };
}
