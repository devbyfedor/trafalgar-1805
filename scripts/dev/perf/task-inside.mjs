// The renderer main thread's events nested in the task that starts near <at> ms (page clock).
import { readFileSync } from "node:fs";
const [prefix, atArg] = process.argv.slice(2);
const at = Number(atArg);
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const mark = ev.find((e) => typeof e.name === "string" && e.name.startsWith("perf:"));
const [, kind, ...rest] = mark.name.split(":");
const pe = page.events.find((x) => x.kind === kind && String(x.name).slice(0, 80) === rest.join(":"));
const offset = mark.ts / 1000 - pe.t;
const pt = (ts) => ts / 1000 - offset;
const main = ev.filter((e) => e.pid === mark.pid && e.tid === mark.tid && e.ph === "X");
const task = main.filter((e) => Math.abs(pt(e.ts) - at) < 3 && e.dur > 20000).sort((a, b) => b.dur - a.dur)[0];
if (!task) { console.log("no task"); process.exit(); }
console.log(`task ${task.name} at ${pt(task.ts).toFixed(1)} ${(task.dur / 1000).toFixed(1)} ms`);
const inner = main.filter((e) => e.ts >= task.ts && e.ts + e.dur <= task.ts + task.dur && e !== task && e.dur > 1000).sort((a, b) => a.ts - b.ts);
for (const e of inner) console.log(`  +${(pt(e.ts) - pt(task.ts)).toFixed(1)} ${(e.dur / 1000).toFixed(1)} ms ${e.name} ${JSON.stringify(e.args?.data ?? {}).slice(0, 160)}`);
