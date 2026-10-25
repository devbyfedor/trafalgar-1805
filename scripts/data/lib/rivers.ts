import { worldX, worldY } from "../../../src/components/chart/geo/mercator.ts";

/**
 * Rivers from Natural Earth as world-space polylines (km), simplified and
 * ranked. Natural Earth's scalerank runs from 0 (the greatest rivers) up;
 * the renderer thins the minor ones out as the camera pulls back.
 */

type Position = readonly [number, number];

interface LineFeature {
  properties: { scalerank: number; featurecla: string; name: string | null };
  geometry:
    | { type: "LineString"; coordinates: Position[] }
    | { type: "MultiLineString"; coordinates: Position[][] }
    | null;
}

export interface River {
  rank: number;
  /** Interleaved world x, y in km. */
  points: Float32Array;
}

/** Douglas–Peucker on interleaved xy pairs. */
function simplify(xy: number[], tolerance: number): number[] {
  const n = xy.length / 2;
  if (n < 3) return xy;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  const t2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const ax = xy[a * 2];
    const ay = xy[a * 2 + 1];
    const dx = xy[b * 2] - ax;
    const dy = xy[b * 2 + 1] - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    let worst = -1;
    let worstD2 = t2;
    for (let i = a + 1; i < b; i++) {
      const px = xy[i * 2] - ax;
      const py = xy[i * 2 + 1] - ay;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const ex = px - t * dx;
      const ey = py - t * dy;
      const d2 = ex * ex + ey * ey;
      if (d2 > worstD2) {
        worstD2 = d2;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(xy[i * 2], xy[i * 2 + 1]);
  return out;
}

export function extractRivers(
  features: readonly LineFeature[],
  box: { west: number; east: number; south: number; north: number },
  maxRank: number,
  tolerance: number,
): River[] {
  const rivers: River[] = [];
  for (const feature of features) {
    const { geometry, properties } = feature;
    if (!geometry || properties.scalerank > maxRank) continue;
    const lines =
      geometry.type === "LineString"
        ? [geometry.coordinates]
        : geometry.coordinates;
    for (const line of lines) {
      // Split where the line leaves the box.
      let run: number[] = [];
      const flush = () => {
        if (run.length >= 4) {
          rivers.push({
            rank: properties.scalerank,
            points: Float32Array.from(simplify(run, tolerance)),
          });
        }
        run = [];
      };
      for (const [lon, lat] of line) {
        const inside =
          lon >= box.west &&
          lon <= box.east &&
          lat >= box.south &&
          lat <= box.north;
        if (inside) run.push(worldX(lon), worldY(lat));
        else flush();
      }
      flush();
    }
  }
  return rivers;
}

/**
 * Binary layout, little-endian: u32 count, u32 total points, u32 offsets
 * (count + 1, in points), f32 xy pairs, u8 ranks (count).
 */
export function packRivers(rivers: readonly River[]): Uint8Array {
  const count = rivers.length;
  const total = rivers.reduce((sum, r) => sum + r.points.length / 2, 0);
  const bytes = 8 + (count + 1) * 4 + total * 8 + count;
  const buffer = new ArrayBuffer(Math.ceil(bytes / 4) * 4);
  const view = new DataView(buffer);
  view.setUint32(0, count, true);
  view.setUint32(4, total, true);
  let offset = 0;
  rivers.forEach((r, i) => {
    view.setUint32(8 + i * 4, offset, true);
    offset += r.points.length / 2;
  });
  view.setUint32(8 + count * 4, offset, true);
  let p = 8 + (count + 1) * 4;
  for (const r of rivers) {
    for (const v of r.points) {
      view.setFloat32(p, v, true);
      p += 4;
    }
  }
  rivers.forEach((r, i) => {
    view.setUint8(p + i, r.rank);
  });
  return new Uint8Array(buffer);
}
