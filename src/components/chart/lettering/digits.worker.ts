import {
  CELL_H,
  CELL_W,
  DIGIT_FAMILY,
  type DigitFieldReply,
  type DigitFieldRequest,
  drawDigitField,
} from "./digit-field";

/**
 * Draws the soundings' figure atlas off the page (digits.ts). The face goes
 * into the worker's own font set, never the document's: adding a face to
 * the document restyles the whole page, and while the chart loads under
 * scene 1 that re-rasterised every one of its layers at once, a 60 ms burst
 * on the GPU (docs/research/perf-start-of-scroll.md).
 */

interface WorkerScope {
  fonts: FontFaceSet;
  onmessage: ((event: MessageEvent<DigitFieldRequest>) => void) | null;
  postMessage(message: DigitFieldReply, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async ({ data: { fontUrl, chars } }) => {
  try {
    const face = new FontFace(DIGIT_FAMILY, `url(${fontUrl})`, {
      style: "italic",
    });
    await face.load();
    scope.fonts.add(face);
    const canvas = new OffscreenCanvas(CELL_W * chars.length, CELL_H);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2D context in the worker");
    const field = await drawDigitField(ctx, chars);
    scope.postMessage({ ok: true, ...field }, [
      field.data.buffer,
      field.advance.buffer,
    ]);
  } catch (error) {
    scope.postMessage({ ok: false, error: String(error) });
  }
};
