// GPU-process raster flushes and renderer raster tasks per layer, against the scroll.
//   node flushes.mjs <prefix> [minFlushMs]
import { readFileSync } from "node:fs";
const prefix = process.argv[2];
const min = Number(process.argv[3] ?? 4);
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const mark = ev.find((e) => typeof e.name === "string" && e.name.startsWith("perf:"));
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find((x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"));
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const fr = page.frames, sc = page.scroll;
const yAt = (t) => { let lo = 0, hi = fr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (fr[m] <= t) lo = m; else hi = m - 1; } return sc[lo]; };
const wheel0 = page.wheels[0][2];
// renderer raster tasks per frame window: layer ids
const rt = ev.filter((e) => e.name === "RasterTask" && e.ph === "X" && e.pid === mark.pid);
const fl = ev.filter((e) => e.name === "RasterDecoderImpl::DoEndRasterCHROMIUM::Flush" && e.ph === "X").map((e) => ({ t: pt(e.ts), d: e.dur / 1000 }));
const byBand = new Map();
for (const f of fl) {
  if (f.t < wheel0) continue;
  const y = yAt(f.t);
  const b = Math.floor(y / 50) * 50;
  const v = byBand.get(b) ?? { n: 0, ms: 0, max: 0 };
  v.n++; v.ms += f.d; v.max = Math.max(v.max, f.d);
  byBand.set(b, v);
}
console.log("GPU raster flushes by scrollY/50 (n, total ms, max ms):");
for (const [b, v] of [...byBand].sort((a, b) => a[0] - b[0])) if (v.ms > 2) console.log(`  y${b} p${(b / 2160).toFixed(3)}: n${v.n} ${v.ms.toFixed(1)}ms max${v.max.toFixed(1)}`);
const lay = new Map();
for (const e of rt) {
  const t = pt(e.ts); if (t < wheel0) continue;
  const y = yAt(t); const b = Math.floor(y / 100) * 100;
  const id = e.args?.tileData?.layerId;
  const k = `${id}`;
  const m = lay.get(k) ?? new Map(); m.set(b, (m.get(b) ?? 0) + 1); lay.set(k, m);
}
console.log("renderer raster tasks by layer, by scrollY/100:");
for (const [k, m] of [...lay].sort((a, b) => [...b[1].values()].reduce((s, x) => s + x, 0) - [...a[1].values()].reduce((s, x) => s + x, 0)).slice(0, 8))
  console.log(`  layer ${k}: ${[...m].sort((a, b) => a[0] - b[0]).map(([b, n]) => `${b}:${n}`).join(" ")}`);
