// Every change of a strength lettered at a fleet's head over scene 2's
// progress: the squadrons' stages and the October fleets' days, each at its
// p, the window its crossfade takes (the director's changeWindows: never
// into the next change), the scroll to the next change in CSS px at the
// owner's screen (the pin is 30 viewport heights of 720 px), and the figure
// after it (window.__road.labelChanges). A change whose window is under
// MIN p is flagged (!): its figures swap too fast to read, and the story's
// clock wants more room there (beats.ts). Development only.
//   node scripts/dev/label-changes.mjs
// Environment: BASE (default http://127.0.0.1:3000), MIN (0.003).
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const min = Number(process.env.MIN ?? 0.003);
const PX_PER_P = 30 * 720;
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(() => window.__road?.ready, null, {
  timeout: 180_000,
});
const rows = await page.evaluate(() => window.__road.labelChanges());
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
      `${flag ? "!" : " "}  p ${r.p.toFixed(4)}  window ${r.w.toFixed(4)} (${Math.round(r.w * PX_PER_P)} px)  to next ${Number.isNaN(gap) ? "-" : `${gap.toFixed(4)} (${Math.round(gap * PX_PER_P)} px)`}  -> ${r.text}`,
    );
  });
}
console.log(`flagged: ${flagged}`);
await browser.close();
process.exit(flagged > 0 ? 1 : 0);
