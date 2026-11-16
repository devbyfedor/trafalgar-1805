// Proves that the smoke at Finisterre lies on open sea, clear of every
// name, the caption's card, the fleets' labels and the tracks' dates.
// Sweeps scene 2 over the smoke's stretch in small steps of its progress,
// at one or more viewport sizes; at each step the page draws the scene
// (window.__road.smoke, RoadStage.smoke) and returns each puff's box as its
// lobes are drawn (Smoke.bounds: their extent, puffExtent, and the soft
// contour about them), the coast's distance under each puff, and the
// outlines of the lettering. The labels' clock makes every move at once
// (HeadLabels.setClock), and each p is drawn twice, so they stand settled.
//   node scripts/dev/smoke-clear.mjs [from] [to] [step]
// Defaults: 0.527 to 0.566 every 0.0005 (the camera's hold over the action
// from 0.527, the first guns at 0.5327 since session 34, the last
// puff gone by about 0.5607). Environment: BASE (default
// http://127.0.0.1:3000; the production preview is http://127.0.0.1:4173),
// SIZES (default "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"),
// SEEN (the least product of a puff's and an outline's opacity that
// counts, 0.02), LAND_KM (the least distance from the coast under a puff,
// 2), JSON=<file> for every step's counts. Exits with 1 if any step fails,
// or if a sweep across the firing's heart (0.540 to 0.546) draws no puff.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.527);
const to = Number(process.argv[3] ?? 0.566);
const step = Number(process.argv[4] ?? 0.0005);
const seen = Number(process.env.SEEN ?? 0.02);
const landKm = Number(process.env.LAND_KM ?? 2);
// The firing's heart (the bank at its thickest, session 34: 0.540 to 0.546):
// a sweep across it must draw smoke.
const FIRING_HEART = [0.54, 0.546];
const sizes = (
  process.env.SIZES ?? "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"
)
  .split(",")
  .map((s) => {
    const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(s.trim());
    if (!m) throw new Error(`bad size ${s}`);
    return { width: +m[1], height: +m[2], scale: Number(m[3] ?? 1) };
  });
const ps = [];
for (let k = 0; ; k++) {
  const p = +(from + k * step).toFixed(6);
  if (p > to + 1e-9) break;
  ps.push(p);
}

/** The area where a convex quad (8 numbers) and a box overlap, px². */
function overlap(quad, x0, y0, x1, y1) {
  let poly = [];
  for (let i = 0; i < 4; i++) poly.push([quad[2 * i], quad[2 * i + 1]]);
  const clip = (inside, cut) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ia = inside(a);
      const ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    poly = out;
  };
  const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  clip(
    (q) => q[0] >= x0,
    (a, b) => at(a, b, (x0 - a[0]) / (b[0] - a[0])),
  );
  clip(
    (q) => q[0] <= x1,
    (a, b) => at(a, b, (x1 - a[0]) / (b[0] - a[0])),
  );
  clip(
    (q) => q[1] >= y0,
    (a, b) => at(a, b, (y0 - a[1]) / (b[1] - a[1])),
  );
  clip(
    (q) => q[1] <= y1,
    (a, b) => at(a, b, (y1 - a[1]) / (b[1] - a[1])),
  );
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

const browser = await chromium.launch({ channel: "chromium" });
const rows = [];
let failed = 0;
for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
  });
  await page.goto(`${base}/?quality=0`);
  await page.waitForFunction(
    () => window.__road?.ready && window.__road.baked,
    null,
    { timeout: 180_000 },
  );
  await page.evaluate(() =>
    window.__road.labelClock?.(Number.POSITIVE_INFINITY),
  );
  const label = `${size.width}x${size.height}@${size.scale}`;
  let most = 0;
  let mostPuffs = 0;
  let nearest = Number.POSITIVE_INFINITY;
  const hits = new Map();
  const bad = [];
  for (const p of ps) {
    const r = await page.evaluate((p) => {
      window.__road.smoke(p);
      return window.__road.smoke(p);
    }, p);
    const n = r.puffs.length / 5;
    mostPuffs = Math.max(mostPuffs, n);
    let stepHits = 0;
    let land = 0;
    for (let i = 0; i < n; i++) {
      const [x0, y0, x1, y1, a] = r.puffs.slice(5 * i, 5 * i + 5);
      const c = r.coast[i];
      if (Number.isFinite(c)) nearest = Math.min(nearest, c);
      if (a > seen && !(c >= landKm)) land++;
      for (const t of r.text) {
        if (!(t.weight * a > seen)) continue;
        const area = overlap(t.quad, x0, y0, x1, y1);
        if (area > 0.5) {
          stepHits++;
          const key = `${t.kind} at (${t.quad[0].toFixed(0)}, ${t.quad[1].toFixed(0)})`;
          const h = hits.get(key) ?? { n: 0, area: 0, from: p, to: p };
          h.n++;
          h.area = Math.max(h.area, area);
          h.to = p;
          hits.set(key, h);
        }
      }
    }
    most = Math.max(most, stepHits);
    if (stepHits || land)
      bad.push(`${p.toFixed(4)} (${stepHits} overlaps, ${land} on land)`);
    rows.push({ size: label, p, puffs: n, overlaps: stepHits, land });
  }
  // A sweep across the heart of the firing with no puff drawn proves
  // nothing: the smoke is gone, not clear (as lights-clear's empty night).
  if (from <= FIRING_HEART[0] && to >= FIRING_HEART[1] && mostPuffs === 0)
    bad.push(`no puff drawn over ${FIRING_HEART.join("..")}`);
  failed += bad.length;
  console.log(
    `${label}: ${ps.length} steps ${from}..${to}, at most ${mostPuffs} puffs; nearest coast under a puff ${nearest.toFixed(1)} km; steps failing ${bad.length}`,
  );
  if (bad.length) console.log(`  ${bad.slice(0, 40).join(", ")}`);
  for (const [k, h] of hits)
    console.log(
      `  ${k}: ${h.n} puff-steps, p ${h.from}..${h.to}, largest overlap ${h.area.toFixed(1)} px²`,
    );
  await page.close();
}
await browser.close();
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
process.exit(failed ? 1 : 0);
