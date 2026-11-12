// The chapter marker's scrim as a curve over p, from chapter-scrim.mjs's
// measurements at one or more viewport sizes (development only; pasted into
// src/scenes/02-road/ink.ts, CHAPTER_SCRIM).
//   node scripts/dev/chapter-scrim-curve.mjs a.json b.json ...
// At each measured p the least opacity is the most any size needs (a size
// that can't reach the target at full opacity needs all of it); then the
// most needed within REACH of p, so the scrim comes and goes over a
// stretch of scroll, never within a step; then a mean over SMOOTH, never
// under the most needed within SMOOTH; then MARGIN more, rounded up to
// 0.01. The files may hold different grids (a step of 0.005 and the same
// grid offset by half a step, say): p is kept to 0.0001. Prints the keys
// (p, opacity) the timeline joins with straight lines: from each key the
// next is the farthest measured p whose line from it passes over every
// measured p between at or above the curve and at most 0.01 above it, so
// the keys never give less than the curve anywhere measured. The scrim
// comes in from nothing at p = 0, as the marker does: a first key [0, 0]
// when the first measurement is later (before it the marker isn't shown).
// Environment: REACH (0.02), SMOOTH (0.01), MARGIN (0.02).
import { readFile } from "node:fs/promises";

const files = process.argv.slice(2);
const REACH = Number(process.env.REACH ?? 0.02);
const SMOOTH = Number(process.env.SMOOTH ?? 0.01);
const MARGIN = Number(process.env.MARGIN ?? 0.02);
/** p is keyed in units of 0.0001. */
const UNIT = 1e4;
/** How far above the curve a line between keys may pass. */
const ABOVE = 0.01;

const need = new Map();
for (const f of files) {
  for (const r of JSON.parse(await readFile(f, "utf8"))) {
    const key = Math.round(r.p * UNIT);
    const least = Number.isNaN(r.least) || r.least === null ? 1 : r.least;
    need.set(key, Math.max(need.get(key) ?? 0, least));
  }
}
const ps = [...need.keys()].sort((a, b) => a - b);
const within = (k, w) =>
  ps.filter((q) => Math.abs(q - k) <= w * UNIT + 1e-6).map((q) => need.get(q));
const envelope = new Map(ps.map((k) => [k, Math.max(...within(k, REACH))]));
const curve = ps.map((k) => {
  const near = ps.filter((q) => Math.abs(q - k) <= SMOOTH * UNIT + 1e-6);
  const mean = near.reduce((t, q) => t + envelope.get(q), 0) / near.length;
  const floor = Math.max(...within(k, SMOOTH));
  const o = Math.min(1, Math.max(mean, floor) + (mean > 0 ? MARGIN : 0));
  return [k / UNIT, Math.ceil(o * 100 - 1e-9) / 100];
});
if (curve[0][0] > 0) curve.unshift([0, 0]);
// Keys: from each key, the farthest point the line to which keeps at or
// above the curve, and at most ABOVE over it, at every point between.
const keys = [curve[0]];
let a = 0;
while (a < curve.length - 1) {
  let b = a + 1;
  for (let j = a + 2; j < curve.length; j++) {
    const [p0, o0] = curve[a];
    const [p1, o1] = curve[j];
    let fits = true;
    for (let m = a + 1; m < j && fits; m++) {
      const [p, o] = curve[m];
      const line = o0 + ((o1 - o0) * (p - p0)) / (p1 - p0);
      fits = line >= o - 1e-9 && line - o <= ABOVE + 1e-9;
    }
    if (!fits) break;
    b = j;
  }
  keys.push(curve[b]);
  a = b;
}
console.log(
  `${keys.length} keys:\n${keys.map(([p, o]) => `  [${p}, ${o}],`).join("\n")}`,
);
