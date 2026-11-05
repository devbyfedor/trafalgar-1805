// Frame timing of scene 2 on the home page, on this machine's GPU
// (development only, not part of the site or the tests).
//   node scripts/dev/road-bench.mjs [step] [frames]
// For each progress p = 0, step, 2 step ... 1 of scene 2, the scene draws
// `frames` frames at p (60 by default) and times each on the GPU
// (EXT_disjoint_timer_query_webgl2) and on the CPU around the draw; the
// first five after each jump are left out. The page is scrolled into scene
// 2 first, so scene 1's own loops are paused. AB=1 alternates the terrain's
// sea-depth write on and off at each p instead (three rounds each way).
// Needs a server: `npm run preview` with BASE=http://127.0.0.1:4173 for
// numbers that count. Environment: BASE, W, H and S as in road.mjs (1280,
// 720, 1.5: the owner's laptop); QUALITY pins a quality level (0, the top,
// by default); P=0.1,0.2 benches only those points; SWEEPS=n keeps the
// best of n sweeps per point; JSON=<file> also writes the rows.
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
const ab = process.env.AB === "1";
const SKIP = 5;
/** Scene 1's pin before the handoff and scene 2's pin, viewport heights. */
const SCENE1 = 3;
const SCENE2 = 30;

function quantile(values, q) {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
const ms = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(6) : "     -");

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
await page.goto(`${base}/?quality=${quality}`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 120_000,
});
// Into scene 2, so scene 1's loops pause and only the chart draws.
await page.evaluate(
  (y) => {
    if (window.__lenis)
      window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  },
  (SCENE1 + 0.5 * SCENE2) * height,
);
await page.waitForTimeout(2500);
const renderer = await page.evaluate(() => {
  const gl = document
    .querySelector("[data-layer=chart] canvas")
    ?.getContext("webgl2");
  const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log(renderer);
console.log(
  `${width}x${height} at scale ${scale}, quality ${quality}, ${frames} frames a point${ab ? ", sea depth on and off" : `, best of ${sweeps}`}`,
);

const points = process.env.P
  ? process.env.P.split(",").map(Number)
  : Array.from(
      { length: Math.round(1 / step) + 1 },
      (_, i) => Math.round(Math.min(1, i * step) * 1e4) / 1e4,
    );

const bench = async (p, n) => {
  const r = await page.evaluate(
    ([f, at]) => window.__road.bench(f, at),
    [n + SKIP, p],
  );
  return {
    gpu: r.gpu.slice(SKIP),
    cpu: r.cpu.slice(SKIP),
    disjoint: r.disjoint,
  };
};

if (ab) {
  console.log("    p |  on median  p95 | off median  p95 | on/off");
  for (const p of points) {
    const on = [];
    const off = [];
    for (let round = 0; round < 3; round++) {
      for (const flag of round % 2 === 0 ? [true, false] : [false, true]) {
        await page.evaluate((f) => window.__road.seaDepth(f), flag);
        await bench(p, 8);
        const r = await bench(p, frames);
        (flag ? on : off).push(...r.gpu);
      }
    }
    await page.evaluate(() => window.__road.seaDepth(true));
    const mOn = quantile(on, 0.5);
    const mOff = quantile(off, 0.5);
    console.log(
      `${p.toFixed(3).padStart(5)} | ${ms(mOn)} ${ms(quantile(on, 0.95))} | ${ms(mOff)} ${ms(quantile(off, 0.95))} | ${(mOn / mOff).toFixed(2)}`,
    );
  }
} else {
  console.log(
    "    p | GPU median   p95   max | CPU median   p95 | calls triangles",
  );
  const rows = [];
  for (const p of points) {
    let best = null;
    for (let i = 0; i < sweeps; i++) {
      const r = await bench(p, frames);
      const stats = await page.evaluate(() => ({ ...window.__road.stats }));
      const row = {
        p,
        gpuMedian: quantile(r.gpu, 0.5),
        gpuP95: quantile(r.gpu, 0.95),
        gpuMax: r.gpu.length ? Math.max(...r.gpu) : Number.NaN,
        cpuMedian: quantile(r.cpu, 0.5),
        cpuP95: quantile(r.cpu, 0.95),
        disjoint: r.disjoint,
        calls: stats.calls,
        triangles: stats.triangles,
        altitude: stats.altitude,
      };
      if (!best || row.gpuP95 < best.gpuP95) best = row;
    }
    rows.push(best);
    console.log(
      `${p.toFixed(3).padStart(5)} | ${ms(best.gpuMedian)} ${ms(best.gpuP95)} ${ms(best.gpuMax)} | ${ms(best.cpuMedian)} ${ms(best.cpuP95)} | ${String(best.calls).padStart(5)} ${String(best.triangles).padStart(9)}  ${best.altitude} km${best.disjoint ? `  (${best.disjoint} disjoint)` : ""}`,
    );
  }
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
