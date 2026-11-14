/**
 * "The chart comes alive": an interlude inserted into a pinned scene's
 * scroll (docs/scene-02-boulogne-brief.md). At a point of the scene's
 * progress p the story stops; the camera dives out of the chart into a
 * painting, holds there for a few screens of scroll, and rises back into
 * the chart, which takes up the story exactly where it stopped. It is the
 * scene 1 to scene 2 handoff (scenes/handoff.ts) run the other way, and
 * made to be reused for other key moments.
 *
 * This module is the scroll's arithmetic only: no DOM, no GSAP, no chart.
 * A scene that had p linear in scroll over `base` viewport heights keeps
 * exactly that slope everywhere outside its interludes, so every frame of
 * every other moment lands on the very same p, bit for bit, at the same
 * scroll offset from its neighbours (the slope of 1/base per screen); each
 * interlude adds its own screens, and while one runs p holds at its `at`.
 */

export type InterludePhase = "dive" | "hold" | "rise";

export interface InterludeSpec {
  /** A name, for hooks and records. */
  readonly id: string;
  /** The scene's progress p at which the story stops for the interlude. */
  readonly at: number;
  /** Viewport heights of scroll for each part. */
  readonly dive: number;
  readonly hold: number;
  readonly rise: number;
}

/** Where an interlude is, as a scroll position resolves it. */
export interface InterludeState {
  spec: InterludeSpec;
  phase: InterludePhase;
  /** Progress through the phase, 0..1. */
  t: number;
  /** Progress through the whole interlude, 0..1. */
  u: number;
  /** Screens of scroll from the interlude's start. */
  screens: number;
}

/** An interlude's place on the pin, screens from the pin's start. */
export interface InterludeSpan {
  readonly spec: InterludeSpec;
  /** Where it starts and ends, screens from the pin's start. */
  readonly from: number;
  readonly to: number;
  readonly length: number;
}

const total = (s: InterludeSpec) => s.dive + s.hold + s.rise;

/**
 * A pinned scene's scroll with its interludes: p for a scroll position and
 * the scroll position for p. Screens are viewport heights from the pin's
 * start; `base` is how many of them p takes from 0 to 1.
 */
export class InterludeScroll {
  readonly spans: readonly InterludeSpan[];
  /** The pin's whole length, screens. */
  readonly length: number;

  constructor(
    readonly base: number,
    interludes: readonly InterludeSpec[],
  ) {
    const sorted = [...interludes].sort((a, b) => a.at - b.at);
    let added = 0;
    const spans: InterludeSpan[] = [];
    for (const spec of sorted) {
      if (!(spec.at > 0 && spec.at < 1))
        throw new Error(`interlude ${spec.id}: at must lie inside (0, 1)`);
      if (spans.length && spans[spans.length - 1].spec.at >= spec.at)
        throw new Error(`interlude ${spec.id}: two interludes at one p`);
      const length = total(spec);
      if (!(length > 0)) throw new Error(`interlude ${spec.id}: no length`);
      const from = spec.at * base + added;
      spans.push({ spec, from, to: from + length, length });
      added += length;
    }
    this.spans = spans;
    this.length = base + added;
  }

  /** The scene's p at a scroll position (screens from the pin's start). */
  pAt(screens: number): number {
    let added = 0;
    for (const span of this.spans) {
      if (screens < span.from) break;
      if (screens < span.to) return span.spec.at;
      added += span.length;
    }
    return Math.min(1, Math.max(0, (screens - added) / this.base));
  }

  /**
   * The interlude at a scroll position, written into `out`; null outside
   * every interlude. Its parts meet without a gap: the hold's first screen
   * is the dive's last, and so on.
   */
  interludeAt(screens: number, out: InterludeState): InterludeState | null {
    for (const span of this.spans) {
      if (screens < span.from) return null;
      if (screens >= span.to) continue;
      const s = screens - span.from;
      const { dive, hold, rise } = span.spec;
      out.spec = span.spec;
      out.screens = s;
      out.u = s / span.length;
      if (s < dive) {
        out.phase = "dive";
        out.t = s / dive;
      } else if (s < dive + hold) {
        out.phase = "hold";
        out.t = (s - dive) / hold;
      } else {
        out.phase = "rise";
        out.t = Math.min(1, (s - dive - hold) / rise);
      }
      return out;
    }
    return null;
  }

  /**
   * The scroll position (screens from the pin's start) of the scene's p.
   * At an interlude's own p it is where the interlude begins; a p past it
   * is that many screens later.
   */
  screensFor(p: number): number {
    const q = Math.min(1, Math.max(0, p));
    let added = 0;
    for (const span of this.spans) {
      if (q <= span.spec.at) break;
      added += span.length;
    }
    return q * this.base + added;
  }

  /** The scroll position of a point inside an interlude, screens from the pin's start. */
  screensForInterlude(id: string, phase: InterludePhase, t: number): number {
    const span = this.spans.find((s) => s.spec.id === id);
    if (!span) return Number.NaN;
    const { dive, hold, rise } = span.spec;
    const k = Math.min(1, Math.max(0, t));
    const offset =
      phase === "dive"
        ? k * dive
        : phase === "hold"
          ? dive + k * hold
          : dive + hold + k * rise;
    return span.from + offset;
  }
}

/** Hermite smoothstep of x between a and b. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
