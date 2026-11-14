import { Vector3 } from "three";
import { aim, type Lla } from "@/components/chart/camera/aim";
import { type CameraKey, CameraRig } from "@/components/chart/camera/rig";
import {
  latOfWorldY,
  lonOfWorldX,
  mercatorScale,
  worldX,
  worldY,
} from "@/components/chart/geo/mercator";
import type { InterludePhase } from "../alive/interlude";
import { ROAD_FLIGHT } from "./camera";
import {
  BOULOGNE_AT,
  CHART_BACK,
  driftAt,
  flightU,
  SEA_DRIFT,
  SEA_EYE,
  SEA_HOLD,
  type SeaPose,
} from "./interludes";

/**
 * The camera of Boulogne's interlude (interludes.ts), for the chart and the
 * painting alike: one rig from the chart's pose at p* down to the
 * painting's eye for the dive, the same way back up for the rise, and the
 * painting's own drift through the hold. In the chart's chunk (three.js).
 *
 * The chart's coast at Boulogne is Natural Earth's line over the Channel
 * tile's 0.46 km relief, straight across the Liane's mouth about a
 * kilometre west of the true shore (docs/decisions.md, "Boulogne, the
 * camps and the flotilla"). So the chart's camera keeps CHART_BACK metres
 * behind the painting's eye, wherever the pose: the two see the same
 * horizon from the same height, and the chart's waterline lies across the
 * frame where the painting's shore does, so the coast matches through the
 * dissolve (scripts/dev/sea-coast.mjs measures it).
 */

const DEG = Math.PI / 180;
/** World km per ground km at the eye (sec φ). */
const K = mercatorScale(SEA_EYE.lat);
const H0 = SEA_EYE.heading * DEG;
/** The hold's right and forward, in world x (east), y (north). */
const RIGHT = [Math.cos(H0), -Math.sin(H0)] as const;
const AHEAD = [Math.sin(H0), Math.cos(H0)] as const;
/**
 * The chart's eye for the painting's: CHART_BACK metres behind it along
 * the view, so the chart's coast lies where the painting's shore does.
 */
const O_X = worldX(SEA_EYE.lon) - ((CHART_BACK * K) / 1000) * AHEAD[0];
const O_Y = worldY(SEA_EYE.lat) - ((CHART_BACK * K) / 1000) * AHEAD[1];

/** The chart's eye and target (world km) for a pose of the painting's camera. */
export function chartViewOf(
  pose: SeaPose,
  eye: Vector3,
  target: Vector3,
): void {
  const x = (pose.x * K) / 1000;
  const z = (pose.z * K) / 1000;
  eye.set(
    O_X + x * RIGHT[0] + z * AHEAD[0],
    O_Y + x * RIGHT[1] + z * AHEAD[1],
    (pose.h * K) / 1000,
  );
  const heading = (SEA_EYE.heading + pose.yaw) * DEG;
  const pitch = pose.pitch * DEG;
  const reach = 10;
  target.set(
    eye.x + reach * Math.cos(pitch) * Math.sin(heading),
    eye.y + reach * Math.cos(pitch) * Math.cos(heading),
    eye.z + reach * Math.sin(pitch),
  );
}

/** The painting's pose for a chart eye and target (world km), written into `out`. */
export function seaPoseOf(
  eye: Vector3,
  target: Vector3,
  out: SeaPose,
): SeaPose {
  const ex = eye.x - O_X;
  const ey = eye.y - O_Y;
  out.x = ((ex * RIGHT[0] + ey * RIGHT[1]) * 1000) / K;
  out.z = ((ex * AHEAD[0] + ey * AHEAD[1]) * 1000) / K;
  out.h = (eye.z * 1000) / K;
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const dz = target.z - eye.z;
  out.pitch = Math.atan2(dz, Math.hypot(dx, dy)) / DEG;
  let yaw = Math.atan2(dx, dy) / DEG - SEA_EYE.heading;
  yaw = ((((yaw + 180) % 360) + 360) % 360) - 180;
  out.yaw = yaw;
  return out;
}

const toLla = (v: Vector3): Lla => [lonOfWorldX(v.x), latOfWorldY(v.y), v.z];

/** A key of a rig at the painting's pose. */
function seaKey(u: number, pose: SeaPose): CameraKey {
  const eye = new Vector3();
  const target = new Vector3();
  chartViewOf(pose, eye, target);
  return { p: u, eye: toLla(eye), target: toLla(target), fov: SEA_EYE.fov };
}

/** The low part of the flight: where the chart and the painting meet, metres up. */
const LOW_HEIGHT = 60;

/**
 * The dive's keys, by its own parameter u (0..1): from the chart's hold
 * over the Channel (ROAD_FLIGHT at p*), down and round to the east toward
 * Boulogne, onto the line of the painting's view a few kilometres out, then
 * in to the boat and down to the water. `x` is where the low part stands
 * (the hold's start for the dive, its end for the rise).
 */
function diveKeys(x: number): CameraKey[] {
  const rig = new CameraRig(ROAD_FLIGHT);
  const eye0 = new Vector3();
  const target0 = new Vector3();
  const fov0 = rig.evaluate(BOULOGNE_AT, eye0, target0);
  // On the view's line, 6 km out (ground), 1.2 km up.
  const lineOut = 6 * K;
  const side = (x * K) / 1000;
  const approach: Lla = [
    lonOfWorldX(O_X - lineOut * AHEAD[0] + side * RIGHT[0]),
    latOfWorldY(O_Y - lineOut * AHEAD[1] + side * RIGHT[1]),
    1.2 * K,
  ];
  const mid: Lla = [1.2, 50.64, 8];
  return [
    { p: 0, eye: toLla(eye0), target: toLla(target0), fov: fov0 },
    { p: 0.26, eye: mid, target: [1.59, 50.73, 0] },
    {
      p: 0.46,
      eye: approach,
      target: aim(approach, SEA_EYE.heading - 3, -9, 10),
    },
    seaKey(0.64, { x, z: 0, h: LOW_HEIGHT, pitch: 0.5, yaw: 0 }),
    seaKey(1, { ...SEA_HOLD, x }),
  ];
}

/** The dive's rig, from the chart at p* to the painting's eye. */
export const DIVE_RIG = new CameraRig(diveKeys(0));

/** The rise's rig: the same way back up, from where the drift ends. */
export const RISE_RIG = new CameraRig(diveKeys(SEA_DRIFT));

/**
 * The camera at a point of the interlude: the chart's eye and target, the
 * painting's pose, and the rig's u (1 through the hold), from one rig or
 * the hold's drift.
 */
export function interludeView(
  phase: InterludePhase,
  t: number,
  eye: Vector3,
  target: Vector3,
  pose: SeaPose,
): number {
  if (phase === "hold") {
    pose.x = driftAt(t);
    pose.z = 0;
    pose.h = SEA_HOLD.h;
    pose.pitch = SEA_HOLD.pitch;
    pose.yaw = 0;
    chartViewOf(pose, eye, target);
    return 1;
  }
  const u = flightU(phase, t);
  const rig = phase === "dive" ? DIVE_RIG : RISE_RIG;
  rig.evaluate(u, eye, target);
  seaPoseOf(eye, target, pose);
  return u;
}
