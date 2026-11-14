import { createRng, field, mix, type Pt, softBlob } from "../../paint/kit";
import {
  INK,
  PAPER,
  type PaintMode,
  type Plate,
  type PlateCanvas,
  type PlateJob,
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
import { fire, lightSeed, occlude, union } from "./lit";

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

/** A number 0..1 from a key, the same every time. */
export function hash01(k: number): number {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The field a place lies in (metres east and north): fields in blocks and
 * strips some 150 by 95 m, their boundaries askew to the contours and a
 * little bent, so a field spans several tiers of the ground and its
 * hedges run both along the slope and down it.
 */
export function fieldKey(e: number, n: number): number {
  const u = (e * 0.92 + n * 0.39) / 150 + 0.35 * Math.sin(n / 97 + e / 211);
  const v = (-e * 0.39 + n * 0.92) / 95 + 0.35 * Math.sin(e / 83 - n / 157);
  return Math.floor(u) * 7919 + Math.floor(v) * 104729;
}

/** A field's colour: stubble gold, pasture green, fallow brown, rough grazing. */
export function fieldBase(key: number): string {
  const r = hash01(key);
  const r2 = hash01(key + 17);
  if (r < 0.3) return mix(SHORE.stubble, SHORE.fallow, r2 * 0.35);
  if (r < 0.64) return mix(SHORE.pasture, SHORE.turf, r2 * 0.6);
  if (r < 0.82) return mix(SHORE.fallow, SHORE.turfShade, r2 * 0.3);
  return mix(SHORE.turf, SHORE.hedge, 0.15 + r2 * 0.2);
}

/** Adds a bush or a tree's crown: a lumpy rounded shape about `rx` by `ry`, its foot flattish. */
export function addBush(
  p: Path2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rng: () => number,
): void {
  const k = 9;
  for (let j = 0; j <= k; j++) {
    const a = Math.PI * (j / k);
    const bump = 0.75 + rng() * 0.45;
    const px = x + Math.cos(a) * rx * bump;
    const py = y + Math.sin(a) * ry * bump;
    if (j === 0) p.moveTo(px, py - ry * 0.3);
    else p.lineTo(px, py);
  }
  p.lineTo(x - rx * 0.9, y - ry * 0.35);
  p.closePath();
}

export interface CampPlateOptions {
  id: string;
  depth: number;
  box: Plate["box"];
  seed: number;
  /** Tier `i`'s contour, far to near, built inside the first job that needs it; `count` of them. */
  contour: (i: number) => Contour;
  count: number;
  /** Trees and hedgerows on the skyline and down the slope between these x (layer units): breaking a smooth shoulder against the sky. */
  trees?: readonly [number, number];
  /**
   * Windmills standing on this ground: [east, north, metres up as drawn,
   * sails' turn, the tier after which it is painted (the ground nearer
   * than it hides its foot)].
   */
  mills?: () => (readonly [number, number, number, number, number])[];
  /**
   * In the engraving, huts smaller than this (half-width in layer units)
   * are drawn as one stroke, not outlined (engraveHuts): a single line of
   * huts on a skyline, outlined, reads as a zigzag ornament.
   */
  inkFar?: number;
  /**
   * The kitchens' fires behind this ground (layer units), for the lights
   * at dusk: hidden by all of it, their glow showing over the skyline.
   */
  fires?: () => readonly Pt[];
  /** Their glow's radius, layer units. */
  fireRadius?: number;
}

export function campPlate(o: CampPlateOptions): Plate {
  const tiers: (Tier | undefined)[] = [];
  const rows: (Hut[] | undefined)[] = [];
  const tierAt = (i: number): Tier => {
    tiers[i] ??= prepare(o.contour(i));
    return tiers[i];
  };
  /**
   * Whether tier `i`'s men's huts open away from the eye: the men's rows
   * stand in close pairs, each pair's huts opening on the street between
   * them (gable-on to it; camps.md), so the nearer row of a pair turns
   * its doors from the eye. For the lights at dusk.
   */
  const awayAt = (i: number): boolean => {
    let run = 0;
    for (let j = i - 1; j >= 0 && tierAt(j).row === 0; j--) run++;
    return tierAt(i).row === 0 && run % 2 === 1;
  };
  const hutsAt = (i: number): Hut[] => {
    if (!rows[i]) {
      const huts = hutsOn(tierAt(i), o.seed + i * 17, o.box);
      if (awayAt(i)) for (const h of huts) h.away = true;
      rows[i] = huts;
    }
    return rows[i];
  };
  const bottom = o.box[2];

  function groundJob(i: number, mode: PaintMode): PlateJob {
    return (c: PlateCanvas) => {
      const k = tierAt(i);
      const nearer = i + 1 < o.count ? tierAt(i + 1) : undefined;
      const d = k.ahead;
      const rng = createRng(o.seed * 31 + i);
      const region = under(k.pts, bottom);
      const lightAt = (j: number) => (k.light ? k.light(j) : 0.7);
      if (mode === "colour") {
        fill(c, region, air(mix(SHORE.turf, SHORE.turfLit, 0.4), d));
        // The tier's ground hides the farther tiers' lights under its line.
        occlude(c, region);
        if (nearer) {
          const hedges = new Path2D();
          const hedgeTops = new Path2D();
          const lanes = new Path2D();
          const furrows = new Path2D();
          const trees = new Path2D();
          const treeTops = new Path2D();
          const farther = i > 0 ? tierAt(i - 1) : undefined;
          const L = Math.min(k.pts.length, nearer.pts.length);
          // Each sample's field (or -1 in the camp): the band's middle.
          const keyAt = (t: Tier, u: Tier, j: number): number => {
            const e = (t.world[j][0] + u.world[j][0]) / 2;
            const n = (t.world[j][1] + u.world[j][1]) / 2;
            return k.camp(e, n) > 0.5 ? -1 : fieldKey(e, n);
          };
          const keys: number[] = [];
          for (let j = 0; j < L; j++) keys.push(keyAt(k, nearer, j));
          let a = 0;
          while (a < L - 1) {
            let b = a + 1;
            const camp = keys[a] === -1;
            const cap = camp ? 4 + Math.floor(rng() * 12) : 60;
            while (b < L - 1 && keys[b] === keys[a] && b - a < cap) b++;
            const m = Math.floor((a + b) / 2);
            const top = k.pts.slice(a, b + 1);
            const low = nearer.pts.slice(a, b + 1);
            const parcel = band(top, low);
            // The light in a few steps, so neighbouring tiers of one field share it.
            const lit = Math.round(lightAt(m) * 4) / 4;
            const base = camp ? parcelColour(rng, true) : fieldBase(keys[a]);
            // The ground turned from the low sun goes cool and dark; square to it, warm.
            const shade = mix(base, SHORE.turfShade, 0.7);
            const sunlit = mix(base, "#e2c47e", 0.18);
            const col =
              lit < 0.5
                ? mix(shade, base, lit / 0.5)
                : mix(base, sunlit, (lit - 0.5) / 0.5);
            fill(c, parcel, air(col, d));
            if (!camp) {
              // Furrows or swathes, each field its own way.
              const way = Math.floor(hash01(keys[a] + 5) * 4);
              if (way === 0) addLine(furrows, lerpLine(top, low, 0.5));
              else if (way < 3)
                for (let j = 0; j < top.length - (way === 2 ? 2 : 0); j++) {
                  const q = low[j + (way === 2 ? 2 : 0)];
                  furrows.moveTo(top[j][0], top[j][1]);
                  furrows.lineTo(q[0], q[1]);
                }
              // A hedge down the slope where this field meets the next.
              if (b < L - 1 && keys[b] !== -1) {
                const p = top[top.length - 1];
                const q = low[low.length - 1];
                hedges.moveTo(p[0], p[1] + 0.3);
                hedges.lineTo(q[0], q[1]);
                hedgeTops.moveTo(p[0] - 0.35, p[1] + 0.5);
                hedgeTops.lineTo(q[0] - 0.35, q[1] + 0.2);
                if (rng() < 0.12) {
                  const r = 0.9 + rng() * 1.2;
                  addBush(trees, p[0], p[1] + r * 0.4, r, r * 0.8, rng);
                  addBush(
                    treeTops,
                    p[0] - r * 0.25,
                    p[1] + r * 0.65,
                    r * 0.55,
                    r * 0.45,
                    rng,
                  );
                }
              }
              // Now and then a hedge along its upper side where the field
              // beyond is another (most such bounds show by the change of
              // colour alone: hedges along every contour would rule the
              // slope in stripes).
              if (farther && rng() < 0.3) {
                const run: Pt[] = [];
                for (let j = a; j <= b; j++) {
                  if (keyAt(farther, k, j) !== keys[a]) run.push(k.pts[j]);
                  else if (run.length) {
                    if (run.length > 1) addLine(hedges, run);
                    if (run.length > 1)
                      addLine(
                        hedgeTops,
                        run.map(([x, y]) => [x - 0.2, y + 0.4] as Pt),
                      );
                    run.length = 0;
                  }
                }
                if (run.length > 1) {
                  addLine(hedges, run);
                  addLine(
                    hedgeTops,
                    run.map(([x, y]) => [x - 0.2, y + 0.4] as Pt),
                  );
                }
              }
            } else if (rng() < 0.3) addLine(lanes, [top[0], low[0]]);
            a = b;
          }
          stroke(
            c,
            furrows,
            0.5,
            air(mix(SHORE.hedge, SHORE.turf, 0.4), d),
            0.28,
          );
          stroke(c, lanes, 1, air(SHORE.path, d), 0.55);
          stroke(c, hedges, 1.3, air(SHORE.hedge, d), 0.85);
          stroke(c, hedgeTops, 0.6, air(SHORE.hedgeLit, d), 0.6);
          fill(c, trees, air(SHORE.hedge, d), 0.95);
          fill(c, treeTops, air(SHORE.hedgeLit, d), 0.85);
          occlude(c, trees);
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
        const L = Math.min(k.pts.length, nearer.pts.length);
        const keyAt = (j: number): number => {
          const e = (k.world[j][0] + nearer.world[j][0]) / 2;
          const n = (k.world[j][1] + nearer.world[j][1]) / 2;
          return k.camp(e, n) > 0.5 ? -1 : fieldKey(e, n);
        };
        let prev = keyAt(0);
        for (let j = 0; j < L - 1; j++) {
          const p = k.pts[j];
          const q = nearer.pts[j];
          const key = keyAt(j);
          const lit = Math.round(lightAt(j) * 4) / 4;
          const dark = (0.62 - lit) * 1.6 + tone(p[0], p[1]) * 0.35;
          if (dark > 0.15 && rng() < dark) {
            const t1 = 0.55 + rng() * 0.45;
            fall.moveTo(p[0], p[1]);
            fall.lineTo(p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1);
          }
          if (key !== -1) {
            // Furrows in some fields, each its own way.
            const way = Math.floor(hash01(key + 5) * 5);
            if (way === 0 && j % 2 === 0) {
              furrow.moveTo(p[0], p[1] - 0.2);
              furrow.lineTo(q[0], q[1] + 0.2);
            } else if (way === 1 && j % 3 === 0) {
              const r = nearer.pts[Math.min(L - 1, j + 2)];
              furrow.moveTo(p[0], p[1] - 0.2);
              furrow.lineTo(r[0], r[1] + 0.2);
            }
            // A hedge where this field meets the last: a ragged stroke down the slope.
            if (prev !== key && prev !== -1) {
              hedges.moveTo(p[0], p[1]);
              hedges.lineTo(
                (p[0] + q[0]) / 2 + (rng() - 0.5) * 0.5,
                (p[1] + q[1]) / 2 + rng() * 0.3,
              );
              hedges.lineTo(q[0], q[1]);
            }
          }
          prev = key;
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

  /** A row's huts in two jobs, each a stretch of the row (so neither is long). */
  function hutsJob(i: number, part: 0 | 1, mode: PaintMode): PlateJob {
    return (c: PlateCanvas) => {
      const all = hutsAt(i);
      const mid = Math.ceil(all.length / 2);
      const huts = part === 0 ? all.slice(0, mid) : all.slice(mid);
      if (mode === "colour") paintHuts(c, huts);
      else engraveHuts(c, huts, o.inkFar);
    };
  }

  /** Trees along the skyline (its upper envelope) and in hedgerows down the tiers, between the given x. */
  function treesJob(mode: PaintMode): PlateJob {
    return (c: PlateCanvas) => {
      const range = o.trees;
      if (!range) return;
      const [x0, x1] = range;
      const rng = createRng(o.seed * 13 + 7);
      const bins = Math.ceil(x1 - x0) + 1;
      const env = new Array<number>(bins).fill(Number.NEGATIVE_INFINITY);
      for (let i = 0; i < o.count; i++) {
        for (const [x, y] of tierAt(i).pts) {
          const b = Math.round(x - x0);
          if (b >= 0 && b < bins && y > env[b]) env[b] = y;
        }
      }
      const crowns = new Path2D();
      const lit = new Path2D();
      const d = tierAt(0).ahead;
      const unit = 1000 / d;
      const crown = (x: number, y: number, r: number) => {
        addBush(crowns, x, y + r * 0.35, r, r * 0.85, rng);
        addBush(lit, x - r * 0.25, y + r * 0.7, r * 0.55, r * 0.45, rng);
      };
      // On the skyline: trees standing alone and in short rows.
      for (let x = x0 + rng() * 6; x < x1; x += 3 + rng() * 14) {
        const b = Math.round(x - x0);
        if (!Number.isFinite(env[b]) || rng() < 0.35) continue;
        const n = rng() < 0.4 ? 2 + Math.floor(rng() * 4) : 1;
        for (let k = 0; k < n; k++) {
          const bx = Math.min(bins - 1, b + k * 2);
          crown(x0 + bx, env[bx] - 0.3, (4 + rng() * 5) * unit * 2);
        }
      }
      // Down the slope: hedgerows with a tree here and there along a few tiers.
      for (let i = 1; i < o.count; i += 2) {
        const t = tierAt(i);
        if (rng() < 0.4) continue;
        for (let j = 0; j < t.pts.length; j += 1) {
          const [x, y] = t.pts[j];
          if (x < x0 || x > x1 || rng() < 0.75) continue;
          crown(x, y - 0.2, (2.5 + rng() * 4) * unit * 2);
        }
      }
      if (mode === "colour") {
        fill(c, crowns, air(mix(SHORE.hedge, "#4a5040", 0.4), d), 0.95);
        fill(c, lit, air(SHORE.hedgeLit, d), 0.8);
        occlude(c, crowns);
      } else {
        fill(c, crowns, PAPER.low);
        stroke(c, crowns, penFor(d, 1) * 0.6, INK.line, 0.7);
      }
    };
  }

  function millJob(
    m: readonly [number, number, number, number, number],
    mode: PaintMode,
  ): PlateJob {
    return (c) => {
      const w = windmill(m[0], m[1], m[2], m[3]);
      paintWindmill(c, w, mode);
      // Its body and sails against a kitchen's glow behind the skyline.
      if (mode === "colour") occlude(c, union([w.body, ...w.sails]));
    };
  }

  /**
   * The kitchens' fires behind the camp (o.fires): recorded before any of
   * the plate's ground, so every tier of it hides them and only their
   * glow over the skyline shows, where their smoke rises (smoke.ts, its
   * canvas behind the plate).
   */
  function firesJob(): PlateJob {
    return (c) => {
      const fires = o.fires?.() ?? [];
      fires.forEach(([x, y], i) => {
        fire(c, x, y, o.fireRadius ?? 20, lightSeed(x, y, i));
      });
    };
  }

  return {
    id: o.id,
    depth: o.depth,
    box: o.box,
    group: "land",
    jobs(mode) {
      const jobs: PlateJob[] = [];
      if (mode === "colour" && o.fires) jobs.push(firesJob());
      const mills = o.mills?.() ?? [];
      for (const m of mills) if (m[4] < 0) jobs.push(millJob(m, mode));
      for (let i = 0; i < o.count; i++) {
        jobs.push(groundJob(i, mode));
        jobs.push(hutsJob(i, 0, mode), hutsJob(i, 1, mode));
        for (const m of mills) if (m[4] === i) jobs.push(millJob(m, mode));
      }
      if (o.trees) jobs.push(treesJob(mode));
      return jobs;
    },
  };
}
