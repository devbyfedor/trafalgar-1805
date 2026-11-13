import { createRng, mix, type Pt, softBlob } from "../../paint/kit";
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
 * contours a row of huts stands, every hut's foot on the ground under it;
 * between the rows lie the trampled camp ground, gardens and cross
 * streets, and beyond the camp's end fields with hedges. Shared by the
 * right camp (north of the harbour) and the left (Outreau).
 */

export interface Contour {
  /** The ground along the contour, [east, north, metres up as drawn], sample by sample. */
  world: readonly (readonly [number, number, number])[];
  /** A row of huts standing on it: 0 men's, 1 officers', 2 kitchens. */
  row?: 0 | 1 | 2;
  /** Whether the ground about a place is the camp's (rows, trodden earth) or fields: the share of huts kept there. */
  camp: (e: number, n: number) => number;
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
  if (t.row === undefined) return [];
  const rng = createRng(seed);
  const kind = t.row;
  const length = t.run[t.run.length - 1];
  const huts = rowHuts(rng, length, (s) => along(t, s), kind, {
    gap: kind === 2 ? 16 : kind === 1 ? 12 : 4,
    street: kind === 0 ? 24 : 30,
    block: kind === 0 ? 9 : 5,
    keep: (s) => {
      const [e, n] = along(t, s);
      return t.camp(e, n);
    },
  });
  return huts.filter((h) => {
    const p = project(h.e, h.n, h.g);
    return p[0] > box[0] - 8 && p[0] < box[1] + 8;
  });
}

/** The colour of a parcel: the camp's trodden earth, or a field. */
function parcelColour(rng: () => number, camp: boolean): string {
  if (camp) return mix(SHORE.path, SHORE.turf, 0.3 + rng() * 0.35);
  const r = rng();
  if (r < 0.4) return mix(SHORE.stubble, SHORE.fallow, rng() * 0.4);
  if (r < 0.75) return mix(SHORE.pasture, SHORE.turfLit, rng() * 0.5);
  return mix(SHORE.fallow, SHORE.stubble, rng() * 0.3);
}

export interface CampPlateOptions {
  id: string;
  depth: number;
  box: Plate["box"];
  seed: number;
  /** The tiers' contours, far to near, built inside the first job; `count` of them. */
  contours: () => Contour[];
  count: number;
  /** Windmills standing on this ground: [east, north, metres up as drawn, sails' turn]. */
  mills?: () => (readonly [number, number, number, number])[];
}

export function campPlate(o: CampPlateOptions): Plate {
  let geo: { tiers: Tier[]; huts: Hut[][] } | undefined;
  const get = () => {
    if (!geo) {
      const tiers = o.contours().map(prepare);
      geo = {
        tiers,
        huts: tiers.map((t, i) => hutsOn(t, o.seed + i * 17, o.box)),
      };
    }
    return geo;
  };
  const bottom = o.box[2];

  function tierJob(i: number, mode: PlateMode): PlateJob {
    return (c: PlateCanvas) => {
      const { tiers, huts } = get();
      const k = tiers[i];
      const nearer = tiers[i + 1];
      const d = k.ahead;
      const rng = createRng(o.seed * 31 + i);
      const region = under(k.pts, bottom);
      const lightAt = (j: number) => (k.light ? k.light(j) : 1);
      if (mode === "colour") {
        fill(c, region, air(mix(SHORE.turfLit, SHORE.stubble, 0.35), d));
        if (nearer) {
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
            fill(
              c,
              parcel,
              air(mix(mix(base, SHORE.turfShade, 0.6), base, lit), d),
              0.8,
            );
            // Fine colour hatching over the wash, along the contour or across it.
            const h = new Path2D();
            if (rng() < 0.6) {
              for (const t of [0.3, 0.6]) addLine(h, lerpLine(top, low, t));
            } else {
              for (let j = 0; j < top.length; j++) {
                h.moveTo(top[j][0], top[j][1]);
                h.lineTo(low[j][0], low[j][1]);
              }
            }
            stroke(c, h, 0.5, air(mix(SHORE.hedge, SHORE.turf, 0.5), d), 0.22);
            if (!camp && rng() < 0.6) {
              const hedge = new Path2D();
              addBroken(
                hedge,
                [top[top.length - 1], low[low.length - 1]],
                0.6,
                0.5,
                rng,
              );
              stroke(c, hedge, 1, air(SHORE.hedge, d), 0.7);
            }
            if (camp && rng() < 0.35) {
              const lane = new Path2D();
              addLine(lane, [top[top.length - 1], low[low.length - 1]]);
              stroke(c, lane, 1.2, air(SHORE.path, d), 0.6);
            }
            a = b;
          }
          if (k.row !== undefined) {
            c.ctx.save();
            c.ctx.clip(band(k.pts, nearer.pts));
            for (let j = 0; j < 40; j++) {
              const p = k.pts[Math.floor(rng() * k.pts.length)];
              softBlob(
                c,
                p[0],
                p[1] - 1,
                3 + rng() * 6,
                1.2,
                air(SHORE.garden, d),
                0.25,
              );
            }
            c.ctx.restore();
          }
          if (rng() < 0.4) {
            const hedge = new Path2D();
            addBroken(
              hedge,
              lerpLine(k.pts, nearer.pts, 0.15),
              1.4,
              1.1,
              rng,
              () => 0.6,
            );
            stroke(c, hedge, 0.9, air(SHORE.hedge, d), 0.55);
          }
        }
        const lip = new Path2D();
        addBroken(lip, k.pts, 6, 2, rng);
        stroke(c, lip, 0.6, air(mix(SHORE.turfLit, "#fff0c8", 0.3), d), 0.35);
        paintHuts(c, huts[i]);
        return;
      }
      fill(c, region, PAPER.low);
      const px = penFor(d, 1.2);
      if (nearer) {
        const h = new Path2D();
        for (const t of [0.35, 0.7]) {
          addBroken(h, lerpLine(k.pts, nearer.pts, t), 5, 4, rng, () => 0.55);
        }
        stroke(c, h, px * 0.5, INK.hatch, 0.6);
        const f = new Path2D();
        let a = 0;
        while (a < k.pts.length - 1) {
          const b = Math.min(k.pts.length - 1, a + 4 + Math.floor(rng() * 12));
          const [e, n] = k.world[Math.floor((a + b) / 2)];
          const camp = k.camp(e, n) > 0.5;
          if (!camp && rng() < 0.55) {
            const slant = rng() < 0.5;
            for (let j = a; j <= b; j++) {
              const p = k.pts[j];
              const q = nearer.pts[j];
              if (slant) {
                f.moveTo(p[0], p[1]);
                f.lineTo(q[0] + 1.2, q[1]);
              } else if (j % 2 === 0) {
                const y = (p[1] + q[1]) / 2;
                f.moveTo(p[0], y);
                f.lineTo(p[0] + 2, y);
              }
            }
            const hedge = new Path2D();
            addBroken(hedge, [k.pts[b], nearer.pts[b]], 0.35, 0.45, rng);
            stroke(c, hedge, px * 0.9, INK.line, 0.7);
          }
          a = b;
        }
        stroke(c, f, px * 0.45, INK.hatch, 0.5);
      }
      const line = new Path2D();
      if (i === 0) {
        addLine(line, k.pts);
        stroke(c, line, px, INK.line, 0.85);
      } else {
        addBroken(line, k.pts, 7, 3, rng, () => 0.7);
        stroke(c, line, px * 0.6, INK.hatch, 0.6);
      }
      engraveHuts(c, huts[i]);
    };
  }

  function millsJob(mode: PlateMode): PlateJob {
    return (c) => {
      for (const [e, n, up, turn] of o.mills?.() ?? [])
        paintWindmill(c, windmill(e, n, up, turn), mode);
    };
  }

  return {
    id: o.id,
    depth: o.depth,
    box: o.box,
    group: "land",
    jobs(mode) {
      const jobs: PlateJob[] = [];
      // Mills stand behind the crest: painted before the ground that hides their feet.
      if (o.mills) jobs.push(millsJob(mode));
      for (let i = 0; i < o.count; i++) jobs.push(tierJob(i, mode));
      return jobs;
    },
  };
}
