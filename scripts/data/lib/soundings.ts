import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import sharp from "sharp";
import { decodeDistance, decodeHeight, unpackTexel } from "./encode.ts";

/**
 * Soundings for the chart's detail tiles: the depths a pilot chart of the
 * period wrote over its shoal water, in fathoms, thick along the shore and
 * in the bays and thinning out to sea (docs/decisions.md, "Soundings").
 *
 * The points are laid in ranks, each a Poisson-disc set at half the spacing
 * of the one before (8 km down to 0.5 km of chart), every rank adding
 * points between those of the ranks above it, so the app can bring them in
 * by the octave as the camera comes down, as the waterlines do. A finer
 * rank reaches only so far from the coast. Each depth is ETOPO 2022's, read
 * from the built tile (so it agrees with the isobaths drawn from it):
 * halves of a fathom under ten fathoms, whole fathoms beyond, none deeper
 * than the period's deep-sea lead would find bottom (MAX_FATHOMS) and none
 * where the tile's sea floor is only the reconciliation's floor of a metre
 * (NE says sea where ETOPO had land: a salt marsh or a harbour work).
 */

export interface SoundingTile {
  id: string;
  file: string;
  cols: number;
  rows: number;
  cellKm: number;
  sdfRange: number;
}

export const SOUNDINGS = {
  /** The coarsest rank's spacing, km of chart (world km). */
  coarsestKm: 8,
  ranks: 5,
  /** A rank finer than the first lies within this many of its spacings of the coast. */
  bandSpacings: 8,
  /** Deeper than this the period's lead found no bottom: no sounding. */
  maxFathoms: 120,
  /** Shallower than this the depth is the reconciliation's floor, not data. */
  minDepthM: 1.2,
  /** Clear of the coast by this much, km. */
  minCoastKm: 0.25,
  /** Clear of the tile's edges (where the overview takes over), km. */
  edgeKm: 20,
  /** Darts thrown per point a rank can hold. */
  darts: 3,
} as const;

const FATHOM_M = 1.8288;

/** A small seeded generator (mulberry32): the same soundings every build. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Half-fathoms to write for a depth in metres, or 0 for none. */
export function halfFathoms(depthM: number): number {
  if (depthM < SOUNDINGS.minDepthM) return 0;
  const fathoms = depthM / FATHOM_M;
  if (fathoms > SOUNDINGS.maxFathoms) return 0;
  // Halves in shoal water, as the period's charts gave them.
  const half = fathoms < 10 ? Math.round(fathoms * 2) : 2 * Math.round(fathoms);
  return Math.max(1, half);
}

/** Bytes per sounding in the .bin (see writeSoundings). */
export const SOUNDING_BYTES = 8;

export interface SoundingsResult {
  file: string;
  bytes: number;
  count: number;
  perRank: number[];
}

/**
 * Builds the soundings of one detail tile from its built image in `dir`
 * and writes soundings-<id>.bin (gzip) there: per sounding, little-endian,
 * x and y as uint16 fractions of the tile's width and height (y from the
 * north), the depth in half-fathoms (uint8), the rank (uint8) and the coast
 * distance in units of 10 m of chart (uint16).
 */
export async function writeSoundings(
  tile: SoundingTile,
  dir: string,
): Promise<SoundingsResult> {
  const { data, info } = await sharp(path.join(dir, tile.file))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { cols, rows, cellKm } = tile;
  if (info.width !== cols || info.height !== rows)
    throw new Error(
      `${tile.file}: ${info.width} × ${info.height}, not ${cols} × ${rows}`,
    );
  const n = cols * rows;
  const heights = new Float32Array(n);
  const coast = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * info.channels;
    const { height16, distance } = unpackTexel(
      data[o],
      data[o + 1],
      data[o + 2],
    );
    heights[i] = decodeHeight(height16);
    coast[i] = decodeDistance(distance, tile.sdfRange) * cellKm;
  }
  // Bilinear, at a point in km from the tile's north-west corner.
  const sample = (grid: Float32Array, x: number, y: number) => {
    const c = Math.min(cols - 1.001, Math.max(0, x / cellKm - 0.5));
    const r = Math.min(rows - 1.001, Math.max(0, y / cellKm - 0.5));
    const c0 = Math.floor(c);
    const r0 = Math.floor(r);
    const fc = c - c0;
    const fr = r - r0;
    const i = r0 * cols + c0;
    return (
      (grid[i] * (1 - fc) + grid[i + 1] * fc) * (1 - fr) +
      (grid[i + cols] * (1 - fc) + grid[i + cols + 1] * fc) * fr
    );
  };

  const width = cols * cellKm;
  const height = rows * cellKm;
  const S = SOUNDINGS;
  const accepted: {
    x: number;
    y: number;
    value: number;
    rank: number;
    coast: number;
  }[] = [];
  const perRank: number[] = [];
  for (let rank = 0; rank < S.ranks; rank++) {
    const spacing = S.coarsestKm / 2 ** rank;
    const band =
      rank === 0 ? Number.POSITIVE_INFINITY : S.bandSpacings * spacing;
    const rand = random(seedOf(`${tile.id}:${rank}`));
    // Darts in the cells this rank may use, a few per point it can hold.
    const perCell = (S.darts * cellKm * cellKm) / (spacing * spacing);
    const darts: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = coast[r * cols + c];
        if (d < S.minCoastKm || d > band) continue;
        let k = Math.floor(perCell) + (rand() < perCell % 1 ? 1 : 0);
        while (k-- > 0)
          darts.push((c + rand()) * cellKm, (r + rand()) * cellKm);
      }
    }
    // Shuffled, then each kept if no point so far lies within the spacing.
    const count = darts.length / 2;
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[i] = i;
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    const gcols = Math.ceil(width / spacing);
    const grows = Math.ceil(height / spacing);
    const grid = new Map<number, number[]>();
    const key = (gx: number, gy: number) => gy * gcols + gx;
    const place = (x: number, y: number, index: number) => {
      const k = key(Math.floor(x / spacing), Math.floor(y / spacing));
      const list = grid.get(k);
      if (list) list.push(index);
      else grid.set(k, [index]);
    };
    for (const [i, p] of accepted.entries()) place(p.x, p.y, i);
    const near = (x: number, y: number) => {
      const gx = Math.floor(x / spacing);
      const gy = Math.floor(y / spacing);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ux = gx + dx;
          const uy = gy + dy;
          if (ux < 0 || uy < 0 || ux >= gcols || uy >= grows) continue;
          for (const j of grid.get(key(ux, uy)) ?? []) {
            const q = accepted[j];
            if ((q.x - x) ** 2 + (q.y - y) ** 2 < spacing * spacing)
              return true;
          }
        }
      }
      return false;
    };
    let kept = 0;
    for (const i of order) {
      const x = darts[2 * i];
      const y = darts[2 * i + 1];
      if (
        x < S.edgeKm ||
        y < S.edgeKm ||
        x > width - S.edgeKm ||
        y > height - S.edgeKm
      )
        continue;
      const d = sample(coast, x, y);
      if (d < S.minCoastKm || d > band) continue;
      const value = halfFathoms(-sample(heights, x, y));
      if (value === 0 || near(x, y)) continue;
      accepted.push({ x, y, value, rank, coast: d });
      place(x, y, accepted.length - 1);
      kept++;
    }
    perRank.push(kept);
  }

  const out = Buffer.alloc(accepted.length * SOUNDING_BYTES);
  for (const [i, s] of accepted.entries()) {
    const o = i * SOUNDING_BYTES;
    out.writeUInt16LE(Math.round((s.x / width) * 65535), o);
    out.writeUInt16LE(Math.round((s.y / height) * 65535), o + 2);
    out.writeUInt8(s.value, o + 4);
    out.writeUInt8(s.rank, o + 5);
    out.writeUInt16LE(Math.min(65535, Math.round(s.coast * 100)), o + 6);
  }
  const file = `soundings-${tile.id}.bin`;
  const bytes = gzipSync(out, { level: 9 });
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), bytes);
  return { file, bytes: bytes.length, count: accepted.length, perRank };
}
