// Renderer raster tasks (layer ids) in the 40 ms before each of the slowest GPU flushes.
import { readFileSync } from "node:fs";
const prefix = process.argv[2];
const count = Number(process.argv[3] ?? 4);
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
const fl = ev.filter((e) => e.name === "RasterDecoderImpl::DoEndRasterCHROMIUM::Flush" && e.ph === "X" && pt(e.ts) > wheel0).sort((a, b) => b.dur - a.dur).slice(0, count);
for (const f of fl) {
  const t = pt(f.ts);
  const near = rt.filter((e) => pt(e.ts) > t - 40 && pt(e.ts) <= t);
  const ids = new Map();
  for (const e of near) { const id = e.args?.tileData?.layerId; ids.set(id, (ids.get(id) ?? 0) + 1); }
  console.log(`flush ${(t - wheel0).toFixed(0)} ms, ${(f.dur / 1000).toFixed(1)} ms: layers ${[...ids].map(([k, n]) => `${k}x${n}`).join(" ")}`);
}
