// The GPU process's main thread in a window (page clock): every event over 2 ms, nested.
import { readFileSync } from "node:fs";
const [prefix, fromArg, toArg] = process.argv.slice(2);
const from = Number(fromArg), to = Number(toArg);
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const mark = ev.find((e) => typeof e.name === "string" && e.name.startsWith("perf:"));
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find((x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"));
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const threads = new Map();
for (const e of ev) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args.name);
const gpuMain = [...threads].filter(([, n]) => n === "CrGpuMain").map(([k]) => k);
const sel = ev.filter((e) => e.ph === "X" && gpuMain.includes(`${e.pid}:${e.tid}`) && pt(e.ts) >= from && pt(e.ts) <= to && e.dur > 2000).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
let depthEnd = [];
for (const e of sel) {
  while (depthEnd.length && depthEnd[depthEnd.length - 1] <= e.ts) depthEnd.pop();
  console.log(`${pt(e.ts).toFixed(1)} ${"  ".repeat(depthEnd.length)}${(e.dur / 1000).toFixed(1)} ${e.name} ${JSON.stringify(e.args ?? {}).slice(0, 100)}`);
  depthEnd.push(e.ts + e.dur);
}
