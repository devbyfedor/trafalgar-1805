import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  UnsignedByteType,
} from "three";

/**
 * The soundings' figures as a signed-distance atlas, drawn once at load
 * from the site's own Baskervville italic (public/fonts/3d, the waters'
 * face on the chart) through a FontFace and a 2D canvas, then turned into
 * distances: crisp at any size and foreshortening, and a few kilobytes on
 * the GPU. Old-style figures, as the face draws them, and the half for
 * shoal water.
 */

export const SOUNDING_CHARS = "0123456789½";

/** The figures' face in public/fonts/3d (scripts/check-lettering.ts checks it covers them). */
export const SOUNDING_FONT_FILE = "Baskervville-Italic.woff";

/** The font size the figures are drawn at, px. */
const FONT_PX = 64;
/** A cell of the atlas, px: room for the italic's overhang and the spread. */
const CELL_W = 80;
const CELL_H = 96;
/** The baseline's depth in a cell, px from its top. */
const BASELINE_PX = 64;
/** The distance the field spans either side of an edge, px. */
const SPREAD_PX = 8;

export interface DigitAtlas {
  texture: DataTexture;
  /** Each character's advance, ems. */
  advance: Float32Array;
  /** A cell's width and height, ems. */
  cellEm: readonly [number, number];
  /** The baseline's depth in a cell, ems from its top. */
  baselineEm: number;
  /** Bytes on the GPU, with mipmaps. */
  gpuBytes: number;
}

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

/** Squared distance from each pixel to the nearest pixel where `inside` is set. */
function edt2d(inside: Uint8Array, w: number, h: number): Float64Array {
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
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

/** Loads the face and draws the atlas. `fontUrl` is on this site. */
export async function buildDigitAtlas(fontUrl: string): Promise<DigitAtlas> {
  const family = "ChartSoundings";
  const face = new FontFace(family, `url(${fontUrl})`, { style: "italic" });
  await face.load();
  document.fonts.add(face);

  const chars = [...SOUNDING_CHARS];
  const width = CELL_W * chars.length;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = CELL_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("soundings: no 2D canvas");
  ctx.font = `italic ${FONT_PX}px ${family}`;
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
  const toInk = edt2d(inside, width, CELL_H);
  const toPaper = edt2d(outside, width, CELL_H);
  const data = new Uint8Array(width * CELL_H);
  for (let i = 0; i < width * CELL_H; i++) {
    const signed = Math.sqrt(toPaper[i]) - Math.sqrt(toInk[i]);
    const v = 0.5 + signed / (2 * SPREAD_PX);
    data[i] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  const texture = new DataTexture(
    data,
    width,
    CELL_H,
    RedFormat,
    UnsignedByteType,
  );
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return {
    texture,
    advance,
    cellEm: [CELL_W / FONT_PX, CELL_H / FONT_PX],
    baselineEm: BASELINE_PX / FONT_PX,
    gpuBytes: Math.round(width * CELL_H * (4 / 3)),
  };
}
