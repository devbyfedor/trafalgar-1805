import type { TileGrid } from "./grid.ts";
import { toGrid } from "./grid.ts";

/**
 * The coast field of a tile from Natural Earth land polygons:
 * - `land`: 1 where a cell centre lies on land (even-odd scanline fill);
 * - `distance`: signed distance to the coast in cells, positive at sea,
 *   exact within a few cells of the coast and from a Euclidean distance
 *   transform further out, clamped to `range`.
 */

export type Ring = readonly (readonly [number, number])[];

interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Rings in grid coordinates (cell centres at k + 0.5). */
function projectRings(grid: TileGrid, rings: readonly Ring[]): Float64Array[] {
  return rings.map((ring) => {
    const out = new Float64Array(ring.length * 2);
    ring.forEach(([lon, lat], i) => {
      const [x, y] = toGrid(grid, lon, lat);
      out[i * 2] = x;
      out[i * 2 + 1] = y;
    });
    return out;
  });
}

function fillLand(grid: TileGrid, rings: Float64Array[]): Uint8Array {
  const { cols, rows } = grid;
  const crossings: number[][] = Array.from({ length: rows }, () => []);
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const x1 = ring[i * 2];
      const y1 = ring[i * 2 + 1];
      const x2 = ring[i * 2 + 2];
      const y2 = ring[i * 2 + 3];
      if (y1 === y2) continue;
      const lo = Math.min(y1, y2);
      const hi = Math.max(y1, y2);
      // Rows whose centre y = r + 0.5 lies in [lo, hi).
      const r0 = Math.max(0, Math.ceil(lo - 0.5));
      const r1 = Math.min(rows - 1, Math.ceil(hi - 0.5) - 1);
      for (let r = r0; r <= r1; r++) {
        const yc = r + 0.5;
        crossings[r].push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
  }
  const land = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const xs = crossings[r].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      // Cells whose centre c + 0.5 lies in [xs[k], xs[k + 1]).
      const c0 = Math.max(0, Math.ceil(xs[k] - 0.5));
      const c1 = Math.min(cols - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let c = c0; c <= c1; c++) land[r * cols + c] = 1;
    }
  }
  return land;
}

function collectSegments(
  grid: TileGrid,
  rings: Float64Array[],
  margin: number,
): Segment[] {
  const segments: Segment[] = [];
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const ax = ring[i * 2];
      const ay = ring[i * 2 + 1];
      const bx = ring[i * 2 + 2];
      const by = ring[i * 2 + 3];
      if (ax === bx && ay === by) continue;
      if (Math.max(ax, bx) < -margin || Math.min(ax, bx) > grid.cols + margin)
        continue;
      if (Math.max(ay, by) < -margin || Math.min(ay, by) > grid.rows + margin)
        continue;
      segments.push({ ax, ay, bx, by });
    }
  }
  return segments;
}

/** Squared distance from a point to a segment. */
function segmentDistance2(px: number, py: number, s: Segment): number {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = s.ax + t * dx - px;
  const ey = s.ay + t * dy - py;
  return ex * ex + ey * ey;
}

/** One-dimensional squared distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(
  f: Float64Array,
  n: number,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = Number.NEGATIVE_INFINITY;
  z[1] = Number.POSITIVE_INFINITY;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Number.POSITIVE_INFINITY;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** Squared Euclidean distance (in cells) from every cell to the nearest seed. */
function distanceTransform(
  seed: Uint8Array,
  cols: number,
  rows: number,
): Float64Array {
  const INF = 1e20;
  const n = Math.max(cols, rows);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const out = new Float64Array(cols * rows);
  for (let i = 0; i < out.length; i++) out[i] = seed[i] ? 0 : INF;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) f[r] = out[r * cols + c];
    edt1d(f, rows, d, v, z);
    for (let r = 0; r < rows; r++) out[r * cols + c] = d[r];
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) f[c] = out[r * cols + c];
    edt1d(f, cols, d, v, z);
    for (let c = 0; c < cols; c++) out[r * cols + c] = d[c];
  }
  return out;
}

export interface CoastField {
  land: Uint8Array;
  /** Signed distance to the coast in cells, positive at sea. */
  distance: Float32Array;
}

/**
 * `groups` are filled separately (even-odd within a group) and combined, so
 * an island layer that touches the mainland never cuts a hole in it.
 */
export function coastField(
  grid: TileGrid,
  groups: readonly (readonly Ring[])[],
  range: number,
): CoastField {
  const { cols, rows } = grid;
  const land = new Uint8Array(cols * rows);
  const segments: Segment[] = [];
  for (const rings of groups) {
    const projected = projectRings(grid, rings);
    const fill = fillLand(grid, projected);
    for (let i = 0; i < fill.length; i++) land[i] |= fill[i];
    segments.push(...collectSegments(grid, projected, range + 2));
  }

  // Seeds: every cell a coastline segment passes through.
  const seed = new Uint8Array(cols * rows);
  for (const s of segments) {
    const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
    const steps = Math.max(1, Math.ceil(len * 4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const c = Math.floor(s.ax + t * (s.bx - s.ax));
      const r = Math.floor(s.ay + t * (s.by - s.ay));
      if (c >= 0 && c < cols && r >= 0 && r < rows) seed[r * cols + c] = 1;
    }
  }
  const edt = distanceTransform(seed, cols, rows);

  // Buckets of segments for the exact distances near the coast.
  const B = 8;
  const bcols = Math.ceil(cols / B) + 2;
  const brows = Math.ceil(rows / B) + 2;
  const buckets: number[][] = Array.from({ length: bcols * brows }, () => []);
  const bucketOf = (x: number, y: number) => [
    Math.min(bcols - 1, Math.max(0, Math.floor(x / B) + 1)),
    Math.min(brows - 1, Math.max(0, Math.floor(y / B) + 1)),
  ];
  segments.forEach((s, i) => {
    const [c0, r0] = bucketOf(Math.min(s.ax, s.bx), Math.min(s.ay, s.by));
    const [c1, r1] = bucketOf(Math.max(s.ax, s.bx), Math.max(s.ay, s.by));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) buckets[r * bcols + c].push(i);
    }
  });

  const EXACT = 6;
  const distance = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      let dist = Math.sqrt(edt[i]);
      if (dist <= EXACT) {
        const px = c + 0.5;
        const py = r + 0.5;
        const reach = dist + 1.5;
        const [bc0, br0] = bucketOf(px - reach, py - reach);
        const [bc1, br1] = bucketOf(px + reach, py + reach);
        let best = Number.POSITIVE_INFINITY;
        for (let br = br0; br <= br1; br++) {
          for (let bc = bc0; bc <= bc1; bc++) {
            for (const k of buckets[br * bcols + bc]) {
              const d2 = segmentDistance2(px, py, segments[k]);
              if (d2 < best) best = d2;
            }
          }
        }
        if (Number.isFinite(best)) dist = Math.sqrt(best);
      } else {
        // The transform measures to seed-cell centres; on average the coast
        // itself is a little nearer.
        dist = Math.max(EXACT, dist - 0.35);
      }
      dist = Math.min(range, dist);
      distance[i] = land[i] ? -dist : dist;
    }
  }
  return { land, distance };
}
