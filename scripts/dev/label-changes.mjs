// Every change of a strength lettered at a fleet's head over scene 2's
// progress: the squadrons' stages and the October fleets' days, each at its
// p, the window its crossfade takes (the director's changeWindows: never
// into the next change), the scroll to the next change in CSS px at the
// owner's screen (1280×720, by the page's own map, window.__road.
// scrollFor: a span across Boulogne's interlude counts the interlude's
// screens too, flagged "+"), and the figure after it
// (window.__road.labelChanges). A change whose window is under MIN p is
// flagged (!): its figures swap too fast to read, and the story's clock
// wants more room there (beats.ts). Development only.
//   node scripts/dev/label-changes.mjs
// Environment: BASE (default http://127.0.0.1:3000), MIN (0.003).
import { chromium } from "@playwright/test";
import { roadPin, waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const min = Number(process.env.MIN ?? 0.003);
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
  list.forEach((r, k) => {
    const next = list[k + 1];
    const gap = next ? next.p - r.p : Number.NaN;
    const flag = r.w < min;
    if (flag) flagged++;
    console.log(
      `${flag ? "!" : " "}  p ${r.p.toFixed(4)}  window ${r.w.toFixed(4)} (${span(r.p, r.p + r.w)})  to next ${Number.isNaN(gap) ? "-" : `${gap.toFixed(4)} (${span(r.p, next.p)})`}  -> ${r.text}`,
    );
  });
}
console.log(`flagged: ${flagged}`);
await browser.close();
process.exit(flagged > 0 ? 1 : 0);
