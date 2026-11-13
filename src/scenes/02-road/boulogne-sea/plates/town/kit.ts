import { RAMPARTS, TOWN_GROUND } from "../../geo";
import { createRng, mix, type Pt, rgba } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { aerial, EYE_EN, EYE_H, VEX, viewOf } from "../../scene";

/**
 * The drawing kit of the town's, the hills' and the harbour's plates (and
 * only theirs): the low sun on a face, the ground of the town's slopes,
 * the way back from the view to the map, the colours of the town's walls
 * and roofs, and the engraver's strokes these plates share.
 *
 * The light (brief, "The picture"): the sun about 5° up at azimuth 294,
 * behind the eye and a little to its left. A face turned west is lit gold
 * and square-on; a face turned north takes it at a graze; a face turned
 * south is in the cool shade of the blue sky; shadows fall away to the
 * east-south-east, mostly hidden behind what casts them.
 */

export type Box = readonly [number, number, number, number];

/** The sun's azimuth, degrees from north. */
export const SUN_AZ = 294;

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

// ------------------------------------------------------------- a house

export interface House {
  /** The foot of the front's middle, layer units. */
  x: number;
  y: number;
  /** Front width, wall height, side (foreshortened depth) and roof rise, layer units. */
  w: number;
  h: number;
  s: number;
  r: number;
  /** The gable end to the front (else the eaves). */
  gable: boolean;
  wall: { lit: string; graze: string; shade: string };
  roof: { lit: string; graze: string; shade: string };
  /** Share of the front's height in the shadow of the roofs in front. */
  shadow: number;
  storeys: number;
  bays: number;
  /** Chimneys along the ridge, 0..1 from its left end. */
  chimneys: readonly number[];
  seed: number;
  distance: number;
}

/**
 * A house of the lower town seen from the roads (WNW): its west front lit
 * square-on, its north side a grazed sliver to the left, its roof the
 * west slope over the eaves or the north slope beside a gable, chimneys
 * on the ridge, windows (a few catching the sun) and, low on the front,
 * the shadow of the roofs between it and the sun.
 */
export function makeHouse(
  rng: () => number,
  e: number,
  n: number,
  up: number,
  size: { w: number; d: number; h: number },
  material: "plaster" | "stone",
  roof: "tile" | "slate",
  shadow: number,
  scale: number,
): House {
  const [ahead] = viewOf(e, n);
  const u = 1000 / ahead;
  const x = (1000 * viewOf(e, n)[1]) / ahead;
  const y = yAt(ahead, up);
  const gable = rng() < 0.45;
  const w = size.w * scale * u;
  const h = size.h * scale * u;
  // The north side seen 78° off square: about a fifth of its depth.
  const s = size.d * scale * u * 0.21;
  const r = gable ? w * (0.5 + rng() * 0.25) : size.d * scale * u * 0.42;
  const storeys = Math.max(1, Math.round(size.h / 3.4));
  const bays = Math.max(1, Math.round(size.w / 3.2));
  const nCh = rng() < 0.85 ? 1 + (rng() < 0.4 ? 1 : 0) : 0;
  const chimneys: number[] = [];
  for (let i = 0; i < nCh; i++) chimneys.push(0.12 + rng() * 0.76);
  return {
    x,
    y,
    w,
    h,
    s,
    r,
    gable,
    wall: tones(MAT[material], ahead),
    roof: tones(MAT[roof], ahead),
    shadow,
    storeys,
    bays,
    chimneys,
    seed: Math.floor(rng() * 1e6),
    distance: ahead,
  };
}

/** The house's whole silhouette (walls and roof), for paper and clipping. */
function silhouette(p: Path2D, o: House): void {
  const { x, y, w, h, s, r } = o;
  const l = x - w / 2;
  const rt = x + w / 2;
  if (o.gable) {
    p.moveTo(l - s, y);
    p.lineTo(rt, y);
    p.lineTo(rt, y + h);
    p.lineTo(x, y + h + r);
    p.lineTo(x - s, y + h + r);
    p.lineTo(l - s, y + h);
  } else {
    p.moveTo(l - s, y);
    p.lineTo(rt, y);
    p.lineTo(rt, y + h);
    p.lineTo(rt - s / 2, y + h + r);
    p.lineTo(l - s / 2, y + h + r);
    p.lineTo(l - s, y + h);
  }
  p.closePath();
}

/** Paints a list of houses, far to near, in colour. */
export function paintHouses(c: PlateCanvas, houses: readonly House[]): void {
  const { ctx } = c;
  for (const o of houses) {
    const { x, y, w, h, s, r } = o;
    const l = x - w / 2;
    const rt = x + w / 2;
    const rng = createRng(o.seed);
    // The north side, grazed.
    ctx.fillStyle = o.wall.graze;
    ctx.fillRect(l - s, y, s, h);
    // The front, lit square-on, a touch brighter toward the eaves.
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix(o.wall.lit, o.wall.graze, 0.25));
    g.addColorStop(1, o.wall.lit);
    ctx.fillStyle = g;
    ctx.fillRect(l, y, w, h);
    if (o.gable) {
      // The gable end, lit; the north slope of the roof beside it.
      ctx.fillStyle = o.wall.lit;
      ctx.beginPath();
      ctx.moveTo(l, y + h);
      ctx.lineTo(rt, y + h);
      ctx.lineTo(x, y + h + r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.roof.graze;
      ctx.beginPath();
      ctx.moveTo(l - s * 1.05, y + h - r * 0.02);
      ctx.lineTo(l, y + h);
      ctx.lineTo(x, y + h + r);
      ctx.lineTo(x - s, y + h + r);
      ctx.closePath();
      ctx.fill();
      // The verge catching the sun.
      ctx.strokeStyle = rgba(o.roof.lit, 0.9);
      ctx.lineWidth = c.pen(0.7);
      ctx.beginPath();
      ctx.moveTo(l - w * 0.04, y + h - r * 0.06);
      ctx.lineTo(x, y + h + r);
      ctx.lineTo(rt + w * 0.04, y + h - r * 0.06);
      ctx.stroke();
    } else {
      // The west slope over the eaves, lit; the north gable beside it.
      ctx.fillStyle = o.wall.graze;
      ctx.beginPath();
      ctx.moveTo(l - s, y + h);
      ctx.lineTo(l, y + h);
      ctx.lineTo(l - s / 2, y + h + r);
      ctx.closePath();
      ctx.fill();
      const rg = ctx.createLinearGradient(0, y + h, 0, y + h + r);
      rg.addColorStop(0, mix(o.roof.lit, o.roof.graze, 0.35));
      rg.addColorStop(1, o.roof.lit);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(l - w * 0.05, y + h - r * 0.05);
      ctx.lineTo(rt + w * 0.05, y + h - r * 0.05);
      ctx.lineTo(rt - s / 2, y + h + r);
      ctx.lineTo(l - s / 2, y + h + r);
      ctx.closePath();
      ctx.fill();
      // The eaves' line of shade.
      ctx.fillStyle = rgba(o.wall.shade, 0.55);
      ctx.fillRect(
        l,
        y + h - Math.min(0.5, h * 0.08),
        w,
        Math.min(0.5, h * 0.08),
      );
    }
    // Windows by storeys and bays; a few catch the sun.
    if (w > 2.2 && h > 2.4) {
      const sh = h / o.storeys;
      const bw = w / o.bays;
      const ww = Math.max(0.28, bw * 0.34);
      const wh = Math.max(0.4, sh * 0.42);
      for (let i = 0; i < o.storeys; i++) {
        for (let j = 0; j < o.bays; j++) {
          if (rng() < 0.12) continue;
          const wx = l + bw * (j + 0.5) - ww / 2;
          const wy = y + sh * (i + 0.38);
          const glint = rng() < 0.035;
          ctx.fillStyle = glint
            ? MAT.glint
            : mix(MAT.window, o.wall.shade, 0.35);
          ctx.globalAlpha = glint ? 0.95 : 0.8;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.globalAlpha = 1;
        }
      }
    }
    // The shadow of the roofs between this front and the sun.
    if (o.shadow > 0.02) {
      const top = y + h * o.shadow;
      ctx.fillStyle = rgba(MAT.shadow, 0.42);
      ctx.beginPath();
      ctx.moveTo(l - s, y);
      ctx.lineTo(rt, y);
      ctx.lineTo(rt, top + (rng() - 0.5) * h * 0.12);
      ctx.lineTo(x + w * (rng() - 0.5) * 0.4, top + (rng() - 0.5) * h * 0.18);
      ctx.lineTo(l - s, top + (rng() - 0.5) * h * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // Chimneys on the ridge: lit west face, shaded flank.
    for (const t of o.chimneys) {
      const cw = Math.max(0.35, w * 0.08);
      const ch = Math.max(0.6, r * 0.45);
      const cx = o.gable ? x - s * t : l - s / 2 + w * t;
      const cy = y + h + r - (o.gable ? 0 : 0) - ch * 0.25;
      ctx.fillStyle = o.wall.lit;
      ctx.fillRect(cx - cw / 2, cy, cw * 0.65, ch);
      ctx.fillStyle = o.wall.shade;
      ctx.fillRect(cx - cw / 2 + cw * 0.65, cy, cw * 0.35, ch);
    }
  }
}

/** Engraves a list of houses, far to near: paper, contours, hatching on the shaded and grazed parts. */
export function engraveHouses(c: PlateCanvas, houses: readonly House[]): void {
  const { ctx } = c;
  for (const o of houses) {
    const { x, y, w, h, s, r } = o;
    const l = x - w / 2;
    const rt = x + w / 2;
    const pen = penAt(o.distance);
    const rng = createRng(o.seed);
    const body = new Path2D();
    silhouette(body, o);
    ctx.fillStyle = PAPER.low;
    ctx.fill(body);
    // Hatching: the north side (vertical), the shadowed foot (diagonal), the roof's grazed slope.
    const hp = new Path2D();
    const step = c.pen(pen * 2.2);
    for (let hx = l - s + step * 0.5; hx < l; hx += step) {
      hp.moveTo(hx, y);
      hp.lineTo(hx, y + h);
    }
    if (o.shadow > 0.05) {
      const top = y + h * o.shadow;
      for (let k = l - s - (top - y); k < rt; k += step * 1.3) {
        const x0 = Math.max(l - s, k);
        const y0 = y + (x0 - k);
        const x1 = Math.min(rt, k + (top - y));
        if (x1 <= x0) continue;
        hp.moveTo(x0, y0);
        hp.lineTo(x1, y + (x1 - k));
      }
    }
    if (o.gable) {
      for (let t = 0.2; t < 1; t += 0.28) {
        hp.moveTo(l - s * t, y + h);
        hp.lineTo(x - s * t, y + h + r);
      }
    } else {
      // Courses of tile or slate along the lit slope, sparse.
      for (let t = 0.3; t < 1; t += 0.33) {
        hp.moveTo(l - (s / 2) * t, y + h + r * t);
        hp.lineTo(rt - (s / 2) * t, y + h + r * t);
      }
    }
    ctx.strokeStyle = rgba(INK.hatch, 0.85);
    ctx.lineWidth = c.pen(pen * 0.6);
    ctx.stroke(hp);
    // Contours: the outline and the corner between the front and the side.
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen);
    ctx.stroke(body);
    ctx.beginPath();
    ctx.moveTo(l, y);
    ctx.lineTo(l, y + h);
    if (o.gable) ctx.lineTo(x, y + h + r);
    else ctx.lineTo(rt, y + h);
    ctx.stroke();
    // Windows as small dark marks.
    if (w > 2.6 && h > 2.8) {
      const sh = h / o.storeys;
      const bw = w / o.bays;
      ctx.fillStyle = rgba(INK.line, 0.75);
      for (let i = 0; i < o.storeys; i++)
        for (let j = 0; j < o.bays; j++) {
          if (rng() < 0.15) continue;
          ctx.fillRect(
            l + bw * (j + 0.5) - bw * 0.14,
            y + sh * (i + 0.38),
            bw * 0.28,
            sh * 0.36,
          );
        }
    }
  }
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
