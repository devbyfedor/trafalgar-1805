// Every GPU-process shader store (a compile), with the time from navigation and
// the renderer's raster layers in the 40 ms before.
import { readFileSync } from "node:fs";
const prefix = process.argv[2];
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const mark = ev.find((e) => typeof e.name === "string" && e.name.startsWith("perf:"));
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find((x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"));
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const wheel0 = page.wheels[0][2];
const rt = ev.filter((e) => e.name === "RasterTask" && e.ph === "X" && e.pid === mark.pid);
const st = ev.filter((e) => e.name === "GrShaderCache::store").map((e) => ({ t: pt(e.ts), pid: e.pid, tid: e.tid }));
// enclosing event name for each store
const enclosing = (s) => {
  const c = ev.filter((e) => e.ph === "X" && e.pid === s.pid && e.tid === s.tid && pt(e.ts) <= s.t && pt(e.ts) + e.dur / 1000 >= s.t && e.name !== "GrShaderCache::store");
  c.sort((a, b) => b.dur - a.dur);
  return c.slice(0, 2).map((e) => `${e.name}(${(e.dur / 1000).toFixed(1)})`).join(" > ");
};
let last = -1e9;
for (const s of st) {
  const layers = new Map();
  for (const e of rt) { const t = pt(e.ts); if (t > s.t - 40 && t <= s.t) { const id = e.args?.tileData?.layerId; layers.set(id, (layers.get(id) ?? 0) + 1); } }
  console.log(`${s.t.toFixed(0)} ms (${(s.t - wheel0).toFixed(0)} after wheel) ${enclosing(s)} layers ${[...layers].map(([k, n]) => `${k}x${n}`).join(" ")}`);
}
