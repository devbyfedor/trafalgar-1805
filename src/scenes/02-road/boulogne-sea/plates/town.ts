import { RAMPARTS } from "../geo";
import { createRng, mix, type Pt, rgba, softBlob } from "../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../paint/plate";
import {
  type Building,
  engraveBuildings,
  paintBuildings,
  townAir,
} from "./town/houses";
import {
  type Box,
  brokenLine,
  distToPoly,
  fadeEdges,
  groundSkyline,
  MAT,
  penAt,
  strokeLines,
  tones,
} from "./town/kit";
import {
  type Item,
  itemDistance,
  lowerItems,
  lowerRow,
  SMOKE_SITES,
  smokeTop,
  type Tree,
} from "./town/lower";
import {
  engraveBelfryTop,
  engraveTower,
  engraveTrees,
  engraveWalls,
  INTERIOR_ROWS,
  interiorHouses,
  interiorRows,
  paintBelfryTop,
  paintTower,
  paintTrees,
  paintWalls,
  UPPER_DEPTH,
  upper,
} from "./town/upper";

/**
 * The town (brief, "Owner review": separate houses with roofs, the belfry
 * with the telegraph, the upper town's ramparts with their gates): the
 * walled upper town corner-on to the sea on its plateau, its belfry with
 * the Chappe telegraph standing against Mont Lambert, and the lower town
 * in terraces from the quays up the slopes to it, in two plates by depth.
 * Every house is a box with a roof, lit by the low sun's true direction
 * (town/houses.ts); the plan is in town/lower.ts and town/upper.ts.
 */

// ----------------------------------------------------------- the smoke

/**
 * Chimneys of the lower town with a thread of smoke (metres east, north,
 * and up as drawn: the ground's VEX, the house's BUILD and its chimney's
 * top), for the main session's smoke canvas. A house stands at each with
 * its one chimney on its ridge's middle (town/lower.ts SMOKE_SITES).
 */
export const TOWN_SMOKE: readonly {
  east: number;
  north: number;
  up: number;
}[] = SMOKE_SITES.map(([east, north]) => ({
  east,
  north,
  up: smokeTop(east, north),
}));

// ----------------------------------------------------------- the lower town

const LOWER_BOX: Box = [-262, 292, -6, 64];

/** Where the lower-town plates split, metres ahead. */
const SPLIT = 1960;

/** The ground of a band of the lower town: the slope's skyline over the band's depths, never tapered into a cut. */
function lowerGround(near: number, far: number): Pt[] {
  const [x0, x1] = LOWER_BOX;
  return groundSkyline(
    x0,
    x1,
    3,
    near,
    far,
    -3,
    (e, n) => distToPoly(RAMPARTS, e, n) < 40,
  );
}

function groundPath(line: readonly Pt[], bottom: number): Path2D {
  const p = new Path2D();
  p.moveTo(line[0][0], bottom);
  for (const [x, y] of line) p.lineTo(x, y);
  p.lineTo(line[line.length - 1][0], bottom);
  p.closePath();
  return p;
}

/** The slopes between and behind the houses: gardens and grass lit gold above, the streets' dusk and the quays' wet stone below. */
function paintGround(
  c: PlateCanvas,
  line: readonly Pt[],
  distance: number,
  seed: number,
): void {
  const { ctx } = c;
  const g = tones(MAT.grass, distance);
  const mud = tones(MAT.mud, distance);
  const p = groundPath(line, LOWER_BOX[2]);
  const top = Math.max(...line.map((q) => q[1]));
  const grad = ctx.createLinearGradient(0, top, 0, LOWER_BOX[2]);
  grad.addColorStop(0, g.lit);
  grad.addColorStop(0.35, mix(g.graze, townAir("#a99178", distance), 0.4));
  grad.addColorStop(0.7, mix(g.shade, mud.wet, 0.5));
  grad.addColorStop(1, mud.wet);
  ctx.fillStyle = grad;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  const rng = createRng(seed);
  const x0 = line[0][0];
  const x1 = line[line.length - 1][0];
  for (let i = 0; i < 90; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = LOWER_BOX[2] + rng() * (top - LOWER_BOX[2]);
    softBlob(
      c,
      x,
      y,
      6 + rng() * 18,
      1.5 + rng() * 3,
      rng() < 0.5 ? g.shade : g.lit,
      0.22,
    );
  }
  // Hedges and garden walls along the slope: broken dark strokes with a lit top.
  const hedges: Pt[][] = [];
  for (let k = 1; k < 7; k++) {
    const drop = 2 + k * k * 0.45;
    hedges.push(
      ...brokenLine(
        line.map(([x, y]) => [x, y - drop] as Pt),
        6 + k,
        9,
        seed + k,
      ),
    );
  }
  strokeLines(c, hedges, 1, townAir("#5c6448", distance), 0.45);
  strokeLines(
    c,
    hedges.map((l) => l.map(([x, y]) => [x, y + 0.3] as Pt)),
    0.5,
    g.lit,
    0.5,
  );
  ctx.restore();
}

function engraveGround(
  c: PlateCanvas,
  line: readonly Pt[],
  distance: number,
  seed: number,
): void {
  const { ctx } = c;
  const p = groundPath(line, LOWER_BOX[2]);
  ctx.fillStyle = PAPER.low;
  ctx.fill(p);
  const pen = penAt(distance);
  // The slope's skyline: a light broken contour (never the box's foot).
  strokeLines(c, brokenLine(line, 40, 3, seed), pen * 0.7, INK.hatch, 0.85);
  // Contour-following hatching under it, closer down the slope; hedges as dotted lines.
  const lines: Pt[][] = [];
  for (let k = 1; k < 12; k++) {
    const drop = k * k * 0.32;
    lines.push(
      ...brokenLine(
        line.map(([x, y]) => [x, y - drop] as Pt),
        7 + k,
        4 + k * 0.6,
        seed + k,
      ),
    );
  }
  ctx.save();
  ctx.clip(p);
  strokeLines(c, lines, pen * 0.4, INK.hatch, 0.5);
  ctx.restore();
}

/** A garden tree's crown: seven or so foliage masses round an irregular crown, its foot on the trunk. */
function treeLobes(
  t: Tree,
  rng: () => number,
): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const n = 6 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng() * 0.7;
    const d = 0.3 + rng() * 0.45;
    out.push([
      t.x + Math.cos(a) * t.rx * d * 0.9,
      t.y + t.ry * 1.05 + Math.sin(a) * t.ry * d * 0.6,
      t.rx * (0.32 + rng() * 0.22),
      t.ry * (0.3 + rng() * 0.18),
    ]);
  }
  return out;
}

function paintTree(c: PlateCanvas, t: Tree): void {
  const { ctx } = c;
  const rng = createRng(t.seed);
  const dark = townAir("#465043", t.distance);
  const mid = townAir("#666d4b", t.distance);
  const lit = townAir("#9a925a", t.distance);
  const lobes = treeLobes(t, rng);
  // A short trunk.
  ctx.fillStyle = townAir("#4a4038", t.distance);
  ctx.fillRect(t.x - t.rx * 0.07, t.y, t.rx * 0.14, t.ry * 0.9);
  for (const [colour, dx, dy, s] of [
    [dark, 0, 0, 1],
    [mid, -0.12, 0.12, 0.78],
    [lit, -0.3, 0.3, 0.45],
  ] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const [x, y, rx, ry] of lobes) {
      const cx = x + rx * dx;
      const cy = y + ry * dy;
      ctx.moveTo(cx + rx * s, cy);
      ctx.ellipse(cx, cy, rx * s, ry * s, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function engraveTree(c: PlateCanvas, t: Tree): void {
  const { ctx } = c;
  const rng = createRng(t.seed);
  const pen = penAt(t.distance);
  const p = new Path2D();
  const lobes = treeLobes(t, rng);
  for (const [x, y, rx, ry] of lobes) {
    p.moveTo(x + rx, y);
    p.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = PAPER.low;
  ctx.fill(p);
  ctx.beginPath();
  for (const [x, y, rx, ry] of lobes) {
    for (let k = 0; k < 2; k++) {
      const r = 0.6 + k * 0.22;
      ctx.moveTo(x + Math.cos(-0.1) * rx * r, y + Math.sin(-0.1) * ry * r);
      ctx.ellipse(x, y, rx * r, ry * r, 0, -0.1, -1.7, true);
    }
  }
  ctx.strokeStyle = rgba(INK.hatch, 0.8);
  ctx.lineWidth = c.pen(pen * 0.4);
  ctx.stroke();
  ctx.beginPath();
  for (const [x, y, rx, ry] of lobes) {
    ctx.moveTo(x + Math.cos(0.2) * rx, y + Math.sin(0.2) * ry);
    ctx.ellipse(x, y, rx, ry, 0, 0.2, Math.PI - 0.1);
  }
  ctx.strokeStyle = rgba(INK.line, 0.85);
  ctx.lineWidth = c.pen(pen * 0.6);
  ctx.stroke();
}

function drawItems(c: PlateCanvas, items: readonly Item[]): void {
  // Runs of houses in one call; trees between them in their place.
  let run: Building[] = [];
  const flush = () => {
    if (!run.length) return;
    if (c.mode === "colour") paintBuildings(c, run);
    else engraveBuildings(c, run);
    run = [];
  };
  for (const it of items) {
    if (it.type === "house") run.push(it.b);
    else {
      flush();
      if (c.mode === "colour") paintTree(c, it.t);
      else engraveTree(c, it.t);
    }
  }
  flush();
}

const CHUNK = 20;

function lowerPlate(id: string, which: "near" | "far"): Plate {
  const near = which === "near" ? 1300 : SPLIT;
  const far = which === "near" ? SPLIT : 2520;
  const depth = which === "near" ? 1760 : 2180;
  let band: Item[] | undefined;
  const items = () => {
    band ??= lowerItems().filter((it) => {
      const d = itemDistance(it);
      return d > near && d <= far;
    });
    return band;
  };
  const jobs = (mode: PlateMode): PlateJob[] => {
    const out: PlateJob[] = [];
    // The plan, a row per job (shared by both plates: the first to run lays it out).
    for (let k = 0; k < 22; k++) out.push(() => void lowerRow());
    out.push(() => void items());
    out.push((c) => {
      const line = lowerGround(near, far);
      if (mode === "colour") paintGround(c, line, depth, 31);
      else engraveGround(c, line, depth, 31);
    });
    for (let i = 0; i < 1600; i += CHUNK)
      out.push((c) => {
        const list = items();
        if (i >= list.length) return;
        drawItems(c, list.slice(i, i + CHUNK));
      });
    // Soft sides and foot: the overscan never shows a cut when the camera rises.
    out.push((c) => fadeEdges(c, LOWER_BOX, 28, 4));
    return out;
  };
  return { id, depth, box: LOWER_BOX, group: "land", jobs };
}

// ----------------------------------------------------------- the upper town

const UPPER_BOX: Box = [-80, 196, 22, 92];

function paintUpperGround(c: PlateCanvas): void {
  const u = upper();
  const { ctx } = c;
  const p = groundPath(u.ground, UPPER_BOX[2]);
  if (c.mode === "colour") {
    const g = tones(MAT.grass, UPPER_DEPTH);
    const grad = ctx.createLinearGradient(0, 56, 0, UPPER_BOX[2]);
    grad.addColorStop(0, g.lit);
    grad.addColorStop(0.5, g.graze);
    grad.addColorStop(1, g.shade);
    ctx.fillStyle = grad;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    const rng = createRng(53);
    for (let i = 0; i < 40; i++)
      softBlob(
        c,
        -70 + rng() * 260,
        24 + rng() * 30,
        5 + rng() * 14,
        1.2 + rng() * 2.2,
        rng() < 0.5 ? g.shade : g.lit,
        0.28,
      );
    // The ditch's dusk along the walls' foot.
    const ditch = u.ground.map(([x, y]) => [x, y - 0.6] as Pt);
    strokeLines(c, [ditch], 2.2, townAir("#59586a", UPPER_DEPTH), 0.35);
    ctx.restore();
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    const pen = penAt(UPPER_DEPTH);
    const lines: Pt[][] = [];
    for (let k = 1; k < 9; k++)
      lines.push(
        ...brokenLine(
          u.ground.map(([x, y]) => [x, y - k * 1.3] as Pt),
          6 + k,
          4,
          70 + k,
        ),
      );
    ctx.save();
    ctx.clip(p);
    strokeLines(c, lines, pen * 0.4, INK.hatch, 0.5);
    ctx.restore();
  }
}

function paintChateau(c: PlateCanvas): void {
  const stone = { lit: "#c8ac84", graze: "#988b80", shade: "#6b6977" };
  for (const k of upper().chateau)
    if (c.mode === "colour") paintTower(c, k, stone, true);
    else engraveTower(c, k, true);
}

function upperPlate(): Plate {
  const jobs = (mode: PlateMode): PlateJob[] => {
    const out: PlateJob[] = [
      () => void upper(),
      (c) => paintUpperGround(c),
      (c) => paintChateau(c),
    ];
    for (let r = 0; r < INTERIOR_ROWS; r += 3)
      out.push(() => interiorRows(r, r + 3));
    const per = 30;
    for (let i = 0; i < 480; i += per)
      out.push((c) => {
        const list = interiorHouses();
        if (i >= list.length) return;
        const slice = list.slice(i, i + per);
        if (mode === "colour") paintBuildings(c, slice);
        else engraveBuildings(c, slice);
      });
    out.push((c) => {
      const b = upper().belfry;
      if (mode === "colour") paintBuildings(c, [b]);
      else engraveBuildings(c, [b]);
      if (mode === "colour") paintBelfryTop(c);
      else engraveBelfryTop(c);
    });
    for (let i = 0; i < 240; i += 40)
      out.push((c) => {
        const list = upper().trees;
        if (i >= list.length) return;
        const slice = list.slice(i, i + 40);
        if (mode === "colour") paintTrees(c, slice, UPPER_DEPTH - 120);
        else engraveTrees(c, slice, UPPER_DEPTH - 120);
      });
    out.push((c) => (mode === "colour" ? paintWalls(c) : engraveWalls(c)));
    out.push((c) => fadeEdges(c, UPPER_BOX, 14, 0));
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
