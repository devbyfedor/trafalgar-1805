import { Vector3 } from "three";
import { type Keyframe, monotoneCurve } from "@/lib/curve";
import { worldX, worldY } from "../geo/mercator";

/**
 * The camera rig: two splines, one for the eye and one for the target,
 * through keyframes placed by progress p (0..1). No roll: the camera's up
 * is always the chart's up.
 *
 * - The eye's spline runs through (x, y, ln altitude), so a climb from a few
 *   hundred metres to thousands of kilometres keeps an even pace.
 * - Splines are centripetal Catmull–Rom (no loops or overshoot between
 *   unevenly spaced keys); a monotone cubic maps p to the spline parameter,
 *   so speed is continuous through every keyframe.
 */

export interface CameraKey {
  p: number;
  /** Longitude, latitude (degrees) and altitude above the sea (km). */
  eye: readonly [number, number, number];
  target: readonly [number, number, number];
  /** Vertical field of view, degrees (default 40). */
  fov?: number;
}

type V3 = [number, number, number];

/** Centripetal knot spacing (alpha = 0.5). */
function knot(a: V3, b: V3): number {
  return Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ** 0.5);
}

function catmullRom(
  p0: V3,
  p1: V3,
  p2: V3,
  p3: V3,
  t: number,
  out: V3,
): void {
  const t0 = 0;
  const t1 = t0 + knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const u = t1 + (t2 - t1) * t;
  for (let i = 0; i < 3; i++) {
    const a1 = ((t1 - u) / (t1 - t0)) * p0[i] + ((u - t0) / (t1 - t0)) * p1[i];
    const a2 = ((t2 - u) / (t2 - t1)) * p1[i] + ((u - t1) / (t2 - t1)) * p2[i];
    const a3 = ((t3 - u) / (t3 - t2)) * p2[i] + ((u - t2) / (t3 - t2)) * p3[i];
    const b1 = ((t2 - u) / (t2 - t0)) * a1 + ((u - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - u) / (t3 - t1)) * a2 + ((u - t1) / (t3 - t1)) * a3;
    out[i] = ((t2 - u) / (t2 - t1)) * b1 + ((u - t1) / (t2 - t1)) * b2;
  }
}

export class CameraRig {
  private readonly eyes: V3[];
  private readonly targets: V3[];
  private readonly fovs: number[];
  private readonly param: (p: number) => number;
  private readonly tmp: V3 = [0, 0, 0];
  private readonly ghostStart: V3 = [0, 0, 0];
  private readonly ghostEnd: V3 = [0, 0, 0];

  constructor(readonly keys: readonly CameraKey[]) {
    if (keys.length < 2) throw new Error("a camera rig needs two keys");
    this.eyes = keys.map((k) => [worldX(k.eye[0]), worldY(k.eye[1]), Math.log(k.eye[2])]);
    this.targets = keys.map((k) => [worldX(k.target[0]), worldY(k.target[1]), k.target[2]]);
    this.fovs = keys.map((k) => k.fov ?? 40);
    const points: Keyframe[] = keys.map((k, i) => [k.p, i]);
    this.param = monotoneCurve(points);
  }

  private sample(points: V3[], u: number, out: V3): void {
    const n = points.length;
    const i = Math.min(n - 2, Math.max(0, Math.floor(u)));
    const t = Math.min(1, Math.max(0, u - i));
    const p1 = points[i];
    const p2 = points[i + 1];
    // Past either end, a phantom key continues the first or last leg.
    let p0 = points[i - 1];
    if (!p0) {
      p0 = this.ghostStart;
      for (let k = 0; k < 3; k++) p0[k] = 2 * p1[k] - p2[k];
    }
    let p3 = points[i + 2];
    if (!p3) {
      p3 = this.ghostEnd;
      for (let k = 0; k < 3; k++) p3[k] = 2 * p2[k] - p1[k];
    }
    catmullRom(p0, p1, p2, p3, t, out);
  }

  /** The camera at progress p: eye and target in world km, and the fov. */
  evaluate(p: number, eye: Vector3, target: Vector3): number {
    const u = this.param(Math.min(1, Math.max(0, p)));
    this.sample(this.eyes, u, this.tmp);
    eye.set(this.tmp[0], this.tmp[1], Math.exp(this.tmp[2]));
    this.sample(this.targets, u, this.tmp);
    target.set(this.tmp[0], this.tmp[1], this.tmp[2]);
    const i = Math.min(this.fovs.length - 2, Math.floor(u));
    const t = Math.min(1, Math.max(0, u - i));
    return this.fovs[i] + (this.fovs[i + 1] - this.fovs[i]) * t;
  }
}

/**
 * Vertical exaggeration for a camera altitude: at continental scale true
 * relief is invisible, so it is exaggerated, easing off as the camera comes
 * down, log-linearly between the two anchors.
 */
export const EXAGGERATION = {
  near: { altitude: 12, value: 2.6 },
  far: { altitude: 6000, value: 22 },
} as const;

export function exaggerationAt(altitudeKm: number): number {
  const { near, far } = EXAGGERATION;
  const t =
    (Math.log(altitudeKm) - Math.log(near.altitude)) /
    (Math.log(far.altitude) - Math.log(near.altitude));
  const s = Math.min(1, Math.max(0, t));
  // Smooth at both ends, so the change never shows as a bend in motion.
  const e = s * s * (3 - 2 * s);
  return Math.exp(Math.log(near.value) + (Math.log(far.value) - Math.log(near.value)) * e);
}

/**
 * Contour interval for a camera altitude: 100 m doubling as the camera
 * climbs, with the blend between an interval and its double, so contours
 * thin out smoothly (the doubled set is a subset of the finer one).
 */
export function contourIntervalAt(altitudeKm: number): { interval: number; blend: number } {
  const ideal = 100 * Math.max(1, (altitudeKm / 40) ** 0.62);
  const k = Math.log2(ideal / 100);
  const whole = Math.floor(k);
  return { interval: 100 * 2 ** whole, blend: k - whole };
}
