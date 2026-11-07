// The contrast of scene 2's text over the chart (development only, not part
// of the site or the tests).
//   node scripts/dev/contrast.mjs [from] [to] [step]
// At each p (0.085 to 1 in steps of 0.01 by default) the scene is scrolled
// there and settled; the line boxes of every text that shows (the chapter
// marker, the date line, a caption at more than half opacity) are read;
// then the frame is shot with the text made transparent (the scrim stays)
// and, under each box, the background's relative luminance is taken at its
// 95th percentile (the bright end a letter can sit on). The contrast is
// WCAG's (L1 + 0.05) / (L2 + 0.05) against the text colour; AA asks 4.5:1
// for body text (the captions) and 3:1 for large text. Needs a server, as
// road.mjs does: BASE (http://127.0.0.1:3000), W, H, S; JSON=<file> writes
// the rows.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.085);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.01);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const SCENE1 = 3;
const SCENE2 = 30;
const SETTLE_MS = 1700;

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
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 120_000,
});

const rows = [];
const count = Math.round((to - from) / step);
for (let i = 0; i <= count; i++) {
  const p = Math.round(Math.min(to, from + i * step) * 1e4) / 1e4;
  await page.evaluate(
    (y) => window.__lenis.scrollTo(y, { immediate: true, force: true }),
    (SCENE1 + p * SCENE2) * height,
  );
  await page.waitForTimeout(SETTLE_MS);
  // The texts that show and their line boxes, CSS px.
  const texts = await page.evaluate(() => {
    const out = [];
    const root = document.querySelector("#road [data-layer=text]");
    if (!root) return out;
    for (const el of root.querySelectorAll(
      "[data-el=chapter], [data-el=dateline], [data-caption]",
    )) {
      const style = getComputedStyle(el);
      let opacity = Number(style.opacity);
      for (let a = el.parentElement; a && a !== root; a = a.parentElement)
        opacity *= Number(getComputedStyle(a).opacity);
      if (opacity < 0.5 || !el.textContent?.trim()) continue;
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
        boxes,
      });
    }
    return out;
  });
  // The text hidden by a style of its own, switched on for the shot.
  await page.evaluate(() => {
    let style = document.getElementById("contrast-hide");
    if (!style) {
      style = document.createElement("style");
      style.id = "contrast-hide";
      style.textContent =
        "#road [data-layer=text] h2, #road [data-layer=text] p { color: transparent !important; }";
      document.head.append(style);
    }
    style.disabled = false;
  });
  await page.waitForTimeout(150);
  const shot = await page.screenshot();
  await page.evaluate(() => {
    const style = document.getElementById("contrast-hide");
    if (style) style.disabled = true;
  });
  if (process.env.SHOTS)
    await writeFile(`${process.env.SHOTS}/contrast-${p.toFixed(3)}.png`, shot);
  const { data, info } = await sharp(shot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
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
    const ratio = contrast(ink, bright);
    rows.push({ p, id: t.id, size: t.size, ratio });
  }
  const line = rows
    .filter((r) => r.p === p)
    .map((r) => `${r.id} ${r.ratio.toFixed(2)}`)
    .join("  ");
  console.log(`${p.toFixed(3)}  ${line}`);
}
const worst = (id) =>
  rows
    .filter((r) => (id ? r.id === id : true))
    .reduce((a, r) => (!a || r.ratio < a.ratio ? r : a), null);
for (const id of ["chapter", "dateline"]) {
  const w = worst(id);
  if (w) console.log(`worst ${id}: ${w.ratio.toFixed(2)} at p = ${w.p}`);
}
const caps = rows.filter((r) => r.id !== "chapter" && r.id !== "dateline");
const wc = caps.reduce((a, r) => (!a || r.ratio < a.ratio ? r : a), null);
if (wc)
  console.log(
    `worst caption: ${wc.ratio.toFixed(2)} at p = ${wc.p} (${wc.id})`,
  );
console.log(
  `below 4.5:1: ${rows.filter((r) => r.ratio < 4.5).length} of ${rows.length}`,
);
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
await browser.close();
