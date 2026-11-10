// GPU raster flush time per rAF frame, by scroll band.
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
const fr = page.frames, sc = page.scroll;
const wheel0 = page.wheels[0][2];
const fl = ev.filter((e) => e.name === "RasterDecoderImpl::DoEndRasterCHROMIUM::Flush" && e.ph === "X").map((e) => ({ t: pt(e.ts), d: e.dur / 1000 }));
const gpuMain = ev.filter((e) => e.name === "RasterDecoderImpl::DoEndRasterCHROMIUM::Flush");
const bands = [[0, 1000], [1000, 1100], [1100, 1400], [1400, 1700], [1700, 1800], [1800, 2200]];
for (const [a, b] of bands) {
  let frames = 0, t0 = Infinity, t1 = -Infinity;
  for (let i = 1; i < fr.length; i++) if (fr[i - 1] >= wheel0 && sc[i - 1] >= a && sc[i - 1] < b) { frames++; t0 = Math.min(t0, fr[i - 1]); t1 = Math.max(t1, fr[i]); }
  const ms = fl.filter((f) => f.t >= t0 && f.t < t1).reduce((s, f) => s + f.d, 0);
  const n = fl.filter((f) => f.t >= t0 && f.t < t1).length;
  console.log(`y${a}-${b}: ${frames} frames, ${(t1 - t0).toFixed(0)} ms, flushes ${n}, ${ms.toFixed(1)} ms → ${(ms / Math.max(1, frames)).toFixed(1)} ms/frame`);
}
