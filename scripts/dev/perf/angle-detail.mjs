import { readFileSync } from "node:fs";

const prefix = process.argv[2];
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const marks = ev.filter(
  (e) => typeof e.name === "string" && e.name.startsWith("perf:"),
);
const offs = [];
for (const m of marks) {
  const [, kind, ...rest] = m.name.split(":");
  const pe = page.events.find(
    (x) =>
      x.kind === kind &&
      String(x.name).slice(0, 80) === rest.join(":") &&
      !x._u,
  );
  if (pe) {
    pe._u = 1;
    offs.push(m.ts / 1000 - pe.t);
  }
}
offs.sort((a, b) => a - b);
const offset = offs[Math.floor(offs.length / 2)];
const pt = (ts) => ts / 1000 - offset;
const threads = new Map();
for (const e of ev)
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
const name = (e) => threads.get(`${e.pid}:${e.tid}`);
// ANGLE events by thread, with time
const angle = ev
  .filter((e) => /angle/.test(e.cat) && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
const byThread = new Map();
for (const e of angle) {
  const k = name(e);
  const v = byThread.get(k) ?? { n: 0, ms: 0 };
  v.n++;
  v.ms += e.dur / 1000;
  byThread.set(k, v);
}
console.log(
  "ANGLE work by thread:",
  JSON.stringify(
    Object.fromEntries(
      [...byThread].map(([k, v]) => [k, `${v.n} events ${v.ms.toFixed(1)} ms`]),
    ),
  ),
);
const evs = page.events.filter((e) =>
  ["link", "first-use", "road"].includes(e.kind),
);
for (const e of angle.filter(
  (x) =>
    x.dur > 2000 && /D3DCompile|link|wait|Executable|initialize/.test(x.name),
)) {
  const t = pt(e.ts);
  const near = evs.filter((x) => x.t <= t + 1).slice(-1)[0];
  console.log(
    `${t.toFixed(1).padStart(8)} ${(e.dur / 1000).toFixed(1).padStart(6)} ms  ${String(name(e)).padEnd(28)} ${e.name}   (after: ${near ? near.kind + " " + near.name : "-"})`,
  );
}
// Long tasks on CrGpuMain with ANGLE children
const gm = ev
  .filter((e) => name(e) === "CrGpuMain" && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
for (const t of gm.filter(
  (e) => e.name === "ThreadControllerImpl::RunTask" && e.dur > 8000,
)) {
  const kids = angle.filter(
    (c) =>
      name(c) === "CrGpuMain" &&
      c.ts >= t.ts &&
      c.ts <= t.ts + t.dur &&
      c.dur > 500,
  );
  const others = gm.filter(
    (c) =>
      c.ts >= t.ts &&
      c.ts <= t.ts + t.dur &&
      c.dur > 3000 &&
      /PutChanged|SwapBuffers|Raster/.test(c.name),
  );
  console.log(
    `GPU main task @${pt(t.ts).toFixed(1)} ${(t.dur / 1000).toFixed(1)} ms: ${others.map((c) => `${c.name}${c.args?.handler ? "(" + c.args.handler + ")" : ""} ${(c.dur / 1000).toFixed(1)}`).join(", ")} | angle: ${kids.map((k) => `${k.name} ${(k.dur / 1000).toFixed(1)}`).join(", ")}`,
  );
}
