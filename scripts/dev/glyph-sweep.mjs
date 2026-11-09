// Sweeps scene 2 in small steps of its progress and reports every ship
// glyph that jumps, flickers, changes size abruptly, turns or swaps its
// drawing in one step, or whose wake snaps on or off (development only).
//   node scripts/dev/glyph-sweep.mjs [from] [to] [step]
// Each step draws the scene at p and reads every glyph back as drawn
// (window.__road.sample, GlyphProbe): her foot on screen, her height and
// opacity (mode 0); her facing and the cells she is drawn from (mode 2);
// her wake (mode 3). A change between two steps counts when it is both
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
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const onScreen = (v) =>
  v[3] > 0.02 &&
  v[0] > -50 &&
  v[1] > -50 &&
  v[0] < width * scale + 50 &&
  v[1] < height * scale + 50;

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// The top quality, pinned: a step of the ladder would rescale every glyph.
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  {
    timeout: 180_000,
  },
);
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
const BATCH = 40;
for (let i = 0; i < ps.length; i += BATCH) {
  const batch = ps.slice(i, i + BATCH);
  const out = await page.evaluate((list) => {
    const r = window.__road;
    return list.map((p) => {
      const s0 = r.sample(p, 0);
      const s2 = r.sample(p, 2);
      const s3 = r.sample(p, 3);
      return {
        p,
        fleets: Array.from(s0.fleets),
        squadrons: Array.from(s0.squadrons),
        fleetsDraw: Array.from(s2.fleets),
        squadronsDraw: Array.from(s2.squadrons),
        fleetsWake: Array.from(s3.fleets),
        squadronsWake: Array.from(s3.squadrons),
      };
    });
  }, batch);
  samples.push(...out);
}
await browser.close();
if (process.env.JSON)
  await writeFile(process.env.JSON, JSON.stringify(samples));

/** Per layer and glyph, the series of 4-vectors of one readout. */
function series(key) {
  const n = samples[0][key].length / 4;
  const out = [];
  for (let g = 0; g < n; g++)
    out.push(samples.map((s) => s[key].slice(g * 4, g * 4 + 4)));
  return out;
}

/** The drawing as a mix of cells: {cell: weight}. */
function mixOf(v) {
  const m = new Map();
  const t = Math.min(1, Math.max(0, v[3]));
  m.set(v[1], (m.get(v[1]) ?? 0) + 1 - t);
  m.set(v[2], (m.get(v[2]) ?? 0) + t);
  return m;
}
function mixDistance(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let d = 0;
  for (const k of keys) d += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0));
  return d / 2;
}

const report = [];
for (const layer of ["fleets", "squadrons"]) {
  const all = series(layer);
  const draw = series(`${layer}Draw`);
  const wake = series(`${layer}Wake`);
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
    const visible = (k) => onScreen(s[k]) || (s[k - 1] && onScreen(s[k - 1]));
    const seen = (k) => k > 0 && k < s.length && visible(k);
    // Turns, swaps and wakes count only between two steps where she shows.
    const both = (k) => onScreen(s[k]) && onScreen(s[k - 1]);
    const checks = [
      [
        "jump",
        6,
        (k) =>
          onScreen(s[k - 1]) && onScreen(s[k])
            ? Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1])
            : 0,
      ],
      [
        "size",
        0.08,
        (k) =>
          onScreen(s[k - 1]) && onScreen(s[k])
            ? Math.abs(s[k][2] - s[k - 1][2]) /
              Math.max(s[k][2], s[k - 1][2], 1)
            : 0,
      ],
      [
        "fade",
        0.2,
        (k) =>
          s[k][3] >= 0 && s[k - 1][3] >= 0
            ? Math.abs(Math.max(s[k][3], 0) - Math.max(s[k - 1][3], 0))
            : 0,
      ],
      // Facing runs -1 (bow to the left) to 1; the mirror crossfades
      // within ±0.14, so a step across it is a flip.
      [
        "turn",
        0.3,
        (k) => (both(k) ? Math.abs(draw[g][k][0] - draw[g][k - 1][0]) : 0),
      ],
      [
        "swap",
        0.3,
        (k) =>
          both(k) ? mixDistance(mixOf(draw[g][k]), mixOf(draw[g][k - 1])) : 0,
      ],
      [
        "wake",
        0.3,
        (k) => (both(k) ? Math.abs(wake[g][k][0] - wake[g][k - 1][0]) : 0),
      ],
    ];
    for (let k = 1; k < s.length; k++) {
      if (!seen(k)) continue;
      for (const [kind, min, f] of checks) {
        const here = f(k);
        // Measurable neighbours only: a glyph coming on screen at a corner
        // has none, and its first step is no jump.
        const near = [k - 1, k + 1].filter(
          (j) => seen(j) && (kind === "fade" || both(j)),
        );
        if (kind !== "fade" && near.length === 0) continue;
        const around = Math.max(0, ...near.map((j) => f(j)));
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
  report.length
    ? report.join("\n")
    : "no jumps, size steps, flicker, turns, swaps or wakes",
);
if (errors.length) console.log(`page errors:\n${errors.join("\n")}`);
