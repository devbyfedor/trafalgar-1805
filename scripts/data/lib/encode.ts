import { HEIGHT_CODE, SDF_CODE } from "../config.ts";

/**
 * The encodings of the tile images (see HEIGHT_CODE and SDF_CODE in
 * config.ts). The decoder is the GPU pass in
 * src/components/chart/terrain/field.ts, which reads the same parameters
 * from public/chart/manifest.json.
 */

/** The asinh code of a height in metres, as a 16-bit value. */
export function encodeHeight(h: number): number {
  const { scale, min, max } = HEIGHT_CODE;
  const bits: number = HEIGHT_CODE.bits;
  const t = (Math.asinh(h / scale) - min) / (max - min);
  const levels = 2 ** bits - 1;
  const code = Math.round(Math.min(1, Math.max(0, t)) * levels);
  // Stored in 16 bits whatever the code's depth, centred in its step.
  return bits === 16 ? code : code * 2 ** (16 - bits) + 2 ** (15 - bits);
}

export function decodeHeight(code16: number): number {
  const { scale, min, max } = HEIGHT_CODE;
  return scale * Math.sinh(min + (code16 / 65535) * (max - min));
}

const DISTANCE_LEVELS = 2 ** SDF_CODE.bits - 1;

/** The code of a signed distance in cells, linear over ±range. */
export function encodeDistance(cells: number, range: number): number {
  const s = Math.min(1, Math.max(-1, cells / range));
  return Math.round(((s + 1) / 2) * DISTANCE_LEVELS);
}

export function decodeDistance(code: number, range: number): number {
  return ((code / DISTANCE_LEVELS) * 2 - 1) * range;
}

/** A texel's three bytes from the 16-bit height code and the distance code. */
export function packTexel(
  height16: number,
  distance: number,
  out: Uint8Array | Buffer,
  offset: number,
): void {
  out[offset] = height16 >> 8;
  out[offset + 1] = (height16 & 0xf0) | (distance & 0x0f);
  out[offset + 2] = distance >> 4;
}

/** The two codes of a texel: the 16-bit height code and the distance code. */
export function unpackTexel(
  r: number,
  g: number,
  b: number,
): { height16: number; distance: number } {
  return {
    height16: r * 256 + (g & 0xf0) + 2 ** (15 - HEIGHT_CODE.bits),
    distance: b * 16 + (g & 0x0f),
  };
}
