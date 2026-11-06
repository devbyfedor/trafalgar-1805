/**
 * Frame timing for development: how long the chart takes to draw a frame
 * on this machine, measured on the GPU with EXT_disjoint_timer_query_webgl2
 * where the browser offers it, and on the CPU around the draw call
 * (scripts/dev/bench.mjs drives it through the lab's `window.__chart`, and
 * scripts/dev/road-bench.mjs through scene 2's `window.__road`).
 * Each frame is drawn in its own animation frame while the lab's own loop
 * is held, so the GPU sees the same work as in the flight.
 */

export interface BenchResult {
  /** GPU time of each frame, ms; empty without the timer extension. */
  gpu: number[];
  /** The frame each GPU time belongs to (a lost timing leaves a gap). */
  gpuFrame: number[];
  /** CPU time of each draw call (the layers' updates and three's render), ms. */
  cpu: number[];
  /** Frames whose GPU timing was lost to a disjoint event. */
  disjoint: number;
}

interface TimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * `before(i)`, if given, runs before frame i is drawn and timed: a variant
 * switched on alternate frames is measured at the same clock as the other
 * (on battery, or under a sustained load, the GPU's clock moves within a
 * second, so variants timed a burst apart can't be compared).
 */
export async function benchFrames(
  gl: WebGL2RenderingContext,
  draw: (time: number) => void,
  frames: number,
  before?: (frame: number) => void,
): Promise<BenchResult> {
  const ext = gl.getExtension(
    "EXT_disjoint_timer_query_webgl2",
  ) as TimerExt | null;
  const queries: WebGLQuery[] = [];
  const cpu: number[] = [];
  for (let i = 0; i < frames; i++) {
    const time = (await nextFrame()) / 1000;
    before?.(i);
    const query = ext ? gl.createQuery() : null;
    if (ext && query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    const start = performance.now();
    draw(time);
    cpu.push(performance.now() - start);
    if (ext && query) {
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      queries.push(query);
    }
  }
  const gpu: number[] = [];
  const gpuFrame: number[] = [];
  let disjoint = 0;
  if (ext) {
    // Query results arrive in later frames.
    for (let tries = 0; tries < 120; tries++) {
      await nextFrame();
      const last = queries[queries.length - 1];
      if (gl.getQueryParameter(last, gl.QUERY_RESULT_AVAILABLE)) break;
    }
    const lost = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
    queries.forEach((query, i) => {
      if (!lost && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
        gpu.push(
          (gl.getQueryParameter(query, gl.QUERY_RESULT) as number) / 1e6,
        );
        gpuFrame.push(i);
      } else disjoint++;
      gl.deleteQuery(query);
    });
  }
  return { gpu, gpuFrame, cpu, disjoint };
}
