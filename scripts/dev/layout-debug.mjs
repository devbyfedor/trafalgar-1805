// Prints each squadron's layout at the given points of scene 2's progress:
// its head and anchor on screen (device px from the bottom left), how far
// it was pushed off the coast, its block's radius, how well the block fits
// (sBlock), the morph toward a line, the scale drawn and the glyph height
// (window.__road.layoutDebug; glyphs/layout.ts). Development only.
//   node scripts/dev/layout-debug.mjs 0.29 0.42 0.53
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1000);
const names = await page.evaluate(() => window.__road.glyphNames());
for (const p of ps) {
  const rows = await page.evaluate((p) => window.__road.layoutDebug(p), p);
  console.log(`p ${p}`);
  for (const r of rows) {
    const fmt = (v) =>
      Array.isArray(v)
        ? `(${v.map((x) => x.toFixed(0)).join(", ")})`
        : typeof v === "number"
          ? v.toFixed(3)
          : v;
    const name = names[1][r.places]?.split(":")[0] ?? r.places;
    console.log(
      `  ${name}: ${Object.entries(r)
        .filter(([k]) => k !== "places")
        .map(([k, v]) => `${k} ${fmt(v)}`)
        .join("  ")}`,
    );
  }
}
await browser.close();
