// Proves that no ship glyph jumps: sweeps scene 2 in small steps of its
// progress and, for every glyph that shows, measures how abruptly its place
// on screen, its height and its opacity change: their second differences
// over three steps (window.__road.motion, development only). Smooth motion,
// however fast (the camera's own, a squadron sailing), has a small one; a
// jump or a sudden start has a large one.
//   node scripts/dev/glyph-motion.mjs [from] [to] [step]
// A step flags when the second difference of a glyph's place exceeds MOVE
// of its height, of its height GROW of it, or of its opacity FADE
// (defaults 0.5, 0.15, 0.15 at steps of 0.0005, about 11 px of scroll on
// the owner's screen). Environment: BASE (default
// http://127.0.0.1:3000), W, H, S. Exits with 1 if any step flags.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.0005);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const MOVE = Number(process.env.MOVE ?? 0.5);
const GROW = Number(process.env.GROW ?? 0.15);
const FADE = Number(process.env.FADE ?? 0.15);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1000);
const names = await page.evaluate(() => window.__road.glyphNames());
const ps = [];
for (let i = 0; ; i++) {
  const p = from + i * step;
  if (p > to + 1e-9) break;
  ps.push(Math.round(p * 1e6) / 1e6);
}
const frames = [];
for (let i = 0; i < ps.length; i += 40) {
  const batch = ps.slice(i, i + 40);
  frames.push(
    ...(await page.evaluate(
      (list) => list.map((p) => window.__road.motion(p)),
      batch,
    )),
  );
}
await browser.close();

if (process.env.DUMP) {
  const [who, p0, p1] = process.env.DUMP.split(",");
  for (let k = 0; k < frames.length; k++) {
    if (ps[k] < +p0 || ps[k] > +p1) continue;
    for (let layer = 0; layer < frames[k].length; layer++) {
      const i = names[layer].indexOf(who);
      if (i < 0) continue;
      const v = frames[k][layer]
        .slice(i * 6, i * 6 + 6)
        .map((x) => +x.toFixed(2));
      console.log(ps[k], who, JSON.stringify(v));
    }
  }
}
const flags = [];
const paths = [];
let worstPath = 0;
let worstMove = 0;
let worstGrow = 0;
let worstFade = 0;
// A jump is motion that changes abruptly: the second difference of a
// glyph's place on screen over three steps (smooth motion, however fast,
// the camera's included, has a small one), of its height and its opacity.
for (let k = 1; k + 1 < frames.length; k++) {
  for (let layer = 0; layer < frames[k].length; layer++) {
    const a = frames[k - 1][layer];
    const b = frames[k][layer];
    const c = frames[k + 1][layer];
    for (let i = 0; i < b.length / 6; i++) {
      const o = i * 6;
      // A place, size or opacity that isn't a number is a fault, shown or
      // not (comparisons with NaN are all false, so it would pass unseen).
      if (b.slice(o, o + 6).some((v) => v === null || Number.isNaN(v))) {
        flags.push({ p: ps[k], name: names[layer][i], what: "nan", v: 1 });
        continue;
      }
      const shown = Math.max(a[o + 3], b[o + 3], c[o + 3]);
      if (shown <= 0.1) continue;
      // On screen at all three steps (off it, or near the horizon, a
      // projection means nothing).
      const W = width * scale;
      const H = height * scale;
      const on = (f) =>
        Number.isFinite(f[o]) &&
        Number.isFinite(f[o + 1]) &&
        f[o] > -50 &&
        f[o] < W + 50 &&
        f[o + 1] > -50 &&
        f[o + 1] < H + 50;
      if (!on(a) || !on(b) || !on(c)) continue;
      const fade = Math.abs(c[o + 3] - 2 * b[o + 3] + a[o + 3]);
      worstFade = Math.max(worstFade, fade);
      if (fade > FADE)
        flags.push({ p: ps[k], name: names[layer][i], what: "fade", v: fade });
      if (Math.min(a[o + 3], b[o + 3], c[o + 3]) <= 0.1) continue;
      const h = Math.max(a[o + 2], b[o + 2], c[o + 2], 1);
      // The layout's own motion: the place against the glyph's true place
      // (a squadron's head, a ship's own), so a turn of the path itself
      // (a squadron weighing, the camera's keys) is told apart, as "path".
      const rx = (f) => f[o] - f[o + 4];
      const ry = (f) => f[o + 1] - f[o + 5];
      const move =
        Math.hypot(rx(c) - 2 * rx(b) + rx(a), ry(c) - 2 * ry(b) + ry(a)) / h;
      const path =
        Math.hypot(
          c[o + 4] - 2 * b[o + 4] + a[o + 4],
          c[o + 5] - 2 * b[o + 5] + a[o + 5],
        ) / h;
      worstPath = Math.max(worstPath, path);
      if (path > MOVE)
        paths.push({ p: ps[k], name: names[layer][i], what: "path", v: path });
      const grow = Math.abs(c[o + 2] - 2 * b[o + 2] + a[o + 2]) / h;
      worstMove = Math.max(worstMove, move);
      worstGrow = Math.max(worstGrow, grow);
      if (move > MOVE)
        flags.push({ p: ps[k], name: names[layer][i], what: "move", v: move });
      if (grow > GROW)
        flags.push({ p: ps[k], name: names[layer][i], what: "grow", v: grow });
    }
  }
}
console.log(
  `motion ${width}x${height}@${scale}: ${frames.length} frames (p ${from} to ${to}, step ${step})`,
);
console.log(
  `  worst second differences: place ${worstMove.toFixed(3)} of a glyph's height, height ${(worstGrow * 100).toFixed(1)} %, opacity ${worstFade.toFixed(3)}`,
);
const count = (w) => flags.filter((f) => f.what === w).length;
console.log(
  `  flags: ${flags.length} (fade ${count("fade")}, grow ${count("grow")}, move ${count("move")}, not a number ${count("nan")})`,
);
console.log(
  `  turns of the paths themselves (not flags): ${paths.length}, worst ${worstPath.toFixed(3)} of a glyph's height`,
);
const byPlace = new Map();
for (const f of [...flags, ...paths]) {
  const key = `${f.what} ${f.name}`;
  const e = byPlace.get(key) ?? { n: 0, worst: 0, at: f.p };
  e.n++;
  if (f.v > e.worst) {
    e.worst = f.v;
    e.at = f.p;
  }
  byPlace.set(key, e);
}
for (const what of ["nan", "fade", "grow", "move", "path"])
  for (const [k, e] of [...byPlace.entries()]
    .filter(([k]) => k.startsWith(what))
    .sort((a, b) => b[1].worst - a[1].worst)
    .slice(0, 12))
    console.log(
      `    ${k}: ${e.n} steps, worst ${e.worst.toFixed(3)} at p ${e.at}`,
    );
process.exit(flags.length ? 1 : 0);
