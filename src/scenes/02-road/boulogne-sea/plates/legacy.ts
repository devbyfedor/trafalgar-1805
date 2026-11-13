import { INK, PAPER, type Plate, type PlateJob } from "../paint/plate";

/**
 * Session 24's first painting carried onto plates, area by area, until
 * each area's own painting replaces it (plates/*.ts): SVG path data in
 * layer units with y written down (land.ts's polygon()), filled flat or
 * with a vertical ramp; its engraving is the same shapes filled with the
 * paper and outlined in ink.
 */

export interface LegacyShape {
  d: string;
  fill: string;
  opacity?: number;
  ramp?: readonly string[];
  /** Stroked, not filled (line work: hedges, rigging). */
  stroke?: number;
}

/** Bounds (y up) of SVG path data written with y down. */
function yRange(d: string): [number, number] {
  const v = d.match(/-?\d+(?:\.\d+)?/g) ?? [];
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (let i = 1; i < v.length; i += 2) {
    const y = -Number(v[i]);
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  return [lo, hi];
}

export function legacyJobs(
  shapes: readonly LegacyShape[],
  mode: "colour" | "ink",
): PlateJob[] {
  const jobs: PlateJob[] = [];
  for (const s of shapes) {
    if (!s.d) continue;
    jobs.push((c) => {
      const { ctx } = c;
      // The path data is written y down: flip into the plate's y up.
      ctx.scale(1, -1);
      const p = new Path2D(s.d);
      if (mode === "colour") {
        ctx.globalAlpha = s.opacity ?? 1;
        if (s.stroke !== undefined) {
          ctx.strokeStyle = s.fill;
          ctx.lineWidth = s.stroke;
          ctx.stroke(p);
          return;
        }
        const ramp = s.ramp;
        if (ramp && ramp.length > 1) {
          const [lo, hi] = yRange(s.d);
          const g = ctx.createLinearGradient(0, -hi, 0, -lo);
          ramp.forEach((col, i) => {
            g.addColorStop(i / (ramp.length - 1), col);
          });
          ctx.fillStyle = g;
        } else ctx.fillStyle = s.fill;
        ctx.fill(p);
        return;
      }
      if (s.stroke !== undefined) {
        ctx.strokeStyle = INK.hatch;
        ctx.lineWidth = c.pen(0.8);
        ctx.stroke(p);
        return;
      }
      if ((s.opacity ?? 1) >= 0.99) {
        ctx.fillStyle = PAPER.low;
        ctx.fill(p);
      }
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = c.pen(1);
      ctx.stroke(p);
    });
  }
  return jobs;
}

/** A plate of legacy shapes. */
export function legacyPlate(
  base: Omit<Plate, "jobs">,
  shapes: () => readonly LegacyShape[],
): Plate {
  let cached: readonly LegacyShape[] | null = null;
  const get = () => {
    if (!cached) cached = shapes();
    return cached;
  };
  return {
    ...base,
    jobs: (mode) => {
      // The shapes are built inside the first job, so making the list is cheap.
      const list: PlateJob[] = [() => void get()];
      return [...list, ...lazyJobs(() => legacyJobs(get(), mode))];
    },
  };
}

/** Jobs whose list is only known once built: one job per item, built on first use. */
function lazyJobs(build: () => PlateJob[]): PlateJob[] {
  // A fixed number of slots, each running its share of the built list.
  const SLOTS = 24;
  let built: PlateJob[] | null = null;
  const out: PlateJob[] = [];
  for (let i = 0; i < SLOTS; i++) {
    out.push((c) => {
      if (!built) built = build();
      const per = Math.ceil(built.length / SLOTS);
      for (let j = i * per; j < Math.min(built.length, (i + 1) * per); j++) {
        c.ctx.save();
        built[j](c);
        c.ctx.restore();
      }
    });
  }
  return out;
}
