// Proof that nothing standing on the sea can sink into it, along the whole
// of scene 2 (development only, not part of the site or the tests).
//   node scripts/dev/water-lift.mjs [step] [from] [to]
//   node scripts/dev/water-lift.mjs 0.15..0.3:0.001 0.5
// At each p (0.0025 from 0 to 1 by default) the scene draws its frame,
// then its terrain alone with each pixel's height above the sea
// (Chart.probeWaterLift), and counts the water pixels above the sea. Every
// water pixel must lie at sea level exactly; land pixels above it show the
// probe sees heights. Bare numbers keep their old meaning (step, from,
// to); anything else is the road tools' point syntax (road-scroll.mjs),
// p only: the probe draws the flight's own frame at p, and an interlude's
// camera is not the flight's. Needs a server: BASE (http://127.0.0.1:3000;
// the preview on 4173 for the production build); W, H and S as in road.mjs.
import { chromium } from "@playwright/test";
import {
  inInterlude,
  pointName,
  pointsFromArgs,
  scrollRoadTo,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = pointsFromArgs(process.argv.slice(2), {
  order: ["step", "from", "to"],
  defaults: { step: 0.0025, from: 0, to: 1 },
  pStep: 0.0025,
});
if (points.some(inInterlude)) {
  console.log(
    "water-lift: p only (the probe draws the flight's frame at p, not an interlude's)",
  );
  process.exit(1);
}
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { baked: false, timeout: 120_000 });
// Into scene 2, by the page's own map, so its canvas is on screen.
await scrollRoadTo(page, 0.5);
await page.waitForTimeout(1500);

let worst = null;
let lifted = 0;
let landSeen = 0;
for (const point of points) {
  const p = point.p;
  const r = await page.evaluate((at) => window.__road.waterLift(at), p);
  if (r.landRaised > 0) landSeen++;
  if (r.lifted > 0) {
    lifted++;
    console.log(
      `p ${pointName(point)}: ${r.lifted} of ${r.water} water pixels above the sea, up to ${r.maxM.toFixed(1)} m at (${r.at.join(", ")})`,
    );
    if (!worst || r.maxM > worst.maxM) worst = { p, ...r };
  }
}
console.log(
  `${points.length} frames: ${lifted} with water above the sea${worst ? ` (worst ${worst.maxM.toFixed(1)} m at p ${worst.p})` : ""}; land seen above the sea in ${landSeen}`,
);
if (errors.length) console.log(errors.join("\n"));
await browser.close();
