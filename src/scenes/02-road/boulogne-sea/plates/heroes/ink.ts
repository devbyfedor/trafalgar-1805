import type { CraftArt } from "@/components/ship/craft/geometry/index";
import {
  railAt,
  sheerLine,
  stemX,
  sternX,
} from "@/components/ship/craft/geometry/shapes";
import { forkRng, type Rng } from "@/lib/random";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { type CraftPlace, type Detail, P } from "./common";
import { seamLines } from "./hull-colour";

/**
 * A craft engraved (paint/plate.ts, the "ink" raster): the same craft in
 * the chart's inks on paper, as a line engraver of the period would cut
 * it. In the colour's paint order, each part backed with paper before its
 * lines, so the bulwark hides a mast's foot and a nearer craft a farther
 * one's lines. The hull: its true contour (stern, sheer, stem; never the
 * cut along the water), the planking in lines that follow the sheer, the
 * tone of the lower body where it turns under in more lines between them,
 * the bow and the quarter, turned from the light, hatched along their
 * curves, the black wales dark, the ports cut deep. The masts and spars
 * contoured with their shaded side toned; the furled canvas outlined and
 * hatched across its roll underneath; the rigging in fine lines; the
 * waterline broken where the water laps the side. Lighter and sparser
 * with distance.
 */

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const BOXES = new Map<string, [number, number, number, number]>();

/** The box of SVG path data (craft metres, y down): x0, x1, y0, y1. */
function boxOf(d: string): [number, number, number, number] | null {
  if (!d) return null;
  let b = BOXES.get(d);
  if (!b) {
    const v = d.match(NUM) ?? [];
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    for (let i = 0; i + 1 < v.length; i += 2) {
      const x = Number(v[i]);
      const y = Number(v[i + 1]);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    b = [x0, x1, y0, y1];
    BOXES.set(d, b);
  }
  return Number.isFinite(b[0]) ? b : null;
}

/** Parallel strokes across a box (craft metres), into the current path; the caller clips and strokes. */
function strokesAcross(
  ctx: CanvasRenderingContext2D,
  box: readonly [number, number, number, number],
  angle: number,
  spacing: number,
  rng: Rng,
  dash = 0,
): void {
  const [x0, x1, y0, y1] = box;
  const a = (angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const half = Math.hypot(x1 - x0, y1 - y0) / 2;
  for (let s = -half; s <= half; s += spacing * (0.8 + rng() * 0.4)) {
    if (!dash) {
      ctx.moveTo(cx + nx * s - ux * half, cy + ny * s - uy * half);
      ctx.lineTo(cx + nx * s + ux * half, cy + ny * s + uy * half);
      continue;
    }
    let t = -half + rng() * dash;
    while (t < half) {
      const len = dash * (0.5 + rng());
      ctx.moveTo(cx + nx * s + ux * t, cy + ny * s + uy * t);
      ctx.lineTo(cx + nx * s + ux * (t + len), cy + ny * s + uy * (t + len));
      t += len + dash * (0.15 + rng() * 0.3);
    }
  }
}

/** A line along y = f(x) (a height above the water), broken here and there as a graver's line is, into the current path. */
function along(
  ctx: CanvasRenderingContext2D,
  a: number,
  b: number,
  f: (x: number) => number,
  rng: Rng,
  dash: number,
  gap: number,
): void {
  let x = a + rng() * dash * 0.3;
  while (x < b) {
    const len = dash * (0.45 + rng() * 0.9);
    const end = Math.min(b, x + len);
    const n = Math.max(2, Math.ceil((end - x) / 0.6));
    for (let i = 0; i <= n; i++) {
      const px = x + ((end - x) * i) / n;
      if (i === 0) ctx.moveTo(px, -f(px));
      else ctx.lineTo(px, -f(px));
    }
    x = end + gap * (0.4 + rng() * 1.2);
  }
}

export function inkArt(
  c: PlateCanvas,
  art: CraftArt,
  pl: CraftPlace,
  detail: Detail,
  seed: number,
  flags: () => void,
): void {
  const { ctx } = c;
  const { hull: h, rig: g, rigging: rg, fittings: f, spec } = art;
  const hs = spec.hull;
  const hero = detail === "hero";
  // Lighter and sparser with distance: about 1 at 80 m, 0.7 at 350 m.
  const wgt = Math.max(0.6, Math.min(1, 1.1 - pl.ahead / 1000));
  const dev = (px: number) => c.pen(px * wgt) / pl.s;
  const rng = forkRng(seed, "ink");
  const paper = (...ds: (string | undefined)[]) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER.low;
    for (const d of ds) if (d) ctx.fill(P(d));
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
  const tone = (
    d: string | undefined,
    alpha: number,
    colour: string = INK.hatch,
  ) => {
    if (!d) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fill(P(d));
  };
  /** Strokes across a part, clipped to it, over its own box only. */
  const hatch = (
    d: string | undefined,
    angle: number,
    spacingPx: number,
    px: number,
    alpha: number,
    dash = 0,
  ) => {
    const box = d ? boxOf(d) : null;
    if (!d || !box) return;
    ctx.save();
    ctx.clip(P(d));
    ctx.beginPath();
    strokesAcross(ctx, box, angle, dev(spacingPx), rng, dash);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = INK.hatch;
    ctx.lineWidth = dev(px);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  };
  const xs = -hs.sternRake;
  const xe = hs.length + hs.stemRake;
  /** Contours of a part that stands in the water: cut short of the waterline. */
  const aboveWater = (draw: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(xs - 30, -60, xe - xs + 60, 60 - dev(1.2));
    ctx.clip();
    draw();
    ctx.restore();
  };

  // An open boat's far side, seen over the near gunwale.
  paper(h.farInside);
  line(h.farGunwale, INK.line, 0.6, 0.8);

  // The boat astern: paper, her sheer and ends, her side hatched along.
  if (f.boat) {
    paper(f.boat.inside, f.boat.hull);
    aboveWater(() => line(f.boat?.hull, INK.line, 0.85));
    hatch(f.boat.hull, 0, 1.8, 0.45, 0.8, dev(9));
    line(f.boat.strake, INK.line, 0.5, 0.8);
    line(f.boat.painter, INK.hatch, 0.5, 0.8);
  }

  // The flags, behind the masts and the rigging.
  flags();

  // Masts, spars, their heads and tops: contoured, the side from the sun toned.
  paper(g.masts, g.heads, g.spars, g.darkSpars);
  line(g.masts, INK.line, 0.7);
  tone(g.mastShade, 0.6);
  tone(g.mastBands, 0.85, INK.line);
  line(g.heads, INK.line, 0.65);
  tone(g.headShade, 0.75, INK.line);
  line(g.spars, INK.line, 0.7);
  tone(g.sparShade, 0.55);
  line(g.darkSpars, INK.line, 0.7);
  tone(g.darkSparShade, 0.7, INK.line);

  // Stays, behind the yards.
  line(rg.stays, INK.line, 0.6, 0.85);
  line(rg.staysLight, INK.hatch, 0.5, 0.85);

  // Yards and the canvas furled on them: the roll outlined, hatched across
  // underneath where it turns from the light, the gaskets.
  paper(g.yards, g.canvas);
  line(g.yards, INK.line, 0.65);
  tone(g.yardShade, 0.7, INK.line);
  line(g.canvas, INK.line, 0.55, 0.9);
  hatch(g.canvasLower, 90, hero ? 1.5 : 1.9, 0.42, 0.85);
  if (hero) line(g.canvasFolds, INK.hatch, 0.4, 0.7);
  line(g.gaskets, INK.line, 0.5, 0.8, "butt");

  // Inboard: the chimney, the guns on their slides, the lowered lug yards
  // and their rolled sails, the oars.
  paper(f.chimney, f.gunSlides, f.guns, g.lugYards, g.lugCanvas, f.oars);
  line(f.chimney, INK.line, 0.6);
  tone(f.chimneyShade, 0.6);
  line(f.gunSlides, INK.hatch, 0.5, 0.8);
  line(f.guns, INK.line, 0.65);
  tone(f.gunShade, 0.7, INK.line);
  line(g.lugYards, INK.line, 0.65);
  tone(g.lugYardShade, 0.6, INK.line);
  line(g.lugCanvas, INK.line, 0.55, 0.9);
  hatch(g.lugCanvasLower, 90, hero ? 1.5 : 1.9, 0.42, 0.85);
  line(g.lugGaskets, INK.line, 0.5, 0.8, "butt");
  line(f.oars, INK.line, 0.5, 0.8);

  // The hull, paper over everything behind it.
  paper(h.outline, h.rudder);
  ctx.save();
  ctx.clip(P(h.outline));
  const seams = seamLines(hs);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The planking: a line along each seam, the sheer kept.
  ctx.beginPath();
  for (const s of seams) along(ctx, xs, xe, s, rng, hero ? 3 : 5, 0.18);
  ctx.globalAlpha = hero ? 0.8 : 0.6;
  ctx.strokeStyle = INK.hatch;
  ctx.lineWidth = dev(0.45);
  ctx.stroke();
  // The lower body turning under from the light: lines between the seams,
  // more of them the nearer the water.
  ctx.beginPath();
  for (let j = 0; j + 1 < seams.length; j++) {
    const a = seams[j];
    const b = seams[j + 1];
    const mid = (a(hs.length / 2) + b(hs.length / 2)) / 2;
    const share = mid / Math.max(0.2, hs.deck);
    const ts = share < 0.3 ? [0.33, 0.67] : share < 0.62 ? [0.5] : [];
    if (!hero && ts.length) ts.splice(0, ts.length - 1);
    for (const t of ts)
      along(ctx, xs, xe, (x) => a(x) * (1 - t) + b(x) * t, rng, 1.6, 0.35);
  }
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = dev(0.4);
  ctx.stroke();
  // The bow and the quarter, turned from the sun: strokes along their
  // curves, closer and longer toward the very end.
  ctx.beginPath();
  const bowReach = hs.pointed ? 1.6 : 1.3;
  for (let d = dev(1.6); d < bowReach; d += dev(1.7) * (1 + d * 0.9)) {
    const top = Math.min(hs.rail[2] - hs.railCap, hs.rail[2] * (1 - d * 0.35));
    const y0 = 0.04;
    ctx.moveTo(stemX(hs, y0) - d, -y0);
    for (let i = 1; i <= 8; i++) {
      const y = y0 + ((top - y0) * i) / 8;
      ctx.lineTo(stemX(hs, y) - d, -y);
    }
  }
  const sternReach = hs.pointed ? 1.2 : 0.7;
  for (let d = dev(1.8); d < sternReach; d += dev(1.9) * (1 + d * 1.2)) {
    const top = Math.min(hs.rail[0] - hs.railCap, hs.rail[0] * (1 - d * 0.5));
    const y0 = 0.04;
    ctx.moveTo(sternX(hs, y0) + d, -y0);
    for (let i = 1; i <= 6; i++) {
      const y = y0 + ((top - y0) * i) / 6;
      ctx.lineTo(sternX(hs, y) + d, -y);
    }
  }
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = dev(0.42);
  ctx.stroke();
  // The wales, black with tar: close lines along them; the rail cap's
  // lower edge.
  tone(h.wales, 0.3, INK.line);
  ctx.beginPath();
  for (const w of hs.wales) {
    const n = Math.max(2, Math.round(w.height / dev(1.25)));
    for (let i = 0; i <= n; i++) {
      const drop = w.drop + (w.height * i) / n;
      along(ctx, xs, xe, (x) => sheerLine(hs, drop, w.sheer, x), rng, 4, 0.06);
    }
  }
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = INK.line;
  ctx.lineWidth = dev(0.5);
  ctx.stroke();
  ctx.strokeStyle = INK.hatch;
  ctx.beginPath();
  for (const w of hs.wales) {
    const bot = (x: number) =>
      sheerLine(hs, w.drop + w.height, w.sheer, x) - dev(1.3);
    along(ctx, xs, xe, bot, rng, 2.4, 0.2);
  }
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = dev(0.4);
  ctx.stroke();
  ctx.beginPath();
  along(ctx, xs, xe, (x) => railAt(hs, x) - hs.railCap, rng, 6, 0.08);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = INK.line;
  ctx.lineWidth = dev(0.55);
  ctx.stroke();
  ctx.restore();

  // The hull's true contour: up the stern, along the sheer, down the stem;
  // never the cut along the water.
  aboveWater(() => {
    line(h.outline, INK.line, hero ? 1.35 : 1.05);
    line(h.rudder, INK.line, 0.8);
  });
  hatch(h.rudder, 90, 1.6, 0.4, 0.75);
  tone(h.ports, 0.95, INK.line);
  tone(h.muzzleFaces, 0.9, INK.line);
  line(h.tiller, INK.line, 0.55);
  tone(h.hawse, 1, INK.line);
  line(h.hawseRims, INK.line, 0.4, 0.8);

  // Channels, chain plates, deadeyes.
  paper(rg.channels);
  line(rg.channels, INK.line, 0.55);
  line(rg.chainPlates, INK.line, 0.5, 0.9);
  tone(rg.deadeyes, 0.9, INK.line);
  if (hero) line(rg.lanyards, INK.hatch, 0.35, 0.7);

  // The rigging in fine lines.
  line(rg.shrouds, INK.line, 0.55, 0.9);
  if (hero) line(rg.ratlines, INK.hatch, 0.35, 0.7, "butt");
  line(rg.light, INK.hatch, 0.45, 0.85);
  line(rg.heavy, INK.line, 0.6, 0.9);
  line(rg.running, INK.hatch, 0.4, hero ? 0.75 : 0.5);
  line(rg.gammoning, INK.line, 0.5, 0.9);

  // The cable down into the water, the catted anchor, thole pins.
  tone(rg.cable, 0.9, INK.line);
  paper(rg.cathead);
  line(rg.cathead, INK.line, 0.55);
  tone(rg.anchor, 0.88, INK.line);
  tone(f.tholes, 0.9, INK.line);

  // The waterline, broken where the ripples lap the side, and a few short
  // strokes of the water lapping.
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = INK.line;
  ctx.lineCap = "round";
  ctx.lineWidth = dev(hero ? 1.15 : 0.9);
  ctx.beginPath();
  for (let x = sternX(hs, 0) - 0.2; x < stemX(hs, 0) + 0.3; ) {
    const len = 0.7 + rng() * 2.6;
    const y = rng() * dev(0.7);
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(stemX(hs, 0) + 0.3, x + len), y);
    x += len + 0.08 + rng() * 0.35;
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
