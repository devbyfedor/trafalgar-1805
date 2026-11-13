import type { CraftArt } from "@/components/ship/craft/geometry/index";
import { createRng } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { type CraftPlace, type Detail, P } from "./common";

/**
 * A craft engraved (paint/plate.ts, the "ink" raster): the same craft in
 * the chart's inks on paper. Every solid backed with paper first, so a
 * nearer craft hides a farther one's lines; then the contours where they
 * matter, the planking's lines, the hatching of the shade, the rig in
 * fine lines.
 */

/** Lines across a clip already set, in layer units: straight strokes at an angle, broken. */
export function strokesIn(
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

export function inkArt(
  c: PlateCanvas,
  art: CraftArt,
  pl: CraftPlace,
  detail: Detail,
  seed: number,
  ext: { x0: number; x1: number; top: number; bottom: number },
  base: DOMMatrix,
  craftT: DOMMatrix,
  flags: () => void,
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
  /** Layer units of a box given in the craft's metres (y up from the waterline). */
  const boxOf = (
    mx0: number,
    mx1: number,
    my0: number,
    my1: number,
  ): [number, number, number, number] => {
    const sx = pl.bowLeft ? -pl.s : pl.s;
    const a = pl.x + sx * (mx0 - art.midX);
    const b = pl.x + sx * (mx1 - art.midX);
    return [
      Math.min(a, b),
      Math.max(a, b),
      pl.y + pl.s * my0,
      pl.y + pl.s * my1,
    ];
  };

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

  // The flags, behind the masts and the rigging.
  flags();

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
  strokesIn(c, boxOf(xs - 1, xe + 1, -0.1, hs.deck * 0.6), {
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
  strokesIn(c, boxOf(xs - 1, xe + 1, -0.1, Math.max(...hs.rail) + 0.6), {
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
