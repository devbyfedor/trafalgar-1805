// Frame timing of scene 2 on the home page, on this machine's GPU
// (development only, not part of the site or the tests).
//   node scripts/dev/road-bench.mjs [step] [frames]
//   AT=dive:0..1:0.1,hold:0.5,rise:0..1:0.1 node scripts/dev/road-bench.mjs
//   REAL=1 node scripts/dev/road-bench.mjs
//
// The chart's own frames (the default). For each progress p = 0, step,
// 2 step ... 1 of scene 2, the scene draws `frames` frames at p (60 by
// default) and times each on the GPU (EXT_disjoint_timer_query_webgl2) and
// on the CPU around the draw; the first five after each jump are left out
// (window.__road.bench). AT=<points> benches those points instead, in the
// road tools' shared syntax (road-scroll.mjs): p (0.21, 0.1..0.3:0.02) and
// Boulogne's interlude (dive:0.5, hold:0..1:0.25, rise:0.3), where the
// chart is drawn as the interlude has it (its camera, its marks); a point
// where the painting covers the chart, which the page then doesn't draw,
// is flagged "covered". P=0.1,0.2 is AT's old name. The page is scrolled
// into scene 2 first (halfway, or for an interlude's points just before
// it), so scene 1's own loops are paused. AB=<name> times the frame with and without the chart's
// objects of that name (Chart.showNamed: terrain, sky, glyphs, wakes,
// lettering, marks, soundings, rivers, route, tracks, camps) at each point
// instead, on alternate frames, so both are timed at the same clock (on
// battery, or under a sustained load, the GPU's clock moves within a
// second).
//
// REAL=1: the page's own frames, as a reader gets them. A recorder runs
// from before the page's scripts (so its animation-frame callback comes
// first in each frame) and keeps, per frame: the interval since the last
// (requestAnimationFrame's time), the main thread's time from the frame's
// start until a task after it (the page's scripts, style, layout, paint),
// and the GPU's time for the chart's own context from this frame's start
// to the next's (EXT_disjoint_timer_query_webgl2 where offered; next to
// nothing where the painting covers the chart, which isn't drawn there;
// the compositor's work for the painting's layers is not in it, only in
// the intervals); and the long tasks and long animation frames
// (PerformanceObserver). The page is scrolled with the wheel, through
// Lenis as a reader scrolls, from FROM to TO (a point each; by default p
// 0.01 before Boulogne's interlude to 0.01 after it) and back, PASSES
// times one way or the other (2), at SPEED screens a second (0.6), with
// a pause at each end; each frame counts for the part of the scroll it
// was drawn in (dive, hold, rise, or the chart's own scroll), by its
// scroll position (the story trails the scroll by its 0.6 s scrub, about
// SPEED × 0.2 screens). Per part: the frames, their intervals' median,
// 95th percentile and worst and how many came late (over 25 ms), the main
// thread's and the chart GPU's median, 95th percentile and worst, the
// long tasks and long animation frames. With AT as well, `frames` frames
// at rest at each of those points too (the swell, the craft and the smoke
// still move). The page loads at the quality the scene picks for itself
// (QUALITY pins one), and Boulogne's painting must be ready first.
//
// Needs a server: `npm run preview` with BASE=http://127.0.0.1:4173 for
// numbers that count. Environment: BASE, W, H and S as in road.mjs (1280,
// 720, 1.5: the owner's laptop); QUALITY pins a quality level (0, the top,
// by default; with REAL=1, the page's own unless given); SWEEPS=n keeps
// the best of n sweeps per point; IDLE=ms waits that long before each
// timed burst (on battery a pause lets the power budget refill, so a burst
// runs at the clock a fresh load gets); JSON=<file> also writes the rows.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  inInterlude,
  isCovered,
  parsePoints,
  phaseAt,
  pointName,
  pointP,
  range,
  roadPin,
  roadScrollFor,
  scrollForPoint,
  scrollPageTo,
  scrollRoadTo,
  scrollToPoint,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const step = Number(process.argv[2] ?? 0.05);
const frames = Number(process.argv[3] ?? 60);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const real = process.env.REAL === "1";
const quality = process.env.QUALITY ?? (real ? null : "0");
const sweeps = Number(process.env.SWEEPS ?? 1);
const ab = process.env.AB ?? "";
const idle = Number(process.env.IDLE ?? 0);
const SKIP = 6;
/** A frame later than this (ms) missed its vsync at 60 Hz. */
const LATE_MS = 25;

const given = process.env.AT ?? process.env.P;
const points = given
  ? parsePoints(given)
  : real
    ? []
    : range(0, 1, step).map((p) => ({ kind: "p", p }));

function quantile(values, q) {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
const ms = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(6) : "     -");
const pad = (s, n) => String(s).padStart(n);

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
if (real) await page.addInitScript(frameRecorder);
await page.goto(`${base}/${quality === null ? "" : `?quality=${quality}`}`);
await waitForRoad(page, {
  baked: false,
  sea: real || points.some(inInterlude),
});
const pin = await roadPin(page);
const renderer = await page.evaluate(() => {
  const gl = document
    .querySelector("[data-layer=chart] canvas")
    ?.getContext("webgl2");
  const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log(renderer);

// ------------------------------------------------------- the chart's own

async function chartFrames() {
  // Into scene 2, so scene 1's loops pause and only the chart draws:
  // halfway, or for an interlude's points just before that interlude (the
  // painting away: it is drawn faintly from 0.012 of p before it; the
  // chart's detail that place's). Never in the handoff, where scene 1
  // still plays over the chart.
  const first = points[0];
  const into =
    first && inInterlude(first)
      ? Math.max(0.1, pointP(pin, first) - 0.02)
      : 0.5;
  await scrollRoadTo(page, into);
  await page.waitForTimeout(2500);
  console.log(
    `${width}x${height} at scale ${scale}, quality ${quality}, ${frames} frames a point${ab ? `, with and without ${ab}` : `, best of ${sweeps}`}`,
  );
  const pause = () =>
    idle > 0 ? new Promise((resolve) => setTimeout(resolve, idle)) : null;
  /** The hook's arguments for a point: the story's p and the interlude's part. */
  const args = (point) => [
    pointP(pin, point),
    inInterlude(point) ? { phase: point.phase, t: point.t } : null,
  ];
  const bench = async (point, n, alternate) => {
    await pause();
    const [p, at] = args(point);
    return page.evaluate(
      ([f, p, name, at]) =>
        window.__road.bench(f, p, name || undefined, at ?? undefined),
      [n, p, alternate ?? "", at],
    );
  };
  const flag = (point) => (isCovered(pin, point) ? "  (covered)" : "");
  const label = (point) => pointName(point).padStart(10);

  if (ab) {
    console.log(
      `     point | with ${ab}: median  p95 | without: median  p95 | ratio | pairs`,
    );
    const rows = [];
    for (const point of points) {
      const r = await bench(point, 2 * frames + SKIP, ab);
      const on = [];
      const off = [];
      const byFrame = new Map();
      r.gpu.forEach((t, i) => {
        const frame = r.gpuFrame[i];
        if (frame < SKIP) return;
        (frame % 2 === 0 ? on : off).push(t);
        byFrame.set(frame, t);
      });
      // Each frame with the write against the frame after it, without.
      const ratios = [];
      for (const [frame, t] of byFrame)
        if (frame % 2 === 0 && byFrame.has(frame + 1))
          ratios.push(t / byFrame.get(frame + 1));
      const row = {
        point: pointName(point),
        p: pointP(pin, point),
        onMedian: quantile(on, 0.5),
        onP95: quantile(on, 0.95),
        offMedian: quantile(off, 0.5),
        offP95: quantile(off, 0.95),
        pairRatio: quantile(ratios, 0.5),
        covered: isCovered(pin, point),
      };
      rows.push(row);
      console.log(
        `${label(point)} | ${ms(row.onMedian)} ${ms(row.onP95)} | ${ms(row.offMedian)} ${ms(row.offP95)} | ${(row.onMedian / row.offMedian).toFixed(2).padStart(6)} | ${row.pairRatio.toFixed(2)}${flag(point)}`,
      );
    }
    if (process.env.JSON)
      await writeFile(process.env.JSON, JSON.stringify(rows));
    return;
  }
  console.log(
    "     point | GPU median   p95   max | CPU median   p95 | calls triangles",
  );
  const rows = [];
  for (const point of points) {
    let best = null;
    for (let i = 0; i < sweeps; i++) {
      const r = await bench(point, frames + SKIP);
      const gpu = r.gpu.slice(SKIP);
      const cpu = r.cpu.slice(SKIP);
      const stats = await page.evaluate(() => ({ ...window.__road.stats }));
      const row = {
        point: pointName(point),
        p: pointP(pin, point),
        covered: isCovered(pin, point),
        gpuMedian: quantile(gpu, 0.5),
        gpuP95: quantile(gpu, 0.95),
        gpuMax: gpu.length ? Math.max(...gpu) : Number.NaN,
        cpuMedian: quantile(cpu, 0.5),
        cpuP95: quantile(cpu, 0.95),
        disjoint: r.disjoint,
        calls: stats.calls,
        triangles: stats.triangles,
        altitude: stats.altitude,
      };
      // The sweep with the best GPU time is kept whole; cpuP95Min is the
      // CPU's own best over the sweeps (one's slow sweep is not the other's).
      row.cpuP95Min = Math.min(row.cpuP95, best?.cpuP95Min ?? row.cpuP95);
      if (!best || row.gpuP95 < best.gpuP95) best = row;
      else best.cpuP95Min = row.cpuP95Min;
    }
    rows.push(best);
    console.log(
      `${label(point)} | ${ms(best.gpuMedian)} ${ms(best.gpuP95)} ${ms(best.gpuMax)} | ${ms(best.cpuMedian)} ${ms(best.cpuP95)}${sweeps > 1 ? ` (least ${ms(best.cpuP95Min).trim()})` : ""} | ${pad(best.calls, 5)} ${pad(best.triangles, 9)}  ${best.altitude} km${best.disjoint ? `  (${best.disjoint} disjoint)` : ""}${flag(point)}`,
    );
  }
  // The worst where the page draws the chart (a covered point's chart is never seen).
  const drawn = rows.filter((r) => !r.covered);
  for (const key of ["gpuMedian", "gpuP95", "cpuP95"]) {
    const r = drawn
      .filter((row) => Number.isFinite(row[key]))
      .reduce((a, row) => (!a || row[key] > a[key] ? row : a), null);
    if (r) console.log(`worst ${key}: ${r[key].toFixed(2)} ms at ${r.point}`);
  }
  if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
}

// ------------------------------------------------------- the page's own

/**
 * The page's frames, recorded from before its scripts run (an init
 * script): its requestAnimationFrame callback is the first of every frame,
 * so a frame's main-thread time runs from it to a message posted from it
 * (the page's callbacks, then style, layout, paint and the commit come
 * between); and the chart's context, timed from each frame's start to the
 * next's, holds that frame's draw. Serialised into the page: no closures.
 */
function frameRecorder() {
  const rec = {
    on: false,
    t0: 0,
    t1: 0,
    frames: [],
    longTasks: [],
    loafs: [],
    gl: null,
    ext: null,
    query: null,
    queryFrame: -1,
    pending: [],
  };
  window.__frames = rec;
  const channel = new MessageChannel();
  channel.port1.onmessage = (e) => {
    const f = rec.frames[e.data];
    if (f) f.cpu = performance.now() - f.start;
  };
  // The GPU's times as they arrive (in order, a few frames late).
  const collect = () => {
    const { gl, ext } = rec;
    if (!gl || !ext || !rec.pending.length) return;
    const lost = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (rec.pending.length) {
      const [query, k] = rec.pending[0];
      if (!lost && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE))
        break;
      if (!lost && rec.frames[k])
        rec.frames[k].gpu = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(query);
      rec.pending.shift();
    }
  };
  const close = () => {
    if (!rec.query) return;
    rec.gl.endQuery(rec.ext.TIME_ELAPSED_EXT);
    rec.pending.push([rec.query, rec.queryFrame]);
    rec.query = null;
  };
  let lastTs = Number.NaN;
  const tick = (ts) => {
    requestAnimationFrame(tick);
    collect();
    if (!rec.on) {
      lastTs = Number.NaN;
      return;
    }
    const start = performance.now();
    const i = rec.frames.length;
    rec.frames.push({
      ts,
      dt: ts - lastTs,
      start,
      y: window.scrollY,
      cpu: Number.NaN,
      gpu: Number.NaN,
    });
    lastTs = ts;
    channel.port2.postMessage(i);
    if (rec.gl && rec.ext) {
      close();
      rec.query = rec.gl.createQuery();
      rec.queryFrame = i;
      rec.gl.beginQuery(rec.ext.TIME_ELAPSED_EXT, rec.query);
      // Sent now: a chart that doesn't draw (under the painting) sends
      // nothing that would carry the last query's end to the GPU.
      rec.gl.flush();
    }
  };
  requestAnimationFrame(tick);
  const observe = (type, push) => {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) push(entry);
      }).observe({ type, buffered: true });
    } catch {
      // Not offered here: the list stays empty.
    }
  };
  observe("longtask", (e) =>
    rec.longTasks.push({ start: e.startTime, duration: e.duration }),
  );
  observe("long-animation-frame", (e) =>
    rec.loafs.push({
      start: e.startTime,
      duration: e.duration,
      blocking: e.blockingDuration ?? 0,
    }),
  );
  rec.start = () => {
    const canvas = document.querySelector("[data-layer=chart] canvas");
    const gl = canvas?.getContext("webgl2") ?? null;
    rec.gl = gl;
    rec.ext = gl?.getExtension("EXT_disjoint_timer_query_webgl2") ?? null;
    rec.frames = [];
    rec.pending = [];
    rec.query = null;
    rec.t0 = performance.now();
    rec.on = true;
    return rec.ext !== null;
  };
  rec.stop = () => {
    rec.on = false;
    rec.t1 = performance.now();
    if (rec.gl && rec.ext) {
      close();
      rec.gl.flush();
    }
  };
}

/** Starts the recorder; whether the chart's GPU time can be read. */
function startFrames() {
  return page.evaluate(() => window.__frames.start());
}

/** Stops it and reads the frames, once the GPU's last times are in. */
async function stopFrames() {
  return page.evaluate(async () => {
    const rec = window.__frames;
    rec.stop();
    for (let i = 0; i < 60 && rec.pending.length; i++)
      await new Promise((r) => requestAnimationFrame(r));
    const within = (e) => e.start >= rec.t0 && e.start <= rec.t1;
    return {
      frames: rec.frames,
      longTasks: rec.longTasks.filter(within),
      loafs: rec.loafs.filter(within),
    };
  });
}

/** The frames' numbers: intervals, main thread, the chart's GPU, long tasks. */
function summary(frames, longTasks, loafs) {
  const dt = frames.map((f) => f.dt).filter(Number.isFinite);
  const cpu = frames.map((f) => f.cpu).filter(Number.isFinite);
  const gpu = frames.map((f) => f.gpu).filter(Number.isFinite);
  const max = (v) => (v.length ? Math.max(...v) : Number.NaN);
  return {
    frames: frames.length,
    intervalMedian: quantile(dt, 0.5),
    intervalP95: quantile(dt, 0.95),
    intervalMax: max(dt),
    late: dt.filter((v) => v > LATE_MS).length,
    mainMedian: quantile(cpu, 0.5),
    mainP95: quantile(cpu, 0.95),
    mainMax: max(cpu),
    gpuTimed: gpu.length,
    gpuMedian: quantile(gpu, 0.5),
    gpuP95: quantile(gpu, 0.95),
    gpuMax: max(gpu),
    longTasks: longTasks.length,
    longestTask: max(longTasks.map((t) => t.duration)),
    loafs: loafs.length,
    worstBlocking: max(loafs.map((t) => t.blocking)),
  };
}

const HEAD =
  "frames | interval median   p95   max late | main median   p95   max | chart GPU median   p95   max | long tasks, longest | LoAF, worst blocking";
function line(name, s) {
  return `${name.padStart(12)} ${pad(s.frames, 6)} | ${ms(s.intervalMedian)} ${ms(s.intervalP95)} ${ms(s.intervalMax)} ${pad(s.late, 4)} | ${ms(s.mainMedian)} ${ms(s.mainP95)} ${ms(s.mainMax)} | ${s.gpuTimed ? `${ms(s.gpuMedian)} ${ms(s.gpuP95)} ${ms(s.gpuMax)}` : "     -      -      -"} | ${pad(s.longTasks, 3)} ${ms(s.longestTask)} | ${pad(s.loafs, 3)} ${ms(s.worstBlocking)}`;
}

async function realFrames() {
  const lude = pin.interludes[0];
  if (!lude && !points.length)
    throw new Error("REAL=1: this build has no interlude to scroll through");
  const one = (text, fallback) => {
    if (!text) return fallback;
    const list = parsePoints(text);
    if (list.length !== 1) throw new Error(`"${text}": one point, please`);
    return list[0];
  };
  const from = one(
    process.env.FROM,
    lude && { kind: "p", p: Math.max(0, lude.at - 0.01) },
  );
  const to = one(
    process.env.TO,
    lude && { kind: "p", p: Math.min(1, lude.at + 0.01) },
  );
  const passes = Number(process.env.PASSES ?? 2);
  const speed = Number(process.env.SPEED ?? 0.6);
  const STEP_MS = 50;
  const vh = await page.evaluate(() => window.innerHeight);
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  // The pin's start, so a frame's scroll position is screens of the pin.
  const pinStart = await roadScrollFor(page, 0);
  const json = { renderer, settings: {}, scroll: null, rest: [] };

  if (from && to) {
    const y0 = await scrollForPoint(page, from);
    const y1 = await scrollForPoint(page, to);
    json.settings = {
      from: pointName(from),
      to: pointName(to),
      passes,
      speed,
      quality: quality ?? "the page's",
    };
    console.log(
      `${width}x${height} at scale ${scale}, quality ${quality ?? "the page's own"}; the wheel from ${pointName(from)} to ${pointName(to)} (${((y1 - y0) / vh).toFixed(2)} screens) and back, ${passes} passes at ${speed} screens a second`,
    );
    await scrollPageTo(page, y0);
    await page.waitForTimeout(2500);
    await page.mouse.move(width / 2, height / 2);
    const gpu = await startFrames();
    for (let pass = 0; pass < passes; pass++) {
      const target = pass % 2 === 0 ? y1 : y0;
      const now = await page.evaluate(() => window.scrollY);
      const sign = Math.sign(target - now);
      let left = Math.abs(target - now);
      const each = (speed * vh * STEP_MS) / 1000;
      while (left > 0.5) {
        const d = Math.min(each, left);
        // Playwright divides a wheel's delta by the device scale.
        await page.mouse.wheel(0, sign * d * dpr);
        left -= d;
        await page.waitForTimeout(STEP_MS);
      }
      await page.waitForTimeout(1500);
    }
    const run = await stopFrames();
    // Each frame, and each long task by the frame it began in, to its part.
    const partOf = (y) => {
      const at = phaseAt(pin, (y - pinStart) / vh);
      return at
        ? at.id === lude?.id
          ? at.phase
          : `${at.id}/${at.phase}`
        : "chart";
    };
    const parts = new Map();
    const bucket = (name) => {
      if (!parts.has(name))
        parts.set(name, { frames: [], longTasks: [], loafs: [] });
      return parts.get(name);
    };
    for (const f of run.frames) bucket(partOf(f.y)).frames.push(f);
    const frameAt = (t) => {
      let found = run.frames[0];
      for (const f of run.frames) {
        if (f.start > t) break;
        found = f;
      }
      return found;
    };
    for (const t of run.longTasks)
      bucket(partOf(frameAt(t.start)?.y ?? 0)).longTasks.push(t);
    for (const t of run.loafs)
      bucket(partOf(frameAt(t.start)?.y ?? 0)).loafs.push(t);
    console.log(
      `\nscrolled${gpu ? "" : " (no GPU timer here: the chart's GPU times are missing)"}\n        part ${HEAD}`,
    );
    const order = ["chart", "dive", "hold", "rise"];
    const names = [...parts.keys()].sort(
      (a, b) =>
        (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9) ||
        a.localeCompare(b),
    );
    json.scroll = {};
    for (const name of names) {
      const b = parts.get(name);
      const s = summary(b.frames, b.longTasks, b.loafs);
      json.scroll[name] = s;
      console.log(line(name, s));
    }
    const all = summary(run.frames, run.longTasks, run.loafs);
    json.scroll.all = all;
    console.log(line("all", all));
  }

  if (points.length) {
    console.log(`\nat rest, ${frames} frames a point\n       point ${HEAD}`);
    for (const point of points) {
      await scrollToPoint(page, point);
      await page.waitForTimeout(1800);
      await startFrames();
      await page.waitForFunction(
        (n) => window.__frames.frames.length >= n,
        frames,
        { timeout: 60_000, polling: 100 },
      );
      const run = await stopFrames();
      const s = summary(run.frames, run.longTasks, run.loafs);
      json.rest.push({
        point: pointName(point),
        covered: isCovered(pin, point),
        ...s,
      });
      console.log(
        `${line(pointName(point), s)}${isCovered(pin, point) ? "  (covered)" : ""}`,
      );
    }
  }
  if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(json));
}

// Run last: the helpers above are module-level (constants declared after a
// top-level await are not yet initialised while it waits).
if (real) await realFrames();
else await chartFrames();
if (errors.length) console.log(errors.join("\n"));
await browser.close();
