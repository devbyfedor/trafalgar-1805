// Proves that no ship glyph touches land or another glyph. Sweeps scene 2
// (or the chart lab's flight) in small steps of its progress, at one or
// more viewport sizes, and at each step counts every pixel where a glyph's
// ink lies on land or coastline as drawn (raised land in front of the sea
// included, through the haze), or on another glyph's ink, and each wake's
// ink on land (window.__road.clash / window.__chart.clash; the method is in
// src/components/chart/glyphs/clash.ts). The goal is zero in every frame.
//   node scripts/dev/glyph-clash.mjs [road|lab] [from] [to] [step]
// Environment: BASE (default http://127.0.0.1:3000; the production preview
// is http://127.0.0.1:4173), SIZES (default
// "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"), INK (the least
// drawn alpha counted as ink, 0.1), JSON=<file> to write every frame's
// result. Exits with 1 if any frame clashes.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const page_ = process.argv[2] ?? "road";
const from = Number(process.argv[3] ?? 0);
const to = Number(process.argv[4] ?? 1);
const step = Number(process.argv[5] ?? 0.0005);
const ink = Number(process.env.INK ?? 0.1);
const sizes = (
  process.env.SIZES ?? "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"
)
  .split(",")
  .map((s) => {
    const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(s.trim());
    if (!m) throw new Error(`bad size ${s}`);
    return { width: +m[1], height: +m[2], scale: Number(m[3] ?? 1) };
  });
if (page_ !== "road" && page_ !== "lab")
  throw new Error("first argument: road or lab");

const ps = [];
for (let i = 0; ; i++) {
  const p = from + i * step;
  if (p > to + 1e-9) break;
  ps.push(Math.round(Math.min(1, p) * 1e6) / 1e6);
}

/** Runs of consecutive steps, as [first p, last p]. */
function runs(list) {
  const out = [];
  for (const p of list) {
    const last = out[out.length - 1];
    if (last && p - last[1] <= step * 1.5 + 1e-9) last[1] = p;
    else out.push([p, p]);
  }
  return out;
}

const browser = await chromium.launch({ channel: "chromium" });
const report = [];
let failed = false;
for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // The top quality, pinned: a step of the ladder would rescale the frame.
  if (page_ === "road") {
    // EASE=<file>: a trial table of the dawn fleets' shifts (fleets.ts,
    // DAWN_EASE's form; scripts/dev/fleet-ease.mjs), "{}" for the sources' places.
    if (process.env.EASE) {
      const { readFileSync } = await import("node:fs");
      const ease =
        process.env.EASE === "{}"
          ? "{}"
          : readFileSync(process.env.EASE, "utf8");
      await page.addInitScript((json) => {
        try {
          window.localStorage.setItem("road.dawnEase", json);
        } catch {}
      }, ease);
    }
    await page.goto(`${base}/?quality=0`);
    await page.waitForFunction(
      () => window.__road?.ready && window.__road.baked,
      null,
      {
        timeout: 180_000,
      },
    );
    // Into scene 2, so its canvas is on screen and sized.
    await page.evaluate(() => {
      const y = 3.3 * window.innerHeight;
      if (window.__lenis)
        window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    });
  } else {
    await page.goto(`${base}/lab/chart?quality=0`);
    await page.waitForFunction(() => window.__chart?.ready, null, {
      timeout: 180_000,
    });
  }
  await page.waitForTimeout(1500);
  const names = await page.evaluate((road) => {
    const api = road ? window.__road : window.__chart;
    return api.glyphNames();
  }, page_ === "road");

  const frames = [];
  const BATCH = 20;
  const started = Date.now();
  for (let i = 0; i < ps.length; i += BATCH) {
    const batch = ps.slice(i, i + BATCH);
    const out = await page.evaluate(
      ({ list, ink, road }) => {
        const api = road ? window.__road : window.__chart;
        return list.map((p) => {
          const r = api.clash(p, ink);
          return {
            p,
            land: r.land,
            overlap: r.overlap,
            wakeLand: r.wakeLand,
            ink: r.ink,
            onLand: r.onLand,
            pairs: r.pairs,
          };
        });
      },
      { list: batch, ink, road: page_ === "road" },
    );
    frames.push(...out);
  }
  await page.close();

  const label = `${size.width}x${size.height}@${size.scale}`;
  const name = (layer, mark) => names[layer]?.[mark] ?? `${layer}:${mark}`;
  const landFrames = frames.filter((f) => f.land > 0);
  const overlapFrames = frames.filter((f) => f.overlap > 0);
  const wakeFrames = frames.filter((f) => f.wakeLand > 0);
  const byGlyph = new Map();
  const byPair = new Map();
  for (const f of frames) {
    for (const [layer, mark, px] of f.onLand) {
      const k = name(layer, mark);
      const e = byGlyph.get(k) ?? { frames: 0, px: 0, worst: 0, at: f.p };
      e.frames++;
      e.px += px;
      if (px > e.worst) {
        e.worst = px;
        e.at = f.p;
      }
      byGlyph.set(k, e);
    }
    for (const [la, ma, lb, mb, px] of f.pairs) {
      const k = `${name(la, ma)} / ${name(lb, mb)}`;
      const e = byPair.get(k) ?? { frames: 0, px: 0, worst: 0, at: f.p };
      e.frames++;
      e.px += px;
      if (px > e.worst) {
        e.worst = px;
        e.at = f.p;
      }
      byPair.set(k, e);
    }
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `\n${page_} ${label}: ${frames.length} frames (p ${from} to ${to}, step ${step}) in ${seconds} s`,
  );
  console.log(
    `  ink on land: ${landFrames.length} frames, ${landFrames.reduce((s, f) => s + f.land, 0)} px`,
  );
  console.log(
    `  glyph on glyph: ${overlapFrames.length} frames, ${overlapFrames.reduce((s, f) => s + f.overlap, 0)} px`,
  );
  console.log(
    `  wake on land: ${wakeFrames.length} frames, ${wakeFrames.reduce((s, f) => s + f.wakeLand, 0)} px`,
  );
  const fmt = (list) =>
    runs(list.map((f) => f.p))
      .map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`))
      .join(", ");
  if (landFrames.length) console.log(`  land at p: ${fmt(landFrames)}`);
  if (overlapFrames.length)
    console.log(`  overlap at p: ${fmt(overlapFrames)}`);
  if (wakeFrames.length) console.log(`  wakes at p: ${fmt(wakeFrames)}`);
  const top = (map) =>
    [...map.entries()].sort((a, b) => b[1].px - a[1].px).slice(0, 15);
  for (const [k, e] of top(byGlyph))
    console.log(
      `    land  ${k}: ${e.frames} frames, ${e.px} px, worst ${e.worst} px at p ${e.at}`,
    );
  for (const [k, e] of top(byPair))
    console.log(
      `    pair  ${k}: ${e.frames} frames, ${e.px} px, worst ${e.worst} px at p ${e.at}`,
    );
  if (errors.length) console.log(`  page errors: ${errors.join(" | ")}`);
  if (landFrames.length || overlapFrames.length || wakeFrames.length)
    failed = true;
  report.push({ page: page_, size: label, names, frames });
}
await browser.close();
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(report));
process.exit(failed ? 1 : 0);
