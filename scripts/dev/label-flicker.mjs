// Do the fleets' head labels flicker on a scroll? (development only) Plays
// scene 2 frame by frame as a reader scrolling at SPEED CSS px a second
// would see it, at 60 frames a second (window.__road.labels(p) for each
// frame; the labels' own clock held to a sixtieth of a second a frame,
// window.__road.labelClock), and for each head label reports:
//   jerk   its opacity (all its drawings together) changing by more than
//          JUMP (0.25) from one frame to the next;
//   blink  its opacity dipping from 0.5 or more to under DIP (0.25) and
//          coming back to 0.5 within BLINK seconds (0.5), or coming up to
//          0.5 from under DIP and going back within that;
//   flick  a move from one place to another less than DWELL seconds (0.5)
//          after the move before (the place of its strongest drawing, shown
//          at 0.2 or more);
// and how long each figure is read (the label at 0.5 or more and the
// figure holding 0.9 or more of it), in seconds and in CSS px of scroll,
// those under READ seconds (0.8) at this speed flagged "?".
//   node scripts/dev/label-flicker.mjs 0.655 0.84 3000
//   node scripts/dev/label-flicker.mjs 0.84 0.655 3000   (scrolling back)
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, JUMP, DIP,
// BLINK, DWELL, READ, QUIET (1: the counts only).
import { chromium } from "@playwright/test";
import { waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [from, to, speed] = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const JUMP = Number(process.env.JUMP ?? 0.25);
const DIP = Number(process.env.DIP ?? 0.25);
const BLINK = Number(process.env.BLINK ?? 0.5);
const DWELL = Number(process.env.DWELL ?? 0.5);
const READ = Number(process.env.READ ?? 0.8);
const quiet = process.env.QUIET === "1";
const FPS = 60;
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
const series = await page.evaluate(
  ({ from, to, speed, FPS }) => {
    const road = window.__road;
    // Scroll per unit of p over the stretch (no interlude inside these).
    const pxPerP = road.scrollFor
      ? Math.abs(road.scrollFor(to) - road.scrollFor(from)) /
        Math.abs(to - from)
      : 30 * window.innerHeight;
    const dp = (Math.sign(to - from) * speed) / FPS / pxPerP;
    road.labelClock?.(1 / FPS);
    const frames = [];
    // A second at rest first, so the labels have settled where it starts.
    for (let k = 0; k < FPS; k++) road.labels(from);
    for (let p = from; (to - p) * Math.sign(to - from) > -1e-9; p += dp) {
      road.labels(p);
      frames.push({
        p,
        labels: road.routeLabels(false).map((l) => ({
          id: l.id,
          text: l.text,
          opacity: l.opacity,
          slot: l.slot ?? -1,
          share: l.share ?? 1,
        })),
      });
    }
    road.labelClock?.(null);
    return { pxPerP, frames };
  },
  { from, to, speed, FPS },
);
await browser.close();

const { frames, pxPerP } = series;
const ids = [...new Set(frames.flatMap((f) => f.labels.map((l) => l.id)))];
let jerks = 0;
let blinks = 0;
let flicks = 0;
const t = (k) => (k / FPS).toFixed(2);
const at = (k) => `p ${frames[k].p.toFixed(4)} (${t(k)} s)`;
for (const id of ids) {
  const sum = frames.map((f) =>
    f.labels.filter((l) => l.id === id).reduce((n, l) => n + l.opacity, 0),
  );
  const top = frames.map((f) => {
    const own = f.labels.filter((l) => l.id === id);
    return own.length
      ? own.reduce((a, b) => (b.opacity > a.opacity ? b : a))
      : null;
  });
  const notes = [];
  // Jerks.
  for (let k = 1; k < sum.length; k++)
    if (Math.abs(sum[k] - sum[k - 1]) > JUMP) {
      jerks++;
      notes.push(
        `jerk ${at(k)}: ${sum[k - 1].toFixed(2)} -> ${sum[k].toFixed(2)}`,
      );
    }
  // Blinks: down and back up, or up and back down, within BLINK seconds.
  const span = Math.round(BLINK * FPS);
  for (let k = 1; k < sum.length; k++) {
    if (sum[k - 1] >= 0.5 && sum[k] < 0.5) {
      let low = sum[k];
      for (let j = k; j < Math.min(sum.length, k + span); j++) {
        low = Math.min(low, sum[j]);
        if (sum[j] >= 0.5) {
          if (low < DIP) {
            blinks++;
            notes.push(
              `blink ${at(k)}: down to ${low.toFixed(2)} for ${((j - k) / FPS).toFixed(2)} s`,
            );
          }
          break;
        }
      }
    }
    if (sum[k - 1] < DIP && sum[k] >= DIP) {
      let high = sum[k];
      for (let j = k; j < Math.min(sum.length, k + span); j++) {
        high = Math.max(high, sum[j]);
        if (sum[j] < DIP) {
          if (high >= 0.5) {
            blinks++;
            notes.push(
              `flash ${at(k)}: up to ${high.toFixed(2)} for ${((j - k) / FPS).toFixed(2)} s`,
            );
          }
          break;
        }
      }
    }
  }
  // Moves between places, and the time at each.
  let place = -1;
  let lastMove = -Infinity;
  let moves = 0;
  for (let k = 0; k < top.length; k++) {
    const l = top[k];
    const here = l && l.opacity >= 0.2 ? l.slot : -1;
    if (here < 0) continue;
    if (place >= 0 && here !== place) {
      moves++;
      if ((k - lastMove) / FPS < DWELL) {
        flicks++;
        notes.push(
          `flick ${at(k)}: place ${place} -> ${here} after ${((k - lastMove) / FPS).toFixed(2)} s`,
        );
      }
      lastMove = k;
    }
    place = here;
  }
  // Each figure's time read.
  const reads = [];
  let cur = null;
  for (let k = 0; k < top.length; k++) {
    const l = top[k];
    const text = l && sum[k] >= 0.5 && l.share >= 0.9 ? l.text : null;
    if (text && cur && cur.text === text) cur.n++;
    else if (text) {
      cur = { text, n: 1, k };
      reads.push(cur);
    } else cur = null;
  }
  const figures = reads.map((r) => {
    const s = r.n / FPS;
    return `${s < READ ? "?" : " "}${r.text.replace(/^.*?, /, "")} ${s.toFixed(2)} s ${Math.round((r.n * speed) / FPS)} px`;
  });
  console.log(`${id}: ${moves} moves; ${notes.length} flagged`);
  if (!quiet) for (const n of notes) console.log(`  ${n}`);
  if (figures.length) console.log(`  read: ${figures.join(" | ")}`);
}
console.log(
  `${frames.length} frames (${(frames.length / FPS).toFixed(1)} s at ${speed} px/s, ${Math.round(pxPerP)} px per p): ${jerks} jerks, ${blinks} blinks, ${flicks} flicks`,
);
