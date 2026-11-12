// The chart lab's CPU per frame at points of its flight, and a CPU profile
// of one of them (development only).
//   node scripts/dev/cpu-profile.mjs <profile-p> <p>...
// Benches each p twice (40 frames, the first 5 dropped) through the lab's
// own bench (window.__chart.bench), then records a sampling profile of 60
// frames at <profile-p> and prints the functions by self time and by
// inclusive time. Needs a server: `npm run preview` (the default base,
// http://127.0.0.1:4173) or BASE=http://127.0.0.1:3000 for `npm run dev`.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const [profileP, ...ps] = process.argv.slice(2).map(Number);
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();
await page.goto(`${base}/lab/chart/?quality=0`);
await page.waitForFunction(() => window.__chart?.ready === true, null, {
  timeout: 90_000,
});
await page.waitForTimeout(1500);

const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
for (let sweep = 0; sweep < 2; sweep++) {
  for (const p of ps) {
    const r = await page.evaluate(
      ([frames, at]) => window.__chart.bench(frames, at),
      [40, p],
    );
    const cpu = r.cpu.slice(5);
    const gpu = r.gpu.slice(5);
    console.log(
      `sweep ${sweep} p ${p}: CPU median ${quantile(cpu, 0.5).toFixed(2)}, p95 ${quantile(cpu, 0.95).toFixed(2)}, max ${Math.max(...cpu).toFixed(2)}; GPU median ${quantile(gpu, 0.5).toFixed(2)}, p95 ${quantile(gpu, 0.95).toFixed(2)}`,
    );
  }
}

const cdp = await context.newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
await page.evaluate(
  ([frames, at]) => window.__chart.bench(frames, at),
  [60, profileP],
);
const { profile } = await cdp.send("Profiler.stop");

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes)
  for (const c of n.children ?? []) parent.set(c, n.id);
const keyOf = (node) => {
  const f = node.callFrame;
  return `${f.functionName || "(anonymous)"} ${f.url.split("/").pop()}:${f.lineNumber}`;
};
// Time per sampled node (µs).
const timeOf = new Map();
let total = 0;
profile.samples.forEach((id, i) => {
  const dt = profile.timeDeltas[i] ?? 0;
  timeOf.set(id, (timeOf.get(id) ?? 0) + dt);
  total += dt;
});
const self = new Map();
const inclusive = new Map();
for (const [id, t] of timeOf) {
  const key = keyOf(byId.get(id));
  self.set(key, (self.get(key) ?? 0) + t);
  const seen = new Set();
  for (let at = id; at !== undefined; at = parent.get(at)) {
    const k = keyOf(byId.get(at));
    if (seen.has(k)) continue;
    seen.add(k);
    inclusive.set(k, (inclusive.get(k) ?? 0) + t);
  }
}
const print = (title, map, count) => {
  console.log(title);
  for (const [k, t] of [...map].sort((a, b) => b[1] - a[1]).slice(0, count))
    console.log(`  ${(t / 1000).toFixed(1).padStart(8)} ms  ${k}`);
};
console.log(`profile at p ${profileP}: ${(total / 1000).toFixed(0)} ms`);
print("self time:", self, 30);
print("inclusive time:", inclusive, 40);
await browser.close();
