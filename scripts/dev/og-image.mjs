// The link preview's image (public/link-preview.jpg, the page's og:image
// and twitter:image; src/app/page.tsx): scene 1's hero frame, p = 0.7 (the
// scene 1 brief's "sun up, light haze, Victory in hero position, title and
// lede visible"), rendered by the site itself at the preview's 1.91:1.
//
//   npm run build && npm run preview, then
//   node scripts/dev/og-image.mjs [out-file]
//
// The page at 1200×630 CSS px and device scale 2, scrolled to scene 1's p
// (its pin is three screens of p), the chapter marker hidden (it is the
// page's furniture, not the picture's), then scaled to 1200×630 and saved
// as a JPEG small enough for every messenger (WhatsApp drops previews over
// about 300 KB). BASE (http://127.0.0.1:4173) and P (0.7) can be set.

import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { SCENE1, scrollPageTo } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const p = Number(process.env.P ?? 0.7);
const out = path.resolve(process.argv[2] ?? "public/link-preview.jpg");
const W = 1200;
const H = 630;

// The new headless mode renders on the GPU, as a reader's browser does.
const browser = await chromium.launch({ channel: "chromium" });
const page = await (
  await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
  })
).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/`);
await page.waitForLoadState("load");
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "[data-scene=dawn] [data-el=chapter] { opacity: 0 !important; }",
});
await page.waitForTimeout(1500);
await scrollPageTo(page, SCENE1 * p * H);
await page.waitForTimeout(3000);
const shot = await page.screenshot({ type: "png" });
await browser.close();
if (errors.length) {
  console.error(`page errors: ${errors.join("; ")}`);
  process.exit(1);
}

const info = await sharp(shot)
  .resize(W, H, { kernel: "lanczos3" })
  .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
  .toFile(out);
console.log(
  `link preview: ${out}, ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB (scene 1 at p ${p}, from ${base})`,
);
