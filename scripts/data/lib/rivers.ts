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
  /** Interleaved world x, y in km, from the source downstream. */
  points: Float32Array;
  /** Per point, the distance from the river's source along it, km. */
  flow: Float32Array;
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
          const points = Float32Array.from(simplify(run, tolerance));
          rivers.push({
            rank: properties.scalerank,
            points,
            flow: new Float32Array(points.length / 2),
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

function lineLength(xy: Float32Array): number {
  let length = 0;
  for (let i = 2; i < xy.length; i += 2)
    length += Math.hypot(xy[i] - xy[i - 2], xy[i + 1] - xy[i - 1]);
  return length;
}

function reverseLine(xy: Float32Array): void {
  for (let i = 0, j = xy.length - 2; i < j; i += 2, j -= 2) {
    const x = xy[i];
    const y = xy[i + 1];
    xy[i] = xy[j];
    xy[i + 1] = xy[j + 1];
    xy[j] = x;
    xy[j + 1] = y;
  }
}

/**
 * Orders each river from its source down to its mouth and measures how far
 * each point lies from the source, so the renderer can taper it as the
 * engravers did: a hairline at the source, widening downstream
 * (docs/research/scene-02/t4-chart-style.md, section 5). Natural Earth
 * digitises rivers from source to mouth; a line whose ends clearly say
 * otherwise (`heightAt`, the valley floor's height in metres) is turned
 * round. A line that begins where another ends carries on that one's
 * distance (the Tajo into the Tagus, the Rhein into the Rhine), so a river
 * cut into pieces tapers as one. Returns how many lines were turned round
 * and how many carry on another.
 */
export function measureFlow(
  rivers: River[],
  heightAt: (x: number, y: number) => number,
  joinKm = 1.5,
): { reversed: number; joined: number } {
  let reversed = 0;
  for (const r of rivers) {
    const p = r.points;
    const n = p.length;
    const rise = heightAt(p[0], p[1]) - heightAt(p[n - 2], p[n - 1]);
    if (rise < -50) {
      reverseLine(p);
      reversed++;
    }
  }
  // Each line's source, bucketed, to find the lines a mouth runs into.
  const cell = 2 * joinKm;
  const key = (x: number, y: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const sources = new Map<string, number[]>();
  rivers.forEach((r, i) => {
    const k = key(r.points[0], r.points[1]);
    const list = sources.get(k);
    if (list) list.push(i);
    else sources.set(k, [i]);
  });
  const next: number[][] = rivers.map(() => []);
  const incoming = new Int32Array(rivers.length);
  rivers.forEach((r, i) => {
    const p = r.points;
    const mx = p[p.length - 2];
    const my = p[p.length - 1];
    const cx = Math.floor(mx / cell);
    const cy = Math.floor(my / cell);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of sources.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (j === i) continue;
          const q = rivers[j].points;
          if (Math.hypot(q[0] - mx, q[1] - my) > joinKm) continue;
          next[i].push(j);
          incoming[j]++;
        }
      }
    }
  });
  // Longest distance from a source, in an order where every line comes
  // after the lines that run into it (lines in a loop keep their own).
  const lengths = rivers.map((r) => lineLength(r.points));
  const start = new Float64Array(rivers.length);
  const queue: number[] = [];
  incoming.forEach((n, i) => {
    if (n === 0) queue.push(i);
  });
  let joined = 0;
  while (queue.length) {
    const i = queue.pop() as number;
    for (const j of next[i]) {
      start[j] = Math.max(start[j], start[i] + lengths[i]);
      if (--incoming[j] === 0) {
        queue.push(j);
        joined++;
      }
    }
  }
  rivers.forEach((r, i) => {
    const p = r.points;
    let s = start[i];
    r.flow[0] = s;
    for (let k = 1; k < p.length / 2; k++) {
      s += Math.hypot(p[k * 2] - p[k * 2 - 2], p[k * 2 + 1] - p[k * 2 - 1]);
      r.flow[k] = s;
    }
  });
  return { reversed, joined };
}

/**
 * Binary layout, little-endian: u32 count, u32 total points, u32 offsets
 * (count + 1, in points), f32 xy pairs, u16 flow (total, whole km from
 * the source), u8 ranks (count).
 */
export function packRivers(rivers: readonly River[]): Uint8Array {
  const count = rivers.length;
  const total = rivers.reduce((sum, r) => sum + r.points.length / 2, 0);
  const bytes = 8 + (count + 1) * 4 + total * 10 + count;
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
  for (const r of rivers) {
    for (const v of r.flow) {
      view.setUint16(p, Math.min(65535, Math.round(v)), true);
      p += 2;
    }
  }
  rivers.forEach((r, i) => {
    view.setUint8(p + i, r.rank);
  });
  return new Uint8Array(buffer);
}
