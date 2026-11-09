// Counts the ship glyphs that read in scene 2 at given points of its
// progress: per fleet layer, those drawn at least half there and at least
// READ CSS px tall, on screen (window.__road.sample; development only).
//   node scripts/dev/glyph-count.mjs 0 0.735 1
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, READ (9).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const read = Number(process.env.READ ?? 9);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(800);
const names = await page.evaluate(() => window.__road.glyphNames());
for (const p of ps) {
  const s = await page.evaluate((p) => {
    const r = window.__road.sample(p, 0);
    return { fleets: Array.from(r.fleets), squadrons: Array.from(r.squadrons) };
  }, p);
  const count = (v, list) => {
    const out = [];
    for (let i = 0; i < v.length / 4; i++) {
      const [x, y, h, a] = v.slice(i * 4, i * 4 + 4);
      const on = x >= 0 && y >= 0 && x <= width * scale && y <= height * scale;
      if (a >= 0.5 && h / scale >= read && on) out.push(list[i]);
    }
    return out;
  };
  const f = count(s.fleets, names[0]);
  const q = count(s.squadrons, names[1]);
  console.log(`p ${p}: fleets ${f.length}, squadrons ${q.length}`);
  if (process.env.LIST) console.log(`  ${f.join(", ")}`);
}
await browser.close();
