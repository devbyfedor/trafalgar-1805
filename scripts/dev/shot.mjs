// Screenshots of /lab/chart for development (not part of the site or the tests).
//   node scripts/dev/shot.mjs <out-dir> "p=0" "p=0.62&light=campaign" "eye=-6.6,36.3,30&look=-6.3,36.55" ...
// Each query becomes one PNG. Needs a server: `npm run dev` (the default
// base, http://127.0.0.1:3000) or `npm run preview` with BASE=http://127.0.0.1:4173.
// Environment: W, H and S set the viewport and device scale (1280, 720, 1.5);
// WAIT the settle time in ms after the chart is ready (600).
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [outDir, ...queries] = process.argv.slice(2);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);

// The new headless mode renders on the GPU.
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    logs.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
for (const q of queries) {
  const started = Date.now();
  await page.goto(`${base}/lab/chart/?${q}`);
  try {
    await page.waitForFunction(() => window.__chart?.ready, null, {
      timeout: 90_000,
    });
  } catch {
    console.log(`${q}: not ready after 90 s`);
  }
  await page.waitForTimeout(Number(process.env.WAIT ?? 600));
  const stats = await page.evaluate(() =>
    window.__chart ? { ...window.__chart.stats } : null,
  );
  const name = q.replace(/[^a-z0-9.=-]+/gi, "_").replace(/=/g, "");
  const file = path.join(outDir, `${name}-${width}x${height}.png`);
  await page.screenshot({ path: file });
  console.log(`${q}: ${Date.now() - started} ms -> ${file}`);
  console.log(`  ${JSON.stringify(stats)}`);
}
if (logs.length) console.log(logs.join("\n"));
await browser.close();
