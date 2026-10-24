import type { Page } from "@playwright/test";

/** Must match PIN_LENGTH in src/scenes/01-dawn/choreography.ts. */
export const PIN_LENGTH = 3;

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
  const steps = Math.ceil(Math.abs(cssPx) / stepPx);
  const sign = Math.sign(cssPx);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, sign * stepPx * dpr);
    await page.waitForTimeout(pauseMs);
  }
}
