// Development only (session 12), not part of the site or the tests: run from the
// repository with the dev server up, e.g. node scripts/dev/glyph-ashore.mjs
// Lists fleet ships standing within `limit` km of the coast (or on land)
// while under way, over a range of p: their room as the glyph reads it
// (probe mode 1: room km) and how far the coast has taken over (mode 3).
//   node ashore.mjs p0 p1 step [limitKm]
import { chromium } from "@playwright/test";

const [p0, p1, step] = process.argv.slice(2, 5).map(Number);
const limit = Number(process.argv[5] ?? 1);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto("http://127.0.0.1:3000/?quality=0");
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1500);
const ps = [];
for (let p = p0; p <= p1 + 1e-9; p += step) ps.push(Number(p.toFixed(5)));
const rows = await page.evaluate((ps) => {
  const out = [];
  for (const p of ps) {
    const a = window.__road.sample(p, 0).fleets;
    const r = window.__road.sample(p, 1).fleets;
    const f = window.__road.sample(p, 3).fleets;
    const n = a.length / 4;
    for (let g = 0; g < n; g++) {
      const takeover = f[g * 4 + 2];
      const room = r[g * 4];
      // Under way (the coast has taken over), placed (h0 > 0).
      if (takeover > 0.99 && r[g * 4 + 3] > 0)
        out.push([p, g, room, a[g * 4 + 3]]);
    }
  }
  return out;
}, ps);
await browser.close();
const worst = new Map();
for (const [p, g, room, alpha] of rows) {
  const w = worst.get(g);
  if (!w || room < w.room) worst.set(g, { p, room, alpha });
}
const list = [...worst.entries()]
  .filter(([, w]) => w.room < limit)
  .sort((a, b) => a[1].room - b[1].room);
console.log(
  `${list.length} ships within ${limit} km of the coast under way (p ${p0}..${p1}):`,
);
for (const [g, w] of list)
  console.log(
    `  fleets[${g}] least room ${w.room.toFixed(2)} km at p=${w.p.toFixed(4)} (alpha ${w.alpha.toFixed(2)})`,
  );
