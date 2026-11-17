// Proves that the relay's day signals of 19 October (scenes/02-road/
// signals.ts: the hoists at the links' trucks, fx/Hoists.ts, and their guns'
// puffs, a smoke of their own) stand where they should: every flag at a
// link of the chain and on her drawing, clear of every name, the fleets'
// labels, the tracks' dates and the caption's card; every puff on open sea
// and clear of the same; nothing outside the relay's stretch. Sweeps scene 2
// in small steps of its progress at one or more viewport sizes; at each
// step the page draws the scene (window.__road.signals, RoadStage.signals)
// and returns each flag's box (Hoists.bounds), each puff's (Smoke.bounds),
// the coast's distance under each puff, each link as the layout drew her
// and the outlines of the lettering. The labels' and the hoists' clocks make
// every move at once (labelClock), and each p is drawn twice, so they stand
// settled.
//   node scripts/dev/signals-clear.mjs [from] [to] [step]
// Defaults: 0.70 to 0.86 every 0.0005 (from before the relay's first hoist,
// about 0.764, past its last, the Victory's, gone with the October fleets
// as they leave the story). Environment: BASE (default http://127.0.0.1:3000; the
// production preview is http://127.0.0.1:4173), SIZES (default
// "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"), SEEN (the least
// product of a mark's and an outline's opacity that counts, 0.02), LAND_KM
// (the least distance from the coast under a puff, 2), SHIP_PX (how far a
// flag may stand outside her glyph's box, CSS px, 2), SPAN (the p range a
// signal may show in, "0.76,0.836": the relay ends with the October fleets
// leaving the story, 0.826 to 0.833), JSON=<file> for every step's counts.
// A step fails where a flag or a puff shown overlaps an outline shown by
// more than half a px², a puff stands within LAND_KM of land, a flag stands
// off her ship or at a ship that is not a link, or anything shows outside
// SPAN. Reported, not failed: each hoist's largest change of opacity from
// one step to the next. Exits with 1 if any step fails, or if a sweep
// across the long run (0.78 to 0.80) draws no flag.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.7);
const to = Number(process.argv[3] ?? 0.86);
const step = Number(process.argv[4] ?? 0.0005);
const seen = Number(process.env.SEEN ?? 0.02);
const landKm = Number(process.env.LAND_KM ?? 2);
const shipPx = Number(process.env.SHIP_PX ?? 2);
const span = (process.env.SPAN ?? "0.76,0.836").split(",").map(Number);
// The long run west, where the chain's ships of the line show their hoists:
// a sweep across it must draw flags.
const LONG_RUN = [0.78, 0.8];
const sizes = (
  process.env.SIZES ?? "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"
)
  .split(",")
  .map((s) => {
    const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(s.trim());
    if (!m) throw new Error(`bad size ${s}`);
    return { width: +m[1], height: +m[2], scale: Number(m[3] ?? 1) };
  });
const ps = [];
for (let k = 0; ; k++) {
  const p = +(from + k * step).toFixed(6);
  if (p > to + 1e-9) break;
  ps.push(p);
}

/** The area where a convex quad (8 numbers) and a box overlap, px². */
function overlap(quad, x0, y0, x1, y1) {
  let poly = [];
  for (let i = 0; i < 4; i++) poly.push([quad[2 * i], quad[2 * i + 1]]);
  const clip = (inside, cut) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ia = inside(a);
      const ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    poly = out;
  };
  const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  clip(
    (q) => q[0] >= x0,
    (a, b) => at(a, b, (x0 - a[0]) / (b[0] - a[0])),
  );
  clip(
    (q) => q[0] <= x1,
    (a, b) => at(a, b, (x1 - a[0]) / (b[0] - a[0])),
  );
  clip(
    (q) => q[1] >= y0,
    (a, b) => at(a, b, (y0 - a[1]) / (b[1] - a[1])),
  );
  clip(
    (q) => q[1] <= y1,
    (a, b) => at(a, b, (y1 - a[1]) / (b[1] - a[1])),
  );
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

const browser = await chromium.launch({ channel: "chromium" });
const rows = [];
let failed = 0;
for (const size of sizes) {
  const page = await browser.newPage({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
  });
  await page.goto(`${base}/?quality=0`);
  await page.waitForFunction(
    () => window.__road?.ready && window.__road.baked,
    null,
    { timeout: 180_000 },
  );
  await page.evaluate(() =>
    window.__road.labelClock?.(Number.POSITIVE_INFINITY),
  );
  const label = `${size.width}x${size.height}@${size.scale}`;
  let mostFlags = 0;
  let mostPuffs = 0;
  let flagsInRun = 0;
  let nearest = Number.POSITIVE_INFINITY;
  const hits = new Map();
  const bad = [];
  /** Per link: the p range her flags showed at half or more. */
  const shown = new Map();
  /** Per hoist id: its opacity at the last step, and its largest change. */
  const last = new Map();
  const jump = new Map();
  for (const p of ps) {
    const r = await page.evaluate((p) => {
      window.__road.signals(p);
      return window.__road.signals(p);
    }, p);
    const nf = r.flags.length / r.stride;
    const np = r.puffs.length / 5;
    mostFlags = Math.max(mostFlags, nf);
    mostPuffs = Math.max(mostPuffs, np);
    if (p >= LONG_RUN[0] && p <= LONG_RUN[1]) flagsInRun += nf;
    const links = new Map(r.links.map((l) => [l.mark, l]));
    let overlaps = 0;
    let land = 0;
    let offShip = 0;
    let notLink = 0;
    let outside = 0;
    const marks = [];
    for (let i = 0; i < nf; i++) {
      const o = i * r.stride;
      const [x0, y0, x1, y1, a, mark, , , id] = r.flags.slice(o, o + r.stride);
      marks.push({ kind: "flag", box: [x0, y0, x1, y1], a });
      const ship = links.get(mark);
      const name = r.names[mark] ?? String(mark);
      if (a > seen && (p < span[0] || p > span[1])) outside++;
      if (!ship) {
        if (a > seen) notLink++;
        continue;
      }
      if (a >= 0.5) {
        const s = shown.get(name) ?? { from: p, to: p };
        s.to = p;
        shown.set(name, s);
      }
      // Her glyph's box about her foot, as the labels keep clear of it
      // (HeadLabels): 0.6 of her height either side, her height above.
      if (a > seen && Number.isFinite(ship.x)) {
        const h = ship.height;
        const gx0 = ship.x - 0.6 * h - shipPx;
        const gx1 = ship.x + 0.6 * h + shipPx;
        const gy0 = ship.y - 1.05 * h - shipPx;
        const gy1 = ship.y + shipPx;
        if (x0 < gx0 || x1 > gx1 || y0 < gy0 || y1 > gy1) offShip++;
      }
      const was = last.get(id);
      if (was !== undefined)
        jump.set(
          id,
          Math.max(
            jump.get(id) ?? 0,
            Math.abs(a - was.a),
            was.name === name ? 0 : 1,
          ),
        );
      last.set(id, { a, name });
    }
    for (let i = 0; i < np; i++) {
      const [x0, y0, x1, y1, a] = r.puffs.slice(5 * i, 5 * i + 5);
      marks.push({ kind: "puff", box: [x0, y0, x1, y1], a });
      const c = r.puffCoast[i];
      if (Number.isFinite(c)) nearest = Math.min(nearest, c);
      if (a > seen && !(c >= landKm)) land++;
      if (a > seen && (p < span[0] || p > span[1])) outside++;
    }
    for (const m of marks) {
      const [x0, y0, x1, y1] = m.box;
      for (const t of r.text) {
        if (!(t.weight * m.a > seen)) continue;
        const area = overlap(t.quad, x0, y0, x1, y1);
        if (area > 0.5) {
          overlaps++;
          const key = `${m.kind} on ${t.kind} at (${t.quad[0].toFixed(0)}, ${t.quad[1].toFixed(0)})`;
          const h = hits.get(key) ?? { n: 0, area: 0, from: p, to: p };
          h.n++;
          h.area = Math.max(h.area, area);
          h.to = p;
          hits.set(key, h);
        }
      }
    }
    const fails = overlaps + land + offShip + notLink + outside;
    if (fails)
      bad.push(
        `${p.toFixed(4)} (${[
          overlaps && `${overlaps} overlaps`,
          land && `${land} puffs on land`,
          offShip && `${offShip} flags off their ship`,
          notLink && `${notLink} flags at no link`,
          outside && `${outside} outside the relay`,
        ]
          .filter(Boolean)
          .join(", ")})`,
      );
    rows.push({
      size: label,
      p,
      flags: nf,
      puffs: np,
      overlaps,
      land,
      offShip,
      notLink,
      outside,
    });
  }
  if (from <= LONG_RUN[0] && to >= LONG_RUN[1] && flagsInRun === 0)
    bad.push(`no flag drawn over ${LONG_RUN.join("..")}`);
  failed += bad.length;
  console.log(
    `${label}: ${ps.length} steps ${from}..${to}, at most ${mostFlags} flags and ${mostPuffs} puffs; nearest coast under a puff ${nearest.toFixed(1)} km; steps failing ${bad.length}`,
  );
  console.log(
    `  shown at half or more: ${[...shown].map(([n, s]) => `${n} ${s.from}..${s.to}`).join(", ")}`,
  );
  const jumps = [...jump].filter(([, j]) => j > 0.25);
  console.log(
    `  hoists changing by more than 0.25 between steps: ${jumps.length ? jumps.map(([id, j]) => `${id} ${j.toFixed(2)}`).join(", ") : "none"}`,
  );
  if (bad.length) console.log(`  ${bad.slice(0, 40).join(", ")}`);
  for (const [k, h] of hits)
    console.log(
      `  ${k}: ${h.n} mark-steps, p ${h.from}..${h.to}, largest overlap ${h.area.toFixed(1)} px²`,
    );
  await page.close();
}
await browser.close();
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
process.exit(failed ? 1 : 0);
