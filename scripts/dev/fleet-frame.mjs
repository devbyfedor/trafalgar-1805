// Is a fleet in the frame where its label is weak and its ships don't show?
// The owner's rule (12 November 2026): a fleet in the frame shows as a
// readable label or as its ships, never neither. At each p, for each side
// of the October fleets: how many of its ships of the line are with the
// fleet then (window.__road.fleetAt), how many of those stand in the frame
// (their places on the sea projected with the frame's own camera,
// cameraAt, whether drawn or not), how many are drawn at half opacity or
// more (sample), its label's opacity (routeLabels) and its best place's
// room and what limits it (routeLabels(true): on the frame, clean ground,
// clear of the names and the card, of the labels before it, of the tracks,
// of its own block). A row is flagged (!) where a side has ships in the
// frame, its label under half and none drawn. Development only.
//   node scripts/dev/fleet-frame.mjs <p> [<p> ...]
//   node scripts/dev/fleet-frame.mjs --range <from> <to> <step>
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const argv = process.argv.slice(2);
let ps = [];
if (argv[0] === "--range") {
  const [from, to, step] = argv.slice(1).map(Number);
  for (let k = 0; k <= Math.round((to - from) / step); k++)
    ps.push(Math.round((from + k * step) * 1e6) / 1e6);
} else ps = argv.map(Number);

/** The fleets' ships that are not of the line (as fleet-gates.mjs). */
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
const BRITISH_COUNT = 34;
const WHY = ["room", "frame", "ground", "names", "labels", "tracks", "block"];

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

function project(cam, x, y) {
  const v = cam.view;
  const P = cam.projection;
  // Column-major 4x4 (three.js elements).
  const vx = v[0] * x + v[4] * y + v[12];
  const vy = v[1] * x + v[5] * y + v[13];
  const vz = v[2] * x + v[6] * y + v[14];
  const vw = v[3] * x + v[7] * y + v[15];
  const cx = P[0] * vx + P[4] * vy + P[8] * vz + P[12] * vw;
  const cy = P[1] * vx + P[5] * vy + P[9] * vz + P[13] * vw;
  const cw = P[3] * vx + P[7] * vy + P[11] * vz + P[15] * vw;
  if (cw <= 0) return null;
  return [cx / cw, cy / cw];
}

let flagged = 0;
for (const p of ps) {
  const row = await page.evaluate((p) => {
    const g = window.__road.gates(p);
    const v = Array.from(window.__road.sample(p, 0).fleets);
    const labels = window.__road.routeLabels(false);
    const explain = window.__road.routeLabels(true);
    const present = Array.from(window.__road.fleetAt(p));
    const cam = window.__road.cameraAt(p);
    return { g, v, labels, explain, present, cam };
  }, p);
  const out = [];
  let flag = false;
  for (const [side, id] of [
    [0, "fleet-british"],
    [1, "fleet-combined"],
  ]) {
    let present = 0;
    let inFrame = 0;
    let drawn = 0;
    for (let i = 0; i < names.length; i++) {
      if (SMALL.has(names[i]) || (i < BRITISH_COUNT ? 0 : 1) !== side) continue;
      const [x, y, o] = row.present.slice(i * 3, i * 3 + 3);
      if (!(o > 0.5)) continue;
      present++;
      const ndc = project(row.cam, x, y);
      if (ndc && Math.abs(ndc[0]) <= 1 && Math.abs(ndc[1]) <= 1) inFrame++;
      const [sx, sy, , a] = row.v.slice(i * 4, i * 4 + 4);
      const on =
        sx >= 0 && sy >= 0 && sx <= width * scale && sy <= height * scale;
      if (on && a >= 0.5) drawn++;
    }
    let label = 0;
    for (const l of row.labels) if (l.id === id) label += l.opacity;
    let best = null;
    for (const s of row.explain)
      if (s.id === id && (!best || s.weight > best.weight)) best = s;
    const limits = best
      ? best.why
          .map((w, k) => [WHY[k], w])
          .slice(1)
          .filter(([, w]) => w < 0.95)
          .map(([n, w]) => `${n} ${w.toFixed(2)}`)
          .join(", ") || "none"
      : "no place";
    const bad = inFrame > 0 && label < 0.5 && drawn === 0;
    flag ||= bad;
    out.push(
      `${side ? "combined" : "British"} ${present} present, ${inFrame} in frame, ${drawn} drawn, gate ${row.g[side].toFixed(2)}, label ${label.toFixed(2)}${best ? ` (best place ${best.side}${best.own ? " own" : ""}, room ${best.why[0].toFixed(2)}; limited by ${limits})` : " (no place tried)"}`,
    );
  }
  if (flag) flagged++;
  console.log(`${flag ? "!" : " "} p ${p.toFixed(4)}  ${out.join("  |  ")}`);
}
console.log(`flagged rows: ${flagged}`);
await browser.close();
process.exit(flagged ? 1 : 0);
