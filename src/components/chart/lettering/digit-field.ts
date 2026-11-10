import type { Slicer } from "../engine/slice";

/**
 * The soundings' figures drawn on a 2D canvas and turned into a signed
 * distance field, for their atlas (digits.ts). It runs in a worker
 * (digits.worker.ts) or, where a worker can't draw text, on the page. No
 * three.js here, so the worker stays small.
 */

/** The figures a sounding is written with. */
export const SOUNDING_CHARS = "0123456789½";

/** The figures' face in public/fonts/3d (scripts/check-lettering.ts checks it covers them). */
export const SOUNDING_FONT_FILE = "Baskervville-Italic.woff";

/** The font size the figures are drawn at, px. */
export const FONT_PX = 64;
/** A cell of the atlas, px: room for the italic's overhang and the spread. */
export const CELL_W = 80;
export const CELL_H = 96;
/** The baseline's depth in a cell, px from its top. */
export const BASELINE_PX = 64;
/** The distance the field spans either side of an edge, px. */
const SPREAD_PX = 8;

/** The face's family, in whichever font set it is added to. */
export const DIGIT_FAMILY = "ChartSoundings";

export interface DigitField {
  /** One byte a pixel, cell by cell along a row: 128 on the figures' edges. */
  data: Uint8Array;
  /** Each character's advance, ems. */
  advance: Float32Array;
}

/** What the page asks the worker: the face's absolute URL and the characters. */
export interface DigitFieldRequest {
  fontUrl: string;
  chars: string[];
}

export type DigitFieldReply =
  | ({ ok: true } & DigitField)
  | { ok: false; error: string };

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Squared Euclidean distance transform of one line (Felzenszwalb). */
function edt1d(
  f: Float64Array,
  n: number,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = Number.NEGATIVE_INFINITY;
  z[1] = Number.POSITIVE_INFINITY;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Number.POSITIVE_INFINITY;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

/**
 * Squared distance from each pixel to the nearest pixel where `inside` is
 * set, a line at a time; on the page, in idle slices (engine/slice.ts),
 * where in one piece it had been a 34 to 36 ms task.
 */
async function edt2d(
  inside: Uint8Array,
  w: number,
  h: number,
  slicer?: Slicer,
): Promise<Float64Array> {
  const INF = 1e20;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = inside[i] ? 0 : INF;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
    if (slicer) await slicer.check();
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
    if (slicer) await slicer.check();
  }
  return grid;
}

/**
 * Draws `chars` in the face, which must be loaded into the context's font
 * set, on a canvas CELL_W × chars.length wide and CELL_H high, and returns
 * their field.
 */
export async function drawDigitField(
  ctx: Context2D,
  chars: readonly string[],
  slicer?: Slicer,
): Promise<DigitField> {
  const width = CELL_W * chars.length;
  ctx.font = `italic ${FONT_PX}px ${DIGIT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  const advance = new Float32Array(chars.length);
  for (const [i, ch] of chars.entries()) {
    advance[i] = ctx.measureText(ch).width / FONT_PX;
    ctx.fillText(ch, i * CELL_W + CELL_W / 2, BASELINE_PX);
  }
  const pixels = ctx.getImageData(0, 0, width, CELL_H).data;
  const inside = new Uint8Array(width * CELL_H);
  const outside = new Uint8Array(width * CELL_H);
  for (let i = 0; i < width * CELL_H; i++) {
    const on = pixels[i * 4 + 3] >= 128;
    inside[i] = on ? 1 : 0;
    outside[i] = on ? 0 : 1;
  }
  // Distance to the glyph from outside, to the background from inside.
  const toInk = await edt2d(inside, width, CELL_H, slicer);
  const toPaper = await edt2d(outside, width, CELL_H, slicer);
  const data = new Uint8Array(width * CELL_H);
  for (let i = 0; i < width * CELL_H; i++) {
    const signed = Math.sqrt(toPaper[i]) - Math.sqrt(toInk[i]);
    const v = 0.5 + signed / (2 * SPREAD_PX);
    data[i] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  return { data, advance };
}
