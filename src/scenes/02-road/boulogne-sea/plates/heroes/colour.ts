import type { CraftArt } from "@/components/ship/craft/geometry/index";
import type { CraftPalette } from "@/components/ship/craft/light";
import type { PlateCanvas } from "../../paint/plate";
import { type CraftPlace, type Detail, P } from "./common";
import { paintHullSide, paintWaterline } from "./hull-colour";

/**
 * A craft in colour (paint/plate.ts, the "colour" raster): the craft
 * module's drawing in the evening light of its palette (light.ts: the sun
 * low behind the eye, a little to the left, so the side toward the eye is
 * lit warm and square-on), in Craft.tsx's paint order, inside the craft's
 * own space (common.ts, enter).
 */

export function colourArt(
  c: PlateCanvas,
  art: CraftArt,
  pl: CraftPlace,
  p: CraftPalette,
  detail: Detail,
  seed: number,
  flags: () => void,
  /** Drawn for its reflection: no waterline, no sea over the foot. */
  mirror = false,
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

  // The flags, hanging away from the eye behind the masts and the rigging.
  flags();

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

  // The hull's side, plank by plank, in the evening sun.
  paintHullSide(ctx, art, p, hero, dev, mirror);

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

  if (mirror) {
    ctx.globalAlpha = 1;
    return;
  }
  paintWaterline(ctx, art, dev, hero, seed);
  ctx.globalAlpha = 1;
}
