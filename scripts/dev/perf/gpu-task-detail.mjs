import { readFileSync } from "node:fs";

const prefix = process.argv[2];
const from = Number(process.argv[3]),
  to = Number(process.argv[4]),
  minMs = Number(process.argv[5] ?? 8);
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const mark = ev.find(
  (e) => typeof e.name === "string" && e.name.startsWith("perf:"),
);
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find(
  (x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"),
);
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const threads = new Map();
for (const e of ev)
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
const gpuKey = [...threads].find(([, v]) => v === "CrGpuMain")?.[0];
const g = ev
  .filter((e) => `${e.pid}:${e.tid}` === gpuKey && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
for (const t of g.filter(
  (e) =>
    e.name === "ThreadControllerImpl::RunTask" &&
    pt(e.ts) >= from &&
    pt(e.ts) <= to &&
    e.dur >= minMs * 1000,
)) {
  console.log(
    `\n== GPU main task @${pt(t.ts).toFixed(1)} dur ${(t.dur / 1000).toFixed(1)} ms`,
  );
  const kids = g.filter(
    (c) =>
      c.ts >= t.ts &&
      c.ts + c.dur <= t.ts + t.dur + 1 &&
      c !== t &&
      c.dur >= 300,
  );
  for (const c of kids)
    console.log(
      `   +${((c.ts - t.ts) / 1000).toFixed(1).padStart(6)} ${(c.dur / 1000).toFixed(1).padStart(6)} ms  ${c.cat} :: ${c.name} ${c.args && Object.keys(c.args).length ? JSON.stringify(c.args).slice(0, 160) : ""}`,
    );
}
