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
 * Channel.
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

export const LAB_FLIGHT: readonly CameraKey[] = [
  { p: 0, eye: DAWN_EYE, target: aim(DAWN_EYE, 77.5, 4.6, 100), fov: 40 },
  {
    p: 0.22,
    eye: [-7.9, 35.15, 160],
    target: [-6.4, 36.45, 0],
    fov: 40,
  },
  {
    p: 0.62,
    eye: [-27, 2, 6800],
    target: [-27, 33, 0],
    fov: 40,
  },
  {
    p: 1,
    eye: [-4.6, 46.4, 420],
    target: [0.6, 50.6, 0],
    fov: 40,
  },
];
