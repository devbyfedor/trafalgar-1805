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
import { createRng, rgba } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";

/**
 * A craft of the flotilla painted into a plate's rasters (paint/plate.ts):
 * the craft module's drawing (components/ship/craft/, the hero art in
 * metres, starboard elevation, SVG's y down) set at its place in layer
 * units, mirrored so the bow points left (the line lies bows to the
 * north-north-east, to the stream), in the evening light of the module's
 * palette (light.ts: the sun low behind the viewer, a little to his left,
 * so the side toward him is lit warm and square-on).
 *
 * Colour follows Craft.tsx's paint order; the engraving is the same craft
 * in the chart's inks on paper: the hull paper-backed, its contour, the
 * planking's lines, denser low and at the ends where the hull turns from
 * the light, the wales and ports, the rig in fine lines, the canvas
 * hatched on its shaded side. The reflection is its own pass: the drawing
 * above the water flipped, darkened toward the water, broken by the
 * ripples into horizontal slivers (in the engraving: broken strokes).
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
const FOOT = 0.22;

/** The water's colours by the craft (scene.ts PALETTE.sea, near). */
const WATER = "#30465a";
const WATER_LIGHT = "#9eb0bf";
/** The evening air between the eye and a craft (warm grey). */
const HAZE = "#c8bcb2";

const PATHS = new Map<string, Path2D>();
function P(d: string): Path2D {
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

/** Layer units of a craft's drawing: its box, the waterline's middle at (x, y). */
export function craftExtent(
  spec: CraftSpec,
  pl: CraftPlace,
): { x0: number; x1: number; top: number; bottom: number } {
  const { viewBox: vb, midX } = buildCraftArt(spec);
  const a = pl.x + pl.s * (vb.x - midX) * (pl.bowLeft ? -1 : 1);
  const b = pl.x + pl.s * (vb.x + vb.width - midX) * (pl.bowLeft ? -1 : 1);
  return {
    x0: Math.min(a, b),
    x1: Math.max(a, b),
    top: pl.y + pl.s * -vb.y,
    bottom: pl.y - pl.s * FOOT,
  };
}

/** Into the craft's own space: metres, SVG's y down (flipped: its reflection). */
function enter(c: PlateCanvas, pl: CraftPlace, art: CraftArt, flip = false) {
  const { ctx } = c;
  ctx.translate(pl.x, pl.y);
  ctx.scale(pl.bowLeft ? -pl.s : pl.s, flip ? pl.s : -pl.s);
  ctx.translate(-art.midX, 0);
}

const FLAG_COLOURS: Record<string, keyof CraftPalette["flag"]> = {
  "#ece6d8": "white",
  "#b3261e": "red",
  "#1f2f5c": "blue",
};

// ------------------------------------------------------------------ colour

function colourArt(
  c: PlateCanvas,
  art: CraftArt,
  pl: CraftPlace,
  p: CraftPalette,
  detail: Detail,
  seed: number,
): void {
  const { ctx } = c;
  const { hull: h, rig: g, rigging: rg, fittings: f, spec } = art;
  const hs = spec.hull;
  const hero = detail === "hero";
  const dev = (px: number) => c.pen(px) / pl.s;
  const k = Math.min(1, Math.max(0.45, hs.length / 34.8));
  const pen = (px: number, metres: number) => Math.max(dev(px), metres);
  const W = {
    stays: pen(1.25, 0.07 * k),
    staysLight: pen(0.85, 0.04 * k),
    heavy: pen(1.25, 0.07 * k),
    shrouds: pen(1.0, 0.055 * k),
    light: pen(0.8, 0.035 * k),
    ratlines: pen(0.55, 0.016 * k),
    running: pen(0.65, 0.022 * k),
    lanyards: pen(0.5, 0.014 * k),
    chain: pen(0.8, 0.045 * k),
    gammoning: pen(0.8, 0.04 * k),
    seams: pen(0.6, 0.012),
    butts: pen(0.5, 0.01),
    gaskets: pen(0.8, 0.026 * k),
    folds: pen(0.7, 0.018),
    glint: pen(0.85, 0.018),
    edge: pen(0.65, 0.012),
  };
  const F = (d: string | undefined, colour: string, alpha = 1) => {
    if (!d) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fill(P(d));
  };
  const L = (
    d: string | undefined,
    colour: string,
    width: number,
    alpha = 1,
    cap: CanvasLineCap = "round",
  ) => {
    if (!d) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.lineJoin = "round";
    ctx.stroke(P(d));
  };
  const xs = -hs.sternRake;
  const xe = hs.length + hs.stemRake;

  // An open boat's far side, seen over the near gunwale.
  F(h.farInside, p.inside.side);
  F(h.farGunwale, p.rail.top);

  // A boat astern on her painter.
  if (f.boat) {
    F(f.boat.inside, p.inside.side);
    F(f.boat.hull, p.hull.side);
    F(f.boat.shade, p.hull.under, 0.55);
    if (hero) L(f.boat.seams, p.hull.shadow, W.seams, 0.5);
    F(f.boat.strake, p.rail.side);
    L(f.boat.painter, p.running.side, W.running, 0.8);
  }

  // Masts, tops and caps; the bowsprit and other spars.
  F(g.masts, p.mast.side);
  F(g.mastShade, p.mast.turned);
  if (hero) F(g.mastGlint, p.glint, 0.35);
  F(g.mastBands, p.iron.side, 0.85);
  F(g.heads, p.spar.side);
  F(g.headShade, p.spar.under);
  F(g.spars, p.mast.side);
  F(g.sparShade, p.mast.under);
  if (hero) F(g.sparGlint, p.glint, 0.3);
  F(g.darkSpars, p.spar.side);
  F(g.darkSparShade, p.spar.under);

  // Stays, behind the yards.
  L(rg.stays, p.rope.side, W.stays, 0.92);
  L(rg.staysLight, p.rope.side, W.staysLight, 0.85);

  // Yards, and the canvas furled on them.
  F(g.yards, p.spar.side);
  F(g.yardShade, p.spar.under);
  if (hero) F(g.yardGlint, p.glint, 0.22);
  F(g.canvas, p.canvas.side);
  F(g.canvasLower, p.canvas.under, 0.85);
  F(g.canvasUpper, p.canvas.top, 0.75);
  if (hero) {
    L(g.canvasFolds, p.canvas.under, W.folds, 0.55);
    L(g.canvasGlint, p.glint, W.glint, 0.5);
  }
  L(g.gaskets, p.rope.turned, W.gaskets, hero ? 0.75 : 0.45, "butt");

  // Inboard: the galley's chimney, the chase guns, lowered yards, oars.
  F(f.chimney, p.iron.side);
  F(f.chimneyShade, p.iron.turned);
  F(f.gunSlides, p.rail.turned);
  F(f.guns, p.iron.side);
  F(f.gunShade, p.iron.under);
  if (hero) F(f.gunGlint, p.glint, 0.3);
  F(g.lugYards, p.spar.side);
  F(g.lugYardShade, p.spar.under);
  F(g.lugCanvas, p.canvas.side);
  F(g.lugCanvasLower, p.canvas.under, 0.85);
  F(g.lugCanvasUpper, p.canvas.top, 0.75);
  if (hero) L(g.lugFolds, p.canvas.under, W.folds, 0.55);
  L(g.lugGaskets, p.rope.turned, W.gaskets, hero ? 0.75 : 0.45, "butt");
  F(f.oars, p.rail.side);
  F(f.oarShade, p.rail.under);

  // The hull.
  F(h.outline, p.hull.side);
  ctx.save();
  ctx.clip(P(h.outline));
  F(h.bottom, p.bottom.low);
  F(h.strakesLight, p.hull.top, 0.1);
  F(h.strakesDark, p.hull.shadow, 0.14);
  F(h.faded, p.hull.top, 0.09);
  if (hero) {
    L(h.seams, p.hull.shadow, W.seams, 0.5);
    L(h.butts, p.hull.shadow, W.butts, 0.32, "butt");
  } else {
    L(h.seams, p.hull.shadow, W.seams, 0.25);
  }
  F(h.wales, p.wale.side);
  F(h.waleTops, p.wale.top);
  F(h.waleUnders, p.wale.under, 0.85);
  F(h.streaks, p.cast, 0.16);
  // The side darkens toward the water, where it curves in and sees the sea.
  const low = ctx.createLinearGradient(0, -(hs.deck + 0.2), 0, 0.1);
  low.addColorStop(0, rgba(p.hull.low, 0));
  low.addColorStop(0.55, rgba(p.hull.low, 0.32));
  low.addColorStop(1, rgba(p.hull.under, 0.8));
  ctx.globalAlpha = 1;
  ctx.fillStyle = low;
  ctx.fill(P(h.outline));
  // The bow turns away from the sun; the stern's quarter less so.
  const ends = ctx.createLinearGradient(xs, 0, xe, 0);
  ends.addColorStop(0, rgba(p.hull.turned, hs.pointed ? 0.5 : 0.22));
  ends.addColorStop(0.1, rgba(p.hull.turned, 0));
  ends.addColorStop(0.78, rgba(p.hull.turned, 0));
  ends.addColorStop(1, rgba(p.hull.turned, 0.62));
  ctx.fillStyle = ends;
  ctx.fill(P(h.outline));
  F(h.waterStain, "#283328", 0.42);
  F(h.railUnder, p.cast, 0.32);
  F(h.railCap, p.rail.side);
  F(h.railTop, p.rail.top);
  // Below the waterline the sea covers the foot: the reflection's dark.
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = linMix(p.hull.under, WATER, 0.45);
  ctx.fillRect(xs - 1, 0, xe - xs + 2, FOOT + 0.1);
  ctx.restore();
  F(h.stem, p.hull.turned, 0.85);

  // Ports and the guns run out through them.
  F(h.ports, p.inside.shadow);
  F(h.portLintels, p.cast, 0.55);
  F(h.portSills, p.rail.top);
  F(h.muzzleShadows, p.cast, 0.5);
  F(h.muzzleRings, p.iron.turned);
  F(h.muzzleFaces, p.iron.side);
  F(h.muzzleBores, "#0c0b0a");
  if (hero) F(h.muzzleGlints, p.glint, 0.5);

  // The rudder and its irons, the tiller, the hawse.
  F(h.rudder, p.hull.side);
  F(h.rudderEdge, p.hull.turned);
  F(h.rudderIrons, p.iron.side);
  F(h.rudderIronTops, p.iron.top);
  F(h.tiller, p.rail.side);
  F(h.hawseRims, p.hull.top);
  F(h.hawse, "#0c0b0a");

  // Channels, chain plates, deadeyes and lanyards.
  F(rg.channelShadows, p.cast, 0.4);
  F(rg.channels, p.hull.side);
  F(rg.channelTops, p.hull.top);
  if (hero) L(rg.chainShadows, p.cast, W.chain, 0.32);
  L(rg.chainPlates, p.iron.side, W.chain, 0.95);
  F(rg.deadeyes, p.rope.shadow);
  if (hero) {
    F(rg.deadeyeGlints, p.rope.top, 0.45);
    L(rg.lanyards, p.running.side, W.lanyards, 0.8);
  }

  // Rigging in front.
  L(rg.shrouds, p.rope.side, W.shrouds, 0.9);
  if (hero) L(rg.ratlines, p.rope.side, W.ratlines, 0.62, "butt");
  L(rg.light, p.rope.side, W.light, 0.85);
  L(rg.heavy, p.rope.side, W.heavy, 0.9);
  L(rg.running, p.running.side, W.running, hero ? 0.62 : 0.45);
  L(rg.gammoning, p.rope.side, W.gammoning, 0.9);

  // The cable into the water ahead; the catted anchor.
  F(rg.cable, p.rope.side);
  F(rg.cableShade, p.rope.under, 0.8);
  if (hero) F(rg.cableGlint, p.rope.top, 0.7);
  F(rg.cathead, p.hull.side);
  F(rg.catheadTop, p.hull.top);
  F(rg.anchorShadow, p.cast, 0.35);
  F(rg.anchor, p.iron.side);
  F(rg.anchorShade, p.iron.under, 0.8);

  // Thole pins on a péniche's gunwale.
  F(f.tholes, p.rail.side);

  // The flags: the tricolour at the stern, the pennant at the masthead.
  for (const flag of art.flags) {
    const frame = flag.frames[0];
    ctx.save();
    ctx.translate(flag.anchor[0], -flag.anchor[1]);
    ctx.scale(-1, 1);
    for (const layer of frame.layers) {
      const which = FLAG_COLOURS[layer.fill.toLowerCase()] ?? "white";
      F(layer.d, p.flag[which], "opacity" in layer ? (layer.opacity ?? 1) : 1);
    }
    if ("shade" in frame) F(frame.shade, p.flag.shade, 0.2);
    ctx.restore();
  }

  // The waterline: the dark line where the hull meets the water, and the
  // water's lighter line against it, broken by the ripples.
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#0f1418";
  ctx.lineWidth = dev(1.5);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(xs + 0.15, 0.01);
  ctx.lineTo(hs.length + 0.05, 0.01);
  ctx.stroke();
  const rng = createRng(seed);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = WATER_LIGHT;
  ctx.lineWidth = dev(1);
  ctx.beginPath();
  for (let x = xs - 0.6; x < hs.length + 0.8; ) {
    const len = 0.4 + rng() * 1.6;
    const y = dev(1.4) + rng() * dev(1.2);
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(hs.length + 0.8, x + len), y);
    x += len + 0.15 + rng() * 0.8;
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ ink

/** Lines across a clip already set, in layer units: straight strokes at an angle, broken. */
function strokesIn(
  c: PlateCanvas,
  box: readonly [number, number, number, number],
  o: {
    angle: number;
    spacing: number;
    width: number;
    colour: string;
    alpha: number;
    seed: number;
    broken?: number;
  },
): void {
  const { ctx } = c;
  const [x0, x1, y0, y1] = box;
  const a = (o.angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2;
  const step = c.pen(o.spacing);
  const rng = createRng(o.seed);
  ctx.globalAlpha = o.alpha;
  ctx.strokeStyle = o.colour;
  ctx.lineWidth = c.pen(o.width);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let s = -half; s <= half; s += step * (0.8 + rng() * 0.4)) {
    let t = -half + rng() * c.pen(6);
    while (t < half) {
      const len = o.broken ? c.pen(o.broken) * (0.5 + rng()) : 2 * half;
      const bx = cx + nx * s + ux * t;
      const by = cy + ny * s + uy * t;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + ux * len, by + uy * len);
      t += len + (o.broken ? c.pen(1.5 + rng() * 3) : 0);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function inkArt(
  c: PlateCanvas,
  art: CraftArt,
  pl: CraftPlace,
  detail: Detail,
  seed: number,
  ext: { x0: number; x1: number; top: number; bottom: number },
  base: DOMMatrix,
  craftT: DOMMatrix,
): void {
  const { ctx } = c;
  const { hull: h, rig: g, rigging: rg, fittings: f, spec } = art;
  const hs = spec.hull;
  const hero = detail === "hero";
  const dev = (px: number) => c.pen(px) / pl.s;
  const fillD = (d: string | undefined, colour: string, alpha = 1) => {
    if (!d) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fill(P(d));
  };
  const line = (
    d: string | undefined,
    colour: string,
    px: number,
    alpha = 1,
    cap: CanvasLineCap = "round",
  ) => {
    if (!d) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = dev(px);
    ctx.lineCap = cap;
    ctx.lineJoin = "round";
    ctx.stroke(P(d));
  };
  /** Hatching inside a craft path, in layer units over the craft's box. */
  const hatchIn = (
    d: string | undefined,
    o: Parameters<typeof strokesIn>[2],
    region?: readonly [number, number, number, number],
  ) => {
    if (!d) return;
    ctx.save();
    ctx.clip(P(d));
    ctx.setTransform(base);
    strokesIn(c, region ?? [ext.x0, ext.x1, ext.bottom, ext.top], o);
    ctx.setTransform(craftT);
    ctx.restore();
  };
  const xs = -hs.sternRake;
  const xe = hs.length + hs.stemRake;

  // Paper behind every solid, so nearer craft hide farther lines.
  ctx.fillStyle = PAPER.low;
  for (const d of [
    h.farInside,
    h.outline,
    h.rudder,
    g.masts,
    g.heads,
    g.spars,
    g.darkSpars,
    g.yards,
    g.canvas,
    g.lugYards,
    g.lugCanvas,
    f.guns,
    f.chimney,
    f.oars,
    f.boat?.hull,
    f.boat?.inside,
  ]) {
    if (d) ctx.fill(P(d));
  }

  // The boat astern.
  if (f.boat) {
    line(f.boat.hull, INK.line, 0.8);
    hatchIn(f.boat.hull, {
      angle: 0,
      spacing: 1.7,
      width: 0.5,
      colour: INK.hatch,
      alpha: 0.85,
      seed: seed + 1,
      broken: 9,
    });
    line(f.boat.painter, INK.hatch, 0.5, 0.8);
  }

  // Masts and spars: contours, the shaded edge as a heavier line.
  line(g.masts, INK.line, 0.85);
  fillD(g.mastShade, INK.line, 0.7);
  fillD(g.mastBands, INK.line, 0.9);
  line(g.heads, INK.line, 0.7);
  fillD(g.headShade, INK.line, 0.6);
  line(g.spars, INK.line, 0.75);
  fillD(g.sparShade, INK.line, 0.6);
  line(g.darkSpars, INK.line, 0.75);
  fillD(g.darkSparShade, INK.line, 0.6);

  // Stays.
  line(rg.stays, INK.line, 0.7, 0.85);
  line(rg.staysLight, INK.hatch, 0.55, 0.85);

  // Yards and the furled canvas, hatched on its shaded underside.
  line(g.yards, INK.line, 0.75);
  fillD(g.yardShade, INK.line, 0.6);
  line(g.canvas, INK.line, 0.7);
  hatchIn(g.canvasLower, {
    angle: 80,
    spacing: 1.6,
    width: 0.45,
    colour: INK.hatch,
    alpha: 0.9,
    seed: seed + 2,
  });
  if (hero) line(g.canvasFolds, INK.hatch, 0.45, 0.8);
  line(g.gaskets, INK.line, 0.55, 0.8, "butt");

  // Inboard: the chimney, the guns, the lowered lug yards, the oars.
  line(f.chimney, INK.line, 0.7);
  line(f.guns, INK.line, 0.75);
  fillD(f.gunShade, INK.line, 0.65);
  line(g.lugYards, INK.line, 0.75);
  line(g.lugCanvas, INK.line, 0.7);
  hatchIn(g.lugCanvasLower, {
    angle: 80,
    spacing: 1.6,
    width: 0.45,
    colour: INK.hatch,
    alpha: 0.9,
    seed: seed + 3,
  });
  line(g.lugGaskets, INK.line, 0.55, 0.8, "butt");
  line(f.oars, INK.line, 0.6);

  // The hull: an open boat's far side, the planking's lines, denser low
  // and toward the ends where the side turns from the light.
  fillD(h.farGunwale, INK.hatch, 0.5);
  ctx.save();
  ctx.clip(P(h.outline));
  if (hero) line(h.seams, INK.hatch, 0.5, 0.8);
  else line(h.seams, INK.hatch, 0.45, 0.55);
  ctx.save();
  ctx.beginPath();
  ctx.rect(xs - 1, -hs.deck * 0.55, xe - xs + 2, hs.deck * 0.55 + 0.05);
  ctx.clip();
  ctx.setTransform(base);
  strokesIn(c, [ext.x0, ext.x1, ext.bottom, ext.top], {
    angle: 0,
    spacing: 1.5,
    width: 0.5,
    colour: INK.hatch,
    alpha: 0.85,
    seed: seed + 4,
    broken: 14,
  });
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(xs - 1, -10, 1.6 + 1, 11);
  ctx.rect(hs.length - 2.4, -10, 4, 11);
  ctx.clip();
  ctx.setTransform(base);
  strokesIn(c, [ext.x0, ext.x1, ext.bottom, ext.top], {
    angle: 74,
    spacing: 1.7,
    width: 0.45,
    colour: INK.hatch,
    alpha: 0.8,
    seed: seed + 5,
  });
  ctx.restore();
  fillD(h.wales, INK.line, 0.85);
  line(h.railCap, INK.line, 0.5, 0.8);
  ctx.restore();

  // The hull's true contours: stem, sheer, stern; cut at the waterline.
  ctx.save();
  ctx.beginPath();
  ctx.rect(xs - 4, -40, xe - xs + 8, 40);
  ctx.clip();
  line(h.outline, INK.line, hero ? 1.4 : 1.1);
  ctx.restore();
  fillD(h.ports, INK.line, 0.95);
  fillD(h.muzzleFaces, INK.line, 0.9);
  line(h.rudder, INK.line, 0.9);
  line(h.tiller, INK.line, 0.6);
  fillD(h.hawse, INK.line);

  // Channels, chain plates, deadeyes.
  line(rg.channels, INK.line, 0.6);
  line(rg.chainPlates, INK.line, 0.55, 0.9);
  fillD(rg.deadeyes, INK.line, 0.9);

  // The rigging in fine lines.
  line(rg.shrouds, INK.line, 0.6, 0.9);
  if (hero) line(rg.ratlines, INK.hatch, 0.4, 0.75, "butt");
  line(rg.light, INK.hatch, 0.5, 0.85);
  line(rg.heavy, INK.line, 0.7, 0.9);
  line(rg.running, INK.hatch, 0.45, hero ? 0.75 : 0.5);
  line(rg.gammoning, INK.line, 0.55, 0.9);

  // The cable, the anchor, thole pins.
  fillD(rg.cable, INK.line, 0.95);
  line(rg.cathead, INK.line, 0.6);
  fillD(rg.anchor, INK.line, 0.9);
  fillD(f.tholes, INK.line, 0.9);

  // The flags: the cloth's contour, the blue hatched close, the red open.
  for (const flag of art.flags) {
    const frame = flag.frames[0];
    ctx.save();
    ctx.translate(flag.anchor[0], -flag.anchor[1]);
    ctx.scale(-1, 1);
    const flagT = ctx.getTransform();
    for (const layer of frame.layers) {
      const which = FLAG_COLOURS[layer.fill.toLowerCase()] ?? "white";
      ctx.fillStyle = PAPER.low;
      ctx.globalAlpha = 1;
      ctx.fill(P(layer.d));
      if (which === "white") continue;
      ctx.save();
      ctx.clip(P(layer.d));
      ctx.setTransform(base);
      strokesIn(c, [ext.x0, ext.x1, ext.bottom, ext.top], {
        angle: which === "blue" ? 90 : 0,
        spacing: which === "blue" ? 1.2 : 1.9,
        width: 0.45,
        colour: INK.line,
        alpha: 0.85,
        seed: seed + 6,
      });
      ctx.setTransform(flagT);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = dev(0.6);
    ctx.stroke(P(frame.outline));
    ctx.restore();
  }

  // The waterline, broken where the ripples lap the side.
  const rng = createRng(seed + 7);
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = INK.line;
  ctx.lineWidth = dev(hero ? 1.2 : 0.9);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let x = xs - 0.4; x < hs.length + 0.6; ) {
    const len = 0.8 + rng() * 2.6;
    const y = rng() * dev(0.8);
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(hs.length + 0.6, x + len), y);
    x += len + 0.1 + rng() * 0.35;
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ jobs

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
    const ext = craftExtent(spec, pl);
    const base = ctx.getTransform();
    ctx.save();
    enter(c, pl, art);
    const craftT = ctx.getTransform();
    const vb = art.viewBox;
    ctx.beginPath();
    const foot = c.mode === "colour" ? FOOT : 0.02;
    ctx.rect(vb.x - 2, vb.y - 2, vb.width + 4, -vb.y + 2 + foot);
    ctx.clip();
    if (c.mode === "colour")
      colourArt(c, art, pl, paletteAt(spec, pl.ahead), detail, seed);
    else inkArt(c, art, pl, detail, seed, ext, base, craftT);
    ctx.restore();
  };
}

/**
 * The reflection: the drawing above the water flipped about the waterline
 * into a scratch canvas, then laid in the plate as horizontal slivers,
 * each shifted a little sideways by the ripples, thinner and more broken
 * toward the craft, fading as the water nearer the eye reflects less. In
 * the engraving: broken horizontal strokes inside the flipped shapes.
 * Two jobs: the shapes, then the slivers. `bottom`: where to stop (layer
 * units, the frame's lowest reach).
 */
export function reflectionJobs(
  spec: CraftSpec,
  pl: CraftPlace,
  seed: number,
  bottom = Number.NEGATIVE_INFINITY,
): PlateJob[] {
  let scratch: HTMLCanvasElement | null = null;
  let region: [number, number, number, number] = [0, 0, 0, 0];
  const shapes: PlateJob = (c) => {
    const art = buildCraftArt(spec);
    const ext = craftExtent(spec, pl);
    const reach = Math.max(bottom, pl.y - (ext.top - pl.y) * 1.02);
    const top = pl.y + pl.s * 0.05;
    region = [ext.x0 - 3, ext.x1 + 3, reach, top];
    const [x0, x1, y0, y1] = region;
    const w = Math.max(1, Math.ceil((x1 - x0) * c.k));
    const hgt = Math.max(1, Math.ceil((y1 - y0) * c.k));
    scratch = document.createElement("canvas");
    scratch.width = w;
    scratch.height = hgt;
    const sctx = scratch.getContext("2d");
    if (!sctx) return;
    sctx.setTransform(c.k, 0, 0, -c.k, -x0 * c.k, y1 * c.k);
    const sc: PlateCanvas = { ...c, ctx: sctx, box: [x0, x1, y0, y1] };
    sctx.save();
    enter(sc, pl, art, true);
    const vb = art.viewBox;
    sctx.beginPath();
    sctx.rect(vb.x - 2, vb.y - 2, vb.width + 4, -vb.y + 2);
    sctx.clip();
    const r = art.reflection;
    if (c.mode === "colour") {
      const p = paletteAt(spec, pl.ahead);
      const tone = (hex: string, t: number) => linMix(hex, WATER, t);
      sctx.fillStyle = tone(p.canvas.side, 0.5);
      sctx.fill(P(r.canvas));
      sctx.fillStyle = tone(p.spar.under, 0.3);
      sctx.fill(P(r.spars));
      sctx.fillStyle = tone(p.flag.red, 0.5);
      sctx.fill(P(r.flags));
      sctx.fillStyle = tone(linMix(p.hull.side, p.hull.under, 0.5), 0.3);
      sctx.fill(P(r.hull));
      // Thin lines of the rigging, faint.
      sctx.globalAlpha = 0.35;
      sctx.strokeStyle = tone(p.rope.side, 0.3);
      sctx.lineWidth = c.pen(0.8) / pl.s;
      sctx.stroke(P(art.rigging.shrouds));
      sctx.stroke(P(art.rigging.stays));
      sctx.globalAlpha = 1;
      sctx.restore();
    } else {
      // A mask of the shapes, then broken strokes kept only inside it.
      sctx.fillStyle = "#000";
      for (const d of [r.canvas, r.spars, r.flags, r.hull]) sctx.fill(P(d));
      sctx.restore();
      sctx.globalCompositeOperation = "source-in";
      const rng = createRng(seed + 11);
      sctx.strokeStyle = INK.hatch;
      sctx.lineCap = "round";
      let y = y1 - c.pen(0.6);
      let i = 0;
      while (y > y0) {
        const depth = y1 - y;
        sctx.lineWidth = c.pen(depth < 6 ? 0.9 : 0.7);
        sctx.beginPath();
        let x = x0 + rng() * c.pen(5);
        while (x < x1) {
          const len = c.pen(3 + rng() * (depth < 6 ? 14 : 8));
          sctx.moveTo(x, y);
          sctx.lineTo(x + len, y);
          x += len + c.pen(1.5 + rng() * (2 + depth * 0.05));
        }
        sctx.stroke();
        y -= c.pen(1.6 + Math.min(3.2, depth * 0.03) + rng() * 0.6);
        i++;
      }
      sctx.globalCompositeOperation = "source-over";
    }
  };
  const slivers: PlateJob = (c) => {
    const src = scratch;
    if (!src) return;
    const { ctx } = c;
    const [x0, x1, y0, y1] = region;
    const w = x1 - x0;
    if (c.mode === "ink") {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(src, x0, y0, w, y1 - y0);
      ctx.globalAlpha = 1;
      scratch = null;
      return;
    }
    // drawImage maps the scratch's rows top-down: flip the y axis for it.
    const rng = createRng(seed + 13);
    const total = y1 - y0;
    const px = (u: number) => u * c.k;
    let d = 0;
    while (d < total) {
      const band = Math.min(total - d, 0.8 + d * 0.045 + rng() * 0.7);
      const gap = d < 1.2 ? 0 : (0.15 + d * 0.012) * (0.3 + rng());
      const shift = (rng() - 0.5) * (0.4 + d * 0.035);
      const fade = Math.max(0.18, 1 - (d / total) * 0.75);
      ctx.globalAlpha = 0.95 * fade;
      ctx.save();
      ctx.translate(0, y1 - d);
      ctx.scale(1, -1);
      ctx.drawImage(
        src,
        0,
        px(d),
        Math.max(1, src.width),
        Math.max(1, px(band)),
        x0 + shift,
        0,
        w,
        band,
      );
      ctx.restore();
      d += band + gap;
    }
    ctx.globalAlpha = 1;
    scratch = null;
  };
  return [shapes, slivers];
}
