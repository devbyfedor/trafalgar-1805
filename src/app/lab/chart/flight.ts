import type { CameraKey } from "@/components/chart/camera/rig";
import {
  latOfWorldY,
  lonOfWorldX,
  worldX,
  worldY,
} from "@/components/chart/geo/mercator";

/**
 * Stage A's proof flight (docs/scene-02-brief.md, stage A, item 5): low over
 * the sea off Cape Trafalgar at dawn, looking east as scene 1 does; up and
 * down onto the Gulf of Cádiz; back over the whole Atlantic; north to the
 * Channel. The camera, the light and the route are tweened on one scrubbed
 * timeline of duration 1, so p is the scroll progress through the pin.
 */

type Lla = readonly [lon: number, lat: number, altitudeKm: number];

/**
 * The point `distance` world km from `eye` along a heading (degrees from
 * north, clockwise) and a pitch (degrees, up positive). Mercator is
 * conformal, so headings on the map are true headings.
 */
function aim(
  eye: Lla,
  heading: number,
  pitch: number,
  distance: number,
): [number, number, number] {
  const h = (heading * Math.PI) / 180;
  const v = (pitch * Math.PI) / 180;
  const x = worldX(eye[0]) + distance * Math.cos(v) * Math.sin(h);
  const y = worldY(eye[1]) + distance * Math.cos(v) * Math.cos(h);
  return [lonOfWorldX(x), latOfWorldY(y), eye[2] + distance * Math.sin(v)];
}

/**
 * Scene 1's last frame, as the chart sees it: about 20 nautical miles west
 * of Cape Trafalgar, a few dozen metres up. Scene 1's sun stands 25° right
 * of the frame's centre; with the true sunrise azimuth (102.5°) the camera
 * heads 77.5°. A 40° lens pitched 4.6° up puts the horizon at 61 % of the
 * height, where scene 1 draws it.
 */
const DAWN_EYE: Lla = [-6.45, 36.2, 0.05];
const RISING_EYE: Lla = [-6.75, 36.0, 9];

export const LAB_FLIGHT: readonly CameraKey[] = [
  { p: 0, eye: DAWN_EYE, target: aim(DAWN_EYE, 77.5, 4.6, 100) },
  // Rising off the sea, still facing the sunrise, beginning to pitch down.
  { p: 0.09, eye: RISING_EYE, target: aim(RISING_EYE, 70, -9, 120) },
  // The Gulf of Cádiz from the south-west: Cape St Vincent to the Strait.
  { p: 0.24, eye: [-7.6, 35.25, 115], target: [-6.25, 36.3, 0] },
  // Pulling back, the Strait and the Mediterranean opening to the east.
  { p: 0.42, eye: [-11.5, 30.5, 1400], target: [-6.5, 37.5, 0] },
  // The whole Atlantic, from the Caribbean to the Mediterranean.
  { p: 0.62, eye: [-30, 8, 5600], target: [-27, 31, 0], fov: 42 },
  // Gliding north toward the Channel.
  { p: 0.82, eye: [-12, 38.5, 1500], target: [-3, 47.5, 0] },
  { p: 1, eye: [-4.2, 47.0, 390], target: [0.9, 50.5, 0] },
];

/** Scroll length of the flight, in viewport heights. */
export const FLIGHT_LENGTH = 8;

/** What the timeline drives; the renderer reads it once per frame. */
export interface FlightState {
  /** Progress along the camera rig. */
  p: number;
  /** Light: 0 is dawn, 1 the campaign's low summer light. */
  light: number;
  /** How much of the Toulon–Cádiz route is drawn. */
  route: number;
}

/** Tweens the flight onto a master timeline of duration 1. */
export function buildFlight(tl: gsap.core.Timeline, state: FlightState): void {
  tl.fromTo(state, { p: 0 }, { p: 1, duration: 1 }, 0)
    .fromTo(state, { light: 0 }, { light: 1, duration: 0.22 }, 0.08)
    .fromTo(
      state,
      { route: 0 },
      { route: 1, duration: 0.3, ease: "power1.inOut" },
      0.3,
    )
    .addLabel("dawn", 0)
    .addLabel("gulf", 0.24)
    .addLabel("atlantic", 0.62)
    .addLabel("channel", 1)
    .set({}, {}, 1);
}
