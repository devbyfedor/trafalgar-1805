// The October fleets' labels against their ships, over scene 2's progress:
// at each p, each side's gate (how far its ships of the line read one by
// one, and how much they show; glyphs/layout.ts, FreeGroup.gate), its
// label's figure and opacity, and how many of its ships of the line are
// drawn at half opacity or more on screen (window.__road.gates, sample,
// routeLabels). The owner's rule of 12 November 2026: a label's figure and
// the ships that come in agree, so the label gives way as they come in.
// Development only.
//   node scripts/dev/fleet-gates.mjs [from] [to] [step]
// Default 0 to 1 by 0.005. A row is flagged (!) where a label shows more
// than half while its side's ships of the line are drawn too (some at half
// opacity or more on screen): beyond a crossfade between the two. Each row also gives, after the drawn
// count, how many of the side's ships of the line the scene has with the
// fleet then ("drawn/present"; the figure also counts the ships it doesn't
// draw, so before 17 October the British differ by those, and their gate
// must be shut then).
// Environment: BASE (default http://127.0.0.1:3000), W, H, S. Exits with 1
// if any row is flagged.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.005);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
/** The fleets' ships that are not of the line (fleets.ts: frigates and small craft). */
const SMALL = new Set([
  "Euryalus",
  "Naiad",
  "Phoebe",
  "Sirius",
  "Pickle",
  "Entreprenante",
  "Weazle",
  "Cornélie",
  "Hermione",
  "Hortense",
  "Rhin",
  "Thémis",
  "Argus",
  "Furet",
  "Observateur",
]);
/** The British fleet's ships (fleets.ts, BRITISH, in mark order: they come first). */
const BRITISH_COUNT = 34;

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
let flagged = 0;
const steps = Math.round((to - from) / step);
for (let s = 0; s <= steps; s++) {
  const p = Math.round((from + s * step) * 1e6) / 1e6;
  const row = await page.evaluate((p) => {
    const g = window.__road.gates(p);
    const labels = window.__road.routeLabels(false);
    const v = Array.from(window.__road.sample(p, 0).fleets);
    const present = Array.from(window.__road.fleetAt(p));
    return { g, labels, v, present };
  }, p);
  const drawn = [0, 0];
  const present = [0, 0];
  for (let i = 0; i < names.length; i++) {
    if (SMALL.has(names[i])) continue;
    const [x, y, , a] = row.v.slice(i * 4, i * 4 + 4);
    const on = x >= 0 && y >= 0 && x <= width * scale && y <= height * scale;
    if (a >= 0.5 && on) drawn[i < BRITISH_COUNT ? 0 : 1]++;
    if (row.present[i * 3 + 2] > 0.5) present[i < BRITISH_COUNT ? 0 : 1]++;
  }
  const label = (id) => {
    let best = null;
    for (const l of row.labels)
      if (l.id === id && (!best || l.opacity > best.opacity)) best = l;
    if (!best) return { text: "-", figure: Number.NaN, opacity: 0 };
    let opacity = 0;
    for (const l of row.labels) if (l.id === id) opacity += l.opacity;
    const m = /(\d+) sail/.exec(best.text);
    return { text: best.text, figure: m ? Number(m[1]) : Number.NaN, opacity };
  };
  const lb = label("fleet-british");
  const lc = label("fleet-combined");
  const bad = (l, n) => l.opacity > 0.5 && n > 0;
  const flag = bad(lb, drawn[0]) || bad(lc, drawn[1]);
  if (flag) flagged++;
  const f = (x) => x.toFixed(2);
  console.log(
    `${flag ? "!" : " "} p ${p.toFixed(4)}  British gate ${f(row.g[0])} shown ${f(row.g[2])} drawn ${drawn[0]}/${present[0]} label "${lb.text}" ${f(lb.opacity)}  combined gate ${f(row.g[1])} shown ${f(row.g[3])} drawn ${drawn[1]}/${present[1]} label "${lc.text}" ${f(lc.opacity)}`,
  );
}
console.log(`flagged rows: ${flagged}`);
await browser.close();
process.exit(flagged > 0 ? 1 : 0);
