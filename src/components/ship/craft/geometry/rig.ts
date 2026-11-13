import { forkRng } from "@/lib/random";
import { type PathBuilder, path } from "../../geometry/path";
import { deg, lerp, type Vec } from "../../geometry/vec";
import type { CraftSpec, MastSpec, RigPoint } from "../types";
import { drawRoll, roll } from "./roll";
import { railAt, strip, taper, yardDiameter, yardShape } from "./shapes";

/**
 * Masts, spars and the canvas furled on them. The masts, tops, caps,
 * crosstrees, yards, bowsprit, jib-boom, gaff and boom stand where
 * smallcraft.ts puts them, with the same offsets and diameters; yards are
 * drawn face-on, foreshortened by the same 0.64 as scene 1's ships and the
 * glyphs. On them: the square sails furled (a harbour furl, the bunt
 * gathered in the middle), a gaff sail brailed in to its mast and gaff,
 * the headsails stowed, a lugger's yards lowered with their sails rolled
 * on them, lying fore and aft inboard.
 *
 * Every spar is a lit shape with a shade strip on the side turned away
 * from the sun (a mast's fore side, a spar's underside) and a thin glint on
 * the side turned to it.
 */

/** Yards are drawn face-on, foreshortened as scene 1's ships' are. */
export const BRACE = 0.64;

export interface YardLayout {
  centre: Vec;
  half: number;
  d: number;
  furled: boolean;
  /** 0: lower yard, 1: topsail yard, 2: topgallant yard. */
  level: number;
}

export interface MastLayout {
  spec: MastSpec;
  lowerAt: (y: number) => Vec;
  topmastAt: (y: number) => Vec;
  poleAt: (y: number) => Vec;
  yards: YardLayout[];
  /** The top's ends (aft, fore) at its upper face, and the crosstrees'. */
  top?: { aft: Vec; fore: Vec };
  crosstrees?: { aft: Vec; fore: Vec };
}

export interface RigLayout {
  masts: Map<string, MastLayout>;
  bowsprit?: {
    heel: Vec;
    dir: Vec;
    cap: Vec;
    jbStart: Vec;
    jbEnd: Vec;
    martingaleEnd: Vec;
  };
  runningBowsprit?: { from: Vec; to: Vec };
  bumkin?: { from: Vec; to: Vec };
  gaff?: { mast: string; throat: Vec; peak: Vec; boomHeel: Vec; boomEnd: Vec };
  /** Lowered lug yards: the after and fore ends of each, the halyard's sling. */
  lugs: { mast: string; aft: Vec; fore: Vec; sling: Vec }[];
  /** Where the ensign's hoist hangs from, and the staff's top. */
  ensign: { anchor: Vec; staffFoot?: Vec; staffTop?: Vec };
  pennant?: { anchor: Vec };
}

export interface RigArt {
  masts: string;
  mastShade: string;
  mastGlint: string;
  mastBands: string;
  /** Mastheads, tops, caps, crosstrees, trucks: the black ironwork of the rig. */
  heads: string;
  headShade: string;
  yards: string;
  yardShade: string;
  yardGlint: string;
  /** Spars of the mast's wood (bowsprit, jib-boom, running bowsprit, bumkin, staff). */
  spars: string;
  sparShade: string;
  sparGlint: string;
  /** Black spars: gaff, boom, martingale, cap. */
  darkSpars: string;
  darkSparShade: string;
  canvas: string;
  canvasUpper: string;
  canvasLower: string;
  canvasFolds: string;
  canvasGlint: string;
  gaskets: string;
  /** Lowered lug yards and their canvas, inboard (behind the near side). */
  lugYards: string;
  lugYardShade: string;
  lugCanvas: string;
  lugCanvasUpper: string;
  lugCanvasLower: string;
  lugFolds: string;
  lugGaskets: string;
  layout: RigLayout;
}

interface Builders {
  lit: PathBuilder;
  shade: PathBuilder;
  glint: PathBuilder;
}

/**
 * A spar as a lit shape, a shade strip on the side turned from the sun
 * (the fore side of anything standing up, the underside of anything lying
 * down) and a glint on the other.
 */
function paintSpar(to: Builders, a: Vec, b: Vec, wa: number, wb: number): void {
  to.lit.polygon(taper(a, b, wa, wb));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const upright = Math.abs(dy) > Math.abs(dx) * 1.2;
  // strip(): +0.5 is the right of a→b; its normal is (dy, -dx).
  const rightNormal: Vec = [dy, -dx];
  const shadeRight = upright ? rightNormal[0] > 0 : rightNormal[1] < 0;
  if (shadeRight) {
    to.shade.polygon(strip(a, b, wa, wb, 0.16, 0.5));
    to.glint.polygon(strip(a, b, wa, wb, -0.34, -0.2));
  } else {
    to.shade.polygon(strip(a, b, wa, wb, -0.5, -0.16));
    to.glint.polygon(strip(a, b, wa, wb, 0.2, 0.34));
  }
}

function layoutMast(m: MastSpec): MastLayout {
  const lean = Math.tan(deg(m.rake));
  const lowerAt = (y: number): Vec => [m.x - (y - m.deck) * lean, y];
  const [dL, dT, dG] = m.d;
  // Topmasts stand forward of the lower masthead, through the cap.
  const topOffset = (dL * 0.8 + dT) / 2 + 0.04;
  const topmastAt = (y: number): Vec => [lowerAt(y)[0] + topOffset, y];
  const poleOffset = topOffset + (dT * 0.8 + dG) / 2 + 0.03;
  const poleAt = (y: number): Vec => [lowerAt(y)[0] + poleOffset, y];
  if (m.head === undefined || m.top === undefined) {
    return { spec: m, lowerAt, topmastAt: lowerAt, poleAt: lowerAt, yards: [] };
  }
  const tw = m.topWidth ?? 2;
  const [tx, ty] = lowerAt(m.top);
  const topHead = m.topmastHead ?? m.head;
  const [kx, ky] = topmastAt(topHead - 0.5);
  const yards: YardLayout[] = (m.yards ?? []).map((yd, i) => {
    const axis =
      i === 0 ? lowerAt(yd.y) : i === 1 ? topmastAt(yd.y) : poleAt(yd.y);
    return {
      centre: [axis[0] + 0.08, yd.y],
      half: (yd.length * BRACE) / 2,
      d: i === 0 ? dL * 0.6 : i === 1 ? dT * 0.7 : dG * 0.8,
      furled: yd.furled,
      level: i,
    };
  });
  return {
    spec: m,
    lowerAt,
    topmastAt,
    poleAt,
    yards,
    top: { aft: [tx - tw * 0.3, ty + 0.22], fore: [tx + tw * 0.7, ty + 0.22] },
    crosstrees: {
      aft: [kx - tw * 0.16, ky + 0.07],
      fore: [kx + tw * 0.22, ky + 0.07],
    },
  };
}

/** A point on the rig. */
export function pointOf(spec: CraftSpec, rig: RigLayout, p: RigPoint): Vec {
  if ("mast" in p) {
    const m = rig.masts.get(p.mast);
    if (!m) throw new Error(`no mast ${p.mast}`);
    const f =
      p.on === "lower"
        ? m.lowerAt
        : p.on === "topmast"
          ? m.topmastAt
          : m.poleAt;
    return f(p.y);
  }
  if ("bowsprit" in p) {
    const b = rig.bowsprit;
    if (!b) throw new Error("no bowsprit");
    return [
      b.heel[0] + b.dir[0] * p.bowsprit,
      b.heel[1] + b.dir[1] * p.bowsprit,
    ];
  }
  if ("at" in p) {
    if (p.at === "runningBowspritEnd") {
      if (!rig.runningBowsprit) throw new Error("no running bowsprit");
      return rig.runningBowsprit.to;
    }
    const b = rig.bowsprit;
    if (!b) throw new Error("no bowsprit");
    return p.at === "cap" ? b.cap : b.jbEnd;
  }
  if ("rail" in p) return [p.rail, railAt(spec.hull, p.rail)];
  return p.point;
}

export function buildRigArt(spec: CraftSpec): RigArt {
  const rng = (part: string) => forkRng(spec.seed, `rig:${part}`);
  const mastB: Builders = { lit: path(), shade: path(), glint: path() };
  const headB: Builders = { lit: path(), shade: path(), glint: path() };
  const yardB: Builders = { lit: path(), shade: path(), glint: path() };
  const sparB: Builders = { lit: path(), shade: path(), glint: path() };
  const darkB: Builders = { lit: path(), shade: path(), glint: path() };
  const bands = path();
  const canvas = {
    body: path(),
    upper: path(),
    lower: path(),
    gaskets: path(),
    folds: path(),
  };
  const canvasGlint = path();
  const lugYardB: Builders = { lit: path(), shade: path(), glint: path() };
  const lugCanvas = {
    body: path(),
    upper: path(),
    lower: path(),
    gaskets: path(),
    folds: path(),
  };

  const masts = new Map<string, MastLayout>();
  for (const m of spec.masts) {
    const L = layoutMast(m);
    masts.set(m.id, L);
    const [dL, dT, dG] = m.d;
    if (m.head === undefined || m.top === undefined) {
      // A lugger's pole mast, stepped on the floor, tapering to the truck.
      paintSpar(
        mastB,
        L.lowerAt(m.deck - 0.2),
        L.lowerAt(m.truck),
        dL,
        dL * 0.55,
      );
      // The sheave's cheek at the masthead, and a small truck.
      const [hx, hy] = L.lowerAt(m.truck - 0.55);
      headB.lit.rect(hx - dL * 0.36, hy, dL * 0.72, 0.42);
      const [ttx, tty] = L.lowerAt(m.truck);
      headB.lit.rect(ttx - dL * 0.42, tty - 0.02, dL * 0.84, 0.09);
      continue;
    }
    const topHead = m.topmastHead ?? m.head;
    const tw = m.topWidth ?? 2;
    // The lower mast, natural to the hounds, black above.
    const hounds = m.top - Math.min(1.4, (m.top - m.deck) * 0.11);
    paintSpar(mastB, L.lowerAt(m.deck - 0.2), L.lowerAt(hounds), dL, dL * 0.9);
    paintSpar(headB, L.lowerAt(hounds), L.lowerAt(m.head), dL * 0.9, dL * 0.78);
    // The cheeks under the top, a little proud of the mast.
    const ch0 = L.lowerAt(hounds - 0.15);
    const ch1 = L.lowerAt(m.top);
    headB.lit.polygon([
      [ch0[0] - dL * 0.5, ch0[1]],
      [ch1[0] - dL * 0.62, ch1[1]],
      [ch1[0] + dL * 0.62, ch1[1]],
      [ch0[0] + dL * 0.5, ch0[1]],
    ]);
    // Iron hoops round the lower mast.
    const hoops = Math.floor((hounds - 1 - (m.deck + 1.6)) / 1.25);
    for (let i = 0; i <= hoops; i++) {
      const y = m.deck + 1.6 + i * 1.25;
      const [hx] = L.lowerAt(y);
      bands.rect(hx - dL * 0.5, y, dL, Math.max(0.05, dL * 0.13));
    }
    // The top: a thin platform reaching forward of the mast, its underside in shade.
    const [tx, ty] = L.lowerAt(m.top);
    headB.lit.rect(tx - tw * 0.3, ty, tw, 0.22);
    headB.shade.rect(tx - tw * 0.3, ty, tw, 0.12);
    headB.glint.rect(tx - tw * 0.3, ty + 0.17, tw, 0.05);
    // Trestle-trees under it, and the cap over the masthead.
    headB.lit.rect(tx - tw * 0.24, ty - 0.12, tw * 0.62, 0.13);
    const [cx, cy] = L.lowerAt(m.head);
    const topOffset = (dL * 0.8 + dT) / 2 + 0.04;
    headB.lit.rect(cx - dL * 0.5, cy - 0.04, topOffset + dT, 0.24);
    headB.shade.rect(cx - dL * 0.5, cy - 0.04, topOffset + dT, 0.1);
    // The topmast, natural to the crosstrees, black above.
    paintSpar(
      mastB,
      L.topmastAt(m.top - 0.4),
      L.topmastAt(topHead - 0.6),
      dT,
      dT * 0.78,
    );
    paintSpar(
      headB,
      L.topmastAt(topHead - 0.6),
      L.topmastAt(topHead),
      dT * 0.78,
      dT * 0.72,
    );
    const [kx, ky] = L.topmastAt(topHead - 0.5);
    headB.lit.rect(kx - tw * 0.16, ky, tw * 0.38, 0.14);
    headB.shade.rect(kx - tw * 0.16, ky, tw * 0.38, 0.06);
    // The topgallant pole and its truck.
    paintSpar(mastB, L.poleAt(topHead - 1.1), L.poleAt(m.truck), dG, dG * 0.5);
    const [px, py] = L.poleAt(m.truck);
    headB.lit.rect(px - dG * 0.55, py - 0.04, dG * 1.1, 0.12);
  }

  // Yards, and the square sails furled on them.
  const r = rng("rolls");
  for (const L of masts.values()) {
    for (const y of L.yards) {
      const [cx, cy] = y.centre;
      yardB.lit.polygon(yardShape(y.centre, y.half, y.d));
      yardB.shade.polygon(
        yardShape([cx, cy - y.d * 0.08], y.half, y.d * 0.84, "bottom"),
      );
      yardB.glint.polygon(
        yardShape([cx, cy + y.d * 0.3], y.half * 0.96, y.d * 0.22, "whole"),
      );
      // The slings' cleats and the yardarm's ends.
      if (!y.furled) continue;
      const lengthM = (y.half * 2) / BRACE;
      const t = y.level === 2 ? 0.032 : 0.04;
      const thickness = lengthM * t;
      const reach = 0.9;
      const a: Vec = [cx - y.half * reach, cy];
      const b: Vec = [cx + y.half * reach, cy];
      const spacing = 0.95;
      const n = Math.max(3, Math.round((y.half * 2 * reach) / spacing));
      const gaskets: number[] = [];
      for (let k = 1; k < n; k++) {
        const g = k / n;
        // None across the bunt, where the bunt gasket holds the middle.
        if (Math.abs(g - 0.5) < 0.07) continue;
        gaskets.push(g + (r() - 0.5) * 0.02);
      }
      gaskets.push(0.5);
      gaskets.sort((p, q) => p - q);
      const parts = roll({
        a,
        b,
        side: 1,
        inner: (s) => {
          const u = (s * 2 - 1) * reach;
          return yardDiameter(y.d, u) * 0.12;
        },
        outer: (s) => {
          const u = (s * 2 - 1) * reach;
          const e = Math.abs(u) / reach;
          const yardTop = yardDiameter(y.d, u) / 2;
          // Thick in the middle, gathered higher at the bunt, thin at the arms;
          // rounding off at both ends.
          const body = thickness * (0.42 + 0.58 * (1 - e ** 1.7));
          const bunt = thickness * 0.42 * Math.exp(-((u / reach / 0.13) ** 2));
          const end = Math.min(1, (1 - e) / 0.06) ** 0.5;
          return yardDiameter(y.d, u) * 0.12 + (yardTop + body + bunt) * end;
        },
        gaskets,
        bulge: 0.2,
        rng: r,
      });
      drawRoll(parts, canvas);
      canvasGlint.polyline(parts.edge.slice(3, -3));
    }
  }

  // The bowsprit, its cap, the jib-boom over it, the martingale under.
  let bowsprit: RigLayout["bowsprit"];
  if (spec.bowsprit) {
    const bs = spec.bowsprit;
    const dir: Vec = [Math.cos(deg(bs.angle)), Math.sin(deg(bs.angle))];
    const heel = bs.heel;
    const cap: Vec = [
      heel[0] + dir[0] * bs.length,
      heel[1] + dir[1] * bs.length,
    ];
    const inboard: Vec = [
      heel[0] - dir[0] * bs.inboard,
      heel[1] - dir[1] * bs.inboard,
    ];
    paintSpar(sparB, inboard, cap, bs.d[0], bs.d[1]);
    const j = bs.jibBoom;
    const jbStart: Vec = [
      cap[0] - dir[0] * j.overlap,
      cap[1] - dir[1] * j.overlap + j.lift,
    ];
    const jbEnd: Vec = [
      jbStart[0] + dir[0] * j.length,
      jbStart[1] + dir[1] * j.length,
    ];
    paintSpar(sparB, jbStart, jbEnd, j.d[0], j.d[1]);
    // The cap: a block across the bowsprit's end, holding the jib-boom.
    const perp: Vec = [-dir[1], dir[0]];
    const capC: Vec = [cap[0] - dir[0] * 0.12, cap[1] - dir[1] * 0.12];
    const below = bs.d[1] * 0.62;
    const above = j.lift * Math.cos(deg(bs.angle)) + j.d[0] * 0.75;
    paintSpar(
      darkB,
      [capC[0] - perp[0] * below, capC[1] - perp[1] * below],
      [capC[0] + perp[0] * above, capC[1] + perp[1] * above],
      0.22,
      0.22,
    );
    // The martingale, hanging under the cap.
    const mTop: Vec = [cap[0] - 0.12, cap[1] - bs.d[1] * 0.5];
    const martingaleEnd: Vec = [cap[0] - 0.28, cap[1] - bs.martingale];
    paintSpar(darkB, mTop, martingaleEnd, 0.13, 0.09);
    bowsprit = { heel, dir, cap, jbStart, jbEnd, martingaleEnd };

    if (spec.stowedHeadsails) {
      // The jib stowed along the jib-boom, the staysail along the bowsprit.
      const sr = rng("headsails");
      const stow = (a: Vec, b: Vec, radius: number, thick: number) => {
        const parts = roll({
          a,
          b,
          side: 1,
          inner: () => radius * 0.2,
          outer: (s) =>
            radius +
            thick *
              (0.55 + 0.45 * Math.sin(Math.PI * s) ** 0.6) *
              Math.min(1, s / 0.08, (1 - s) / 0.08) ** 0.5,
          gaskets: [0.2, 0.4, 0.6, 0.8].map((g) => g + (sr() - 0.5) * 0.04),
          bulge: 0.25,
          rng: sr,
        });
        drawRoll(parts, canvas);
        canvasGlint.polyline(parts.edge.slice(3, -3));
      };
      stow(
        lerp(jbStart, jbEnd, 0.42),
        lerp(jbStart, jbEnd, 0.9),
        j.d[1] * 0.6,
        j.d[0] * 1.5,
      );
      stow(
        [heel[0] + dir[0] * 1.6, heel[1] + dir[1] * 1.6],
        [cap[0] - dir[0] * 1.2, cap[1] - dir[1] * 1.2],
        bs.d[1] * 0.55,
        bs.d[1] * 0.95,
      );
    }
  }

  let runningBowsprit: RigLayout["runningBowsprit"];
  if (spec.runningBowsprit) {
    const s = spec.runningBowsprit;
    paintSpar(sparB, s.from, s.to, s.d[0], s.d[1]);
    runningBowsprit = { from: s.from, to: s.to };
  }
  let bumkin: RigLayout["bumkin"];
  if (spec.bumkin) {
    const s = spec.bumkin;
    paintSpar(sparB, s.from, s.to, s.d[0], s.d[1]);
    bumkin = { from: s.from, to: s.to };
  }

  // The gaff and boom; the sail brailed in under the gaff and to the mast.
  let gaff: RigLayout["gaff"];
  if (spec.gaff) {
    const g = spec.gaff;
    const L = masts.get(g.mast);
    if (!L) throw new Error(`no mast ${g.mast}`);
    const ease = Math.cos(deg(g.ease));
    const throat = L.lowerAt(g.throat);
    const peak: Vec = [
      throat[0] - Math.cos(deg(g.angle)) * g.length * ease,
      throat[1] + Math.sin(deg(g.angle)) * g.length,
    ];
    paintSpar(darkB, throat, peak, g.d[0], g.d[1]);
    const boomHeel = L.lowerAt(g.boom.at);
    const boomEnd: Vec = [
      boomHeel[0] - g.boom.length * ease,
      boomHeel[1] + g.boom.rise,
    ];
    paintSpar(darkB, boomHeel, boomEnd, g.boom.d[0], g.boom.d[1]);
    // The jaws at the throat and the boom's heel.
    const dL = L.spec.d[0];
    darkB.lit.rect(
      throat[0] - dL * 0.75,
      throat[1] - g.d[0] * 0.55,
      dL * 0.5,
      g.d[0] * 1.1,
    );
    darkB.lit.rect(
      boomHeel[0] - dL * 0.75,
      boomHeel[1] - g.boom.d[0] * 0.55,
      dL * 0.5,
      g.boom.d[0] * 1.1,
    );
    gaff = { mast: g.mast, throat, peak, boomHeel, boomEnd };

    const br = rng("brailed");
    // Along the gaff, hanging under it (the left of throat→peak, a gaff
    // rising aft), thickest at the throat, festooned between the brails.
    const bulk = g.length * 0.085;
    drawRoll(
      roll({
        a: [throat[0] - dL * 0.45, throat[1] - g.d[0] * 0.2],
        b: lerp(throat, peak, 0.74),
        side: 1,
        inner: () => g.d[0] * 0.3,
        outer: (s) =>
          g.d[0] * 0.3 +
          bulk * (1 - 0.62 * s) * Math.min(1, (1 - s) / 0.1) ** 0.6,
        gaskets: [0.3, 0.56, 0.8],
        bulge: 0.42,
        rng: br,
      }),
      canvas,
    );
    // Down the mast's after side, the luff gathered against the hoops.
    const down = Math.min(g.throat - g.boom.at - 0.6, g.length * 0.62);
    drawRoll(
      roll({
        a: [throat[0] - dL * 0.48, throat[1] - 0.15],
        b: [L.lowerAt(g.throat - down)[0] - dL * 0.48, g.throat - down],
        side: -1,
        inner: () => 0,
        outer: (s) =>
          bulk * 0.75 * (1 - 0.55 * s) * Math.min(1, (1 - s) / 0.12) ** 0.5,
        gaskets: [0.33, 0.66],
        bulge: 0.3,
        rng: br,
      }),
      canvas,
    );
  }

  // A lugger's yards, lowered with their sails rolled on them, lying fore
  // and aft inboard.
  const lugs: RigLayout["lugs"] = [];
  if (spec.lugs) {
    const lr = rng("lugs");
    for (const lg of spec.lugs) {
      const aft: Vec = [lg.aftX, lg.aftY];
      const fore: Vec = [lg.aftX + lg.length, lg.foreY];
      paintSpar(lugYardB, aft, fore, lg.d * 0.7, lg.d * 0.7);
      lugYardB.lit.polygon(taper(lerp(aft, fore, 0.5), fore, lg.d, lg.d * 0.6));
      const n = Math.max(4, Math.round(lg.length / 0.9));
      const gaskets = Array.from(
        { length: n - 1 },
        (_, k) => (k + 1) / n + (lr() - 0.5) * 0.03,
      );
      const parts = roll({
        a: lerp(aft, fore, 0.04),
        b: lerp(aft, fore, 0.95),
        side: 1,
        inner: () => lg.d * 0.1,
        outer: (s) =>
          lg.d * 0.45 +
          lg.roll *
            (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, s * 1.25)) ** 0.8) *
            Math.min(1, s / 0.05, (1 - s) / 0.06) ** 0.5,
        gaskets,
        bulge: 0.24,
        rng: lr,
      });
      drawRoll(parts, lugCanvas);
      // The halyard comes down to the sling, a third of the yard from its fore end.
      const sling = lerp(aft, fore, 0.67);
      lugs.push({
        mast: lg.mast,
        aft,
        fore,
        sling: [sling[0], sling[1] + lg.d * 0.4 + lg.roll * 0.5],
      });
    }
  }

  // The ensign's place: an ensign staff at the stern, the gaff's peak, or a masthead.
  const e = spec.ensign;
  let ensign: RigLayout["ensign"];
  if (e.at === "staff" && e.staff) {
    const s = e.staff;
    const top: Vec = [
      s.foot[0] - Math.sin(deg(s.rake)) * s.height,
      s.foot[1] + Math.cos(deg(s.rake)) * s.height,
    ];
    paintSpar(sparB, s.foot, top, s.d, s.d * 0.6);
    headB.lit.rect(top[0] - s.d * 0.7, top[1] - 0.02, s.d * 1.4, 0.08);
    ensign = {
      anchor: [top[0], top[1] - 0.08],
      staffFoot: s.foot,
      staffTop: top,
    };
  } else if (e.at === "peak" && gaff) {
    ensign = { anchor: [gaff.peak[0] - 0.05, gaff.peak[1] - 0.12] };
  } else {
    const m =
      spec.masts.find((x) => x.id === e.mast) ??
      spec.masts[spec.masts.length - 1];
    const L = masts.get(m.id);
    if (!L) throw new Error("no mast for the ensign");
    const top = (m.head === undefined ? L.lowerAt : L.poleAt)(m.truck - 0.12);
    ensign = { anchor: top };
  }

  let pennant: RigLayout["pennant"];
  if (spec.pennant) {
    const m = spec.masts.find((x) => x.id === spec.pennant?.mast);
    const L = m ? masts.get(m.id) : undefined;
    if (m && L) {
      const at = (m.head === undefined ? L.lowerAt : L.poleAt)(m.truck - 0.1);
      pennant = { anchor: at };
    }
  }

  return {
    masts: mastB.lit.toString(),
    mastShade: mastB.shade.toString(),
    mastGlint: mastB.glint.toString(),
    mastBands: bands.toString(),
    heads: headB.lit.toString(),
    headShade: headB.shade.toString(),
    yards: yardB.lit.toString(),
    yardShade: yardB.shade.toString(),
    yardGlint: yardB.glint.toString(),
    spars: sparB.lit.toString(),
    sparShade: sparB.shade.toString(),
    sparGlint: sparB.glint.toString(),
    darkSpars: darkB.lit.toString(),
    darkSparShade: darkB.shade.toString(),
    canvas: canvas.body.toString(),
    canvasUpper: canvas.upper.toString(),
    canvasLower: canvas.lower.toString(),
    canvasFolds: canvas.folds.toString(),
    canvasGlint: canvasGlint.toString(),
    gaskets: canvas.gaskets.toString(),
    lugYards: lugYardB.lit.toString(),
    lugYardShade: lugYardB.shade.toString(),
    lugCanvas: lugCanvas.body.toString(),
    lugCanvasUpper: lugCanvas.upper.toString(),
    lugCanvasLower: lugCanvas.lower.toString(),
    lugFolds: lugCanvas.folds.toString(),
    lugGaskets: lugCanvas.gaskets.toString(),
    layout: {
      masts,
      bowsprit,
      runningBowsprit,
      bumkin,
      gaff,
      lugs,
      ensign,
      pennant,
    },
  };
}
