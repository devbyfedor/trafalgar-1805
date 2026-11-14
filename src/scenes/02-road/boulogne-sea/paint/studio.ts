import { SEA_HOLD, type SeaPose } from "../../interludes";
import { buildPlates } from "../plates";
import { boxStyle, type Shift, shiftFor } from "../view";
import { duskJobs, duskOf, duskShare, eveningOpacities } from "./dusk";
import type {
  PaintMode,
  Plate,
  PlateCanvas,
  PlateDusk,
  PlateJob,
  PlateMode,
} from "./plate";
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
 * the engraving), x?: number (the drift, metres), h?: number and pitch?:
 * number (the camera's height and pitch, for a view from the dive), dusk?:
 * number (the hold's progress, 0..1: each plate's dusk raster over its
 * colour as the page shows it then; mode "colour" only) }. Writes
 * `window.__studio` when done: { done, timings }.
 */

interface StudioOptions {
  plates?: string[];
  mode: PaintMode | number;
  dusk?: number;
  x?: number;
  /** The camera's height (metres) and pitch (degrees), for a view from the dive (the hold's by default). */
  h?: number;
  pitch?: number;
}

interface Timing {
  plate: string;
  mode: PlateMode;
  jobs: number;
  total: number;
  worst: number;
  /** The worst job's place in the plate's list (0-based). */
  worstAt: number;
  /** The raster's canvas, device px (0 × 0 when the plate has no raster of that mode). */
  width: number;
  height: number;
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
  const pose: SeaPose = {
    ...SEA_HOLD,
    x: o.x ?? 0,
    h: o.h ?? SEA_HOLD.h,
    pitch: o.pitch ?? SEA_HOLD.pitch,
  };
  const shift: Shift = { x: 0, y: 0 };
  const targets: PlateTarget[] = [];
  const views: {
    plate: Plate;
    ink: HTMLCanvasElement;
    colour: HTMLCanvasElement;
    glow: HTMLCanvasElement;
    dusk: HTMLCanvasElement;
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
    const glow = document.createElement("canvas");
    const dusk = document.createElement("canvas");
    for (const c of [ink, colour, glow, dusk])
      Object.assign(c.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        display: "block",
      });
    box.append(ink, colour, glow, dusk);
    glow.style.opacity = "0";
    dusk.style.opacity = "0";
    root.append(box);
    targets.push({ plate, canvases: { ink, colour, glow, dusk } });
    views.push({ plate, ink, colour, glow, dusk });
  }
  // Time each job: wrap them.
  const timings: Timing[] = [];
  const timedJobs = (
    plate: Plate,
    mode: PlateMode,
    jobs: readonly PlateJob[],
  ): PlateJob[] => {
    const rec: Timing = {
      plate: plate.id,
      mode,
      jobs: jobs.length,
      total: 0,
      worst: 0,
      worstAt: -1,
      width: 0,
      height: 0,
    };
    timings.push(rec);
    return jobs.map((job, i) => (c: PlateCanvas) => {
      const s = performance.now();
      job(c);
      const ms = performance.now() - s;
      rec.total += ms;
      if (ms > rec.worst) {
        rec.worst = ms;
        rec.worstAt = i;
      }
    });
  };
  const timed: PlateTarget[] = targets.map((t) => {
    const d = duskOf(t.plate);
    const dusk: PlateDusk | false = d
      ? {
          ...d,
          grade: null,
          jobs: () => timedJobs(t.plate, "dusk", duskJobs(d)),
        }
      : false;
    return {
      canvases: t.canvases,
      plate: {
        ...t.plate,
        dusk,
        jobs: (mode: PaintMode) => timedJobs(t.plate, mode, t.plate.jobs(mode)),
      },
    };
  });
  await paintPlates(
    timed,
    height,
    dpr,
    new AbortController().signal,
    () => 1000,
  );
  for (const rec of timings) {
    const v = views.find((w) => w.plate.id === rec.plate);
    const c = v?.[rec.mode];
    if (c && rec.jobs > 0) {
      rec.width = c.width;
      rec.height = c.height;
    }
  }
  const op = { colour: 1, glow: 0, dusk: 0 };
  for (const v of views) {
    const d = duskOf(v.plate);
    const evening = o.mode === "colour" && o.dusk !== undefined;
    if (evening) eveningOpacities(d, o.dusk ?? 0, 1, op);
    v.glow.style.opacity = evening ? String(op.glow) : "0";
    v.dusk.style.opacity = evening ? String(op.dusk) : "0";
    if (d?.rise && o.dusk !== undefined) {
      const px = v.colour.clientHeight / (v.plate.box[3] - v.plate.box[2]);
      v.dusk.style.transform = `translateY(${(-d.rise * duskShare(d.at, o.dusk) * px).toFixed(2)}px)`;
    }
    if (o.mode === "colour") {
      v.colour.style.opacity = evening ? String(op.colour) : "1";
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
