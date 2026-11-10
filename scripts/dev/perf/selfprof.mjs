// Self time by function (and by script) on the renderer main thread between two page-clock times.
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
const prof = ev.filter((e) => (e.name === "Profile" || e.name === "ProfileChunk") && e.pid === mark.pid);
const byId = new Map();
for (const e of prof) { const v = byId.get(e.id) ?? { start: null, chunks: [] }; if (e.name === "Profile") v.start = e.args.data.startTime; else v.chunks.push(e); byId.set(e.id, v); }
const self = new Map(), byScript = new Map();
let total = 0;
for (const [, v] of byId) {
  const nodes = new Map(); let t = v.start;
  for (const c of v.chunks) {
    const d = c.args.data.cpuProfile ?? {};
    for (const n of d.nodes ?? []) nodes.set(n.id, n);
    const samples = d.samples ?? [], deltas = c.args.data.timeDeltas ?? [];
    for (let i = 0; i < samples.length; i++) {
      t += deltas[i]; const ms = pt(t);
      if (ms < from || ms > to) continue;
      const n = nodes.get(samples[i]); if (!n) continue;
      const f = n.callFrame; const key = `${f.functionName || "(anon)"} ${(f.url || "").split("/").pop()}:${f.lineNumber}:${f.columnNumber}`;
      const dt = (deltas[i] ?? 0) / 1000; total += dt;
      self.set(key, (self.get(key) ?? 0) + dt);
      // attribute to the nearest ancestor with a url
      let m = n; while (m && !m.callFrame.url) m = nodes.get(m.parent);
      const sk = m ? m.callFrame.url.split("/").pop() : "(native)";
      byScript.set(sk, (byScript.get(sk) ?? 0) + dt);
    }
  }
}
console.log(`total sampled ${total.toFixed(1)} ms`);
for (const [k, ms] of [...byScript].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  script ${ms.toFixed(1)} ms ${k}`);
for (const [k, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  self ${ms.toFixed(1)} ms ${k}`);
