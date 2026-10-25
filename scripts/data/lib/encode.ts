import { HEIGHT_CODE, SDF_CODE } from "../config.ts";

/**
 * The byte encodings of the tile images. The decoder is the GPU pass in
 * src/components/chart/data/decode.ts, which reads the same parameters
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

/**
 * The logarithmic part's constant for a distance range: chosen so the
 * linear core and the logarithmic tail meet with the same slope.
 */
export function sdfTail(range: number): number {
  const { core, coreShare } = SDF_CODE;
  const span = range - core;
  const coreSlope = coreShare / core;
  const tailSlope = (c: number) =>
    (1 - coreShare) / (c * Math.log(1 + span / c));
  // tailSlope falls as c falls; bisect in log space.
  let lo = 1e-6;
  let hi = 1e6;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    if (tailSlope(mid) > coreSlope) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/** One byte for a signed distance in cells (127.5 is the coast itself). */
export function encodeDistance(
  cells: number,
  range: number,
  tail: number,
): number {
  const { core, coreShare } = SDF_CODE;
  const u = Math.min(range, Math.abs(cells));
  const g =
    u <= core
      ? (coreShare * u) / core
      : coreShare +
        ((1 - coreShare) * Math.log(1 + (u - core) / tail)) /
          Math.log(1 + (range - core) / tail);
  const s = Math.sign(cells) * g;
  return Math.min(255, Math.max(0, Math.round(127.5 + 127.5 * s)));
}

export function decodeDistance(
  byte: number,
  range: number,
  tail: number,
): number {
  const { core, coreShare } = SDF_CODE;
  const s = (byte - 127.5) / 127.5;
  const g = Math.abs(s);
  const u =
    g <= coreShare
      ? (g / coreShare) * core
      : core +
        tail *
          (Math.exp(
            ((g - coreShare) / (1 - coreShare)) *
              Math.log(1 + (range - core) / tail),
          ) -
            1);
  return Math.sign(s) * u;
}
