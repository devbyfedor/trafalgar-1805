import { type Keyframe, monotoneCurve } from "@/lib/curve";
import type { InterludePhase, InterludeSpec } from "../alive/interlude";

/**
 * Scene 2's interludes (scenes/alive/interlude.ts): "Boulogne from the sea"
 * (docs/scene-02-boulogne-brief.md). The story stops at Boulogne once the
 * flotilla has come in on the chart; the camera dives from the chart's hold
 * over the Channel down to the water in the roads, where the chart turns
 * into a painting of the roads seen from a boat among the anchored craft;
 * the view holds for a few screens while the camera drifts along the line;
 * then it rises, the painting turns back into the chart, and the chart
 * takes up the story at the same p.
 *
 * The chart and the painting share one camera through the dive and the
 * rise (interludeCamera.ts, in the chart's chunk): a rig from the chart's
 * own pose at p* down to the painting's eye, so while one dissolves into
 * the other both show the same view from the same eye.
 *
 * Plain data and arithmetic only: the scene's host imports this, and
 * three.js must stay out of the page's first bundle.
 */

/** Where the story stops: the flotilla whole on the chart (from 0.1935) for half a screen first. */
export const BOULOGNE_AT = 0.21;

export const BOULOGNE: InterludeSpec = {
  id: "boulogne",
  at: BOULOGNE_AT,
  dive: 1.2,
  hold: 2.4,
  rise: 1.2,
};

export const ROAD_INTERLUDES: readonly InterludeSpec[] = [BOULOGNE];

/**
 * The painting's eye at the hold: a boat in the roads about 1.3 km west
 * by north of the harbour mouth (the Liane's piers, 50.7275 N 1.5885 E),
 * among the craft moored there, looking east by south at the shore: the
 * cliffs and the camp north of the harbour on the left, the harbour mouth
 * and the town on its hill in the middle, the heights south of the Liane
 * on the right. The evening sun (azimuth about 285-290°) is behind it.
 * Scene 1's lens: 40° vertical, the horizon at 61 % of the height (pitched
 * 4.6° up), the eye a few metres above the water.
 */
export const SEA_EYE = {
  lon: 1.5704,
  lat: 50.7295,
  /** Degrees from north, clockwise. */
  heading: 100,
  /** Degrees, up positive: the horizon at 61 % of the height. */
  pitch: 4.6,
  /** Vertical field of view, degrees. */
  fov: 40,
  /** Metres above the water. */
  height: 6,
} as const;

/**
 * A pose of the low camera in the painting's own frame: x metres to the
 * right of the hold's eye (across the view at the hold's heading), z metres
 * ahead, h metres above the water, pitch degrees up, yaw degrees right of
 * the hold's heading.
 */
export interface SeaPose {
  x: number;
  z: number;
  h: number;
  pitch: number;
  yaw: number;
}

/** The hold's pose at the painting's eye. */
export const SEA_HOLD: SeaPose = {
  x: 0,
  z: 0,
  h: SEA_EYE.height,
  pitch: SEA_EYE.pitch,
  yaw: 0,
};

/**
 * How far the camera drifts along the anchored line through the hold,
 * metres to the right (south, toward the heights over the Liane): the
 * nearest craft slide past the shore and the town (brief, "Motion").
 */
export const SEA_DRIFT = 14;

/** The hold's drift at its progress t (0..1), eased at both ends. */
export function driftAt(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return SEA_DRIFT * k * k * (3 - 2 * k);
}

/**
 * The dive's pace: the camera rig's parameter u (interludeCamera.ts) for
 * the dive's progress t. Away gently from the chart's hold, a fast swoop
 * down and round, slowing onto the view's line, then the last few dozen
 * metres down to the water slow and even, while the chart turns into the
 * painting. The rise runs it backwards.
 */
const DIVE_PACE: readonly Keyframe[] = [
  [0, 0],
  [0.1, 0.03],
  [0.4, 0.4],
  [0.58, 0.6],
  [0.8, 0.86],
  [1, 1],
];
const divePace = monotoneCurve(DIVE_PACE);

/** The rig's parameter u at a point of the interlude (1 through the hold). */
export function flightU(phase: InterludePhase, t: number): number {
  if (phase === "hold") return 1;
  const k = Math.min(1, Math.max(0, t));
  return phase === "dive" ? divePace(k) : divePace(1 - k);
}

/**
 * The dissolve between the chart and the painting, by the rig's u: the
 * painting's share of the frame (0 the chart alone, 1 the painting alone).
 * Sky and land first, as the eye comes down past the cliffs' height; the
 * water last, nearly at the water.
 */
export const DISSOLVE = {
  /** The painting's sky, land, town and far craft. */
  land: [0.66, 0.8] as const,
  /** The painting's water and its near craft. */
  water: [0.72, 0.88] as const,
};

/** Where the chart's own marks (the flotilla's glyphs, the camps, the soundings) go, by u. */
export const MARKS_OUT = [0.06, 0.3] as const;

/** Hermite smoothstep of x between a and b. */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How much of the chart's own marks shows at the rig's u. */
export function marksAt(u: number): number {
  return 1 - smooth(MARKS_OUT[0], MARKS_OUT[1], u);
}

/** The painting's share at the rig's u: its land and sky, and its water. */
export function paintingAt(u: number): { land: number; water: number } {
  return {
    land: smooth(DISSOLVE.land[0], DISSOLVE.land[1], u),
    water: smooth(DISSOLVE.water[0], DISSOLVE.water[1], u),
  };
}

/** Whether the painting covers the chart wholly at the rig's u. */
export function coveredAt(u: number): boolean {
  return u >= DISSOLVE.land[1] && u >= DISSOLVE.water[1];
}

/**
 * Screens of scroll the chart keeps drawing under a painting that already
 * covers it, at each end of the covered stretch: so it has drawn a few
 * frames (its GPU clocks up, its buffers in use) before it shows again,
 * whichever way the reader scrolls (brief: "keep it warm").
 */
const WARM_SCREENS = 0.1;

/**
 * Where the chart need not draw, screens from the interlude's start: from
 * a little after the painting covers it on the way down to a little before
 * it shows again on the way up. The dive's pace is inverted by bisection
 * (it is monotone), once per interlude.
 */
export function coveredSpan(spec: InterludeSpec): readonly [number, number] {
  const cover = Math.max(DISSOLVE.land[1], DISSOLVE.water[1]);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (divePace(mid) < cover) lo = mid;
    else hi = mid;
  }
  const t = hi;
  return [
    t * spec.dive + WARM_SCREENS,
    spec.dive + spec.hold + (1 - t) * spec.rise - WARM_SCREENS,
  ];
}
