// The fleets' head labels' ground model held against the frame
// (development only): at each point, every place each head tried this
// frame whose ground was read (HeadLabels.explain: its outline and the
// luminance ground.ts gave it, the brightest of the sea or the darkest of
// the land) beside the frame's own luminance under that outline, shot with
// the labels and scene 2's HTML hidden: on the sea its 95th percentile
// (the bright end a pale letter sits on), on the land its 5th. The model
// should be at or a little above the sea's (at or below the land's): then
// a place it lets stand reads in the frame as it reckoned.
//   node scripts/dev/head-ground.mjs 0.70..0.78:0.01
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, WHO, NOSCRIM,
// OVERLAY=<dir> (each frame with the places' outlines: red sea, blue land).
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  parsePoints,
  pointName,
  scrollToPoint,
  waitForRoad,
} from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const points = parsePoints(process.argv.slice(2));
const who = process.env.WHO ? process.env.WHO.split(",") : null;
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function inQuad(q, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const ax = q[i * 2];
    const ay = q[i * 2 + 1];
    const bx = q[((i + 1) % 4) * 2];
    const by = q[((i + 1) % 4) * 2 + 1];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
// The text made transparent, as contrast.mjs does; the scrims stay, as the
// reader sees the chart, unless NOSCRIM=1 (the chart's own colours: the
// model's).
await page.addStyleTag({
  content: `#road [data-layer=text] h2, #road [data-layer=text] p { color: transparent !important; }${process.env.NOSCRIM === "1" ? " #road [data-layer=text] { visibility: hidden !important; }" : ""}`,
});
const all = [];
for (const point of points) {
  await scrollToPoint(page, point);
  await page.waitForTimeout(1700);
  const tried = await page.evaluate(() => window.__road.routeLabels(true));
  await page.evaluate(() => window.__road.hideRouteLabels(true));
  await page.waitForTimeout(150);
  const png = await page.screenshot();
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  await page.evaluate(() => window.__road.hideRouteLabels(false));
  console.log(`p ${pointName(point)}`);
  const outlines = [];
  for (const t of tried) {
    if (who && !who.includes(t.id)) continue;
    const sea = Number.isFinite(t.seaL);
    const land = Number.isFinite(t.landL);
    if (!sea && !land) continue;
    if (!t.quad.every(Number.isFinite)) continue;
    const q = t.quad.map((v) => v * scale);
    const xs = q.filter((_, i) => i % 2 === 0);
    const ys = q.filter((_, i) => i % 2 === 1);
    const ls = [];
    for (
      let y = Math.max(0, Math.floor(Math.min(...ys)));
      y < Math.min(info.height, Math.ceil(Math.max(...ys)));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(Math.min(...xs)));
        x < Math.min(info.width, Math.ceil(Math.max(...xs)));
        x++
      ) {
        if (!inQuad(q, x + 0.5, y + 0.5)) continue;
        const o = (y * info.width + x) * 3;
        ls.push(lum(data[o], data[o + 1], data[o + 2]));
      }
    if (ls.length < 8) continue;
    ls.sort((a, b) => a - b);
    const p95 = ls[Math.floor(0.95 * (ls.length - 1))];
    const p05 = ls[Math.floor(0.05 * (ls.length - 1))];
    const model = sea ? t.seaL : t.landL;
    const frame = sea ? p95 : p05;
    all.push({ sea, model, frame });
    outlines.push(
      `<polygon points="${q.join(",")}" fill="none" stroke="${sea ? "#ff3030" : "#30a0ff"}" stroke-width="1.5"/><text x="${q[0]}" y="${q[1] + 14}" fill="#ff3030" font-size="13">${t.side[0]}${t.reach}/${t.gap}${t.onScreen ? "s" : ""}</text>`,
    );
    console.log(
      `  ${t.id} ${t.side} reach ${t.reach} gap ${t.gap}${t.onScreen ? " on screen" : ""}: ${sea ? "sea" : "land"} model ${model.toFixed(3)} frame ${frame.toFixed(3)} (${(model - frame >= 0 ? "+" : "") + (model - frame).toFixed(3)}), near ${t.near} px (${t.nearKm} km, ${t.nearPerPx} km/px), room ${t.why[0]}`,
    );
  }
  if (process.env.OVERLAY)
    await sharp(png)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg">${outlines.join("")}</svg>`,
          ),
        },
      ])
      .toFile(`${process.env.OVERLAY}/ground-${pointName(point)}.png`);
}
const seas = all.filter((r) => r.sea);
if (seas.length) {
  const d = seas.map((r) => r.model - r.frame).sort((a, b) => a - b);
  console.log(
    `sea places ${seas.length}: model - frame min ${d[0].toFixed(3)}, median ${d[Math.floor(d.length / 2)].toFixed(3)}, max ${d[d.length - 1].toFixed(3)}`,
  );
}
await browser.close();
