/**
 * The adaptive quality ladder: a safety net for machines weaker than the
 * owner's laptop, which must hold the top level. The first rungs lower the
 * render resolution, the last also drops the optional effects.
 *
 * Frame intervals are measured between rendered frames. A display's vsync
 * caps them, so headroom can't be seen directly: the ladder steps down after
 * sustained misses and tries a step up only after a long clean stretch; a
 * step up that brings misses back is undone with a doubled waiting time
 * (hysteresis with back-off).
 */

export interface QualityLevel {
  /** Device pixels per CSS pixel, before the device's own ratio caps it. */
  dpr: number;
  /** Optional effects: shadows and the finest line work. */
  effects: boolean;
}

export const QUALITY_LADDER: readonly QualityLevel[] = [
  { dpr: 1.5, effects: true },
  { dpr: 1.25, effects: true },
  { dpr: 1.0, effects: true },
  { dpr: 0.85, effects: false },
];

/**
 * The pixel ratio the chart draws at on a rung of the ladder (the top by
 * default), the device's own ratio capping it: a host creates its canvas at
 * this size before the chart's context, so the context never reallocates
 * its multisampled buffer to fit (Chart.applyQuality). No imports, so a
 * page may use it without loading the chart.
 */
export function chartPixelRatio(level = 0): number {
  const device =
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const rung = Math.min(QUALITY_LADDER.length - 1, Math.max(0, level));
  return Math.min(device, QUALITY_LADDER[rung].dpr);
}

/** A frame slower than this missed a 60 Hz refresh (with some slack). */
const MISS_MS = 19.5;
const WINDOW = 90;

export class QualityLadder {
  level = 0;
  private readonly samples = new Float32Array(WINDOW);
  private count = 0;
  private lastTime = -1;
  private badWindows = 0;
  private goodWindows = 0;
  /** Clean windows needed before a step up; doubles after a failed one. */
  private upAfter = 6;
  private raisedAt = -1;

  constructor(private readonly onChange: (level: QualityLevel) => void) {}

  get current(): QualityLevel {
    return QUALITY_LADDER[this.level];
  }

  /** Forget timing (after a pause, a resize or a hidden tab). */
  reset(): void {
    this.lastTime = -1;
    this.count = 0;
  }

  /** Call once per rendered frame with the ticker's time in seconds. */
  frame(time: number): void {
    if (this.lastTime < 0) {
      this.lastTime = time;
      return;
    }
    const ms = (time - this.lastTime) * 1000;
    this.lastTime = time;
    // A long gap is a pause, not a slow frame.
    if (ms > 250) return;
    this.samples[this.count++] = ms;
    if (this.count < WINDOW) return;
    this.count = 0;

    let misses = 0;
    for (let i = 0; i < WINDOW; i++) if (this.samples[i] > MISS_MS) misses++;
    const missRate = misses / WINDOW;

    if (missRate > 0.12) {
      this.goodWindows = 0;
      this.badWindows++;
      if (this.badWindows >= 2 && this.level < QUALITY_LADDER.length - 1) {
        // A step up that failed waits twice as long before the next try.
        if (this.raisedAt >= 0 && time - this.raisedAt < 10) this.upAfter *= 2;
        this.raisedAt = -1;
        this.set(this.level + 1);
      }
    } else if (missRate < 0.02) {
      this.badWindows = 0;
      this.goodWindows++;
      if (this.goodWindows >= this.upAfter && this.level > 0) {
        this.raisedAt = time;
        this.set(this.level - 1);
      }
    } else {
      this.badWindows = 0;
      this.goodWindows = 0;
    }
  }

  /** Pins a level (the lab's `?quality=` and tests). */
  force(level: number): void {
    this.set(Math.max(0, Math.min(QUALITY_LADDER.length - 1, level)));
  }

  private set(level: number) {
    if (level === this.level) return;
    this.level = level;
    this.badWindows = 0;
    this.goodWindows = 0;
    this.onChange(this.current);
  }
}
