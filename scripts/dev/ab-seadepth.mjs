// Development only (session 12), not part of the site or the tests: run from the
// repository with the dev server up, e.g. node scripts/dev/ab-seadepth.mjs
// A/B of the terrain's sea-depth write on /lab/chart: at each p, alternate
// on and off (three rounds), 40 frames each, GPU median and p95.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = (process.argv[2] ?? "0.1,0.14,0.16,0.18,0.2,0.7,0.74,0.78,0.96,1")
  .split(",")
  .map(Number);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/lab/chart/?quality=0`);
await page.waitForFunction(() => window.__chart?.ready, null, {
  timeout: 120_000,
});
const q = (v, k) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(k * s.length))];
};
console.log("    p |  on median  p95 | off median  p95 | on/off");
for (const p of ps) {
  const on = [];
  const off = [];
  for (let round = 0; round < 3; round++) {
    for (const flag of round % 2 === 0 ? [true, false] : [false, true]) {
      await page.evaluate((f) => window.__chart.seaDepth(f), flag);
      // Compile and settle.
      await page.evaluate((p) => window.__chart.bench(8, p), p);
      const r = await page.evaluate((p) => window.__chart.bench(40, p), p);
      const gpu = (r.gpu ?? r.frames?.map((x) => x.gpu) ?? []).filter((x) =>
        Number.isFinite(x),
      );
      (flag ? on : off).push(...gpu.slice(5));
    }
  }
  const mOn = q(on, 0.5);
  const mOff = q(off, 0.5);
  console.log(
    `${p.toFixed(2).padStart(5)} | ${mOn.toFixed(2).padStart(9)} ${q(on, 0.95).toFixed(2).padStart(5)} | ${mOff.toFixed(2).padStart(10)} ${q(off, 0.95).toFixed(2).padStart(5)} | ${(mOn / mOff).toFixed(2)}`,
  );
}
await browser.close();
