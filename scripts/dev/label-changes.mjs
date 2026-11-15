// Every change of a strength at a fleet's head over scene 2's progress: the
// squadrons' stages and the October fleets' days, each at its p, and the
// figure after it (window.__road.labelChanges). A change whose figure is
// lettered gives the window its crossfade takes and how long its figure is
// then shown whole, to the next lettered change, in p and in CSS px of
// scroll at the owner's screen (1280×720, by the page's own map,
// window.__road.scrollFor; a span across Boulogne's interlude counts the
// interlude's screens too, flagged "+"); one whose figure is skipped (the
// director's readableChanges: too near the next to be read) or that changes
// no figure says "not lettered". A lettered change is flagged (!) where its
// window is under MIN p or its figure is shown whole for less than READ p:
// too short to read (the owner's rule of 14 November 2026). Development only.
//   node scripts/dev/label-changes.mjs
// Environment: BASE (default http://127.0.0.1:3000), MIN (0.002), READ
// (0.0075, the director's READ_P).
import { chromium } from "@playwright/test";
import { roadPin, waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const min = Number(process.env.MIN ?? 0.002);
const read = Number(process.env.READ ?? 0.0075);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { baked: false, timeout: 180_000 });
const rows = await page.evaluate(() => window.__road.labelChanges());
const pin = await roadPin(page);
// The page's scroll position of every p a span starts or ends at (the old
// linear pin, 30 screens of 720 px, on a build without the map).
const ends = [...new Set(rows.flatMap((r) => [r.p, r.p + r.w]))];
const ys = await page.evaluate(
  (ps) =>
    ps.map((p) =>
      window.__road.scrollFor ? window.__road.scrollFor(p) : p * 30 * 720,
    ),
  ends,
);
const scrollAt = new Map(ends.map((p, i) => [p, ys[i]]));
/** The scroll between two p (CSS px), and whether an interlude lies inside. */
const span = (a, b) => {
  const px = Math.round(scrollAt.get(b) - scrollAt.get(a));
  const across = pin.interludes.some((i) => a <= i.at && i.at < b);
  return `${px} px${across ? "+" : ""}`;
};
let flagged = 0;
const byId = new Map();
for (const r of rows) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
for (const [id, list] of byId) {
  console.log(id);
  const lettered = list.filter((r) => r.lettered !== false);
  list.forEach((r) => {
    if (r.lettered === false) {
      console.log(`   p ${r.p.toFixed(4)}  not lettered      -> ${r.text}`);
      return;
    }
    const k = lettered.indexOf(r);
    const next = lettered[k + 1];
    // Shown whole from its window's end to the next lettered change.
    const held = next ? next.p - (r.p + r.w) : Number.NaN;
    const flag = r.w < min - 1e-9 || held < read - 1e-9;
    if (flag) flagged++;
    console.log(
      `${flag ? "!" : " "}  p ${r.p.toFixed(4)}  window ${r.w.toFixed(4)} (${span(r.p, r.p + r.w)})  whole ${Number.isNaN(held) ? "to the end" : `${held.toFixed(4)} (${span(r.p + r.w, next.p)})`}  -> ${r.text}`,
    );
  });
}
console.log(`flagged: ${flagged}`);
await browser.close();
process.exit(flagged > 0 ? 1 : 0);
