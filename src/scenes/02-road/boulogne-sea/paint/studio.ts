import { SEA_HOLD, type SeaPose } from "../../interludes";
import { buildPlates } from "../plates";
import { boxStyle, type Shift, shiftFor } from "../view";
import type { Plate, PlateMode } from "./plate";
import { type PlateTarget, paintPlates } from "./raster";

/**
 * The painting's studio (development only; scripts/dev/sea-studio.mjs
 * bundles this file and runs it in a blank page, no Next server): the
 * plates painted and stacked as the painting stacks them at the hold, so
 * an area's painter can look at their plates alone or in place, in colour
 * or as the engraving, and see what each job costs. Not imported by the
 * site.
 *
 * Reads `window.__studioOptions`: { plates?: string[] (solo ids), mode:
 * "colour" | "ink" | number (the transition's share of colour, 0..1, over
 * the engraving), x?: number (the drift, metres) }. Writes
 * `window.__studio` when done: { done, timings }.
 */

interface StudioOptions {
  plates?: string[];
  mode: PlateMode | number;
  x?: number;
}

interface Timing {
  plate: string;
  mode: PlateMode;
  jobs: number;
  total: number;
  worst: number;
}

declare global {
  interface Window {
    __studioOptions?: StudioOptions;
    __studio?: { done: boolean; timings: Timing[]; error?: string };
  }
}

async function run(): Promise<void> {
  const o: StudioOptions = window.__studioOptions ?? { mode: "colour" };
  const root = document.getElementById("root");
  if (!root) throw new Error("no #root");
  const all = buildPlates();
  const plates = o.plates?.length
    ? all.filter((p) => o.plates?.includes(p.id))
    : all;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const pose: SeaPose = { ...SEA_HOLD, x: o.x ?? 0 };
  const shift: Shift = { x: 0, y: 0 };
  const targets: PlateTarget[] = [];
  const views: {
    plate: Plate;
    ink: HTMLCanvasElement;
    colour: HTMLCanvasElement;
  }[] = [];
  for (const plate of plates) {
    const [x0, x1, y0, y1] = plate.box;
    const box = document.createElement("div");
    box.dataset.plate = plate.id;
    Object.assign(box.style, boxStyle(x0, x1, y0, y1), {
      position: "absolute",
    });
    shiftFor(plate.depth, pose, height, shift);
    box.style.transform = `translate3d(${shift.x}px, ${shift.y}px, 0)`;
    const ink = document.createElement("canvas");
    const colour = document.createElement("canvas");
    for (const c of [ink, colour])
      Object.assign(c.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        display: "block",
      });
    box.append(ink, colour);
    root.append(box);
    targets.push({ plate, canvases: { ink, colour } });
    views.push({ plate, ink, colour });
  }
  // Time each job: wrap them.
  const timings: Timing[] = [];
  const timed: PlateTarget[] = targets.map((t) => ({
    canvases: t.canvases,
    plate: {
      ...t.plate,
      jobs: (mode: PlateMode) => {
        const jobs = t.plate.jobs(mode);
        const rec: Timing = {
          plate: t.plate.id,
          mode,
          jobs: jobs.length,
          total: 0,
          worst: 0,
        };
        timings.push(rec);
        return jobs.map((job) => (c: Parameters<typeof job>[0]) => {
          const s = performance.now();
          job(c);
          const ms = performance.now() - s;
          rec.total += ms;
          if (ms > rec.worst) rec.worst = ms;
        });
      },
    },
  }));
  await paintPlates(
    timed,
    height,
    dpr,
    new AbortController().signal,
    () => 1000,
  );
  for (const v of views) {
    if (o.mode === "colour") {
      v.colour.style.opacity = "1";
      v.ink.style.opacity = "0";
    } else if (o.mode === "ink") {
      v.colour.style.opacity = "0";
      v.ink.style.opacity = "1";
    } else {
      v.colour.style.opacity = String(o.mode);
      v.ink.style.opacity = "1";
    }
  }
  // Two frames, so the canvases are on screen before the shot.
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  window.__studio = { done: true, timings };
}

run().catch((e: unknown) => {
  window.__studio = { done: true, timings: [], error: String(e) };
});
