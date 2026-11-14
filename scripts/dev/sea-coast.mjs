// Where the chart's coast lies for Boulogne's painting (development): the
// distance from the painting's eye to the chart's coast along each bearing
// across the view, and how far behind the eye the chart's camera must stand
// for that coast to lie where the painting's shore does (interludes.ts,
// CHART_BACK and SHORE_AHEAD; interludeCamera.ts). The coast is the one
// the glyph layout reads, with the detail tile the chart holds in the dive.
//   node scripts/dev/sea-coast.mjs [half-width-degrees=45] [step=3]
// Environment: BASE (http://127.0.0.1:3000).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const half = Number(process.argv[2] ?? 45);
const step = Number(process.argv[3] ?? 3);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const tab = await context.newPage();
await tab.goto(`${base}/?quality=0`);
await tab.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 240_000 },
);
// In the dive, so the chart holds the detail tile it holds there.
const y = await tab.evaluate(() =>
  window.__road.scrollForInterlude("boulogne", "dive", 0.5),
);
await tab.evaluate(
  (top) => window.__lenis.scrollTo(top, { immediate: true, force: true }),
  y,
);
await tab.waitForTimeout(1500);
const eye = await tab.evaluate(() => window.__road.seaEye);
const rows = await tab.evaluate(
  ([e, h, s]) => {
    const out = [];
    for (let a = -h; a <= h + 1e-9; a += s)
      out.push([a, window.__road.coastAlong(e.lon, e.lat, e.heading + a, 30)]);
    return out;
  },
  [eye, half, step],
);
console.log(
  `the painting's eye ${eye.lon} E ${eye.lat} N, heading ${eye.heading}°; its shore ${eye.shoreAhead} m ahead; the chart's camera ${eye.chartBack} m behind`,
);
for (const [a, km] of rows) {
  const m = km * 1000;
  const along = m * Math.cos((a * Math.PI) / 180);
  console.log(
    `${a >= 0 ? "+" : ""}${a}°: chart coast ${m.toFixed(0)} m (${along.toFixed(0)} m along the view); from the chart's camera ${(along + eye.chartBack).toFixed(0)} m along the view`,
  );
}
const axis = rows.find(([a]) => Math.abs(a) < 1e-9);
if (axis) {
  const back = eye.shoreAhead - axis[1] * 1000;
  console.log(
    `on the axis the chart's coast is ${(axis[1] * 1000).toFixed(0)} m ahead: CHART_BACK for a shore ${eye.shoreAhead} m ahead = ${back.toFixed(0)} m`,
  );
}
await browser.close();
