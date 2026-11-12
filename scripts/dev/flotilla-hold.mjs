// How long Boulogne's flotilla shows whole over scene 2's progress: at each
// p, its gate (window.__road.gates: how far it is open, how much it shows),
// how many of its craft are on screen fully drawn (opacity 0.98 or more),
// the least opacity and height among them, the eye's height and how steeply
// it looks down on the flotilla's lead (height over distance; a gate holds
// from 0.25, glyphs/layout.ts GATE_TILT); then the
// stretch of p where every craft shows whole, in p and in screens of scroll
// (scene 2's pin is 30 screens). Development only.
//   node scripts/dev/flotilla-hold.mjs [from] [to] [step]
// Default 0.17 to 0.25 by 0.0025. Environment: BASE (default
// http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.17);
const to = Number(process.argv[3] ?? 0.25);
const step = Number(process.argv[4] ?? 0.0025);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
/** The flotilla's layer in motion() (stage.ts: fleets 0, squadrons 1). */
const LAYER = 2;
const PIN_SCREENS = 30;
/** The flotilla's lead (its first prame, boulogne.ts) in the chart's world km (geo/mercator.ts). */
const R = 6378.137;
const merc = (lon, lat) => [
  R * ((lon * Math.PI) / 180),
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];
const [ox, oy] = merc(-6, 36);
const [lx, ly] = merc(1.4935, 50.706).map((v, i) => v - [ox, oy][i]);

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
const count = (await page.evaluate(() => window.__road.glyphNames()))[LAYER]
  .length;
const W = width * scale;
const H = height * scale;
let whole = null;
let longest = null;
const steps = Math.round((to - from) / step);
for (let s = 0; s <= steps; s++) {
  const p = Math.round((from + s * step) * 1e6) / 1e6;
  const row = await page.evaluate(
    ([p, layer]) => {
      const g = window.__road.gates(p);
      const m = window.__road.motion(p)[layer];
      const eye = window.__road.cameraAt(p).eye;
      return { open: g[4], shown: g[5], m, eye };
    },
    [p, LAYER],
  );
  let full = 0;
  let least = 1;
  let lowest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const [x, y, h, a] = row.m.slice(i * 6, i * 6 + 4);
    const on = x >= 0 && y >= 0 && x <= W && y <= H;
    if (on && a >= 0.98) full++;
    least = Math.min(least, on ? a : 0);
    lowest = Math.min(lowest, h);
  }
  const all = full === count;
  if (all) {
    whole ??= [p, p];
    whole[1] = p;
    if (!longest || whole[1] - whole[0] > longest[1] - longest[0])
      longest = [...whole];
  } else whole = null;
  console.log(
    `${all ? "*" : " "} p ${p.toFixed(4)}  gate ${row.open.toFixed(2)} shown ${row.shown.toFixed(2)}  whole ${full}/${count}  least ${least.toFixed(2)}  lowest ${(lowest / scale).toFixed(1)} css px  eye ${row.eye[2].toFixed(1)} km  tilt ${(row.eye[2] / Math.hypot(lx - row.eye[0], ly - row.eye[1], row.eye[2])).toFixed(3)}`,
  );
}
if (longest) {
  const span = longest[1] - longest[0];
  console.log(
    `whole from p ${longest[0]} to ${longest[1]}: ${span.toFixed(4)} of p, ${(span * PIN_SCREENS).toFixed(2)} screens (sampled every ${step})`,
  );
} else console.log("never whole");
await browser.close();
