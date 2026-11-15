// Why the fleets' labels at their tracks' heads stand where they do, at
// given points of scene 2: each label drawn (its text, opacity, outline),
// then every place each head tried, by its own ships or by its head, with
// its room and what made it: the frame's edge, the ground, the names and
// the card, the labels before it, its line, its ships, and how well its ink
// reads on the ground there (inside the ground's figure)
// (window.__road.routeLabels; HeadLabels.explain). Development only.
//   WHO=calder,villeneuve node scripts/dev/head-explain.mjs 0.535 0.548
// Points in the road tools' shared syntax (road-scroll.mjs): p, ranges of
// it (0.53..0.55:0.005), Boulogne's interlude (dive:0.2); each is
// scrolled to by the page's own map, so the frame is the scene's own.
// Where the painting covers the chart the labels are those of the last
// frame the chart drew (it doesn't draw there): flagged "covered".
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, WHO (the
// heads, comma separated; all by default), ALL=1 (every place tried, not
// only those with some weight).
import { chromium } from "@playwright/test";
import {
  inInterlude,
  isCovered,
  parsePoints,
  pointName,
  roadPin,
  scrollToPoint,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = parsePoints(process.argv.slice(2));
if (!points.length) {
  console.log("usage: node scripts/dev/head-explain.mjs <point> ...");
  process.exit(1);
}
const who = process.env.WHO ? process.env.WHO.split(",") : null;
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, {
  sea: points.some(inInterlude),
  timeout: 180_000,
});
const pin = await roadPin(page);
for (const point of points) {
  // Scrolled there, so the frame (and its caption's card) is the scene's own.
  await scrollToPoint(page, point);
  await page.waitForTimeout(1700);
  const drawn = await page.evaluate(() => window.__road.routeLabels(false));
  const tried = await page.evaluate(() => window.__road.routeLabels(true));
  console.log(
    `${point.kind === "p" ? "p " : ""}${pointName(point)}${isCovered(pin, point) ? " (covered: the chart isn't drawn here)" : ""}`,
  );
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
      `    ${t.id} ${t.own ? "own " : "head"} ${t.side} reach ${t.reach} gap ${t.gap}${t.onScreen ? " on screen" : ""}: weight ${t.weight} room ${t.why[0]} [edge ${t.why[1]} ground ${t.why[2]} names ${t.why[3]} labels ${t.why[4]} line ${t.why[5]} ships ${t.why[6]} reads ${t.why[7]} tall ${t.why[8]} (${t.tall})] near ${t.near} inland ${t.inland}`,
    );
  }
}
await browser.close();
