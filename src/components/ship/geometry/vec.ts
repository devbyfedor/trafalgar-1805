/**
 * 2D helpers in ship space: metres, x forward from the stern, y up from the
 * load waterline. Conversion to SVG's y-down space happens only in path.ts.
 */

export type Vec = readonly [number, number];

export const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
export const lerp = (a: Vec, b: Vec, t: number): Vec => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
export const length = (a: Vec): number => Math.hypot(a[0], a[1]);
export const normalize = (a: Vec): Vec => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Left-hand normal (rotated +90°): for a vector pointing up, this points aft. */
export const normal = (a: Vec): Vec => normalize([-a[1], a[0]]);

export const deg = (degrees: number): number => (degrees * Math.PI) / 180;

/** Unit vector of a spar that leans `rakeDeg` aft of vertical. */
export const rakeDir = (rakeDeg: number): Vec => [
  -Math.sin(deg(rakeDeg)),
  Math.cos(deg(rakeDeg)),
];

/** Point on a mast line: `base` moved `distance` along a raked direction. */
export const along = (base: Vec, dir: Vec, distance: number): Vec => [
  base[0] + dir[0] * distance,
  base[1] + dir[1] * distance,
];

/** Cubic Bézier point. */
export function cubic(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Quadratic Bézier point. */
export function quad(p0: Vec, p1: Vec, p2: Vec, t: number): Vec {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

/** Intersection of segment ab with the horizontal line y = h (if any). */
export function atHeight(a: Vec, b: Vec, h: number): Vec | null {
  if ((a[1] - h) * (b[1] - h) > 0 || a[1] === b[1]) return null;
  const t = (h - a[1]) / (b[1] - a[1]);
  return lerp(a, b, t);
}

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
