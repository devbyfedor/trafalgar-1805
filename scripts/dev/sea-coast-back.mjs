// The chart's coast for Boulogne's painting when the eye stands on the chart's
// land (development): along each bearing of the view, the coast's distance
// from the eye measured from 3 km behind it on the same line, and the
// CHART_BACK that puts it where the painting's shore is (interludes.ts).
// Session 25: the eye at 1.578 E 50.73 N gave -189..-274 m, CHART_BACK 1573.
//   node scripts/dev/sea-coast-back.mjs   (BASE: http://127.0.0.1:3000)
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
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
  { timeout: 240000 },
);
const y = await tab.evaluate(() =>
  window.__road.scrollForInterlude("boulogne", "dive", 0.5),
);
await tab.evaluate(
  (top) => window.__lenis.scrollTo(top, { immediate: true, force: true }),
  y,
);
await tab.waitForTimeout(1500);
const eye = await tab.evaluate(() => window.__road.seaEye);
const BACK = 3000;
const rows = await tab.evaluate(
  ([e, back]) => {
    const out = [];
    const R = 6371000;
    for (let a = -45; a <= 45; a += 5) {
      const b = ((e.heading + a) * Math.PI) / 180;
      const dn = -back * Math.cos(b),
        de = -back * Math.sin(b);
      const lat = e.lat + (dn / R) * (180 / Math.PI);
      const lon =
        e.lon +
        (de / (R * Math.cos((e.lat * Math.PI) / 180))) * (180 / Math.PI);
      const km = window.__road.coastAlong(lon, lat, e.heading + a, 30);
      out.push([a, km * 1000 - back]);
    }
    return out;
  },
  [eye, BACK],
);
console.log(
  `eye ${eye.lon} E ${eye.lat} N heading ${eye.heading}; shore ahead ${eye.shoreAhead}; chartBack now ${eye.chartBack}`,
);
for (const [a, m] of rows) {
  const along = m * Math.cos((a * Math.PI) / 180);
  console.log(
    `${a >= 0 ? "+" : ""}${a}°: chart coast ${m.toFixed(0)} m from the eye (${along.toFixed(0)} m along the view)`,
  );
}
const axis = rows.find(([a]) => a === 0);
console.log(
  `CHART_BACK for the shore ${eye.shoreAhead} m ahead: ${(eye.shoreAhead - axis[1]).toFixed(0)} m`,
);
await browser.close();
