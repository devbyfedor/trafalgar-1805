import { readFileSync } from "node:fs";

const prefix = process.argv[2];
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
const put = ev.filter(
  (e) =>
    e.name === "CommandBufferService:PutChanged" &&
    e.ph === "X" &&
    /WebGL/.test(e.args?.handler ?? ""),
);
const by = new Map();
for (const e of put) {
  const h = e.args.handler;
  const v = by.get(h) ?? [];
  v.push(e);
  by.set(h, v);
}
const ready = page.events.find(
  (e) => e.kind === "road" && e.name === "ready",
)?.t;
console.log("ready", ready?.toFixed(1));
for (const [h, list] of by) {
  const total = list.reduce((s, e) => s + e.dur, 0) / 1000;
  const big = list
    .filter((e) => e.dur > 4000)
    .map((e) => `${pt(e.ts).toFixed(0)}:${(e.dur / 1000).toFixed(1)}`);
  console.log(
    `${h}: n ${list.length}, total ${total.toFixed(1)} ms, max ${(Math.max(...list.map((e) => e.dur)) / 1000).toFixed(1)} ms; >4ms: ${big.join(" ")}`,
  );
}
