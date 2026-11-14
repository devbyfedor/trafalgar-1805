// The main thread's long tasks while the page loads (development): a
// Chrome trace from navigation until Boulogne's painting is ready, each
// task over LONG ms (50) on the renderer's main thread with what took its
// time (script evaluation and compilation by URL, garbage collection,
// style, layout, paint, the rest), from the trace's own events.
//   node scripts/dev/load-trace.mjs
// Environment: BASE (http://127.0.0.1:4173), LONG (50), W, H, S.
// Check the served build first (served.mjs).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const LONG = Number(process.env.LONG ?? 50);
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
const cdp = await context.newCDPSession(tab);
const events = [];
cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Tracing.start", {
  traceConfig: {
    includedCategories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "v8",
      "v8.execute",
      "blink",
      "toplevel",
    ],
  },
});
await tab.goto(`${base}/`);
await tab.waitForFunction(() => window.__road?.seaReady, null, {
  timeout: 240_000,
});
await tab.waitForTimeout(300);
await cdp.send("Tracing.end");
await done;
await browser.close();

const mains = new Set(
  events
    .filter(
      (e) =>
        e.ph === "M" &&
        e.name === "thread_name" &&
        e.args?.name === "CrRendererMain",
    )
    .map((e) => `${e.pid}:${e.tid}`),
);
const onMain = events.filter(
  (e) => mains.has(`${e.pid}:${e.tid}`) && e.ph === "X" && e.dur !== undefined,
);
const tasks = onMain
  .filter((e) => e.name === "RunTask" && e.dur >= LONG * 1000)
  .sort((a, b) => a.ts - b.ts);
const t0 = Math.min(...onMain.map((e) => e.ts));
console.log(`${tasks.length} tasks over ${LONG} ms on the main thread`);
const short = (u) => (u ?? "").split("/").pop() || "";
for (const t of tasks) {
  const inside = onMain.filter(
    (e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur,
  );
  const by = new Map();
  for (const e of inside) {
    const url =
      e.args?.data?.url ??
      e.args?.data?.stackTrace?.[0]?.url ??
      e.args?.fileName;
    const k = `${e.name}${url ? ` ${short(url)}` : ""}`;
    by.set(k, (by.get(k) ?? 0) + e.dur);
  }
  console.log(
    `task at ${((t.ts - t0) / 1e6).toFixed(2)} s: ${(t.dur / 1000).toFixed(1)} ms`,
  );
  for (const [k, us] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 12))
    console.log(`  ${(us / 1000).toFixed(1).padStart(7)} ms  ${k}`);
}
