import { RAMPARTS } from "../geo";
import { createRng, mix, type Pt, rgba, softBlob } from "../paint/kit";
import {
  INK,
  PAPER,
  type PaintMode,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../paint/plate";
import { BUILD, project, VEX, viewOf } from "../scene";
import {
  airTone,
  type Building,
  DUSK,
  engraveBuildings,
  paintBuildings,
  ROOFS,
  toneAt,
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
  riverSide,
  strokeLines,
  tones,
  townGround,
} from "./town/kit";
import {
  crossStreetArcs,
  type Item,
  itemDistance,
  lowerItems,
  lowerLandmarks,
  lowerRow,
  SMOKE_SITES,
  type Spire,
  smokeTop,
  streetPoint,
  type Tree,
} from "./town/lower";
import {
  engraveBelfryStage,
  engraveBelfryTop,
  engraveTower,
  engraveTrees,
  engraveWalls,
  INTERIOR_ROWS,
  interiorHouses,
  interiorRows,
  paintBelfryStage,
  paintBelfryTop,
  paintTower,
  paintTrees,
  paintWalls,
  UPPER_DEPTH,
  upper,
  upperTrees,
  upperWalls,
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

/** The far band's box reaches higher, for Saint-Nicolas's spire; the near band's top keeps the smoke site's house on the plateau's edge hidden, as before. */
const FAR_BOX: Box = [-262, 292, -6, 70];

/** Where the lower-town plates split, metres ahead. */
const SPLIT = 1960;

/** The ground of a band of the lower town: the slope's skyline over the band's depths, never tapered into a cut. */
const groundParts = new Map<number, Pt[][]>();

/** One of three parts of a band's ground line (a job's worth each), kept for the band's painting jobs. */
function lowerGroundPart(near: number, far: number, part: number): void {
  const parts = groundParts.get(near) ?? [];
  groundParts.set(near, parts);
  if (parts[part]) return;
  const [x0, x1] = LOWER_BOX;
  const n = Math.floor((x1 - x0) / 3);
  const k0 = Math.round((n * part) / 3);
  const k1 = part === 2 ? n : Math.round((n * (part + 1)) / 3) - 1;
  parts[part] = groundSkyline(
    x0 + k0 * 3,
    x0 + k1 * 3,
    3,
    near,
    far,
    -3,
    (e, nn) => distToPoly(RAMPARTS, e, nn) < 40,
  );
}

function lowerGround(near: number, far: number): Pt[] {
  for (let k = 0; k < 3; k++) lowerGroundPart(near, far, k);
  return (groundParts.get(near) ?? []).flat();
}

function groundPath(line: readonly Pt[], bottom: number): Path2D {
  const p = new Path2D();
  p.moveTo(line[0][0], bottom);
  for (const [x, y] of line) p.lineTo(x, y);
  p.lineTo(line[line.length - 1][0], bottom);
  p.closePath();
  return p;
}

/**
 * The cross streets' slots climbing the slope, for a band of depths: each
 * street's middle line on the ground (layer units) and its width there.
 * With the sun 7° up and 44° off their line, the houses' shadows fill them:
 * they are the town's darks between the lit fronts.
 */
const slotCache = new Map<number, { line: Pt[]; w: number }[]>();

function streetSlots(near: number, far: number): { line: Pt[]; w: number }[] {
  const hit = slotCache.get(near);
  if (hit) return hit;
  const out: { line: Pt[]; w: number }[] = [];
  slotCache.set(near, out);
  for (const s of crossStreetArcs()) {
    let line: Pt[] = [];
    let w = 0;
    const flush = () => {
      if (line.length > 1) out.push({ line, w });
      line = [];
    };
    for (let d = 36; d <= 720; d += 8) {
      const [e, n] = streetPoint(s, d);
      const [ahead] = viewOf(e, n);
      if (ahead < near - 60 || ahead > far + 60 || riverSide(e, n).side <= 0) {
        flush();
        continue;
      }
      line.push(project(e, n, townGround(e, n) * VEX) as Pt);
      w = Math.max(w, (8 * BUILD * 1000) / ahead);
    }
    flush();
  }
  return out;
}

/** The slopes between and behind the houses: the streets' and yards' dusk, gardens catching the sun on the open slopes, the quays' wet stone below. */
function paintGround(
  c: PlateCanvas,
  line: readonly Pt[],
  distance: number,
  seed: number,
  near: number,
  far: number,
): void {
  const { ctx } = c;
  const g = tones(MAT.grass, distance);
  const mud = tones(MAT.mud, distance);
  const dusk = townAir(DUSK, distance);
  const p = groundPath(line, LOWER_BOX[2]);
  const top = Math.max(...line.map((q) => q[1]));
  const grad = ctx.createLinearGradient(0, top, 0, LOWER_BOX[2]);
  grad.addColorStop(0, mix(g.graze, g.lit, 0.4));
  grad.addColorStop(0.18, mix(g.graze, dusk, 0.35));
  grad.addColorStop(0.55, mix(g.shade, dusk, 0.55));
  grad.addColorStop(0.8, mix(mud.wet, dusk, 0.3));
  grad.addColorStop(1, mud.wet);
  ctx.fillStyle = grad;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  const rng = createRng(seed);
  const x0 = line[0][0];
  const x1 = line[line.length - 1][0];
  // Gardens on the open slopes in the sun, yards in the dusk.
  for (let i = 0; i < 110; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = LOWER_BOX[2] + rng() * (top - LOWER_BOX[2]);
    const lit = rng() < 0.45;
    softBlob(
      c,
      x,
      y,
      4 + rng() * 14,
      1.2 + rng() * 2.5,
      lit ? g.lit : dusk,
      lit ? 0.26 : 0.3,
    );
  }
  // The cross streets: dark slots climbing the slope.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const sl of streetSlots(near, far)) {
    ctx.strokeStyle = rgba(dusk, 0.75);
    ctx.lineWidth = sl.w * 0.8;
    ctx.beginPath();
    ctx.moveTo(sl.line[0][0], sl.line[0][1]);
    for (const q of sl.line) ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // Garden walls and hedges along the slope: broken dark strokes with a lit top.
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
  strokeLines(c, hedges, 1, townAir("#4a5040", distance), 0.55);
  strokeLines(
    c,
    hedges.map((l) => l.map(([x, y]) => [x, y + 0.3] as Pt)),
    0.5,
    g.lit,
    0.45,
  );
  ctx.restore();
}

/** The ground engraved: close crossed hatching, so the streets and the gaps are the town's darks and the lit fronts stay open paper. */
function engraveGround(
  c: PlateCanvas,
  line: readonly Pt[],
  distance: number,
  seed: number,
  near: number,
  far: number,
): void {
  const { ctx } = c;
  const p = groundPath(line, LOWER_BOX[2]);
  ctx.fillStyle = PAPER.low;
  ctx.fill(p);
  const pen = penAt(distance);
  // The slope's skyline: a light broken contour (never the box's foot).
  strokeLines(c, brokenLine(line, 40, 3, seed), pen * 0.7, INK.hatch, 0.85);
  ctx.save();
  ctx.clip(p);
  // Contour-following hatching, then a second set crossing it along the fall line.
  const lines: Pt[][] = [];
  for (let k = 1; k < 30; k++) {
    const drop = k * 1.4 + k * k * 0.03;
    lines.push(
      ...brokenLine(
        line.map(([x, y]) => [x, y - drop] as Pt),
        14 + k,
        2 + k * 0.2,
        seed + k,
      ),
    );
  }
  strokeLines(c, lines, pen * 0.4, INK.hatch, 0.55);
  const [bx0, bx1] = [line[0][0], line[line.length - 1][0]];
  const top = Math.max(...line.map((q) => q[1]));
  const cross: Pt[][] = [];
  for (let x = bx0; x < bx1; x += c.pen(2.2)) {
    cross.push([
      [x, LOWER_BOX[2]],
      [x + (top - LOWER_BOX[2]) * 0.35, top],
    ]);
  }
  strokeLines(c, cross, pen * 0.35, INK.hatch, 0.4);
  // The streets' slots: closer, darker strokes along them.
  for (const sl of streetSlots(near, far)) {
    const set: Pt[][] = [];
    for (let k = -2; k <= 2; k++)
      set.push(sl.line.map(([x, y]) => [x + k * sl.w * 0.15, y] as Pt));
    strokeLines(c, set, pen * 0.45, INK.hatch, 0.8);
  }
  ctx.restore();
}

/** A spire's three facets seen: the front square to the eye and lit, the left grazed, the right turned south-west, a little darker. */
function spireFacets(s: Spire): Pt[][] {
  const apex: Pt = [s.x, s.y + s.h];
  const xs = [s.x - s.r, s.x - s.r * 0.414, s.x + s.r * 0.414, s.x + s.r];
  const bell = s.h * 0.05;
  return [0, 1, 2].map((i) => [
    [xs[i] - (i === 0 ? bell * 0.5 : 0), s.y],
    [xs[i + 1] + (i === 2 ? bell * 0.5 : 0), s.y],
    apex,
  ]);
}

function paintSpire(c: PlateCanvas, s: Spire): void {
  const { ctx } = c;
  const slate = airTone(ROOFS.slateDark, s.distance);
  const tones3 = [toneAt(slate, 0.8), toneAt(slate, 0.98), toneAt(slate, 0.45)];
  spireFacets(s).forEach((f, i) => {
    ctx.fillStyle = tones3[i];
    ctx.beginPath();
    ctx.moveTo(f[0][0], f[0][1]);
    ctx.lineTo(f[1][0], f[1][1]);
    ctx.lineTo(f[2][0], f[2][1]);
    ctx.closePath();
    ctx.fill();
  });
  // The sun's line down the lit arris, the cornice's shadow at its foot, the cross.
  strokeLines(
    c,
    [
      [
        [s.x - s.r * 0.414, s.y + 0.1],
        [s.x - 0.03, s.y + s.h - 0.3],
      ],
    ],
    0.5,
    townAir("#f0d29a", s.distance),
    0.7,
  );
  ctx.fillStyle = rgba(townAir(DUSK, s.distance), 0.6);
  ctx.fillRect(s.x - s.r * 1.05, s.y - 0.25, s.r * 2.1, 0.3);
  strokeLines(
    c,
    [
      [
        [s.x, s.y + s.h - 0.2],
        [s.x, s.y + s.h + s.r * 0.6],
      ],
      [
        [s.x - s.r * 0.18, s.y + s.h + s.r * 0.38],
        [s.x + s.r * 0.18, s.y + s.h + s.r * 0.38],
      ],
    ],
    0.6,
    townAir("#2f2a2c", s.distance),
    0.9,
  );
}

function engraveSpire(c: PlateCanvas, s: Spire): void {
  const { ctx } = c;
  const pen = penAt(s.distance);
  const facets = spireFacets(s);
  const outline = new Path2D();
  outline.moveTo(facets[0][0][0], facets[0][0][1]);
  outline.lineTo(facets[0][2][0], facets[0][2][1]);
  outline.lineTo(facets[2][1][0], facets[2][1][1]);
  outline.closePath();
  ctx.fillStyle = PAPER.low;
  ctx.fill(outline);
  // The right facet hatched along its slope; the left lightly.
  const hl: Pt[][] = [];
  const [r0, r1, apex] = facets[2];
  for (let k = 0.15; k < 1; k += 0.22)
    hl.push([
      [r0[0] + (r1[0] - r0[0]) * k, s.y],
      [apex[0] + (r1[0] - apex[0]) * k * 0.1, apex[1] - s.h * 0.08],
    ]);
  strokeLines(c, hl, pen * 0.4, INK.hatch, 0.85);
  strokeLines(
    c,
    [
      [facets[0][0], facets[0][2], facets[2][1]],
      [facets[1][0], facets[1][2]],
      [
        [s.x, s.y + s.h],
        [s.x, s.y + s.h + s.r * 0.6],
      ],
    ],
    pen * 0.8,
    INK.line,
    0.95,
  );
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
      if (it.type === "spire") {
        if (c.mode === "colour") paintSpire(c, it.s);
        else engraveSpire(c, it.s);
      } else if (c.mode === "colour") paintTree(c, it.t);
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
  const box = which === "near" ? LOWER_BOX : FAR_BOX;
  let band: Item[] | undefined;
  const items = () => {
    band ??= lowerItems().filter((it) => {
      const d = itemDistance(it);
      return d > near && d <= far;
    });
    return band;
  };
  const jobs = (mode: PaintMode): PlateJob[] => {
    const out: PlateJob[] = [];
    // The plan, a row per job (shared by both plates: the first to run lays it out).
    for (let k = 0; k < 22; k++) out.push(() => void lowerRow());
    out.push(() => void lowerLandmarks());
    out.push(() => void items());
    for (let k = 0; k < 3; k++) out.push(() => lowerGroundPart(near, far, k));
    out.push(() => void streetSlots(near, far));
    out.push((c) => {
      const line = lowerGround(near, far);
      if (mode === "colour") paintGround(c, line, depth, 31, near, far);
      else engraveGround(c, line, depth, 31, near, far);
    });
    for (let i = 0; i < 1600; i += CHUNK)
      out.push((c) => {
        const list = items();
        if (i >= list.length) return;
        drawItems(c, list.slice(i, i + CHUNK));
      });
    // Soft sides and foot: the overscan never shows a cut when the camera rises.
    out.push((c) => fadeEdges(c, box, 28, 4));
    return out;
  };
  return { id, depth, box, group: "land", jobs };
}

// ----------------------------------------------------------- the upper town

const UPPER_BOX: Box = [-80, 196, 22, 98];

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

/** The château's towers: the walls' dark stone, a little greyer (the grey stones of the coast). */
const CHATEAU_STONE = { lit: "#978270", graze: "#6e665f", shade: "#4b4954" };

function paintChateau(c: PlateCanvas): void {
  for (const k of upper().chateau)
    if (c.mode === "colour") paintTower(c, k, CHATEAU_STONE);
    else engraveTower(c, k);
}

function upperPlate(): Plate {
  const jobs = (mode: PaintMode): PlateJob[] => {
    const out: PlateJob[] = [
      () => void upperWalls(),
      () => void upperTrees(),
      () => void upper(),
      (c) => paintUpperGround(c),
      (c) => paintChateau(c),
    ];
    for (let r = 0; r < INTERIOR_ROWS; r += 3)
      out.push(() => interiorRows(r, r + 3));
    const per = 18;
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
      if (mode === "colour") paintBelfryStage(c);
      else engraveBelfryStage(c);
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
