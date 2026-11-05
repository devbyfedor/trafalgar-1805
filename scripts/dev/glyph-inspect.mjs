// Development only (session 12), not part of the site or the tests: run from the
// repository with the dev server up, e.g. node scripts/dev/glyph-inspect.mjs
// Samples scene 2 at given p ranges and prints chosen glyphs' probe values
// and the parts of their height (room km, fit px, z/dist, h before room).
//   node inspect.mjs "layer:index:p0:p1:step" ...
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const specs = process.argv.slice(2).map((s) => {
  const [layer, g, p0, p1, step] = s.split(":");
  return {
    layer,
    g: Number(g),
    p0: Number(p0),
    p1: Number(p1),
    step: Number(step ?? 0.0005),
  };
});
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
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
await page.waitForTimeout(1500);
for (const s of specs) {
  const ps = [];
  for (let p = s.p0; p <= s.p1 + 1e-9; p += s.step)
    ps.push(Number(p.toFixed(6)));
  const rows = await page.evaluate(
    ({ ps, layer, g }) =>
      ps.map((p) => {
        const a = window.__road.sample(p)[layer].slice(g * 4, g * 4 + 4);
        const b = window.__road.sample(p, true)[layer].slice(g * 4, g * 4 + 4);
        return [p, ...a, ...b];
      }),
    { ps, layer: s.layer, g: s.g },
  );
  console.log(
    `== ${s.layer}[${s.g}]       p        x        y        h        a |   room km    fit px    z/dist   h0`,
  );
  for (const r of rows)
    console.log(
      `   ${r[0].toFixed(4)} ${r
        .slice(1, 5)
        .map((v) => v.toFixed(2).padStart(8))
        .join(" ")} | ${r
        .slice(5)
        .map((v) => v.toFixed(3).padStart(9))
        .join(" ")}`,
    );
}
await browser.close();
