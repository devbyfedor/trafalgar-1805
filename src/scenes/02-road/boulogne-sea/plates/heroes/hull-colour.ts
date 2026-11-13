import type { CraftArt } from "@/components/ship/craft/geometry/index";
import {
  deckAt,
  railAt,
  sheerLine,
  stemX,
  sternX,
} from "@/components/ship/craft/geometry/shapes";
import {
  type CraftPalette,
  mix as linMix,
} from "@/components/ship/craft/light";
import type { CraftHullSpec } from "@/components/ship/craft/types";
import { forkRng } from "@/lib/random";
import { rgba } from "../../paint/kit";
import { FOOT, P, WATER, WATER_LIGHT } from "./common";

/**
 * A tarred hull's side in the evening sun, square-on to the eye and the
 * sun alike (scene 1's Victory is the bar: planking, wales, seams, the
 * weather on them). Drawn in the craft's own space (metres, SVG's y down:
 * a height `up` is drawn at y = -up), clipped to the hull's outline.
 *
 * The side is plank by plank: each strake its own tone (the tar renewed on
 * some, salt-bleached and greyed on others), uneven along its length; each
 * seam a dark line of pitch with the next plank's edge catching the light
 * under it; the wales standing proud, nearly black with fresh tar, their
 * rounded tops lit gold and their shadows cast on the planks below; a warm
 * sheen of the low sun along the topsides; rust run from the chain plates,
 * tar run from the scuppers, scuffs where boats lie alongside, weed and
 * wet at the water. Then the waterline: the dark line where the hull meets
 * the water, the water's lit edge against it, a ripple at the stem where
 * the stream runs past.
 */

/** A seam line under the rail (hull.ts's planking): its height at x. */
export function seamLines(h: CraftHullSpec): ((x: number) => number)[] {
  const low = h.rail[1];
  const keel = low + h.draught;
  const out: ((x: number) => number)[] = [];
  for (
    let s = h.railCap + h.strake;
    s < low + h.depthShown + 0.3;
    s += h.strake
  ) {
    const k = Math.max(0, 1 - s / keel);
    out.push((x: number) => low - s + (railAt(h, x) - low) * k);
  }
  return out;
}

/** Points of y = f(x) from a to b, as the craft's space draws them (y down). */
function along(
  a: number,
  b: number,
  f: (x: number) => number,
  n = 36,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    pts.push([x, -f(x)]);
  }
  return pts;
}

function band(
  ctx: CanvasRenderingContext2D,
  a: number,
  b: number,
  top: (x: number) => number,
  bottom: (x: number) => number,
): void {
  const up = along(a, b, top);
  const down = along(a, b, bottom).reverse();
  ctx.beginPath();
  ctx.moveTo(up[0][0], up[0][1]);
  for (const [x, y] of up) ctx.lineTo(x, y);
  for (const [x, y] of down) ctx.lineTo(x, y);
  ctx.closePath();
}

function stroke(
  ctx: CanvasRenderingContext2D,
  a: number,
  b: number,
  f: (x: number) => number,
): void {
  const pts = along(a, b, f);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y);
}

const SALT = "#8d877c";
const TAR = "#120f0c";
const RUST = "#7d4f2e";
const GOLD = "#d9ab72";

export function paintHullSide(
  ctx: CanvasRenderingContext2D,
  art: CraftArt,
  p: CraftPalette,
  hero: boolean,
  dev: (px: number) => number,
  mirror: boolean,
): void {
  const { hull: h, spec } = art;
  const hs = spec.hull;
  const xs = -hs.sternRake - 0.2;
  const xe = hs.length + hs.stemRake + 0.2;
  const rng = forkRng(spec.seed, "paint:hull");
  const seams = seamLines(hs);

  ctx.globalAlpha = 1;
  ctx.fillStyle = p.hull.side;
  ctx.fill(P(h.outline));
  ctx.save();
  ctx.clip(P(h.outline));

  // Plank by plank: each strake its own tone, uneven along its length.
  const rail = (x: number) => railAt(hs, x) - hs.railCap;
  const lines = [rail, ...seams];
  for (let j = 0; j + 1 < lines.length; j++) {
    const t = rng();
    const base =
      t < 0.16
        ? linMix(p.hull.side, SALT, 0.13 + rng() * 0.08)
        : t > 0.88
          ? linMix(p.hull.side, TAR, 0.2 + rng() * 0.1)
          : linMix(p.hull.side, j % 2 ? p.hull.low : p.hull.top, 0.06 * rng());
    const g = ctx.createLinearGradient(xs, 0, xe, 0);
    const stops = 4 + Math.floor(rng() * 3);
    for (let s = 0; s <= stops; s++) {
      const w = rng();
      const tone =
        w < 0.3
          ? linMix(base, SALT, 0.08 * rng())
          : w > 0.8
            ? linMix(base, TAR, 0.12 * rng())
            : base;
      g.addColorStop(s / stops, tone);
    }
    ctx.fillStyle = g;
    band(ctx, xs, xe, lines[j], lines[j + 1]);
    ctx.fill();
  }

  // The bottom under its boot-top, darkened by the sea.
  ctx.fillStyle = p.bottom.low;
  ctx.fill(P(h.bottom));

  // Seams: pitch, and the plank's edge under it catching the light.
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(GOLD, 1);
  ctx.globalAlpha = hero ? 0.11 : 0.07;
  ctx.lineWidth = dev(0.7);
  ctx.beginPath();
  const lip = dev(0.8);
  for (const f of seams) stroke(ctx, xs, xe, (x) => f(x) - lip);
  ctx.stroke();
  ctx.strokeStyle = p.hull.shadow;
  ctx.globalAlpha = hero ? 0.62 : 0.4;
  ctx.lineWidth = dev(hero ? 0.65 : 0.55);
  ctx.beginPath();
  for (const f of seams) stroke(ctx, xs, xe, f);
  ctx.stroke();
  if (hero) {
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = dev(0.5);
    ctx.stroke(P(h.butts));
  }

  // Salt-bleached patches on the topsides, tar run from the scuppers.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = SALT;
  ctx.fill(P(h.faded));
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = TAR;
  ctx.fill(P(h.streaks));

  // Rust run from the chain plates' feet.
  if (hero) {
    const r2 = forkRng(spec.seed, "paint:rust");
    ctx.strokeStyle = RUST;
    ctx.lineCap = "round";
    for (const m of spec.masts) {
      if (!m.channel) continue;
      for (const dx of m.shrouds) {
        const x = m.x + dx + (r2() - 0.5) * 0.08;
        const top = railAt(hs, x) - hs.railCap - 1.0;
        const len = 0.3 + r2() * 0.7;
        ctx.globalAlpha = 0.18 + r2() * 0.12;
        ctx.lineWidth = Math.max(dev(0.8), 0.035 + r2() * 0.03);
        ctx.beginPath();
        ctx.moveTo(x, -top);
        ctx.lineTo(x + (r2() - 0.5) * 0.05, -(top - len));
        ctx.stroke();
      }
    }
  }

  // Wales, proud and freshly tarred: their shadow on the planks below, the
  // face, the rounded top lit gold.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = p.cast;
  for (const w of hs.wales) {
    const bot = (x: number) => sheerLine(hs, w.drop + w.height, w.sheer, x);
    band(ctx, xs, xe, bot, (x) => bot(x) - Math.min(0.07, w.height * 0.45));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = linMix(p.wale.side, TAR, 0.25);
  ctx.fill(P(h.wales));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = p.wale.under;
  ctx.fill(P(h.waleUnders));
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = dev(hero ? 0.9 : 0.7);
  ctx.globalAlpha = hero ? 0.5 : 0.35;
  ctx.beginPath();
  for (const w of hs.wales) {
    const top = (x: number) =>
      sheerLine(hs, w.drop, w.sheer, x) - Math.min(0.02, w.height * 0.12);
    stroke(ctx, xs, xe, top);
  }
  ctx.stroke();

  // A warm sheen of the low sun along the topsides.
  const sheen = [0.12, 0.2, 0.3, 0.42, 0.56];
  ctx.fillStyle = GOLD;
  for (let i = 0; i + 1 < sheen.length; i++) {
    ctx.globalAlpha = [0.025, 0.045, 0.04, 0.02][i];
    band(
      ctx,
      xs,
      xe,
      (x) => railAt(hs, x) - sheen[i],
      (x) => railAt(hs, x) - sheen[i + 1],
    );
    ctx.fill();
  }

  // The side darkens toward the water, where it curves in and sees the sea.
  const low = ctx.createLinearGradient(0, -(hs.deck + 0.2), 0, 0.1);
  low.addColorStop(0, rgba(p.hull.low, 0));
  low.addColorStop(0.55, rgba(p.hull.low, 0.3));
  low.addColorStop(1, rgba(p.hull.under, 0.78));
  ctx.globalAlpha = 1;
  ctx.fillStyle = low;
  ctx.fill(P(h.outline));
  // The bow turns away from the sun; the stern's quarter less so.
  const ends = ctx.createLinearGradient(xs, 0, xe, 0);
  ends.addColorStop(0, rgba(p.hull.turned, hs.pointed ? 0.5 : 0.24));
  ends.addColorStop(0.09, rgba(p.hull.turned, 0));
  ends.addColorStop(0.8, rgba(p.hull.turned, 0));
  ends.addColorStop(1, rgba(p.hull.turned, 0.6));
  ctx.fillStyle = ends;
  ctx.fill(P(h.outline));

  // Scuffs where boats lie alongside, and the weed and wet at the water.
  if (hero) {
    const r3 = forkRng(spec.seed, "paint:scuffs");
    ctx.strokeStyle = SALT;
    ctx.lineCap = "round";
    ctx.lineWidth = dev(0.7);
    ctx.beginPath();
    for (let i = 0; i < Math.round(hs.length / 3); i++) {
      const x = 1 + r3() * (hs.length - 2);
      const y = 0.25 + r3() * Math.max(0.2, deckAt(hs, x) - 0.5);
      const len = 0.25 + r3() * 0.7;
      ctx.moveTo(x, -y);
      ctx.lineTo(x + len, -(y + (r3() - 0.5) * 0.04));
    }
    ctx.globalAlpha = 0.2;
    ctx.stroke();
  }
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#26302a";
  ctx.fill(P(h.waterStain));
  if (!mirror) {
    // The wet band just over the water, and the sky's light on it.
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.hull.under;
    ctx.fillRect(xs, -0.09, xe - xs, 0.09);
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = WATER_LIGHT;
    ctx.lineWidth = dev(0.7);
    ctx.beginPath();
    ctx.moveTo(xs, -0.06);
    ctx.lineTo(xe, -0.06);
    ctx.stroke();
  }

  // The rail cap: its shadow on the side, the cap, its lit top.
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = p.cast;
  ctx.fill(P(h.railUnder));
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.rail.side;
  ctx.fill(P(h.railCap));
  ctx.fillStyle = p.rail.top;
  ctx.fill(P(h.railTop));
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = hero ? 0.55 : 0.35;
  ctx.lineWidth = dev(0.7);
  ctx.beginPath();
  stroke(ctx, xs, xe, (x) => railAt(hs, x) - hs.railCap * 0.45);
  ctx.stroke();

  // Below the waterline the sea covers the foot: the reflection's dark.
  if (!mirror) {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = linMix(p.hull.under, WATER, 0.45);
    ctx.fillRect(xs - 1, 0, xe - xs + 2, FOOT + 0.1);
  }
  ctx.restore();

  // The stem's edge, turned from the sun, its face lit along the cutwater.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = p.hull.turned;
  ctx.fill(P(h.stem));
  if (hero) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = dev(0.7);
    ctx.beginPath();
    const top = hs.rail[2] + (hs.stemHead ?? 0);
    for (let i = 0; i <= 12; i++) {
      const y = 0.08 + ((top - 0.12) * i) / 12;
      const x = stemX(hs, Math.min(y, hs.rail[2])) - 0.05;
      if (i === 0) ctx.moveTo(x, -y);
      else ctx.lineTo(x, -y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * The waterline: the dark line where the hull meets the water, the water's
 * lit edge against it broken by the ripples, and a ripple at the stem where
 * the stream runs past (the craft lie head to it).
 */
export function paintWaterline(
  ctx: CanvasRenderingContext2D,
  art: CraftArt,
  dev: (px: number) => number,
  hero: boolean,
  seed: number,
): void {
  const hs = art.spec.hull;
  const x0 = sternX(hs, 0) - 0.05;
  const x1 = stemX(hs, 0) + 0.05;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = "#0c1115";
  ctx.lineWidth = dev(hero ? 1.6 : 1.2);
  ctx.beginPath();
  ctx.moveTo(x0 + 0.1, 0.01);
  ctx.lineTo(x1 - 0.1, 0.01);
  ctx.stroke();
  const rng = forkRng(seed, "paint:waterline");
  ctx.globalAlpha = hero ? 0.55 : 0.45;
  ctx.strokeStyle = WATER_LIGHT;
  ctx.lineWidth = dev(1);
  ctx.beginPath();
  for (let x = x0 - 0.5; x < x1 + 0.6; ) {
    const len = 0.3 + rng() * 1.5;
    const y = dev(1.5) + rng() * dev(1.4);
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(x1 + 0.6, x + len), y);
    x += len + 0.12 + rng() * 0.7;
  }
  ctx.stroke();
  if (!hero) return;
  // The stream curling at the stem: a few short lit crescents ahead of it.
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = dev(0.9);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = x1 + 0.1 + i * 0.35 + rng() * 0.15;
    const y = dev(1.2) + i * dev(1.6);
    ctx.moveTo(x - 0.3, y + dev(0.6));
    ctx.quadraticCurveTo(x, y - dev(0.8), x + 0.35 + i * 0.1, y + dev(0.5));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
