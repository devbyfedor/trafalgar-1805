// The painting's studio (development only): Boulogne's plates painted and
// stacked at the hold in a blank page, with no Next server, so several
// plates' painters can work at once. Bundles
// src/scenes/02-road/boulogne-sea/paint/studio.ts with esbuild, runs it in
// Chromium at the laptop's size and shoots it.
//   node scripts/dev/sea-studio.mjs <out.png> [plate-id ...]
// Environment:
//   MODE   colour (default) | ink | a number 0..1 (colour over the engraving)
//   X      the drift, metres to the right (0)
//   W H S  viewport and device scale (1280, 720, 1.5)
//   CROP   x,y,w,h in CSS px: shoot only that part (e.g. a hero craft)
//   BG     the page's background behind the plates (#000)
// It prints each plate's jobs: how many, the total and the worst job in ms
// (keep the worst under about 6 ms: the slices are 4 ms, and no job may make
// a long task).
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const [out, ...plates] = process.argv.slice(2);
if (!out) {
  console.log(
    "usage: node scripts/dev/sea-studio.mjs <out.png> [plate-id ...]",
  );
  process.exit(1);
}
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const modeEnv = process.env.MODE ?? "colour";
const mode =
  modeEnv === "colour" || modeEnv === "ink" ? modeEnv : Number(modeEnv);
const x = Number(process.env.X ?? 0);
const bg = process.env.BG ?? "#000";
const crop = process.env.CROP?.split(",").map(Number);

const bundle = await build({
  entryPoints: [
    path.join(repo, "src/scenes/02-road/boulogne-sea/paint/studio.ts"),
  ],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: "es2022",
  alias: { "@": path.join(repo, "src") },
  logLevel: "error",
});
const code = bundle.outputFiles[0].text;

await mkdir(path.dirname(path.resolve(out)), { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
const errors = [];
tab.on("pageerror", (e) => errors.push(e.message));
tab.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await tab.setContent(
  `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;overflow:hidden;background:${bg}}
#root{position:absolute;inset:0;overflow:hidden}
</style></head><body><div id="root"></div></body></html>`,
);
await tab.evaluate(
  (o) => {
    window.__studioOptions = o;
  },
  { plates, mode, x },
);
await tab.addScriptTag({ content: code });
await tab.waitForFunction(() => window.__studio?.done === true, null, {
  timeout: 120000,
});
const result = await tab.evaluate(() => window.__studio);
if (result.error) errors.push(result.error);
await tab.screenshot({
  path: out,
  ...(crop
    ? { clip: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } }
    : {}),
});
await browser.close();
for (const t of result.timings)
  console.log(
    `${t.plate.padEnd(22)} ${t.mode.padEnd(6)} jobs ${String(t.jobs).padStart(4)}  total ${t.total.toFixed(1).padStart(7)} ms  worst ${t.worst.toFixed(1).padStart(6)} ms`,
  );
console.log(`-> ${out}`);
if (errors.length) {
  console.log(`page errors:\n  ${errors.join("\n  ")}`);
  process.exit(2);
}
