// How long Boulogne's flotilla shows whole over scene 2's progress: at each
// p, its gate (window.__road.gates: how far it is open, how much it shows),
// how many of its craft are on screen fully drawn (opacity 0.98 or more),
// the least opacity and height among them, the eye's height and how steeply
// it looks down on the flotilla's lead (height over distance; a gate holds
// from 0.25, glyphs/layout.ts GATE_TILT); then the stretch of p where
// every craft shows whole, in p, in screens of the story's own scroll (the
// pin's `base`, 30 screens to the unit of p) and in screens of the page's
// scroll (by the page's own map, window.__road.scrollFor: Boulogne's
// interlude stops the story at p 0.21 for its own screens, where the
// chart's marks give way to the painting). Development only.
//   node scripts/dev/flotilla-hold.mjs [from] [to] [step]
//   node scripts/dev/flotilla-hold.mjs 0.19..0.23:0.001
// Default 0.17 to 0.25 by 0.0025. Bare numbers keep their old meaning;
// anything else is the road tools' point syntax (road-scroll.mjs), p
// only: the probes draw the flight's own frame at p. Environment: BASE
// (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";
import {
  inInterlude,
  pointsFromArgs,
  roadPin,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = pointsFromArgs(process.argv.slice(2), {
  order: ["from", "to", "step"],
  defaults: { from: 0.17, to: 0.25, step: 0.0025 },
  pStep: 0.0025,
});
if (points.some(inInterlude)) {
  console.log(
    "flotilla-hold: p only (the probes draw the flight's frame at p, not an interlude's)",
  );
  process.exit(1);
}
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
/** The flotilla's layer in motion() (stage.ts: fleets 0, squadrons 1). */
const LAYER = 2;
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
await waitForRoad(page, { timeout: 180_000 });
const pin = await roadPin(page);
const count = (await page.evaluate(() => window.__road.glyphNames()))[LAYER]
  .length;
const W = width * scale;
const H = height * scale;
let whole = null;
let longest = null;
for (const point of points) {
  const p = point.p;
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
  const [a, b] = longest;
  const span = b - a;
  // The page's scroll between them, by its own map (the old pin's on a
  // build without it).
  const [ya, yb, vh] = await page.evaluate(
    ([a, b, base]) => {
      const at = (p) =>
        window.__road.scrollFor
          ? window.__road.scrollFor(p)
          : p * base * window.innerHeight;
      return [at(a), at(b), window.innerHeight];
    },
    [a, b, pin.base],
  );
  const across = pin.interludes.filter((i) => a <= i.at && i.at < b);
  console.log(
    `whole from p ${a} to ${b}: ${span.toFixed(4)} of p, ${(span * pin.base).toFixed(2)} screens of the story's scroll, ${((yb - ya) / vh).toFixed(2)} of the page's${across.length ? ` (with ${across.map((i) => `${i.id}'s ${(i.to - i.from).toFixed(1)}, where the painting stands for the chart`).join(", ")})` : ""} (sampled every ${points.length > 1 ? (points[1].p - points[0].p).toFixed(4) : "-"})`,
  );
} else console.log("never whole");
await browser.close();
