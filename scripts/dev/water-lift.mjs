// Proof that nothing standing on the sea can sink into it, along the whole
// of scene 2 (development only, not part of the site or the tests).
//   node scripts/dev/water-lift.mjs [step]
// At each p = 0, step, 2 step ... 1 (0.0025 by default) the scene draws its
// frame, then its terrain alone with each pixel's height above the sea
// (Chart.probeWaterLift), and counts the water pixels above the sea. Every
// water pixel must lie at sea level exactly; land pixels above it show the
// probe sees heights. Needs a server: BASE (http://127.0.0.1:3000; the
// preview on 4173 for the production build); W, H and S as in road.mjs.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const step = Number(process.argv[2] ?? 0.0025);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const SCENE1 = 3;
const SCENE2 = 30;

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
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 120_000,
});
await page.evaluate(
  (y) => {
    if (window.__lenis)
      window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  },
  (SCENE1 + 0.5 * SCENE2) * height,
);
await page.waitForTimeout(1500);

const count = Math.round(1 / step);
let worst = null;
let lifted = 0;
let landSeen = 0;
for (let i = 0; i <= count; i++) {
  const p = Math.round(Math.min(1, i * step) * 1e5) / 1e5;
  const r = await page.evaluate((at) => window.__road.waterLift(at), p);
  if (r.landRaised > 0) landSeen++;
  if (r.lifted > 0) {
    lifted++;
    console.log(
      `p ${p.toFixed(4)}: ${r.lifted} of ${r.water} water pixels above the sea, up to ${r.maxM.toFixed(1)} m at (${r.at.join(", ")})`,
    );
    if (!worst || r.maxM > worst.maxM) worst = { p, ...r };
  }
}
console.log(
  `${count + 1} frames: ${lifted} with water above the sea${worst ? ` (worst ${worst.maxM.toFixed(1)} m at p ${worst.p})` : ""}; land seen above the sea in ${landSeen}`,
);
if (errors.length) console.log(errors.join("\n"));
await browser.close();
