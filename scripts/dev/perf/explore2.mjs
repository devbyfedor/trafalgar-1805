import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
const ev = Array.isArray(raw) ? raw : raw.traceEvents;
const threads = new Map(),
  procs = new Map();
for (const e of ev) {
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
  if (e.ph === "M" && e.name === "process_name") procs.set(e.pid, e.args.name);
}
const per = new Map();
for (const e of ev) {
  const k = `${e.pid}:${e.tid}`;
  per.set(k, (per.get(k) ?? 0) + 1);
}
for (const [k, n] of [...per].sort((a, b) => b[1] - a[1]))
  console.log(n, k, procs.get(Number(k.split(":")[0])), threads.get(k));
const want = process.argv[3] ?? "CrGpuMain";
const counts = new Map();
for (const e of ev) {
  const th = threads.get(`${e.pid}:${e.tid}`);
  if (th !== want) continue;
  if (e.ph !== "X") continue;
  const m = counts.get(e.name) ?? { n: 0, dur: 0, max: 0 };
  m.n++;
  m.dur += e.dur ?? 0;
  m.max = Math.max(m.max, e.dur ?? 0);
  counts.set(e.name, m);
}
console.log(`\n== ${want} X events by total dur`);
for (const [n, m] of [...counts]
  .sort((a, b) => b[1].dur - a[1].dur)
  .slice(0, 70))
  console.log(
    `${(m.dur / 1000).toFixed(1).padStart(9)} ms  n ${String(m.n).padStart(6)}  max ${(m.max / 1000).toFixed(1).padStart(7)}  ${n}`,
  );
