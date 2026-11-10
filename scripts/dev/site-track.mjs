// Where given sites stand in scene 2's frame over a range of p (normalised
// device coordinates, x right, y up, -1..1), against the caption card's box
// at the owner's viewport (window.__road.siteView). Development only.
//   SITES="-12.33,43.75;-11.75,41.5" node scripts/dev/site-track.mjs 0.58 0.6 0.004
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [from, to, step] = process.argv.slice(2, 5).map(Number);
const sites = (process.env.SITES ?? "")
  .split(";")
  .filter(Boolean)
  .map((s) => s.split(",").map(Number));
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.W ?? 1280),
    height: Number(process.env.H ?? 720),
  },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
// The caption card's box, from the page itself.
const card = await page.evaluate(() => {
  const el = document.querySelector("[data-scene=road] [data-el=card]");
  const r = el?.getBoundingClientRect();
  return r
    ? {
        x0: (r.left / innerWidth) * 2 - 1,
        x1: (r.right / innerWidth) * 2 - 1,
        y0: 1 - (r.bottom / innerHeight) * 2,
        y1: 1 - (r.top / innerHeight) * 2,
      }
    : null;
});
console.log("card", JSON.stringify(card));
for (let p = from; p <= to + 1e-9; p += step) {
  const rows = await page.evaluate(
    ([p, sites]) =>
      sites.map(([lon, lat]) => window.__road.siteView(p, lon, lat)),
    [p, sites],
  );
  console.log(
    p.toFixed(4),
    rows
      .map((r, i) => {
        const under =
          card &&
          r.x >= card.x0 &&
          r.x <= card.x1 &&
          r.y >= card.y0 &&
          r.y <= card.y1;
        return `${sites[i].join(",")}: (${r.x.toFixed(2)}, ${r.y.toFixed(2)})${under ? " UNDER" : ""}`;
      })
      .join("  "),
  );
}
await browser.close();
