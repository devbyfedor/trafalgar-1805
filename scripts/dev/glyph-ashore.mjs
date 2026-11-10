// Development only, not part of the site or the tests: how near the coast
// the fleets' ships come at their true places (not their glyphs: those the
// layout keeps off land, glyph-clash.mjs), over a range of scene 2's p,
// against the chart's own coast field (window.__road.ashore). Lists every
// ship under way (more than half way out of her anchorage) nearer the
// coast than `limit` km, or on land, with where she came nearest.
//   node scripts/dev/glyph-ashore.mjs [from] [to] [step] [limitKm]
// Defaults: 0.6 1 0.0005 1.5. Environment: BASE (default
// http://127.0.0.1:3000). Exits with 1 if any ship is listed.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.6);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.0005);
const limit = Number(process.argv[5] ?? 1.5);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
const ps = [];
for (let i = 0; ; i++) {
  const p = from + i * step;
  if (p > to + 1e-9) break;
  ps.push(Math.round(p * 1e6) / 1e6);
}
const nearest = new Map();
let underWay = 0;
for (let i = 0; i < ps.length; i += 80) {
  const batch = ps.slice(i, i + 80);
  const rows = await page.evaluate(
    (list) => list.map((p) => window.__road.ashore(p)),
    batch,
  );
  rows.forEach((row, k) => {
    for (let s = 0; s < row.length / 3; s++) {
      const [km, way, opacity] = row.slice(s * 3, s * 3 + 3);
      if (!(opacity > 0) || !(way > 0.5)) continue;
      underWay++;
      const e = nearest.get(s);
      if (!e || km < e.km) nearest.set(s, { km, p: batch[k] });
    }
  });
}
await browser.close();
const listed = [...nearest.entries()]
  .filter(([, e]) => !(e.km >= limit))
  .sort((a, b) => a[1].km - b[1].km);
const all = [...nearest.values()].map((e) => e.km);
console.log(
  `ashore: p ${from} to ${to}, step ${step}: ${underWay} ship-steps under way; nearest ${Math.min(...all).toFixed(2)} km`,
);
console.log(`  under way within ${limit} km of the coast: ${listed.length}`);
for (const [s, e] of listed)
  console.log(`    ${names[s]}: ${e.km.toFixed(2)} km at p ${e.p}`);
process.exit(listed.length ? 1 : 0);
