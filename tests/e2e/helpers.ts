import type { Page, Request } from "@playwright/test";

/**
 * Opens a page and waits until its requests have been quiet for half a
 * second. Not Playwright's "networkidle": a dedicated worker's script, which
 * troika's text worker loads from a blob: URL once scene 2's chart is set
 * up, never reports as finished, so that state never comes.
 */
export async function open(page: Page, url: string): Promise<void> {
  const pending = new Set<Request>();
  const track = (r: Request) => {
    const u = r.url();
    if (!u.startsWith("blob:") && !u.startsWith("data:")) pending.add(r);
  };
  const done = (r: Request) => pending.delete(r);
  page.on("request", track);
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  try {
    await page.goto(url, { waitUntil: "load" });
    const deadline = Date.now() + 30_000;
    let quietSince = Date.now();
    while (Date.now() < deadline) {
      if (pending.size > 0) quietSince = Date.now();
      else if (Date.now() - quietSince >= 500) break;
      await page.waitForTimeout(100);
    }
  } finally {
    page.off("request", track);
    page.off("requestfinished", done);
    page.off("requestfailed", done);
  }
}

/** Must match PIN_LENGTH in src/scenes/01-dawn/choreography.ts. */
export const PIN_LENGTH = 3;
/** Must match HANDOFF_LENGTH in src/scenes/handoff.ts. */
export const HANDOFF_LENGTH = 2.5;

/** Scene 2's hook for the tests (src/scenes/02-road/Scene02Road.tsx). */
type RoadHook = NonNullable<Window["__road"]>;
/** Scene 2's pin: `base` screens for p, its whole `length`, each interlude's place (screens from the pin's start). */
export type RoadPin = RoadHook["pin"];
export type RoadInterlude = RoadPin["interludes"][number];
/** An interlude's part. */
export type InterludePhase = Parameters<RoadHook["scrollForInterlude"]>[1];
/** Must match BOULOGNE.id in src/scenes/02-road/interludes.ts. */
export const BOULOGNE = "boulogne";

/** A point of an interlude: its part, and t (0..1) through it; Boulogne's unless `id` names another. */
export interface InterludePoint {
  phase: InterludePhase;
  t: number;
  id?: string;
}

/** Collects console errors and uncaught page errors from the moment it is called. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Records every request URL. */
export function collectRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (req) => urls.push(req.url()));
  return urls;
}

/** Waits for two animation frames, so ScrollTrigger and GSAP have rendered. */
export async function settleFrames(page: Page, frames = 2): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let left = n;
        const step = () => {
          left -= 1;
          if (left <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    frames,
  );
}

/** Jumps to scroll progress p of scene 1 (0..1), bypassing smoothing. */
export async function scrollToProgress(page: Page, p: number): Promise<void> {
  await page.evaluate(
    ({ p, pin }) => {
      const y = Math.round(p * pin * window.innerHeight);
      if (window.__lenis)
        window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    { p, pin: PIN_LENGTH },
  );
  await settleFrames(page, 3);
}

/** Jumps to a scroll position (CSS px), bypassing smoothing. */
export async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => {
    if (window.__lenis)
      window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, y);
  await settleFrames(page, 3);
}

/**
 * Waits for scene 2's chart (window.__road.ready), its glyph layout baked
 * for the viewport unless `baked` is false, and with `sea` Boulogne's
 * painting ready too (without it the interlude shows the chart's own dive).
 */
export async function waitForRoad(
  page: Page,
  { baked = true, sea = false, timeout = 240_000 } = {},
): Promise<void> {
  await page.waitForFunction(
    ([b, s]) => {
      const road = window.__road;
      return Boolean(
        road?.ready && (!b || road.baked) && (!s || road.seaReady),
      );
    },
    [baked, sea] as const,
    { timeout },
  );
}

const NOT_READY =
  "scene 2's hook isn't there: wait for window.__road.ready first (waitForRoad)";

/** Scene 2's pin as the page lays it out (window.__road.pin). */
export async function roadPin(page: Page): Promise<RoadPin> {
  const pin = await page.evaluate(() => window.__road?.pin ?? null);
  if (!pin) throw new Error(NOT_READY);
  return pin;
}

/** An interlude's place on the pin, by its id (Boulogne's by default). */
export function interludeOf(pin: RoadPin, id = BOULOGNE): RoadInterlude {
  const lude = pin.interludes.find((i) => i.id === id);
  if (!lude) throw new Error(`no interlude "${id}" on scene 2's pin`);
  return lude;
}

/** Screens from the pin's start to a point of an interlude, as the page counts them. */
export function interludeScreens(
  lude: RoadInterlude,
  point: InterludePoint,
): number {
  const t = Math.min(1, Math.max(0, point.t));
  const offset =
    point.phase === "dive"
      ? t * lude.dive
      : point.phase === "hold"
        ? lude.dive + t * lude.hold
        : lude.dive + lude.hold + t * lude.rise;
  return lude.from + offset;
}

/** Whether the page leaves the chart undrawn at a point (the interlude's painting covers it). */
export function coveredAt(lude: RoadInterlude, point: InterludePoint): boolean {
  const at = interludeScreens(lude, point);
  return at > lude.covered[0] && at < lude.covered[1];
}

/**
 * The page's scroll position (CSS px) that shows scene 2 at p, by the
 * scene's own map (window.__road.scrollFor): its pin counts the
 * interludes' screens too, so p is no longer linear in the scroll. At an
 * interlude's own p it is where the interlude begins.
 */
export async function roadScrollFor(page: Page, p: number): Promise<number> {
  const y = await page.evaluate(
    (at) => window.__road?.scrollFor(at) ?? Number.NaN,
    p,
  );
  if (!Number.isFinite(y)) throw new Error(NOT_READY);
  return y;
}

/** The page's scroll position (CSS px) of a point of an interlude. */
export async function interludeScrollFor(
  page: Page,
  point: InterludePoint,
): Promise<number> {
  const id = point.id ?? BOULOGNE;
  const y = await page.evaluate(
    ([id, phase, t]) =>
      window.__road?.scrollForInterlude(id, phase, t) ?? Number.NaN,
    [id, point.phase, point.t] as const,
  );
  if (!Number.isFinite(y))
    throw new Error(`no interlude "${id}" on the page, or ${NOT_READY}`);
  return y;
}

/**
 * Jumps to progress p of scene 2 (0..1), bypassing smoothing, where the
 * scene's own map puts it. Scene 2's pin starts where scene 1's progress
 * reaches 1 (src/scenes/handoff.ts). Its timeline is scrubbed, so the
 * scene's own progress catches up over the scrub's 0.6 s.
 */
export async function scrollToRoad(page: Page, p: number): Promise<void> {
  await scrollToY(page, await roadScrollFor(page, p));
}

/** Jumps to a point of an interlude (its dive, hold or rise at t), bypassing smoothing. */
export async function scrollToInterlude(
  page: Page,
  point: InterludePoint,
): Promise<void> {
  await scrollToY(page, await interludeScrollFor(page, point));
}

export interface TimingEntry {
  start: number;
  duration: number;
  /** Long animation frames only: the part that blocked input. */
  blocking?: number;
}

/**
 * Starts recording long tasks and long animation frames before any page
 * script runs. Long animation frames tie main-thread work to the frames it
 * delayed, which is what scroll jank is.
 */
export async function recordLongTasks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __longTasks: TimingEntry[];
      __loafs: TimingEntry[];
    };
    w.__longTasks = [];
    w.__loafs = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          w.__longTasks.push({
            start: entry.startTime,
            duration: entry.duration,
          });
        }
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const blocking = (entry as unknown as { blockingDuration?: number })
            .blockingDuration;
          w.__loafs.push({
            start: entry.startTime,
            duration: entry.duration,
            blocking,
          });
        }
      }).observe({ type: "long-animation-frame", buffered: true });
    } catch {
      // An API is unavailable: leave the lists empty.
    }
  });
}

export async function readLongTasks(
  page: Page,
): Promise<{ longTasks: TimingEntry[]; loafs: TimingEntry[] }> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __longTasks?: TimingEntry[];
      __loafs?: TimingEntry[];
    };
    return { longTasks: w.__longTasks ?? [], loafs: w.__loafs ?? [] };
  });
}

/** Scrolls with real wheel input (which Lenis smooths). Deltas are CSS px. */
export async function wheelBy(
  page: Page,
  cssPx: number,
  stepPx = 120,
  pauseMs = 70,
): Promise<void> {
  // Playwright divides wheel deltas by the device scale factor; undo that so
  // the requested distance is in CSS pixels.
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  // Whole steps, then what is left: exactly the distance asked, so a scroll
  // down and back up by the same distance returns to the same place.
  const sign = Math.sign(cssPx);
  let left = Math.abs(cssPx);
  while (left > 0.5) {
    const step = Math.min(stepPx, left);
    await page.mouse.wheel(0, sign * step * dpr);
    left -= step;
    await page.waitForTimeout(pauseMs);
  }
}

/** The q-quantile of a list (NaN when empty). */
export function quantile(values: number[], q: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** One of the page's frames, as recordFrames keeps it. */
export interface FrameRecord {
  /** requestAnimationFrame's time for the frame, ms. */
  ts: number;
  /** Since the frame before, ms (NaN for the first). */
  dt: number;
  /** When the recorder's callback, the frame's first, ran (performance.now). */
  start: number;
  /** The page's scroll position, CSS px. */
  y: number;
  /** The main thread's time from the frame's start until a task after it, ms. */
  cpu: number;
  /** The GPU's time on scene 2's chart context from this frame's start to the next's, ms (NaN where not timed). */
  gpu: number;
}

export interface FrameRun {
  /** Whether the chart's GPU time could be read. */
  gpuTimer: boolean;
  frames: FrameRecord[];
  longTasks: TimingEntry[];
  loafs: TimingEntry[];
}

interface FrameRecorder {
  on: boolean;
  t0: number;
  t1: number;
  frames: FrameRecord[];
  longTasks: TimingEntry[];
  loafs: TimingEntry[];
  gl: WebGL2RenderingContext | null;
  ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  query: WebGLQuery | null;
  queryFrame: number;
  pending: [WebGLQuery, number][];
  start: () => boolean;
  stop: () => void;
}

/**
 * Records the page's own frames, from before any of its scripts runs, so
 * the recorder's animation-frame callback is the first of every frame:
 * each frame's interval; the main thread's time from the frame's start
 * until a task posted from it runs (the page's callbacks, style, layout,
 * paint and the commit come between); the GPU's time on scene 2's chart
 * context from this frame's start to the next's, which holds that frame's
 * draw (EXT_disjoint_timer_query_webgl2 where the browser offers it; the
 * compositor's own work, the painting's layers among it, is not in it);
 * and the long tasks and long animation frames. Idle until startFrames.
 */
export async function recordFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const rec = {
      on: false,
      t0: 0,
      t1: 0,
      frames: [],
      longTasks: [],
      loafs: [],
      gl: null,
      ext: null,
      query: null,
      queryFrame: -1,
      pending: [],
    } as unknown as FrameRecorder;
    (window as unknown as { __frames: FrameRecorder }).__frames = rec;
    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent<number>) => {
      const frame = rec.frames[event.data];
      if (frame) frame.cpu = performance.now() - frame.start;
    };
    // The GPU's times as they arrive, in order, a few frames late.
    const collect = () => {
      const { gl, ext } = rec;
      if (!gl || !ext || !rec.pending.length) return;
      const lost = Boolean(gl.getParameter(ext.GPU_DISJOINT_EXT));
      while (rec.pending.length) {
        const [query, k] = rec.pending[0];
        if (!lost && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE))
          break;
        if (!lost && rec.frames[k])
          rec.frames[k].gpu =
            Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1e6;
        gl.deleteQuery(query);
        rec.pending.shift();
      }
    };
    const close = () => {
      if (!rec.query || !rec.gl || !rec.ext) return;
      rec.gl.endQuery(rec.ext.TIME_ELAPSED_EXT);
      rec.pending.push([rec.query, rec.queryFrame]);
      rec.query = null;
    };
    let lastTs = Number.NaN;
    const tick = (ts: number) => {
      requestAnimationFrame(tick);
      collect();
      if (!rec.on) {
        lastTs = Number.NaN;
        return;
      }
      const start = performance.now();
      const i = rec.frames.length;
      rec.frames.push({
        ts,
        dt: ts - lastTs,
        start,
        y: window.scrollY,
        cpu: Number.NaN,
        gpu: Number.NaN,
      });
      lastTs = ts;
      channel.port2.postMessage(i);
      if (rec.gl && rec.ext) {
        close();
        rec.query = rec.gl.createQuery();
        rec.queryFrame = i;
        rec.gl.beginQuery(rec.ext.TIME_ELAPSED_EXT, rec.query);
      }
    };
    requestAnimationFrame(tick);
    const observe = (type: string, push: (entry: PerformanceEntry) => void) => {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) push(entry);
        }).observe({ type, buffered: true });
      } catch {
        // Not offered here: the list stays empty.
      }
    };
    observe("longtask", (e) =>
      rec.longTasks.push({ start: e.startTime, duration: e.duration }),
    );
    observe("long-animation-frame", (e) =>
      rec.loafs.push({
        start: e.startTime,
        duration: e.duration,
        blocking: (e as unknown as { blockingDuration?: number })
          .blockingDuration,
      }),
    );
    rec.start = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        "[data-layer=chart] canvas",
      );
      const gl = canvas?.getContext("webgl2") ?? null;
      rec.gl = gl;
      rec.ext = gl?.getExtension("EXT_disjoint_timer_query_webgl2") ?? null;
      rec.frames = [];
      rec.pending = [];
      rec.query = null;
      rec.t0 = performance.now();
      rec.on = true;
      return rec.ext !== null;
    };
    rec.stop = () => {
      rec.on = false;
      rec.t1 = performance.now();
      close();
    };
  });
}

/** Starts recording the page's frames (recordFrames). */
export async function startFrames(page: Page): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as { __frames: FrameRecorder }).__frames.start(),
  );
}

/** Waits until `count` frames have been recorded since startFrames. */
export async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (n) =>
      (window as unknown as { __frames: FrameRecorder }).__frames.frames
        .length >= n,
    count,
    { timeout: 60_000, polling: 100 },
  );
}

/** Stops recording and reads the frames, once the GPU's last times are in. */
export async function stopFrames(page: Page): Promise<FrameRun> {
  return page.evaluate(async () => {
    const rec = (window as unknown as { __frames: FrameRecorder }).__frames;
    rec.stop();
    for (let i = 0; i < 60 && rec.pending.length; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
    const within = (e: TimingEntry) => e.start >= rec.t0 && e.start <= rec.t1;
    return {
      gpuTimer: rec.ext !== null,
      frames: rec.frames,
      longTasks: rec.longTasks.filter(within),
      loafs: rec.loafs.filter(within),
    };
  });
}

/** A run's numbers: intervals, the main thread, the chart's GPU, long tasks (ms). */
export interface FrameStats {
  frames: number;
  intervalMedian: number;
  intervalP95: number;
  intervalMax: number;
  /** Frames more than half a frame late at 60 Hz (an interval over 25 ms). */
  late: number;
  mainMedian: number;
  mainP95: number;
  mainMax: number;
  gpuTimed: number;
  gpuMedian: number;
  gpuP95: number;
  gpuMax: number;
  longTasks: number;
  longestTask: number;
  loafs: number;
  worstBlocking: number;
}

export function frameStats(
  run: Pick<FrameRun, "frames" | "longTasks" | "loafs">,
): FrameStats {
  const finite = (values: number[]) => values.filter(Number.isFinite);
  const dt = finite(run.frames.map((f) => f.dt));
  const cpu = finite(run.frames.map((f) => f.cpu));
  const gpu = finite(run.frames.map((f) => f.gpu));
  const max = (values: number[]) =>
    values.length ? Math.max(...values) : Number.NaN;
  return {
    frames: run.frames.length,
    intervalMedian: quantile(dt, 0.5),
    intervalP95: quantile(dt, 0.95),
    intervalMax: max(dt),
    late: dt.filter((v) => v > 25).length,
    mainMedian: quantile(cpu, 0.5),
    mainP95: quantile(cpu, 0.95),
    mainMax: max(cpu),
    gpuTimed: gpu.length,
    gpuMedian: quantile(gpu, 0.5),
    gpuP95: quantile(gpu, 0.95),
    gpuMax: max(gpu),
    longTasks: run.longTasks.length,
    longestTask: Math.max(0, ...run.longTasks.map((t) => t.duration)),
    loafs: run.loafs.length,
    worstBlocking: Math.max(0, ...run.loafs.map((t) => t.blocking ?? 0)),
  };
}
