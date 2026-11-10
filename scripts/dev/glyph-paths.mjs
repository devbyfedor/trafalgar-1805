// Sorts the "turns of the paths themselves" that glyph-motion.mjs lists
// apart from its flags: at each step of scene 2's progress it splits every
// shown glyph's second difference of place on screen into her own motion
// on the chart (a squadron weighing, a turn at a waypoint, a change of
// pace) and the camera's (window.__road.pathParts), each over her height.
//   node scripts/dev/glyph-paths.mjs [from] [to] [step]
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, LIMIT (the
// least share of a height listed, 0.5), TOP (rows per list, 20).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.0005);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const LIMIT = Number(process.env.LIMIT ?? 0.5);
const TOP = Number(process.env.TOP ?? 20);

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1000);
const names = await page.evaluate(() => window.__road.glyphNames());
const ps = [];
for (let i = 0; ; i++) {
  const p = from + i * step;
  if (p > to + 1e-9) break;
  ps.push(Math.round(p * 1e6) / 1e6);
}
const rows = [];
const broken = [];
for (let i = 0; i < ps.length; i += 40) {
  const batch = ps.slice(i, i + 40);
  const frames = await page.evaluate(
    ([list, s]) => list.map((p) => window.__road.pathParts(p, s)),
    [batch, step],
  );
  frames.forEach((frame, k) => {
    frame.forEach((layer, li) => {
      for (let g = 0; g < layer.length / 5; g++) {
        const [own, cam, both, h, alpha] = layer.slice(g * 5, g * 5 + 5);
        // A place or size that isn't a number is a fault, shown or not.
        if (![own, cam, both, h, alpha].every(Number.isFinite)) {
          broken.push(`${names[li][g]} at p ${batch[k]}`);
          continue;
        }
        if (alpha <= 0.1 || h < 1) continue;
        rows.push({
          p: batch[k],
          name: names[li][g],
          own: own / h,
          cam: cam / h,
          both: both / h,
        });
      }
    });
  });
}
await browser.close();

console.log(
  `paths ${width}x${height}@${scale}: p ${from} to ${to}, step ${step}, ${rows.length} glyph-steps`,
);
console.log(
  `  not a number: ${broken.length} glyph-steps${broken.length ? ` (${broken.slice(0, 6).join(", ")}...)` : ""}`,
);
if (broken.length) process.exitCode = 1;
for (const key of ["own", "cam", "both"]) {
  const over = rows.filter((r) => r[key] > LIMIT);
  const byGlyph = new Map();
  for (const r of over) {
    const e = byGlyph.get(r.name) ?? { n: 0, worst: r };
    e.n++;
    if (r[key] > e.worst[key]) e.worst = r;
    byGlyph.set(r.name, e);
  }
  console.log(
    `  ${key}: ${over.length} glyph-steps over ${LIMIT} of a height, ${byGlyph.size} glyphs`,
  );
  for (const [name, e] of [...byGlyph.entries()]
    .sort((a, b) => b[1].worst[key] - a[1].worst[key])
    .slice(0, TOP))
    console.log(
      `    ${name}: ${e.n} steps, worst ${e.worst[key].toFixed(2)} at p ${e.worst.p} (own ${e.worst.own.toFixed(2)}, camera ${e.worst.cam.toFixed(2)})`,
    );
}
// Runs of steps where a glyph's own motion is over the limit, by place in p.
const own = rows.filter((r) => r.own > LIMIT).sort((a, b) => a.p - b.p);
const runs = [];
for (const r of own) {
  const last = runs[runs.length - 1];
  if (last && r.p - last.to <= step * 4 + 1e-9) {
    last.to = r.p;
    last.names.add(r.name.split(":")[0]);
    if (r.own > last.worst.own) last.worst = r;
  } else
    runs.push({
      from: r.p,
      to: r.p,
      names: new Set([r.name.split(":")[0]]),
      worst: r,
    });
}
console.log(`  own motion over ${LIMIT}, by stretch of p: ${runs.length}`);
for (const r of runs)
  console.log(
    `    p ${r.from}-${r.to}: ${[...r.names].join(", ")}; worst ${r.worst.own.toFixed(2)} (${r.worst.name} at ${r.worst.p})`,
  );
