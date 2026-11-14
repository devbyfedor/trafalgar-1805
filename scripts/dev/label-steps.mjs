// Do the fleets' head labels jerk? (development only) Over fine steps of
// scene 2's progress, each head label's drawings (window.__road.routeLabels:
// text, opacity, outline) are matched from one step to the next by their
// place on screen, and a row is flagged where a drawing's opacity changes
// by more than JUMP (0.25) in one step, or a drawing that shows at SHOWN
// (0.2) or more in both steps moves more than SLIDE (6 CSS px) against the
// chart's own drift (the label's site, its outline's middle, compared with
// the step before): a label crossfades between places, it never slides or
// pops. Each p is drawn by the page's own map at that p (window.__road.
// labels(p) draws the scene there without scrolling).
//   node scripts/dev/label-steps.mjs 0.66 0.84 0.0005
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, JUMP, SLIDE.
import { chromium } from "@playwright/test";
import { waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [from, to, step] = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const JUMP = Number(process.env.JUMP ?? 0.25);
const SLIDE = Number(process.env.SLIDE ?? 6);
const SHOWN = 0.2;
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
const mid = (q) => [(q[0] + q[4]) / 2, (q[1] + q[5]) / 2];
let prev = null;
let flagged = 0;
let steps = 0;
let worstJump = 0;
for (let k = 0; ; k++) {
  const p = Math.round((from + k * step) * 1e6) / 1e6;
  if (p > to + 1e-9) break;
  const labels = await page.evaluate((p) => {
    window.__road.labels(p);
    return window.__road.routeLabels(false);
  }, p);
  steps++;
  if (prev) {
    // Per head, the summed opacity and each drawing's move.
    const ids = new Set([...labels, ...prev].map((l) => l.id));
    for (const id of ids) {
      const a = prev.filter((l) => l.id === id);
      const b = labels.filter((l) => l.id === id);
      const sa = a.reduce((n, l) => n + l.opacity, 0);
      const sb = b.reduce((n, l) => n + l.opacity, 0);
      const jump = Math.abs(sb - sa);
      worstJump = Math.max(worstJump, jump);
      const notes = [];
      if (jump > JUMP)
        notes.push(`opacity ${sa.toFixed(2)} -> ${sb.toFixed(2)}`);
      for (const l of b) {
        if (l.opacity < SHOWN) continue;
        const [x, y] = mid(l.quad);
        let near = Infinity;
        for (const m of a) {
          if (m.opacity < SHOWN) continue;
          const [px, py] = mid(m.quad);
          near = Math.min(near, Math.hypot(x - px, y - py));
        }
        if (Number.isFinite(near) && near > SLIDE && near < 120)
          notes.push(`moved ${near.toFixed(1)} px at ${l.opacity.toFixed(2)}`);
      }
      if (notes.length) {
        flagged++;
        console.log(`p ${p.toFixed(4)} ${id}: ${notes.join("; ")}`);
      }
    }
  }
  prev = labels;
}
console.log(
  `${steps} steps, ${flagged} flagged; the largest step in a head's opacity ${worstJump.toFixed(3)}`,
);
await browser.close();
