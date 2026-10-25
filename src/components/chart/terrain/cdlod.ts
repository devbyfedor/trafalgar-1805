import { Box3, type Frustum, type Vector3 } from "three";

/**
 * Continuous distance-dependent level of detail (after Strugar, 2009) for
 * the chart's surface. A quadtree over a square larger than the stage, so
 * the open sea runs on to the horizon. Every selected node is drawn as the
 * same N × N grid patch; a node splits while the camera is nearer than
 * `cellSize × k`, k chosen so a grid cell stays a few pixels on screen.
 * Vertices morph toward the next coarser grid over the last 30 % of a
 * node's range, so neighbouring levels meet without cracks or popping.
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

export class Cdlod {
  /** Per selected node: x0, y0, size, morph end distance. */
  readonly instances: Float32Array;
  count = 0;
  /** Split factor: a node splits while nearer than its cell size × k. */
  k = 160;

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
      this.box.min.set(x0, y0, -0.5);
      this.box.max.set(x0 + size, y0 + size, maxZ);
      if (!frustum.intersectsBox(this.box)) continue;
      const cell = size / grid;
      const dx = Math.max(x0 - eye.x, 0, eye.x - (x0 + size));
      const dy = Math.max(y0 - eye.y, 0, eye.y - (y0 + size));
      const distance = Math.sqrt(dx * dx + dy * dy + eye.z * eye.z);
      if (depth < maxDepth && distance < cell * this.k) {
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

/** The patch: (grid + 1)² vertices carrying their integer grid coordinates. */
export function patchGrid(grid: number): { coords: Float32Array; index: Uint16Array } {
  const n = grid + 1;
  const coords = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      coords[(j * n + i) * 2] = i;
      coords[(j * n + i) * 2 + 1] = j;
    }
  }
  const index = new Uint16Array(grid * grid * 6);
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
  return { coords, index };
}
