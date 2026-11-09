// Why a squadron's ships are the size they are at the given points of scene
// 2's progress: for each chosen place, the limit it was given (the shared
// scale, its sign, its baked size), its scale after the glyphs placed before
// it and after land, its baked size, and the height and opacity it is drawn
// at (window.__road.layoutDebug's `why`, window.__road.motion). Development.
//   WHO=nelson K=0,3,5 node scripts/dev/glyph-why.mjs 0.424 0.4245
// Environment: BASE (default http://127.0.0.1:3000), WHO (squadron), K
// (its places, comma separated).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const who = process.env.WHO ?? "nelson";
const ks = (process.env.K ?? "0").split(",").map(Number);
const ps = process.argv.slice(2).map(Number);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180000 },
);
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  window.__lenis
    ? window.__lenis.scrollTo(y, { immediate: true, force: true })
    : window.scrollTo(0, y);
});
await page.waitForTimeout(800);
const names = await page.evaluate(() => window.__road.glyphNames());
for (const p of ps) {
  const rows = await page.evaluate((p) => window.__road.layoutDebug(p), p);
  const m = await page.evaluate((p) => window.__road.motion(p), p);
  for (const r of rows) {
    const name = names[1][r.places]?.split(":")[0];
    if (name !== who) continue;
    const f = (x) => x.toFixed(3);
    const parts = [];
    for (const k of ks) {
      const w = r.why.find((w) => w[0] === k);
      const gi = names[1].indexOf(`${who}:${k}`);
      const [h, a] = m[1].slice(gi * 6 + 2, gi * 6 + 4);
      parts.push(
        w
          ? `${k}: lim ${f(w[1])} obs ${f(w[2])} land ${f(w[3])} baked ${f(w[4])} h ${h.toFixed(1)} a ${a.toFixed(2)}`
          : `${k}: -`,
      );
    }
    console.log(
      `p ${p} scale ${f(r.scale)} sign ${f(r.sign)} | ${parts.join(" | ")}`,
    );
  }
}
await browser.close();
