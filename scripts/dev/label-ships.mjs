// Do the fleets' head labels lie over a ship? (development only)
// At each p, every head label drawn (window.__road.routeLabels: its outline
// and opacity) against every glyph drawn (window.__road.sample(p, 0), the
// October fleets ship by ship and the squadrons' symbols: the foot on
// screen, the glyph's height and how much shows): a row for each label
// whose outline's box meets a glyph's box (as wide as 1.2 of her height,
// from her foot up) where both show at MIN or more (0.1).
//   node scripts/dev/label-ships.mjs 0..1:0.005
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, MIN.
import { chromium } from "@playwright/test";
import { parsePoints, pointName, waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = parsePoints(process.argv.slice(2));
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const MIN = Number(process.env.MIN ?? 0.1);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
await page.waitForFunction(() => window.__road?.baked, null, {
  timeout: 180_000,
});
// The labels as they settle at each p (their clock makes every move at
// once: HeadLabels.setClock), not partway through a move begun on the
// sample before.
await page.evaluate(() => window.__road.labelClock?.(Number.POSITIVE_INFINITY));
let rows = 0;
let frames = 0;
for (const point of points) {
  if (point.kind !== "p") continue;
  const p = point.p;
  const r = await page.evaluate((p) => {
    const s = window.__road.sample(p, 0);
    return {
      glyphs: [...Array.from(s.fleets), ...Array.from(s.squadrons)],
      labels: window.__road.routeLabels(false),
    };
  }, p);
  let any = false;
  for (const l of r.labels) {
    if (l.opacity < MIN) continue;
    const xs = l.quad.filter((_, i) => i % 2 === 0);
    const ys = l.quad.filter((_, i) => i % 2 === 1);
    const [lx0, lx1, ly0, ly1] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    let worst = 0;
    for (let i = 0; i + 3 < r.glyphs.length; i += 4) {
      const [fx, fy, h, a] = r.glyphs.slice(i, i + 4);
      if (!(a >= MIN) || !(h > 0)) continue;
      const x = fx / scale;
      const y = height - fy / scale;
      const hh = h / scale;
      const gx0 = x - 0.6 * hh;
      const gx1 = x + 0.6 * hh;
      const gy0 = y - hh;
      const gy1 = y;
      if (gx1 < lx0 || gx0 > lx1 || gy1 < ly0 || gy0 > ly1) continue;
      worst = Math.max(worst, a);
    }
    if (worst > 0) {
      any = true;
      rows++;
      console.log(
        `p ${pointName(point)}  "${l.text}" opacity ${l.opacity.toFixed(2)} over a glyph showing ${worst.toFixed(2)}`,
      );
    }
  }
  if (any) frames++;
}
console.log(`${rows} rows in ${frames} frames of ${points.length}`);
await browser.close();
