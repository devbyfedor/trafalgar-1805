import { PALETTE } from "../../scene";

/**
 * Colours as numbers for the shore's per-sample work (a cliff's light
 * sample by sample, a gradient's hundreds of stops), where parsing hex
 * strings each time would cost more than the drawing.
 */

export type RGB = readonly [number, number, number];

export function rgbOf(hex: string): RGB {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function lerp3(a: RGB, b: RGB, t: number): RGB {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/** Brighter or darker by a factor, each channel. */
export function scale3(a: RGB, f: number): RGB {
  return [a[0] * f, a[1] * f, a[2] * f];
}

const byte = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

export function css(c: RGB, alpha = 1): string {
  if (alpha >= 1) return `rgb(${byte(c[0])},${byte(c[1])},${byte(c[2])})`;
  return `rgba(${byte(c[0])},${byte(c[1])},${byte(c[2])},${Math.max(0, alpha).toFixed(3)})`;
}

const HAZE = rgbOf(PALETTE.haze.far);

/** The scene's aerial perspective (scene.ts aerial) on a colour seen `ahead` metres away. */
export function hazed(c: RGB, ahead: number): RGB {
  return lerp3(c, HAZE, 1 - Math.exp(-ahead / 9000));
}
