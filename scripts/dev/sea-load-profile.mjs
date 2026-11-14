// What the painting's script chunk costs when it loads (development): a
// CPU profile from navigation until the painting is ready, its samples in
// the chunk that holds Boulogne's painting (found by a plate's id in its
// text) summed by function, self and inclusive, and the chunk's top-level
// evaluation apart. Needs a served build: BASE (http://127.0.0.1:4173).
//   node scripts/dev/sea-load-profile.mjs [marker] (default hero-chaloupe)
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const marker = process.argv[2] ?? "hero-chaloupe";
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const tab = await context.newPage();
const cdp = await context.newCDPSession(tab);
const sources = new Map();
cdp.on("Debugger.scriptParsed", (e) => sources.set(e.scriptId, e.url));
await cdp.send("Debugger.enable");
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 50 });
await cdp.send("Profiler.start");
await tab.goto(`${base}/`);
await tab.waitForFunction(() => window.__road?.seaReady, null, {
  timeout: 240_000,
});
const { profile } = await cdp.send("Profiler.stop");

// The chunk: the script whose source mentions the marker.
let chunkUrl = "";
for (const [id, url] of sources) {
  if (!url.includes("/_next/static/chunks/")) continue;
  const { scriptSource } = await cdp.send("Debugger.getScriptSource", {
    scriptId: id,
  });
  if (scriptSource.includes(marker)) {
    chunkUrl = url;
    break;
  }
}
console.log(`the painting's chunk: ${chunkUrl.split("/").pop()}`);

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes)
  for (const c of n.children ?? []) parent.set(c, n.id);
const keyOf = (n) =>
  `${n.callFrame.functionName || "(anonymous)"} @${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`;
const inChunk = (n) => n.callFrame.url === chunkUrl;
const self = new Map();
const incl = new Map();
// The longest unbroken run of samples with the chunk's code on the stack
// (idle and other code end a run): the chunk's evaluation, or the worst
// slice of the preparation.
const under = profile.samples.map((id) => {
  for (let at = id; at !== undefined; at = parent.get(at))
    if (inChunk(byId.get(at))) return true;
  return false;
});
let best = [0, 0, 0];
for (let i = 0; i < under.length; ) {
  if (!under[i]) {
    i++;
    continue;
  }
  let j = i;
  let t = 0;
  while (j < under.length && under[j]) t += profile.timeDeltas[j++] ?? 0;
  if (t > best[2]) best = [i, j, t];
  i = j;
}
console.log(
  `the longest run under the chunk's code: ${(best[2] / 1000).toFixed(1)} ms (${best[1] - best[0]} samples)`,
);
for (let i = best[0]; i < best[1]; i++) {
  const id = profile.samples[i];
  const dt = profile.timeDeltas[i] ?? 0;
  const leaf = byId.get(id);
  const seen = new Set();
  for (let at = id; at !== undefined; at = parent.get(at)) {
    const n = byId.get(at);
    const k = inChunk(n)
      ? keyOf(n)
      : `[${n.callFrame.functionName || "(native)"}]`;
    if (seen.has(k)) continue;
    seen.add(k);
    incl.set(k, (incl.get(k) ?? 0) + dt);
  }
  const k = inChunk(leaf)
    ? keyOf(leaf)
    : `[${leaf.callFrame.functionName || leaf.callFrame.url.split("/").pop() || "(native)"}]`;
  self.set(k, (self.get(k) ?? 0) + dt);
}
const print = (title, map, n) => {
  console.log(title);
  for (const [k, us] of [...map].sort((a, b) => b[1] - a[1]).slice(0, n))
    console.log(`  ${(us / 1000).toFixed(1).padStart(7)} ms  ${k}`);
};
print("inclusive:", incl, 25);
print("self:", self, 15);
await browser.close();
