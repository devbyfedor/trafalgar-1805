import { aim, type Lla, offset } from "@/components/chart/camera/aim";
import type { CameraKey } from "@/components/chart/camera/rig";
import { FINISTERRE_HOLD, LAST_HOLD } from "./beats";
import { VICTORY_AT_DAWN } from "./fleets";

/**
 * The camera through scene 2 (docs/decisions.md, "Scene 2, Stage B",
 * "Camera"): keys placed by the scene's progress p, joined by the rig's
 * splines (src/components/chart/camera/rig.ts). Two equal keys hold the
 * camera still between them.
 */

/**
 * Scene 1's last frame, as the chart sees it. Scene 1 draws Victory's
 * waterline at 69 % of the height and her hull's middle at 49 % of the
 * width, under a horizon at 61 %, through a 40° lens pitched 4.6° up and
 * heading 77.5° (the true sunrise azimuth, 102.5°, puts the sun 25° right
 * of the frame's centre, where scene 1 has it). From 50 m up, a point on
 * the sea 3.27° below the horizon lies 0.875 km off; 0.74° left of the
 * centre at 16:9. So the camera stands that far from her glyph, looking
 * past her toward the sunrise.
 */
const DAWN_HEADING = 77.5;
const DAWN_PITCH = 4.6;
const DAWN_EYE: Lla = offset(
  VICTORY_AT_DAWN.lon,
  VICTORY_AT_DAWN.lat,
  DAWN_HEADING - 0.74 + 180,
  0.875,
  0.05,
);

/** The last frame's eye: west of the British, 6.5 km up. */
const LAST_EYE: Lla = [-6.6, 36.1, 6.5];

/**
 * The harbour close up (beat 4): over the city, 3.5 km up, looking along 24°
 * across the bay at the combined fleet's three lines at anchor (fleets.ts,
 * ANCHORAGE), broadside to their heads (294°) and near enough that a row's
 * ships stand apart (about 220 m between them, some 44 CSS px on screen)
 * and the rows separate in depth. From farther south the rows crowd again,
 * and from any side where the ships show their broadsides the city lies
 * behind the camera.
 */
const ANCHORAGE_CENTRE = [-6.273, 36.563] as const;
const HARBOUR_EYE: Lla = offset(
  ANCHORAGE_CENTRE[0],
  ANCHORAGE_CENTRE[1],
  204,
  4.5,
  3.5,
);

/**
 * The camera over the action off Finisterre (22 July, 43°35′ N 11°40′ W;
 * routes.ts): south of it, 85 km up, looking a little east of north at the
 * middle of the two squadrons, about 170 and 200 km (of the chart's
 * Mercator km) from them. Both lines on the action's course (247°) and
 * Villeneuve bearing away for Vigo afterwards (about 122°) are seen near
 * broadside from here (looking along the line to the cape, his departure
 * was end-on, and his block folded onto its lead); the lettering lies
 * level; the caption's card stands over the open sea.
 */
const FINISTERRE_EYE: Lla = [-11.75, 42.62, 85];
const FINISTERRE_TARGET: Lla = [-11.6, 43.7, 0];

/** Rising off the sea beside her, turning north and pitching down. */
const RISING_EYE: Lla = offset(
  VICTORY_AT_DAWN.lon,
  VICTORY_AT_DAWN.lat,
  235,
  7,
  2.6,
);

export const ROAD_FLIGHT: readonly CameraKey[] = [
  // 0. Scene 1's last frame, held while the painted sea becomes the chart's.
  {
    p: 0,
    eye: DAWN_EYE,
    target: aim(DAWN_EYE, DAWN_HEADING, DAWN_PITCH, 100),
  },
  {
    p: 0.024,
    eye: DAWN_EYE,
    target: aim(DAWN_EYE, DAWN_HEADING, DAWN_PITCH, 100),
  },
  { p: 0.05, eye: RISING_EYE, target: aim(RISING_EYE, 52, -11, 40) },
  // The Gulf of Cádiz from the south-south-west: both fleets face right.
  { p: 0.085, eye: [-6.78, 35.52, 72], target: [-6.36, 36.22, 0] },
  // 1. North over Iberia and France to the Channel.
  { p: 0.12, eye: [-7.6, 33.6, 950], target: [-3.6, 44, 0] },
  { p: 0.151, eye: [-5.2, 46.4, 420], target: [1.0, 50.3, 0] },
  // Boulogne from over the Channel to its south-west, looking up the
  // Strait: the camps and the flotilla on the right, England across the
  // water at the top left, the sea under the caption. The camera arrives
  // at 0.18, stays there sinking a little to 0.2, then pushes in slightly
  // to the beat's end, so the flotilla shows whole for about a screen of
  // scroll (the owner's order of 13 November 2026; it had arrived at 0.2,
  // and the craft showed whole for a third of a screen). The time came out
  // of the run north and the descent (0.12-0.18, was 0.12-0.2): the keys at
  // 0.12 and 0.2 stay where they were, so the rig's pace through the
  // beat's bounds, and with it every frame of beats 0 and 2, is unchanged
  // (the spline's slope at a key is set by the keys either side).
  { p: 0.18, eye: [0.85, 50.5, 29.4], target: [1.5, 50.85, 0] },
  { p: 0.2, eye: [0.85, 50.5, 28.6], target: [1.5, 50.85, 0] },
  { p: 0.235, eye: [0.92, 50.53, 28], target: [1.52, 50.86, 0] },
  // 2. The western Mediterranean: Toulon to Gibraltar and Cádiz.
  { p: 0.27, eye: [-18, 33, 2000], target: [-2, 41.5, 0] },
  { p: 0.31, eye: [-12, 17, 4300], target: [-18, 33, 0], fov: 46 },
  // The whole Atlantic from the south: the West Indies nearest.
  { p: 0.35, eye: [-37, -11, 5000], target: [-32, 24.5, 0], fov: 52 },
  // The West Indies, where both squadrons are counted.
  { p: 0.39, eye: [-58.5, 5.5, 1150], target: [-60.6, 15, 0] },
  { p: 0.43, eye: [-57.6, 6.2, 1250], target: [-60.3, 16.2, 0] },
  // Back across: the return crossings.
  { p: 0.47, eye: [-35, -7, 5000], target: [-31, 28, 0], fov: 52 },
  { p: 0.5, eye: [-22, 30, 2300], target: [-13, 42, 0] },
  // 3. Finisterre: down to the action off the cape on 22 July, close enough
  // for both squadrons' ships to come in and read one by one (the eye
  // within 250 km of them; director.ts, SHIPS_IN_KM), their two lines
  // facing each other as a plan of the battle draws them, the coast of
  // Galicia and Cape Finisterre on the right and the sea under the caption;
  // held, pushing in a little, while the lines stand (p 0.505-0.548); the
  // ships go as it rises, before the lines part (director.ts, MEETINGS).
  // Then up, south to Cádiz and the army's turn east.
  { p: 0.513, eye: [-13.4, 40.6, 560], target: [-11.5, 43.4, 0] },
  { p: FINISTERRE_HOLD[0], eye: FINISTERRE_EYE, target: FINISTERRE_TARGET },
  {
    p: FINISTERRE_HOLD[1],
    eye: [-11.34, 42.66, 79],
    target: [-11.18, 43.65, 0],
  },
  // The rise: up first, then away south-west, its pace across the chart
  // growing key by key (the rig's speed steps at a key by the square root
  // of the ratio of the legs either side, here about 2 to 2.6 at each,
  // where one leg from the hold to Spain had stepped it twelvefold): left
  // at full speed straight off the hold, the eye ran a thousand kilometres
  // south-west still low, and the action fell into the haze, labels and
  // all, before the view opened. Each key a share of the way along the
  // straight line from the hold's end to the next view.
  { p: 0.555, eye: [-11.453, 42.477, 150], target: [-11.061, 43.57, 0] },
  { p: 0.563, eye: [-12.189, 41.286, 500], target: [-10.384, 43.12, 0] },
  { p: 0.575, eye: [-17, 33.5, 1750], target: [-7.2, 41, 0] },
  // Villeneuve's turn south off Finisterre on the evening of 15 August
  // (the clock slows for it, beats.ts) and his run down the coast of
  // Portugal, held clear of the caption card.
  { p: 0.602, eye: [-20, 30.5, 1750], target: [-9.5, 39.5, 0] },
  { p: 0.62, eye: [-19, 38, 1700], target: [1, 46.5, 0] },
  { p: 0.65, eye: [-9.4, 33.4, 900], target: [-6.4, 38, 0] },
  // 4. Down to the Gulf of Cádiz: the harbour, the chain to the west.
  { p: 0.69, eye: [-6.86, 35.74, 62], target: [-6.86, 36.5, 0] },
  // Turned onto the bay while still high, then straight down the line of
  // sight to the harbour and back: turned low, the view whipped across.
  {
    p: 0.705,
    eye: [-6.52, 36.21, 15],
    target: [ANCHORAGE_CENTRE[0], ANCHORAGE_CENTRE[1], 0],
  },
  // Held over the harbour from a little before 7 a.m. on the 19th, as the
  // first ships weigh and the frigates off the port make the first signal,
  // so every ship at anchor comes in: their sizes and how much of each
  // shows are eased over about 0.015 of p either way (glyphs/layout.ts),
  // and a view still on its way down or up had kept the lines small.
  {
    p: 0.72,
    eye: HARBOUR_EYE,
    target: [ANCHORAGE_CENTRE[0], ANCHORAGE_CENTRE[1], 0],
  },
  {
    p: 0.75,
    eye: HARBOUR_EYE,
    target: [ANCHORAGE_CENTRE[0], ANCHORAGE_CENTRE[1], 0],
  },
  {
    p: 0.764,
    eye: [-6.55, 36.22, 15],
    target: [ANCHORAGE_CENTRE[0], ANCHORAGE_CENTRE[1], 0],
  },
  { p: 0.785, eye: [-6.96, 35.78, 58], target: [-6.86, 36.5, 0] },
  { p: 0.82, eye: [-6.9, 35.72, 70], target: [-6.7, 36.42, 0] },
  // 5. Night: up and east to Ulm, and back to the fleets closing.
  { p: 0.855, eye: [-1, 40, 1350], target: [5, 47, 0] },
  { p: 0.885, eye: [8.6, 46.6, 230], target: [10, 48.4, 0] },
  { p: 0.915, eye: [-3, 37, 950], target: [-6.3, 36.3, 0] },
  { p: 0.95, eye: [-6.74, 35.94, 38], target: [-6.37, 36.17, 0] },
  // The last frame, at dawn, as scene 1 began: looking east-north-east
  // (77.5°) with the sun rising on the right, the British fleet in the
  // foreground in its two bodies, the combined fleet's line strung across
  // the water beyond them under the coast of Cape Trafalgar, the frigates
  // between. Close enough, a few kilometres up, for both formations to read.
  // The camera settles on it a little before the end and holds (LAST_HOLD:
  // further back than the glyphs' eased visibility reaches from the end, the
  // least within 0.006 of p eased over about as much again; layout.ts,
  // BAKE_SIZE_EASE_P), and the clock comes to dawn there, so the scene ends
  // on a still frame and every ship of both fleets has come in by then (the
  // last steps of a descent still under way had kept the allied line small).
  { p: LAST_HOLD, eye: LAST_EYE, target: aim(LAST_EYE, DAWN_HEADING, -13, 30) },
  { p: 1, eye: LAST_EYE, target: aim(LAST_EYE, DAWN_HEADING, -13, 30) },
];
