// The chosen names' state on scene 2's chart over a range of its p: em size
// on screen (CSS px) and opacity, after the minor names give way
// (window.__road.labels, Lettering.snapshot). Development only.
//   node scripts/dev/name-states.mjs "<name>,<name>" from to step
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [list, from = "0", to = "1", step = "0.005"] = process.argv.slice(2);
const names = list.split(",");
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.W ?? 1280),
    height: Number(process.env.H ?? 720),
  },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
for (let p = Number(from); p <= Number(to) + 1e-9; p += Number(step)) {
  const states = await page.evaluate((p) => window.__road.labels(p), p);
  const row = names.map((n) => {
    const s = states.find((x) => x.text === n);
    return s ? `${n} ${s.emPx.toFixed(1)}px ${s.opacity.toFixed(2)}` : `${n} -`;
  });
  console.log(`p ${p.toFixed(4)}: ${row.join(" | ")}`);
}
await browser.close();
