// Screenshots of scene 2 on the home page, for development (not part of the
// site or the tests).
//   node scripts/dev/road.mjs <out-dir> 0 0.02 0.05 0.085 ...
// Each number is scene 2's progress p (a value above 1 is scene 1's p minus
// one, so "0.5" is scene 2 halfway and "-0.2" scene 1 at p = 0.8). Needs a
// server: `npm run dev` (the default base, http://127.0.0.1:3000) or `npm
// run preview` with BASE=http://127.0.0.1:4173. Environment: W, H and S set
// the viewport and device scale (1280, 720, 1.5); WAIT the settle time in ms
// after each scroll (1800); Q=1 adds ?debug.
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [outDir, ...values] = process.argv.slice(2);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
/** Scene 1's pin before the handoff and scene 2's pin, viewport heights. */
const SCENE1 = 3;
const SCENE2 = 30;

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
  await page.waitForFunction(
    () => window.__road?.ready && window.__road.baked,
    null,
    {
      timeout: 120_000,
    },
  );
} catch {
  console.log("scene 2: not ready after 120 s");
}
for (const v of values) {
  const p = Number(v);
  const vh = height;
  const y = p < 0 ? (SCENE1 + p * SCENE1) * vh : (SCENE1 + p * SCENE2) * vh;
  await page.evaluate((y) => {
    if (window.__lenis)
      window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, y);
  await page.waitForTimeout(Number(process.env.WAIT ?? 1800));
  const stats = await page.evaluate(() =>
    window.__road ? { ...window.__road.stats } : null,
  );
  const file = path.join(
    outDir,
    `road-${p < 0 ? "s1" : "p"}${String(Math.abs(p).toFixed(3)).replace(".", "")}-${width}x${height}.png`,
  );
  await page.screenshot({ path: file });
  console.log(`${v} -> ${file}`);
  if (stats)
    console.log(
      `  calls ${stats.calls}, triangles ${stats.triangles}, altitude ${stats.altitude}`,
    );
}
if (logs.length) console.log(logs.join("\n"));
await browser.close();
