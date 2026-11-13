import {
  buildCraftArt,
  type CraftArt,
} from "@/components/ship/craft/geometry/index";
import {
  type CraftPalette,
  mix as linMix,
  paletteOf,
} from "@/components/ship/craft/light";
import type { CraftSpec } from "@/components/ship/craft/types";
import type { PlateCanvas } from "../../paint/plate";
import { clothShape, type FlagSite, type FlagSpec } from "./flags";

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

/** The craft's flags: the tricolour at the stern, the pennant at the masthead. */
export function flagsOf(art: CraftArt, seed: number): FlagSpec[] {
  return art.flags.map((f, i) => ({
    kind: f.kind,
    anchor: [f.anchor[0], f.anchor[1]] as const,
    fly: f.fly,
    hoist: f.hoist,
    seed: seed * 7 + i * 131,
  }));
}

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

const SPANS = new Map<string, { minX: number; maxX: number; top: number }>();
/**
 * The craft's own span in metres without its flags (the module's box
 * holds them streaming aft; here they hang, and are measured as cloth).
 */
function spanOf(art: CraftArt) {
  const key = art.spec.id;
  let s = SPANS.get(key);
  if (s) return s;
  const { hull, rig, rigging, fittings } = art;
  const parts = [
    hull.outline,
    hull.rudder,
    hull.tiller,
    rig.masts,
    rig.heads,
    rig.yards,
    rig.spars,
    rig.darkSpars,
    rig.canvas,
    rig.lugCanvas,
    rigging.heavy,
    rigging.light,
    rigging.shrouds,
    rigging.running,
    rigging.anchor,
    fittings.guns,
    fittings.oars,
    fittings.chimney,
    fittings.boat?.hull ?? "",
    fittings.boat?.painter ?? "",
  ];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const d of parts) {
    const v = d.match(NUM) ?? [];
    for (let i = 0; i + 1 < v.length; i += 2) {
      const x = Number(v[i]);
      const y = Number(v[i + 1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
    }
  }
  minX = Math.min(minX, rigging.cableEntry[0]);
  maxX = Math.max(maxX, rigging.cableEntry[0] + 0.3);
  s = { minX: minX - 0.4, maxX: maxX + 0.4, top: -minY + 0.4 };
  SPANS.set(key, s);
  return s;
}

/** Layer units of a craft's drawing: its box (the hanging flags in it), the waterline's middle at (x, y). */
export function craftExtent(
  spec: CraftSpec,
  pl: CraftPlace,
  seed = 0,
): { x0: number; x1: number; top: number; bottom: number } {
  const art = buildCraftArt(spec);
  const span = spanOf(art);
  const sx = pl.bowLeft ? -1 : 1;
  const a = pl.x + pl.s * (span.minX - art.midX) * sx;
  const b = pl.x + pl.s * (span.maxX - art.midX) * sx;
  let x0 = Math.min(a, b);
  let x1 = Math.max(a, b);
  let top = pl.y + pl.s * span.top;
  for (const f of flagsOf(art, seed)) {
    const bx = clothShape(siteOf(pl, art), f).bounds;
    x0 = Math.min(x0, bx.x0 - 1);
    x1 = Math.max(x1, bx.x1 + 1);
    top = Math.max(top, bx.y1 + 1);
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
