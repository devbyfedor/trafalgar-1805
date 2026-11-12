// Why the bake laid a squadron's ships out at the sizes it did, at given
// steps of scene 2's p: the bake's sizes pass replayed at each step from
// the step before, so the sweeps are the bake's own (window.__road.bakeTrace;
// GlyphLayout.traceBakeStep). For each ship of the chosen squadrons: her
// limit (the shared scale or the squadron's fit), her scale after the
// glyphs placed before her and after land, her sweeps on screen against
// other glyphs (dx, dy, signed) and against land (|x|, |y|), the obstacle
// that limited her and that obstacle's sweep. Development only.
//   WHO=calder,villeneuve node scripts/dev/bake-trace.mjs 0.547 0.548 0.549
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, WHO (the
// squadrons, comma separated; all by default), K (their places, comma
// separated; all by default).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const who = process.env.WHO ? process.env.WHO.split(",") : null;
const only = process.env.K ? process.env.K.split(",").map(Number) : null;
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
const names = await page.evaluate(() => window.__road.glyphNames());
const f = (x, d = 2) => (typeof x === "number" ? x.toFixed(d) : String(x));
for (const p of ps) {
  const k = Math.round(p * 1000);
  const rows = await page.evaluate((k) => window.__road.bakeTrace(k), k);
  console.log(`p ${(k / 1000).toFixed(3)} (step ${k})`);
  for (const r of rows) {
    const name = names[1][r.places]?.split(":")[0] ?? r.places;
    if (who && !who.includes(name)) continue;
    console.log(
      `  ${name}: scale ${f(r.scale, 3)} fit ${f(r.fit, 3)} shared ${f(r.shared, 3)} anchor (${f(r.anchor[0], 0)}, ${f(r.anchor[1], 0)}) meeting ${f(r.meeting, 3)}`,
    );
    for (const w of r.why ?? []) {
      const [place, limit, byObstacle, s, , dx, dy, sx, sy, hit, ox, oy] = w;
      if (only && !only.includes(place)) continue;
      console.log(
        `    ${place}: limit ${f(limit, 3)} after glyphs ${f(byObstacle, 3)} after land ${f(s, 3)}  sweep (${f(dx, 1)}, ${f(dy, 1)}) land (${f(sx, 1)}, ${f(sy, 1)})  hit ${hit}${hit >= 0 ? ` its sweep (${f(ox, 1)}, ${f(oy, 1)})` : ""}`,
      );
    }
  }
}
await browser.close();
