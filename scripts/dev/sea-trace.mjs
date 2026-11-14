// The main thread's work per frame at a point of Boulogne's interlude
// (development): a Chrome trace of a few seconds at rest, the renderer's
// main thread summed by event (the animation frame's callbacks, style,
// layout, pre-paint, paint, layerize, commit) and divided by the frames,
// then a JavaScript profile of the same stretch by self time.
//   node scripts/dev/sea-trace.mjs [phase:t] (default hold:0.5)
// Environment: BASE (http://127.0.0.1:4173), SECONDS (3), W, H, S; CSS a
// style added before the trace (an experiment: what a change would save).
// Check the served build first (served.mjs).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const [point = "hold:0.5"] = process.argv.slice(2);
const [phase, tStr] = point.split(":");
const t = Number(tStr);
const SECONDS = Number(process.env.SECONDS ?? 3);
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
// The main thread's time per frame as the frame budget test reads it
// (tests/e2e/helpers.ts, recordFrames): from the frame's first animation
// callback until a task posted from it runs.
await tab.addInitScript(() => {
  const rec = { on: false, main: [], dt: [], last: Number.NaN };
  window.__mainRec = rec;
  const ch = new MessageChannel();
  ch.port1.onmessage = (e) => rec.main.push(performance.now() - e.data);
  const tick = (ts) => {
    requestAnimationFrame(tick);
    if (!rec.on) return;
    rec.dt.push(ts - rec.last);
    rec.last = ts;
    ch.port2.postMessage(performance.now());
  };
  requestAnimationFrame(tick);
});
await tab.goto(`${base}/`);
await tab.waitForFunction(
  () => window.__road?.ready && window.__road.baked && window.__road.seaReady,
  null,
  { timeout: 240_000 },
);
const y = await tab.evaluate(
  ([ph, tt]) => window.__road.scrollForInterlude("boulogne", ph, tt),
  [phase, t],
);
await tab.evaluate((top) => {
  if (window.__lenis)
    window.__lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo(0, top);
}, y);
if (process.env.CSS) await tab.addStyleTag({ content: process.env.CSS });
await tab.waitForTimeout(2500);
const layers = await tab.evaluate(() => {
  const root = document.querySelector("[data-layer=sea]");
  const all = [...root.querySelectorAll("canvas")];
  const op = (x) => Number(getComputedStyle(x).opacity);
  const shown = all.filter(
    (x) => getComputedStyle(x).visibility !== "hidden" && op(x) > 0,
  );
  return {
    canvases: all.length,
    shown: shown.length,
    atFloor: shown.filter((x) => op(x) < 0.01).length,
    wrappers: root.querySelectorAll("[data-depth]").length,
  };
});
await tab.waitForTimeout(2500);
console.log(`the painting: ${JSON.stringify(layers)}`);
// Untraced first: the main thread per frame over SECONDS.
await tab.evaluate(() => {
  const r = window.__mainRec;
  r.main = [];
  r.dt = [];
  r.last = Number.NaN;
  r.on = true;
});
await tab.waitForTimeout(SECONDS * 1000);
const rec = await tab.evaluate(() => {
  const r = window.__mainRec;
  r.on = false;
  return { main: r.main, dt: r.dt.filter(Number.isFinite) };
});
const qq = (v, k) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(k * s.length))];
};
console.log(
  `main thread per frame (untraced, ${rec.main.length} frames): median ${qq(rec.main, 0.5).toFixed(2)}, p95 ${qq(rec.main, 0.95).toFixed(2)}, worst ${Math.max(...rec.main).toFixed(2)} ms; intervals p95 ${qq(rec.dt, 0.95).toFixed(1)}, ${rec.dt.filter((d) => d > 25).length} over 25 ms`,
);
if (process.env.NO_TRACE) {
  await browser.close();
  process.exit(0);
}

const cdp = await context.newCDPSession(tab);
const events = [];
cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", {
  traceConfig: {
    includedCategories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "blink",
      "cc",
      "v8.execute",
    ],
  },
});
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
await tab.waitForTimeout(SECONDS * 1000);
const { profile } = await cdp.send("Profiler.stop");
await cdp.send("Tracing.end");
await done;

// The renderer's main thread.
const names = events.filter(
  (e) =>
    e.ph === "M" &&
    e.name === "thread_name" &&
    e.args?.name === "CrRendererMain",
);
const main = new Set(names.map((e) => `${e.pid}:${e.tid}`));
const onMain = events.filter(
  (e) => main.has(`${e.pid}:${e.tid}`) && e.ph === "X",
);
// Frames: the main thread's commits (one a frame; several animation
// callbacks may run in one frame).
const frames = onMain.filter((e) => e.name === "Commit").length;
const WANT = [
  "RunTask",
  "FireAnimationFrame",
  "FunctionCall",
  "UpdateLayoutTree",
  "Layout",
  "PrePaint",
  "Paint",
  "Layerize",
  "Commit",
  "UpdateLayer",
  "ScrollLayer",
  "HitTest",
  "ParseHTML",
  "GPUTask",
  "MajorGC",
  "MinorGC",
  "V8.GC_SCAVENGER",
];
const sum = new Map();
for (const e of onMain) {
  const k = e.name;
  sum.set(k, (sum.get(k) ?? 0) + (e.dur ?? 0));
}
console.log(
  `${point} at ${W}x${H}@${S}: ${SECONDS} s traced, ${frames} animation frames on the main thread`,
);
console.log(
  "main thread per frame, by event (nested events count in their parents too):",
);
for (const [k, us] of [...sum]
  .filter(
    ([k]) =>
      WANT.includes(k) ||
      /Paint|Commit|Style|Layout|GC|Animation|Canvas/i.test(k),
  )
  .sort((a, b) => b[1] - a[1])
  .slice(0, 24))
  console.log(
    `  ${(us / 1000 / Math.max(1, frames)).toFixed(3).padStart(8)} ms  ${k}`,
  );

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const keyOf = (node) => {
  const f = node.callFrame;
  return `${f.functionName || "(anonymous)"} ${f.url.split("/").pop()}:${f.lineNumber}:${f.columnNumber}`;
};
const self = new Map();
let total = 0;
profile.samples.forEach((id, i) => {
  const dt = profile.timeDeltas[i] ?? 0;
  total += dt;
  const k = keyOf(byId.get(id));
  self.set(k, (self.get(k) ?? 0) + dt);
});
console.log(
  `JavaScript profile, self time per frame (${(total / 1000).toFixed(0)} ms sampled):`,
);
for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(
    `  ${(us / 1000 / Math.max(1, frames)).toFixed(3).padStart(8)} ms  ${k}`,
  );
await browser.close();
