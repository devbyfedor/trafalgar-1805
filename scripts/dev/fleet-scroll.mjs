// The owner's rule on a reader's scroll (development only): a fleet in the
// frame shows as a readable label or as its ships, never neither (12
// November 2026). fleet-frame.mjs judges each p as the labels settle there
// (their clock made instant); a reader's labels move by their own clock
// (HeadLabels: a place must hold a while before the label takes it), so on
// a scroll a label can be out where a settled frame shows it. This plays
// scene 2 frame by frame as a reader scrolling at SPEED CSS px a second
// sees it, 60 frames a second (window.__road.gates(p) for each frame, the
// labels' clock held to a sixtieth of a second, labelClock), and for each
// October fleet, frame by frame: its ships of the line in the frame
// (fleetAt, cameraAt: their places on the sea projected with the frame's
// camera, drawn or not), its label's opacity (routeLabels, all its
// drawings), how much of its ships show (gateShown). A frame is flagged
// where a fleet has ships in the frame, its label under half and its
// ships under half; flagged frames are reported as stretches (p, CSS px
// of scroll, seconds at this speed).
//   node scripts/dev/fleet-scroll.mjs 0.655 0.84 800
//   node scripts/dev/fleet-scroll.mjs 0.84 0.655 800   (scrolling back)
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, QUIET=1 (the
// stretches only), MIN (ships in the frame for a fleet to count, 1).
import { chromium } from "@playwright/test";
import { waitForRoad } from "./road-scroll.mjs";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [from, to, speed] = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const MIN = Number(process.env.MIN ?? 1);
const FPS = 60;
/** The fleets' ships that are not of the line (as fleet-frame.mjs). */
const SMALL = [
  "Euryalus",
  "Naiad",
  "Phoebe",
  "Sirius",
  "Pickle",
  "Entreprenante",
  "Weazle",
  "Hermione",
  "Hortense",
  "Rhin",
  "Thémis",
  "Cornélie",
  "Argus",
  "Furet",
  "Observateur",
];
/** The British ships come first in the fleets' layer (as fleet-frame.mjs). */
const BRITISH_COUNT = 34;
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
await page.goto(`${base}/?quality=0`);
await waitForRoad(page, { timeout: 180_000 });
const { frames, pxPerP } = await page.evaluate(
  ({ from, to, speed, FPS, SMALL, BRITISH_COUNT }) => {
    const road = window.__road;
    const names = road.glyphNames()[0];
    const small = new Set(SMALL);
    const pxPerP =
      Math.abs(road.scrollFor(to) - road.scrollFor(from)) / Math.abs(to - from);
    const dp = (Math.sign(to - from) * speed) / FPS / pxPerP;
    road.labelClock(1 / FPS);
    const project = (cam, x, y) => {
      const v = cam.view;
      const P = cam.projection;
      const vx = v[0] * x + v[4] * y + v[12];
      const vy = v[1] * x + v[5] * y + v[13];
      const vz = v[2] * x + v[6] * y + v[14];
      const vw = v[3] * x + v[7] * y + v[15];
      const cx = P[0] * vx + P[4] * vy + P[8] * vz + P[12] * vw;
      const cy = P[1] * vx + P[5] * vy + P[9] * vz + P[13] * vw;
      const cw = P[3] * vx + P[7] * vy + P[11] * vz + P[15] * vw;
      if (cw <= 0) return false;
      return Math.abs(cx / cw) <= 1 && Math.abs(cy / cw) <= 1;
    };
    const frames = [];
    // A second at rest first, so the labels have settled where it starts.
    for (let k = 0; k < FPS; k++) road.gates(from);
    for (let p = from; (to - p) * Math.sign(to - from) > -1e-9; p += dp) {
      const g = road.gates(p);
      const labels = road.routeLabels(false);
      const cam = road.cameraAt(p);
      const present = road.fleetAt(p);
      // The chain's ships apart from the fleet (the owner's exception).
      const apart = road.apartAt ? road.apartAt(p) : [];
      const inFrame = [0, 0];
      for (let i = 0; i < names.length; i++) {
        if (small.has(names[i])) continue;
        if ((apart[i] ?? 0) >= 0.5) continue;
        const o = present[i * 3 + 2];
        if (!(o > 0.5)) continue;
        const side = i < BRITISH_COUNT ? 0 : 1;
        if (project(cam, present[i * 3], present[i * 3 + 1])) inFrame[side]++;
      }
      const label = [0, 0];
      for (const l of labels) {
        if (l.id === "fleet-british") label[0] += l.opacity;
        if (l.id === "fleet-combined") label[1] += l.opacity;
      }
      frames.push({ p, inFrame, label, ships: [g[2], g[3]] });
    }
    road.labelClock(null);
    return { frames, pxPerP };
  },
  { from, to, speed, FPS, SMALL, BRITISH_COUNT },
);
await browser.close();

const sideName = ["British", "combined"];
let total = 0;
for (const side of [0, 1]) {
  const runs = [];
  let run = null;
  frames.forEach((f, k) => {
    const bad =
      f.inFrame[side] >= MIN && f.label[side] < 0.5 && f.ships[side] < 0.5;
    if (bad) {
      if (!run) {
        run = { k0: k, k1: k, worst: f };
        runs.push(run);
      } else run.k1 = k;
      if (
        f.label[side] + f.ships[side] <
        run.worst.label[side] + run.worst.ships[side]
      )
        run.worst = f;
    } else run = null;
  });
  for (const r of runs) {
    const n = r.k1 - r.k0 + 1;
    total += n;
    const w = r.worst;
    console.log(
      `${sideName[side]}: p ${frames[r.k0].p.toFixed(4)}-${frames[r.k1].p.toFixed(4)}, ${n} frames (${(n / FPS).toFixed(2)} s, ${Math.round((n * speed) / FPS)} px): ships in frame ${w.inFrame[side]}, label ${w.label[side].toFixed(2)}, ships shown ${w.ships[side].toFixed(2)} at worst`,
    );
  }
  if (process.env.QUIET !== "1") {
    // Every 0.005 of p: the label's and the ships' least and most.
    const bins = new Map();
    for (const f of frames) {
      if (f.inFrame[side] < MIN) continue;
      const b = (Math.floor(f.p / 0.005) * 0.005).toFixed(3);
      const e = bins.get(b) ?? {
        lo: 9,
        hi: 0,
        slo: 9,
        shi: 0,
        n: f.inFrame[side],
      };
      e.lo = Math.min(e.lo, f.label[side]);
      e.hi = Math.max(e.hi, f.label[side]);
      e.slo = Math.min(e.slo, f.ships[side]);
      e.shi = Math.max(e.shi, f.ships[side]);
      bins.set(b, e);
    }
    for (const [b, e] of bins)
      console.log(
        `  ${sideName[side]} p ${b}: in frame ${e.n}, label ${e.lo.toFixed(2)}-${e.hi.toFixed(2)}, ships ${e.slo.toFixed(2)}-${e.shi.toFixed(2)}`,
      );
  }
}
console.log(
  `${frames.length} frames (${(frames.length / FPS).toFixed(1)} s at ${speed} px/s, ${Math.round(pxPerP)} px per p): ${total} frames with a fleet in the frame showing neither`,
);
