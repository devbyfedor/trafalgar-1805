// Proves that the fleets' lanterns at night stand where they should and
// keep clear of the lettering. Sweeps scene 2 over the night in small
// steps of its progress, at one or more viewport sizes; at each step the
// page draws the scene (window.__road.lights, RoadStage.lights) and
// returns each lantern as drawn (Lights.bounds: the box of its halo and
// reflection, its intensity, its centre, its ship and its place on her),
// the coast's distance under it, its ship as the layout drew her this
// frame, the night's share of the light and the outlines of the lettering.
// The labels' clock makes every move at once (HeadLabels.setClock), and
// each p is drawn twice, so they stand settled. A step fails where:
//   - a lantern shows while the chart is not in the dark (night <= NIGHT),
//     but the combined fleet's in the night beat (from p NIGHT_BEAT), which
//     burn faintly into the scene's last frame (session 34: the owner's
//     answer of 16 November 2026), or any before the night beat;
//   - a lantern of the combined fleet shows brighter than the night lets it
//     (lanterns.ts: whole while the chart's night share is DIM_FROM or
//     more, down to FAINT as it falls to none; dim() below, written apart);
//   - a lantern's centre lies over land or within LAND_KM of it;
//   - a lantern, its halo or its reflection, comes within GAP CSS px of a
//     name, label or the caption's card shown at TEXT (0.5, the readable
//     half) or more (Lights.ts, lightClear: they give way wholly from
//     there), or of a track's date (the lights do not give way to dates:
//     one standing on a light would be a clash of the choreography);
//   - a lantern stands off its ship: where the layout drew her, its centre
//     outside her glyph's box (her foot, her height, as wide as tall
//     either side) by more than 2 px;
//   - two lanterns shown at BRIGHT or more of what the night lets them
//     (dim) stand nearer than SPACE px of a 720 px tall screen (the
//     lanterns' sizes and spacing are set by the screen's height:
//     Lights.ts, LIGHT_SCREEN_H; SPACE CSS px times height / 720),
//     whatever thins them (Lights.ts, SPACE_PX: a light gives way only to
//     its line's lights of a higher rank, a top or mizzen light to every
//     one; two of other lines or fleets meeting would be a defect too);
//   - no lantern is drawn at all over a sweep that takes in 0.93 to 0.95,
//     the heart of the night.
// Reported, not failed: lanterns placed while their fleet is not laid out
// (far off, at their ships' places in the story); a lantern's intensity
// changing by more than POP from one step to the next; a lantern moving
// from one step to the next by more than MOVE CSS px against the middle
// move of the lanterns of its layer (its ship's point jumping on her).
//   node scripts/dev/lights-clear.mjs [from] [to] [step]
// Defaults: 0.78 to 1 every 0.0005 (the night's light comes in from 0.79
// and is gone at 0.995; the combined fleet's lights burn faintly to 1).
// Environment: BASE (default http://127.0.0.1:3000;
// the production preview is http://127.0.0.1:4173), SIZES (default
// "1280x720@1.5,1920x1080@1,2560x1440@1,3440x1440@1"), SEEN (the least
// intensity that counts, 0.02), NIGHT (0.002), LAND_KM (0.5), GAP (0.5),
// TEXT (0.5), BRIGHT (0.5), SPACE (3.5), FAINT (0.55), DIM_FROM (0.35),
// NIGHT_BEAT (0.82), POP (0.35), MOVE (2), JSON=<file>
// for every step's counts. Exits with 1 if any step fails.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const from = Number(process.argv[2] ?? 0.78);
const to = Number(process.argv[3] ?? 1);
const step = Number(process.argv[4] ?? 0.0005);
const SEEN = Number(process.env.SEEN ?? 0.02);
const NIGHT = Number(process.env.NIGHT ?? 0.002);
const LAND_KM = Number(process.env.LAND_KM ?? 0.5);
const GAP = Number(process.env.GAP ?? 0.5);
const TEXT = Number(process.env.TEXT ?? 0.5);
const BRIGHT = Number(process.env.BRIGHT ?? 0.5);
const SPACE = Number(process.env.SPACE ?? 3.5);
const FAINT = Number(process.env.FAINT ?? 0.55);
const DIM_FROM = Number(process.env.DIM_FROM ?? 0.35);
const NIGHT_BEAT = Number(process.env.NIGHT_BEAT ?? 0.82);

/**
 * How far the night lets a lantern of a side show (lanterns.ts,
 * lanternsLit, by the chart's light): the British whole (they are out by
 * day), the combined fleet's dimmed to FAINT.
 */
function dim(side, night) {
  if (side !== "combined") return 1;
  const t = Math.min(1, Math.max(0, night / DIM_FROM));
  return FAINT + (1 - FAINT) * t * t * (3 - 2 * t);
}
const POP = Number(process.env.POP ?? 0.35);
const MOVE = Number(process.env.MOVE ?? 2);
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
const PLACES = ["stern", "top", "mizzen"];

function pointToSegment(px, py, ax, ay, bx, by) {
  const ex = bx - ax;
  const ey = by - ay;
  const l = ex * ex + ey * ey;
  const t =
    l > 0 ? Math.min(1, Math.max(0, ((px - ax) * ex + (py - ay) * ey) / l)) : 0;
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}

/**
 * The least distance between a convex quad and the vertical segment x =
 * cx, y0..y1; 0 where they meet (as Lights.ts measures it, written apart).
 */
function quadToColumn(q, cx, y0, y1) {
  let best = Number.POSITIVE_INFINITY;
  let in0 = true;
  let in1 = true;
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = [q[2 * k], q[2 * k + 1]];
    const [bx, by] = [q[(2 * k + 2) % 8], q[(2 * k + 3) % 8]];
    const s0 = (bx - ax) * (y0 - ay) - (by - ay) * (cx - ax);
    const s1 = (bx - ax) * (y1 - ay) - (by - ay) * (cx - ax);
    if (sign === 0) sign = Math.sign(s0) || Math.sign(s1);
    if (s0 * sign < 0) in0 = false;
    if (s1 * sign < 0) in1 = false;
    best = Math.min(
      best,
      pointToSegment(cx, y0, ax, ay, bx, by),
      pointToSegment(cx, y1, ax, ay, bx, by),
      Math.hypot(ax - cx, ay - Math.min(y1, Math.max(y0, ay))),
    );
    if ((ax - cx) * (bx - cx) <= 0 && ax !== bx) {
      const y = ay + ((cx - ax) / (bx - ax)) * (by - ay);
      if (y >= y0 && y <= y1) return 0;
    }
  }
  if (sign === 0) return best;
  return in0 || in1 ? 0 : best;
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
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
  const space = (SPACE * size.height) / 720;
  let most = 0;
  let nearest = Number.POSITIVE_INFINITY;
  let closest = Number.POSITIVE_INFINITY;
  let unlaid = 0;
  let firstLit = null;
  let lastLit = null;
  const bad = [];
  const kinds = new Map();
  const pops = [];
  const moves = [];
  let prev = null;
  const note = (kind, p, text) => {
    const k = kinds.get(kind) ?? { n: 0, from: p, to: p, text };
    k.n++;
    k.to = p;
    kinds.set(kind, k);
  };
  for (const p of ps) {
    const r = await page.evaluate((p) => {
      window.__road.lights(p);
      return window.__road.lights(p);
    }, p);
    const S = r.stride;
    const n = r.lights.length / S;
    const lights = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0, x1, y1, I, cx, cy, mark, layer, place] = r.lights.slice(
        i * S,
        i * S + S,
      );
      lights.push({
        x0,
        y0,
        x1,
        y1,
        I,
        cx,
        cy,
        mark,
        layer,
        place,
        i,
        name: `${r.ships[i].name} ${PLACES[place]}`,
      });
    }
    const shown = lights.filter((l) => l.I > SEEN);
    most = Math.max(most, shown.length);
    if (shown.length) {
      firstLit ??= p;
      lastLit = p;
    }
    let fails = 0;
    const byDay = shown.filter(
      (l) => r.ships[l.i].side !== "combined" || p < NIGHT_BEAT,
    );
    if (r.night <= NIGHT && byDay.length) {
      fails++;
      note("day", p, "a lantern while the chart is not in the dark");
    }
    const lets = (l) => dim(r.ships[l.i].side, r.night);
    for (const l of shown)
      if (l.I > lets(l) + 0.005) {
        fails++;
        note(
          `dawn:${r.ships[l.i].name}`,
          p,
          `${r.ships[l.i].name}'s lantern brighter than the night lets it (${l.I.toFixed(2)} against ${lets(l).toFixed(2)})`,
        );
      }
    for (const l of shown) {
      const ship = r.ships[l.i];
      const c = r.coast[l.i];
      if (Number.isFinite(c)) nearest = Math.min(nearest, c);
      if (!(c >= LAND_KM)) {
        fails++;
        note(`land:${ship.name}`, p, `${ship.name}'s lantern over land`);
      }
      // Its column: the centre to its reflection's foot; its halo's radius.
      const R = (l.x1 - l.x0) / 2;
      for (const t of r.text) {
        if (!(t.weight >= TEXT)) continue;
        // A label's outline lost behind the eye (NaN) stands nowhere.
        if (t.quad.some((v) => !Number.isFinite(v))) continue;
        const gap = quadToColumn(t.quad, l.cx, l.cy, l.y1 - R) - R;
        if (gap < GAP) {
          fails++;
          note(
            `text:${t.kind}:${ship.name}`,
            p,
            `${ship.name}'s ${PLACES[l.place]} lantern (${l.I.toFixed(2)}) ${gap.toFixed(1)} px from a ${t.kind} shown at ${t.weight.toFixed(2)}`,
          );
        }
      }
      if (Number.isFinite(ship.x)) {
        const h = Math.max(ship.height, 1);
        const off =
          l.cx < ship.x - h - 2 ||
          l.cx > ship.x + h + 2 ||
          l.cy < ship.y - h - 2 ||
          l.cy > ship.y + 2;
        if (off) {
          fails++;
          note(`off:${ship.name}`, p, `${ship.name}'s lantern off her glyph`);
        }
      } else unlaid++;
    }
    const bright = shown.filter((l) => l.I >= BRIGHT * lets(l));
    for (let a = 0; a < bright.length; a++)
      for (let b = a + 1; b < bright.length; b++) {
        const d = Math.hypot(
          bright[a].cx - bright[b].cx,
          bright[a].cy - bright[b].cy,
        );
        closest = Math.min(closest, d);
        if (d < space) {
          fails++;
          const pair = [bright[a], bright[b]]
            .map((l) => `${r.ships[l.i].name} ${PLACES[l.place]}`)
            .sort()
            .join(" and ");
          note(`space:${pair}`, p, `${pair} run together`);
        }
      }
    // From the step before: pops of intensity, and moves against the rest.
    const key = (l) => `${l.layer}:${l.mark}:${l.place}`;
    const now = new Map(lights.map((l) => [key(l), l]));
    if (prev) {
      const keys = new Set([...now.keys(), ...prev.keys()]);
      const dx = [];
      const dy = [];
      const pairs = [];
      for (const k of keys) {
        const a = prev.get(k);
        const b = now.get(k);
        const ia = a?.I ?? 0;
        const ib = b?.I ?? 0;
        if (Math.abs(ib - ia) > POP)
          pops.push(
            `${p.toFixed(4)} ${(b ?? a)?.name ?? k} ${ia.toFixed(2)}->${ib.toFixed(2)}`,
          );
        if (a && b && a.I > SEEN && b.I > SEEN) {
          dx.push(b.cx - a.cx);
          dy.push(b.cy - a.cy);
          pairs.push([k, a, b]);
        }
      }
      const mx = median(dx);
      const my = median(dy);
      for (const [k, a, b] of pairs) {
        const off = Math.hypot(b.cx - a.cx - mx, b.cy - a.cy - my);
        if (off > MOVE)
          moves.push(
            `${p.toFixed(4)} ${r.ships[b.i]?.name ?? k} ${PLACES[b.place]} ${off.toFixed(1)} px`,
          );
      }
    }
    prev = now;
    if (fails) bad.push(`${p.toFixed(4)} (${fails})`);
    rows.push({
      size: label,
      p,
      night: r.night,
      lanterns: shown.length,
      fails,
    });
  }
  if (from <= 0.93 && to >= 0.95 && most === 0) {
    bad.push("no lantern drawn over the night");
    kinds.set("none", { n: 1, from, to, text: "no lantern drawn at all" });
  }
  failed += bad.length;
  console.log(
    `${label}: ${ps.length} steps ${from}..${to}; lit ${firstLit ?? "-"}..${lastLit ?? "-"}, at most ${most} lanterns; nearest coast ${nearest.toFixed(1)} km; closest bright pair ${closest.toFixed(1)} px; ${unlaid} lantern-steps before the layout; steps failing ${bad.length}`,
  );
  if (bad.length) console.log(`  ${bad.slice(0, 30).join(", ")}`);
  for (const [, k] of kinds)
    console.log(`  ${k.text}: ${k.n} times, p ${k.from}..${k.to}`);
  console.log(
    `  pops over ${POP}: ${pops.length}${pops.length ? `: ${pops.slice(0, 12).join("; ")}` : ""}`,
  );
  console.log(
    `  moves over ${MOVE} px against the rest: ${moves.length}${moves.length ? `: ${moves.slice(0, 12).join("; ")}` : ""}`,
  );
  await page.close();
}
await browser.close();
if (process.env.JSON) await writeFile(process.env.JSON, JSON.stringify(rows));
process.exit(failed ? 1 : 0);
