/**
 * Monotone cubic interpolation (Fritsch–Carlson) through keyframes.
 *
 * Choreography uses it where a value must pass through exact beats with a
 * continuous speed, for example Victory reaching her hero position at a
 * given p without stopping there. `asEase` normalises a curve so it can be
 * a GSAP ease between the first and last keyframe values.
 */

export type Keyframe = readonly [t: number, value: number];

export function monotoneCurve(
  points: readonly Keyframe[],
): (t: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
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
