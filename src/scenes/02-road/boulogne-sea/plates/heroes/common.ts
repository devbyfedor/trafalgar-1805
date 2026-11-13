import type { CraftArt } from "@/components/ship/craft/geometry/index";
import {
  type CraftPalette,
  mix as linMix,
  paletteOf,
} from "@/components/ship/craft/light";
import type { CraftSpec } from "@/components/ship/craft/types";
import type { PlateCanvas } from "../../paint/plate";
import {
  clothBounds,
  type FlagSite,
  type FlagSpec,
  flagAnchors,
} from "./flags";

/**
 * What the craft's painters share (plates/heroes/): where a craft stands
 * in layer units, its evening palette through the air at its distance,
 * its box, the way into its own space (metres, SVG's y down, bow to the
 * left), and its flags as cloth.
 */

export interface CraftPlace {
  /** The waterline at the hull's mid-length, layer units. */
  x: number;
  y: number;
  /** Layer units per metre. */
  s: number;
  /** Bow to the left (the line's way to the stream). */
  bowLeft: boolean;
  /** Metres ahead of the eye: the haze and the detail. */
  ahead: number;
}

/** "hero": every part; "mid": the type's look without the finest lines. */
export type Detail = "hero" | "mid";

/** How far below the waterline the hull is drawn (metres): its foot, darkened by the sea. */
export const FOOT = 0.22;

/** The water's colours by the craft (scene.ts PALETTE.sea, near). */
export const WATER = "#30465a";
export const WATER_LIGHT = "#9eb0bf";
/** The evening air between the eye and a craft (warm grey). */
export const HAZE = "#c8bcb2";

const PATHS = new Map<string, Path2D>();
/** A cached Path2D of SVG path data (the craft module's art). */
export function P(d: string): Path2D {
  let p = PATHS.get(d);
  if (!p) {
    p = new Path2D(d);
    PATHS.set(d, p);
  }
  return p;
}

function mapColours<T>(v: T, f: (hex: string) => string): T {
  if (typeof v === "string") return (v.startsWith("#") ? f(v) : v) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = mapColours(x, f);
    return out as T;
  }
  return v;
}

/** The share of the evening air in a colour seen this far off. */
export function hazeOf(ahead: number): number {
  return 1 - Math.exp(-ahead / 2000);
}

const PALETTES = new Map<string, CraftPalette>();
/** A craft's evening palette seen through the air at a distance. */
export function paletteAt(spec: CraftSpec, ahead: number): CraftPalette {
  const k = Math.round(hazeOf(ahead) * 100) / 100;
  const key = `${spec.id}:${k}`;
  let p = PALETTES.get(key);
  if (!p) {
    const base = paletteOf(spec.paint, "evening");
    p = mapColours(base, (c) => linMix(c, HAZE, k));
    PALETTES.set(key, p);
  }
  return p;
}

/** Where the craft stands, for its flags. */
export function siteOf(pl: CraftPlace, art: CraftArt): FlagSite {
  return {
    ahead: pl.ahead,
    right: (pl.x * pl.ahead) / 1000,
    midX: art.midX,
    bowLeft: pl.bowLeft,
  };
}

/** The craft's flags: the tricolour at the stern, the pennant at the masthead (flags.ts, from the spec's numbers). */
export function flagsOf(art: CraftArt, seed: number): FlagSpec[] {
  return flagAnchors(art.spec, seed);
}

const SPANS = new Map<string, { minX: number; maxX: number; top: number }>();
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * The craft's span in metres from its spec's numbers alone (no paths
 * built, so a plate's box costs nothing to know): from the farthest reach
 * aft (the boat astern, the boom, a bumkin) to the farthest forward (the
 * jib-boom, the cable going down into the water), and its top; generous by
 * a margin. Its flags are measured as cloth (flags.ts).
 */
export function specSpan(spec: CraftSpec): {
  minX: number;
  maxX: number;
  top: number;
} {
  let s = SPANS.get(spec.id);
  if (s) return s;
  const h = spec.hull;
  let minX = -h.sternRake;
  let maxX = h.length + h.stemRake;
  let top = Math.max(...h.rail) + (h.stemHead ?? 0);
  const mastX = (id: string, y: number) => {
    const m = spec.masts.find((q) => q.id === id);
    return m ? m.x - (y - m.deck) * Math.tan(rad(m.rake)) : 0;
  };
  for (const m of spec.masts) {
    top = Math.max(top, m.truck);
    for (const y of m.yards ?? []) {
      const cx = mastX(m.id, y.y);
      minX = Math.min(minX, cx - y.length * 0.32 - 0.2);
      maxX = Math.max(maxX, cx + y.length * 0.32 + 0.2);
    }
  }
  if (spec.bowsprit) {
    const b = spec.bowsprit;
    const reach = b.length - b.jibBoom.overlap + b.jibBoom.length;
    maxX = Math.max(maxX, b.heel[0] + Math.cos(rad(b.angle)) * reach + 0.3);
    top = Math.max(top, b.heel[1] + Math.sin(rad(b.angle)) * reach + 0.4);
  }
  if (spec.runningBowsprit)
    maxX = Math.max(maxX, spec.runningBowsprit.to[0] + 0.2);
  if (spec.bumkin) minX = Math.min(minX, spec.bumkin.to[0] - 0.2);
  if (spec.gaff) {
    const g = spec.gaff;
    const ease = Math.cos(rad(g.ease));
    minX = Math.min(
      minX,
      mastX(g.mast, g.boom.at) - g.boom.length * ease - 0.4,
      mastX(g.mast, g.throat) - Math.cos(rad(g.angle)) * g.length * ease - 0.3,
    );
    top = Math.max(top, g.throat + Math.sin(rad(g.angle)) * g.length + 0.3);
  }
  if (spec.boat)
    minX = Math.min(
      minX,
      -h.sternRake - spec.boat.gap - spec.boat.length - 0.4,
    );
  const st = spec.ensign.staff;
  if (st) {
    top = Math.max(top, st.foot[1] + st.height);
    minX = Math.min(minX, st.foot[0] - Math.sin(rad(st.rake)) * st.height);
  }
  const a = spec.anchor;
  const run = a.hawse[1] / Math.tan(rad(a.angle));
  maxX = Math.max(maxX, a.hawse[0] + run * 1.7 + 0.3);
  for (const lg of spec.lugs ?? []) {
    minX = Math.min(minX, lg.aftX - 0.3);
    maxX = Math.max(maxX, lg.aftX + lg.length + 0.3);
  }
  for (const g of spec.guns) {
    const e = g.x + g.dir * g.length;
    minX = Math.min(minX, e - 0.3);
    maxX = Math.max(maxX, e + 0.3);
  }
  s = { minX: minX - 0.6, maxX: maxX + 0.6, top: top + 0.8 };
  SPANS.set(spec.id, s);
  return s;
}

/** Layer units of a craft's drawing: its box (the hanging flags in it), the waterline's middle at (x, y). */
export function craftExtent(
  spec: CraftSpec,
  pl: CraftPlace,
  seed = 0,
): { x0: number; x1: number; top: number; bottom: number } {
  const span = specSpan(spec);
  const midX = spec.hull.length / 2;
  const sx = pl.bowLeft ? -1 : 1;
  const a = pl.x + pl.s * (span.minX - midX) * sx;
  const b = pl.x + pl.s * (span.maxX - midX) * sx;
  let x0 = Math.min(a, b);
  let x1 = Math.max(a, b);
  let top = pl.y + pl.s * span.top;
  const site: FlagSite = {
    ahead: pl.ahead,
    right: (pl.x * pl.ahead) / 1000,
    midX,
    bowLeft: pl.bowLeft,
  };
  for (const f of flagAnchors(spec, seed)) {
    const bx = clothBounds(site, f);
    x0 = Math.min(x0, bx.x0);
    x1 = Math.max(x1, bx.x1);
    top = Math.max(top, bx.y1);
  }
  return { x0, x1, top, bottom: pl.y - pl.s * FOOT };
}

/** Into the craft's own space: metres, SVG's y down (flipped: its reflection). */
export function enter(
  c: PlateCanvas,
  pl: CraftPlace,
  art: CraftArt,
  flip = false,
): void {
  const { ctx } = c;
  ctx.translate(pl.x, pl.y);
  ctx.scale(pl.bowLeft ? -pl.s : pl.s, flip ? pl.s : -pl.s);
  ctx.translate(-art.midX, 0);
}

/** The transform from the craft's space into layer units, as a matrix (flipped: its reflection). */
export function craftMatrix(
  pl: CraftPlace,
  art: CraftArt,
  flip = false,
): DOMMatrix {
  return new DOMMatrix()
    .translate(pl.x, pl.y)
    .scale(pl.bowLeft ? -pl.s : pl.s, flip ? pl.s : -pl.s)
    .translate(-art.midX, 0);
}
