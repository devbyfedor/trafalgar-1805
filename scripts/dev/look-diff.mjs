// The chart's look held against reference frames, point by point
// (development only, not part of the site or the tests).
//   node scripts/dev/look-diff.mjs <reference-dir> [out-dir]
// For a change that must not show (a lighter shader, a coarser mesh): take
// the reference frames from the build before the change (REF=1), then run
// again on the build after it. Each point is shot again and compared with
// its reference frame: the mean absolute difference in levels (per pixel,
// the largest of the three channels'), the share of pixels differing by
// more than 8 and by more than 24 levels, and the largest difference. The
// worst points' amplified difference images (levels × AMP, white from 32
// levels at the default 8) and their new frames are written to out-dir
// (default: <reference-dir>-diff), beside a look-diff.json of every row.
// Take the reference twice (REF=1 into one folder, then compare) to learn
// the build's own shot-to-shot noise before judging a change by it.
//
// Only the chart is compared: scene 2's HTML (captions, date line, chapter
// marker, scrims, anything lettered over the canvas) and the whole of scene 1, whose
// painted layers and Victory lie over the chart through the handoff and
// move by themselves, are hidden for the shots, so a difference always
// means the canvas changed. The quality level is pinned to the top (0).
//
// Points: scene 2 on the home page at p = 0, 0.02 ... 1 and the lab's
// flight (/lab/chart) at p = 0, 0.04 ... 1, at the owner's size (1280×720 at
// scale 1.5). ALL=1 adds a sparser set (every 0.1) at 1920×1080, 2560×1440
// and 3440×1440 at scale 1: the mesh's level of detail follows the
// viewport, so a change to the mesh is checked there too.
// Needs a server: `npm run preview` with BASE=http://127.0.0.1:4173.
// Environment: BASE; REF=1 only takes the reference; ALL=1 as above;
// SIZES=1280x720@1.5,1920x1080@1 the sizes instead; PAGES=road,lab one page
// only; STEP=0.1 one step for every set; P=0.16,0.2 only those points;
// WAIT the settle time in ms after each scroll of the scene (1500: its
// scrub takes 0.6 s); TOP how many of the worst points get images (6);
// AMP the difference images' gain (8); TEXT=1 keeps scene 2's HTML in the
// shots (captions, date line, chapter marker, scrims, names over the
// canvas: everything but scene 1 and Boulogne's painting), to hold the
// whole frame, not only the chart, against a reference taken the same way.
// The scene is scrolled to p by the page's own map where it has one
// (road-scroll.mjs: Boulogne's interlude lengthened the pin), else by the
// old linear pin, so a build from before the interlude is its reference.
// Boulogne's painting is always hidden: near its p it is drawn faintly
// ahead of the dive (1/255), which is no part of the chart's look.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { scrollRoadTo } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const [refDir, outArg] = process.argv.slice(2);
if (!refDir) {
  console.log(
    "usage: node scripts/dev/look-diff.mjs <reference-dir> [out-dir]",
  );
  process.exit(1);
}
const outDir = outArg ?? `${refDir.replace(/[\\/]+$/, "")}-diff`;
const onlyRef = process.env.REF === "1";
const wait = Number(process.env.WAIT ?? 1500);
const top = Number(process.env.TOP ?? 6);
const amp = Number(process.env.AMP ?? 8);
const pages = (process.env.PAGES ?? "road,lab").split(",");
const only = process.env.P ? process.env.P.split(",").map(Number) : null;
const withText = process.env.TEXT === "1";

const OWNER = "1280x720@1.5";
const sizes = (
  process.env.SIZES ??
  (process.env.ALL === "1"
    ? `${OWNER},1920x1080@1,2560x1440@1,3440x1440@1`
    : OWNER)
)
  .split(",")
  .map((s) => {
    const [, w, h, scale] = /^(\d+)x(\d+)@([\d.]+)$/.exec(s.trim()) ?? [];
    if (!w) throw new Error(`size "${s}": expected e.g. 1280x720@1.5`);
    return {
      key: s.trim(),
      width: Number(w),
      height: Number(h),
      scale: Number(scale),
    };
  });

/** The points of a set: the dense ones at the owner's size, sparse elsewhere. */
function pointsOf(page, size) {
  if (only) return only;
  const step = process.env.STEP
    ? Number(process.env.STEP)
    : size.key !== OWNER
      ? 0.1
      : page === "road"
        ? 0.02
        : 0.04;
  return Array.from(
    { length: Math.round(1 / step) + 1 },
    (_, i) => Math.round(Math.min(1, i * step) * 1e4) / 1e4,
  );
}

// Everything but the canvas: scene 1 whole, scene 2's text layer and
// anything lettered over its canvas, and Boulogne's painting; with TEXT=1
// only scene 1 and the painting.
const HIDE = withText
  ? `
[data-scene-wrapper=dawn] { visibility: hidden !important; }
[data-scene=road] [data-layer=sea] { visibility: hidden !important; }
`
  : `
[data-scene-wrapper=dawn] { visibility: hidden !important; }
[data-scene=road] [data-layer=text] { visibility: hidden !important; }
[data-scene=road] [data-layer=chart] > :not(canvas) { visibility: hidden !important; }
[data-scene=road] [data-layer=sea] { visibility: hidden !important; }
`;

const nameOf = (page, size, p) =>
  `${page}-${size.width}x${size.height}s${size.scale}-p${p.toFixed(3)}.png`;

async function raw(input) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** One frame against its reference; `image` is the amplified difference. */
async function compare(shot, refFile) {
  const a = await raw(shot);
  const b = await raw(refFile);
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(
      `sizes differ: ${a.width}×${a.height} against ${b.width}×${b.height}`,
    );
  const n = a.width * a.height;
  const image = Buffer.alloc(n * 3);
  let sum = 0;
  let over8 = 0;
  let over24 = 0;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    const d = Math.max(
      Math.abs(a.data[o] - b.data[o]),
      Math.abs(a.data[o + 1] - b.data[o + 1]),
      Math.abs(a.data[o + 2] - b.data[o + 2]),
    );
    sum += d;
    if (d > 8) over8++;
    if (d > 24) over24++;
    if (d > max) max = d;
    const v = Math.min(255, d * amp);
    image[o] = v;
    image[o + 1] = v;
    image[o + 2] = v;
  }
  return {
    mean: sum / n,
    over8: (over8 / n) * 100,
    over24: (over24 / n) * 100,
    max,
    image,
    width: a.width,
    height: a.height,
  };
}

await mkdir(refDir, { recursive: true });
if (!onlyRef) await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const rows = [];
const kept = [];
const errors = [];

/** Shoots a point, then stores it as the reference or compares it. */
async function take(tab, pageName, size, p) {
  const name = nameOf(pageName, size, p);
  const refFile = path.join(refDir, name);
  const shot = await tab.screenshot();
  if (onlyRef) {
    await writeFile(refFile, shot);
    console.log(`${name}`);
    return;
  }
  const r = await compare(shot, refFile);
  const row = {
    page: pageName,
    size: size.key,
    p,
    mean: r.mean,
    over8: r.over8,
    over24: r.over24,
    max: r.max,
  };
  rows.push(row);
  console.log(
    `${pageName.padEnd(4)} ${size.key.padEnd(12)} p ${p.toFixed(3)} | mean ${r.mean.toFixed(4).padStart(8)} | >8: ${r.over8.toFixed(4).padStart(8)} % | >24: ${r.over24.toFixed(4).padStart(8)} % | max ${String(r.max).padStart(3)}`,
  );
  // The worst few kept in memory for their images.
  kept.push({
    row,
    name,
    shot,
    image: r.image,
    width: r.width,
    height: r.height,
  });
  kept.sort(
    (x, y) =>
      y.row.over8 - x.row.over8 ||
      y.row.mean - x.row.mean ||
      y.row.max - x.row.max,
  );
  kept.length = Math.min(kept.length, top);
}

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
  });
  const tab = await context.newPage();
  tab.on("pageerror", (e) => errors.push(e.message));
  tab.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (pages.includes("road")) {
    await tab.goto(`${base}/?quality=0`);
    await tab.waitForFunction(
      () => window.__road?.ready && window.__road.baked,
      null,
      { timeout: 240_000 },
    );
    await tab.addStyleTag({ content: HIDE });
    for (const p of pointsOf("road", size)) {
      // The page's own map from p to scroll where it has one (Boulogne's
      // interlude lengthened the pin), else the old linear pin.
      await scrollRoadTo(tab, p);
      await tab.waitForTimeout(wait);
      await take(tab, "road", size, p);
    }
  }
  if (pages.includes("lab")) {
    await tab.goto(`${base}/lab/chart/?quality=0`);
    await tab.waitForFunction(() => window.__chart?.ready, null, {
      timeout: 120_000,
    });
    for (const p of pointsOf("lab", size)) {
      // The bench jumps to p with the scrub settled at once; the lab's own
      // loop then draws there.
      await tab.evaluate((at) => window.__chart.bench(3, at), p);
      await tab.waitForTimeout(Math.min(wait, 400));
      await take(tab, "lab", size, p);
    }
  }
  await context.close();
}
await browser.close();

if (!onlyRef) {
  for (const k of kept) {
    if (k.row.max === 0) continue;
    const stem = path.join(outDir, k.name.replace(/\.png$/, ""));
    await writeFile(`${stem}.new.png`, k.shot);
    await sharp(k.image, {
      raw: { width: k.width, height: k.height, channels: 3 },
    })
      .png()
      .toFile(`${stem}.diff.png`);
  }
  await writeFile(
    path.join(outDir, "look-diff.json"),
    JSON.stringify(rows, null, 1),
  );
  const worst = (key) =>
    rows.reduce((a, r) => (r[key] > a[key] ? r : a), rows[0]);
  for (const key of ["mean", "over8", "over24", "max"]) {
    const r = worst(key);
    console.log(
      `worst ${key}: ${r[key].toFixed(key === "max" ? 0 : 4)} (${r.page} ${r.size} p ${r.p})`,
    );
  }
  const differing = rows.filter((r) => r.max > 0).length;
  console.log(
    `${rows.length} points, ${differing} differ at all, ${rows.filter((r) => r.over8 > 0).length} by more than 8 levels somewhere; images of the worst ${Math.min(top, differing)} in ${outDir}`,
  );
}
if (errors.length) console.log([...new Set(errors)].join("\n"));
