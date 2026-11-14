import type { Pt } from "../../paint/kit";
import type { LightKind } from "../../paint/lights";
import type { PlateCanvas } from "../../paint/plate";

/**
 * The shore painter's side of the lights at dusk (paint/lights.ts): what
 * its colour pass records, in paint order, through `PlateCanvas.lights`:
 * the openings of the huts and the pavilions, the lamps round Napoleon's,
 * the camps' kitchen fires, and every shape laid over them later (a
 * nearer hut, a tier of ground, a crown of trees). Recording draws
 * nothing: the colour raster stays as it was.
 */

/** The convex hull of points, counter-clockwise (y up). */
export function hull(pts: readonly Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    )
      lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0
    )
      upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * A path of several polygons, each wound counter-clockwise, so a fill by
 * the nonzero rule covers their union (two overlapping polygons wound
 * against each other would leave their overlap empty).
 */
export function union(polys: readonly (readonly Pt[])[]): Path2D {
  const path = new Path2D();
  for (const poly of polys) {
    if (poly.length < 3) continue;
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    const pts = area < 0 ? [...poly].reverse() : poly;
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();
  }
  return path;
}

/**
 * Records a shape just painted as an occluder of the lights recorded
 * before it in this plate; nothing when there are none yet (it would hide
 * nothing, and every lights job replays it).
 */
export function occlude(c: PlateCanvas, shape: Path2D | readonly Pt[]): void {
  const sink = c.lights;
  if (!sink || sink.events.length === 0) return;
  sink.occlude(shape);
}

/** A seed for a light from a place (metres east, north) and an index: the same every time. */
export function lightSeed(e: number, n: number, k: number): number {
  let h = Math.imul(Math.round(e * 8) | 0, 73856093);
  h ^= Math.imul(Math.round(n * 8) | 0, 19349663);
  h ^= Math.imul(k + 1, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) % 100003;
}

/** Records an opening (a window or a door) by its corners, layer units: its box. */
export function opening(
  c: PlateCanvas,
  kind: LightKind,
  corners: readonly Pt[],
  seed: number,
): void {
  if (!c.lights) return;
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of corners) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  c.lights.add({ kind, x: x0, y: y0, w: x1 - x0, h: y1 - y0, seed });
}

/** Records a lamp, its flame at `x`, `y` and `size` across (layer units). */
export function lamp(
  c: PlateCanvas,
  x: number,
  y: number,
  size: number,
  seed: number,
): void {
  // paint/lights.ts centres a lamp on its box.
  c.lights?.add({
    kind: "lamp",
    x: x - size / 2,
    y: y - size / 2,
    w: size,
    h: size,
    seed,
  });
}

/** Records a fire, behind whatever is painted after it: its centre and its glow's radius (layer units). */
export function fire(
  c: PlateCanvas,
  x: number,
  y: number,
  radius: number,
  seed: number,
): void {
  c.lights?.add({ kind: "fire", x, y, w: radius, h: radius, seed });
}
