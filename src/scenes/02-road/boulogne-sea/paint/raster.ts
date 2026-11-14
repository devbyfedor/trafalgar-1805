import { Slicer } from "@/components/chart/engine/slice";
import { UNIT_VH } from "../view";
import { duskJobs, duskOf } from "./dusk";
import type { Plate, PlateCanvas, PlateJob, PlateMode } from "./plate";

/**
 * Paints the plates into their canvases ahead of the dive, in idle slices
 * of a few milliseconds (the chart's own Slicer: no long task while the
 * reader scrolls), then never touches them until the viewport changes.
 *
 * A plate's canvases are as big as its box at the viewport's scale, in
 * device pixels: the compositor only moves and fades them (plate.ts).
 */

export interface PlateTarget {
  plate: Plate;
  /** The plate's canvases by mode; null where the plate has no raster of that mode. */
  canvases: Partial<Record<PlateMode, HTMLCanvasElement>>;
}

/** Device pixels per layer unit for a viewport `height` CSS px tall at `dpr`. */
export function plateScale(height: number, dpr: number): number {
  return (UNIT_VH / 100) * height * dpr;
}

/** The size, device px, of a plate's canvas of `mode` at scale `k` (its resolution applied). */
export function plateSize(
  plate: Plate,
  k: number,
  mode: PlateMode = "colour",
): { width: number; height: number } {
  const [x0, x1, y0, y1] = plate.box;
  // The dusk raster is the colour raster graded: the colour's resolution.
  const r =
    k *
    (plate.resolution?.[mode] ??
      (mode === "dusk" ? plate.resolution?.colour : undefined) ??
      1);
  return {
    width: Math.max(1, Math.ceil((x1 - x0) * r)),
    height: Math.max(1, Math.ceil((y1 - y0) * r)),
  };
}

function canvasFor(
  plate: Plate,
  canvas: HTMLCanvasElement,
  mode: PlateMode,
  k: number,
  colour?: HTMLCanvasElement,
): PlateCanvas | null {
  const { width, height } = plateSize(plate, k, mode);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  const [x0, x1, y0, y1] = plate.box;
  const sx = width / (x1 - x0);
  const sy = height / (y1 - y0);
  const reset = () => {
    ctx.setTransform(sx, 0, 0, -sy, -x0 * sx, y1 * sy);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
  };
  reset();
  const unit = 1 / Math.min(sx, sy);
  return {
    ctx,
    mode,
    k: Math.min(sx, sy),
    pen: (px: number) => px * unit,
    box: plate.box,
    ...(colour ? { colour } : {}),
  };
}

/**
 * Paints every plate's rasters for a viewport `height` CSS px tall at
 * `dpr`, a job at a time in idle slices. Resolves true when all are done,
 * false if aborted. `budget` is a slice's length in ms (the chart's 4 by
 * default; more when the reader is about to need the painting).
 */
export async function paintPlates(
  targets: readonly PlateTarget[],
  height: number,
  dpr: number,
  signal: AbortSignal,
  budget?: () => number,
): Promise<boolean> {
  const k = plateScale(height, dpr);
  let slicer = new Slicer(budget?.() ?? 4, signal);
  // An accelerated canvas records its drawing and the GPU rasterises it
  // only when the canvas is next flushed: at the latest when it is first
  // shown, which would put the whole painting's raster into one frame at
  // the dive. A snapshot at the end of each slice flushes that slice's
  // drawing, so the GPU's work is spread over the slices as the main
  // thread's is.
  const flush = (canvas: HTMLCanvasElement) => {
    if (typeof createImageBitmap !== "function") return;
    createImageBitmap(canvas).then(
      (b) => b.close(),
      () => {},
    );
  };
  // The colour and the engraving of every plate first, then the dusk of
  // every plate: a dusk raster grades its colour raster, and the lights'
  // read what the colour jobs of their areas recorded.
  const passes: { t: PlateTarget; mode: PlateMode }[] = [];
  for (const t of targets)
    for (const mode of ["colour", "ink"] as const) passes.push({ t, mode });
  for (const t of targets) passes.push({ t, mode: "dusk" });
  try {
    for (const { t, mode } of passes) {
      {
        const canvas = t.canvases[mode];
        if (!canvas) continue;
        let jobs: readonly PlateJob[];
        if (mode === "dusk") {
          const dusk = duskOf(t.plate);
          if (!dusk) continue;
          jobs = duskJobs(dusk);
        } else jobs = t.plate.jobs(mode);
        const c = canvasFor(
          t.plate,
          canvas,
          mode,
          k,
          mode === "dusk" ? t.canvases.colour : undefined,
        );
        if (!c) continue;
        for (const job of jobs) {
          c.ctx.save();
          job(c);
          c.ctx.restore();
          if (slicer.due()) {
            flush(canvas);
            await slicer.next();
            const b = budget?.();
            if (b !== undefined) slicer = new Slicer(b, signal);
          }
        }
        flush(canvas);
        await slicer.check();
      }
    }
  } catch (e) {
    if (signal.aborted) return false;
    throw e;
  }
  return !signal.aborted;
}
