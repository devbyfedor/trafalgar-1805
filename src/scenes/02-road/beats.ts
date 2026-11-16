import { hermiteCurve, type Keyframe, monotoneCurve } from "@/lib/curve";
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
  boulogne: [0.1535, 0.165, 0.222, 0.234],
  chase: [0.25, 0.264, 0.486, 0.499],
  finisterre: [0.512, 0.526, 0.636, 0.649],
  cadiz: [0.672, 0.686, 0.806, 0.819],
  night: [0.86, 0.874, 0.972, 0.99],
};

/**
 * Where the camera settles on the last frame and holds it to the scene's
 * end (camera.ts), about 300 px of scroll on the owner's screen; the clock
 * comes to dawn there, at rest, so the fleets stand at their dawn places
 * through the hold: the still tableau scene 3 takes up. They had sailed on
 * through it (from about 5.20 a.m.), the formations still opening into
 * their dawn order, so the last frame's layout changed under a still
 * camera and the eased sizes never settled before the end.
 */
export const LAST_HOLD = 0.978;

/**
 * The camera's hold over the action off Finisterre on 22 July (camera.ts):
 * it comes down onto the two lines at the first p and pushes in a little
 * to the second, about 450 px of scroll on the owner's screen.
 */
export const FINISTERRE_HOLD = [0.527, 0.548] as const;

/**
 * The action's firing, hours of 22 July: the vans' first guns, about 5.15
 * p.m., and the end of the firing, 9.30 p.m. (smoke.ts; history-notes.md,
 * "Cape Finisterre, 22 and 23 July").
 */
export const FIRING_HOURS = [17.25, 21.5] as const;

/**
 * The firing's share of the hold (the owner's answer of 16 November 2026:
 * about two thirds; the closing without smoke runs faster). The end of the
 * firing stays where the unbroken clock has it, so the smoke thins and
 * drifts off as before; the first guns come earlier.
 */
const FIRING_SHARE = 2 / 3;

/**
 * The story's clock: the day the chart shows, as a monotone curve through
 * (p, day) keys within each beat. Between the first beats the clock jumps
 * (the scene opens on 21 October, goes back to Boulogne and the spring),
 * so those have curves of their own; from the chase on it runs unbroken to
 * the dawn of the 21st, one curve through every beat's keys (UNBROKEN).
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
    // The 22nd of July spread over the plan of the action (director.ts,
    // MEETINGS), so the date line reads it all through. Inside the camera's
    // hold the hours are shared anew (FINISTERRE_HOLD, heldClock).
    [0.516, day(7, 22)],
    [0.55, day(7, 22, 23.5)],
    [0.56, day(7, 24)],
    // Room for the strengths lettered at Villeneuve's head as they change
    // two or three days apart (director.ts, changeWindows): out of Vigo with
    // 15 on 31 July and 13 at A Coruña on 2 August, then 26 in the bay of
    // Ares on the 10th and 29 out of Ferrol on the 13th, each figure about
    // 85 px of scroll from the next (the story's pace had put them 40 to 80
    // px apart, too close for a figure to read); the days between faster.
    [0.565, day(7, 30, 12)],
    [0.573, day(8, 3, 12)],
    [0.577, day(8, 10, 6)],
    // Out of Ferrol on the 13th, and on the evening of the 15th the turn
    // south for Cádiz, the beat's turning point: slower, so the line bends
    // over a stretch of scroll (at the old pace the squadron swung through
    // 110° within three steps of p).
    [0.584, day(8, 14, 6)],
    [0.6, day(8, 16, 18)],
    [0.61, day(8, 20, 20)],
    // Collingwood's four (the Mars back at midnight on the 20th) read before
    // his label goes as Bickerton's ships join him on the 22nd.
    [0.6145, day(8, 22, 12)],
    // The army leaves Boulogne; then Nelson's passage from St Helens to the
    // fleet off Cádiz, which beat 4 takes up on the same day.
    [0.62, day(8, 28)],
    [0.632, day(9, 14, 6)],
    [0.65, day(9, 28)],
  ],
  cadiz: [
    [0.65, day(9, 28)],
    // Room for the British fleet's strength as ships join a day apart (24
    // with the Defiance on the morning of 7 October, 26 with the Leviathan
    // and Royal Sovereign on the afternoon of the 8th, 27 with the Belleisle
    // on the 10th): each figure about 85 px of scroll from the next.
    [0.664, day(10, 6, 12)],
    [0.6705, day(10, 8, 16)],
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
    [LAST_HOLD, day(10, 21, 6.6)],
    [1, day(10, 21, 6.6)],
  ],
};

/**
 * The beats whose clock runs on unbroken, each ending on the day the next
 * begins: their keys form one curve, so the clock's pace (and every ship's
 * speed on screen with it) never changes in a step at their bounds. Each
 * beat's own curve had turned its end on its own keys alone.
 */
const UNBROKEN: readonly BeatId[] = ["chase", "finisterre", "cadiz", "night"];

function unbrokenKeys(): Keyframe[] {
  const keys: Keyframe[] = [];
  for (const id of UNBROKEN) {
    for (const key of CLOCK[id]) {
      const last = keys[keys.length - 1];
      if (last && key[0] === last[0]) {
        if (key[1] !== last[1])
          throw new Error(`clock: ${id} begins on another day than it was`);
        continue;
      }
      keys.push(key);
    }
  }
  return keys;
}

/**
 * The clock through the camera's hold over the action off Finisterre: the
 * unbroken curve's own hours at the hold's two ends, and its pace there,
 * so not a frame outside the hold changes; between them the firing (5.15
 * to 9.30 p.m.) takes FIRING_SHARE of the hold at an even pace, ending
 * where the unbroken clock ends it, and the lines close before it faster.
 * The unbroken curve slows through the hold's first half and runs ever
 * faster through its second, which had crowded the firing into the last
 * 205 px of the hold's 450 (session 33).
 */
function heldClock(clock: (p: number) => number): (p: number) => number {
  const [from, to] = FINISTERRE_HOLD;
  const at = (hour: number) => {
    const d = day(7, 22, hour);
    let lo: number = from;
    let hi: number = to;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (clock(mid) < d) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  // The unbroken curve's pace at a point inside one of its intervals, where
  // it is smooth (both hold ends lie inside 0.516-0.55).
  const pace = (p: number) => (clock(p + 1e-7) - clock(p - 1e-7)) / 2e-7;
  const [firstHour, ceaseHour] = FIRING_HOURS;
  const cease = at(ceaseHour);
  const first = cease - FIRING_SHARE * (to - from);
  const fight =
    (day(7, 22, ceaseHour) - day(7, 22, firstHour)) / (cease - first);
  const held = hermiteCurve([
    [from, clock(from), pace(from)],
    [first, day(7, 22, firstHour), fight],
    [cease, day(7, 22, ceaseHour), fight],
    [to, clock(to), pace(to)],
  ]);
  return (p) => (p > from && p < to ? held(p) : clock(p));
}

const unbroken = heldClock(monotoneCurve(unbrokenKeys()));
const curves = Object.fromEntries(
  Object.entries(CLOCK).map(([id, keys]) => [
    id,
    UNBROKEN.includes(id as BeatId) ? unbroken : monotoneCurve(keys),
  ]),
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
