import { Box3, type Frustum, type Vector3 } from "three";

/**
 * Continuous distance-dependent level of detail (after Strugar, 2009) for
 * the chart's surface. A quadtree over a square larger than the stage, so
 * the open sea runs on to the horizon. Every selected node is drawn as the
 * same N × N grid patch; a node splits while the camera is nearer than
 * `cellSize × k`, k chosen so a grid cell stays a few pixels on screen.
 * Vertices morph toward the next coarser grid over the last 30 % of a
 * node's range, so neighbouring levels meet without popping.
 *
 * Open sea is flat, so a node with no land in or near it needs no finer
 * grid: it splits only while the camera is nearer than its size, which
 * keeps culling fine-grained near the camera. That leaves neighbours
 * several levels apart; every patch has skirts, so their seams never open.
 *
 * Distances are measured to the flat chart (z = 0) plus the camera's
 * altitude, the same metric the vertex shader uses for morphing.
 */

export interface CdlodOptions {
  /** World x, y of the root square's south-west corner, and its size, km. */
  x0: number;
  y0: number;
  size: number;
  /** Cells per patch side. */
  grid: number;
  maxDepth: number;
}

/** True when a square (world km) and a margin around it hold no land. */
export type LandQuery = (
  x0: number,
  y0: number,
  size: number,
  marginKm: number,
) => boolean;

/** Margin around a node within which land keeps it splitting, km. */
const LAND_MARGIN_KM = 25;

export class Cdlod {
  /** Per selected node: x0, y0, size, morph end distance. */
  readonly instances: Float32Array;
  count = 0;
  /** Split factor: a node splits while nearer than its cell size × k. */
  k = 160;
  /** Beyond this distance the haze hides the chart: no node splits there. */
  detailLimit = Number.POSITIVE_INFINITY;
  /** Where the land is; without it every node is treated as land. */
  hasLand: LandQuery | null = null;

  private readonly stack: Float64Array;
  private readonly box = new Box3();
  private readonly capacity: number;

  constructor(
    readonly options: CdlodOptions,
    capacity = 1536,
  ) {
    this.capacity = capacity;
    this.instances = new Float32Array(capacity * 4);
    // x0, y0, size, depth per pending node; depth-first needs little room.
    this.stack = new Float64Array(4 * 4 * (options.maxDepth + 2));
  }

  /** Sets k so a grid cell covers about `cellPx` pixels on a screen `heightPx` tall. */
  setResolution(heightPx: number, fovDeg: number, cellPx: number): void {
    const pxPerRadian = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.k = pxPerRadian / cellPx;
  }

  /**
   * Selects the nodes to draw for a camera at `eye`, culled by `frustum`.
   * `maxZ` bounds the displaced surface's height (km), for culling.
   */
  select(eye: Vector3, frustum: Frustum, maxZ: number): number {
    const { grid, maxDepth } = this.options;
    const stack = this.stack;
    let sp = 0;
    stack[sp++] = this.options.x0;
    stack[sp++] = this.options.y0;
    stack[sp++] = this.options.size;
    stack[sp++] = 0;
    let count = 0;
    while (sp > 0) {
      const depth = stack[--sp];
      const size = stack[--sp];
      const y0 = stack[--sp];
      const x0 = stack[--sp];
      const land =
        this.hasLand === null || this.hasLand(x0, y0, size, LAND_MARGIN_KM);
      this.box.min.set(x0, y0, -0.5);
      this.box.max.set(x0 + size, y0 + size, land ? maxZ : 0);
      if (!frustum.intersectsBox(this.box)) continue;
      const cell = size / grid;
      const dx = Math.max(x0 - eye.x, 0, eye.x - (x0 + size));
      const dy = Math.max(y0 - eye.y, 0, eye.y - (y0 + size));
      const distance = Math.sqrt(dx * dx + dy * dy + eye.z * eye.z);
      const splitAt = land ? cell * this.k : size;
      if (
        depth < maxDepth &&
        distance < splitAt &&
        distance < this.detailLimit
      ) {
        const half = size / 2;
        // Children pushed far-first, so nearer ones are drawn first.
        const cx = eye.x < x0 + half ? 0 : 1;
        const cy = eye.y < y0 + half ? 0 : 1;
        for (let i = 3; i >= 0; i--) {
          const ix = (i & 1) ^ cx;
          const iy = ((i >> 1) & 1) ^ cy;
          stack[sp++] = x0 + ix * half;
          stack[sp++] = y0 + iy * half;
          stack[sp++] = half;
          stack[sp++] = depth + 1;
        }
        continue;
      }
      if (count >= this.capacity) continue;
      const o = count * 4;
      this.instances[o] = x0;
      this.instances[o + 1] = y0;
      this.instances[o + 2] = size;
      // The next coarser level takes over at twice this node's split distance.
      this.instances[o + 3] = depth === 0 ? 1e9 : 2 * cell * this.k;
      count++;
    }
    this.count = count;
    return count;
  }
}

/**
 * The patch: (grid + 1)² vertices carrying their integer grid coordinates
 * (z = 0), then a skirt along each edge: the edge's vertices again with
 * z = 1, which the vertex shader hangs below the surface. Skirts face
 * outward and are seen only through a seam between patches.
 */
export function patchGrid(grid: number): {
  coords: Float32Array;
  index: Uint16Array;
} {
  const n = grid + 1;
  const vertices = n * n + 4 * grid;
  const coords = new Float32Array(vertices * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = (j * n + i) * 3;
      coords[v] = i;
      coords[v + 1] = j;
    }
  }
  const index = new Uint16Array(grid * grid * 6 + 4 * grid * 6);
  let k = 0;
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // Alternate the diagonal so the mesh has no directional bias.
      if ((i + j) % 2 === 0) {
        index.set([a, b, d, a, d, c], k);
      } else {
        index.set([a, b, c, b, d, c], k);
      }
      k += 6;
    }
  }
  // The edges walked counter-clockwise seen from above, the patch on the
  // left; each step A→B gets a quad hanging on its right, facing outward.
  const ring: number[] = [];
  for (let i = 0; i < grid; i++) ring.push(i); // south, west to east
  for (let j = 0; j < grid; j++) ring.push(j * n + grid); // east, south to north
  for (let i = grid; i > 0; i--) ring.push(grid * n + i); // north, east to west
  for (let j = grid; j > 0; j--) ring.push(j * n); // west, north to south
  let s = n * n;
  const skirtOf = new Map<number, number>();
  for (const v of ring) {
    skirtOf.set(v, s);
    coords[s * 3] = coords[v * 3];
    coords[s * 3 + 1] = coords[v * 3 + 1];
    coords[s * 3 + 2] = 1;
    s++;
  }
  for (let r = 0; r < ring.length; r++) {
    const a = ring[r];
    const b = ring[(r + 1) % ring.length];
    const sa = skirtOf.get(a) ?? a;
    const sb = skirtOf.get(b) ?? b;
    index.set([a, sb, b, a, sa, sb], k);
    k += 6;
  }
  return { coords, index };
}
