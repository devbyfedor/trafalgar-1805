// Do the fleets' head labels allocate a frame? (development only) Draws
// scene 2 frame by frame over stretches of its progress (window.__road.
// labels(p)) under Chrome's sampling heap profiler, every allocation
// sampled (collected ones too), and sums what was allocated inside
// HeadLabels.update's calls (its frames found by their place in the
// script: the class HeadLabels and the module of ChartGround), by the
// function that allocated it. Run it against the dev server, where
// function names are kept. The first pass warms the code (it is the
// optimised code that runs every frame); the second is measured.
//   node scripts/dev/label-alloc.mjs
// Environment: BASE (default http://127.0.0.1:3000), RANGES
// ("0.25:0.5,0.655:0.84,0.84:1"), STEP (0.0005), INTERVAL (bytes, 16),
// WARM (passes before the measured one, 1).
import { chromium } from "@playwright/test";
import { waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ranges = (process.env.RANGES ?? "0.25:0.5,0.655:0.84,0.84:1")
  .split(",")
  .map((r) => r.split(":").map(Number));
const step = Number(process.env.STEP ?? 0.0005);
const interval = Number(process.env.INTERVAL ?? 16);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Debugger.enable");
const scripts = new Map();
cdp.on("Debugger.scriptParsed", (e) => scripts.set(e.scriptId, e.url));
// Find the scripts holding the class HeadLabels and ChartGround.
await cdp.send("Debugger.disable");
await cdp.send("Debugger.enable");
const regions = [];
for (const [id] of scripts) {
  let src;
  try {
    src = (await cdp.send("Debugger.getScriptSource", { scriptId: id }))
      .scriptSource;
  } catch {
    continue;
  }
  for (const name of ["class HeadLabels", "class ChartGround"]) {
    const at = src.indexOf(name);
    if (at < 0) continue;
    // The class to the next module's start, or the next class.
    let end = src.indexOf("\nclass ", at + 10);
    if (end < 0) end = src.length;
    const lineOf = (o) => src.slice(0, o).split("\n").length - 1;
    // ground.ts's functions sit before its class: take its module from
    // the first of its helpers.
    const from =
      name === "class ChartGround"
        ? Math.max(0, src.lastIndexOf("function luminance", at))
        : at;
    regions.push({ id, name, from: lineOf(from), to: lineOf(end) });
  }
}
if (regions.length < 2)
  throw new Error(`classes not found: ${JSON.stringify(regions)}`);
const inRegion = (f) =>
  regions.find(
    (r) =>
      r.id === f.scriptId && f.lineNumber >= r.from && f.lineNumber <= r.to,
  );
const run = () =>
  page.evaluate(
    ({ ranges, step }) => {
      let frames = 0;
      for (const [a, b] of ranges)
        for (let p = a; p <= b + 1e-9; p += step) {
          window.__road.labels(Math.round(p * 1e6) / 1e6);
          frames++;
        }
      return frames;
    },
    { ranges, step },
  );
for (let w = 0; w < Number(process.env.WARM ?? 1); w++) await run();
await cdp.send("HeapProfiler.enable");
await cdp.send("HeapProfiler.startSampling", {
  samplingInterval: interval,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
const frames = await run();
const { profile } = await cdp.send("HeapProfiler.stopSampling");
// Walk the tree: an allocation counts where HeadLabels.update is on its
// stack.
const byFn = new Map();
let total = 0;
let all = 0;
const walk = (node, inside) => {
  const f = node.callFrame;
  const r = inRegion(f);
  const here =
    inside || (r?.name === "class HeadLabels" && f.functionName === "update");
  all += node.selfSize;
  if (here && node.selfSize > 0) {
    const key = `${f.functionName || "(anonymous)"} ${r ? r.name.slice(6) : f.url.split("/").pop()}:${f.lineNumber + 1}`;
    byFn.set(key, (byFn.get(key) ?? 0) + node.selfSize);
    total += node.selfSize;
  }
  for (const c of node.children) walk(c, here);
};
walk(profile.head, false);
console.log(
  `${frames} frames; sampled ${(all / 1024).toFixed(0)} kB in all; inside HeadLabels.update ${total} bytes (${(total / frames).toFixed(1)} a frame)`,
);
for (const [k, v] of [...byFn].sort((a, b) => b[1] - a[1]).slice(0, 20))
  console.log(`  ${v} bytes  ${k}`);
await browser.close();
