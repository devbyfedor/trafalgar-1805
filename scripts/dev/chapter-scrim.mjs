// The least the chapter marker's soft scrim can show at each point and keep
// the marker's contrast over the chart, or over Boulogne's painting, at
// TARGET (development only; the scrim's curve in src/scenes/02-road/ink.ts,
// CHAPTER_SCRIM).
//   node scripts/dev/chapter-scrim.mjs [from] [to] [step]
//   node scripts/dev/chapter-scrim.mjs 0.2..0.22:0.005 hold:0..1:0.25
// The points: bare numbers keep their old meaning (p from, to, step; 0,
// 1, 0.01); anything else is the road tools' point syntax (road-scroll.
// mjs). With no arguments: p 0 to 1 by 0.01, then Boulogne's interlude
// (its dive and rise every 0.05, its hold every 0.25). At each point the
// scene is scrolled there by the page's own map and settled; the marker's
// line boxes are read, with its opacity as it shows (its own times every
// ancestor's, the text layer's included, which the scene fades through
// the interlude's transition; under 0.05 it is not showing); then the
// frame is shot twice with the text made transparent, the scrim forced
// off and forced full (shown even where the scene hides it). CSS
// composites an element's opacity linearly in sRGB, so each pixel under
// the marker at opacity o is off + o·(full − off): the least o at which
// the background's 95th-percentile luminance (the bright end a letter can
// sit on, as contrast.mjs takes it) gives TARGET is found by bisection.
// Prints the point, the contrast with no scrim, with the scene's own scrim
// and with a full one, and the least opacity. Where the scene hides the
// scrim (over the painting, which keeps the sky behind the marker dark
// instead) its own scrim counts as 0, so "scene" is the marker's contrast
// against the painting itself, flagged "hidden". Needs a server, as
// road.mjs does: BASE (http://127.0.0.1:3000), W, H, S; TARGET (4.7);
// JSON=<file>.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  inInterlude,
  pointName,
  pointP,
  pointsFromArgs,
  roadPin,
  scrollToPoint,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = pointsFromArgs(process.argv.slice(2), {
  order: ["from", "to", "step"],
  defaults: { from: 0, to: 1, step: 0.01 },
  fallback: "0..1:0.01 dive:0..1:0.05 hold:0..1:0.25 rise:0..1:0.05",
});
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const TARGET = Number(process.env.TARGET ?? 4.7);
const SETTLE_MS = 1700;
/** Below this opacity the marker is not showing. */
const HIDDEN = 0.05;

const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r, g, b) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({ channel: "chromium" });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
const page = await context.newPage();
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, {
  baked: false,
  sea: points.some(inInterlude),
  timeout: points.some(inInterlude) ? 240_000 : 120_000,
});
const pin = await roadPin(page);

/**
 * A style switched on for a shot: the text transparent, the scrim at `o`,
 * shown even where the scene hides it (null: as the scene sets it).
 */
async function setShot(o) {
  await page.evaluate((o) => {
    let style = document.getElementById("chapter-scrim-shot");
    if (!style) {
      style = document.createElement("style");
      style.id = "chapter-scrim-shot";
      document.head.append(style);
    }
    style.textContent = `#road [data-layer=text] h2, #road [data-layer=text] p { color: transparent !important; }${
      o === null
        ? ""
        : ` #road [data-el=scrim-chapter] { opacity: ${o} !important; visibility: visible !important; }`
    }`;
    style.disabled = false;
  }, o);
  await page.waitForTimeout(120);
}

async function pixels(boxes) {
  const shot = await page.screenshot();
  const { data, info } = await sharp(shot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = [];
  for (const [x, y, w, h] of boxes) {
    const x0 = Math.max(0, Math.floor(x * scale));
    const y0 = Math.max(0, Math.floor(y * scale));
    const x1 = Math.min(info.width, Math.ceil((x + w) * scale));
    const y1 = Math.min(info.height, Math.ceil((y + h) * scale));
    for (let yy = y0; yy < y1; yy++)
      for (let xx = x0; xx < x1; xx++) {
        const o = (yy * info.width + xx) * 3;
        out.push(data[o], data[o + 1], data[o + 2]);
      }
  }
  return out;
}

/** The 95th-percentile luminance of pixels off + o·(full − off). */
function bright(off, full, o) {
  const lums = [];
  for (let i = 0; i < off.length; i += 3)
    lums.push(
      luminance(
        off[i] + o * (full[i] - off[i]),
        off[i + 1] + o * (full[i + 1] - off[i + 1]),
        off[i + 2] + o * (full[i + 2] - off[i + 2]),
      ),
    );
  lums.sort((a, b) => a - b);
  return lums[Math.floor(0.95 * (lums.length - 1))];
}

const rows = [];
for (const point of points) {
  const name = pointName(point).padStart(10);
  await scrollToPoint(page, point);
  await page.waitForTimeout(SETTLE_MS);
  const marker = await page.evaluate(() => {
    const el = document.querySelector("#road [data-el=chapter]");
    const scrim = document.querySelector("#road [data-el=scrim-chapter]");
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    const boxes = [...range.getClientRects()]
      .filter((r) => r.width > 2 && r.height > 2)
      .map((r) => [r.left, r.top, r.width, r.height]);
    const style = getComputedStyle(el);
    const [r, g, b] = style.color.match(/[\d.]+/g).map(Number);
    let opacity = Number(style.opacity);
    for (let a = el.parentElement; a; a = a.parentElement)
      opacity *= Number(getComputedStyle(a).opacity);
    const scrimStyle = scrim ? getComputedStyle(scrim) : null;
    // A scrim the scene hides shows nothing, whatever its opacity.
    const hidden = scrimStyle?.visibility !== "visible";
    return {
      boxes,
      color: [r, g, b],
      opacity: style.visibility === "visible" ? opacity : 0,
      scrim: !scrimStyle || hidden ? 0 : Number(scrimStyle.opacity),
      hidden: Boolean(scrimStyle) && hidden,
    };
  });
  if (!marker || marker.opacity < HIDDEN || !marker.boxes.length) {
    console.log(`${name}  marker not showing`);
    continue;
  }
  await setShot(0);
  const off = await pixels(marker.boxes);
  await setShot(1);
  const full = await pixels(marker.boxes);
  await page.evaluate(() => {
    const style = document.getElementById("chapter-scrim-shot");
    if (style) style.disabled = true;
  });
  const ink = luminance(...marker.color);
  const at = (o) => contrast(ink, bright(off, full, o));
  let least = 0;
  if (at(0) < TARGET) {
    if (at(1) < TARGET) least = Number.NaN;
    else {
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        if (at(mid) >= TARGET) hi = mid;
        else lo = mid;
      }
      least = hi;
    }
  }
  const row = {
    point: pointName(point),
    p: pointP(pin, point),
    ...(inInterlude(point) ? { phase: point.phase, t: point.t } : {}),
    markerOpacity: marker.opacity,
    none: at(0),
    scene: at(marker.scrim),
    full: at(1),
    sceneOpacity: marker.scrim,
    hidden: marker.hidden,
    least,
  };
  rows.push(row);
  console.log(
    `${name}  none ${row.none.toFixed(2)}  scene ${row.scene.toFixed(2)} (${row.hidden ? "hidden" : `at ${row.sceneOpacity.toFixed(2)}`})  full ${row.full.toFixed(2)}  least ${Number.isNaN(least) ? "-" : least.toFixed(2)}${row.markerOpacity < 0.995 ? `  (marker at ${row.markerOpacity.toFixed(2)})` : ""}`,
  );
}
const low = rows.filter((r) => r.scene < TARGET);
console.log(
  `below ${TARGET}:1 as the scene has it: ${low.length} of ${rows.length}${low.length ? ` (${low.map((r) => r.point.trim()).join(", ")})` : ""}`,
);
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
await browser.close();
