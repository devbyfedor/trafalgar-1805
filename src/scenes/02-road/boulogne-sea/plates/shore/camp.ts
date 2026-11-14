import { createRng, field, mix, type Pt, softBlob } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../../paint/plate";
import { project } from "../../scene";
import {
  addBroken,
  addLine,
  air,
  band,
  engraveHuts,
  fill,
  type Hut,
  lerpLine,
  paintHuts,
  paintWindmill,
  penFor,
  rowHuts,
  SHORE,
  stroke,
  under,
  windmill,
} from "./draw";

/**
 * A camp's ground drawn as tiers of contours, far to near: each tier is
 * filled from its contour down to the plate's bottom, so a nearer tier
 * hides the foot of a farther one, as the ground itself does. On chosen
 * contours a row of huts stands gable-on, every hut's foot on the ground
 * under it, in battalion blocks with cross streets between them; rows in
 * close pairs, the officers' behind every few, the kitchens at the camp's
 * back. Beyond the camp's end, fields with hedges. Shared by the right
 * camp (north of the harbour) and the left (Outreau).
 */

export interface Contour {
  /** The ground along the contour, [east, north, metres up as drawn], sample by sample. */
  world: readonly (readonly [number, number, number])[];
  /** A row of huts standing on it where the camp is: 0 men's, 1 officers'. */
  row?: 0 | 1;
  /** The camp's share of the ground about a place (1 inside the camp, 0 fields): rows end where it falls. */
  camp: (e: number, n: number) => number;
  /** The cross streets between the battalions' blocks, where no hut stands. */
  street?: (e: number, n: number) => boolean;
  /** Where a row's huts are the kitchens at the camp's back instead. */
  kitchen?: (e: number, n: number) => boolean;
  /** How lit the ground is, 0 (shade) to 1 (square to the sun), at a sample. */
  light?: (i: number) => number;
}

interface Tier extends Contour {
  pts: Pt[];
  ahead: number;
  /** Metres along the contour at each sample. */
  run: number[];
}

function prepare(c: Contour): Tier {
  const pts = c.world.map(([e, n, up]) => project(e, n, up));
  const run: number[] = [0];
  for (let i = 1; i < c.world.length; i++) {
    const a = c.world[i - 1];
    const b = c.world[i];
    run.push(run[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const mid = c.world[Math.floor(c.world.length / 2)];
  const ahead = Math.max(500, Math.hypot(mid[0] + 1127, mid[1]));
  return { ...c, pts, run, ahead };
}

function along(t: Tier, s: number): readonly [number, number, number] {
  const r = t.run;
  if (s <= 0) return t.world[0];
  if (s >= r[r.length - 1]) return t.world[t.world.length - 1];
  let lo = 0;
  let hi = r.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (r[m] <= s) lo = m;
    else hi = m;
  }
  const k = (s - r[lo]) / (r[hi] - r[lo] || 1);
  const a = t.world[lo];
  const b = t.world[hi];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

function hutsOn(t: Tier, seed: number, box: Plate["box"]): Hut[] {
  if (t.row === undefined && !t.kitchen) return [];
  const rng = createRng(seed);
  const length = t.run[t.run.length - 1];
  const row = t.row;
  const huts = rowHuts(
    rng,
    length,
    (s) => along(t, s),
    (s) => {
      const [e, n] = along(t, s);
      if (t.street?.(e, n)) return null;
      if (t.kitchen?.(e, n)) return 2;
      if (row === undefined) return null;
      return t.camp(e, n) > 0.04 ? row : null;
    },
    {
      gap: row === 1 ? 9 : 4,
      street: row === 1 ? 40 : 30,
      // Blocks of the camp's own (its streets) where it has them.
      block: t.street ? 1e9 : row === 1 ? 6 : 10,
    },
  );
  // The rows end softly where the camp gives way to the fields.
  const keep = createRng(seed + 5);
  return huts.filter((h) => {
    const p = project(h.e, h.n, h.g);
    if (p[0] < box[0] - 8 || p[0] > box[1] + 8) return false;
    if (h.kind === 2) return keep() < 0.85;
    const share = t.camp(h.e, h.n);
    return share > 0.75 || keep() < share * 1.15;
  });
}

/** The colour of a parcel: the camp's trodden earth and turf, or a field. */
function parcelColour(rng: () => number, camp: boolean): string {
  if (camp) return mix(SHORE.path, SHORE.turf, 0.45 + rng() * 0.4);
  const r = rng();
  if (r < 0.34) return mix(SHORE.stubble, SHORE.fallow, rng() * 0.35);
  if (r < 0.72) return mix(SHORE.pasture, SHORE.turf, rng() * 0.6);
  if (r < 0.86) return mix(SHORE.fallow, SHORE.turfShade, rng() * 0.3);
  return mix(SHORE.turf, SHORE.hedge, 0.2 + rng() * 0.2);
}

export interface CampPlateOptions {
  id: string;
  depth: number;
  box: Plate["box"];
  seed: number;
  /** The tiers' contours, far to near, built inside the first job; `count` of them. */
  contours: () => Contour[];
  count: number;
  /**
   * Windmills standing on this ground: [east, north, metres up as drawn,
   * sails' turn, the tier after which it is painted (the ground nearer
   * than it hides its foot)].
   */
  mills?: () => (readonly [number, number, number, number, number])[];
}

/** Adds a hedge along a line: a row of small loops, lit on top (ink: the engraver's hedge). */
function addHedgeLoops(p: Path2D, pts: readonly Pt[], r: number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / (r * 2.2)));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      p.moveTo(x - r, y);
      p.quadraticCurveTo(x - r, y + r * 1.3, x, y + r * 1.1);
      p.quadraticCurveTo(x + r, y + r * 1.3, x + r, y);
    }
  }
}

export function campPlate(o: CampPlateOptions): Plate {
  let lines: Contour[] | undefined;
  const tiers: (Tier | undefined)[] = [];
  const rows: (Hut[] | undefined)[] = [];
  const tierAt = (i: number): Tier => {
    lines ??= o.contours();
    tiers[i] ??= prepare(lines[i]);
    return tiers[i];
  };
  const hutsAt = (i: number): Hut[] => {
    rows[i] ??= hutsOn(tierAt(i), o.seed + i * 17, o.box);
    return rows[i];
  };
  const bottom = o.box[2];

  function groundJob(i: number, mode: PlateMode): PlateJob {
    return (c: PlateCanvas) => {
      const k = tierAt(i);
      const nearer = i + 1 < o.count ? tierAt(i + 1) : undefined;
      const d = k.ahead;
      const rng = createRng(o.seed * 31 + i);
      const region = under(k.pts, bottom);
      const lightAt = (j: number) => (k.light ? k.light(j) : 0.7);
      if (mode === "colour") {
        fill(c, region, air(mix(SHORE.turf, SHORE.turfLit, 0.4), d));
        if (nearer) {
          const hedges = new Path2D();
          const hedgeTops = new Path2D();
          const lanes = new Path2D();
          const furrows = new Path2D();
          let a = 0;
          while (a < k.pts.length - 1) {
            const b = Math.min(
              k.pts.length - 1,
              a + 4 + Math.floor(rng() * 12),
            );
            const m = Math.floor((a + b) / 2);
            const [e, n] = k.world[m];
            const camp = k.camp(e, n) > 0.5;
            const top = k.pts.slice(a, b + 1);
            const low = nearer.pts.slice(a, b + 1);
            const parcel = band(top, low);
            const lit = lightAt(m);
            const base = parcelColour(rng, camp);
            // The ground turned from the low sun goes cool and dark; square to it, warm.
            const shade = mix(base, SHORE.turfShade, 0.7);
            const sunlit = mix(base, "#e2c47e", 0.18);
            const col =
              lit < 0.5
                ? mix(shade, base, lit / 0.5)
                : mix(base, sunlit, (lit - 0.5) / 0.5);
            fill(c, parcel, air(col, d), 0.9);
            if (!camp && rng() < 0.45) {
              // Furrows or swathes inside a field, each field its own way.
              const across = rng() < 0.5;
              if (across) {
                for (let j = 0; j < top.length; j += 1) {
                  furrows.moveTo(top[j][0], top[j][1]);
                  furrows.lineTo(low[j][0] + 0.6, low[j][1]);
                }
              } else addLine(furrows, lerpLine(top, low, 0.5));
            }
            if (!camp && rng() < 0.65) {
              // A boundary hedge down the slope between two fields.
              const p = top[top.length - 1];
              const q = low[low.length - 1];
              hedges.moveTo(p[0], p[1] + 0.3);
              hedges.lineTo(q[0], q[1]);
              hedgeTops.moveTo(p[0] - 0.3, p[1] + 0.5);
              hedgeTops.lineTo(q[0] - 0.3, q[1] + 0.2);
            }
            if (!camp && rng() < 0.3) {
              // A hedge along the field's upper side, its top lit.
              const edge = lerpLine(top, low, 0.15);
              addLine(hedges, edge);
              addLine(
                hedgeTops,
                edge.map(([x, y]) => [x - 0.2, y + 0.4] as Pt),
              );
            }
            if (camp && rng() < 0.3) addLine(lanes, [top[0], low[0]]);
            a = b;
          }
          stroke(
            c,
            furrows,
            0.5,
            air(mix(SHORE.hedge, SHORE.turf, 0.4), d),
            0.3,
          );
          stroke(c, lanes, 1, air(SHORE.path, d), 0.55);
          stroke(c, hedges, 1.3, air(SHORE.hedge, d), 0.85);
          stroke(c, hedgeTops, 0.6, air(SHORE.hedgeLit, d), 0.6);
          if (k.row !== undefined) {
            // The huts' gardens: a faint mottling between the rows.
            c.ctx.save();
            c.ctx.clip(band(k.pts, nearer.pts));
            for (let j = 0; j < 30; j++) {
              const p = k.pts[Math.floor(rng() * k.pts.length)];
              softBlob(
                c,
                p[0],
                p[1] - 0.6,
                2.5 + rng() * 5,
                0.9,
                air(SHORE.garden, d),
                0.3,
              );
            }
            c.ctx.restore();
          }
        }
        return;
      }
      fill(c, region, PAPER.low);
      const px = penFor(d, 1.2);
      if (nearer) {
        // Strokes down the fall line where the ground turns from the light,
        // clustered as an engraver's are; lit ground stays paper.
        const tone = field(o.seed * 7 + i, 60, 2);
        const fall = new Path2D();
        const furrow = new Path2D();
        const hedges = new Path2D();
        let a = 0;
        while (a < k.pts.length - 1) {
          const b = Math.min(k.pts.length - 1, a + 4 + Math.floor(rng() * 12));
          const m = Math.floor((a + b) / 2);
          const [e, n] = k.world[m];
          const camp = k.camp(e, n) > 0.5;
          const lit = lightAt(m);
          for (let j = a; j < b; j++) {
            const p = k.pts[j];
            const q = nearer.pts[j];
            const dark = (0.62 - lit) * 1.6 + tone(p[0], p[1]) * 0.35;
            if (dark > 0.15 && rng() < dark) {
              const t1 = 0.55 + rng() * 0.45;
              fall.moveTo(p[0], p[1]);
              fall.lineTo(p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1);
            }
          }
          if (!camp && rng() < 0.4) {
            const t = 0.35 + rng() * 0.3;
            addBroken(
              furrow,
              lerpLine(k.pts.slice(a, b + 1), nearer.pts.slice(a, b + 1), t),
              3,
              2,
              rng,
              () => 0.7,
            );
          }
          if (!camp && rng() < 0.5)
            addHedgeLoops(hedges, [k.pts[b], nearer.pts[b]], 0.45);
          a = b;
        }
        stroke(c, fall, px * 0.45, INK.hatch, 0.6);
        stroke(c, furrow, px * 0.4, INK.hatch, 0.45);
        stroke(c, hedges, px * 0.5, INK.line, 0.6);
      }
      const line = new Path2D();
      if (i === 0) {
        addLine(line, k.pts);
        stroke(c, line, px, INK.line, 0.85);
      } else {
        addBroken(line, k.pts, 7, 3, rng, () => 0.6);
        stroke(c, line, px * 0.55, INK.hatch, 0.55);
      }
    };
  }

  function hutsJob(i: number, mode: PlateMode): PlateJob {
    return (c: PlateCanvas) => {
      const huts = hutsAt(i);
      if (mode === "colour") paintHuts(c, huts);
      else engraveHuts(c, huts);
    };
  }

  function millJob(
    m: readonly [number, number, number, number, number],
    mode: PlateMode,
  ): PlateJob {
    return (c) => paintWindmill(c, windmill(m[0], m[1], m[2], m[3]), mode);
  }

  return {
    id: o.id,
    depth: o.depth,
    box: o.box,
    group: "land",
    jobs(mode) {
      const jobs: PlateJob[] = [];
      const mills = o.mills?.() ?? [];
      for (const m of mills) if (m[4] < 0) jobs.push(millJob(m, mode));
      for (let i = 0; i < o.count; i++) {
        jobs.push(groundJob(i, mode));
        jobs.push(hutsJob(i, mode));
        for (const m of mills) if (m[4] === i) jobs.push(millJob(m, mode));
      }
      return jobs;
    },
  };
}
