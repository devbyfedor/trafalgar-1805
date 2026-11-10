/**
 * Work cut into slices of a few milliseconds, each run when the browser is
 * idle, so building the chart while scene 1 plays never holds a frame back:
 * no task over 50 ms while scrolling, and room for every frame
 * (docs/research/perf-start-of-scroll.md). Never paused on
 * requestAnimationFrame: work run there delays the very frame it waits for.
 */

/** How long a slice may run before it yields, ms. */
export const SLICE_MS = 4;

/**
 * Waits for the browser to be idle (or `timeout` ms at most), or a
 * macrotask where idle callbacks don't exist.
 */
export function idle(timeout = 100): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 0);
  });
}

/**
 * A clock for sliced loops: after each item, `if (slicer.due()) await
 * slicer.next()`. A slice runs SLICE_MS or until its item ends; an item
 * longer than that is a slice of its own.
 */
export class Slicer {
  private started = performance.now();

  constructor(
    private readonly budget = SLICE_MS,
    private readonly signal?: AbortSignal,
  ) {}

  /** The slice has run its time. */
  due(): boolean {
    return performance.now() - this.started >= this.budget;
  }

  /** Yields to the browser and starts the next slice. */
  async next(): Promise<void> {
    await idle();
    this.signal?.throwIfAborted();
    this.started = performance.now();
  }

  /** Yields if the slice has run its time. */
  async check(): Promise<void> {
    if (this.due()) await this.next();
  }
}
