// Does the compositor-hint fix change how scene 1 looks? At several scroll
// positions the page is frozen (GSAP ticker asleep: no scrub, loops, canvases
// or Lenis), screenshotted, the fix's CSS injected, and screenshotted again;
// the two frames are compared pixel by pixel.
//   node fixdiff.mjs   (BASE defaults to the production export on 4391)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("D:/dev/trafalgar-1805/package.json");
const { chromium } = require("@playwright/test");
const sharp = require("sharp");
const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE ?? "http://127.0.0.1:4391";
const cssFile = process.argv[2] ?? "fix-scene1.css";
const css = readFileSync(join(here, cssFile), "utf8");
const outDir = join(here, "runs", `fixdiff-${cssFile.replace(".css", "")}`);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();
// The chart is irrelevant here; keep scene 2 from loading.
await page.addInitScript(() => {
  // A freezable requestAnimationFrame, installed before GSAP captures it.
  const raf = window.requestAnimationFrame.bind(window);
  const queue = [];
  window.__frozen = false;
  window.requestAnimationFrame = (cb) => {
    if (window.__frozen) {
      queue.push(cb);
      return 0;
    }
    return raf(cb);
  };
  window.__thaw = () => {
    window.__frozen = false;
    for (const cb of queue.splice(0)) raf(cb);
  };
  const ric = window.requestIdleCallback;
  window.requestIdleCallback = (cb, o) =>
    o && o.timeout === 2500 ? 0 : ric(cb, o);
});
await page.goto(`${base}/`, { waitUntil: "load" });
await page.waitForTimeout(2500);
const rows = [];
for (const p of [0.02, 0.12, 0.25, 0.4, 0.5, 0.62, 0.75, 0.9]) {
  const y = Math.round(p * 2160);
  await page.evaluate(async (y) => {
    window.__lenis?.scrollTo(y, { immediate: true, force: true });
    await new Promise((r) => setTimeout(r, 1500));
  }, y);
  // Freeze: GSAP's ticker drives Lenis, the scrub, the loops and the canvases.
  await page.evaluate(() => {
    window.__frozen = true;
  });
  await page.waitForTimeout(400);
  const a = await page.screenshot();
  await page.evaluate((text) => {
    let s = document.querySelector("style[data-perf-fix]");
    if (!s) {
      s = document.createElement("style");
      s.dataset.perfFix = "1";
      document.head.append(s);
    }
    s.textContent = text;
  }, css);
  await page.waitForTimeout(600);
  const b = await page.screenshot();
  // remove the fix again and unfreeze for the next position
  await page.evaluate(() => {
    document.querySelector("style[data-perf-fix]")?.remove();
    window.__thaw();
  });
  const ra = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const rb = await sharp(b).raw().toBuffer({ resolveWithObject: true });
  const n = ra.info.width * ra.info.height;
  const ch = ra.info.channels;
  let max = 0;
  let over2 = 0;
  let over8 = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let c = 0; c < 3; c++)
      m = Math.max(m, Math.abs(ra.data[i * ch + c] - rb.data[i * ch + c]));
    sum += m;
    if (m > max) max = m;
    if (m > 2) over2++;
    if (m > 8) over8++;
  }
  writeFileSync(join(outDir, `p${p}-before.png`), a);
  writeFileSync(join(outDir, `p${p}-after.png`), b);
  rows.push({
    p,
    scrollY: y,
    maxDiff: max,
    meanDiff: +(sum / n).toFixed(4),
    pctOver2: +((100 * over2) / n).toFixed(3),
    pctOver8: +((100 * over8) / n).toFixed(4),
  });
  console.log(JSON.stringify(rows.at(-1)));
}
writeFileSync(join(outDir, "diff.json"), JSON.stringify(rows, null, 1));
await browser.close();
