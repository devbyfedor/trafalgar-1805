// How far the owner's licence of 10 November 2026 moves each ship from her
// place at the sources' spacing: at dawn on 21 October and at anchor off
// Cádiz (window.__road.spreadShift; src/scenes/02-road/fleets.ts). Prints
// the largest shifts, in km and nautical miles. Development only.
//   node scripts/dev/fleet-shift.mjs
// Environment: BASE (default http://127.0.0.1:3000).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
const shift = await page.evaluate(() => window.__road.spreadShift());
await browser.close();
const NM = 1.852;
for (const [what, rows] of Object.entries(shift)) {
  const sorted = [...rows].sort((a, b) => b.km - a.km);
  const mean = rows.reduce((s, r) => s + r.km, 0) / rows.length;
  console.log(
    `${what}: ${rows.length} ships; largest ${sorted[0].km.toFixed(2)} km (${(sorted[0].km / NM).toFixed(2)} nm, the ${sorted[0].name}); mean ${mean.toFixed(2)} km`,
  );
  console.log(
    `  ${sorted
      .slice(0, 8)
      .map((r) => `${r.name} ${r.km.toFixed(2)}`)
      .join(", ")}`,
  );
}
