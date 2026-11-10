// The fleets' layout at given points of scene 2's p, ship by ship: her foot
// on screen (device px from the bottom left), her nominal height, her box
// (left, right, top, in device px at that height), her group's common
// scale, her limit and the scale she was drawn at, and her opacity
// (window.__road.layoutDebug). JSON=<file> writes the rows. Development.
//   node scripts/dev/fleet-layout.mjs 0.735 1
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.W ?? 1280),
    height: Number(process.env.H ?? 720),
  },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
const out = {};
for (const p of ps) {
  const rows = (
    await page.evaluate((p) => window.__road.layoutDebug(p), p)
  ).filter((r) => r.free !== undefined);
  out[p] = rows.map((r) => ({ name: names[r.free], ...r }));
  console.log(`p ${p}`);
  for (const r of out[p])
    console.log(
      `  ${r.name.padEnd(22)} foot (${r.fx.toFixed(0)}, ${r.fy.toFixed(0)})  h0 ${r.h0.toFixed(1)}  box ${r.box.map((v) => v.toFixed(1)).join("/")}  common ${r.common.toFixed(2)}  limit ${r.limit.toFixed(2)}  s ${r.s.toFixed(2)}  a ${r.alpha.toFixed(2)}`,
    );
}
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(out));
await browser.close();
