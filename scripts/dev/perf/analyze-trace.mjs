// Summarises a Chrome trace recorded by run.mjs (TRACE=1), aligned with the
// run's in-page records (<prefix>.json) through the perf:* user timing marks.
//   node --max-old-space-size=8192 analyze-trace.mjs <prefix>
// Writes <prefix>.trace-summary.txt and prints it.
import { readFileSync, writeFileSync } from "node:fs";

const prefix = process.argv[2];
const page = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
const raw = JSON.parse(readFileSync(`${prefix}.trace.json`, "utf8"));
const ev = Array.isArray(raw) ? raw : raw.traceEvents;
const lines = [];
const out = (s = "") => lines.push(s);
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");

// --- threads -------------------------------------------------------------------
const threads = new Map();
const procs = new Map();
for (const e of ev) {
  if (e.ph === "M" && e.name === "thread_name")
    threads.set(`${e.pid}:${e.tid}`, e.args.name);
  if (e.ph === "M" && e.name === "process_name") procs.set(e.pid, e.args.name);
}
const thName = (e) => threads.get(`${e.pid}:${e.tid}`) ?? "";
// The page's renderer: the one whose main thread ran our perf marks.
const firstMark = ev.find(
  (e) => typeof e.name === "string" && e.name.startsWith("perf:"),
);
const rendererPid = firstMark?.pid;
const mainTid = [...threads].find(
  ([k, v]) => v === "CrRendererMain" && Number(k.split(":")[0]) === rendererPid,
)?.[0];
const gpuMainKey = [...threads].find(([, v]) => v === "CrGpuMain")?.[0];
const vizKey = [...threads].find(([, v]) => v === "VizCompositorThread")?.[0];
const compKey = [...threads].find(
  ([k, v]) => v === "Compositor" && Number(k.split(":")[0]) === rendererPid,
)?.[0];
const key = (e) => `${e.pid}:${e.tid}`;

// --- clock alignment: page ms = trace µs / 1000 - offset -----------------------------
const marks = ev.filter(
  (e) =>
    typeof e.name === "string" &&
    e.name.startsWith("perf:") &&
    e.pid === rendererPid,
);
const offsets = [];
for (const m of marks) {
  const [, kind, ...rest] = m.name.split(":");
  const name = rest.join(":");
  const pe = page.events.find(
    (x) => x.kind === kind && String(x.name).slice(0, 80) === name && !x._used,
  );
  if (pe) {
    pe._used = true;
    offsets.push(m.ts / 1000 - pe.t);
  }
}
offsets.sort((a, b) => a - b);
const offset = offsets.length ? offsets[Math.floor(offsets.length / 2)] : 0;
const pt = (ts) => ts / 1000 - offset; // trace µs -> page ms
out(`# ${prefix}`);
out(
  `renderer pid ${rendererPid}, main ${mainTid}, compositor ${compKey}, gpu main ${gpuMainKey}, viz ${vizKey}`,
);
out(
  `clock offset from ${offsets.length} marks: ${f1(offset)} ms (spread ${f1((offsets.at(-1) ?? 0) - (offsets[0] ?? 0))} ms)`,
);
const wheels = page.wheels;
const scrollStart = wheels.length ? wheels[0][2] : Number.POSITIVE_INFINITY;
const scrollEnd = wheels.length ? wheels.at(-1)[2] : Number.POSITIVE_INFINITY;
const readyT =
  page.events.find((e) => e.kind === "road" && e.name === "ready")?.t ??
  Number.NaN;
const idleT = page.events.find((e) => e.kind === "idle-fired")?.t ?? Number.NaN;
out(
  `page: load ${f1(page.nav?.load)}, first idle callback ${f1(idleT)}, chart ready ${f1(readyT)}, wheel ${f1(scrollStart)}..${f1(scrollEnd)}`,
);

// --- CPU profile samples (renderer main thread) ----------------------------------------
const nodes = new Map(); // id -> {callFrame, parent}
const samples = []; // [ts µs, nodeId]
{
  const profiles = new Map();
  for (const e of ev) {
    if (e.pid !== rendererPid) continue;
    if (e.name === "Profile")
      profiles.set(e.id, {
        tid: e.tid,
        start: e.args.data.startTime,
        last: e.args.data.startTime,
      });
  }
  for (const e of ev) {
    if (e.name !== "ProfileChunk" || e.pid !== rendererPid) continue;
    const p = profiles.get(e.id);
    if (!p || `${e.pid}:${p.tid}` !== mainTid) continue;
    const cp = e.args.data.cpuProfile ?? {};
    for (const n of cp.nodes ?? [])
      nodes.set(n.id, { cf: n.callFrame, parent: n.parent });
    const deltas = e.args.data.timeDeltas ?? [];
    const ss = cp.samples ?? [];
    for (let i = 0; i < ss.length; i++) {
      p.last += deltas[i] ?? 0;
      samples.push([p.last, ss[i]]);
    }
  }
  samples.sort((a, b) => a[0] - b[0]);
}
const shortUrl = (u) =>
  u
    ? u
        .replace(/^https?:\/\/[^/]+/, "")
        .replace(/\/_next\/static\/chunks\//, "")
        .slice(0, 60)
    : "";
const frameName = (cf) =>
  `${cf.functionName || "(anon)"} ${shortUrl(cf.url)}:${cf.lineNumber}`;
const PROJECT = /src_|\[project\]|stage|chart|road|scenes|components/;
function profileOf(t0, t1, top = 6) {
  // samples in [t0, t1] (µs): self time by leaf, and by first project frame
  let lo = 0;
  let hi = samples.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid][0] < t0) lo = mid + 1;
    else hi = mid;
  }
  const self = new Map();
  const ours = new Map();
  let n = 0;
  for (let i = lo; i < samples.length && samples[i][0] <= t1; i++) {
    n++;
    const leaf = nodes.get(samples[i][1]);
    if (!leaf) continue;
    const lname = frameName(leaf.cf);
    self.set(lname, (self.get(lname) ?? 0) + 1);
    // walk up to find the deepest frame from project code and its chain
    let cur = leaf;
    let found = null;
    const chain = [];
    while (cur) {
      if (cur.cf.url && PROJECT.test(cur.cf.url) && !found) found = cur;
      if (cur.cf.functionName && chain.length < 40)
        chain.push(cur.cf.functionName);
      cur = cur.parent ? nodes.get(cur.parent) : null;
    }
    const oname = found ? frameName(found.cf) : `(no project frame) ${lname}`;
    ours.set(oname, (ours.get(oname) ?? 0) + 1);
  }
  const fmt = (m) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([k, v]) => `${v}×${k}`)
      .join("; ");
  return { n, self: fmt(self), ours: fmt(ours) };
}

// --- main thread tasks ------------------------------------------------------------------------
const mainEv = ev
  .filter((e) => key(e) === mainTid && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
const tasks = mainEv.filter(
  (e) => e.name === "RunTask" && e.cat.includes("devtools.timeline"),
);
const INTEREST = new Set([
  "FunctionCall",
  "EvaluateScript",
  "v8.compile",
  "v8.compileModule",
  "TimerFire",
  "FireAnimationFrame",
  "FireIdleCallback",
  "EventDispatch",
  "ParseHTML",
  "UpdateLayoutTree",
  "Layout",
  "Paint",
  "PrePaint",
  "Layerize",
  "Commit",
  "MinorGC",
  "MajorGC",
  "V8.GC_SCAVENGER",
  "V8.GC_MARK_COMPACTOR",
  "V8.GCFinalizeMC",
  "V8.GCIncrementalMarking",
  "V8.GC_MC_INCREMENTAL",
  "V8.GC_MC_INCREMENTAL_FINALIZE",
  "RunMicrotasks",
  "v8.run",
  "ResourceReceivedData",
  "XHRReadyStateChange",
  "Decode Image",
  "ImageDecodeTask",
  "CommandBufferProxyImpl::WaitForGetOffsetInRange",
  "CommandBufferProxyImpl::WaitForTokenInRange",
  "CommandBufferHelper::WaitForGetOffsetInRange",
  "CommandBufferHelper::WaitForToken",
  "CommandBufferProxyImpl::Initialize",
  "GpuChannelHost::Send",
  "SyncChannel::Send",
  "Receive mojo reply",
  "WebGLRenderingContext::Create",
  "RasterImplementation::RasterCHROMIUM",
  "HTMLCanvasElement::GetContext",
]);
function childrenSummary(task) {
  const t0 = task.ts;
  const t1 = task.ts + task.dur;
  const agg = new Map();
  const notes = [];
  for (const e of mainEv) {
    if (e.ts < t0) continue;
    if (e.ts > t1) break;
    if (e === task) continue;
    const n = e.name;
    const isGc = /GC|Scavenge|MarkCompact/i.test(n);
    if (
      !INTEREST.has(n) &&
      !isGc &&
      !/Wait|Sync|mojo reply|GetContext|Initialize/i.test(n)
    )
      continue;
    let label = n;
    const d = e.args?.data;
    if (n === "FunctionCall" && d)
      label = `FunctionCall ${d.functionName || "(anon)"} ${shortUrl(d.url)}`;
    else if (n === "EvaluateScript" && d)
      label = `EvaluateScript ${shortUrl(d.url)}`;
    else if (n === "EventDispatch" && d) label = `EventDispatch ${d.type}`;
    else if (n === "TimerFire") label = "TimerFire";
    const v = agg.get(label) ?? { n: 0, dur: 0 };
    v.n++;
    v.dur += e.dur ?? 0;
    agg.set(label, v);
    if (
      (e.dur ?? 0) > 3000 &&
      /Wait|Sync|mojo reply|GetContext|Initialize|GC/i.test(n)
    )
      notes.push(`${n} ${f1(e.dur / 1000)}ms@${f1(pt(e.ts))}`);
  }
  return {
    top: [...agg]
      .sort((a, b) => b[1].dur - a[1].dur)
      .slice(0, 7)
      .map(([k, v]) => `${k} ${f1(v.dur / 1000)}ms${v.n > 1 ? `×${v.n}` : ""}`)
      .join(" | "),
    notes: notes.slice(0, 6).join(", "),
  };
}
const phase = (t) =>
  t < (page.nav?.load ?? 0)
    ? "loading"
    : t < scrollStart
      ? "pre-scroll"
      : t <= scrollEnd + 1000
        ? "scrolling"
        : "after";
out(
  "\n## Renderer main-thread tasks > 16 ms (page ms; phase; attribution by trace children and CPU samples)",
);
const long16 = tasks.filter((t) => t.dur > 16000);
for (const t of long16) {
  const s = pt(t.ts);
  const c = childrenSummary(t);
  const prof = profileOf(t.ts, t.ts + t.dur, 5);
  out(
    `\n${f1(s).padStart(8)} ms  dur ${f1(t.dur / 1000).padStart(6)} ms  [${phase(s)}]  ${t.dur > 50000 ? "**>50ms**" : ""}`,
  );
  if (c.top) out(`    children: ${c.top}`);
  if (c.notes) out(`    waits/gc: ${c.notes}`);
  if (prof.n) {
    out(`    samples ${prof.n}: project frames: ${prof.ours}`);
    out(`    self: ${prof.self}`);
  }
}
const byPhase = (list, ms) => {
  const r = {};
  for (const t of list)
    if (t.dur > ms * 1000) r[phase(pt(t.ts))] = (r[phase(pt(t.ts))] ?? 0) + 1;
  return JSON.stringify(r);
};
out(
  `\ncounts: tasks > 16 ms by phase ${byPhase(tasks, 16)}; > 50 ms ${byPhase(tasks, 50)}`,
);

// --- GC -------------------------------------------------------------------------------------------
out("\n## GC on the renderer main thread");
const gcs = mainEv.filter((e) =>
  /^(MinorGC|MajorGC|V8\.GC_SCAVENGER|V8\.GC_MARK_COMPACTOR|V8\.GC_MC_INCREMENTAL_FINALIZE|V8\.GCIncrementalMarking|V8\.GC_MC_INCREMENTAL|V8\.GCFinalizeMC|V8\.GCScavenger|V8\.GC_MINOR_MARK_SWEEPER|MinorMS)$/.test(
    e.name,
  ),
);
const gcAgg = new Map();
for (const g of gcs) {
  const v = gcAgg.get(g.name) ?? { n: 0, dur: 0, max: 0 };
  v.n++;
  v.dur += g.dur;
  v.max = Math.max(v.max, g.dur);
  gcAgg.set(g.name, v);
}
for (const [n, v] of gcAgg)
  out(
    `${n}: n ${v.n}, total ${f1(v.dur / 1000)} ms, max ${f1(v.max / 1000)} ms`,
  );
out(
  `GC pauses >= 2 ms: ${gcs
    .filter(
      (g) =>
        g.dur >= 2000 &&
        /^(MinorGC|MajorGC|V8\.GC_SCAVENGER|V8\.GC_MARK_COMPACTOR|V8\.GC_MINOR_MARK_SWEEPER)$/.test(
          g.name,
        ),
    )
    .map((g) => `${g.name}@${f1(pt(g.ts))}:${f1(g.dur / 1000)}`)
    .join("  ")}`,
);
const heapCounters = ev.filter(
  (e) => e.name === "UpdateCounters" && key(e) === mainTid,
);
if (heapCounters.length) {
  const used = heapCounters.map((e) => [
    pt(e.ts),
    e.args.data.jsHeapSizeUsed / 1e6,
  ]);
  const pick = used.filter((_, i) => i % Math.ceil(used.length / 25) === 0);
  out(
    `JS heap used (MB) over time: ${pick.map(([t, m]) => `${f1(t / 1000)}s:${f1(m)}`).join(" ")}`,
  );
}

// --- frames: PipelineReporter on the renderer compositor --------------------------------------
out("\n## Frames (PipelineReporter, the page's compositor)");
const reporters = ev.filter(
  (e) => e.name === "PipelineReporter" && e.ph === "b" && e.pid === rendererPid,
);
const states = new Map();
const dropped = [];
for (const r of reporters) {
  const st = r.args?.chrome_frame_reporter?.state ?? r.args?.state ?? "?";
  states.set(st, (states.get(st) ?? 0) + 1);
  if (/DROPPED|PARTIAL/.test(st))
    dropped.push([pt(r.ts), st, r.args?.chrome_frame_reporter?.reason ?? ""]);
}
out(`states: ${JSON.stringify(Object.fromEntries(states))}`);
const dropByPhase = {};
for (const [t, st] of dropped) {
  const k = `${phase(t)}:${st.replace("STATE_", "")}`;
  dropByPhase[k] = (dropByPhase[k] ?? 0) + 1;
}
out(`dropped/partial by phase: ${JSON.stringify(dropByPhase)}`);
out(
  `first 60 dropped/partial: ${dropped
    .slice(0, 60)
    .map(([t, st]) => `${f1(t)}${st.includes("DROP") ? "D" : "P"}`)
    .join(" ")}`,
);

// --- GPU process main thread ---------------------------------------------------------------------
out("\n## GPU process main thread (CrGpuMain): busy time per 250 ms by kind");
const gpuEv = ev
  .filter((e) => key(e) === gpuMainKey && e.ph === "X")
  .sort((a, b) => a.ts - b.ts);
const gpuTasks = gpuEv.filter(
  (e) => e.name === "ThreadControllerImpl::RunTask",
);
const KINDS = [
  "RendererRasterWorker",
  "WebGL",
  "RendererMainThread",
  "SkiaOutputSurfaceImplOnGpu::SwapBuffers",
  "SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass",
  "BrowserRasterWorker",
  "SkiaOutputSurfaceImplOnGpu::FinishPaintCurrentFrame",
];
const kindEv = gpuEv.filter((e) => KINDS.includes(e.name));
const W = 250;
const t0 = Math.min(...gpuTasks.map((e) => pt(e.ts)).filter((t) => t > -1000));
const tEnd = Math.max(...gpuTasks.map((e) => pt(e.ts + e.dur)));
const rows = [];
for (let w = Math.floor(Math.max(0, t0) / W) * W; w < tEnd; w += W) {
  const r = { w, busy: 0 };
  for (const k of KINDS) r[k] = 0;
  rows.push(r);
}
const rowAt = (t) => rows[Math.floor((t - rows[0].w) / W)];
for (const e of gpuTasks) {
  const r = rowAt(pt(e.ts));
  if (r) r.busy += e.dur / 1000;
}
for (const e of kindEv) {
  const r = rowAt(pt(e.ts));
  if (r) r[e.name] += e.dur / 1000;
}
// renderer raster tasks per window
const rasterTasks = ev.filter(
  (e) => e.name === "RasterTask" && e.pid === rendererPid && e.ph === "X",
);
const rrow = new Map();
for (const e of rasterTasks) {
  const w = Math.floor(pt(e.ts) / W) * W;
  const v = rrow.get(w) ?? { n: 0, dur: 0 };
  v.n++;
  v.dur += e.dur / 1000;
  rrow.set(w, v);
}
// frames per window from rAF
const fr = page.frames;
out(
  "t(s)   gpuBusy%  raster(tile)  webgl  canvas2d  swap  finishRP | tileRasterTasks | rAF frames (worst ms) | scrollY",
);
for (const r of rows) {
  const fIn = [];
  for (let i = 1; i < fr.length; i++)
    if (fr[i] >= r.w && fr[i] < r.w + W) fIn.push(fr[i] - fr[i - 1]);
  const worst = fIn.reduce((m, x) => Math.max(m, x), 0);
  const idx = fr.findIndex((x) => x >= r.w);
  const sy = idx >= 0 ? page.scroll[idx] : Number.NaN;
  const rt = rrow.get(r.w) ?? { n: 0, dur: 0 };
  out(
    `${(r.w / 1000).toFixed(2).padStart(5)}  ${f1((r.busy / W) * 100).padStart(6)}  ${f1(r.RendererRasterWorker).padStart(10)}  ${f1(r.WebGL).padStart(5)}  ${f1(r.RendererMainThread).padStart(7)}  ${f1(r["SkiaOutputSurfaceImplOnGpu::SwapBuffers"]).padStart(5)}  ${f1(r["SkiaOutputSurfaceImplOnGpu::FinishPaintRenderPass"]).padStart(6)} | ${String(rt.n).padStart(4)} ${f1(rt.dur).padStart(6)}ms | ${String(fIn.length).padStart(2)} (${Math.round(worst)}) | ${Math.round(sy)}`,
  );
}
out("\nGPU main-thread tasks > 12 ms (page ms): kind breakdown");
for (const e of gpuTasks.filter((x) => x.dur > 12000)) {
  const inside = gpuEv.filter(
    (c) => c.ts >= e.ts && c.ts <= e.ts + e.dur && c !== e && c.dur > 1000,
  );
  const agg = new Map();
  for (const c of inside)
    agg.set(c.name, Math.max(agg.get(c.name) ?? 0, c.dur));
  out(
    `${f1(pt(e.ts)).padStart(8)} dur ${f1(e.dur / 1000).padStart(5)}  [${phase(pt(e.ts))}]  ${[
      ...agg,
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([n, d]) => `${n} ${f1(d / 1000)}`)
      .join(" | ")}`,
  );
}

const text = lines.join("\n");
writeFileSync(`${prefix}.trace-summary.txt`, text);
console.log(text);
