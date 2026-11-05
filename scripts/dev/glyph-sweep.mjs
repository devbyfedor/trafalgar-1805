// Sweeps scene 2 in small steps of its progress and reports every ship
// glyph that jumps, flickers or changes size abruptly (development only).
//   node scripts/dev/glyph-sweep.mjs [from] [to] [step]
// Each step draws the scene at p and reads every glyph back as drawn
// (window.__road.sample, GlyphProbe): her foot on screen, her height and
// her opacity. A change between two steps counts as a jump when it is both
// large and much larger than the changes on either side of it (a smooth
// fast move is not a jump; a camera cut moves every glyph at once and is
// reported as such). Needs a server, as road.mjs does: BASE (default
// http://127.0.0.1:3000), W, H, S. JSON=<file> also writes the samples.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.0005);
const width = Number(process.env.W ?? 1280);
const onScreen = (v) =>
  v[3] > 0.02 &&
  v[0] > -50 &&
  v[1] > -50 &&
  v[0] < width * Number(process.env.S ?? 1.5) + 50 &&
  v[1] < Number(process.env.H ?? 720) * Number(process.env.S ?? 1.5) + 50;
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
// Scroll into scene 2 so it draws, then drive it directly.
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1500);

const ps = [];
for (let p = from; p <= to + 1e-9; p += step) ps.push(Math.min(1, p));
const samples = [];
const BATCH = 50;
for (let i = 0; i < ps.length; i += BATCH) {
  const batch = ps.slice(i, i + BATCH);
  const out = await page.evaluate((list) => {
    const r = window.__road;
    return list.map((p) => {
      const s = r.sample(p);
      return {
        p,
        fleets: Array.from(s.fleets),
        squadrons: Array.from(s.squadrons),
      };
    });
  }, batch);
  samples.push(...out);
}
await browser.close();
if (process.env.JSON)
  await writeFile(process.env.JSON, JSON.stringify(samples));

/** Per layer and glyph, the series of [x, y, h, a]. */
function series(layer) {
  const n = samples[0][layer].length / 4;
  const out = [];
  for (let g = 0; g < n; g++)
    out.push(samples.map((s) => s[layer].slice(g * 4, g * 4 + 4)));
  return out;
}

const report = [];
for (const layer of ["fleets", "squadrons"]) {
  const all = series(layer);
  // The median move of the visible glyphs at each step: the camera's share.
  const median = samples.map((_, k) => {
    if (k === 0) return 0;
    const moves = [];
    for (const s of all) {
      const [x0, y0] = s[k - 1];
      const [x1, y1] = s[k];
      if (onScreen(s[k - 1]) && onScreen(s[k]))
        moves.push(Math.hypot(x1 - x0, y1 - y0));
    }
    moves.sort((a, b) => a - b);
    return moves.length ? moves[Math.floor(moves.length / 2)] : 0;
  });
  all.forEach((s, g) => {
    const d = (k, f) => (k <= 0 || k >= s.length ? 0 : f(s[k - 1], s[k]));
    const visible = (k) => onScreen(s[k]) || (s[k - 1] && onScreen(s[k - 1]));
    const move = (a, b) =>
      onScreen(a) && onScreen(b) ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
    const grow = (a, b) =>
      onScreen(a) && onScreen(b)
        ? Math.abs(b[2] - a[2]) / Math.max(a[2], b[2], 1)
        : 0;
    const fade = (a, b) =>
      (onScreen(a) || onScreen(b)) && a[3] >= 0 && b[3] >= 0
        ? Math.abs(Math.max(b[3], 0) - Math.max(a[3], 0))
        : 0;
    for (let k = 1; k < s.length; k++) {
      if (!visible(k)) continue;
      const checks = [
        ["jump", move, 6],
        ["size", grow, 0.08],
        ["fade", fade, 0.2],
      ];
      for (const [kind, f, min] of checks) {
        const here = d(k, f);
        const around = Math.max(d(k - 1, f), d(k + 1, f));
        // A camera cut moves every glyph: compare with the median too.
        const camera = kind === "jump" ? median[k] : 0;
        if (here > min && here > 4 * around + 1e-6 && here > 3 * camera)
          report.push(
            `${layer}[${g}] ${kind} at p=${samples[k].p.toFixed(4)}: ${here.toFixed(3)} (around ${around.toFixed(3)}, camera ${camera.toFixed(1)} px)`,
          );
      }
      // Flicker: opacity up and down (or down and up) within two steps.
      if (k + 1 < s.length) {
        const a0 = Math.max(s[k - 1][3], 0);
        const a1 = Math.max(s[k][3], 0);
        const a2 = Math.max(s[k + 1][3], 0);
        if (
          (a1 - a0) * (a2 - a1) < 0 &&
          Math.min(Math.abs(a1 - a0), Math.abs(a2 - a1)) > 0.08
        )
          report.push(
            `${layer}[${g}] flicker at p=${samples[k].p.toFixed(4)}: ${a0.toFixed(2)} ${a1.toFixed(2)} ${a2.toFixed(2)}`,
          );
      }
    }
  });
  // Steps where the camera itself jumps.
  for (let k = 2; k < median.length - 1; k++) {
    if (
      median[k] > 30 &&
      median[k] > 4 * Math.max(median[k - 1], median[k + 1])
    )
      report.push(
        `camera jump at p=${samples[k].p.toFixed(4)}: ${median[k].toFixed(1)} px`,
      );
  }
}
console.log(`${samples.length} steps from ${from} to ${to}`);
console.log(
  report.length ? report.join("\n") : "no jumps, size steps or flicker",
);
if (errors.length) console.log(`page errors:\n${errors.join("\n")}`);
