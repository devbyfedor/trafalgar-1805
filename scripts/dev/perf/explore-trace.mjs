import { readFileSync } from "node:fs";

const raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
const ev = Array.isArray(raw) ? raw : raw.traceEvents;
console.log("events", ev.length);
const threads = new Map(),
  procs = new Map();
for (const e of ev) {
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
  if (e.ph === "M" && e.name === "process_name") procs.set(e.pid, e.args.name);
}
const counts = new Map();
for (const e of ev) {
  const th = threads.get(`${e.pid}:${e.tid}`) ?? `?${e.tid}`;
  const key = `${procs.get(e.pid) ?? e.pid}|${th}`;
  const m = counts.get(key) ?? new Map();
  m.set(
    `${e.cat}::${e.name}::${e.ph}`,
    (m.get(`${e.cat}::${e.name}::${e.ph}`) ?? 0) + 1,
  );
  counts.set(key, m);
}
for (const [k, m] of counts) {
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  if (total < 200) continue;
  console.log(`\n== ${k} (${total})`);
  for (const [n, c] of [...m].sort((a, b) => b[1] - a[1]).slice(0, 25))
    console.log(`  ${c}\t${n}`);
}
const tsib = ev.find((e) => e.name === "TracingStartedInBrowser");
console.log(JSON.stringify(tsib?.args?.data?.frames?.slice(0, 5)));
