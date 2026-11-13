// The contrast of scene 2's text over the chart and over Boulogne's
// painting (development only, not part of the site or the tests).
//   node scripts/dev/contrast.mjs [from] [to] [step]
//   node scripts/dev/contrast.mjs 0.2..0.22:0.005 hold:0..1:0.1 dive:0.9..1:0.02
// The points: bare numbers keep their old meaning (p from, to, step;
// 0.085, 1, 0.01); anything else is the road tools' point syntax
// (road-scroll.mjs). With no arguments: p 0.085 to 1 by 0.01, then
// Boulogne's interlude: its dive and rise every 0.05 (the transition's
// ends, where the text steps out and comes back over the painting) and
// its hold every 0.25. At each point the scene is scrolled there by the
// page's own map and settled; the line boxes of every text that shows
// (the chapter marker, the date line, the captions) are read with each
// one's opacity as it shows (its own times every ancestor's: the text
// layer's, which the scene fades through the interlude's transition, and
// a caption's own as they cross); one under 0.05 is hidden and skipped.
// Then the frame is shot with the text made transparent (the scrims stay
// as the scene has them: over the painting the chapter marker's is
// hidden) and, under each box, the background's relative luminance is
// taken at its 95th percentile (the bright end a letter can sit on). The
// contrast is WCAG's (L1 + 0.05) / (L2 + 0.05) of the text's colour at
// full strength against that: what the text reads at wherever it shows
// (a row keeps the opacity it had). AA asks 4.5:1 for body text (the
// captions) and 3:1 for large text.
//
// The fleets' labels lettered on the chart at their tracks' heads
// ("Villeneuve, 20 sail"; window.__road.routeLabels) are measured too, each
// at 0.05 opacity or more: the frame is shot again with them hidden (they
// stay placed, so the chart under them is the chart they lie on), and under
// each label's outline every pixel's contrast against the ink drawn there
// is taken, the ink's own pixels telling which (pale on the sea, dark on
// the land: a pixel lighter with the label than without it was drawn in
// the pale ink); the label's ratio is the 5th percentile of those, which
// for pale ink is the old rule's 95th percentile of the ground and also
// holds for dark ink on the land. A label drawn in both inks at once
// (across a coast) is counted apart as mixed. A label whose outline the
// frame doesn't change when it is hidden doesn't show (the painting covers
// the chart, which isn't drawn then, or it is too faint to see): skipped.
// At the end, the worst row of each element (each caption, the date line,
// the chapter marker, each fleet's label) and how many rows fall below
// 4.5:1. Needs a server, as road.mjs does: BASE (http://127.0.0.1:3000),
// W, H, S; JSON=<file> writes the rows; SHOTS=<dir> keeps the frames.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  inInterlude,
  pointFile,
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
  defaults: { from: 0.085, to: 1, step: 0.01 },
  fallback: "0.085..1:0.01 dive:0..1:0.05 hold:0..1:0.25 rise:0..1:0.05",
});
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const SETTLE_MS = 1700;
/** Below this opacity a text or a label is hidden. */
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
  sea: points.some(inInterlude),
  timeout: points.some(inInterlude) ? 240_000 : 120_000,
});
const pin = await roadPin(page);

/** Switches the style that makes the text transparent for a shot. */
const hideText = (on) =>
  page.evaluate((on) => {
    let style = document.getElementById("contrast-hide");
    if (!style) {
      style = document.createElement("style");
      style.id = "contrast-hide";
      style.textContent =
        "#road [data-layer=text] h2, #road [data-layer=text] p { color: transparent !important; }";
      document.head.append(style);
    }
    style.disabled = !on;
  }, on);

const rows = [];
for (const point of points) {
  await scrollToPoint(page, point);
  await page.waitForTimeout(SETTLE_MS);
  const at = {
    point: pointName(point),
    p: pointP(pin, point),
    ...(inInterlude(point) ? { phase: point.phase, t: point.t } : {}),
  };
  // The texts that show, their opacity as they show, and their line boxes
  // (CSS px).
  const texts = await page.evaluate((hidden) => {
    const out = [];
    const root = document.querySelector("#road [data-layer=text]");
    if (!root) return out;
    for (const el of root.querySelectorAll(
      "[data-el=chapter], [data-el=dateline], [data-caption]",
    )) {
      const style = getComputedStyle(el);
      let opacity = Number(style.opacity);
      for (let a = el.parentElement; a; a = a.parentElement)
        opacity *= Number(getComputedStyle(a).opacity);
      if (
        opacity < hidden ||
        style.visibility !== "visible" ||
        !el.textContent?.trim()
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const boxes = [...range.getClientRects()]
        .filter((r) => r.width > 2 && r.height > 2)
        .map((r) => [r.left, r.top, r.width, r.height]);
      const [r, g, b] = style.color.match(/[\d.]+/g).map(Number);
      out.push({
        id: el.getAttribute("data-caption") ?? el.getAttribute("data-el"),
        size: Number.parseFloat(style.fontSize),
        color: [r, g, b],
        opacity,
        boxes,
      });
    }
    return out;
  }, HIDDEN);
  await hideText(true);
  await page.waitForTimeout(150);
  const shot = await page.screenshot();
  await hideText(false);
  if (process.env.SHOTS)
    await writeFile(
      `${process.env.SHOTS}/contrast-${pointFile(point)}.png`,
      shot,
    );
  const { data, info } = await sharp(shot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // The fleets' labels in the frame shot, and the frame again without them.
  const heads = (
    await page.evaluate(() => window.__road.routeLabels?.() ?? [])
  ).filter((h) => h.opacity >= HIDDEN);
  let under = null;
  if (heads.length) {
    await page.evaluate(() => window.__road.hideRouteLabels(true));
    await page.waitForTimeout(150);
    await hideText(true);
    under = await sharp(await page.screenshot())
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    await hideText(false);
    await page.evaluate(() => window.__road.hideRouteLabels(false));
  }
  let unseen = 0;
  for (const h of heads) {
    const q = h.quad.map((v) => v * scale);
    const xs = q.filter((_, i) => i % 2 === 0);
    const ys = q.filter((_, i) => i % 2 === 1);
    const ratios = [];
    let pale = 0;
    let dark = 0;
    let changed = 0;
    const inkPale = luminance(...h.inkPale);
    const inkDark = luminance(...h.inkDark);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const x1 = Math.min(info.width, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(info.height, Math.ceil(Math.max(...ys)));
    const grounds = [];
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        if (!inQuad(q, x + 0.5, y + 0.5)) continue;
        const o = (y * info.width + x) * 3;
        const a = data;
        const b = under.data;
        const lb = luminance(b[o], b[o + 1], b[o + 2]);
        grounds.push(lb);
        const most = Math.max(
          Math.abs(a[o] - b[o]),
          Math.abs(a[o + 1] - b[o + 1]),
          Math.abs(a[o + 2] - b[o + 2]),
        );
        if (most > 8) changed++;
        const diff =
          Math.abs(a[o] - b[o]) +
          Math.abs(a[o + 1] - b[o + 1]) +
          Math.abs(a[o + 2] - b[o + 2]);
        if (diff > 24) {
          if (luminance(a[o], a[o + 1], a[o + 2]) > lb) pale++;
          else dark++;
        }
      }
    if (!grounds.length) continue;
    // Hidden: the frame is the same with it and without it.
    if (changed < Math.max(3, 0.01 * grounds.length)) {
      unseen++;
      continue;
    }
    const ink = pale >= dark ? inkPale : inkDark;
    for (const l of grounds) ratios.push(contrast(ink, l));
    ratios.sort((u, v) => u - v);
    rows.push({
      ...at,
      id: `route:${h.id}`,
      text: h.text,
      size: h.emPx,
      opacity: h.opacity,
      ratio: ratios[Math.floor(0.05 * (ratios.length - 1))],
      mixed: Math.min(pale, dark) > 0.1 * (pale + dark),
    });
  }
  for (const t of texts) {
    const lums = [];
    for (const [x, y, w, h] of t.boxes) {
      const x0 = Math.max(0, Math.floor(x * scale));
      const y0 = Math.max(0, Math.floor(y * scale));
      const x1 = Math.min(info.width, Math.ceil((x + w) * scale));
      const y1 = Math.min(info.height, Math.ceil((y + h) * scale));
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const o = (yy * info.width + xx) * 3;
          lums.push(luminance(data[o], data[o + 1], data[o + 2]));
        }
    }
    if (!lums.length) continue;
    lums.sort((a, b) => a - b);
    const bright = lums[Math.floor(0.95 * (lums.length - 1))];
    const ink = luminance(...t.color);
    rows.push({
      ...at,
      id: t.id,
      size: t.size,
      opacity: t.opacity,
      ratio: contrast(ink, bright),
    });
  }
  const line = rows
    .filter((r) => r.point === at.point)
    .map(
      (r) =>
        `${r.id} ${r.ratio.toFixed(2)}${r.opacity < 0.995 ? `@${r.opacity.toFixed(2)}` : ""}`,
    )
    .join("  ");
  console.log(
    `${at.point.padStart(10)}  ${line || "(no text shows)"}${unseen ? `  (${unseen} fleet labels unseen)` : ""}`,
  );
}

// The worst row of each element, worst first.
const worst = new Map();
for (const r of rows) {
  const w = worst.get(r.id);
  if (!w || r.ratio < w.ratio) worst.set(r.id, r);
}
console.log("worst per element:");
for (const r of [...worst.values()].sort((a, b) => a.ratio - b.ratio))
  console.log(
    `  ${r.id.padEnd(28)} ${r.ratio.toFixed(2)} at ${r.point}${r.opacity < 0.995 ? ` (opacity ${r.opacity.toFixed(2)})` : ""}${r.text ? ` "${r.text}"` : ""}${r.mixed ? " (across a coast)" : ""}`,
  );
const routes = rows.filter((r) => r.id.startsWith("route:"));
if (routes.length)
  console.log(
    `route labels below 4.5:1: ${routes.filter((r) => r.ratio < 4.5).length} of ${routes.length}; across a coast: ${routes.filter((r) => r.mixed).length}`,
  );
const painted = rows.filter((r) => r.phase);
if (painted.length)
  console.log(
    `in the interlude, below 4.5:1: ${painted.filter((r) => r.ratio < 4.5).length} of ${painted.length}`,
  );
console.log(
  `below 4.5:1: ${rows.filter((r) => r.ratio < 4.5).length} of ${rows.length}`,
);
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
await browser.close();

/** Whether a point lies inside a convex quad (corners x, y in order). */
function inQuad(q, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const ax = q[i * 2];
    const ay = q[i * 2 + 1];
    const bx = q[((i + 1) % 4) * 2];
    const by = q[((i + 1) % 4) * 2 + 1];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c === 0) continue;
    if (!sign) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}
