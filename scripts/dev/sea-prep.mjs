// Boulogne's painting prepared on the real page (development): how long the
// plates take to paint ahead of the dive (paint/raster.ts, in idle slices),
// and what that preparation costs the frames meanwhile, on a served build.
//   node scripts/dev/sea-prep.mjs [top|near ...]
// top: the reader stays at the top of the page (scene 1 plays) while the
// painting prepares in its 4 ms slices; near: the reader is taken at once to
// just before Boulogne (p 0.03 short of it), where the slices grow to 12 ms
// (BoulogneSea.tsx, URGENT_P). For each: the time from navigation to the
// chart's readiness and to the painting's, the page's frame intervals from
// the chart's readiness until the painting is ready (median, 95th
// percentile, worst, how many over 25 ms), long tasks and long animation
// frames in that stretch (the worst, with the scripts the browser blames).
// Environment: BASE (http://127.0.0.1:4173), W, H, S (1280, 720, 1.5), RUNS
// (2: each case twice, a fresh page each time), JSON=<file> writes the rows.
// Check the served build first (served.mjs).
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const RUNS = Number(process.env.RUNS ?? 2);
const cases = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["top", "near"];

const q = (values, k) => {
  if (!values.length) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(k * s.length))];
};

const browser = await chromium.launch({ channel: "chromium" });
const rows = [];
for (const name of cases) {
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: S,
    });
    const tab = await context.newPage();
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    await tab.addInitScript(() => {
      const rec = { frames: [], longTasks: [], loafs: [], marks: {} };
      window.__prep = rec;
      let last = Number.NaN;
      const tick = (ts) => {
        rec.frames.push({ ts, dt: ts - last });
        last = ts;
        if (!rec.marks.chart && window.__road?.ready) rec.marks.chart = ts;
        if (!rec.marks.sea && window.__road?.seaReady) rec.marks.sea = ts;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const observe = (type, push) => {
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) push(e);
          }).observe({ type, buffered: true });
        } catch {}
      };
      observe("longtask", (e) =>
        rec.longTasks.push({ start: e.startTime, duration: e.duration }),
      );
      observe("long-animation-frame", (e) =>
        rec.loafs.push({
          start: e.startTime,
          duration: e.duration,
          blocking: e.blockingDuration,
          scripts: (e.scripts ?? [])
            .filter((s) => s.duration >= 10)
            .map((s) => ({
              duration: Math.round(s.duration),
              invoker: s.invoker,
              source: `${(s.sourceURL ?? "").split("/").pop()}:${s.sourceCharPosition}`,
              fn: s.sourceFunctionName,
            })),
        }),
      );
    });
    await tab.goto(`${base}/`);
    await tab.waitForFunction(() => window.__road?.ready, null, {
      timeout: 240_000,
    });
    if (name === "near") {
      const y = await tab.evaluate(() => {
        const lude = window.__road.pin.interludes.find(
          (i) => i.id === "boulogne",
        );
        return window.__road.scrollFor(lude.at - 0.03);
      });
      await tab.evaluate((top) => {
        if (window.__lenis)
          window.__lenis.scrollTo(top, { immediate: true, force: true });
        else window.scrollTo(0, top);
      }, y);
    }
    await tab.waitForFunction(() => window.__road?.seaReady, null, {
      timeout: 240_000,
    });
    await tab.waitForTimeout(500);
    const r = await tab.evaluate(() => {
      const rec = window.__prep;
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        marks: rec.marks,
        navStart: nav ? nav.startTime : 0,
        frames: rec.frames,
        longTasks: rec.longTasks,
        loafs: rec.loafs,
      };
    });
    const from = r.marks.chart;
    const to = r.marks.sea;
    const within = (e) => e.start >= from && e.start <= to;
    const dts = r.frames
      .filter((f) => f.ts > from && f.ts <= to && Number.isFinite(f.dt))
      .map((f) => f.dt);
    const lts = r.longTasks.filter(within);
    const lfs = r.loafs.filter(within);
    const worstLoaf = lfs.reduce(
      (a, b) => (!a || b.duration > a.duration ? b : a),
      null,
    );
    const row = {
      case: name,
      run,
      chartReadyS: +(from / 1000).toFixed(2),
      seaReadyS: +(to / 1000).toFixed(2),
      prepS: +((to - from) / 1000).toFixed(2),
      frames: dts.length,
      intervalMedian: +q(dts, 0.5).toFixed(1),
      intervalP95: +q(dts, 0.95).toFixed(1),
      intervalMax: +Math.max(0, ...dts).toFixed(1),
      late: dts.filter((v) => v > 25).length,
      longTasks: lts.length,
      longestTask: Math.round(Math.max(0, ...lts.map((t) => t.duration))),
      loafs: lfs.length,
      worstLoaf: worstLoaf
        ? {
            duration: Math.round(worstLoaf.duration),
            blocking: Math.round(worstLoaf.blocking ?? 0),
            scripts: worstLoaf.scripts,
          }
        : null,
      errors,
    };
    rows.push(row);
    console.log(
      `${name} #${run}: chart ready ${row.chartReadyS} s, painting ready ${row.seaReadyS} s (prep ${row.prepS} s); frames ${row.frames}: interval median ${row.intervalMedian}, p95 ${row.intervalP95}, worst ${row.intervalMax} ms, ${row.late} over 25 ms; long tasks ${row.longTasks} (longest ${row.longestTask} ms); long animation frames ${row.loafs}${worstLoaf ? ` (worst ${row.worstLoaf.duration} ms, blocking ${row.worstLoaf.blocking}: ${JSON.stringify(row.worstLoaf.scripts)})` : ""}${errors.length ? `; errors ${errors.length}` : ""}`,
    );
    await context.close();
  }
}
await browser.close();
if (process.env.JSON)
  await writeFile(process.env.JSON, JSON.stringify(rows, null, 2));
