// Boulogne's dusk through the hold, checked for steps (development only):
// the painting alone on its lab page (/lab/sea/), the idle motion frozen
// (&time=12), shot at the hold's progress t = 0, STEP ... 1; for each frame
// the mean colour of the whole frame and of a few regions (the sky, the
// land, the water, the town's lights). A step shows as a jump in a
// region's mean between neighbouring frames far larger than its
// neighbours' (the second difference); the drift moves the frame too, so
// the jumps are judged against the run's own median change.
//   node scripts/dev/sea-dusk-steps.mjs <out-dir>
// Environment: BASE (http://127.0.0.1:4173, a production preview checked
// with served.mjs), W, H, S (1280, 720, 1.5), STEP (0.02), WAIT ms after
// load (1200), KEEP=1 keeps every frame (else only every fifth).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const [out] = process.argv.slice(2);
if (!out) {
  console.log("usage: node scripts/dev/sea-dusk-steps.mjs <out-dir>");
  process.exit(1);
}
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const step = Number(process.env.STEP ?? 0.02);
const wait = Number(process.env.WAIT ?? 1200);
const keep = process.env.KEEP === "1";

/** Regions, as shares of the frame: x0, y0, x1, y1. */
const REGIONS = {
  frame: [0, 0, 1, 1],
  sky: [0.3, 0.05, 0.75, 0.4],
  land: [0, 0.44, 0.35, 0.58],
  town: [0.36, 0.5, 0.6, 0.6],
  water: [0, 0.72, 0.5, 0.98],
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
const rows = [];
const n = Math.round(1 / step);
for (let i = 0; i <= n; i++) {
  const t = Math.round(i * step * 1e4) / 1e4;
  await tab.goto(`${base}/lab/sea/?phase=hold&t=${t}&time=12`);
  await tab.waitForFunction(
    () =>
      getComputedStyle(document.querySelector("[data-layer=sea]"))
        .visibility === "visible",
    null,
    { timeout: 60000 },
  );
  await tab.waitForTimeout(wait);
  const png = await tab.screenshot();
  if (keep || i % 5 === 0)
    await writeFile(path.join(out, `hold-${t.toFixed(3)}.png`), png);
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const row = { t };
  for (const [name, [x0, y0, x1, y1]] of Object.entries(REGIONS)) {
    let r = 0;
    let g = 0;
    let b = 0;
    let k = 0;
    const X0 = Math.floor(x0 * info.width);
    const X1 = Math.floor(x1 * info.width);
    const Y0 = Math.floor(y0 * info.height);
    const Y1 = Math.floor(y1 * info.height);
    for (let y = Y0; y < Y1; y += 2)
      for (let x = X0; x < X1; x += 2) {
        const o = (y * info.width + x) * 3;
        r += data[o];
        g += data[o + 1];
        b += data[o + 2];
        k++;
      }
    row[name] = [r / k, g / k, b / k];
  }
  rows.push(row);
  console.log(
    `t ${t.toFixed(3)}  ${Object.keys(REGIONS)
      .map((k) => `${k} ${row[k].map((v) => v.toFixed(1)).join(",")}`)
      .join("  ")}`,
  );
}
await browser.close();

// The change between neighbours, per region (the largest channel's), and
// its jumps against the run's median change.
const report = {};
for (const name of Object.keys(REGIONS)) {
  const d = [];
  for (let i = 1; i < rows.length; i++)
    d.push(
      Math.max(
        ...[0, 1, 2].map((c) =>
          Math.abs(rows[i][name][c] - rows[i - 1][name][c]),
        ),
      ),
    );
  const sorted = [...d].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const worst = Math.max(...d);
  const at = rows[d.indexOf(worst) + 1].t;
  report[name] = {
    medianStep: median,
    worstStep: worst,
    worstAt: at,
    ratio: worst / Math.max(0.05, median),
  };
}
console.log(JSON.stringify(report, null, 2));
await writeFile(
  path.join(out, "dusk-steps.json"),
  JSON.stringify({ base, step, rows, report }, null, 2),
);
