/**
 * Monotone cubic interpolation (Fritsch–Carlson) through keyframes.
 *
 * Choreography uses it where a value must pass through exact beats with a
 * continuous speed, for example Victory reaching her hero position at a
 * given p without stopping there. `asEase` normalises a curve so it can be
 * a GSAP ease between the first and last keyframe values.
 */

export type Keyframe = readonly [t: number, value: number];

/**
 * The slope at an end keyframe: its one interval's (`"secant"`), or none,
 * so the value leaves the first or reaches the last at rest (`"rest"`).
 */
export type CurveEnd = "secant" | "rest";

export function monotoneCurve(
  points: readonly Keyframe[],
  /** Both ends alike (`"secant"` by default), or [first, last]. */
  ends: CurveEnd | readonly [CurveEnd, CurveEnd] = "secant",
): (t: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  if (n === 1) return () => ys[0];
  const [first, last] = typeof ends === "string" ? [ends, ends] : ends;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }
  const m: number[] = new Array(n);
  m[0] = first === "rest" ? 0 : d[0];
  m[n - 1] = last === "rest" ? 0 : d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (t - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * h * m[i] +
      (-2 * u3 + 3 * u2) * ys[i + 1] +
      (u3 - u2) * h * m[i + 1]
    );
  };
}

/** A keyframe with the slope the value passes it at. */
export type SlopedKeyframe = readonly [t: number, value: number, slope: number];

/**
 * Cubic Hermite interpolation through keyframes at slopes given, so a
 * stretch set into another curve at that curve's own values and slopes
 * joins it with no step in its value or its pace. Monotone where every
 * interval's slopes keep within Fritsch and Carlson's circle of radius 3
 * about its secant (checked: it throws otherwise). Holds the end values
 * outside its keys.
 */
export function hermiteCurve(
  points: readonly SlopedKeyframe[],
): (t: number) => number {
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0, m0] = points[i];
    const [x1, y1, m1] = points[i + 1];
    const d = (y1 - y0) / (x1 - x0);
    const a = m0 / d;
    const b = m1 / d;
    if (!(x1 > x0) || !(d > 0) || a < 0 || b < 0 || a * a + b * b > 9)
      throw new Error(`hermiteCurve: interval ${i} is not monotone`);
  }
  return (t: number) => {
    if (t <= points[0][0]) return points[0][1];
    if (t >= points[n - 1][0]) return points[n - 1][1];
    let i = 0;
    while (t > points[i + 1][0]) i++;
    const [x0, y0, m0] = points[i];
    const [x1, y1, m1] = points[i + 1];
    const h = x1 - x0;
    const u = (t - x0) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * y0 +
      (u3 - 2 * u2 + u) * h * m0 +
      (-2 * u3 + 3 * u2) * y1 +
      (u3 - u2) * h * m1
    );
  };
}

/**
 * A GSAP ease over a tween that runs from the first to the last keyframe's
 * time, mapping progress to the curve's normalised value.
 */
export function asEase(
  points: readonly Keyframe[],
): (progress: number) => number {
  const f = monotoneCurve(points);
  const t0 = points[0][0];
  const t1 = points[points.length - 1][0];
  const v0 = points[0][1];
  const v1 = points[points.length - 1][1];
  const span = v1 - v0 || 1;
  return (progress: number) => (f(t0 + (t1 - t0) * progress) - v0) / span;
}
