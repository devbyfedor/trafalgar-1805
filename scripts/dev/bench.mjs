// Frame timing of /lab/chart along the flight, on this machine's GPU
// (development only, not part of the site or the tests).
//   node scripts/dev/bench.mjs [step] [frames]
// For each progress p = 0, step, 2 step ... 1 the lab draws `frames` frames
// (60 by default) and times each on the GPU (EXT_disjoint_timer_query_webgl2)
// and on the CPU around the draw; the first five after each jump are left
// out. Needs a server, as shot.mjs does: `npm run preview` with
// BASE=http://127.0.0.1:4173 for numbers that count. Environment: BASE, W,
// H and S as in shot.mjs (1280, 720, 1.5: the owner's laptop); QUALITY pins
// a quality level (0, the top, by default); JSON=<file> also writes the rows.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const step = Number(process.argv[2] ?? 0.05);
const frames = Number(process.argv[3] ?? 60);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const quality = Number(process.env.QUALITY ?? 0);
const SKIP = 5;

function quantile(values, q) {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
const ms = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(6) : "     -");

// The new headless mode renders on the GPU.
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(`${base}/lab/chart/?quality=${quality}`);
await page.waitForFunction(() => window.__chart?.ready, null, {
  timeout: 90_000,
});
const renderer = await page.evaluate(() => {
  const gl = document.querySelector("canvas")?.getContext("webgl2");
  const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log(`${renderer}`);
console.log(
  `${width}x${height} at scale ${scale}, quality ${quality}, ${frames} frames a point`,
);
console.log(
  "    p | GPU median   p95   max | CPU median   p95 | calls triangles",
);

const rows = [];
const count = Math.round(1 / step);
for (let i = 0; i <= count; i++) {
  const p = Math.min(1, i * step);
  const result = await page.evaluate(
    ([f, at]) => window.__chart.bench(f, at),
    [frames + SKIP, p],
  );
  const stats = await page.evaluate(() => ({ ...window.__chart.stats }));
  const gpu = result.gpu.slice(SKIP);
  const cpu = result.cpu.slice(SKIP);
  const row = {
    p,
    gpuMedian: quantile(gpu, 0.5),
    gpuP95: quantile(gpu, 0.95),
    gpuMax: gpu.length ? Math.max(...gpu) : Number.NaN,
    cpuMedian: quantile(cpu, 0.5),
    cpuP95: quantile(cpu, 0.95),
    disjoint: result.disjoint,
    calls: stats.calls,
    triangles: stats.triangles,
    width: stats.width,
    height: stats.height,
  };
  rows.push(row);
  console.log(
    `${p.toFixed(2).padStart(5)} | ${ms(row.gpuMedian)} ${ms(row.gpuP95)} ${ms(row.gpuMax)} | ${ms(row.cpuMedian)} ${ms(row.cpuP95)} | ${String(row.calls).padStart(5)} ${String(row.triangles).padStart(9)}${row.disjoint ? `  (${row.disjoint} disjoint)` : ""}`,
  );
}
const worst = (key) =>
  rows.reduce((a, r) => (r[key] > a[key] ? r : a), rows[0]);
for (const key of ["gpuMedian", "gpuP95", "cpuP95"]) {
  const r = worst(key);
  console.log(`worst ${key}: ${r[key].toFixed(2)} ms at p = ${r.p.toFixed(2)}`);
}
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
if (errors.length) console.log(errors.join("\n"));
await browser.close();
