// One measured run of the home page on this machine's GPU.
//   node run.mjs <out-prefix>
// Env:
//   BASE      page origin (default http://127.0.0.1:3000, the dev server)
//   QUERY     query string (default "")
//   WAIT      ms after the load event before scrolling starts (default 1000)
//   PATTERN   wheel: STEP px every INTERVAL ms (defaults 100 / 150)
//   STEP, INTERVAL
//   DIST      total scroll, CSS px (default 4320: scene 1's 3 + 2.5 vh pin, and half a vh more)
//   AFTER     ms to keep recording after the last wheel step (default 2500)
//   TRACE     1: record a Chrome trace (CDP tracing, whole browser)
//   CATS      override trace categories (comma list)
//   NOSCROLL  1: never scroll (load only)

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("D:/dev/trafalgar-1805/package.json");
const { chromium } = require("@playwright/test");
const here = dirname(fileURLToPath(import.meta.url));

const out = process.argv[2] ?? join(here, "runs", `run-${Date.now()}`);
const base = process.env.BASE ?? "http://127.0.0.1:3000";
const query = process.env.QUERY ?? "";
const wait = Number(process.env.WAIT ?? 1000);
const step = Number(process.env.STEP ?? 100);
const interval = Number(process.env.INTERVAL ?? 150);
const dist = Number(process.env.DIST ?? 4320);
const after = Number(process.env.AFTER ?? 2500);
const trace = process.env.TRACE === "1";
const noscroll = process.env.NOSCROLL === "1";
const cats = (
  process.env.CATS ??
  [
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.frame",
    "disabled-by-default-devtools.timeline.stack",
    "v8.execute",
    "v8",
    "disabled-by-default-v8.gc",
    "disabled-by-default-v8.cpu_profiler",
    "blink.user_timing",
    "benchmark",
    "gpu",
    "viz",
    "toplevel",
  ].join(",")
).split(",");

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();

if (process.env.STYLE) {
  const { readFileSync: readCss } = await import("node:fs");
  const css = process.env.STYLE.split(",")
    .map((p) => readCss(p, "utf8"))
    .join(String.fromCharCode(10));
  await page.addInitScript((text) => {
    const add = () => {
      const s = document.createElement("style");
      s.dataset.perfFix = "1";
      s.textContent = text;
      document.head.append(s);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add, { once: true });
  }, css);
}
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    errors.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
if (process.env.NOCHART === "1")
  await page.addInitScript(() => {
    window.__perfNoChart = true;
  });
if (process.env.CONVERT_U16 === "1")
  await page.addInitScript(() => {
    window.__perfConvertU16 = true;
  });
if (process.env.FLUSH_TROIKA === "1")
  await page.addInitScript(() => {
    window.__perfFlushTroika = true;
  });
await page.addInitScript({ path: join(here, "instrument.js") });

if (trace) {
  await browser.startTracing(page, {
    path: `${out}.trace.json`,
    screenshots: false,
    categories: cats,
  });
}
const tNav = Date.now();
await page.goto(`${base}/${query}`, { waitUntil: "load", timeout: 180_000 });
const tLoad = Date.now();
await page.waitForTimeout(wait);
const tScroll = Date.now();
let steps = 0;
if (!noscroll) {
  await page.mouse.move(640, 360);
  for (let y = 0; y < dist; y += step) {
    await page.mouse.wheel(0, step);
    steps++;
    await page.waitForTimeout(interval);
  }
}
const tEnd = Date.now();
await page.waitForTimeout(after);
const dump = await page.evaluate(() => window.__perf.dump());
const gpuName = await page.evaluate(() => {
  const gl = document
    .querySelector("[data-layer=chart] canvas")
    ?.getContext("webgl2");
  const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
});
const state = await page.evaluate(() => ({
  scrollY: window.scrollY,
  road: !!window.__road?.ready,
  stats: window.__road?.stats ?? null,
}));
if (trace) await browser.stopTracing();
await browser.close();

const meta = {
  base,
  query,
  wait,
  step,
  interval,
  dist,
  steps,
  trace,
  nochart: process.env.NOCHART === "1",
  style: process.env.STYLE ?? "",
  flushTroika: process.env.FLUSH_TROIKA === "1",
  gpuName,
  wall: {
    nav: 0,
    load: tLoad - tNav,
    scroll: tScroll - tNav,
    end: tEnd - tNav,
  },
  state,
  errors: errors.slice(0, 50),
};
writeFileSync(`${out}.json`, JSON.stringify({ meta, ...dump }));
console.log(
  JSON.stringify({
    out,
    gpuName,
    load: meta.wall.load,
    scroll: meta.wall.scroll,
    end: meta.wall.end,
    steps,
    state: { scrollY: state.scrollY, road: state.road },
    errors: errors.length,
  }),
);
