// CPU profile stacks on the renderer main thread between two page-clock times.
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
// Profile + ProfileChunk events of the renderer's main isolate
const prof = ev.filter((e) => (e.name === "Profile" || e.name === "ProfileChunk") && e.pid === mark.pid);
const byId = new Map();
for (const e of prof) { const id = e.id; const v = byId.get(id) ?? { start: null, chunks: [] }; if (e.name === "Profile") v.start = e.args.data.startTime; else v.chunks.push(e); byId.set(id, v); }
const counts = new Map();
for (const [, v] of byId) {
  const nodes = new Map();
  let t = v.start;
  for (const c of v.chunks) {
    const d = c.args.data.cpuProfile ?? {};
    for (const n of d.nodes ?? []) nodes.set(n.id, n);
    const samples = d.samples ?? [], deltas = c.args.data.timeDeltas ?? [];
    for (let i = 0; i < samples.length; i++) {
      t += deltas[i];
      const ms = pt(t);
      if (ms < from || ms > to) continue;
      // stack
      const stack = [];
      let n = nodes.get(samples[i]);
      while (n) { const f = n.callFrame; stack.push(`${f.functionName || "(anon)"}@${(f.url || "").split("/").pop()}:${f.lineNumber}:${f.columnNumber}`); n = nodes.get(n.parent); }
      const key = stack.slice(0, 7).join(" < ");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
}
for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(n, k);
