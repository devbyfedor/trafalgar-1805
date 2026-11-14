import { RAMPARTS, TOWN_GROUND } from "../../geo";
import { createRng, type Pt, rgba } from "../../paint/kit";
import type { PlateCanvas } from "../../paint/plate";
import { aerial, EYE_EN, EYE_H, VEX, viewOf } from "../../scene";

/**
 * The drawing kit of the town's, the hills' and the harbour's plates (and
 * only theirs): the low sun on a face, the ground of the town's slopes,
 * the way back from the view to the map, the colours of the town's walls
 * and roofs, and the engraver's strokes these plates share.
 *
 * The light (history-notes.md, "The painting's light is that of 18:33"):
 * the sun 7° up at azimuth 286.2, 8° left of straight behind the eye. A
 * face turned west is lit gold
 * and square-on; a face turned north takes it at a graze; a face turned
 * south is in the cool shade of the blue sky; shadows fall away to the
 * east-south-east, mostly hidden behind what casts them.
 */

export type Box = readonly [number, number, number, number];

/** The sun's azimuth, degrees from north, and its height, degrees. */
export const SUN_AZ = 286.2;
export const SUN_ALT = 7;

/** How square-on the sun strikes an upright face whose outward normal points to azimuth `az` (degrees): 0..1. */
export function sunOn(az: number): number {
  return Math.max(0, Math.cos(((az - SUN_AZ) * Math.PI) / 180));
}

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function smooth(t: number): number {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
}

/** The map's metres east and north of the jetty heads for a point `ahead` metres along the view and `right` across. */
export function placeAt(ahead: number, right: number): [number, number] {
  // viewOf of a step east gives the heading's sine and cosine.
  const [s, c] = viewOf(EYE_EN[0] + 1, EYE_EN[1]);
  return [EYE_EN[0] + ahead * s + right * c, EYE_EN[1] + ahead * c - right * s];
}

/** Layer units per metre at a place. */
export function unitsPerM(east: number, north: number): number {
  return 1000 / viewOf(east, north)[0];
}

/** The layer y of a height `up` (metres as drawn) at `ahead` metres. */
export function yAt(ahead: number, up: number): number {
  return (1000 * (up - EYE_H)) / ahead;
}

/**
 * An engraver's pen for a thing at `distance` metres, device px: about
 * 1.5 near (the wooden fort), 1.2 at the jetties, 0.9 in the town, 0.6 on
 * the hills (brief, "The engraving").
 */
export function penAt(distance: number): number {
  return Math.max(0.5, Math.min(1.6, 2.2 * (distance / 300) ** -0.45));
}

// ------------------------------------------------------------- the ground

/**
 * The Liane's low-water stream through the harbour, from the jetties'
 * heads up past the lower town's quays (metres east, north): straight in
 * between the jetties, then bending south-east along the quays toward
 * Pont-de-Briques. The painting's own line (the history gives the quays
 * on the east bank and the mouth between the jetties; the bend is
 * inferred from the town's plan and is good to 100-200 m).
 */
export const RIVER: readonly Pt[] = [
  [-200, 0],
  [225, 0],
  [440, -50],
  [590, -230],
  [690, -480],
  [790, -780],
  [930, -1180],
  [1080, -1600],
];

function nearestOn(
  line: readonly Pt[],
  e: number,
  n: number,
): { d: number; side: number } {
  let best = Number.POSITIVE_INFINITY;
  let side = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = clamp01(((e - ax) * dx + (n - ay) * dy) / l2);
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(e - px, n - py);
    if (d < best) {
      best = d;
      side = dx * (n - ay) - dy * (e - ax);
    }
  }
  return { d: best, side };
}

/** Whether a place is inside a polygon of places. */
export function inside(poly: readonly Pt[], e: number, n: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > n !== yj > n && e < ((xj - xi) * (n - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}

/** Distance (m) from a place to a polygon of places (0 inside). */
export function distToPoly(poly: readonly Pt[], e: number, n: number): number {
  if (inside(poly, e, n)) return 0;
  return nearestOn([...poly, poly[0]], e, n).d;
}

/** Distance (m) from a place to the river's line, and which bank: positive on the town's (north and east). */
export function riverSide(e: number, n: number): { d: number; side: number } {
  return nearestOn(RIVER, e, n);
}

/**
 * The ground of the town's side of the harbour, metres above low water
 * (before VEX): the quays at about 5 m, the slopes climbing to the upper
 * town's plateau (TOWN_GROUND) and, north of the channel, more steeply to
 * the cliff's plateau under the Tour d'Odre. On the far bank: the flats.
 */
export function townGround(e: number, n: number): number {
  const { d, side } = riverSide(e, n);
  if (side <= 0) return 5;
  const reach = n > 60 ? 330 : 560;
  let g = 5 + 46 * smooth((d - 40) / reach) ** 0.9;
  const du = distToPoly(RAMPARTS, e, n);
  g = Math.max(g, du === 0 ? TOWN_GROUND : 50 - 0.085 * du);
  return g;
}

/** The layer y of the town's ground at a place. */
export function groundY(e: number, n: number): number {
  return yAt(viewOf(e, n)[0], townGround(e, n) * VEX);
}

/**
 * The ground's skyline over a band of depths: for each x (layer units)
 * from x0 to x1, the highest y of the town's ground between `near` and
 * `far` metres ahead (on the town's bank only; elsewhere `floor`).
 */
export function groundSkyline(
  x0: number,
  x1: number,
  step: number,
  near: number,
  far: number,
  floor: number,
  exclude?: (e: number, n: number) => boolean,
): Pt[] {
  const out: Pt[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    let y = floor;
    for (let k = 0; k <= 6; k++) {
      const a = near + ((far - near) * k) / 6;
      const [e, n] = placeAt(a, (x * a) / 1000);
      if (riverSide(e, n).side <= 0) continue;
      if (exclude?.(e, n)) continue;
      y = Math.max(y, yAt(a, townGround(e, n) * VEX));
    }
    out.push([x, y]);
  }
  return out;
}

// ------------------------------------------------------------- colours

/**
 * The town's materials in the evening light, before the air (aerial()):
 * cream plaster and grey-brown stone, red-brown tile and grey slate, each
 * lit (a face to the west), grazed (a face to the north) and in shade.
 * Golden, never red-brown in the lights.
 */
export const MAT = {
  plaster: { lit: "#efd4a0", graze: "#c7b292", shade: "#8f8f9c" },
  stone: { lit: "#d2b386", graze: "#ab9a84", shade: "#827f8b" },
  tile: { lit: "#cf9566", graze: "#a07662", shade: "#74636a" },
  slate: { lit: "#aaa6a8", graze: "#8b8b99", shade: "#666a7c" },
  rampart: { lit: "#bea27c", graze: "#968a80", shade: "#6c6a76" },
  window: "#4b4548",
  glint: "#fde6b0",
  grass: { lit: "#bdb06c", graze: "#9c9a6c", shade: "#7c806e" },
  tree: { lit: "#9c9550", mid: "#71774a", shade: "#4f5a4c" },
  shadow: "#5f6584",
  mud: { lit: "#a69174", wet: "#7b7268", shade: "#5d5a5e" },
  timber: { lit: "#b08a5c", graze: "#7f6650", shade: "#4b4140" },
} as const;

/** A material's tones through `distance` metres of evening air. */
export function tones<T extends Record<string, string>>(
  m: T,
  distance: number,
): T {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) out[k] = aerial(v, distance);
  return out as T;
}

// ------------------------------------------------------------- edges

/**
 * Fades what a plate's jobs have drawn so far toward the box's sides
 * (`side` units) and its foot (`foot` units), so the overscan below a
 * plate's ground, which nearer plates hide at the hold, never shows a cut
 * edge when the camera rises in the dive. Opacity only: no blur.
 */
export function fadeEdges(
  c: PlateCanvas,
  box: Box,
  side: number,
  foot: number,
): void {
  const { ctx } = c;
  const [x0, x1, y0, y1] = box;
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  if (side > 0) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const f = Math.min(0.45, side / (x1 - x0));
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(f, "rgba(0,0,0,1)");
    g.addColorStop(1 - f, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  if (foot > 0) {
    const g = ctx.createLinearGradient(0, y0, 0, y0 + foot);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}

// ------------------------------------------------------------- strokes

/** Strokes open polylines in one path. */
export function strokeLines(
  c: PlateCanvas,
  lines: readonly (readonly Pt[])[],
  px: number,
  colour: string,
  alpha = 1,
): void {
  const { ctx } = c;
  ctx.beginPath();
  for (const l of lines) {
    if (l.length < 2) continue;
    ctx.moveTo(l[0][0], l[0][1]);
    for (let i = 1; i < l.length; i++) ctx.lineTo(l[i][0], l[i][1]);
  }
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = c.pen(px);
  ctx.stroke();
}

/** A broken (engraver's) line along a polyline: dashes of `on` and gaps of `off` units, seeded. */
export function brokenLine(
  line: readonly Pt[],
  on: number,
  off: number,
  seed: number,
): Pt[][] {
  const rng = createRng(seed);
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let left = on * (0.5 + rng());
  let drawing = rng() < 0.7;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    let len = Math.hypot(bx - ax, by - ay);
    let t0 = 0;
    while (len > 0) {
      const take = Math.min(left, len);
      const t1 = t0 + take / Math.hypot(bx - ax, by - ay);
      if (drawing) {
        if (cur.length === 0)
          cur.push([ax + (bx - ax) * t0, ay + (by - ay) * t0]);
        cur.push([ax + (bx - ax) * t1, ay + (by - ay) * t1]);
      }
      len -= take;
      left -= take;
      t0 = t1;
      if (left <= 1e-9) {
        if (drawing && cur.length > 1) out.push(cur);
        cur = [];
        drawing = !drawing;
        left = (drawing ? on : off) * (0.6 + rng() * 0.8);
      }
    }
  }
  if (drawing && cur.length > 1) out.push(cur);
  return out;
}

// ------------------------------------------------------------- lights

/**
 * Shapes gathered into one occluder for a light sink (paint/lights.ts):
 * each polygon turned anticlockwise in layer units, the ellipses the same
 * way, so the parts of one path add up under the nonzero rule and never
 * leave a hole where two overlap.
 */
export class Shapes {
  readonly path = new Path2D();
  poly(pts: readonly Pt[]): this {
    if (pts.length < 3) return this;
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
      area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    const list = area < 0 ? [...pts].reverse() : pts;
    this.path.moveTo(list[0][0], list[0][1]);
    for (let i = 1; i < list.length; i++)
      this.path.lineTo(list[i][0], list[i][1]);
    this.path.closePath();
    return this;
  }
  rect(x: number, y: number, w: number, h: number): this {
    return this.poly(rectPts(x, y, w, h));
  }
  ellipse(x: number, y: number, rx: number, ry: number): this {
    this.path.moveTo(x + rx, y);
    this.path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    this.path.closePath();
    return this;
  }
}

/** A rectangle's corners (x, y its bottom left). */
export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/**
 * What `fadeEdges` takes below half its alpha, as an occluder: a light
 * there would float on a painting that has faded out (paint/lights.ts).
 */
export function fadeOccluder(
  c: PlateCanvas,
  box: Box,
  side: number,
  foot: number,
): void {
  if (!c.lights) return;
  const [x0, x1, y0, y1] = box;
  const s = new Shapes();
  if (side > 0) {
    const half = Math.min(0.45 * (x1 - x0), side) / 2;
    s.rect(x0 - 1, y0 - 1, half + 1, y1 - y0 + 2);
    s.rect(x1 - half, y0 - 1, half + 1, y1 - y0 + 2);
  }
  if (foot > 0) s.rect(x0 - 1, y0 - 1, x1 - x0 + 2, foot / 2 + 1);
  c.lights.occlude(s.path);
}
