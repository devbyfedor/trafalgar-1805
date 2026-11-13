// Screenshots of scene 2 on the home page, for development (not part of the
// site or the tests).
//   node scripts/dev/road.mjs <out-dir> 0 0.02 0.05 0.085 ...
//   node scripts/dev/road.mjs <out-dir> 0.2..0.22:0.005 dive:0..1:0.25 hold:0.5
// Each point is in the road tools' shared syntax (road-scroll.mjs): scene
// 2's progress p, a range of it, or a point of Boulogne's interlude
// (dive:0.5, hold:0.5, rise:0.5); the page's own map (window.__road.
// scrollFor) finds where each shows, so the frames are the story's same
// moments whatever the pin's length. A negative number is scene 1 (its p
// minus one: "-0.2" is scene 1 at p = 0.8). Files: road-p0210-1280x720.png,
// road-boulogne-dive-0500-1280x720.png, road-s1… for scene 1. Needs a
// server: `npm run dev` (the default base, http://127.0.0.1:3000) or `npm
// run preview` with BASE=http://127.0.0.1:4173. Environment: W, H and S set
// the viewport and device scale (1280, 720, 1.5); WAIT the settle time in
// ms after each scroll (1800); Q=1 adds ?debug.
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  inInterlude,
  parsePoints,
  pointFile,
  pointName,
  SCENE1,
  scrollForPoint,
  scrollPageTo,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [outDir, ...values] = process.argv.slice(2);
if (!outDir || !values.length) {
  console.log("usage: node scripts/dev/road.mjs <out-dir> <point> ...");
  process.exit(1);
}
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const points = parsePoints(values);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    logs.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
// EASE=<file>: a trial table of the dawn fleets' shifts (fleets.ts,
// DAWN_EASE's form; scripts/dev/fleet-ease.mjs), "{}" for the sources' places.
if (process.env.EASE) {
  const { readFileSync } = await import("node:fs");
  const ease =
    process.env.EASE === "{}" ? "{}" : readFileSync(process.env.EASE, "utf8");
  await page.addInitScript((json) => {
    try {
      window.localStorage.setItem("road.dawnEase", json);
    } catch {}
  }, ease);
}
await page.goto(`${base}/${process.env.Q ? "?debug" : ""}`);
await page.waitForLoadState("load");
try {
  // An interlude's points wait for Boulogne's painting as well.
  await waitForRoad(page, {
    sea: points.some(inInterlude),
    timeout: 120_000,
  });
} catch {
  console.log("scene 2: not ready after 120 s");
}
for (const point of points) {
  const scene1 = point.kind === "p" && point.p < 0;
  // Scene 1's pin is SCENE1 screens of its p, from the top.
  const y = scene1
    ? (SCENE1 + point.p * SCENE1) * height
    : await scrollForPoint(page, point);
  await scrollPageTo(page, y);
  await page.waitForTimeout(Number(process.env.WAIT ?? 1800));
  const stats = await page.evaluate(() =>
    window.__road ? { ...window.__road.stats } : null,
  );
  const name = scene1
    ? `s1${pointFile({ kind: "p", p: -point.p }).slice(1)}`
    : pointFile(point);
  const file = path.join(outDir, `road-${name}-${width}x${height}.png`);
  await page.screenshot({ path: file });
  console.log(`${pointName(point)}: y ${y.toFixed(1)} -> ${file}`);
  if (stats)
    console.log(
      `  calls ${stats.calls}, triangles ${stats.triangles}, altitude ${stats.altitude}`,
    );
}
if (logs.length) console.log(logs.join("\n"));
await browser.close();
