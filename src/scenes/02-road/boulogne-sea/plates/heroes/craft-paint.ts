import { buildCraftArt } from "@/components/ship/craft/geometry/index";
import type { CraftSpec } from "@/components/ship/craft/types";
import type { PlateJob } from "../../paint/plate";
import { colourArt } from "./colour";
import {
  type CraftPlace,
  type Detail,
  enter,
  FOOT,
  flagsOf,
  HAZE,
  hazeOf,
  paletteAt,
  siteOf,
} from "./common";
import { clothShape, engraveCloth, paintCloth } from "./flags";
import { inkArt } from "./ink";

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
