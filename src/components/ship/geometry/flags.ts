import type { FlagDesign } from "../types";
import type { Vec } from "./vec";

/**
 * Flag artwork. Designs are drawn in flag space, u along the fly (0 at the
 * hoist, 1 at the fly end) and v down the hoist (0 at the top, 1 at the
 * bottom), then mapped through a static wave so the flag looks like it is
 * streaming. Animation only ever transforms the flag's wrapper.
 *
 * Output coordinates are SVG user units with the hoist's top at (0, 0),
 * x toward the fly (downwind, to the right) and y down.
 */

export interface FlagShape {
  /** Fill colour → path data. The first entry is the field. */
  layers: { fill: string; d: string; opacity?: number }[];
  /** Darker bands on the wave troughs. */
  shade: string;
  /** Outline of the whole cloth, for clipping and the warm-light layer. */
  outline: string;
  width: number;
  height: number;
}

export interface WaveParams {
  /** Wave amplitude as a fraction of the hoist. */
  amplitude: number;
  /** Number of wave crests along the fly. */
  waves: number;
  /** Phase offset in radians (different frames for crossfading). */
  phase: number;
  /** How far the fly end sags in light airs, as a fraction of the hoist. */
  droop: number;
}

const WHITE = "#ECE6D8";
const RED = "#B3261E";
const BLUE = "#1F2F5C";

type Poly = readonly Vec[];

/** Maps flag space to the waving cloth. */
function makeWarp(fly: number, hoist: number, w: WaveParams) {
  return (u: number, v: number): Vec => {
    const k = Math.PI * 2 * w.waves;
    // Amplitude grows toward the fly: the hoist is held by the halyard.
    const a = w.amplitude * hoist * (0.25 + 0.75 * u);
    const wave = Math.sin(k * u + w.phase) * a;
    // The cloth shortens a little where it is folded by the wave.
    const x = u * fly * (1 - 0.06 * w.waves * w.amplitude);
    const y = v * hoist + wave + w.droop * hoist * u * u;
    return [x, y];
  };
}

/** Densify a polygon's edges so the warp bends them smoothly. */
function warpPoly(poly: Poly, warp: (u: number, v: number) => Vec): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05),
    );
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push(warp(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  return out;
}

/** Polygon to SVG path in y-down flag coordinates (no ship-space flip). */
function polyPath(points: readonly Vec[]): string {
  const f = (n: number) => String(Math.round(n * 1000) / 1000);
  return `${points.map((p, i) => `${i === 0 ? "M" : "L"}${f(p[0])} ${f(p[1])}`).join("")}Z`;
}

const rect = (u0: number, v0: number, u1: number, v1: number): Poly => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];

/** A diagonal band of half-width `hw` from (u0,v0) to (u1,v1), in a box with aspect `ar` (fly/hoist). */
function band(
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  hw: number,
  ar: number,
  offset = 0,
): Poly {
  // Work in a square-ish metric space so the band width is even.
  const ax = u0 * ar;
  const bx = u1 * ar;
  const dx = bx - ax;
  const dy = v1 - v0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const o1 = offset - hw;
  const o2 = offset + hw;
  const pts: Vec[] = [
    [ax + nx * o1, v0 + ny * o1],
    [bx + nx * o1, v1 + ny * o1],
    [bx + nx * o2, v1 + ny * o2],
    [ax + nx * o2, v0 + ny * o2],
  ];
  return pts.map(([x, y]) => [x / ar, y]);
}

/** Clip a convex polygon to a rectangle (Sutherland–Hodgman). */
function clipRect(
  poly: Poly,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): Vec[] {
  const edges: [(p: Vec) => boolean, (a: Vec, b: Vec) => Vec][] = [
    [(p) => p[0] >= u0, (a, b) => inter(a, b, 0, u0)],
    [(p) => p[0] <= u1, (a, b) => inter(a, b, 0, u1)],
    [(p) => p[1] >= v0, (a, b) => inter(a, b, 1, v0)],
    [(p) => p[1] <= v1, (a, b) => inter(a, b, 1, v1)],
  ];
  let out: Vec[] = [...poly];
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cut(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

function inter(a: Vec, b: Vec, axis: 0 | 1, value: number): Vec {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * The 1801 Union flag in a box (u0,v0)-(u1,v1): St George's cross fimbriated
 * white over the saltires of St Andrew (white) and St Patrick (red),
 * counterchanged: in each quarter the red saltire lies on the clockwise side
 * of the white diagonal.
 */
function unionPolys(
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  ar: number,
) {
  const w = u1 - u0;
  const h = v1 - v0;
  const boxAr = (w * ar) / h; // aspect of the union box in true units
  const toBox = (poly: Poly): Vec[] =>
    poly.map(([u, v]) => [u0 + u * w, v0 + v * h]);
  const blue = toBox(rect(0, 0, 1, 1));
  // 1801 proportions in units of a 30-unit hoist: white saltire 6 wide; the
  // red saltire 2 wide, lying against the diagonal (narrow white 1, broad
  // white 3); St George's cross 6 wide with 2 of white fimbriation each side.
  const whiteHalf = 3 / 30;
  const redHalf = 1 / 30;
  const whiteSaltire = [
    clipRect(band(0, 0, 1, 1, whiteHalf, boxAr), 0, 0, 1, 1),
    clipRect(band(0, 1, 1, 0, whiteHalf, boxAr), 0, 0, 1, 1),
  ].map(toBox);
  // Counterchanged red, pinwheel fashion: in the upper hoist quarter the red
  // lies below the diagonal (broad white uppermost), rotating round the centre.
  const off = redHalf;
  const redSaltire = [
    // top-left to centre: offset below the diagonal (clockwise side)
    clipRect(band(0, 0, 0.5, 0.5, redHalf, boxAr, off), 0, 0, 0.5, 0.5),
    // centre to bottom-right: offset above
    clipRect(band(0.5, 0.5, 1, 1, redHalf, boxAr, -off), 0.5, 0.5, 1, 1),
    // bottom-left to centre: offset left/up
    clipRect(band(0, 1, 0.5, 0.5, redHalf, boxAr, off), 0, 0.5, 0.5, 1),
    // centre to top-right
    clipRect(band(0.5, 0.5, 1, 0, redHalf, boxAr, -off), 0.5, 0, 1, 0.5),
  ].map(toBox);
  const georgeWhiteH = 1 / 6;
  const georgeWhiteV = georgeWhiteH / boxAr;
  const georgeRedH = 1 / 10;
  const georgeRedV = georgeRedH / boxAr;
  const whiteCross = [
    toBox(rect(0, 0.5 - georgeWhiteH, 1, 0.5 + georgeWhiteH)),
    toBox(rect(0.5 - georgeWhiteV, 0, 0.5 + georgeWhiteV, 1)),
  ];
  const redCross = [
    toBox(rect(0, 0.5 - georgeRedH, 1, 0.5 + georgeRedH)),
    toBox(rect(0.5 - georgeRedV, 0, 0.5 + georgeRedV, 1)),
  ];
  return { blue, whiteSaltire, redSaltire, whiteCross, redCross };
}

/**
 * Builds a flag. `fly` and `hoist` are in metres; the shape is returned in
 * metres too, so it shares the ship's scale.
 */
export function buildFlag(
  design: FlagDesign,
  fly: number,
  hoist: number,
  wave: WaveParams,
): FlagShape {
  const warp = makeWarp(fly, hoist, wave);
  const ar = fly / hoist;
  const polys: { fill: string; polys: Poly[] }[] = [];
  const crossV = 0.2; // St George's cross arm: a fifth of the hoist
  const crossU = crossV / ar;

  switch (design) {
    case "vice-admiral-white": {
      polys.push({ fill: WHITE, polys: [rect(0, 0, 1, 1)] });
      polys.push({
        fill: RED,
        polys: [
          rect(0, 0.5 - crossV / 2, 1, 0.5 + crossV / 2),
          rect(0.5 - crossU / 2, 0, 0.5 + crossU / 2, 1),
        ],
      });
      break;
    }
    case "white-ensign": {
      polys.push({ fill: WHITE, polys: [rect(0, 0, 1, 1)] });
      // The cross throughout, then the Union in the upper hoist canton.
      polys.push({
        fill: RED,
        polys: [
          rect(0, 0.5 - crossV / 2, 1, 0.5 + crossV / 2),
          rect(0.5 - crossU / 2, 0, 0.5 + crossU / 2, 1),
        ],
      });
      // The canton fills the upper hoist quarter up to the cross.
      const u = unionPolys(0, 0, 0.5 - crossU / 2, 0.5 - crossV / 2, ar);
      polys.push({ fill: BLUE, polys: [u.blue] });
      polys.push({ fill: WHITE, polys: [...u.whiteSaltire, ...u.whiteCross] });
      polys.push({ fill: RED, polys: [...u.redSaltire, ...u.redCross] });
      break;
    }
    case "union-flag": {
      const u = unionPolys(0, 0, 1, 1, ar);
      polys.push({ fill: BLUE, polys: [u.blue] });
      polys.push({ fill: WHITE, polys: [...u.whiteSaltire, ...u.whiteCross] });
      polys.push({ fill: RED, polys: [...u.redSaltire, ...u.redCross] });
      break;
    }
    case "french-ensign": {
      // 1794 tricolour: blue at the hoist, white, red; the red slightly wider.
      polys.push({ fill: BLUE, polys: [rect(0, 0, 0.3, 1)] });
      polys.push({ fill: WHITE, polys: [rect(0.3, 0, 0.63, 1)] });
      polys.push({ fill: RED, polys: [rect(0.63, 0, 1, 1)] });
      break;
    }
    case "spanish-ensign": {
      // 1785 naval ensign: red-yellow-red, the yellow twice the width.
      polys.push({
        fill: RED,
        polys: [rect(0, 0, 1, 0.25), rect(0, 0.75, 1, 1)],
      });
      polys.push({ fill: "#E2B53A", polys: [rect(0, 0.25, 1, 0.75)] });
      break;
    }
  }

  const layers = polys.map(({ fill, polys: ps }) => ({
    fill,
    d: ps
      .filter((p) => p.length >= 3)
      .map((p) => polyPath(warpPoly(p, warp)))
      .join(""),
  }));

  // Shade: bands where the cloth turns away, i.e. where the wave's phase
  // puts cos(k·u + φ) above a threshold. Follows the same wave as the warp.
  const shadeParts: string[] = [];
  const k = Math.PI * 2 * wave.waves;
  const threshold = 0.55;
  const halfWidth = Math.acos(threshold) / k;
  for (let n = -2; n <= Math.ceil(wave.waves) + 2; n++) {
    const centre = (2 * Math.PI * n - wave.phase) / k;
    const u0 = Math.max(0, centre - halfWidth);
    const u1 = Math.min(1, centre + halfWidth);
    if (u1 - u0 > 0.01) {
      shadeParts.push(polyPath(warpPoly(rect(u0, 0, u1, 1), warp)));
    }
  }

  return {
    layers,
    shade: shadeParts.join(""),
    outline: polyPath(warpPoly(rect(0, 0, 1, 1), warp)),
    width: fly,
    height: hoist * (1 + wave.amplitude * 2 + wave.droop),
  };
}
