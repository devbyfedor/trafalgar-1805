import { PLACES, RAMPART_HEIGHT, RAMPARTS, TOWN_GROUND } from "../geo";
import { createRng, field, mix, type Pt, rgba, softBlob } from "../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../paint/plate";
import { BUILD, VEX, viewOf } from "../scene";
import {
  type Box,
  brokenLine,
  distToPoly,
  engraveHouses,
  fadeEdges,
  groundSkyline,
  type House,
  inside,
  MAT,
  makeHouse,
  paintHouses,
  penAt,
  riverSide,
  smooth,
  strokeLines,
  sunOn,
  tones,
  townGround,
  unitsPerM,
  yAt,
} from "./town/kit";

/**
 * The town (brief, "Owner review": separate houses with roofs, the belfry
 * with the telegraph, the upper town's ramparts with their gates): the
 * walled upper town corner-on to the sea on its plateau, its belfry with
 * the Chappe telegraph standing against Mont Lambert, and the lower town
 * stepping from the quays up the slopes to it, in two plates by depth.
 * Lit by the low sun from behind the eye: the west fronts gold, the north
 * sides grazed, the south sides unseen; each house's foot in the shadow
 * of the roofs in front.
 */

// ----------------------------------------------------------- the smoke

/**
 * Chimneys of the lower town with a thread of smoke (metres east, north,
 * and up as drawn: the ground's VEX and the house's BUILD), for the main
 * session's smoke canvas.
 */
export const TOWN_SMOKE: readonly {
  east: number;
  north: number;
  up: number;
}[] = (
  [
    [520, 170, 12],
    [700, -90, 11],
    [880, -380, 12],
    [1000, -640, 13],
    [780, 120, 10],
  ] as const
).map(([east, north, h]) => ({
  east,
  north,
  up: Math.round(townGround(east, north) * VEX + h * BUILD + 2),
}));

// ----------------------------------------------------------- the lower town

const LOWER_BOX: Box = [-360, 262, -34, 60];

/** Where the lower-town plates split, metres ahead. */
const SPLIT = 1960;

let lowerCache: { near: House[]; far: House[] } | undefined;

/** The plots' layout in progress: a few columns of the grid per job. */
let lowerGen:
  | {
      rng: () => number;
      shade: (x: number, y: number) => number;
      all: House[];
      e: number;
    }
  | undefined;

const PLOT = 24;
const PLOT_E1 = 1500;

/**
 * Lays out the next `columns` columns of the lower town's plots: a
 * jittered grid on the town's bank from the quays up the slopes (la
 * Beurrière under the north cliff, the streets up to the Porte des
 * Dunes, Saint-Nicolas' quarter), the quay fronts taller, gardens
 * between, none in the ditch and on the glacis round the walls.
 */
function lowerColumns(columns: number): void {
  if (lowerCache) return;
  lowerGen ??= {
    rng: createRng(4127),
    shade: field(77, 260, 2),
    all: [],
    e: 230,
  };
  const gen = lowerGen;
  const { rng, shade, all } = gen;
  const step = PLOT;
  for (let k = 0; k < columns && gen.e <= PLOT_E1; k++, gen.e += step) {
    const e = gen.e;
    for (let n = -1150; n <= 430; n += step) {
      const pe = e + (rng() - 0.5) * step * 0.8;
      const pn = n + (rng() - 0.5) * step * 0.8;
      const { d, side } = riverSide(pe, pn);
      if (side <= 0 || d < 30) continue;
      if (pn > 200 && pe > 820) continue;
      // The ditch, the glacis and the gardens round the walls: no houses.
      if (distToPoly(RAMPARTS, pe, pn) < 85) continue;
      const g = townGround(pe, pn);
      if (g > 50.5) continue;
      const [ahead, right] = viewOf(pe, pn);
      const x = (1000 * right) / ahead;
      if (x < -345 || x > 248 || ahead < 1420 || ahead > 2500) continue;
      // Fewer plots on the steep and the far: gardens between.
      if (rng() < (d > 380 ? 0.45 : 0.18)) continue;
      const quay = d < 75;
      const size = {
        w: 6 + rng() * 5,
        d: 8 + rng() * 6,
        h: quay ? 9 + rng() * 4 : 6.5 + rng() * 4.5,
      };
      const material = rng() < 0.62 ? "plaster" : "stone";
      const roof = rng() < 0.74 ? "tile" : "slate";
      const sh = quay ? 0.04 : 0.22 + 0.25 * (shade(pe, pn) + 1) * 0.5;
      all.push(
        makeHouse(rng, pe, pn, g * VEX, size, material, roof, sh, BUILD),
      );
    }
  }
}

/** The lower town's houses, far to near, with Saint-Nicolas and the flotilla's store at the harbour's head. */
function lowerHouses(): { near: House[]; far: House[] } {
  if (lowerCache) return lowerCache;
  while (!lowerGen || lowerGen.e <= PLOT_E1) lowerColumns(60);
  const { rng, all } = lowerGen;
  // Saint-Nicolas: a long nave, its west front lit (no tall tower).
  const [se, sn] = PLACES.saintNicolas;
  const church = makeHouse(
    rng,
    se,
    sn,
    townGround(se, sn) * VEX,
    { w: 18, d: 40, h: 15 },
    "stone",
    "slate",
    0.15,
    BUILD,
  );
  church.gable = true;
  church.r = church.w * 0.55;
  church.storeys = 2;
  church.bays = 3;
  all.push(church);
  // The flotilla's store at the harbour's head: three storeys, 76 m.
  const store = makeHouse(
    rng,
    655,
    -330,
    townGround(655, -330) * VEX,
    { w: 36, d: 12, h: 11 },
    "plaster",
    "tile",
    0.05,
    BUILD,
  );
  store.gable = false;
  store.r = store.h * 0.34;
  store.storeys = 3;
  store.bays = 14;
  store.chimneys = [0.2, 0.5, 0.8];
  all.push(store);
  all.sort((a, b) => b.distance - a.distance);
  lowerCache = {
    near: all.filter((h) => h.distance <= SPLIT),
    far: all.filter((h) => h.distance > SPLIT),
  };
  return lowerCache;
}

/** The ground of a band of the lower town: its skyline at the band's far edge, down to the box's foot. */
function lowerGround(near: number, far: number): Pt[] {
  const [x0, x1] = LOWER_BOX;
  const floor = -4;
  return groundSkyline(
    x0,
    x1,
    4,
    near,
    far,
    floor,
    (e, n) => distToPoly(RAMPARTS, e, n) < 45,
  ).map(([x, y]) => {
    // Taper to the floor at the box's sides: no cut edge.
    const k = smooth((x - x0) / 50) * smooth((x1 - x) / 50);
    return [x, floor + (y - floor) * k] as Pt;
  });
}

function paintGround(
  c: PlateCanvas,
  line: readonly Pt[],
  bottom: number,
  distance: number,
  seed: number,
): void {
  const { ctx } = c;
  const g = tones(MAT.grass, distance);
  const mud = tones(MAT.mud, distance);
  const p = new Path2D();
  p.moveTo(line[0][0], bottom);
  for (const [x, y] of line) p.lineTo(x, y);
  p.lineTo(line[line.length - 1][0], bottom);
  p.closePath();
  const top = Math.max(...line.map((q) => q[1]));
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, g.lit);
  grad.addColorStop(0.45, g.graze);
  grad.addColorStop(0.75, mix(g.shade, mud.wet, 0.5));
  grad.addColorStop(1, mud.wet);
  ctx.fillStyle = grad;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  const rng = createRng(seed);
  for (let i = 0; i < 70; i++) {
    const x = line[0][0] + rng() * (line[line.length - 1][0] - line[0][0]);
    const y = bottom + rng() * (top - bottom);
    softBlob(
      c,
      x,
      y,
      8 + rng() * 22,
      2 + rng() * 4,
      rng() < 0.5 ? g.shade : g.lit,
      0.25,
    );
  }
  ctx.restore();
}

function engraveGround(
  c: PlateCanvas,
  line: readonly Pt[],
  bottom: number,
  distance: number,
  seed: number,
): void {
  const { ctx } = c;
  const p = new Path2D();
  p.moveTo(line[0][0], bottom);
  for (const [x, y] of line) p.lineTo(x, y);
  p.lineTo(line[line.length - 1][0], bottom);
  p.closePath();
  ctx.fillStyle = PAPER.low;
  ctx.fill(p);
  // The ground's contour: the slope's line only (never the box's foot).
  const pen = penAt(distance);
  strokeLines(c, brokenLine(line, 60, 4, seed), pen * 0.8, INK.hatch, 0.9);
  // Contour-following hatching on the slope, below the skyline.
  const lines: Pt[][] = [];
  for (let k = 1; k < 9; k++) {
    const drop = k * k * 0.55;
    const l = line.map(([x, y]) => [x, y - drop] as Pt);
    lines.push(...brokenLine(l, 10 + k * 2, 6 + k, seed + k));
  }
  ctx.save();
  ctx.clip(p);
  strokeLines(c, lines, pen * 0.5, INK.hatch, 0.55);
  ctx.restore();
}

function lowerPlate(id: string, which: "near" | "far"): Plate {
  const near = which === "near" ? 1400 : SPLIT;
  const far = which === "near" ? SPLIT : 2450;
  const depth = which === "near" ? 1760 : 2180;
  const jobs = (mode: PlateMode): PlateJob[] => {
    const out: PlateJob[] = [];
    for (let k = 0; k < 9; k++) out.push(() => lowerColumns(6));
    out.push(() => void lowerHouses());
    out.push((c) => {
      const line = lowerGround(near, far);
      if (mode === "colour") paintGround(c, line, LOWER_BOX[2], depth, 31);
      else engraveGround(c, line, LOWER_BOX[2], depth, 31);
      fadeEdges(c, LOWER_BOX, 0, 28);
    });
    const per = 50;
    const count = () => lowerHouses()[which].length;
    // Jobs are listed up front; each draws its slice of the houses.
    for (let i = 0; i < 1400; i += per) {
      out.push((c) => {
        if (i >= count()) return;
        const slice = lowerHouses()[which].slice(i, i + per);
        if (mode === "colour") paintHouses(c, slice);
        else engraveHouses(c, slice);
      });
    }
    return out;
  };
  return { id, depth, box: LOWER_BOX, group: "land", jobs };
}

// ----------------------------------------------------------- the upper town

const UPPER_BOX: Box = [-70, 182, 24, 92];
const UPPER_DEPTH = 2500;

/** The walls' foot (outside) and top, metres as drawn. */
const FOOT = 50 * VEX;
const TOP = FOOT + RAMPART_HEIGHT * BUILD;

interface Upper {
  /** The north-west face (lit) and the south-west face (grazed), foot and top lines. */
  nw: { foot: Pt[]; top: Pt[] };
  sw: { foot: Pt[]; top: Pt[] };
  towers: { x: number; y0: number; y1: number; r: number }[];
  gate: { x: number; y0: number; y1: number; r: number; arch: number };
  trees: { x: number; y: number; rx: number; ry: number; seed: number }[];
  houses: House[];
  belfry: { x: number; y0: number; y1: number; y2: number; w: number };
  chateau: { x: number; y0: number; y1: number; r: number }[];
  ground: Pt[];
}

let upperCache: Upper | undefined;

function lerpEN(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function proj(e: number, n: number, up: number): Pt {
  const [ahead, right] = viewOf(e, n);
  return [(1000 * right) / ahead, yAt(ahead, up)];
}

function upper(): Upper {
  if (upperCache) return upperCache;
  const [W, N, , S] = RAMPARTS;
  const face = (a: Pt, b: Pt) => {
    const foot: Pt[] = [];
    const top: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const [e, n] = lerpEN(a, b, i / 24);
      foot.push(proj(e, n, FOOT));
      top.push(proj(e, n, TOP));
    }
    return { foot, top };
  };
  const nw = face(N, W);
  const sw = face(W, S);
  const towers: Upper["towers"] = [];
  const along = (a: Pt, b: Pt, ts: readonly number[], radius: number) => {
    for (const t of ts) {
      const [e, n] = lerpEN(a, b, t);
      const u = unitsPerM(e, n);
      const [x, y0] = proj(e, n, FOOT - 2);
      const [, y1] = proj(e, n, TOP + 1.2 * BUILD);
      towers.push({ x, y0, y1, r: radius * BUILD * u });
    }
  };
  along(N, W, [0, 0.2, 0.42, 0.62, 1], 6.5);
  along(W, S, [0.45, 1], 6.5);
  // The Porte des Dunes, toward the lower town and the harbour.
  const [ge, gn] = lerpEN(N, W, 0.8);
  const gu = unitsPerM(ge, gn);
  const [gx, gy0] = proj(ge, gn, FOOT - 1);
  const [, gy1] = proj(ge, gn, TOP + 4 * BUILD);
  const gate = {
    x: gx,
    y0: gy0,
    y1: gy1,
    r: 4.2 * BUILD * gu,
    arch: 3.4 * BUILD * gu,
  };
  // A double row of trees along the ramparts' walk.
  const rng = createRng(911);
  const trees: Upper["trees"] = [];
  const row = (a: Pt, b: Pt, inset: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Inward normal (toward the town's middle).
    const cx = (RAMPARTS[0][0] + RAMPARTS[2][0]) / 2;
    const cy = (RAMPARTS[0][1] + RAMPARTS[2][1]) / 2;
    for (let s = 6; s < len - 4; s += 7 + rng() * 5) {
      if (rng() < 0.12) continue;
      const [e0, n0] = lerpEN(a, b, s / len);
      const k = inset / Math.hypot(cx - e0, cy - n0);
      const e = e0 + (cx - e0) * k;
      const n = n0 + (cy - n0) * k;
      const u = unitsPerM(e, n);
      const [x, y] = proj(e, n, TOP - 2);
      trees.push({
        x,
        y,
        rx: (4.5 + rng() * 2) * BUILD * u * 0.5,
        ry: (6 + rng() * 3) * BUILD * u * 0.5,
        seed: Math.floor(rng() * 1e6),
      });
    }
  };
  row(N, W, 14);
  row(N, W, 26);
  row(W, S, 14);
  row(W, S, 26);
  trees.sort((a, b) => a.y - b.y);
  // Houses inside: only their roofs show above the walls and between the trees.
  const houses: House[] = [];
  for (let e = 1100; e < 1700; e += 21) {
    for (let n = -780; n < -250; n += 21) {
      const pe = e + (rng() - 0.5) * 12;
      const pn = n + (rng() - 0.5) * 12;
      if (!inside(RAMPARTS, pe, pn)) continue;
      if (rng() < 0.2) continue;
      houses.push(
        makeHouse(
          rng,
          pe,
          pn,
          TOWN_GROUND * VEX,
          { w: 7 + rng() * 6, d: 10 + rng() * 5, h: 10 + rng() * 6 },
          rng() < 0.5 ? "plaster" : "stone",
          rng() < 0.6 ? "tile" : "slate",
          0.5,
          BUILD,
        ),
      );
    }
  }
  houses.sort((a, b) => b.distance - a.distance);
  // The belfry: foot 52 m, the square tower and its octagonal top stage (37 m).
  const [be, bn] = PLACES.belfry;
  const bu = unitsPerM(be, bn);
  const [bx, by0] = proj(be, bn, 52 * VEX);
  const [, by1] = proj(be, bn, 52 * VEX + 27 * BUILD);
  const [, by2] = proj(be, bn, 52 * VEX + 37 * BUILD);
  const belfry = { x: bx, y0: by0, y1: by1, y2: by2, w: 10 * BUILD * bu };
  // The château's round towers at the far corner, barely over the walls.
  const [ce, cn] = PLACES.chateau;
  const cu = unitsPerM(ce, cn);
  const chateau = [-12, 0, 14].map((off) => {
    const [x, y0] = proj(ce + off, cn - off * 0.6, TOWN_GROUND * VEX);
    const [, y1] = proj(
      ce + off,
      cn - off * 0.6,
      TOWN_GROUND * VEX + 19 * BUILD,
    );
    return { x, y0, y1, r: 5 * BUILD * cu };
  });
  // The slope below the walls.
  const left = groundSkyline(
    UPPER_BOX[0],
    nw.foot[0][0] - 2,
    3,
    2300,
    2700,
    20,
  );
  const right = groundSkyline(
    sw.foot[sw.foot.length - 1][0] + 2,
    UPPER_BOX[1],
    3,
    2300,
    2800,
    20,
  );
  const ground: Pt[] = [...left, ...nw.foot, ...sw.foot.slice(1), ...right];
  upperCache = { nw, sw, towers, gate, trees, houses, belfry, chateau, ground };
  return upperCache;
}

function facePath(f: { foot: Pt[]; top: Pt[] }): Path2D {
  const p = new Path2D();
  p.moveTo(f.foot[0][0], f.foot[0][1]);
  for (const q of f.foot) p.lineTo(q[0], q[1]);
  for (let i = f.top.length - 1; i >= 0; i--)
    p.lineTo(f.top[i][0], f.top[i][1]);
  p.closePath();
  return p;
}

const AIR_UP = UPPER_DEPTH;

function paintUpperGround(c: PlateCanvas): void {
  const u = upper();
  const { ctx } = c;
  const g = tones(MAT.grass, AIR_UP);
  const p = new Path2D();
  p.moveTo(UPPER_BOX[0], UPPER_BOX[2]);
  for (const [x, y] of u.ground) p.lineTo(x, y);
  p.lineTo(UPPER_BOX[1], UPPER_BOX[2]);
  p.closePath();
  if (c.mode === "colour") {
    const grad = ctx.createLinearGradient(0, 55, 0, UPPER_BOX[2]);
    grad.addColorStop(0, g.lit);
    grad.addColorStop(0.6, g.graze);
    grad.addColorStop(1, g.shade);
    ctx.fillStyle = grad;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    const rng = createRng(53);
    for (let i = 0; i < 24; i++)
      softBlob(
        c,
        -60 + rng() * 240,
        26 + rng() * 26,
        6 + rng() * 14,
        1.5 + rng() * 2.5,
        rng() < 0.5 ? g.shade : g.lit,
        0.3,
      );
    ctx.restore();
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    const pen = penAt(AIR_UP);
    const lines: Pt[][] = [];
    for (let k = 1; k < 7; k++)
      lines.push(
        ...brokenLine(
          u.ground.map(([x, y]) => [x, y - k * 1.6] as Pt),
          8,
          5,
          70 + k,
        ),
      );
    ctx.save();
    ctx.clip(p);
    strokeLines(c, lines, pen * 0.5, INK.hatch, 0.5);
    ctx.restore();
  }
}

function paintInterior(c: PlateCanvas, from: number, to: number): void {
  // Only their roofs show: the walls and the trees, painted after, hide the fronts.
  const list = upper().houses.slice(from, to);
  if (c.mode === "colour") paintHouses(c, list);
  else engraveHouses(c, list);
}

function paintChateau(c: PlateCanvas): void {
  const { ctx } = c;
  const t = tones(MAT.rampart, 2800);
  for (const k of upper().chateau) {
    const p = new Path2D();
    p.rect(k.x - k.r, k.y0, 2 * k.r, k.y1 - k.y0);
    if (c.mode === "colour") {
      const g = ctx.createLinearGradient(k.x - k.r, 0, k.x + k.r, 0);
      g.addColorStop(0, t.graze);
      g.addColorStop(0.35, t.lit);
      g.addColorStop(1, t.shade);
      ctx.fillStyle = g;
      ctx.fill(p);
      ctx.fillStyle = tones(MAT.slate, 2800).graze;
      ctx.beginPath();
      ctx.moveTo(k.x - k.r * 1.1, k.y1);
      ctx.lineTo(k.x, k.y1 + k.r * 1.6);
      ctx.lineTo(k.x + k.r * 1.1, k.y1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = PAPER.low;
      ctx.fill(p);
      ctx.strokeStyle = INK.line;
      ctx.lineWidth = c.pen(0.8);
      ctx.stroke(p);
    }
  }
}

/** The belfry: the square stone tower, its octagonal top stage, and the Chappe telegraph on it. */
function paintBelfry(c: PlateCanvas): void {
  const { ctx } = c;
  const b = upper().belfry;
  const t = tones(MAT.stone, 2533);
  const w = b.w;
  const s = w * 0.21;
  const l = b.x - w / 2;
  const ow = w * 0.72;
  const ol = b.x - ow / 2;
  const oct = new Path2D();
  oct.rect(ol, b.y1, ow, b.y2 - b.y1);
  const sq = new Path2D();
  sq.rect(l - s, b.y0, w + s, b.y1 - b.y0);
  // The telegraph: a mast, the regulator across it, two indicators.
  const mastTop = b.y2 + w * 0.62;
  const reg = w * 0.5;
  const regY = mastTop - w * 0.05;
  const tilt = 0.18;
  const arms: Pt[][] = [
    [
      [b.x, b.y2 + w * 0.12],
      [b.x, mastTop],
    ],
    [
      [b.x - reg, regY - reg * tilt],
      [b.x + reg, regY + reg * tilt],
    ],
    [
      [b.x - reg, regY - reg * tilt],
      [b.x - reg - w * 0.12, regY - reg * tilt + w * 0.36],
    ],
    [
      [b.x + reg, regY + reg * tilt],
      [b.x + reg + w * 0.3, regY + reg * tilt - w * 0.16],
    ],
  ];
  if (c.mode === "colour") {
    ctx.fillStyle = t.graze;
    ctx.fillRect(l - s, b.y0, s, b.y1 - b.y0);
    const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, mix(t.lit, t.graze, 0.3));
    g.addColorStop(1, t.lit);
    ctx.fillStyle = g;
    ctx.fillRect(l, b.y0, w, b.y1 - b.y0);
    // Belfry openings and the string course.
    ctx.fillStyle = rgba(MAT.window, 0.75);
    const oh = (b.y1 - b.y0) * 0.16;
    for (const k of [-0.22, 0.22])
      ctx.fillRect(b.x + k * w - w * 0.08, b.y1 - oh * 1.5, w * 0.16, oh);
    ctx.fillRect(
      b.x - w * 0.06,
      b.y0 + (b.y1 - b.y0) * 0.45,
      w * 0.12,
      oh * 0.7,
    );
    ctx.fillStyle = rgba(t.shade, 0.6);
    ctx.fillRect(l - s, b.y1 - 0.4, w + s, 0.5);
    // The octagon: facets lit from the left.
    const fw = ow / 3;
    const cols = [t.graze, t.lit, mix(t.lit, t.shade, 0.45)];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[i];
      ctx.fillRect(ol + i * fw, b.y1, fw + 0.05, b.y2 - b.y1);
    }
    ctx.fillStyle = rgba(MAT.window, 0.7);
    ctx.fillRect(
      b.x - fw * 0.22,
      b.y1 + (b.y2 - b.y1) * 0.3,
      fw * 0.44,
      (b.y2 - b.y1) * 0.45,
    );
    // A low lead cap.
    ctx.fillStyle = tones(MAT.slate, 2533).graze;
    ctx.beginPath();
    ctx.moveTo(ol - 0.3, b.y2);
    ctx.quadraticCurveTo(b.x, b.y2 + w * 0.32, ol + ow + 0.3, b.y2);
    ctx.closePath();
    ctx.fill();
    strokeLines(c, arms, 1.1, "#3d3634", 0.95);
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(sq);
    ctx.fill(oct);
    const pen = penAt(2533);
    const hp: Pt[][] = [];
    for (let x = l - s + 0.4; x < l; x += c.pen(1.6))
      hp.push([
        [x, b.y0],
        [x, b.y1],
      ]);
    for (let x = ol + 2 * (ow / 3); x < ol + ow; x += c.pen(1.5))
      hp.push([
        [x, b.y1],
        [x, b.y2],
      ]);
    strokeLines(c, hp, pen * 0.55, INK.hatch, 0.8);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen);
    ctx.stroke(sq);
    ctx.stroke(oct);
    ctx.beginPath();
    ctx.moveTo(l, b.y0);
    ctx.lineTo(l, b.y1);
    ctx.moveTo(ol - 0.3, b.y2);
    ctx.quadraticCurveTo(b.x, b.y2 + w * 0.32, ol + ow + 0.3, b.y2);
    ctx.stroke();
    ctx.fillStyle = INK.line;
    const oh = (b.y1 - b.y0) * 0.16;
    for (const k of [-0.22, 0.22])
      ctx.fillRect(b.x + k * w - w * 0.07, b.y1 - oh * 1.5, w * 0.14, oh);
    strokeLines(c, arms, 1.1, INK.line, 1);
  }
}

function paintTrees(c: PlateCanvas, from: number, to: number): void {
  const { ctx } = c;
  const t = tones(MAT.tree, 2400);
  const list = upper().trees.slice(from, to);
  for (const tr of list) {
    const rng = createRng(tr.seed);
    const blobs: [number, number, number, number][] = [];
    for (let k = 0; k < 4; k++)
      blobs.push([
        tr.x + (rng() - 0.5) * tr.rx * 0.9,
        tr.y + tr.ry * (0.9 + rng() * 0.9),
        tr.rx * (0.55 + rng() * 0.3),
        tr.ry * (0.5 + rng() * 0.25),
      ]);
    if (c.mode === "colour") {
      for (const [x, y, rx, ry] of blobs) {
        ctx.fillStyle = t.shade;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [x, y, rx, ry] of blobs) {
        ctx.fillStyle = t.mid;
        ctx.beginPath();
        ctx.ellipse(
          x - rx * 0.18,
          y + ry * 0.1,
          rx * 0.75,
          ry * 0.78,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = rgba(t.lit, 0.85);
        ctx.beginPath();
        ctx.ellipse(
          x - rx * 0.35,
          y + ry * 0.22,
          rx * 0.42,
          ry * 0.5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else {
      const p = new Path2D();
      for (const [x, y, rx, ry] of blobs) {
        p.moveTo(x + rx, y);
        p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = PAPER.low;
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      const hp: Pt[][] = [];
      for (let k = -tr.rx * 2; k < tr.rx * 2; k += c.pen(1.5))
        hp.push([
          [tr.x + k, tr.y],
          [tr.x + k + tr.ry * 2.2, tr.y + tr.ry * 2.2],
        ]);
      strokeLines(c, hp, 0.5, INK.hatch, 0.75);
      ctx.restore();
      ctx.strokeStyle = rgba(INK.line, 0.85);
      ctx.lineWidth = c.pen(0.7);
      ctx.stroke(p);
    }
  }
}

function paintWalls(c: PlateCanvas): void {
  const { ctx } = c;
  const u = upper();
  const t = tones(MAT.rampart, 2400);
  const nwP = facePath(u.nw);
  const swP = facePath(u.sw);
  const litNW = sunOn(308);
  const litSW = sunOn(211);
  if (c.mode === "colour") {
    ctx.fillStyle = mix(t.shade, t.graze, litSW * 2);
    ctx.fill(swP);
    const g = ctx.createLinearGradient(0, 46, 0, 64);
    g.addColorStop(0, mix(t.graze, t.lit, litNW * 0.7));
    g.addColorStop(1, t.lit);
    ctx.fillStyle = g;
    ctx.fill(nwP);
    // Courses of stone and the weathering, stacked thin.
    ctx.save();
    ctx.clip(nwP);
    const rng = createRng(17);
    ctx.strokeStyle = rgba(t.shade, 0.22);
    ctx.lineWidth = c.pen(0.5);
    ctx.beginPath();
    for (let k = 1; k < 9; k++) {
      const f = k / 9;
      ctx.moveTo(
        u.nw.foot[0][0],
        u.nw.foot[0][1] + (u.nw.top[0][1] - u.nw.foot[0][1]) * f,
      );
      const last = u.nw.foot.length - 1;
      ctx.lineTo(
        u.nw.foot[last][0],
        u.nw.foot[last][1] + (u.nw.top[last][1] - u.nw.foot[last][1]) * f,
      );
    }
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const q = u.nw.foot[Math.floor(rng() * u.nw.foot.length)];
      softBlob(
        c,
        q[0] + rng() * 4,
        q[1] + rng() * 6,
        2 + rng() * 5,
        1 + rng() * 2,
        t.shade,
        0.18,
      );
    }
    ctx.restore();
    // Parapet's lit edge.
    strokeLines(c, [u.nw.top], 0.8, mix(t.lit, MAT.glint, 0.35), 0.9);
    // Towers: half-round, lit left of the middle, shade at the right rim.
    for (const tw of u.towers) {
      const g2 = ctx.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
      g2.addColorStop(0, t.graze);
      g2.addColorStop(0.35, t.lit);
      g2.addColorStop(0.8, mix(t.lit, t.shade, 0.5));
      g2.addColorStop(1, t.shade);
      ctx.fillStyle = g2;
      ctx.fillRect(tw.x - tw.r, tw.y0, 2 * tw.r, tw.y1 - tw.y0);
      ctx.fillStyle = rgba(t.shade, 0.5);
      ctx.fillRect(tw.x - tw.r, tw.y1 - 0.5, 2 * tw.r, 0.5);
    }
    // The Porte des Dunes: two towers and the dark arch.
    const gt = u.gate;
    for (const k of [-1, 1]) {
      const g3 = ctx.createLinearGradient(
        gt.x + k * gt.r * 1.2 - gt.r * 0.7,
        0,
        gt.x + k * gt.r * 1.2 + gt.r * 0.7,
        0,
      );
      g3.addColorStop(0, t.graze);
      g3.addColorStop(0.4, t.lit);
      g3.addColorStop(1, t.shade);
      ctx.fillStyle = g3;
      ctx.fillRect(
        gt.x + k * gt.r * 1.2 - gt.r * 0.7,
        gt.y0,
        gt.r * 1.4,
        gt.y1 - gt.y0,
      );
    }
    ctx.fillStyle = mix(t.lit, t.graze, 0.3);
    ctx.fillRect(gt.x - gt.r * 0.6, gt.y0, gt.r * 1.2, (gt.y1 - gt.y0) * 0.85);
    ctx.fillStyle = mix(MAT.window, t.shade, 0.3);
    ctx.beginPath();
    ctx.moveTo(gt.x - gt.arch * 0.35, gt.y0);
    ctx.lineTo(gt.x - gt.arch * 0.35, gt.y0 + gt.arch * 0.7);
    ctx.arc(gt.x, gt.y0 + gt.arch * 0.7, gt.arch * 0.35, Math.PI, 0, true);
    ctx.lineTo(gt.x + gt.arch * 0.35, gt.y0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(swP);
    ctx.fill(nwP);
    const pen = penAt(2400);
    // The grazed south-west face hatched close; the lit face by its courses.
    ctx.save();
    ctx.clip(swP);
    const hs: Pt[][] = [];
    for (
      let x = u.sw.foot[0][0];
      x < u.sw.foot[u.sw.foot.length - 1][0];
      x += c.pen(1.5)
    )
      hs.push([
        [x, 40],
        [x, 70],
      ]);
    strokeLines(c, hs, pen * 0.55, INK.hatch, 0.85);
    ctx.restore();
    const courses: Pt[][] = [];
    for (let k = 1; k < 6; k++) {
      const f = k / 6;
      const l = u.nw.foot.map(
        (q, i) => [q[0], q[1] + (u.nw.top[i][1] - q[1]) * f] as Pt,
      );
      courses.push(...brokenLine(l, 9, 3, 300 + k));
    }
    strokeLines(c, courses, pen * 0.45, INK.hatch, 0.6);
    for (const tw of u.towers) {
      const p = new Path2D();
      p.rect(tw.x - tw.r, tw.y0, 2 * tw.r, tw.y1 - tw.y0);
      ctx.fillStyle = PAPER.low;
      ctx.fill(p);
      const hp: Pt[][] = [];
      for (let x = tw.x + tw.r * 0.35; x < tw.x + tw.r; x += c.pen(1.4))
        hp.push([
          [x, tw.y0],
          [x, tw.y1],
        ]);
      strokeLines(c, hp, pen * 0.5, INK.hatch, 0.8);
      strokeLines(
        c,
        [
          [
            [tw.x - tw.r, tw.y0],
            [tw.x - tw.r, tw.y1],
            [tw.x + tw.r, tw.y1],
            [tw.x + tw.r, tw.y0],
          ],
        ],
        pen,
        INK.line,
        1,
      );
    }
    const gt = u.gate;
    ctx.fillStyle = PAPER.low;
    ctx.fillRect(gt.x - gt.r * 1.9, gt.y0, gt.r * 3.8, gt.y1 - gt.y0);
    strokeLines(
      c,
      [
        [
          [gt.x - gt.r * 1.9, gt.y0],
          [gt.x - gt.r * 1.9, gt.y1],
          [gt.x - gt.r * 0.5, gt.y1],
        ],
        [
          [gt.x + gt.r * 0.5, gt.y1],
          [gt.x + gt.r * 1.9, gt.y1],
          [gt.x + gt.r * 1.9, gt.y0],
        ],
      ],
      pen,
      INK.line,
    );
    ctx.fillStyle = INK.line;
    ctx.beginPath();
    ctx.moveTo(gt.x - gt.arch * 0.35, gt.y0);
    ctx.lineTo(gt.x - gt.arch * 0.35, gt.y0 + gt.arch * 0.7);
    ctx.arc(gt.x, gt.y0 + gt.arch * 0.7, gt.arch * 0.35, Math.PI, 0, true);
    ctx.lineTo(gt.x + gt.arch * 0.35, gt.y0);
    ctx.closePath();
    ctx.fill();
    // The walls' true contours: the tops and the corner; never the feet's cut.
    strokeLines(c, [u.nw.top, u.sw.top], pen, INK.line, 1);
    const wc = u.nw.top[u.nw.top.length - 1];
    const wf = u.nw.foot[u.nw.foot.length - 1];
    strokeLines(c, [[wf, wc]], pen, INK.line, 1);
    strokeLines(c, brokenLine(u.nw.foot, 6, 3, 41), pen * 0.7, INK.line, 0.8);
  }
}

function upperPlate(): Plate {
  const jobs = (): PlateJob[] => {
    const out: PlateJob[] = [
      () => void upper(),
      (c) => paintUpperGround(c),
      (c) => paintChateau(c),
    ];
    for (let i = 0; i < 400; i += 45)
      out.push((c) => paintInterior(c, i, i + 45));
    out.push((c) => paintBelfry(c));
    for (let i = 0; i < 240; i += 40) out.push((c) => paintTrees(c, i, i + 40));
    out.push((c) => paintWalls(c));
    return out;
  };
  return {
    id: "upper-town",
    depth: UPPER_DEPTH,
    box: UPPER_BOX,
    group: "land",
    jobs,
  };
}

/** The town's plates, far to near. */
export function townPlates(): Plate[] {
  return [
    upperPlate(),
    lowerPlate("lower-town-far", "far"),
    lowerPlate("lower-town-near", "near"),
  ];
}
