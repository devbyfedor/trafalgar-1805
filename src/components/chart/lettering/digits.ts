import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  UnsignedByteType,
} from "three";
import { SLICE_MS, Slicer } from "../engine/slice";
import {
  BASELINE_PX,
  CELL_H,
  CELL_W,
  DIGIT_FAMILY,
  type DigitField,
  type DigitFieldReply,
  type DigitFieldRequest,
  drawDigitField,
  FONT_PX,
} from "./digit-field";

/**
 * The soundings' figures as a signed-distance atlas, drawn once at load
 * from the site's own Baskervville italic (public/fonts/3d, the waters'
 * face on the chart) through a FontFace and a 2D canvas, then turned into
 * distances: crisp at any size and foreshortening, and a few kilobytes on
 * the GPU. Old-style figures, as the face draws them, and the half for
 * shoal water. Drawn in a worker (digits.worker.ts), so the page's font set
 * never changes while scene 1 plays; on the page only where a worker can't
 * draw text.
 */

export const SOUNDING_CHARS = "0123456789½";

/** The figures' face in public/fonts/3d (scripts/check-lettering.ts checks it covers them). */
export const SOUNDING_FONT_FILE = "Baskervville-Italic.woff";

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

/** The field drawn in a worker; null where one can't draw it. */
function fieldInWorker(
  fontUrl: string,
  chars: string[],
  signal?: AbortSignal,
): Promise<DigitField | null> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./digits.worker.ts", import.meta.url), {
        type: "module",
        name: "chart-digits",
      });
    } catch {
      resolve(null);
      return;
    }
    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<DigitFieldReply>) => {
      finish();
      resolve(data.ok ? { data: data.data, advance: data.advance } : null);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish();
      resolve(null);
    };
    const request: DigitFieldRequest = {
      fontUrl: new URL(fontUrl, document.baseURI).href,
      chars,
    };
    worker.postMessage(request);
  });
}

/**
 * The field drawn on the page, in idle slices. Adding the face to the
 * document restyles the whole page once.
 */
async function fieldOnPage(
  fontUrl: string,
  chars: string[],
  signal?: AbortSignal,
): Promise<DigitField> {
  const face = new FontFace(DIGIT_FAMILY, `url(${fontUrl})`, {
    style: "italic",
  });
  await face.load();
  signal?.throwIfAborted();
  document.fonts.add(face);
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * chars.length;
  canvas.height = CELL_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("soundings: no 2D canvas");
  return drawDigitField(ctx, chars, new Slicer(SLICE_MS, signal));
}

/** Loads the face and draws the atlas. `fontUrl` is on this site. */
export async function buildDigitAtlas(
  fontUrl: string,
  signal?: AbortSignal,
): Promise<DigitAtlas> {
  const chars = [...SOUNDING_CHARS];
  const field =
    (await fieldInWorker(fontUrl, chars, signal)) ??
    (await fieldOnPage(fontUrl, chars, signal));
  signal?.throwIfAborted();
  const width = CELL_W * chars.length;
  const texture = new DataTexture(
    field.data,
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
    advance: field.advance,
    cellEm: [CELL_W / FONT_PX, CELL_H / FONT_PX],
    baselineEm: BASELINE_PX / FONT_PX,
    gpuBytes: Math.round(width * CELL_H * (4 / 3)),
  };
}
