// Long animation frames (LoAF) after the first wheel, with their scripts.
import { readFileSync } from "node:fs";
const min = Number(process.env.MIN ?? 45);
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const wheel0 = d.wheels.length ? d.wheels[0][2] : 0;
  const ready = d.events.find((e) => e.kind === "road" && e.name === "ready")?.t ?? NaN;
  console.log(`${file.split(/[\/]/).pop()} (wheel ${wheel0.toFixed(0)}, ready ${ready.toFixed(0)})`);
  for (const l of d.loafs ?? []) {
    if (l.start < wheel0 - 200 || l.dur < min) continue;
    const scripts = (l.scripts ?? []).filter((s) => (s.dur ?? s.duration ?? 0) > 3).map((s) => `${s.invoker ?? ""} ${s.fn ?? ""} ${(s.src ?? "").split("/").pop()}@${s.charPos ?? ""} ${Math.round(s.dur ?? 0)}ms forced ${Math.round(s.forced ?? 0)}`);
    console.log(`  ${l.start.toFixed(0)} dur ${l.dur.toFixed(0)} blocking ${Math.round(l.blocking ?? 0)} render@${l.renderStart ? (l.renderStart - l.start).toFixed(0) : "-"} style@${l.styleAndLayoutStart ? (l.styleAndLayoutStart - l.start).toFixed(0) : "-"} | ${scripts.join(" ; ")}`);
  }
}
