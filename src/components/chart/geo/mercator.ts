/**
 * The chart's projection: Mercator, as the sea charts of 1805 used.
 *
 * World space is Mercator map space in kilometres at the equator's scale
 * (the sphere's radius is WGS84's semi-major axis), shifted so the world
 * origin sits off Cape Trafalgar, where the camera comes closest: float32
 * positions near the origin keep sub-metre precision. x points east, y
 * north, z up. Heights are scaled by the local Mercator factor (sec φ), so
 * relief keeps its true proportions on the chart before exaggeration.
 *
 * Plain functions with no imports: the data scripts in scripts/data/ use
 * this module too, so the build and the app agree on every coordinate.
 */

export const EARTH_RADIUS_KM = 6378.137;

const DEG = Math.PI / 180;

/** Mercator x of a longitude, km, before the origin shift. */
export function mercatorX(lon: number): number {
  return EARTH_RADIUS_KM * lon * DEG;
}

/** Mercator y of a latitude, km, before the origin shift. */
export function mercatorY(lat: number): number {
  return EARTH_RADIUS_KM * Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));
}

export function lonFromMercatorX(x: number): number {
  return x / EARTH_RADIUS_KM / DEG;
}

export function latFromMercatorY(y: number): number {
  return (2 * Math.atan(Math.exp(y / EARTH_RADIUS_KM)) - Math.PI / 2) / DEG;
}

/** The world origin: 36° N, 6° W, just off Cape Trafalgar. */
export const ORIGIN = { lon: -6, lat: 36 } as const;
const ORIGIN_X = mercatorX(ORIGIN.lon);
const ORIGIN_Y = mercatorY(ORIGIN.lat);

/** World x (km) of a longitude. */
export function worldX(lon: number): number {
  return mercatorX(lon) - ORIGIN_X;
}

/** World y (km) of a latitude. */
export function worldY(lat: number): number {
  return mercatorY(lat) - ORIGIN_Y;
}

export function lonOfWorldX(x: number): number {
  return lonFromMercatorX(x + ORIGIN_X);
}

export function latOfWorldY(y: number): number {
  return latFromMercatorY(y + ORIGIN_Y);
}

/** Map kilometres per ground kilometre at a latitude (sec φ). */
export function mercatorScale(lat: number): number {
  return 1 / Math.cos(lat * DEG);
}

/** The Mercator offset of the world origin, for shaders that need it. */
export const ORIGIN_MERCATOR = { x: ORIGIN_X, y: ORIGIN_Y } as const;
