import { buildCraftArt } from "@/components/ship/craft/geometry/index";
import {
  type CraftPalette,
  mix as linMix,
} from "@/components/ship/craft/light";
import type { CraftSpec } from "@/components/ship/craft/types";
import { createRng } from "../../paint/kit";
import { INK, type PlateCanvas, type PlateJob } from "../../paint/plate";
import { colourArt } from "./colour";
import {
  type CraftPlace,
  craftExtent,
  craftMatrix,
  enter,
  flagsOf,
  HAZE,
  hazeOf,
  P,
  paletteAt,
  siteOf,
  WATER,
} from "./common";
import { clothShape, paintCloth } from "./flags";

/**
 * A craft's reflection in the swell (docs/scene-02-boulogne-brief.md, the
 * owner's bug 3): the craft above the water mirrored about its waterline,
 * darkened toward the water's colour with the lit side's warmth kept, then
 * laid into the plate row by row, each row shifted sideways by the
 * ripples, so a mast's reflection breaks into a wavering zigzag; rows here
 * and there left out where a facet of the swell shows the sky instead; the
 * whole fading as it reaches down, so the masts' reflections die out
 * half-way (the eye sees the near water reflect less, and the swell break
 * up what it does). Under the hull it stays whole: the hull's dark band.
 *
 * In the engraving: broken horizontal strokes, close where the reflected
 * thing is dark (the hull, the spars, the flag's colours), open where it
 * is light (the canvas), laid through the same rippled rows and fading.
 */

/** How far down the reflection reaches, as a share of the craft's height. */
const REACH = 0.55;

/** The layer y the reflection reaches down to. */
export function reflectionReach(
  spec: CraftSpec,
  pl: CraftPlace,
  seed: number,
): number {
  const ext = craftExtent(spec, pl, seed);
  return pl.y - (ext.top - pl.y) * REACH;
}

interface Region {
  /** Layer units: x0, x1, y0 (bottom), y1 (top: just over the waterline). */
  box: [number, number, number, number];
}

/** A scratch canvas over a region of layer units, at the plate's k, its context's units as the plate's (y up). */
function scratchFor(
  c: PlateCanvas,
  box: readonly [number, number, number, number],
): { canvas: HTMLCanvasElement; sc: PlateCanvas } | null {
  const [x0, x1, y0, y1] = box;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil((x1 - x0) * c.k));
  canvas.height = Math.max(1, Math.ceil((y1 - y0) * c.k));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(c.k, 0, 0, -c.k, -x0 * c.k, y1 * c.k);
  return { canvas, sc: { ...c, ctx, box: [x0, x1, y0, y1] } };
}

/** The ripples' rows: device-px rows of a region, each with its shift, its alpha, or left out. */
interface Row {
  y: number;
  h: number;
  shift: number;
  alpha: number;
}

function ripples(
  pl: CraftPlace,
  k: number,
  height: number,
  top: number,
  seed: number,
): Row[] {
  const rng = createRng(seed);
  const pxPerM = pl.s * k;
  const total = height / pxPerM;
  const rows: Row[] = [];
  const ph = [0, 0, 0, 0].map(() => rng() * 6.28);
  // The ripples' phase runs down the rows, their wavelength growing as the
  // water reflecting them comes nearer the eye; three trains that never
  // fall into step, so no two stretches waver alike.
  let phase = 0;
  for (let y = 0; y < height; y++) {
    const dm = Math.max(0, (y - top) / pxPerM);
    const lambda = pxPerM * (0.2 + 0.06 * dm);
    phase += (2 * Math.PI) / Math.max(3, lambda);
    // Whole for the first half metre under the hull, then breaking up.
    const near = Math.min(1, dm / 0.5) ** 1.5;
    const amp = (0.03 + 0.034 * dm) * pxPerM * near;
    const swell = 0.6 + 0.4 * Math.sin(phase * 0.13 + ph[3]);
    const shift =
      amp *
      swell *
      (Math.sin(phase + ph[0]) +
        0.5 * Math.sin(phase * 0.41 + ph[1]) +
        0.3 * Math.sin(phase * 1.73 + ph[2]));
    const fade = Math.max(0, 1 - dm / total) ** 1.7;
    rows.push({ y, h: 1, shift, alpha: fade });
  }
  return rows;
}

/**
 * Facets of the swell turned to the sky, where the reflection gives way:
 * short horizontal slivers wiped out of it, few under the hull, more and
 * longer as it reaches down (device px of the rippled canvas).
 */
function wipeFacets(
  ctx: CanvasRenderingContext2D,
  pl: CraftPlace,
  k: number,
  top: number,
  seed: number,
): void {
  const { width, height } = ctx.canvas;
  const rng = createRng(seed);
  const pxPerM = pl.s * k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  for (const [w, alpha] of [
    [1, 0.9],
    [1.8, 0.65],
  ] as const) {
    ctx.lineWidth = w;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    // The first wipes a little below the waterline, each sliver at its own
    // height, so no row of them lines up into a stitched seam.
    let y = top + pxPerM * 0.7 + rng() * 2;
    while (y < height) {
      const dm = (y - top) / pxPerM;
      const share = Math.min(0.5, 0.09 + 0.03 * dm);
      let x = rng() * 30;
      while (x < width) {
        const run = 4 + rng() * (8 + dm * 3.2);
        if (rng() < share) {
          const yy = y + (rng() - 0.5) * (1.6 + dm * 0.3);
          ctx.moveTo(x, yy);
          ctx.lineTo(x + run, yy);
        }
        x += run + 2 + rng() * 10;
      }
      y += 2 + rng() * (2.5 + dm * 0.25);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Lays a scratch into a target canvas through the ripples' rows (device px; the target's transform is reset here). */
function layRows(
  target: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  rows: readonly Row[],
  dx: number,
  dy: number,
  alpha: number,
): void {
  target.save();
  target.setTransform(1, 0, 0, 1, 0, 0);
  for (const r of rows) {
    if (r.alpha <= 0.01) continue;
    const h = Math.min(r.h, src.height - r.y);
    if (h <= 0) break;
    target.globalAlpha = r.alpha * alpha;
    target.drawImage(
      src,
      0,
      r.y,
      src.width,
      h,
      dx + r.shift,
      dy + r.y,
      src.width,
      h,
    );
  }
  target.restore();
}

const DARKENED = new Map<string, CraftPalette>();
/** The palette as the water gives it back: darker, toward the water's colour, the warmth kept. */
function mirrored(p: CraftPalette, key: string): CraftPalette {
  let m = DARKENED.get(key);
  if (!m) {
    const walk = (v: unknown): unknown => {
      if (typeof v === "string")
        return v.startsWith("#") ? linMix(v, WATER, 0.38) : v;
      if (v && typeof v === "object")
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, walk(x)]),
        );
      return v;
    };
    m = walk(p) as CraftPalette;
    DARKENED.set(key, m);
  }
  return m;
}

/**
 * The reflection's jobs: the mirrored craft into a scratch, then (colour)
 * laid through the ripples, or (ink) its tone as a mask laid through the
 * ripples and engraved. `bottom`: the frame's lowest reach (layer units).
 */
export function reflectionJobs(
  spec: CraftSpec,
  pl: CraftPlace,
  seed: number,
  bottom = Number.NEGATIVE_INFINITY,
): PlateJob[] {
  let scratch: HTMLCanvasElement | null = null;
  const region: Region = { box: [0, 0, 0, 0] };
  /** How far the scratch's top stands over the waterline, layer units. */
  const over = 0.05 * pl.s;

  const mirror: PlateJob = (c) => {
    const art = buildCraftArt(spec);
    const ext = craftExtent(spec, pl, seed);
    const reach = Math.max(bottom, reflectionReach(spec, pl, seed));
    region.box = [ext.x0 - 4, ext.x1 + 4, reach, pl.y + over];
    const s = scratchFor(c, region.box);
    if (!s) return;
    scratch = s.canvas;
    const { sc } = s;
    const sctx = sc.ctx;
    const base = sctx.getTransform();
    if (c.mode === "colour") {
      const p = mirrored(
        paletteAt(spec, pl.ahead),
        `${spec.id}:${hazeOf(pl.ahead).toFixed(2)}`,
      );
      sctx.save();
      enter(sc, pl, art, true);
      sctx.beginPath();
      const vb = art.viewBox;
      sctx.rect(vb.x - 20, vb.y - 20, vb.width + 40, -vb.y + 20);
      sctx.clip();
      const flags = () => {
        sctx.save();
        sctx.setTransform(base);
        for (const f of flagsOf(art, seed)) {
          paintCloth(
            sc,
            clothShape(siteOf(pl, art), f, true),
            hazeOf(pl.ahead),
            HAZE,
            {
              colour: WATER,
              share: 0.38,
            },
          );
        }
        sctx.restore();
      };
      colourArt(sc, art, pl, p, "mid", seed, flags, true);
      sctx.restore();
    } else {
      // The tone to engrave: dark things full, the canvas faint.
      const M = craftMatrix(pl, art, true);
      const fillIn = (d: string, alpha: number) => {
        if (!d) return;
        const path = new Path2D();
        path.addPath(P(d), M);
        sctx.globalAlpha = alpha;
        sctx.fill(path);
      };
      sctx.fillStyle = "#000";
      const r = art.reflection;
      fillIn(r.hull, 0.8);
      fillIn(r.spars, 0.85);
      fillIn(r.canvas, 0.18);
      for (const f of flagsOf(art, seed)) {
        const shape = clothShape(siteOf(pl, art), f, true);
        for (const q of shape.quads) {
          sctx.globalAlpha = q.band === 1 ? 0.2 : 0.8;
          sctx.beginPath();
          sctx.moveTo(q.pts[0][0], q.pts[0][1]);
          for (let i = 1; i < 4; i++) sctx.lineTo(q.pts[i][0], q.pts[i][1]);
          sctx.closePath();
          sctx.fill();
        }
      }
      sctx.globalAlpha = 1;
    }
  };

  const lay: PlateJob = (c) => {
    const src = scratch;
    if (!src) return;
    scratch = null;
    const [x0, , , y1] = region.box;
    const dx = (x0 - c.box[0]) * c.k;
    const dy = (c.box[3] - y1) * c.k;
    const rows = ripples(pl, c.k, src.height, over * c.k, seed + 13);
    if (c.mode === "colour") {
      const rippled = document.createElement("canvas");
      rippled.width = src.width + 40;
      rippled.height = src.height;
      const rctx = rippled.getContext("2d");
      if (!rctx) return;
      layRows(rctx, src, rows, 20, 0, 0.94);
      wipeFacets(rctx, pl, c.k, over * c.k, seed + 19);
      c.ctx.save();
      c.ctx.setTransform(1, 0, 0, 1, 0, 0);
      c.ctx.drawImage(rippled, dx - 20, dy);
      c.ctx.restore();
      return;
    }
    // The engraving: the tone rippled, then horizontal broken strokes kept
    // where it is, fading with the reflection.
    const rippled = document.createElement("canvas");
    rippled.width = src.width + 40;
    rippled.height = src.height;
    const rctx = rippled.getContext("2d");
    if (!rctx) return;
    layRows(rctx, src, rows, 20, 0, 1);
    const strokes = document.createElement("canvas");
    strokes.width = rippled.width;
    strokes.height = rippled.height;
    const sctx = strokes.getContext("2d");
    if (!sctx) return;
    const rng = createRng(seed + 17);
    const pxPerM = pl.s * c.k;
    sctx.strokeStyle = INK.hatch;
    sctx.lineCap = "round";
    sctx.lineWidth = Math.max(0.55, Math.min(1, pxPerM * 0.05));
    sctx.beginPath();
    let y = over * c.k + 1.4;
    while (y < strokes.height) {
      const dm = Math.max(0, (y - over * c.k) / pxPerM);
      let x = rng() * 8;
      while (x < strokes.width) {
        const len = 3 + rng() * (dm < 1 ? 15 : 8);
        sctx.moveTo(x, y);
        sctx.lineTo(x + len, y);
        x += len + 2.5 + rng() * (4 + dm * 0.45);
      }
      y += 2.6 + Math.min(3.6, dm * 0.25) + rng() * 1.1;
    }
    sctx.stroke();
    sctx.globalCompositeOperation = "destination-in";
    sctx.drawImage(rippled, 0, 0);
    // Fade with depth below the water.
    const fade = sctx.createLinearGradient(0, 0, 0, strokes.height);
    fade.addColorStop(0, "rgba(0,0,0,0.95)");
    fade.addColorStop(0.45, "rgba(0,0,0,0.55)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = fade;
    sctx.fillRect(0, 0, strokes.width, strokes.height);
    c.ctx.save();
    c.ctx.setTransform(1, 0, 0, 1, 0, 0);
    c.ctx.globalAlpha = 0.9;
    c.ctx.drawImage(strokes, dx - 20, dy);
    c.ctx.restore();
  };
  return [mirror, lay];
}
