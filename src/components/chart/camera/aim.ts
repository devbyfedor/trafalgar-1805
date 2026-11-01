import { latOfWorldY, lonOfWorldX, worldX, worldY } from "../geo/mercator";

/** A place and an altitude: longitude, latitude (degrees) and km. */
export type Lla = readonly [lon: number, lat: number, altitudeKm: number];

/**
 * The point `distance` world km from `eye` along a heading (degrees from
 * north, clockwise) and a pitch (degrees, up positive). Mercator is
 * conformal, so headings on the map are true headings.
 */
export function aim(
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
 * The place `distance` world km from a point along a heading (degrees from
 * north, clockwise), at an altitude: where to stand to see that point ahead.
 */
export function offset(
  lon: number,
  lat: number,
  heading: number,
  distance: number,
  altitudeKm: number,
): Lla {
  const h = (heading * Math.PI) / 180;
  const x = worldX(lon) + distance * Math.sin(h);
  const y = worldY(lat) + distance * Math.cos(h);
  return [lonOfWorldX(x), latOfWorldY(y), altitudeKm];
}
