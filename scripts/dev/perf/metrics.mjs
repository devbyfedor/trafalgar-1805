// One line of frame metrics per run (in-page records).
//   node metrics.mjs runs/a.json runs/b.json ...
import { readFileSync } from "node:fs";

const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");
// Scene 1 scroll bands, CSS px at a 720 px viewport (p = scrollY / 2160)
const BANDS = [
  ["p<.08", 0, 173],
  ["strips .08-.64", 173, 1382],
  ["p.64-1", 1382, 2160],
  ["handoff", 2160, 3960],
  ["scene2", 3960, 1e9],
];
const rows = [];
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const fr = d.frames;
  const sc = d.scroll;
  const load = d.nav?.load ?? 0;
  const wheel0 = d.wheels.length ? d.wheels[0][2] : Number.POSITIVE_INFINITY;
  const ready =
    d.events.find((e) => e.kind === "road" && e.name === "ready")?.t ??
    Number.NaN;
  const idle0 = d.events.find((e) => e.kind === "idle-fired")?.t ?? Number.NaN;
  const iv = [];
  for (let i = 1; i < fr.length; i++)
    iv.push({ t: fr[i - 1], dt: fr[i] - fr[i - 1], y: sc[i - 1] });
  const stat = (list) => {
    if (!list.length) return "      -      ";
    const dur = list.reduce((s, x) => s + x.dt, 0);
    const missed = Math.max(0, Math.round(dur / 16.667) - list.length);
    const late = list.filter((x) => x.dt > 20).length;
    const worst = list.reduce((m, x) => Math.max(m, x.dt), 0);
    const fps = (list.length * 1000) / dur;
    return `${f1(fps).padStart(5)}fps ${String(missed).padStart(3)}miss ${String(late).padStart(3)}>20 w${Math.round(worst)}`;
  };
  const after1s = (x) => x.t >= load + 1000;
  const cols = [];
  cols.push([
    "load..wheel",
    stat(iv.filter((x) => x.t >= load && x.t < wheel0)),
  ]);
  cols.push([
    "wheel+1s",
    stat(iv.filter((x) => x.t >= wheel0 && x.t < wheel0 + 1000)),
  ]);
  cols.push([
    "chartLoad",
    stat(iv.filter((x) => x.t >= idle0 && x.t < ready + 300)),
  ]);
  for (const [name, a, b] of BANDS)
    cols.push([
      name,
      stat(iv.filter((x) => x.t >= wheel0 && x.y >= a && x.y < b)),
    ]);
  const lt = d.longtasks.filter((l) => l.start >= load + 1000);
  const lt50 = lt.filter((l) => l.dur > 50);
  rows.push({
    name: file.split(/[\\/]/).pop().replace(".json", ""),
    head: `wait ${d.meta.wait} nochart ${d.meta.nochart ? 1 : 0} style ${d.meta.style || "-"} load ${f1(load)} idle ${f1(idle0)} ready ${f1(ready)} wheel ${f1(wheel0)} longtasks>50ms after load+1s: ${lt50.length} [${lt50.map((l) => `${f1(l.start)}:${f1(l.dur)}`).join(" ")}]`,
    cols,
  });
}
for (const r of rows) {
  console.log(`\n${r.name}: ${r.head}`);
  for (const [k, v] of r.cols) console.log(`   ${k.padEnd(15)} ${v}`);
}
