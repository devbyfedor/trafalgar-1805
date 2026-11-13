import { createRng } from "@/lib/random";
import {
  aerial,
  BUILD,
  DEPTH,
  mixHex,
  PALETTE,
  project,
  VEX,
  viewOf,
} from "./scene";

/**
 * The land of Boulogne from the sea, as static path art in layer units
 * (view.ts): the hills inland, the upper town on its hill, the heights
 * south of the Liane with the left camp, the plateau north of the harbour
 * with the right camp and the Emperor's hut, the harbour with its piers and
 * the masts in the basin, and the shore: the cliffs north of the harbour,
 * the flats south of it. Each layer is drawn as its places project from
 * the eye (scene.ts), so it holds true at the hold; the layer then moves as
 * one thing at its depth (view.ts, shiftFor).
 *
 * Scene 1's language (docs/decisions.md, "Scene 1"): flat fills, ramps of
 * a few stops, translucent stacked fills for light and shade, seeded
 * irregularity, no texture, no blur. Built once, at module load of the
 * painting's chunk.
 *
 * The places (metres east and north of the piers' heads) follow the
 * history notes as far as they go; where the sources stop, plausibly
 * (docs/decisions.md, "Boulogne from the sea").
 */

type Pt = readonly [number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** An SVG path through points, closed. */
export function polygon(points: readonly Pt[]): string {
  if (points.length === 0) return "";
  let d = `M${r1(points[0][0])} ${r1(-points[0][1])}`;
  for (let i = 1; i < points.length; i++)
    d += `L${r1(points[i][0])} ${r1(-points[i][1])}`;
  return `${d}Z`;
}

/** An open SVG polyline. */
export function polyline(points: readonly Pt[]): string {
  if (points.length === 0) return "";
  let d = `M${r1(points[0][0])} ${r1(-points[0][1])}`;
  for (let i = 1; i < points.length; i++)
    d += `L${r1(points[i][0])} ${r1(-points[i][1])}`;
  return d;
}

/** Seeded smooth noise on a line: a sum of a few sines with random phases. */
function wobble(seed: number, scales: readonly [number, number][]) {
  const rng = createRng(seed);
  const parts = scales.map(([period, amp]) => ({
    k: (2 * Math.PI) / period,
    amp,
    phase: rng() * Math.PI * 2,
  }));
  return (x: number) => {
    let y = 0;
    for (const p of parts) y += p.amp * Math.sin(p.k * x + p.phase);
    return y;
  };
}

/** A layer's art: named fills, each one or more paths, in paint order. */
export interface Shape {
  d: string;
  fill: string;
  opacity?: number;
  /** A vertical gradient instead of a flat fill: colours from the shape's top to its bottom. */
  ramp?: readonly string[];
}

export interface LandLayer {
  id: string;
  depth: number;
  /** Bounds in layer units: x0, x1 across, y0 (bottom) to y1 (top). */
  box: [number, number, number, number];
  shapes: Shape[];
}

const X0 = -1000;
const X1 = 1000;

// ---------------------------------------------------------------- hills

/**
 * The hills inland: the Boulonnais rising behind the town to Mont Lambert
 * (189 m, about 5 km east), lower to the north toward Wimille and south
 * beyond Outreau. Far: pale, cool, low in contrast; drawn at a gentler
 * licence than the near land (1.6) so they never tower over the town.
 */
function hills(): LandLayer {
  const top = wobble(11, [
    [420, 4],
    [170, 2],
    [60, 0.8],
  ]);
  const pts: Pt[] = [];
  for (let x = X0; x <= X1; x += 8) {
    // A broad swell behind the town (Mont Lambert), a lower one far right.
    const lambert = 26 * Math.exp(-(((x + 20) / 260) ** 2));
    const south = 12 * Math.exp(-(((x - 520) / 240) ** 2));
    const y = 30 + lambert + south + top(x);
    pts.push([x, y]);
  }
  const ridge: Pt[] = [[X0, -2], ...pts, [X1, -2]];
  const d = DEPTH.farHills;
  return {
    id: "hills",
    depth: d,
    box: [X0, X1, -4, 70],
    shapes: [
      {
        d: polygon(ridge),
        fill: aerial(PALETTE.hills.lit, d),
        ramp: [aerial(PALETTE.hills.lit, d), aerial(PALETTE.hills.shade, d)],
      },
    ],
  };
}

// ---------------------------------------------------------------- the town

/** A rectangle in layer units (x0..x1, y0 bottom..y1 top). */
const rect = (x0: number, x1: number, y0: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/**
 * The upper town on its hill, some 55 m above the sea and about 2.9 km
 * off: the hill's lit western slope, the thirteenth-century walls with
 * their round towers along the top, the roofs inside, the belfry, and the
 * château at the walls' far corner. The domed cathedral of today was not
 * there (built from 1827); the old cathedral had been pulled down after
 * the Revolution (history notes).
 */
function town(): LandLayer {
  const d = DEPTH.town;
  const rng = createRng(21);
  const shapes: Shape[] = [];
  // The walls' west face, NW to SW corner (metres from the piers' heads).
  const nw = project(1700, 60, 55 * VEX);
  const sw = project(1700, -300, 55 * VEX);
  const ne = project(2100, 60, 57 * VEX);
  const wallTop = 10 * BUILD;
  const unitsPerM = 1000 / viewOf(1800, -120)[0];
  const wallH = wallTop * unitsPerM;
  const crest = (nw[1] + sw[1]) / 2;
  // The hill: from the valley of the Liane (right) and the lower town
  // (left) up to the walls; its slope lit, its foot in shade.
  const hillTop = wobble(23, [
    [90, 1.2],
    [35, 0.5],
  ]);
  const hill: Pt[] = [];
  for (let x = -420; x <= 260; x += 6) {
    const t = x < nw[0] ? (x + 420) / (nw[0] + 420) : 1;
    const u = x > sw[0] ? (x - sw[0]) / (260 - sw[0]) : 0;
    const rise = Math.sin((Math.min(1, t) * Math.PI) / 2) ** 1.6;
    const fall = 1 - Math.sin((Math.min(1, u) * Math.PI) / 2) ** 0.8;
    const y = 6 + (crest - 6) * rise * fall + hillTop(x);
    hill.push([x, y]);
  }
  shapes.push({
    d: polygon([[-420, -2], ...hill, [260, -2]]),
    fill: aerial(PALETTE.town.hill, d),
    ramp: [
      aerial(mixHex(PALETTE.town.hill, PALETTE.cliff.grassLit, 0.35), d),
      aerial(PALETTE.town.hill, d),
      aerial(PALETTE.town.hillShade, d),
    ],
  });
  // Roofs inside the walls, rising a little toward the far side.
  const roofs: Pt[][] = [];
  const roofsLit: Pt[][] = [];
  for (let x = nw[0] + 3; x < sw[0] - 3; x += 3.2 + rng() * 2.6) {
    const w = 2.6 + rng() * 2.4;
    const base = crest + wallH * 0.6;
    const h = (2.2 + rng() * 2.6) * (BUILD / 2);
    const ridgeX = x + w * (0.35 + rng() * 0.3);
    roofs.push([
      [x, base],
      [x + w, base],
      [ridgeX, base + h],
    ]);
    roofsLit.push([
      [x, base],
      [ridgeX, base],
      [ridgeX, base + h],
    ]);
  }
  shapes.push({
    d: roofs.map(polygon).join(""),
    fill: aerial(PALETTE.town.roofSlate, d),
  });
  shapes.push({
    d: roofsLit.map(polygon).join(""),
    fill: aerial(PALETTE.town.roofLit, d),
    opacity: 0.55,
  });
  // The walls: the west face lit full, with round towers every 40-60 m.
  const wall: Pt[] = [
    [nw[0], crest - 1.5],
    [sw[0], crest - 1.5],
    [sw[0], crest + wallH],
    [nw[0], crest + wallH],
  ];
  shapes.push({ d: polygon(wall), fill: aerial(PALETTE.town.wallLit, d) });
  const towers: Pt[][] = [];
  const towerShade: Pt[][] = [];
  const span = sw[0] - nw[0];
  const count = Math.max(4, Math.round(span / 11));
  for (let i = 0; i <= count; i++) {
    const cx = nw[0] + (span * i) / count;
    const tw = 2.4;
    const th = wallH * 1.25;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI - (k / 8) * Math.PI;
      pts.push([cx + Math.cos(a) * tw, crest - 1.5 + th + Math.sin(a) * 0.9]);
    }
    towers.push([[cx - tw, crest - 1.5], ...pts, [cx + tw, crest - 1.5]]);
    towerShade.push(
      rect(cx + tw * 0.35, cx + tw, crest - 1.5, crest - 1.5 + th),
    );
  }
  shapes.push({
    d: towers.map(polygon).join(""),
    fill: aerial(PALETTE.town.wallLit, d),
  });
  shapes.push({
    d: towerShade.map(polygon).join(""),
    fill: aerial(PALETTE.town.wallShade, d),
    opacity: 0.6,
  });
  // The wall's foot and its shadow line along the top of the hill.
  shapes.push({
    d: polygon(rect(nw[0], sw[0], crest - 2.4, crest - 1.2)),
    fill: aerial(PALETTE.town.wallShade, d),
    opacity: 0.5,
  });
  // The belfry, near the middle of the old town, and its lantern.
  const bx = nw[0] + span * 0.48;
  const by = crest + wallH * 0.6;
  const bh = 34 * BUILD * unitsPerM * 0.55;
  shapes.push({
    d: polygon([
      [bx - 1.7, by],
      [bx + 1.7, by],
      [bx + 1.7, by + bh],
      [bx + 1.1, by + bh + 1.4],
      [bx + 0.35, by + bh + 3.2],
      [bx - 0.35, by + bh + 3.2],
      [bx - 1.1, by + bh + 1.4],
      [bx - 1.7, by + bh],
    ]),
    fill: aerial(PALETTE.town.wallLit, d),
  });
  shapes.push({
    d: polygon(rect(bx + 0.6, bx + 1.7, by, by + bh)),
    fill: aerial(PALETTE.town.wallShade, d),
    opacity: 0.55,
  });
  // The château at the walls' far (north-east) corner: two round towers.
  const cx = ne[0] + 3;
  const cy = crest + wallH * 0.4;
  const keep: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI - (k / 10) * Math.PI;
    keep.push([cx + Math.cos(a) * 3.4, cy + wallH * 1.5 + Math.sin(a) * 1.1]);
  }
  shapes.push({
    d: polygon([[cx - 3.4, cy], ...keep, [cx + 3.4, cy]]),
    fill: aerial(mixHex(PALETTE.town.wallLit, PALETTE.town.wallShade, 0.25), d),
  });
  return { id: "town", depth: d, box: [X0, X1, -4, 90], shapes };
}

// ---------------------------------------------------------------- huts

/**
 * Rows of huts along camp streets (history notes: huts, not tents), each
 * hut a low wall with a pitched roof whose seaward slope catches the
 * evening sun. `rows` gives each row as a line of places (metres east,
 * north) at an elevation; huts stand along it with gaps for the cross
 * streets. Returns the shapes, merged by colour (one path each).
 */
function hutRows(
  seed: number,
  rows: readonly {
    from: readonly [number, number];
    to: readonly [number, number];
    ground: (t: number) => number;
  }[],
  depth: number,
): Shape[] {
  const rng = createRng(seed);
  const roofsLit: Pt[][] = [];
  const roofsShade: Pt[][] = [];
  const walls: Pt[][] = [];
  const wallsShade: Pt[][] = [];
  for (const row of rows) {
    const [e0, n0] = row.from;
    const [e1, n1] = row.to;
    const length = Math.hypot(e1 - e0, n1 - n0);
    // A hut about 9-12 m long, gaps of 2-4 m, a street every 8-10 huts.
    let s = rng() * 6;
    let inBlock = 0;
    const block = 7 + Math.floor(rng() * 4);
    while (s < length) {
      const len = 9 + rng() * 3;
      const t0 = s / length;
      const t1 = Math.min(1, (s + len) / length);
      const ground = row.ground((t0 + t1) / 2) * VEX;
      const wallH = (2.4 + rng() * 0.4) * BUILD;
      const roofH = (1.9 + rng() * 0.5) * BUILD;
      const a = project(e0 + (e1 - e0) * t0, n0 + (n1 - n0) * t0, ground);
      const b = project(e0 + (e1 - e0) * t1, n0 + (n1 - n0) * t1, ground);
      const wTop = project(
        e0 + (e1 - e0) * t0,
        n0 + (n1 - n0) * t0,
        ground + wallH,
      )[1];
      const rTop = project(
        e0 + (e1 - e0) * ((t0 + t1) / 2),
        n0 + (n1 - n0) * ((t0 + t1) / 2),
        ground + wallH + roofH,
      )[1];
      const x0 = Math.min(a[0], b[0]);
      const x1 = Math.max(a[0], b[0]);
      if (x1 - x0 > 0.15) {
        const y0 = (a[1] + b[1]) / 2;
        walls.push(rect(x0, x1, y0, wTop));
        // The wall's right end turns away from the low sun on the left.
        wallsShade.push(rect(x1 - (x1 - x0) * 0.18, x1, y0, wTop));
        // The roof seen side on: its seaward slope lit, a sliver of shade
        // under the eaves.
        const over = (x1 - x0) * 0.08;
        roofsLit.push([
          [x0 - over, wTop],
          [x1 + over, wTop],
          [x1 + over * 0.3, rTop],
          [x0 - over * 0.3, rTop],
        ]);
        roofsShade.push(rect(x0 - over, x1 + over, wTop - 0.25, wTop + 0.12));
      }
      s += len + 2 + rng() * 2.5;
      inBlock++;
      if (inBlock >= block) {
        inBlock = 0;
        s += 7 + rng() * 5;
      }
    }
  }
  return [
    {
      d: walls.map(polygon).join(""),
      fill: aerial(PALETTE.hut.wallLit, depth),
    },
    {
      d: wallsShade.map(polygon).join(""),
      fill: aerial(PALETTE.hut.wallShade, depth),
      opacity: 0.8,
    },
    {
      d: roofsLit.map(polygon).join(""),
      fill: aerial(PALETTE.hut.roofLit, depth),
    },
    {
      d: roofsShade.map(polygon).join(""),
      fill: aerial(PALETTE.hut.gap, depth),
      opacity: 0.55,
    },
  ];
}

// ---------------------------------------------------------------- north

/** Elevation of the plateau north of the harbour, metres, at metres east of the piers' heads. */
function northGround(east: number): number {
  // 47 m at the cliff's edge (east 470), rising inland toward the heights
  // behind the town (a painter's rise, so the camp's streets show).
  return 47 + Math.max(0, east - 470) * 0.055;
}

/**
 * The plateau north of the harbour behind the cliffs, with the right camp
 * in long streets parallel to the cliff and, near the edge by the Tour
 * d'Ordre, the Emperor's hut and the signal post by it.
 */
function plateauNorth(): LandLayer {
  const d = DEPTH.plateauNorth;
  const shapes: Shape[] = [];
  // The plateau's surface as it shows over the cliff's edge: from the edge
  // line up to its far rim, lit gold with fields.
  const rim: Pt[] = [];
  const edge: Pt[] = [];
  for (let n = 3400; n >= 180; n -= 40) {
    const far = project(1500, n, northGround(1500) * VEX);
    const near = project(470, n, northGround(470) * VEX);
    rim.push(far);
    edge.push(near);
  }
  shapes.push({
    d: polygon([...rim, ...edge.reverse()]),
    fill: PALETTE.plateau.field,
    ramp: [
      aerial(PALETTE.plateau.field, 2000),
      aerial(PALETTE.plateau.fieldLit, 1500),
    ],
  });
  // Hedges and field bounds as fine lines across it.
  const hedges: Pt[][] = [];
  for (let e = 700; e <= 1500; e += 160) {
    const line: Pt[] = [];
    for (let n = 3400; n >= 200; n -= 80)
      line.push(project(e, n, northGround(e) * VEX + 1.5));
    hedges.push(line);
  }
  shapes.push({
    d: hedges.map(polyline).join(""),
    fill: "none",
    opacity: 0.35,
  });
  // The right camp: rows parallel to the cliff, from near its edge inland.
  const rows = [];
  for (let k = 0; k < 7; k++) {
    const e = 560 + k * 95;
    rows.push({
      from: [e, 2600 - k * 60] as const,
      to: [e, 330 + k * 25] as const,
      ground: () => northGround(e),
    });
  }
  shapes.push(...hutRows(31, rows, 1700));
  // The Emperor's hut by the Tour d'Ordre: a pavilion on the cliff's edge,
  // larger than the soldiers' huts, and the signal post's mast by it.
  const [hx, hy] = project(640, 520, northGround(640) * VEX);
  const u = 1000 / viewOf(640, 520)[0];
  const w = 16 * BUILD * u * 0.5;
  const h = 6 * BUILD * u;
  shapes.push({
    d: polygon([
      [hx - w, hy],
      [hx + w, hy],
      [hx + w, hy + h],
      [hx + w * 0.55, hy + h * 1.55],
      [hx - w * 0.55, hy + h * 1.55],
      [hx - w, hy + h],
    ]),
    fill: aerial(PALETTE.hut.wallLit, 1500),
  });
  shapes.push({
    d: polygon(rect(hx + w * 0.55, hx + w, hy, hy + h)),
    fill: aerial(PALETTE.hut.wallShade, 1500),
    opacity: 0.6,
  });
  const mx = hx - w * 2.4;
  shapes.push({
    d: polygon([
      [mx - 0.18, hy],
      [mx + 0.18, hy],
      [mx + 0.12, hy + h * 3.4],
      [mx - 0.12, hy + h * 3.4],
    ]),
    fill: aerial(PALETTE.harbour.mast, 1500),
  });
  return { id: "plateau-north", depth: d, box: [X0, X1, -4, 140], shapes };
}

// ---------------------------------------------------------------- south

/** Elevation of the heights south of the Liane, metres, at metres north of the piers' heads (negative: south). */
function southGround(north: number): number {
  // The escarpment rising from the flats (5 m) at the Liane's bank to the
  // plateau of Outreau (about 70 m), then the plateau rising gently south.
  const t = Math.min(1, Math.max(0, (-north - 700) / 650));
  const s = t * t * (3 - 2 * t);
  return 5 + 65 * s + Math.max(0, -north - 1350) * 0.02;
}

/**
 * The heights south of the Liane: the escarpment of Outreau facing the
 * harbour, lit full by the low sun, with the left camp's streets on its
 * brow and the plateau beyond.
 */
function heightsSouth(): LandLayer {
  const d = DEPTH.heightsSouth;
  const shapes: Shape[] = [];
  const top = wobble(41, [
    [140, 1.3],
    [50, 0.5],
  ]);
  // The heights' skyline seen from the sea: the plateau's far brow.
  const sky: Pt[] = [];
  for (let n = -700; n >= -4200; n -= 50) {
    const e = 200 + (n + 700) * -0.35;
    const p = project(e + 700, n, southGround(n) * VEX);
    sky.push([p[0], p[1] + top(p[0])]);
  }
  const foot: Pt[] = [];
  for (let n = -4200; n <= -700; n += 100) {
    const e = 200 + (n + 700) * -0.35;
    foot.push(project(e, n, 2));
  }
  shapes.push({
    d: polygon([...sky, ...foot]),
    fill: PALETTE.cliff.grass,
    ramp: [
      aerial(PALETTE.plateau.fieldLit, 1900),
      aerial(PALETTE.cliff.grassLit, 1800),
      aerial(PALETTE.cliff.grass, 1700),
    ],
  });
  // The left camp: rows along the brow and on the plateau behind it.
  const rows = [];
  for (let k = 0; k < 6; k++) {
    const n0 = -1250 - k * 110;
    rows.push({
      from: [450 + k * 20, n0] as const,
      to: [-260 + k * 40, n0 - 900] as const,
      ground: () => southGround(n0 - 200),
    });
  }
  shapes.push(...hutRows(43, rows, 2000));
  return { id: "heights-south", depth: d, box: [X0, X1, -4, 140], shapes };
}

// ---------------------------------------------------------------- harbour

/**
 * The harbour's mouth between its two wooden piers, seen nearly end on;
 * the fort of timber at the head of the northern pier; beyond them the
 * masts of the craft in the basin, a forest of bare poles; the lower town
 * climbing from the quays toward the upper town.
 */
function harbour(): LandLayer {
  const d = DEPTH.harbour;
  const rng = createRng(51);
  const shapes: Shape[] = [];
  // The lower town: houses stepping up the slope north of the Liane.
  const houses: Pt[][] = [];
  const housesLit: Pt[][] = [];
  const roofs: Pt[][] = [];
  for (let i = 0; i < 70; i++) {
    const e = 420 + rng() * 1150;
    const n = -60 + rng() * 360;
    const ground = Math.max(3, (e - 420) * 0.042) * VEX;
    const u = 1000 / viewOf(e, n)[0];
    const w = (8 + rng() * 10) * BUILD * u * 0.5;
    const h = (6 + rng() * 6) * BUILD * u * 0.5;
    const [x, y] = project(e, n, ground);
    houses.push(rect(x - w, x + w, y, y + h));
    housesLit.push(rect(x - w, x + w * 0.4, y, y + h));
    roofs.push([
      [x - w * 1.05, y + h],
      [x + w * 1.05, y + h],
      [x + w * (rng() - 0.5) * 0.6, y + h + h * (0.5 + rng() * 0.4)],
    ]);
  }
  shapes.push({
    d: houses.map(polygon).join(""),
    fill: aerial(PALETTE.town.wallShade, 1800),
  });
  shapes.push({
    d: housesLit.map(polygon).join(""),
    fill: aerial(PALETTE.town.wallLit, 1800),
    opacity: 0.85,
  });
  shapes.push({
    d: roofs.map(polygon).join(""),
    fill: aerial(PALETTE.town.roofSlate, 1800),
  });
  // The masts in the basin: hundreds of bare poles above the quays.
  const masts: Pt[][] = [];
  const yards: Pt[][] = [];
  for (let i = 0; i < 260; i++) {
    const e = 360 + rng() * 700;
    const n = -170 + rng() * 280;
    const u = 1000 / viewOf(e, n)[0];
    const [x, y] = project(e, n, 1);
    const h = (12 + rng() * 14) * u * (BUILD * 0.75);
    const w = 0.16 + rng() * 0.1;
    masts.push([
      [x - w, y],
      [x + w, y],
      [x + w * 0.5, y + h],
      [x - w * 0.5, y + h],
    ]);
    if (rng() < 0.55) {
      const yy = y + h * (0.55 + rng() * 0.3);
      const half = h * (0.12 + rng() * 0.1);
      yards.push(rect(x - half, x + half, yy - 0.12, yy + 0.12));
    }
  }
  shapes.push({
    d: masts.map(polygon).join(""),
    fill: aerial(PALETTE.harbour.mast, 1500),
  });
  shapes.push({
    d: yards.map(polygon).join(""),
    fill: aerial(PALETTE.harbour.mast, 1500),
    opacity: 0.85,
  });
  // The piers, end on: timber on piles from the shore to their heads.
  const piers: Pt[][] = [];
  for (const [n0, n1] of [
    [40, 60],
    [-40, -70],
  ] as const) {
    const pts: Pt[] = [];
    const top = 4 * BUILD;
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      pts.push(project(330 * t, n0 + (n1 - n0) * t, top));
    }
    for (let k = 12; k >= 0; k--) {
      const t = k / 12;
      pts.push(project(330 * t, n0 + (n1 - n0) * t, 0));
    }
    piers.push(pts);
  }
  shapes.push({
    d: piers.map(polygon).join(""),
    fill: PALETTE.harbour.pier,
  });
  // The timber fort at the northern pier's head: a low battery on piles.
  const [fx, fy] = project(-10, 45, 0);
  const fu = 1000 / viewOf(-10, 45)[0];
  const fw = 22 * fu;
  const fh = 7 * BUILD * fu;
  shapes.push({
    d: polygon([
      [fx - fw, fy],
      [fx + fw, fy],
      [fx + fw * 0.85, fy + fh],
      [fx - fw * 0.85, fy + fh],
    ]),
    fill: PALETTE.harbour.pier,
  });
  shapes.push({
    d: polygon(rect(fx - fw * 0.85, fx + fw * 0.2, fy + fh * 0.35, fy + fh)),
    fill: PALETTE.harbour.pierLit,
    opacity: 0.6,
  });
  return { id: "harbour", depth: d, box: [X0, X1, -6, 80], shapes };
}

// ---------------------------------------------------------------- shore

/**
 * The shore: north of the harbour the cliffs below the Tour d'Ordre, their
 * faces turned to the evening sun (lit gold, gullies in shade, grass on
 * the brow, rocks and sand at the foot); south of it the low flats along
 * the Liane and the beach toward Le Portel.
 */
function shore(): LandLayer {
  const d = DEPTH.shore;
  const shapes: Shape[] = [];
  const brow = wobble(61, [
    [260, 3],
    [90, 1.6],
    [30, 0.6],
  ]);
  // The cliff, north from where the land rises out of the harbour.
  const top: Pt[] = [];
  const foot: Pt[] = [];
  for (let n = 3400; n >= 120; n -= 20) {
    const rise = Math.min(1, Math.max(0, (n - 120) / 330));
    const h = (8 + 39 * rise ** 0.7 + brow(n) * rise) * VEX;
    top.push(project(470, n, h));
    foot.push(project(400, n, 0));
  }
  const face = [...top, ...foot.reverse()];
  shapes.push({
    d: polygon(face),
    fill: PALETTE.cliff.lit,
    ramp: [PALETTE.cliff.litHigh, PALETTE.cliff.lit, PALETTE.cliff.shade],
  });
  // Gullies and buttresses down the face: shade where it turns away.
  const rng = createRng(63);
  const gullies: Pt[][] = [];
  for (let n = 3300; n > 420; n -= 60 + rng() * 120) {
    const w = 6 + rng() * 14;
    const rise = Math.min(1, Math.max(0, (n - 120) / 330));
    const h = (8 + 39 * rise ** 0.7 + brow(n) * rise) * VEX;
    const a = project(470, n, h * (0.92 + rng() * 0.06));
    const b = project(470, n - w, h * 0.95);
    const c = project(400, n - w * 1.6, 0);
    const e = project(400, n + w * 0.4, 0);
    gullies.push([a, b, c, e]);
  }
  shapes.push({
    d: gullies.map(polygon).join(""),
    fill: PALETTE.cliff.shade,
    opacity: 0.45,
  });
  // Grass on the brow.
  const grass: Pt[] = [];
  const grassLow: Pt[] = [];
  for (let n = 3400; n >= 300; n -= 20) {
    const rise = Math.min(1, Math.max(0, (n - 120) / 330));
    const h = (8 + 39 * rise ** 0.7 + brow(n) * rise) * VEX;
    grass.push(project(470, n, h + 0.5));
    grassLow.push(project(470, n, h - 5));
  }
  shapes.push({
    d: polygon([...grass, ...grassLow.reverse()]),
    fill: PALETTE.cliff.grassLit,
  });
  // Rocks at the foot, then the sand.
  const rocks: Pt[] = [];
  const rocksTop: Pt[] = [];
  for (let n = 3400; n >= 200; n -= 30) {
    rocks.push(project(400, n, 0));
    rocksTop.push(project(405, n, 4 + rng() * 3));
  }
  shapes.push({
    d: polygon([...rocksTop, ...rocks.reverse()]),
    fill: PALETTE.cliff.base,
  });
  const sand: Pt[] = [];
  const sandTop: Pt[] = [];
  for (let n = 3400; n >= 60; n -= 40) {
    sand.push(project(330, n, 0));
    sandTop.push(project(400, n, 0));
  }
  shapes.push({
    d: polygon([...sandTop, ...sand.reverse()]),
    fill: mixHex(PALETTE.cliff.litHigh, PALETTE.sea.farBody, 0.3),
  });
  // South of the harbour: the flats along the Liane and the beach.
  const flats: Pt[] = [];
  const beach: Pt[] = [];
  for (let n = -60; n >= -4200; n -= 60) {
    const e = 330 + (n + 60) * 0.18;
    flats.push(project(e + 140, n, 4 * VEX));
    beach.push(project(e, n, 0));
  }
  shapes.push({
    d: polygon([...flats, ...beach.reverse()]),
    fill: mixHex(PALETTE.cliff.grass, PALETTE.cliff.litHigh, 0.35),
    ramp: [
      mixHex(PALETTE.cliff.grassLit, PALETTE.cliff.litHigh, 0.3),
      mixHex(PALETTE.cliff.litHigh, PALETTE.sea.farBody, 0.25),
    ],
  });
  return { id: "shore", depth: d, box: [X0, X1, -8, 140], shapes };
}

/** Every land layer, far to near. */
export function buildLand(): LandLayer[] {
  return [hills(), town(), heightsSouth(), plateauNorth(), harbour(), shore()];
}
