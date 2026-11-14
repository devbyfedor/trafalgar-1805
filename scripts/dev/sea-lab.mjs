// Shots of Boulogne's painting alone, from its lab page (/lab/sea/), for
// working on its look (development only): each argument is the page's
// query, e.g. "phase=hold&t=0.5&time=12".
//   node scripts/dev/sea-lab.mjs <out-dir> [query ...]
// Environment: BASE (http://127.0.0.1:3000), W, H, S (1280, 720, 1.5),
// WAIT ms after load (900), NAME the files' prefix (lab).
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [out, ...queries] = process.argv.slice(2);
if (!out) {
  console.log("usage: node scripts/dev/sea-lab.mjs <out-dir> [query ...]");
  process.exit(1);
}
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const wait = Number(process.env.WAIT ?? 900);
const name = process.env.NAME ?? "lab";
const list = queries.length ? queries : ["phase=hold&t=0.5&time=12"];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
const errors = [];
tab.on("pageerror", (e) => errors.push(e.message));
for (const query of list) {
  await tab.goto(`${base}/lab/sea/?${query}`);
  await tab.waitForSelector("[data-layer=sea]", { state: "attached" });
  await tab.waitForTimeout(wait);
  const label = query.replace(/[^a-z0-9.]+/gi, "-");
  const file = path.join(out, `${name}-${label}.png`);
  await tab.screenshot({ path: file });
  console.log(`${query} -> ${file}`);
}
await browser.close();
if (errors.length) console.log(`page errors:\n  ${errors.join("\n  ")}`);
