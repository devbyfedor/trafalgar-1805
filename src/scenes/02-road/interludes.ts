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
 * The painting's eye at the hold: a boat in the roads 1.1 km due west of
 * the 1805 jetty heads (boulogne-sea/geo.ts; the research's "camera B"),
 * among the craft moored off the strand, looking east by south at the
 * shore: the wooden fort and the cliffs with the right camp on the left,
 * the harbour mouth, the town on its hill with the belfry against Mont
 * Lambert in the middle, the heights of Outreau on the right. As close to
 * the jetties as low water allows (the owner's wish): the strand dries
 * some 750 m out from the jetty heads, so the moored line, afloat, lies
 * about 380 m ahead at most. The evening sun (azimuth about 290°) is
 * behind it. Scene 1's lens: 40° vertical, the horizon at 61 % of the
 * height (pitched 4.6° up), the eye a few metres above the water.
 */
export const SEA_EYE = {
  lon: 1.578,
  lat: 50.73,
  /** Degrees from north, clockwise. */
  heading: 98,
  /** Degrees, up positive: the horizon at 61 % of the height. */
  pitch: 4.6,
  /** Vertical field of view, degrees. */
  fov: 40,
  /** Metres above the water. */
  height: 6,
} as const;

/**
 * Where the high-water shore lies ahead of the painting's eye, metres
 * along the view (boulogne-sea/geo.ts, SHORE_HIGH: just south of the
 * harbour's mouth on the axis). At low water the sea's edge is far nearer
 * (about 380 m ahead) and the strand lies wet between.
 */
export const SHORE_AHEAD = 1350;

/**
 * How far behind the painting's eye the chart's camera stands, metres
 * along the view, so the chart's straight coast lies at SHORE_AHEAD from
 * it, where the painting's high-water shore is (interludeCamera.ts). The
 * chart's coast at Boulogne is Natural Earth's line across the Liane's
 * mouth, about 220 m BEHIND this eye (the eye stands on the chart's land):
 * measured from 3 km behind the eye along each bearing (session 25,
 * .claude/s25/coast-back.mjs: -189 to -274 m across ±45°), so the chart's
 * coast lies 1300-1385 m along the view across the frame.
 */
export const CHART_BACK = 1573;

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
 * down and round onto the view's line, arriving over the boat 60 m up at
 * u 0.64 (t 0.45); then the last 54 m down to the water slow and even
 * over more than half the dive, while the chart becomes an engraving of
 * the view and the engraving takes its colour (TRANSITION). The rise runs
 * it backwards. The dive's length (1.2 screens) is the owner's; only its
 * pace inside changed (session 25).
 */
const DIVE_PACE: readonly Keyframe[] = [
  [0, 0],
  [0.1, 0.03],
  [0.3, 0.38],
  [0.45, 0.64],
  [0.6, 0.73],
  [0.86, 0.93],
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
 * The transition between the chart and the painting, by the rig's u (the
 * owner's plan, brief "Owner review, 13 November"): first the chart turns
 * into an engraving of the same view, lines on the chart's paper in the
 * chart's inks (each plate's ink raster, paper-backed, so nearer things
 * hide farther ones as an engraver leaves them out); then colour comes
 * into the engraving, group by group like a print coloured by hand: the
 * sky, the land, the water, the craft last. The rise runs it backwards.
 * Opacity only. The text steps aside while the ground under it is in
 * flux (paper is bright where the chart and the painting are dark) and
 * comes back over the painting.
 *
 * The stages overlap (the owner's second look: a wholly colourless frame
 * read as a loading bug): the sky's colour starts while the engraving is
 * still coming in over the chart, each group a little after the one
 * before, all while the camera is still coming down; only while the
 * engraving rises through the chart is the frame without colour. All of
 * it is done by u 0.87, the last 13 % of the descent in full colour.
 */
export const TRANSITION = {
  /** The engraving over the chart: from nothing to whole. */
  engraving: [0.64, 0.7] as const,
  /** Colour by group, each from nothing to whole over the engraving. */
  sky: [0.665, 0.78] as const,
  land: [0.68, 0.82] as const,
  water: [0.695, 0.845] as const,
  craft: [0.71, 0.87] as const,
  /** The captions, the date line and the chapter marker: out, then back in. */
  textOut: [0.585, 0.635] as const,
  textIn: [0.95, 0.995] as const,
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

/** The painting's shares at the rig's u: its engraving, each group's colour. */
export interface PaintingShare {
  engraving: number;
  sky: number;
  land: number;
  water: number;
  craft: number;
}

export function paintingAt(u: number, out: PaintingShare): PaintingShare {
  const T = TRANSITION;
  out.engraving = smooth(T.engraving[0], T.engraving[1], u);
  out.sky = smooth(T.sky[0], T.sky[1], u);
  out.land = smooth(T.land[0], T.land[1], u);
  out.water = smooth(T.water[0], T.water[1], u);
  out.craft = smooth(T.craft[0], T.craft[1], u);
  return out;
}

/** How much of the text (captions, date line, chapter marker) shows at the rig's u. */
export function textAt(u: number): number {
  const T = TRANSITION;
  return Math.max(
    1 - smooth(T.textOut[0], T.textOut[1], u),
    smooth(T.textIn[0], T.textIn[1], u),
  );
}

/** Whether the painting covers the chart wholly at the rig's u (the engraving is whole). */
export function coveredAt(u: number): boolean {
  return u >= TRANSITION.engraving[1];
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
  const cover = TRANSITION.engraving[1];
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
