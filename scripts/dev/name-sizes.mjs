// Suggests an em size (world km) for each name, so it stands about 12 CSS
// px at the farthest view of scene 2 where it matters (development only;
// the gazetteer's sizing rule, src/scenes/02-road/gazetteer.ts).
//   node scripts/dev/name-sizes.mjs <names.json>
// names.json: [{ "text", "lon", "lat", "from", "to" }, ...], from/to the
// stretch of p where the name matters. Each name's site is sampled at
// every 0.0025 of p through its stretch (window.__road.siteView); views
// where it stands outside the middle 90 % of the frame are left out, and
// of the rest the farthest (most km per CSS px) sets the size. Needs a
// server: BASE (http://127.0.0.1:3000; the preview on 4173).
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const names = JSON.parse(await readFile(process.argv[2], "utf8"));
const EM_PX = 12;

const browser = await chromium.launch({ channel: "chromium" });
const page = await (
  await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1.5,
  })
).newPage();
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 120_000,
});
for (const n of names) {
  let far = null;
  let seen = 0;
  for (let p = n.from; p <= n.to + 1e-9; p += 0.0025) {
    const v = await page.evaluate(
      ([at, lon, lat]) => window.__road.siteView(at, lon, lat),
      [p, n.lon, n.lat],
    );
    if (Math.abs(v.x) > 0.9 || Math.abs(v.y) > 0.9) continue;
    seen++;
    const kmPerPx = v.dist / v.pxPerRad;
    if (!far || kmPerPx > far.kmPerPx)
      far = { p, kmPerPx, sinElev: v.sinElev, dist: v.dist };
  }
  if (!far) {
    console.log(`${n.text.padEnd(18)} never in frame in ${n.from}-${n.to}`);
    continue;
  }
  const size = EM_PX * far.kmPerPx;
  console.log(
    `${n.text.padEnd(18)} size ${size.toFixed(2).padStart(7)} km  (farthest at p ${far.p.toFixed(4)}, ${far.dist.toFixed(0)} km off, ${far.kmPerPx.toFixed(3)} km/px, elevation sine ${far.sinElev.toFixed(2)}; in frame at ${seen} samples)`,
  );
}
await browser.close();
