// Fleet ships' intended places on screen at a few values of scene 2's p
// (window.__road.motion, layer 0: [x, y, h, alpha, ix, iy] per glyph):
// shows a jump between steps. Development only.
//   node scripts/dev/glyph-steps.mjs <ship,ship,...> p p p ...
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, EASE.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [list, ...ps] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.W ?? 1280),
    height: Number(process.env.H ?? 720),
  },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
if (process.env.EASE) {
  const ease =
    process.env.EASE === "{}" ? "{}" : readFileSync(process.env.EASE, "utf8");
  await page.addInitScript((json) => {
    try {
      window.localStorage.setItem("road.dawnEase", json);
    } catch {}
  }, ease);
}
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
const wanted = list.split(",");
for (const p of ps.map(Number)) {
  const [fleet] = await page.evaluate((p) => window.__road.motion(p), p);
  const out = [];
  for (let i = 0; i < names.length; i++) {
    if (!wanted.includes(names[i])) continue;
    const [x, y, h, a, ix, iy] = fleet.slice(i * 6, i * 6 + 6);
    out.push(
      `${names[i]} at (${ix.toFixed(2)}, ${iy.toFixed(2)}) drawn (${x.toFixed(1)}, ${y.toFixed(1)}) h ${h.toFixed(1)} a ${a.toFixed(2)}`,
    );
  }
  console.log(`p ${p}: ${out.join("; ")}`);
}
await browser.close();
