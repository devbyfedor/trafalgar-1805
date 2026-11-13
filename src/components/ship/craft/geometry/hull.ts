import { between, forkRng, jitter } from "@/lib/random";
import { path } from "../../geometry/path";
import type { Vec } from "../../geometry/vec";
import type { CraftSpec } from "../types";
import {
  circle,
  deckAt,
  hullPoints,
  railAt,
  sampleX,
  sheerLine,
  stemX,
  sternX,
  taper,
} from "./shapes";

/**
 * The hull in starboard elevation: the outline smallcraft.ts draws for the
 * glyph (the same rail, rakes and stem), and on it what a hero drawing
 * needs: planking seams and butts, wales lit on top and shaded under, the
 * rail cap, a painted strake, ports with guns run out, the stem, the rudder
 * and its irons, a tiller over an outboard rudder, the hawse; weathering
 * (sun-faded patches, streaks under the scuppers, a stain at the water),
 * all seeded.
 */

export interface HullArt {
  outline: string;
  /** The outline cut at the waterline, for the reflection. */
  aboveWater: string;
  /** Below the boot-top. */
  bottom: string;
  waterStain: string;
  /** Painted strake. */
  band: string;
  bandEdges: string;
  wales: string;
  waleTops: string;
  waleUnders: string;
  seams: string;
  butts: string;
  /** Strakes a shade lighter or darker than their neighbours. */
  strakesLight: string;
  strakesDark: string;
  faded: string;
  streaks: string;
  railCap: string;
  railTop: string;
  railUnder: string;
  /** An open boat's far side, its inside seen over the near gunwale. */
  farInside: string;
  farGunwale: string;
  stem: string;
  ports: string;
  portSills: string;
  portLintels: string;
  muzzleRings: string;
  muzzleFaces: string;
  muzzleBores: string;
  muzzleGlints: string;
  /** The muzzles' shadows on the port's edges. */
  muzzleShadows: string;
  rudder: string;
  rudderEdge: string;
  rudderIrons: string;
  rudderIronTops: string;
  tiller: string;
  hawse: string;
  hawseRims: string;
  /** Heights of the far rail over the near, for the craft's things inboard. */
  farRise: (x: number) => number;
  /** The waterline's span, stern to stem. */
  span: { min: number; max: number; top: number };
}

export function buildHullArt(spec: CraftSpec): HullArt {
  const h = spec.hull;
  const rng = (part: string) => forkRng(spec.seed, `hull:${part}`);
  const depth = h.depthShown;
  const x0 = -h.sternRake - 0.6;
  const x1 = h.length + h.stemRake + 0.6;

  const outline = path().polygon(hullPoints(h, depth)).toString();
  const above = path().polygon(hullPoints(h, 0)).toString();

  // A band between two lines that follow the sheer (clipped to the hull).
  const sheerBand = (
    b: ReturnType<typeof path>,
    top: (x: number) => number,
    bottom: (x: number) => number,
    from = x0,
    to = x1,
  ) => {
    const upper = sampleX(from, to, 40, top);
    const lower = sampleX(from, to, 40, bottom).reverse();
    b.polygon([...upper, ...lower]);
  };

  // Bottom: below a boot-top just over the water.
  const bottom = path();
  sheerBand(
    bottom,
    () => 0.04,
    () => -depth - 0.2,
  );

  // A stain of weed at the water, its upper edge ragged.
  const stain = path();
  {
    const r = rng("stain");
    const upper: Vec[] = [];
    for (let x = x0; x <= x1; x += 0.35) {
      upper.push([
        x,
        0.06 + Math.max(0, jitter(r, 0.09)) + 0.03 * Math.sin(x * 1.7),
      ]);
    }
    const lower: Vec[] = [
      [x1, -0.08],
      [x0, -0.08],
    ];
    stain.polygon([...upper, ...lower]);
  }

  // The painted strake, edged by thin mouldings.
  const band = path();
  const bandEdges = path();
  if (h.band) {
    const { drop, height, sheer } = h.band;
    sheerBand(
      band,
      (x) => sheerLine(h, drop, sheer, x),
      (x) => sheerLine(h, drop + height, sheer, x),
    );
    bandEdges.polyline(
      sampleX(x0, x1, 40, (x) => sheerLine(h, drop, sheer, x)),
    );
    bandEdges.polyline(
      sampleX(x0, x1, 40, (x) => sheerLine(h, drop + height, sheer, x)),
    );
  }

  // Wales: their faces, a lit strip along each top, a shadow under each.
  const wales = path();
  const waleTops = path();
  const waleUnders = path();
  for (const w of h.wales) {
    const top = (x: number) => sheerLine(h, w.drop, w.sheer, x);
    const bot = (x: number) => sheerLine(h, w.drop + w.height, w.sheer, x);
    sheerBand(wales, top, bot);
    sheerBand(waleTops, top, (x) => top(x) - Math.min(0.05, w.height * 0.28));
    sheerBand(waleUnders, bot, (x) => bot(x) - Math.min(0.08, w.height * 0.4));
  }

  // Planking: seams every strake from the rail down past the water, keeping
  // less of the sheer the lower they run; butts staggered three strakes apart.
  const seams = path();
  const butts = path();
  const strakesLight = path();
  const strakesDark = path();
  const seamLines: ((x: number) => number)[] = [];
  {
    const low = h.rail[1];
    const keel = low + h.draught;
    for (let s = h.railCap + h.strake; s < low + depth + 0.3; s += h.strake) {
      const k = Math.max(0, 1 - s / keel);
      seamLines.push((x: number) => low - s + (railAt(h, x) - low) * k);
    }
    const covered = (y: number, x: number) =>
      h.wales.some((w) => {
        const top = sheerLine(h, w.drop, w.sheer, x);
        return y <= top + 0.02 && y >= top - w.height - 0.02;
      });
    for (const line of seamLines) {
      const pts = sampleX(x0, x1, 48, line);
      // Leave out the stretches a wale covers.
      let run: Vec[] = [];
      for (const p of pts) {
        if (covered(p[1], p[0])) {
          if (run.length > 1) seams.polyline(run);
          run = [];
        } else run.push(p);
      }
      if (run.length > 1) seams.polyline(run);
    }
    const r = rng("butts");
    const tone = rng("strakes");
    for (let j = 0; j + 1 < seamLines.length; j++) {
      const upper = seamLines[j];
      const lower = seamLines[j + 1];
      const shift = ((j % 3) * h.plankLength) / 3 + jitter(r, 0.4);
      for (
        let x = x0 + shift;
        x < x1;
        x += h.plankLength * between(r, 0.85, 1.12)
      ) {
        const yu = upper(x);
        const yl = lower(x);
        if (covered((yu + yl) / 2, x)) continue;
        butts.segment([x, yu], [x, yl]);
      }
      // One strake in four a shade off its neighbours, as paint and
      // timber weather unevenly.
      const t = tone();
      if (t < 0.16) sheerBand(strakesLight, upper, lower);
      else if (t > 0.86) sheerBand(strakesDark, upper, lower);
    }
  }

  // Sun-faded patches on the topsides, and streaks under the scuppers.
  const faded = path();
  const streaks = path();
  {
    const r = rng("faded");
    const n = Math.round(h.length / 2.6);
    for (let i = 0; i < n; i++) {
      const cx = between(r, 0.4, h.length - 0.4);
      const top = railAt(h, cx) - h.railCap - 0.06;
      const cy = between(r, Math.max(0.35, top - 1.2), top - 0.12);
      const rx = between(r, 0.6, 1.8);
      const ry = between(r, 0.08, 0.22);
      const pts: Vec[] = [];
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const wob = 1 + jitter(r, 0.28);
        pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
      }
      faded.polygon(pts);
    }
    const s = rng("streaks");
    const scuppers = h.scuppers ?? [];
    for (const sx of scuppers) {
      const x = sx + jitter(s, 0.2);
      const yTop = deckAt(h, x) + 0.04;
      const len = between(s, 0.35, Math.max(0.4, yTop - 0.15));
      const w = between(s, 0.05, 0.1);
      streaks.polygon([
        [x - w / 2, yTop],
        [x + w / 2, yTop],
        [x + w * 0.2 + jitter(s, 0.03), yTop - len],
        [x - w * 0.15, yTop - len * 0.92],
      ]);
    }
  }

  // The rail cap (the gunwale), its lit top, the shadow under it.
  const railCap = path();
  const railTop = path();
  const railUnder = path();
  {
    const from = -h.sternRake;
    const to = h.length + h.stemRake;
    const top = (x: number) => railAt(h, x);
    const capBottom = (x: number) => railAt(h, x) - h.railCap;
    sheerBand(railCap, top, capBottom, from, to);
    sheerBand(railTop, top, (x) => top(x) - h.railCap * 0.32, from, to);
    sheerBand(railUnder, capBottom, (x) => capBottom(x) - 0.05, from, to);
  }

  // An open boat's far side: the inside of the far planking above the near
  // gunwale, highest amidships, meeting it at the stem and stern posts.
  const farInside = path();
  const farGunwale = path();
  const rise = h.open ? 0.13 : 0;
  const farRise = (x: number) => {
    const t = (x + h.sternRake) / (h.length + h.stemRake + h.sternRake);
    return (
      rise * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))) ** 0.7
    );
  };
  if (rise > 0) {
    const from = -h.sternRake;
    const to = h.length + h.stemRake;
    const far = (x: number) => railAt(h, x) + farRise(x);
    sheerBand(farInside, far, (x) => railAt(h, x) - 0.02, from, to);
    sheerBand(farGunwale, far, (x) => far(x) - h.railCap * 0.7, from, to);
  }

  // The stem post along the bow's edge.
  const stem = path();
  {
    const w = Math.max(0.12, h.length * 0.007);
    const top = h.rail[2] + (h.stemHead ?? 0);
    const ys: number[] = [];
    for (let i = 0; i <= 14; i++) ys.push(-depth + ((top + depth) * i) / 14);
    const outer = ys.map(
      (y): Vec => [
        stemX(h, Math.min(y, h.rail[2])) + (y > h.rail[2] ? 0.02 : 0),
        y,
      ],
    );
    const inner = ys
      .map((y): Vec => [stemX(h, Math.min(y, h.rail[2])) - w, y])
      .reverse();
    stem.polygon([...outer, ...inner]);
    if (h.pointed) {
      // The sternpost of a double-ended hull, as the stem.
      const sTop = h.rail[0] + (h.stemHead ?? 0);
      const sys: number[] = [];
      for (let i = 0; i <= 14; i++)
        sys.push(-depth + ((sTop + depth) * i) / 14);
      const sOuter = sys.map(
        (y): Vec => [sternX(h, Math.min(y, h.rail[0])), y],
      );
      const sInner = sys
        .map((y): Vec => [sternX(h, Math.min(y, h.rail[0])) + w, y])
        .reverse();
      stem.polygon([...sOuter, ...sInner]);
    }
  }

  // Ports, each with a gun run out: the muzzle's swell, its face, the bore,
  // a glint where the sun catches the rim, its shadow on the port's edge.
  const ports = path();
  const portSills = path();
  const portLintels = path();
  const muzzleRings = path();
  const muzzleFaces = path();
  const muzzleBores = path();
  const muzzleGlints = path();
  const muzzleShadows = path();
  if (h.ports) {
    const p = h.ports;
    for (const x of p.xs) {
      const sill = deckAt(h, x) + p.sill;
      const l = x - p.width / 2;
      ports.rect(l, sill, p.width, p.height);
      portSills.rect(l - 0.04, sill - 0.05, p.width + 0.08, 0.07);
      portLintels.rect(l, sill + p.height - 0.07, p.width, 0.07);
      const c: Vec = [x + 0.02, sill + p.height * 0.44];
      const r = p.muzzle / 2;
      // The shadow falls right and a little down: the sun is to the left, low.
      circle(muzzleShadows, [c[0] + r * 0.45, c[1] - r * 0.12], r * 1.02);
      circle(muzzleRings, c, r);
      circle(muzzleFaces, c, r * 0.8);
      circle(muzzleBores, [c[0] + r * 0.04, c[1] - r * 0.02], r * 0.4);
      // A crescent on the upper left of the swell.
      const glint: Vec[] = [];
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI * (0.55 + (0.55 * k) / 8);
        glint.push([
          c[0] + Math.cos(a) * r * 0.97,
          c[1] + Math.sin(a) * r * 0.97,
        ]);
      }
      for (let k = 8; k >= 0; k--) {
        const a = Math.PI * (0.6 + (0.45 * k) / 8);
        glint.push([
          c[0] + Math.cos(a) * r * 0.8,
          c[1] + Math.sin(a) * r * 0.8,
        ]);
      }
      muzzleGlints.polygon(glint);
    }
  }

  // The rudder on the sternpost: wider below the water, its irons across it.
  const rudder = path();
  const rudderEdge = path();
  const rudderIrons = path();
  const rudderIronTops = path();
  const tiller = path();
  {
    const rd = h.rudder;
    const yTop = rd.head;
    const widthAt = (y: number) => {
      if (y <= 0) return rd.width * (1 + 0.2 * Math.min(1, -y / depth));
      const t = Math.min(1, y / yTop);
      return rd.width + (rd.headWidth - rd.width) * t ** 0.8;
    };
    const postAt = (y: number) =>
      sternX(h, Math.min(y, h.rail[0])) -
      (y > h.rail[0] ? (y - h.rail[0]) * 0.12 : 0);
    const ys: number[] = [];
    for (let i = 0; i <= 16; i++)
      ys.push(-depth - 0.1 + ((yTop + depth + 0.1) * i) / 16);
    const fore = ys.map((y): Vec => [postAt(y) + 0.02, y]);
    const aft = ys.map((y): Vec => [postAt(y) - widthAt(y), y]).reverse();
    rudder.polygon([...fore, ...aft]);
    const edge = ys.map((y): Vec => [postAt(y) - widthAt(y) * 0.78, y]);
    rudderEdge.polygon([...edge, ...aft]);
    // Irons: pintles and gudgeons, every ~0.55 m from the water up.
    const n = Math.max(2, Math.floor(yTop / 0.6));
    for (let i = 0; i < n; i++) {
      const y = 0.25 + ((yTop - 0.5) * i) / Math.max(1, n - 1);
      const a = postAt(y) - widthAt(y) * 0.92;
      const b = postAt(y) + 0.45;
      const t = Math.max(0.05, h.length * 0.0018);
      rudderIrons.rect(a, y - t / 2, b - a, t);
      rudderIronTops.rect(a, y + t * 0.1, b - a, t * 0.4);
    }
    if (rd.tiller) {
      const head: Vec = [postAt(yTop) - rd.headWidth * 0.5, yTop - 0.06];
      const end: Vec = [head[0] + rd.tiller.length, head[1] + rd.tiller.rise];
      tiller.polygon(taper(head, end, 0.11, 0.07));
    }
  }

  // The hawse: a hole with a lit bolster round it.
  const hawse = path();
  const hawseRims = path();
  {
    const a = spec.anchor;
    if (a.hawseHole) {
      const r = a.cable * 1.25;
      circle(hawseRims, [a.hawse[0] - 0.02, a.hawse[1] + 0.02], r * 1.75);
      circle(hawse, a.hawse, r);
    } else {
      // A chock at the stem head.
      hawseRims.rect(a.hawse[0] - 0.22, a.hawse[1] - 0.08, 0.32, 0.16);
    }
  }

  const span = {
    min: -h.sternRake,
    max: h.length + h.stemRake,
    top: Math.max(...h.rail) + (h.stemHead ?? 0),
  };

  return {
    outline,
    aboveWater: above,
    bottom: bottom.toString(),
    waterStain: stain.toString(),
    band: band.toString(),
    bandEdges: bandEdges.toString(),
    wales: wales.toString(),
    waleTops: waleTops.toString(),
    waleUnders: waleUnders.toString(),
    seams: seams.toString(),
    butts: butts.toString(),
    strakesLight: strakesLight.toString(),
    strakesDark: strakesDark.toString(),
    faded: faded.toString(),
    streaks: streaks.toString(),
    railCap: railCap.toString(),
    railTop: railTop.toString(),
    railUnder: railUnder.toString(),
    farInside: farInside.toString(),
    farGunwale: farGunwale.toString(),
    stem: stem.toString(),
    ports: ports.toString(),
    portSills: portSills.toString(),
    portLintels: portLintels.toString(),
    muzzleRings: muzzleRings.toString(),
    muzzleFaces: muzzleFaces.toString(),
    muzzleBores: muzzleBores.toString(),
    muzzleGlints: muzzleGlints.toString(),
    muzzleShadows: muzzleShadows.toString(),
    rudder: rudder.toString(),
    rudderEdge: rudderEdge.toString(),
    rudderIrons: rudderIrons.toString(),
    rudderIronTops: rudderIronTops.toString(),
    tiller: tiller.toString(),
    hawse: hawse.toString(),
    hawseRims: hawseRims.toString(),
    farRise,
    span,
  };
}
