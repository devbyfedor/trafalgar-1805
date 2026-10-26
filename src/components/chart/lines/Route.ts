import { Mesh } from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import type { TerrainField } from "../terrain/field";
import { RibbonMaterial, ribbonGeometry } from "./ribbon";

/**
 * A fleet's route: an ink line on the sea that draws itself as the story
 * advances. The waypoints (longitude, latitude) are joined by a centripetal
 * Catmull–Rom curve in map space, which never overshoots between unevenly
 * spaced points, and the curve is cut into short straight pieces. A ship
 * sails at the drawing head with `pointAt`.
 */

export type Waypoint = readonly [lon: number, lat: number];

/** A point on a route (world km) and the heading there (radians from north, clockwise). */
export interface RoutePoint {
  x: number;
  y: number;
  heading: number;
}

/** Length of the straight pieces the curve is cut into, km. */
const STEP_KM = 4;

function knot(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(1e-6, Math.hypot(bx - ax, by - ay) ** 0.5);
}

/** The curve through world points, as interleaved x, y every STEP_KM or so. */
export function smoothPath(xy: readonly number[]): Float32Array {
  const n = xy.length / 2;
  const out: number[] = [];
  const at = (i: number) => {
    const j = Math.min(n - 1, Math.max(0, i));
    return [xy[j * 2], xy[j * 2 + 1]] as const;
  };
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    // Phantom end points continue the first and last legs.
    const [x0, y0] = i > 0 ? at(i - 1) : [2 * x1 - x2, 2 * y1 - y2];
    const [x3, y3] = i < n - 2 ? at(i + 2) : [2 * x2 - x1, 2 * y2 - y1];
    const t0 = 0;
    const t1 = t0 + knot(x0, y0, x1, y1);
    const t2 = t1 + knot(x1, y1, x2, y2);
    const t3 = t2 + knot(x2, y2, x3, y3);
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(x2 - x1, y2 - y1) / STEP_KM),
    );
    for (let s = 0; s < steps; s++) {
      const u = t1 + ((t2 - t1) * s) / steps;
      const point = [0, 0];
      for (let k = 0; k < 2; k++) {
        const p0 = k ? y0 : x0;
        const p1 = k ? y1 : x1;
        const p2 = k ? y2 : x2;
        const p3 = k ? y3 : x3;
        const a1 = ((t1 - u) / (t1 - t0)) * p0 + ((u - t0) / (t1 - t0)) * p1;
        const a2 = ((t2 - u) / (t2 - t1)) * p1 + ((u - t1) / (t2 - t1)) * p2;
        const a3 = ((t3 - u) / (t3 - t2)) * p2 + ((u - t2) / (t3 - t2)) * p3;
        const b1 = ((t2 - u) / (t2 - t0)) * a1 + ((u - t0) / (t2 - t0)) * a2;
        const b2 = ((t3 - u) / (t3 - t1)) * a2 + ((u - t1) / (t3 - t1)) * a3;
        point[k] = ((t2 - u) / (t2 - t1)) * b1 + ((u - t1) / (t2 - t1)) * b2;
      }
      out.push(point[0], point[1]);
    }
  }
  const [xn, yn] = at(n - 1);
  out.push(xn, yn);
  return new Float32Array(out);
}

export interface RouteOptions {
  /** Pen width, CSS pixels. */
  width?: number;
  opacity?: number;
}

export class Route implements ChartLayer {
  readonly mesh: Mesh;
  /** Length of the drawn curve, world km. */
  readonly length: number;
  private readonly material: RibbonMaterial;
  private readonly points: Float32Array;
  /** Distance along the curve at each point, km. */
  private readonly along: Float32Array;

  constructor(
    field: TerrainField,
    waypoints: readonly Waypoint[],
    options: RouteOptions = {},
  ) {
    const xy = waypoints.flatMap(([lon, lat]) => [worldX(lon), worldY(lat)]);
    this.points = smoothPath(xy);
    const n = this.points.length / 2;
    this.along = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      this.along[i] =
        this.along[i - 1] +
        Math.hypot(
          this.points[i * 2] - this.points[i * 2 - 2],
          this.points[i * 2 + 1] - this.points[i * 2 - 1],
        );
    }
    this.length = this.along[n - 1];
    this.material = new RibbonMaterial(field, {
      lift: false,
      opacity: options.opacity ?? 0.9,
    });
    this.mesh = new Mesh(
      ribbonGeometry([{ points: this.points, width: options.width ?? 2.1 }]),
      this.material,
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;
  }

  /** How much of the route is drawn, 0..1. */
  setProgress(progress: number): void {
    this.material.head = Math.min(1, Math.max(0, progress)) * this.length;
  }

  /** The point at a fraction of the route, on the sea surface. */
  pointAt(progress: number, out: RoutePoint): RoutePoint {
    const target = Math.min(1, Math.max(0, progress)) * this.length;
    const along = this.along;
    let lo = 0;
    let hi = along.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (along[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = along[hi] - along[lo] || 1;
    const t = (target - along[lo]) / span;
    const x0 = this.points[lo * 2];
    const y0 = this.points[lo * 2 + 1];
    const x1 = this.points[hi * 2];
    const y1 = this.points[hi * 2 + 1];
    out.x = x0 + (x1 - x0) * t;
    out.y = y0 + (y1 - y0) * t;
    out.heading = Math.atan2(x1 - x0, y1 - y0);
    return out;
  }

  update(frame: FrameInfo): void {
    this.material.update(frame);
    this.material.color.copy(frame.light.ink);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
