import { readFileSync } from "node:fs";

const prefix = process.argv[2];
const from = Number(process.argv[3] ?? 2500),
  to = Number(process.argv[4] ?? 3500);
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const mark = ev.find(
  (e) => typeof e.name === "string" && e.name.startsWith("perf:"),
);
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
// offset via first matching mark
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find(
  (x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"),
);
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const pid = mark.pid;
const inWin = (e) => pt(e.ts) >= from && pt(e.ts) < to;
const rt = ev.filter(
  (e) => e.name === "RasterTask" && e.pid === pid && e.ph === "X" && inWin(e),
);
console.log(
  "RasterTask sample args:",
  JSON.stringify(rt.slice(0, 3).map((e) => e.args)),
);
const byLayer = new Map();
for (const e of rt) {
  const td = e.args?.tileData ?? {};
  const k = `${td.layerId}`;
  const v = byLayer.get(k) ?? {
    n: 0,
    dur: 0,
    scales: new Set(),
    src: new Set(),
  };
  v.n++;
  v.dur += e.dur / 1000;
  v.scales.add(td.contentsScale ?? td.tileResolution);
  v.src.add(td.sourceFrameNumber);
  byLayer.set(k, v);
}
console.log(`raster tasks ${rt.length} in window, by layer:`);
for (const [k, v] of [...byLayer].sort((a, b) => b[1].n - a[1].n).slice(0, 20))
  console.log(
    `  layer ${k}: n ${v.n}, ${v.dur.toFixed(1)} ms, scales ${[...v.scales].slice(0, 5).join(",")}, frames ${v.src.size}`,
  );
const main = ev.filter(
  (e) =>
    e.pid === pid &&
    (e.name === "Paint" ||
      e.name === "PaintImage" ||
      e.name === "UpdateLayer") &&
    inWin(e),
);
const pc = new Map();
for (const e of main) {
  if (e.name !== "Paint") continue;
  const d = e.args?.data ?? {};
  const k = `layer ${d.layerId} node ${d.nodeId} clip ${JSON.stringify(d.clip?.map(Math.round))}`;
  pc.set(k, (pc.get(k) ?? 0) + 1);
}
console.log("Paint events by layer/node:");
for (const [k, n] of [...pc].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(`  ${n}  ${k}`);
const ul = new Map();
for (const e of main) {
  if (e.name !== "UpdateLayer") continue;
  const k = `${e.args?.layerId}`;
  ul.set(k, (ul.get(k) ?? 0) + 1);
}
console.log(
  "UpdateLayer by layerId:",
  [...ul]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, n]) => `${k}:${n}`)
    .join(" "),
);
// what does the GPU process raster? DoRasterCHROMIUM args
const gr = ev
  .filter(
    (e) =>
      e.name === "RasterDecoderImpl::DoEndRasterCHROMIUM::Flush" && inWin(e),
  )
  .sort((a, b) => b.dur - a.dur)
  .slice(0, 5);
console.log(
  "slowest raster flushes:",
  gr
    .map((e) => `${pt(e.ts).toFixed(1)}:${(e.dur / 1000).toFixed(1)}`)
    .join(" "),
);
