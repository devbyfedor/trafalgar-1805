// The chapter marker's scrim as a curve over p, from chapter-scrim.mjs's
// measurements at one or more viewport sizes (development only; pasted into
// src/scenes/02-road/ink.ts, CHAPTER_SCRIM).
//   node scripts/dev/chapter-scrim-curve.mjs a.json b.json ...
// At each measured p the least opacity is the most any size needs (a size
// that can't reach the target at full opacity needs all of it); then the
// most needed within REACH of p, so the scrim comes and goes over a
// stretch of scroll, never within a step; then a mean over SMOOTH, never
// under the most needed within SMOOTH; then MARGIN more. Prints the keys
// (p, opacity), dropping any that the line between its neighbours meets
// within 0.01. Environment: REACH (0.02), SMOOTH (0.01), MARGIN (0.02).
import { readFile } from "node:fs/promises";

const files = process.argv.slice(2);
const REACH = Number(process.env.REACH ?? 0.02);
const SMOOTH = Number(process.env.SMOOTH ?? 0.01);
const MARGIN = Number(process.env.MARGIN ?? 0.02);

const need = new Map();
for (const f of files) {
  for (const r of JSON.parse(await readFile(f, "utf8"))) {
    const key = Math.round(r.p * 1000);
    const least = Number.isNaN(r.least) || r.least === null ? 1 : r.least;
    need.set(key, Math.max(need.get(key) ?? 0, least));
  }
}
const ps = [...need.keys()].sort((a, b) => a - b);
const within = (k, w) =>
  ps.filter((q) => Math.abs(q - k) <= w * 1000 + 1e-6).map((q) => need.get(q));
const envelope = new Map(ps.map((k) => [k, Math.max(...within(k, REACH))]));
const curve = ps.map((k) => {
  const near = ps.filter((q) => Math.abs(q - k) <= SMOOTH * 1000 + 1e-6);
  const mean = near.reduce((t, q) => t + envelope.get(q), 0) / near.length;
  const floor = Math.max(...within(k, SMOOTH));
  const o = Math.min(1, Math.max(mean, floor) + (mean > 0 ? MARGIN : 0));
  return [k / 1000, Math.round(o * 100) / 100];
});
// Keys: drop those the straight line between their neighbours meets.
const keys = [curve[0]];
for (let i = 1; i < curve.length - 1; i++) {
  const [p0, o0] = keys[keys.length - 1];
  const [p2, o2] = curve[i + 1];
  const [p1, o1] = curve[i];
  const line = o0 + ((o2 - o0) * (p1 - p0)) / (p2 - p0);
  if (Math.abs(line - o1) > 0.01) keys.push(curve[i]);
}
keys.push(curve[curve.length - 1]);
console.log(
  `${keys.length} keys:\n${keys.map(([p, o]) => `  [${p}, ${o}],`).join("\n")}`,
);
