// Summarises one run's in-page records (run.mjs's <prefix>.json).
//   node analyze-page.mjs <prefix>.json [--full]
import { readFileSync } from "node:fs";

const file = process.argv[2];
const full = process.argv.includes("--full");
const d = JSON.parse(readFileSync(file, "utf8"));
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");
const lines = [];
const out = (s = "") => lines.push(s);

const { meta } = d;
out(`# ${file}`);
out(`GPU: ${meta.gpuName}`);
out(
  `wait ${meta.wait} ms, wheel ${meta.step} px / ${meta.interval} ms, ${meta.steps} steps, final scrollY ${meta.state.scrollY}, road ready ${meta.state.road}`,
);
out(
  `nav: domInteractive ${f1(d.nav?.domInteractive)}, DCL ${f1(d.nav?.dcl)}, load ${f1(d.nav?.load)}; paints ${d.paints.map((p) => `${p.name} ${f1(p.t)}`).join(", ")}`,
);
if (meta.errors.length)
  out(
    `console errors/warnings: ${meta.errors.length}: ${meta.errors.slice(0, 5).join(" | ")}`,
  );

// Wheel / scroll timeline
const wheels = d.wheels;
const scrollStart = wheels.length ? wheels[0][2] : Number.NaN;
const scrollEnd = wheels.length ? wheels[wheels.length - 1][2] : Number.NaN;
out(
  `wheel events: ${wheels.length}, first at ${f1(scrollStart)} ms, last at ${f1(scrollEnd)} ms`,
);

// Events
out("\n## Loading steps (page clock, ms)");
const roadReady = d.events.find(
  (e) => e.kind === "road" && e.name === "ready",
)?.t;
for (const e of d.events) {
  if (e.kind === "fetch-headers") continue;
  const extra = Object.entries(e)
    .filter(([k]) => !["t", "kind", "name"].includes(k))
    .map(([k, v]) => `${k}=${typeof v === "number" ? f1(v) : v}`)
    .join(" ");
  out(`${f1(e.t).padStart(8)}  ${e.kind}  ${e.name}  ${extra}`);
}
const stageChunk = d.resources.filter(
  (r) => /stage|three|troika|chart/i.test(r.name) && r.name.endsWith(".js"),
);
for (const r of stageChunk)
  out(
    `${f1(r.start).padStart(8)}  script ${r.name} -> ${f1(r.end)} (${r.size} B)`,
  );
const chartRes = d.resources.filter(
  (r) => r.name.includes("/chart/") || r.name.includes("/fonts/"),
);
for (const r of chartRes)
  out(
    `${f1(r.start).padStart(8)}  asset ${r.name} -> ${f1(r.end)} (${r.size} B)`,
  );

// Frames
out("\n## Frames (rAF timestamps)");
const fr = d.frames;
const iv = [];
for (let i = 1; i < fr.length; i++)
  iv.push([fr[i - 1], fr[i] - fr[i - 1], d.scroll[i]]);
const inRange = (a, b) => iv.filter(([t]) => t >= a && t < b);
const summarise = (name, list) => {
  if (!list.length) return out(`${name}: no frames`);
  const n = list.length;
  const dur = list.reduce((s, [, x]) => s + x, 0);
  const late = (ms) => list.filter(([, x]) => x > ms).length;
  const sorted = list.map(([, x]) => x).sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
  // Frames that should have been there: dur / 16.67
  const expected = Math.round(dur / (1000 / 60));
  out(
    `${name}: ${n} frames in ${f1(dur)} ms (${f1((n * 1000) / dur)} fps; ${expected - n} vsyncs missed), intervals >20 ms: ${late(20)}, >25: ${late(25)}, >34: ${late(34)}, >50: ${late(50)}, p50 ${f1(q(0.5))} p95 ${f1(q(0.95))} p99 ${f1(q(0.99))} max ${f1(sorted[n - 1])}`,
  );
};
summarise("all", iv);
summarise("load -> first wheel", inRange(0, scrollStart));
summarise("first wheel -> +1 s", inRange(scrollStart, scrollStart + 1000));
summarise("first wheel -> +3 s", inRange(scrollStart, scrollStart + 3000));
summarise("scrolling (first..last wheel)", inRange(scrollStart, scrollEnd));
summarise("after last wheel", inRange(scrollEnd, Number.POSITIVE_INFINITY));
if (Number.isFinite(roadReady)) {
  summarise("before road ready", inRange(0, roadReady));
  summarise("after road ready", inRange(roadReady, Number.POSITIVE_INFINITY));
}
// fps per 250 ms bucket
const bucket = 250;
const t0 = fr[0] ?? 0;
const tEnd = fr[fr.length - 1] ?? 0;
const buckets = [];
for (let b = Math.floor(t0 / bucket) * bucket; b < tEnd; b += bucket) {
  const l = inRange(b, b + bucket);
  const worst = l.reduce((m, [, x]) => Math.max(m, x), 0);
  buckets.push(
    `${(b / 1000).toFixed(2)}s:${l.length}${worst > 20 ? `(${Math.round(worst)})` : ""}`,
  );
}
out(
  `frames per ${bucket} ms bucket (worst interval if > 20): ${buckets.join(" ")}`,
);
out("\nlong intervals (> 20 ms): t, interval, scrollY");
out(
  iv
    .filter(([, x]) => x > 20)
    .map(([t, x, s]) => `${f1(t)}:${f1(x)}@${Math.round(s)}`)
    .join("  "),
);

// LoAF
out("\n## Long animation frames (> 50 ms)");
for (const l of d.loafs) {
  const scripts = l.scripts
    .sort((a, b) => b.dur - a.dur)
    .slice(0, 4)
    .map(
      (s) =>
        `${f1(s.dur)}ms ${s.type} ${s.invoker?.slice(0, 60)} ${s.fn ? `fn=${s.fn}` : ""} ${s.src ? s.src.split("/").pop().slice(0, 70) : ""}${s.forced > 1 ? ` forcedLayout=${f1(s.forced)}` : ""}`,
    );
  out(
    `${f1(l.start).padStart(8)} dur ${f1(l.dur)} blocking ${f1(l.blocking)} render@${f1(l.renderStart - l.start)}  ${scripts.join(" || ")}`,
  );
}
out("\n## Long tasks (> 50 ms)");
out(d.longtasks.map((l) => `${f1(l.start)}:${f1(l.dur)}`).join("  "));

// Slow GL / 2D calls
out("\n## Main-thread calls >= 1 ms (WebGL, 2D)");
const ctxName = (id) => {
  const c = d.contexts.find((x) => x.id === id);
  return c ? `${c.type}#${id}` : String(id);
};
const slow = d.slow.slice().sort((a, b) => a.t - b.t);
const slowLines = slow
  .filter((s) => full || s.ms >= 2)
  .map(
    (s) =>
      `${f1(s.t).padStart(8)} ${f1(s.ms).padStart(6)} ms  ${s.ctx === "2d" ? "2d" : ctxName(s.ctx)} ${s.fn} ${s.info ?? ""} ${s.label ?? ""}`,
  );
for (const l of slowLines.slice(0, full ? 5000 : 250)) out(l);
if (!full && slowLines.length > 250) out(`... ${slowLines.length - 250} more`);

out("\n## WebGL main-thread totals (top 30 by total ms)");
const stats = Object.entries(d.glStats)
  .map(([k, v]) => ({ k, ...v }))
  .sort((a, b) => b.ms - a.ms)
  .slice(0, 30);
for (const s of stats) {
  const [cid, fn] = s.k.split(":");
  out(
    `${ctxName(Number(cid)).padEnd(10)} ${fn.padEnd(28)} n ${String(s.n).padStart(7)}  total ${f1(s.ms).padStart(8)} ms  max ${f1(s.max)}`,
  );
}
out("\n## 2D canvas totals");
for (const [k, v] of Object.entries(d.canvas2d))
  out(
    `${k}: n ${v.n}, ${f1(v.ms)} ms${v.max !== undefined ? `, max ${f1(v.max)}` : ""}`,
  );
out("\n## Canvas contexts");
for (const c of d.contexts)
  out(
    `#${c.id} ${c.type} ${c.w}x${c.h} at ${f1(c.t)} (${f1(c.ms)} ms) ${c.attrs}`,
  );

// GPU timer queries
out(
  "\n## GPU time (timer queries on the chart's WebGL2 context, while loading and for 4 s after ready)",
);
const gpu = d.gpu.filter((g) => g.gpuMs >= 0 && !g.disjoint);
const byLabel = new Map();
for (const g of gpu) {
  const key = `${g.fn} ${g.label}`;
  const v = byLabel.get(key) ?? { n: 0, ms: 0, max: 0, first: g.t };
  v.n++;
  v.ms += g.gpuMs;
  v.max = Math.max(v.max, g.gpuMs);
  byLabel.set(key, v);
}
for (const [k, v] of [...byLabel]
  .sort((a, b) => b[1].ms - a[1].ms)
  .slice(0, 40))
  out(
    `${k.padEnd(60)} n ${String(v.n).padStart(5)} total ${f1(v.ms).padStart(8)} ms max ${f1(v.max).padStart(7)} first@${f1(v.first)}`,
  );
out(`disjoint results dropped: ${d.gpu.filter((g) => g.disjoint).length}`);
out("\nGPU calls >= 2 ms (in time order):");
for (const g of gpu.filter((x) => x.gpuMs >= 2).sort((a, b) => a.t - b.t))
  out(
    `${f1(g.t).padStart(8)} gpu ${f1(g.gpuMs).padStart(7)} ms  ${g.fn} ${g.label} ${g.info}`,
  );
// GPU per frame: sum of GPU time of calls issued within each frame interval after ready
console.log(lines.join("\n"));
