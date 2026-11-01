import type { Chart } from "@/components/chart";

/**
 * Demos of single chart layers, for development: `/lab/chart?demo=<name>`
 * adds the named demo's layers to the lab's chart, with the lab's camera
 * (the flight, or `?eye=` and `?look=`) and light (`?light=`). Each demo
 * loads as a chunk of its own, after the engine.
 */

export interface LabDemoContext {
  chart: Chart;
  query: URLSearchParams;
}

export interface LabDemo {
  /** Called every frame before the chart draws; p is the flight's progress. */
  update?(time: number, p: number): void;
  dispose?(): void;
}

export interface LabDemoModule {
  default: (context: LabDemoContext) => LabDemo | Promise<LabDemo>;
}

/** Each demo by name, one line each. */
export const LAB_DEMOS: Record<string, () => Promise<LabDemoModule>> = {};
