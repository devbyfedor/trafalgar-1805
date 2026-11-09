// The chart's loading window of one traced run, step by step: in-page events
// (fetches, decodes, contexts, slow WebGL/2D calls, GPU-timed passes), the
// renderer main thread's tasks > 8 ms with attribution, the GPU process main
// thread's tasks > 8 ms by kind, and every late frame with what overlapped it.
//   node --max-old-space-size=8192 timeline.mjs <prefix> [from] [to]
// Writes <prefix>.timeline.txt.
import { readFileSync, writeFileSync } from "node:fs";

const prefix = process.argv[2];
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = raw.traceEvents ?? raw;
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");
const idle0 = page.events.find((e) => e.kind === "idle-fired")?.t ?? 500;
const ready =
  page.events.find((e) => e.kind === "road" && e.name === "ready")?.t ??
  idle0 + 2000;
const from = Number(process.argv[3] ?? idle0 - 50);
const to = Number(process.argv[4] ?? ready + 900);

const threads = new Map();
for (const e of ev)
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
const marks = ev.filter(
  (e) => typeof e.name === "string" && e.name.startsWith("perf:"),
);
const rendererPid = marks[0]?.pid;
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
    pe._u = true;
    offs.push(m.ts / 1000 - pe.t);
  }
}
offs.sort((a, b) => a - b);
const offset = offs[Math.floor(offs.length / 2)] ?? 0;
const pt = (ts) => ts / 1000 - offset;
const key = (e) => `${e.pid}:${e.tid}`;
const mainKey = [...threads].find(
  ([k, v]) => v === "CrRendererMain" && Number(k.split(":")[0]) === rendererPid,
)?.[0];
const gpuKey = [...threads].find(([, v]) => v === "CrGpuMain")?.[0];

// CPU samples
const nodes = new Map();
const samples = [];
{
  const profiles = new Map();
  for (const e of ev)
    if (e.name === "Profile" && e.pid === rendererPid)
      profiles.set(e.id, { tid: e.tid, last: e.args.data.startTime });
  for (const e of ev) {
    if (e.name !== "ProfileChunk" || e.pid !== rendererPid) continue;
    const p = profiles.get(e.id);
    if (!p || `${e.pid}:${p.tid}` !== mainKey) continue;
    const cp = e.args.data.cpuProfile ?? {};
    for (const n of cp.nodes ?? [])
      nodes.set(n.id, { cf: n.callFrame, parent: n.parent });
    const deltas = e.args.data.timeDeltas ?? [];
    (cp.samples ?? []).forEach((s, i) => {
      p.last += deltas[i] ?? 0;
      samples.push([p.last, s]);
    });
  }
  samples.sort((a, b) => a[0] - b[0]);
}
const SKIP =
  /^(\(program\)|\(idle\)|\(garbage collector\)|\(root\)|proto\.<computed>|C2\.<computed>|HTMLCanvasElement\.getContext|window\.Path2D|ev|tick|pollQueries|now)$/;
function attribution(t0, t1) {
  // deepest project-code function per sample, counted
  const m = new Map();
  let n = 0;
  for (const [ts, id] of samples) {
    if (ts < t0) continue;
    if (ts > t1) break;
    n++;
    let cur = nodes.get(id);
    let name = null;
    let leaf = null;
    while (cur) {
      const fn = cur.cf.functionName;
      if (!leaf && fn && !SKIP.test(fn)) leaf = fn;
      if (!name && fn && /src_|stage/.test(cur.cf.url ?? "") && !SKIP.test(fn))
        name = fn;
      cur = cur.parent ? nodes.get(cur.parent) : null;
    }
    const k = name ?? (leaf ? `[${leaf}]` : "(native/idle)");
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${k} ${Math.round((100 * v) / Math.max(1, n))}%`)
    .join(", ");
}

const items = [];
// in-page events
for (const e of page.events)
  if (e.t >= from && e.t <= to && e.kind !== "fetch-headers")
    items.push([
      e.t,
      "page ",
      `${e.kind} ${String(e.name).slice(0, 70)}${e.ms !== undefined ? ` (${f1(e.ms)} ms)` : ""}`,
    ]);
for (const s of page.slow)
  if (s.t >= from && s.t <= to && s.ms >= 2)
    items.push([
      s.t,
      "call ",
      `${f1(s.ms)} ms main-thread ${s.ctx === "2d" ? "2d" : `gl#${s.ctx}`} ${s.fn} ${s.info ?? ""} ${s.label ?? ""}`,
    ]);
for (const g of page.gpu)
  if (g.t >= from && g.t <= to && g.gpuMs >= 1)
    items.push([
      g.t,
      "gpuq ",
      `${f1(g.gpuMs)} ms GPU (timer query) ${g.fn} ${g.label} ${g.info}`,
    ]);
// main-thread tasks
const mainTasks = ev
  .filter((e) => key(e) === mainKey && e.ph === "X" && e.name === "RunTask")
  .sort((a, b) => a.ts - b.ts);
for (const t of mainTasks) {
  const s = pt(t.ts);
  if (s < from || s > to || t.dur < 8000) continue;
  const kids = ev.filter(
    (c) =>
      key(c) === mainKey &&
      c.ph === "X" &&
      c.ts >= t.ts &&
      c.ts <= t.ts + t.dur &&
      /^(FunctionCall|TimerFire|FireAnimationFrame|FireIdleCallback|EvaluateScript|RunMicrotasks|ParseHTML|EventDispatch)$/.test(
        c.name,
      ),
  );
  const top = kids.sort((a, b) => b.dur - a.dur)[0];
  const how = top
    ? `${top.name}${top.args?.data?.functionName ? `:${top.args.data.functionName}` : ""}`
    : "";
  const waits = ev
    .filter(
      (c) =>
        key(c) === mainKey &&
        c.ph === "X" &&
        c.ts >= t.ts &&
        c.ts <= t.ts + t.dur &&
        /WaitForGetOffset|WaitForToken|Receive mojo reply|SyncChannel/.test(
          c.name,
        ),
    )
    .reduce((s2, c) => s2 + c.dur, 0);
  const gcs = ev
    .filter(
      (c) =>
        key(c) === mainKey &&
        c.ph === "X" &&
        c.ts >= t.ts &&
        c.ts <= t.ts + t.dur &&
        /^(MinorGC|MajorGC)$/.test(c.name),
    )
    .reduce((s2, c) => s2 + c.dur, 0);
  items.push([
    s,
    "MAIN ",
    `task ${f1(t.dur / 1000)} ms [${how}] waits-on-GPU ${f1(waits / 1000)} ms, GC ${f1(gcs / 1000)} ms :: ${attribution(t.ts, t.ts + t.dur)}`,
  ]);
}
// GPU main thread tasks
const gpuEv = ev
  .filter((e) => key(e) === gpuKey && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
const gpuTasks = gpuEv.filter(
  (e) => e.name === "ThreadControllerImpl::RunTask",
);
const KIND =
  /^(RendererRasterWorker|WebGL|RendererMainThread|BrowserRasterWorker|SkiaOutputSurfaceImplOnGpu::SwapBuffers|SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass|SkiaOutputSurfaceImplOnGpu::FinishPaintCurrentFrame|SharedImageStub::.*|GpuChannel::CreateCommandBuffer|CommandBufferStub::PerformWork)$/;
for (const t of gpuTasks) {
  const s = pt(t.ts);
  if (s < from || s > to || t.dur < 8000) continue;
  const kids = gpuEv.filter(
    (c) => c.ts >= t.ts && c.ts <= t.ts + t.dur && KIND.test(c.name),
  );
  const k = kids.sort((a, b) => b.dur - a.dur)[0];
  items.push([
    s,
    "GPU  ",
    `gpu-main task ${f1(t.dur / 1000)} ms [${k ? k.name : "?"}]`,
  ]);
}
items.sort((a, b) => a[0] - b[0]);

// late frames, and what overlapped each
const fr = page.frames;
const late = [];
for (let i = 1; i < fr.length; i++) {
  const a = fr[i - 1];
  const b = fr[i];
  if (b - a <= 20 || a < from || a > to) continue;
  const ta = (a + offset) * 1000;
  const tb = (b + offset) * 1000;
  const ov = (list) => list.filter((e) => e.ts < tb && e.ts + e.dur > ta);
  const m = ov(mainTasks).filter((e) => e.dur > 4000);
  const g = ov(gpuTasks);
  const gBusy =
    g.reduce((s, e) => s + Math.min(e.ts + e.dur, tb) - Math.max(e.ts, ta), 0) /
    (tb - ta);
  const gk = new Map();
  for (const e of gpuEv.filter(
    (c) => KIND.test(c.name) && c.ts < tb && c.ts + c.dur > ta,
  ))
    gk.set(
      e.name,
      (gk.get(e.name) ?? 0) +
        (Math.min(e.ts + e.dur, tb) - Math.max(e.ts, ta)) / 1000,
    );
  late.push(
    `${f1(a).padStart(8)} +${f1(b - a)} ms: main tasks ${m.map((e) => `${f1(e.dur / 1000)}ms@${f1(pt(e.ts))}`).join(",") || "none>4ms"}; gpu-main busy ${Math.round(gBusy * 100)}% (${[
      ...gk,
    ]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(
        ([n, d]) => `${n.replace("SkiaOutputSurfaceImplOnGpu::", "")} ${f1(d)}`,
      )
      .join(", ")})`,
  );
}

const outLines = [
  `# ${prefix}: chart loading window ${f1(from)}..${f1(to)} ms (page clock); first idle callback ${f1(idle0)}, ready ${f1(ready)}`,
  "",
  ...items.map(([t, k, s]) => `${f1(t).padStart(8)} ${k} ${s}`),
  "",
  "## Late frames (rAF interval > 20 ms) in the window",
  ...late,
];
writeFileSync(`${prefix}.timeline.txt`, outLines.join("\n"));
console.log(outLines.join("\n"));
