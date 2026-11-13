// Boulogne's interlude shot point by point (development): the dive, the
// hold and the rise of "Boulogne from the sea" (docs/scene-02-boulogne-
// brief.md), addressed by the interlude's own parts through the page's
// hook (window.__road.scrollForInterlude), so a point is the same frame
// whatever the pin's length.
//   node scripts/dev/sea-shots.mjs <out-dir> [phase:t ...]
// e.g. dive:0 dive:0.5 hold:0.5 rise:1; a bare number is the story's p
// (window.__road.scrollFor). Default: a set over the whole interlude.
// Environment: BASE (http://127.0.0.1:3000, the dev server; the preview
// is 4173), W, H, S (1280, 720, 1.5), WAIT the settle time after each
// scroll in ms (1600: the scrub takes 0.6 s), HIDE a comma list of
// layers to hide for the shots (sea: the painting, chart: the chart's
// canvas, text: the captions and scrims), Q the quality level (0; "auto"
// for the ladder), PREFIX the files' prefix.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [out, ...args] = process.argv.slice(2);
if (!out) {
  console.log("usage: node scripts/dev/sea-shots.mjs <out-dir> [phase:t ...]");
  process.exit(1);
}
const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const S = Number(process.env.S ?? 1.5);
const wait = Number(process.env.WAIT ?? 1600);
const hide = (process.env.HIDE ?? "").split(",").filter(Boolean);
const quality = process.env.Q ?? "0";
const prefix = process.env.PREFIX ?? "sea";

const DEFAULT = [
  "dive:0",
  "dive:0.15",
  "dive:0.3",
  "dive:0.45",
  "dive:0.55",
  "dive:0.65",
  "dive:0.72",
  "dive:0.8",
  "dive:0.9",
  "dive:1",
  "hold:0.5",
  "hold:1",
  "rise:0.2",
  "rise:0.35",
  "rise:0.5",
  "rise:0.7",
  "rise:1",
];
const points = (args.length ? args : DEFAULT).map((a) => {
  if (/^[\d.]+$/.test(a)) return { p: Number(a), name: `p${a}` };
  const [phase, t] = a.split(":");
  if (!["dive", "hold", "rise"].includes(phase) || Number.isNaN(Number(t)))
    throw new Error(`point "${a}": expected dive|hold|rise:t or a p`);
  return { phase, t: Number(t), name: `${phase}-${Number(t).toFixed(3)}` };
});

const HIDES = {
  sea: "[data-scene=road] [data-layer=sea] { visibility: hidden !important; }",
  chart:
    "[data-scene=road] [data-layer=chart] { visibility: hidden !important; }",
  text: "[data-scene=road] [data-layer=text] { visibility: hidden !important; }",
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: S,
});
const tab = await context.newPage();
const errors = [];
tab.on("pageerror", (e) => errors.push(e.message));
tab.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const query = quality === "auto" ? "" : `?quality=${quality}`;
await tab.goto(`${base}/${query}`);
await tab.waitForFunction(
  () => window.__road?.ready && window.__road.baked && window.__road.seaReady,
  null,
  { timeout: 240_000 },
);
for (const h of hide) {
  if (!HIDES[h]) throw new Error(`HIDE: unknown layer "${h}"`);
  await tab.addStyleTag({ content: HIDES[h] });
}
const pin = await tab.evaluate(() => window.__road.pin);
console.log(
  `pin ${pin.length} screens (${pin.base} for p); ${pin.interludes
    .map(
      (i) =>
        `${i.id} at p ${i.at}: screens ${i.from.toFixed(3)}-${i.to.toFixed(3)}, covered ${i.covered.map((c) => c.toFixed(3)).join("-")}`,
    )
    .join("; ")}`,
);
for (const point of points) {
  const y = await tab.evaluate(
    (pt) =>
      pt.phase
        ? window.__road.scrollForInterlude("boulogne", pt.phase, pt.t)
        : window.__road.scrollFor(pt.p),
    point,
  );
  await tab.evaluate((top) => {
    if (window.__lenis)
      window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, y);
  await tab.waitForTimeout(wait);
  const file = path.join(out, `${prefix}-${point.name}-${W}x${H}.png`);
  await tab.screenshot({ path: file });
  console.log(`${point.name}: y ${y.toFixed(1)} -> ${file}`);
}
await browser.close();
if (errors.length) {
  console.log(`page errors (${errors.length}):`);
  for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
}
