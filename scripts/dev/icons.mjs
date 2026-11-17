// The site's icons, drawn from the site's own Victory: her silhouette (the
// ship geometry's silhouette mode, as the distant fleets of scene 1 use it)
// in the page's ink on its deep sea, with a band of lighter sea under her
// waterline, in a rounded square.
//
//   npm run dev (or a preview of `npm run build:labs`), then
//   node scripts/dev/icons.mjs
//
// Reads the silhouette from the ship lab (/lab/ship/?detail=silhouette) and
// writes src/app/favicon.ico (16, 32 and 48 px, PNG inside) and
// src/app/apple-icon.png (180 px, square and opaque: iOS rounds the corners
// itself and shows transparency as black); Next.js links both from every
// page. BASE (http://127.0.0.1:3000) can be set. The preview of the design
// at each size goes to OUT (.claude/icons.png) for a look.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const root = path.resolve(import.meta.dirname, "..", "..");

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/lab/ship/?detail=silhouette&panel=off`);
await page.waitForSelector(
  '[data-ship="victory-1805"][data-detail="silhouette"] svg',
);
// ShipOfTheLine's silhouette: sails, spars, hull, rigging, in that order;
// the viewBox in metres, the waterline at y = 0.
const ship = await page.evaluate(() => {
  const svg = document.querySelector(
    '[data-ship="victory-1805"][data-detail="silhouette"] svg',
  );
  const [x, y, w, h] = svg.getAttribute("viewBox").split(" ").map(Number);
  return {
    box: { x, y, w, h },
    d: [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")),
  };
});
await browser.close();

const INK = "#f3ead8";
const DEEP_SEA = "#1b2529";
const SEA = "#2a3e46";
/** Her waterline, from the top of the 100-unit square. */
const WATERLINE = 79;
/** Her length over all, bowsprit to taffrail, across the square (the jib boom's tip runs off it). */
const SCALE = 102 / ship.box.w;

function icon({ rounded }) {
  const r = rounded ? 20 : 0;
  const x0 = 1 - ship.box.x * SCALE;
  const [sails, spars, hull] = ship.d;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="r"><rect width="100" height="100" rx="${r}"/></clipPath><clipPath id="w"><rect x="${ship.box.x}" y="${ship.box.y}" width="${ship.box.w}" height="${-ship.box.y}"/></clipPath></defs><g clip-path="url(#r)"><rect width="100" height="100" fill="${DEEP_SEA}"/><rect y="${WATERLINE}" width="100" height="${100 - WATERLINE}" fill="${SEA}"/><g transform="translate(${x0.toFixed(3)} ${WATERLINE}) scale(${SCALE.toFixed(5)})" clip-path="url(#w)" fill="${INK}"><path d="${sails}"/><path d="${spars}"/><path d="${hull}"/></g></g></svg>`;
}

const png = (svg, px) =>
  sharp(Buffer.from(svg), { density: (72 * px) / 100 })
    .resize(px, px)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** An ICO holding PNG images (every browser since IE 9 reads them). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ px, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(px >= 256 ? 0 : px, e);
    head.writeUInt8(px >= 256 ? 0 : px, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

const rounded = icon({ rounded: true });
const sizes = [16, 32, 48];
const images = [];
for (const px of sizes) images.push({ px, data: await png(rounded, px) });
const favicon = ico(images);
writeFileSync(path.join(root, "src", "app", "favicon.ico"), favicon);
const apple = await png(icon({ rounded: false }), 180);
writeFileSync(path.join(root, "src", "app", "apple-icon.png"), apple);

// A look at each size, enlarged without smoothing, beside the 180.
const out = process.env.OUT ?? path.join(root, ".claude", "icons.png");
const tiles = await Promise.all(
  [...images.map((i) => i.data), apple].map((data) =>
    sharp(data).resize(192, 192, { kernel: "nearest" }).png().toBuffer(),
  ),
);
await sharp({
  create: {
    width: 192 * tiles.length + 16 * (tiles.length + 1),
    height: 224,
    channels: 4,
    background: "#f1f3f4",
  },
})
  .composite(tiles.map((t, i) => ({ input: t, left: 16 + i * 208, top: 16 })))
  .png()
  .toFile(out);
console.log(
  `icons: favicon.ico (${sizes.join(", ")} px, ${favicon.length} bytes), apple-icon.png (180 px, ${apple.length} bytes); a look at ${out}`,
);
