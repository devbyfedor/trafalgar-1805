// Which composited layers are repainted while scene 1 is scrolled, and what
// they hold (CDP LayerTree: layerPainted events, mapped to their DOM nodes).
//   node layers.mjs <out.json>
// Env: BASE, WAIT (ms before scrolling, default 8000 so the chart has loaded),
// STEP (device px per wheel, 150 = 100 CSS px), INTERVAL, DIST (device px).

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire("D:/dev/trafalgar-1805/package.json");
const { chromium } = require("@playwright/test");
const out = process.argv[2] ?? "layers.json";
const base = process.env.BASE ?? "http://127.0.0.1:3000";
const wait = Number(process.env.WAIT ?? 8000);
const step = Number(process.env.STEP ?? 150);
const interval = Number(process.env.INTERVAL ?? 150);
const dist = Number(process.env.DIST ?? 6480);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();

if (process.env.STYLE) {
  const { readFileSync: readCss } = await import("node:fs");
  const css = process.env.STYLE.split(",")
    .map((p) => readCss(p, "utf8"))
    .join(String.fromCharCode(10));
  await page.addInitScript((text) => {
    const add = () => {
      const s = document.createElement("style");
      s.dataset.perfFix = "1";
      s.textContent = text;
      document.head.append(s);
    };
    if (document.head) add();
    else document.addEventListener("DOMContentLoaded", add, { once: true });
  }, css);
}
const cdp = await context.newCDPSession(page);
await browser.startTracing(page, {
  path: out.replace(/.json$/, ".trace.json"),
  categories: [
    "disabled-by-default-devtools.timeline",
    "devtools.timeline",
    "blink.user_timing",
  ],
});
await page.goto(`${base}/`, { waitUntil: "load", timeout: 180_000 });
await page.waitForTimeout(wait);
await cdp.send("DOM.enable");
await cdp.send("DOM.getDocument", { depth: -1 });
await cdp.send("LayerTree.enable");
const layers = new Map();
const paints = new Map(); // layerId -> [{t, scrollY}]
let scrollY = 0;
cdp.on("LayerTree.layerTreeDidChange", (p) => {
  if (!p.layers) return;
  for (const l of p.layers) layers.set(l.layerId, l);
});
cdp.on("LayerTree.layerPainted", (p) => {
  const list = paints.get(p.layerId) ?? [];
  list.push([Date.now(), scrollY]);
  paints.set(p.layerId, list);
});
await page.mouse.move(640, 360);
const t0 = Date.now();
const bands = []; // per wheel step: scrollY
for (let y = 0; y < dist; y += step) {
  await page.mouse.wheel(0, step);
  await page.waitForTimeout(interval);
  scrollY = await page.evaluate(() => window.scrollY);
  bands.push([Date.now() - t0, scrollY]);
}
await page.waitForTimeout(1500);
await browser.stopTracing();
const raw = JSON.parse(
  (await import("node:fs")).readFileSync(
    out.replace(/.json$/, ".trace.json"),
    "utf8",
  ),
);
const rasterBy = new Map();
for (const e of raw.traceEvents ?? raw) {
  if (e.name !== "RasterTask" || e.ph !== "X") continue;
  const id = String(e.args?.tileData?.layerId);
  const v = rasterBy.get(id) ?? { n: 0, ms: 0 };
  v.n++;
  v.ms += e.dur / 1000;
  rasterBy.set(id, v);
}
for (const [id, v] of rasterBy)
  if (!paints.has(id))
    paints.set(
      id,
      Array.from({ length: v.n }, () => [0, -1]),
    );

// Describe every layer that was painted
const rows = [];
for (const [id, list] of paints) {
  const l = layers.get(id);
  let desc = "";
  if (l?.backendNodeId) {
    try {
      const { node } = await cdp.send("DOM.describeNode", {
        backendNodeId: l.backendNodeId,
        depth: 0,
      });
      const attrs = {};
      for (let i = 0; i + 1 < (node.attributes ?? []).length; i += 2)
        attrs[node.attributes[i]] = node.attributes[i + 1];
      desc = `<${node.nodeName.toLowerCase()}${attrs["data-el"] ? ` data-el=${attrs["data-el"]}` : ""}${attrs["data-strip"] ? ` strip=${attrs["data-strip"]}` : ""}${attrs["data-layer"] ? ` data-layer=${attrs["data-layer"]}` : ""}${attrs.id ? ` id=${attrs.id}` : ""}${attrs.class ? ` class="${attrs.class.slice(0, 50)}"` : ""}>`;
    } catch (e) {
      desc = `(node ${l.backendNodeId}: ${e.message.slice(0, 40)})`;
    }
  } else if (l) desc = `(no node; parent ${l.parentLayerId})`;
  // paints by scrollY band of 200 px
  const byBand = {};
  for (const [, sy] of list) {
    const b = Math.floor(sy / 200) * 200;
    byBand[b] = (byBand[b] ?? 0) + 1;
  }
  rows.push({
    id,
    n: list.length,
    rasterMs: Math.round((rasterBy.get(String(id))?.ms ?? 0) * 10) / 10,
    w: l?.width,
    h: l?.height,
    desc,
    byBand,
  });
}
rows.sort((a, b) => b.n - a.n);
writeFileSync(out, JSON.stringify({ rows, bands }, null, 1));
for (const r of rows.slice(0, 40))
  console.log(
    `${String(r.n).padStart(5)} rasters ${r.rasterMs}ms  layer ${r.id} ${r.w}x${r.h} ${r.desc}  by scrollY/200: ${JSON.stringify(r.byBand)}`,
  );
await browser.close();
