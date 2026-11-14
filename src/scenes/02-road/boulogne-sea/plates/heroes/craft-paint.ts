import {
  buildCraftArt,
  type CraftArt,
  craftArtSteps,
} from "@/components/ship/craft/geometry/index";
import type { CraftSpec } from "@/components/ship/craft/types";
import type { PlateCanvas, PlateJob } from "../../paint/plate";
import { colourArt } from "./colour";
import {
  type CraftPlace,
  type Detail,
  enter,
  FOOT,
  flagsOf,
  HAZE,
  hazeOf,
  P,
  paletteAt,
  siteOf,
} from "./common";
import { clothShape, engraveCloth, paintCloth } from "./flags";
import { paintHullSide, paintWaterline } from "./hull-colour";
import { inkArt } from "./ink";
import { SEA_PENICHE } from "./specs";

export type { CraftPlace, Detail } from "./common";
export { craftExtent } from "./common";
export { reflectionJobs, reflectionReach } from "./reflect";

/**
 * A craft of the flotilla painted into a plate's rasters (paint/plate.ts):
 * the craft module's drawing (components/ship/craft/, the hero art in
 * metres, starboard elevation, SVG's y down) set at its place in layer
 * units, mirrored so the bow points left (the line lies bows to the
 * north-north-east, to the stream): in colour (colour.ts) or engraved
 * (ink.ts), its flags hanging in the light air as cloth (flags.ts), its
 * reflection a plate of its own (reflect.ts).
 */

/**
 * The craft's geometry built in short steps (the craft module's
 * craftArtSteps), as a plate's first jobs; each does nothing once the type
 * is built, so every plate can carry them.
 */
export function prepJobs(spec: CraftSpec): PlateJob[] {
  const warm = (pick: (art: CraftArt) => object) => () => {
    for (const d of Object.values(pick(buildCraftArt(spec))))
      if (typeof d === "string" && d) P(d);
  };
  return [
    ...craftArtSteps(spec).map((step) => () => step()),
    // The paths parsed ahead of the painting, part by part.
    warm((a) => a.hull),
    warm((a) => a.rig),
    warm((a) => ({ ...a.rigging, ...a.fittings, ...a.reflection })),
    rehearsal("hull"),
    rehearsal("colour"),
    rehearsal("ink"),
  ];
}

const rehearsed = new Set<string>();
/**
 * The painting's code run once on a canvas of a few pixels, the craft a
 * speck in it, so the browser has compiled it before the first real job
 * (which then stays short): the hull's side, the whole craft in colour,
 * then engraved, a job each.
 */
const rehearsal =
  (part: "hull" | "colour" | "ink"): PlateJob =>
  (c) => {
    if (rehearsed.has(part)) return;
    rehearsed.add(part);
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tiny: PlateCanvas = {
      ...c,
      ctx,
      mode: part === "ink" ? "ink" : "colour",
      k: 0.02,
      pen: (px: number) => px / 0.02,
    };
    const pl: CraftPlace = { x: 0, y: 0, s: 1, bowLeft: true, ahead: 400 };
    if (part === "hull") {
      const art = buildCraftArt(SEA_PENICHE);
      const p = paletteAt(SEA_PENICHE, pl.ahead);
      paintHullSide(ctx, art, p, false, (px) => px, false);
      paintWaterline(ctx, art, (px) => px, false, 1);
      return;
    }
    craftJob(SEA_PENICHE, pl, "mid", 1)(tiny);
  };

/** The craft's drawing above the water (and its foot), as one job. */
export function craftJob(
  spec: CraftSpec,
  pl: CraftPlace,
  detail: Detail,
  seed: number,
): PlateJob {
  return (c) => {
    const art = buildCraftArt(spec);
    const { ctx } = c;
    const base = ctx.getTransform();
    ctx.save();
    enter(c, pl, art);
    const vb = art.viewBox;
    ctx.beginPath();
    const foot = c.mode === "colour" ? FOOT : 0.02;
    ctx.rect(vb.x - 20, vb.y - 20, vb.width + 40, -vb.y + 20 + foot);
    ctx.clip();
    const flags = () => {
      ctx.save();
      ctx.setTransform(base);
      for (const f of flagsOf(art, seed)) {
        const shape = clothShape(siteOf(pl, art), f);
        if (c.mode === "colour") paintCloth(c, shape, hazeOf(pl.ahead), HAZE);
        else engraveCloth(c, shape, detail === "hero" ? 1 : 0.8);
      }
      ctx.restore();
    };
    if (c.mode === "colour")
      colourArt(c, art, pl, paletteAt(spec, pl.ahead), detail, seed, flags);
    else inkArt(c, art, pl, detail, seed, flags);
    ctx.restore();
  };
}
