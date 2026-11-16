// Do the fleets' lanterns hold steady on a scroll? (development only)
// Plays scene 2 frame by frame as a reader scrolling at SPEED CSS px a
// second would see it, at 60 frames a second (window.__road.lights(p) for
// each frame; the fleets' labels' own clock held to a sixtieth of a second
// a frame, window.__road.labelClock, so they move as a reader sees them
// and the lanterns give way to them as they do), and for each lantern (a
// ship's stern, top or mizzen light) reports:
//   jerk   its intensity changing by more than JUMP (0.25) from one frame
//          to the next;
//   blink  its intensity dipping from 0.5 or more to under DIP (0.15) and
//          coming back to 0.5 within BLINK seconds (0.5), or coming up to
//          0.5 from under DIP and going back within that;
//   slide  its place against its ship's place in the story (both projected
//          with the frame's camera) changing its pace by more than SLIDE
//          CSS px (1) from one frame to the next (the second difference:
//          its point on her jumping, not drifting as she grows nearer).
//   node scripts/dev/lights-scroll.mjs 0.9 0.98 300
//   node scripts/dev/lights-scroll.mjs 0.98 0.9 800   (scrolling back)
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, JUMP, DIP,
// BLINK, SLIDE, QUIET (1: the counts only).
import { chromium } from "@playwright/test";
import { waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [from, to, speed] = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const JUMP = Number(process.env.JUMP ?? 0.25);
const DIP = Number(process.env.DIP ?? 0.15);
const BLINK = Number(process.env.BLINK ?? 0.5);
const SLIDE = Number(process.env.SLIDE ?? 1);
const quiet = process.env.QUIET === "1";
const FPS = 60;
const PLACES = ["stern", "top", "mizzen"];
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
    const pxPerP =
      Math.abs(road.scrollFor(to) - road.scrollFor(from)) / Math.abs(to - from);
    const dp = (Math.sign(to - from) * speed) / FPS / pxPerP;
    road.labelClock?.(1 / FPS);
    const frames = [];
    // A second at rest first, so the labels have settled where it starts.
    for (let k = 0; k < FPS; k++) road.lights(from);
    for (let p = from; (to - p) * Math.sign(to - from) > -1e-9; p += dp) {
      const r = road.lights(p);
      const S = r.stride;
      const lights = [];
      for (let i = 0; i < r.lights.length / S; i++) {
        const l = r.lights.slice(i * S, i * S + S);
        const ship = r.ships[i];
        lights.push({
          key: `${l[8]}:${l[7]}:${l[9]}`,
          name: `${ship.name} ${["stern", "top", "mizzen"][l[9]]}`,
          I: l[4],
          ox: l[5] - ship.fx,
          oy: l[6] - ship.fy,
        });
      }
      // What made each one's showing (Lights.explain): its spacing, the
      // lettering (one layer of ships, the fleets').
      const why = {};
      for (const w of r.why) why[`0:${w.mark}:${w.place}`] = [w.space, w.text];
      frames.push({ p, lights, why });
    }
    road.labelClock?.(null);
    return { pxPerP, frames };
  },
  { from, to, speed, FPS },
);
await browser.close();

const { frames, pxPerP } = series;
const keys = [...new Set(frames.flatMap((f) => f.lights.map((l) => l.key)))];
let jerks = 0;
let blinks = 0;
let slides = 0;
const at = (k) => `p ${frames[k].p.toFixed(4)} (${(k / FPS).toFixed(2)} s)`;
const span = Math.round(BLINK * FPS);
for (const key of keys) {
  const own = frames.map((f) => f.lights.find((l) => l.key === key) ?? null);
  const I = own.map((l) => l?.I ?? 0);
  const name = own.find(Boolean)?.name ?? key;
  const notes = [];
  for (let k = 1; k < I.length; k++) {
    if (Math.abs(I[k] - I[k - 1]) > JUMP) {
      jerks++;
      notes.push(`jerk ${at(k)}: ${I[k - 1].toFixed(2)} -> ${I[k].toFixed(2)}`);
    }
    for (const [hi, lo] of [
      [(x) => x >= 0.5, (x) => x < DIP],
      [(x) => x < DIP, (x) => x >= 0.5],
    ]) {
      if (!(hi(I[k - 1]) && !hi(I[k]))) continue;
      let reached = false;
      for (let j = k; j < Math.min(I.length, k + span); j++) {
        if (lo(I[j])) reached = true;
        if (hi(I[j])) {
          if (reached) {
            blinks++;
            // What took it down: its spacing, or the lettering.
            let space = 1;
            let text = 1;
            for (let i = k; i <= j; i++) {
              const w = frames[i].why[key];
              if (w) {
                space = Math.min(space, w[0]);
                text = Math.min(text, w[1]);
              }
            }
            notes.push(
              `blink ${at(k)}: for ${((j - k) / FPS).toFixed(2)} s (spacing down to ${space.toFixed(2)}, lettering to ${text.toFixed(2)})`,
            );
          }
          break;
        }
      }
    }
    const z = own[k - 2];
    const a = own[k - 1];
    const b = own[k];
    if (z && a && b && z.I > 0.05 && a.I > 0.05 && b.I > 0.05) {
      const d = Math.hypot(b.ox - 2 * a.ox + z.ox, b.oy - 2 * a.oy + z.oy);
      if (d > SLIDE) {
        slides++;
        notes.push(`slide ${at(k)}: ${d.toFixed(1)} px`);
      }
    }
  }
  if (notes.length && !quiet) {
    console.log(`${name}: ${notes.length} flagged`);
    for (const n of notes.slice(0, 8)) console.log(`  ${n}`);
  }
}
console.log(
  `${frames.length} frames (${(frames.length / FPS).toFixed(1)} s at ${speed} px/s, ${Math.round(pxPerP)} px per p), ${keys.length} lanterns: ${jerks} jerks, ${blinks} blinks, ${slides} slides`,
);
void PLACES;
