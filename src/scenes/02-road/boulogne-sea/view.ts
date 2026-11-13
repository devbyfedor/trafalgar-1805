import { SEA_EYE, SEA_HOLD, type SeaPose } from "../interludes";

/**
 * The painting's lens and its layers' parallax (docs/scene-02-boulogne-
 * brief.md; interludes.ts, SEA_EYE). Scene 1's lens: 40° vertical, the
 * horizon at 61 % of the height at the hold. The painting is drawn as
 * flat layers, each standing at a depth (metres ahead of the hold's eye);
 * the camera's moves (the end of the dive and the start of the rise, the
 * drift through the hold) shift each layer as a pinhole camera would shift
 * things at that depth, so near craft slide past the shore and the town.
 *
 * Layer units: a layer's art is drawn in thousandths of the focal length
 * (1000 · the tangent of the angle off the view's axis at the hold), x to
 * the right of the axis, y up from the horizon. One unit is F_VH / 1000
 * viewport heights at every screen size; the widest screen the site
 * supports (21:9) shows about ±870 units across, so wide art spans ±930.
 */

const DEG = Math.PI / 180;

/** Focal length, viewport heights. */
export const F_VH = 0.5 / Math.tan((SEA_EYE.fov / 2) * DEG);

/** The horizon's height at the hold, a share of the viewport from the top. */
export const HORIZON = 0.5 + F_VH * Math.tan(SEA_EYE.pitch * DEG);

const TAN_P0 = Math.tan(SEA_EYE.pitch * DEG);

/** One layer unit in vh, for CSS. */
export const UNIT_VH = (F_VH * 100) / 1000;

/** How far art reaches either side of the axis, layer units (21:9 and a margin). */
export const WIDE = 930;

/** A layer's offset from where it was drawn, CSS px, for the camera's pose. */
export interface Shift {
  x: number;
  y: number;
}

/**
 * Where a layer at `depth` metres (Infinity for the sky) moves for the
 * camera's pose, the viewport `height` CSS px tall: the drift and the
 * height against the depth, the pitch and yaw for all alike.
 */
export function shiftFor(
  depth: number,
  pose: SeaPose,
  height: number,
  out: Shift,
): Shift {
  const f = F_VH * height;
  const far = !Number.isFinite(depth);
  out.x = (far ? 0 : (-f * pose.x) / depth) - f * Math.tan(pose.yaw * DEG);
  out.y =
    (far ? 0 : (f * (pose.h - SEA_HOLD.h)) / depth) +
    f * (Math.tan(pose.pitch * DEG) - TAN_P0);
  return out;
}

/**
 * CSS for an absolutely placed box of layer art: from x0 to x1 across and
 * from y1 (top, up from the horizon) down to y0, layer units.
 */
export function boxStyle(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  const u = UNIT_VH;
  return {
    left: `calc(50vw + ${(x0 * u).toFixed(4)}vh)`,
    top: `${(HORIZON * 100 - y1 * u).toFixed(4)}vh`,
    width: `${((x1 - x0) * u).toFixed(4)}vh`,
    height: `${((y1 - y0) * u).toFixed(4)}vh`,
  };
}

/** Layer units of a point at `ahead` metres, `right` metres across and `up` metres above the water, from the hold's eye. */
export function unitsOf(
  ahead: number,
  right: number,
  up: number,
): [number, number] {
  return [(1000 * right) / ahead, (1000 * (up - SEA_HOLD.h)) / ahead];
}
