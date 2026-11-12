// Frame timing of /lab/chart along the flight, on this machine's GPU
// (development only, not part of the site or the tests).
//   node scripts/dev/bench.mjs [step] [frames]
// For each progress p = 0, step, 2 step ... 1 the lab draws `frames` frames
// (60 by default) and times each on the GPU (EXT_disjoint_timer_query_webgl2)
// and on the CPU around the draw; the first five after each jump are left
// out. Needs a server, as shot.mjs does: `npm run preview` with
// BASE=http://127.0.0.1:4173 for numbers that count. Environment: BASE, W,
// H and S as in shot.mjs (1280, 720, 1.5: the owner's laptop); QUALITY pins
// a quality level (0, the top, by default); P=0.1,0.2 benches only those
// points; SWEEPS=n keeps the best of n sweeps per point (other work on the
// machine only ever adds time); IDLE=ms waits that long before each point
// (on battery a pause lets the power budget refill); AB=<name> times the
// frame with and without the chart's objects of that name
// (Chart.showNamed) on alternate frames at each point instead;
// JSON=<file> also writes the rows.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const step = Number(process.argv[2] ?? 0.05);
const frames = Number(process.argv[3] ?? 60);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const quality = Number(process.env.QUALITY ?? 0);
const sweeps = Number(process.env.SWEEPS ?? 1);
const idle = Number(process.env.IDLE ?? 0);
const ab = process.env.AB ?? "";
const SKIP = 6;

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
  `${width}x${height} at scale ${scale}, quality ${quality}, ${frames} frames a point${ab ? `, with and without ${ab}` : `, best of ${sweeps}`}`,
);
const pause = () =>
  idle > 0 ? new Promise((resolve) => setTimeout(resolve, idle)) : null;
const points = process.env.P
  ? process.env.P.split(",").map(Number)
  : Array.from(
      { length: Math.round(1 / step) + 1 },
      (_, i) => Math.round(Math.min(1, i * step) * 1e4) / 1e4,
    );

if (ab) {
  console.log(
    `    p | with ${ab}: median  p95 | without: median  p95 | ratio | pairs`,
  );
  const rows = [];
  for (const p of points) {
    await pause();
    const r = await page.evaluate(
      ([f, at, name]) => window.__chart.bench(f, at, name),
      [2 * frames + SKIP, p, ab],
    );
    const on = [];
    const off = [];
    const byFrame = new Map();
    r.gpu.forEach((t, k) => {
      const frame = r.gpuFrame[k];
      if (frame < SKIP) return;
      (frame % 2 === 0 ? on : off).push(t);
      byFrame.set(frame, t);
    });
    const ratios = [];
    for (const [frame, t] of byFrame)
      if (frame % 2 === 0 && byFrame.has(frame + 1))
        ratios.push(t / byFrame.get(frame + 1));
    const row = {
      p,
      onMedian: quantile(on, 0.5),
      onP95: quantile(on, 0.95),
      offMedian: quantile(off, 0.5),
      offP95: quantile(off, 0.95),
      pairRatio: quantile(ratios, 0.5),
    };
    rows.push(row);
    console.log(
      `${p.toFixed(3).padStart(5)} | ${ms(row.onMedian)} ${ms(row.onP95)} | ${ms(row.offMedian)} ${ms(row.offP95)} | ${(row.onMedian / row.offMedian).toFixed(2).padStart(6)} | ${row.pairRatio.toFixed(2)}`,
    );
  }
  if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
} else {
  console.log(
    "    p | GPU median   p95   max | CPU median   p95 | calls triangles",
  );
  const rows = [];
  for (let sweep = 0; sweep < sweeps; sweep++) {
    for (const [i, p] of points.entries()) {
      await pause();
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
      // The sweep with the best GPU time is kept whole (as road-bench.mjs
      // and the chart-frames test keep it); cpuP95Min is the CPU's own
      // best over the sweeps, since one's slow sweep is not the other's.
      const best = rows[i];
      row.cpuP95Min = Math.min(row.cpuP95, best?.cpuP95Min ?? row.cpuP95);
      if (!best || !(row.gpuP95 >= best.gpuP95)) rows[i] = row;
      else best.cpuP95Min = row.cpuP95Min;
    }
  }
  for (const row of rows)
    console.log(
      `${row.p.toFixed(3).padStart(5)} | ${ms(row.gpuMedian)} ${ms(row.gpuP95)} ${ms(row.gpuMax)} | ${ms(row.cpuMedian)} ${ms(row.cpuP95)}${sweeps > 1 ? ` (least ${ms(row.cpuP95Min).trim()})` : ""} | ${String(row.calls).padStart(5)} ${String(row.triangles).padStart(9)}${row.disjoint ? `  (${row.disjoint} disjoint)` : ""}`,
    );
  const worst = (key) =>
    rows.reduce((a, r) => (r[key] > a[key] ? r : a), rows[0]);
  for (const key of ["gpuMedian", "gpuP95", "cpuP95"]) {
    const r = worst(key);
    console.log(`worst ${key}: ${r[key].toFixed(2)} ms at p = ${r.p}`);
  }
  if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
}
if (errors.length) console.log(errors.join("\n"));
await browser.close();
