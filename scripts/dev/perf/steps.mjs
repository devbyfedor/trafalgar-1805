// Per run: the chart-loading steps' costs as the in-page instrumentation saw them.
import { readdirSync, readFileSync } from "node:fs";

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync("runs")
      .filter(
        (f) =>
          f.endsWith(".json") &&
          !f.includes("trace") &&
          !f.startsWith("layers"),
      )
      .map((f) => `runs/${f}`);
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");
console.log(
  "run | ctx(ms) | sync shader-log waits: total/max (n) | getBufferSubData total | GPU: decode, horizon x2, SDF-canvas upload, atlas mip | ready",
);
for (const file of files) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  if (d.meta.nochart) continue;
  const ctx = d.contexts.find((c) => c.type === "webgl2");
  const logs = d.slow.filter((s) => /InfoLog/.test(s.fn));
  const gbs = d.slow.filter((s) => s.fn === "getBufferSubData");
  const gpu = (pred) => d.gpu.filter(pred).map((g) => g.gpuMs);
  const decode = gpu(
    (g) => g.label.startsWith("field.decode") && g.fn === "drawArrays",
  );
  const horizon = gpu(
    (g) => g.label.startsWith("field.horizon") && g.fn === "drawArrays",
  );
  const sdf = gpu(
    (g) => g.fn === "texSubImage2D" && /HTMLCanvasElement 2048x/.test(g.info),
  );
  const ready = d.events.find(
    (e) => e.kind === "road" && e.name === "ready",
  )?.t;
  console.log(
    `${file.replace("runs/", "").replace(".json", "").padEnd(24)} | ${f1(ctx?.ms).padStart(6)} | ${f1(logs.reduce((s, x) => s + x.ms, 0)).padStart(6)}/${f1(Math.max(0, ...logs.map((x) => x.ms))).padStart(5)} (${logs.length}) | ${f1(gbs.reduce((s, x) => s + x.ms, 0)).padStart(5)} | ${decode.map(f1).join(",")} ; ${horizon.map(f1).join(",")} ; ${sdf.map(f1).join(",")} | ${f1(ready)}`,
  );
}
