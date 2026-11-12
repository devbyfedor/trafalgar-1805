// Why the fleets' labels at their tracks' heads stand where they do, at
// given points of scene 2's progress: each label drawn (its text, opacity,
// outline), then every place each head tried, by its own ships or by its
// head, with its room and what made it: the frame's edge, the ground, the
// names and the card, the labels before it, its line, its ships
// (window.__road.routeLabels; HeadLabels.explain). Development only.
//   WHO=calder,villeneuve node scripts/dev/head-explain.mjs 0.535 0.548
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, WHO (the
// heads, comma separated; all by default), ALL=1 (every place tried, not
// only those with some weight).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const who = process.env.WHO ? process.env.WHO.split(",") : null;
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const SCENE1 = 3;
const SCENE2 = 30;
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
for (const p of ps) {
  // Scrolled there, so the frame (and its caption's card) is the scene's own.
  await page.evaluate(
    ([p, SCENE1, SCENE2]) => {
      const y = (SCENE1 + p * SCENE2) * window.innerHeight;
      if (window.__lenis)
        window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    [p, SCENE1, SCENE2],
  );
  await page.waitForTimeout(1700);
  const drawn = await page.evaluate(() => window.__road.routeLabels(false));
  const tried = await page.evaluate(() => window.__road.routeLabels(true));
  console.log(`p ${p}`);
  for (const d of drawn) {
    if (who && !who.includes(d.id)) continue;
    const q = d.quad.map((v) => Math.round(v));
    console.log(
      `  drawn ${d.id}: "${d.text}" opacity ${d.opacity} at (${q[0]}, ${q[1]})-(${q[4]}, ${q[5]})`,
    );
  }
  for (const t of tried) {
    if (who && !who.includes(t.id)) continue;
    if (process.env.ALL !== "1" && t.weight <= 0 && t.why[0] <= 0.01) continue;
    console.log(
      `    ${t.id} ${t.own ? "own " : "head"} ${t.side} reach ${t.reach} gap ${t.gap}: weight ${t.weight} room ${t.why[0]} [edge ${t.why[1]} ground ${t.why[2]} names ${t.why[3]} labels ${t.why[4]} line ${t.why[5]} ships ${t.why[6]}]`,
    );
  }
}
await browser.close();
