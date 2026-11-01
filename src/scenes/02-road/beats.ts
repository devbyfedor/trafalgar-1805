import { type Keyframe, monotoneCurve } from "@/lib/curve";
import { roadContent } from "./content";
import { day, formatDay } from "./dates";

/**
 * Scene 2's beats as ranges of its progress p (docs/decisions.md, "Scene 2,
 * Stage B", "Scroll and beats"), and the story's clock: which day of 1805
 * the chart shows at each p. The scene's timeline lasts 1, so a beat's
 * range is also its place on the timeline. Lengths are tuned by feel.
 */

/** Scroll length of scene 2's pin, viewport heights. */
export const PIN_LENGTH = 30;

export const BEATS = {
  transition: [0, 0.085],
  boulogne: [0.085, 0.235],
  chase: [0.235, 0.5],
  finisterre: [0.5, 0.65],
  cadiz: [0.65, 0.82],
  night: [0.82, 1],
} as const;

export type BeatId = keyof typeof BEATS;

/** Where each caption shows: fully between the inner two values. */
export const CAPTIONS: Record<
  keyof typeof roadContent.captions,
  readonly [number, number, number, number]
> = {
  boulogne: [0.168, 0.182, 0.222, 0.234],
  chase: [0.25, 0.264, 0.486, 0.499],
  finisterre: [0.512, 0.526, 0.636, 0.649],
  cadiz: [0.672, 0.686, 0.806, 0.819],
  night: [0.86, 0.874, 0.972, 0.99],
};

/**
 * The story's clock: the day the chart shows, as a monotone curve through
 * (p, day) keys within each beat. Between beats the clock jumps (the scene
 * opens on 21 October, goes back to Boulogne and the spring, and returns),
 * so each beat has its own curve.
 */
const CLOCK: Record<BeatId, readonly Keyframe[]> = {
  transition: [
    [0, day(10, 21, 6.5)],
    [0.085, day(10, 21, 7)],
  ],
  boulogne: [
    [0.085, day(8, 3)],
    [0.235, day(8, 10)],
  ],
  chase: [
    // Toulon to Cádiz at a pace the Mediterranean view can follow, the
    // crossings faster, the West Indies slower: they are where both
    // squadrons' sizes are seen.
    [0.235, day(3, 29)],
    [0.26, day(3, 30, 16)],
    [0.3, day(4, 10)],
    [0.345, day(5, 4)],
    [0.39, day(5, 16)],
    [0.43, day(6, 12)],
    [0.47, day(7, 2)],
    [0.5, day(7, 21)],
  ],
  finisterre: [
    [0.5, day(7, 21)],
    [0.53, day(7, 22, 18)],
    [0.545, day(7, 24)],
    [0.59, day(8, 15)],
    [0.61, day(8, 20, 20)],
    [0.635, day(8, 28)],
    [0.65, day(9, 25)],
  ],
  cadiz: [
    [0.65, day(9, 28)],
    [0.69, day(10, 18)],
    [0.7, day(10, 19, 6)],
    [0.78, day(10, 19, 9.6)],
    [0.82, day(10, 20, 9)],
  ],
  night: [
    [0.82, day(10, 20, 9)],
    [0.85, day(10, 20, 18)],
    [0.9, day(10, 20, 22)],
    [0.95, day(10, 21, 2)],
    [1, day(10, 21, 6.6)],
  ],
};

const curves = Object.fromEntries(
  Object.entries(CLOCK).map(([id, keys]) => [id, monotoneCurve(keys)]),
) as Record<BeatId, (p: number) => number>;

/** The beat at progress p. */
export function beatAt(p: number): BeatId {
  if (p < BEATS.boulogne[0]) return "transition";
  if (p < BEATS.chase[0]) return "boulogne";
  if (p < BEATS.finisterre[0]) return "chase";
  if (p < BEATS.cadiz[0]) return "finisterre";
  if (p < BEATS.night[0]) return "cadiz";
  return "night";
}

/** The day the chart shows at progress p (days since 1 January 1805). */
export function dayAt(p: number): number {
  const id = beatAt(p);
  const [from, to] = BEATS[id];
  return curves[id](Math.min(to, Math.max(from, p)));
}

/**
 * The date line's text at progress p: scene 1's dateline still holds the
 * place at the start; Boulogne is a season; the rest runs day by day.
 */
export function dateLineAt(p: number): string {
  const id = beatAt(p);
  if (id === "transition") return "";
  if (id === "boulogne") return roadContent.boulogneDate;
  return formatDay(dayAt(p));
}
