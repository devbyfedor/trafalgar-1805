import { JETTIES } from "../geo";
import { createRng, mix, type Pt, rgba, softBlob } from "../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../paint/plate";
import { aerial, BUILD, viewOf } from "../scene";
import { basinCraft, basinTiers, engraveCraft, paintCraft } from "./harbour/basin";
import {
  type Box,
  brokenLine,
  fadeEdges,
  MAT,
  penAt,
  RIVER,
  strokeLines,
  tones,
  yAt,
} from "./town/kit";

/**
 * The harbour at low water (brief, "Owner review": the jetties, the
 * timber fort and the forest of masts): the Liane drained to mud and a
 * glinting stream; the flotilla's craft aground in tiers along the quays,
 * a comb of bare masts and yards with their canvas furled, lit gold from
 * behind the eye; the two timber jetties on piles seen almost end-on,
 * the western one's head carrying the two-tier pierhead battery with the
 * wooden harbour light beside it; and, nearest of all, the wooden fort
 * on its piles at the low-water line, at the end of its fascine dike.
 *
 * Heights at the licence for works and craft ashore (scene.ts BUILD); the
 * wooden fort, under half a kilometre off, at its true size like the
 * craft afloat around it.
 */

function proj(e: number, n: number, up: number): Pt {
  const [ahead, right] = viewOf(e, n);
  return [(1000 * right) / ahead, yAt(ahead, up)];
}

// ----------------------------------------------------------- the basin

const BASIN_DEPTH = 1600;
const BASIN_BOX: Box = [-240, 300, -14, 48];

function basinFloor(c: PlateCanvas): void {
  const { ctx } = c;
  const mud = tones(MAT.mud, BASIN_DEPTH);
  // The floor: mud banks to the quays' feet, then the overscan below.
  const top = (x: number) => -3.2 + Math.max(0, (x + 120) / 420) * 0.6;
  const p = new Path2D();
  p.moveTo(BASIN_BOX[0], BASIN_BOX[2]);
  for (let x = BASIN_BOX[0]; x <= BASIN_BOX[1]; x += 10) p.lineTo(x, top(x));
  p.lineTo(BASIN_BOX[1], BASIN_BOX[2]);
  p.closePath();
  if (c.mode === "colour") {
    const g = ctx.createLinearGradient(0, -2, 0, BASIN_BOX[2]);
    g.addColorStop(0, mud.lit);
    g.addColorStop(0.3, mud.wet);
    g.addColorStop(1, mud.shade);
    ctx.fillStyle = g;
    ctx.fill(p);
    // The stream glinting with the eastern sky.
    ctx.save();
    ctx.clip(p);
    const rng = createRng(44);
    for (let i = 0; i < 14; i++) {
      const x = -180 + rng() * 420;
      softBlob(
        c,
        x,
        -4 - rng() * 14,
        10 + rng() * 30,
        0.5 + rng() * 0.8,
        "#dfd2bf",
        0.45,
      );
    }
    ctx.restore();
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    const lines: Pt[][] = [];
    // Wet mud by short strokes along it, sparse, closer toward the quays.
    for (let k = 1; k < 7; k++) {
      const l: Pt[] = [];
      for (let x = BASIN_BOX[0]; x <= BASIN_BOX[1]; x += 6)
        l.push([x, top(x) - k * k * 0.42]);
      lines.push(...brokenLine(l, 3 + k * 0.6, 7 + k * 2, 120 + k));
    }
    strokeLines(c, lines, 0.55, INK.hatch, 0.45);
  }
  // No cut edges when the camera rises: fade the floor's sides and foot.
  fadeEdges(c, BASIN_BOX, 60, 12);
}

/** The east quays' stone wall behind the craft, its foot dark and wet. */
function basinQuay(c: PlateCanvas): void {
  const { ctx } = c;
  const st = alongRiver(300, 1400, 20);
  const foot: Pt[] = [];
  const top: Pt[] = [];
  for (const s of st) {
    const e = s.e - s.dn * 38;
    const n = s.n + s.dx * 38;
    foot.push(proj(e, n, 0.2));
    top.push(proj(e, n, 5 * 2.5));
  }
  const p = new Path2D();
  p.moveTo(foot[0][0], foot[0][1]);
  for (const q of foot) p.lineTo(q[0], q[1]);
  for (let i = top.length - 1; i >= 0; i--) p.lineTo(top[i][0], top[i][1]);
  p.closePath();
  const t = tones(MAT.stone, BASIN_DEPTH);
  if (c.mode === "colour") {
    const g = ctx.createLinearGradient(0, -3, 0, 4);
    g.addColorStop(0, mix(t.shade, "#4d4a3c", 0.4));
    g.addColorStop(0.45, t.graze);
    g.addColorStop(1, t.lit);
    ctx.fillStyle = g;
    ctx.fill(p);
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    strokeLines(
      c,
      brokenLine(top, 14, 3, 61),
      penAt(BASIN_DEPTH) * 0.8,
      INK.line,
      0.75,
    );
  }
}

function basinPlate(): Plate {
  const jobs = (): PlateJob[] => {
    const out: PlateJob[] = [(c) => basinFloor(c), (c) => basinQuay(c)];
    for (let k = 0; k < 8; k++) out.push(() => void basinTiers(12));
    out.push(() => void basinCraft());
    for (let i = 0; i < 600; i += 30)
      out.push((c) => {
        const list = basinCraft();
        if (i >= list.length) return;
        const slice = list.slice(i, i + 30);
        if (c.mode === "colour") paintCraft(c, slice);
        else engraveCraft(c, slice, penAt(BASIN_DEPTH));
      });
    out.push((c) => fadeEdges(c, BASIN_BOX, 50, 6));
    return out;
  };
  return {
    id: "harbour-basin",
    depth: BASIN_DEPTH,
    box: BASIN_BOX,
    group: "land",
    jobs,
  };
}

// ----------------------------------------------------------- the jetties

/** The deck's height above the strand at low water, metres as drawn. */
const DECK = 9 * BUILD;
const JETTY_BOX: Box = [-205, -62, -14, 48];

/** A jetty's line from its head (t = 0) to its root (t = 1). */
function jettyAt(j: number, t: number): Pt {
  const line = [...JETTIES[j]].reverse();
  const f = t * (line.length - 1);
  const i = Math.min(line.length - 2, Math.floor(f));
  const k = f - i;
  return [
    line[i][0] + (line[i + 1][0] - line[i][0]) * k,
    line[i][1] + (line[i + 1][1] - line[i][1]) * k,
  ];
}

/** Bents of piles from t0 to t1 (far to near), the deck's stringer over them, for one jetty. */
function paintJetty(c: PlateCanvas, j: number, t0: number, t1: number): void {
  const { ctx } = c;
  const [he, hn] = jettyAt(j, 0);
  const [re, rn] = jettyAt(j, 1);
  const len = Math.hypot(re - he, rn - hn);
  const dx = (re - he) / len;
  const dn = (rn - hn) / len;
  // Across the jetty: its north side is +.
  const ax = -dn;
  const an = dx;
  const half = 4.5 * BUILD * 0.5;
  const bents: { t: number; piles: Pt[][] }[] = [];
  for (let s = len * t1; s >= len * t0; s -= 4.2) {
    const t = s / len;
    const [e, n] = jettyAt(j, t);
    const piles: Pt[][] = [];
    for (const k of [-1, -0.34, 0.34, 1]) {
      const pe = e + ax * half * k;
      const pn = n + an * half * k;
      piles.push([proj(pe, pn, -0.5), proj(pe, pn, DECK)]);
    }
    bents.push({ t, piles });
  }
  const air = viewOf(he, hn)[0];
  const timber = tones(MAT.timber, air);
  const weed = aerial("#4a4a33", air);
  const pen = penAt(air);
  // The stringer along the side we see: the south jetty shows its north side, grazed; the north jetty its south side, in shade.
  const side = j === 1 ? 1 : -1;
  const sTop: Pt[] = [];
  const sBot: Pt[] = [];
  for (let s = len * t0; s <= len * t1 + 0.01; s += 6) {
    const [e, n] = jettyAt(j, s / len);
    sTop.push(
      proj(e + ax * half * side, n + an * half * side, DECK + 2.6 * BUILD),
    );
    sBot.push(
      proj(e + ax * half * side, n + an * half * side, DECK - 1.2 * BUILD),
    );
  }
  const stringer = new Path2D();
  stringer.moveTo(sTop[0][0], sTop[0][1]);
  for (const q of sTop) stringer.lineTo(q[0], q[1]);
  for (let i = sBot.length - 1; i >= 0; i--)
    stringer.lineTo(sBot[i][0], sBot[i][1]);
  stringer.closePath();
  const braces: Pt[][] = [];
  for (const b of bents) {
    const [p0, , , p3] = b.piles;
    braces.push([p0[0], [p3[1][0], p3[1][1] - (p3[1][1] - p3[0][1]) * 0.35]]);
    braces.push([p3[0], [p0[1][0], p0[1][1] - (p0[1][1] - p0[0][1]) * 0.35]]);
  }
  if (c.mode === "colour") {
    // Deeper bents in each other's shadow; the head's bent lit square-on.
    bents.forEach((b, i) => {
      const lit =
        i === bents.length - 1 && t0 === 0
          ? 1
          : 0.25 + 0.5 * (i / bents.length);
      strokeLines(c, b.piles, 1.5, mix(timber.shade, timber.lit, lit), 1);
      strokeLines(
        c,
        b.piles.map(
          ([a, bb]) => [a, [bb[0], a[1] + (bb[1] - a[1]) * 0.16]] as Pt[],
        ),
        1.7,
        weed,
        0.9,
      );
    });
    strokeLines(c, braces, 0.8, timber.shade, 0.7);
    ctx.fillStyle =
      j === 1 ? mix(timber.graze, timber.lit, 0.35) : timber.shade;
    ctx.fill(stringer);
    strokeLines(c, [sTop], 0.8, mix(timber.lit, MAT.glint, 0.3), 0.9);
  } else {
    strokeLines(
      c,
      bents.flatMap((b) => b.piles),
      pen,
      INK.line,
      0.9,
    );
    strokeLines(c, braces, pen * 0.5, INK.hatch, 0.7);
    // Weed at the piles' feet: short dense strokes.
    const weedL: Pt[][] = [];
    for (const b of bents)
      for (const [a] of b.piles)
        for (const o of [-0.5, 0, 0.5])
          weedL.push([
            [a[0] + o, a[1]],
            [a[0] + o * 1.4, a[1] + 1.6],
          ]);
    strokeLines(c, weedL, pen * 0.6, INK.line, 0.6);
    ctx.fillStyle = PAPER.low;
    ctx.fill(stringer);
    if (j === 0) {
      ctx.save();
      ctx.clip(stringer);
      const hl: Pt[][] = [];
      for (let x = -200; x < -60; x += c.pen(1.6))
        hl.push([
          [x, 0],
          [x + 6, 30],
        ]);
      strokeLines(c, hl, pen * 0.5, INK.hatch, 0.8);
      ctx.restore();
    }
    strokeLines(c, [sTop, sBot], pen, INK.line, 1);
  }
}

/** The pierhead battery on the western jetty's head: two tiers of guns, its flag; the wooden light beside it. */
function paintBattery(c: PlateCanvas): void {
  const { ctx } = c;
  const [he, hn] = jettyAt(1, 0);
  const [ahead] = viewOf(he + 6, hn);
  const u = 1000 / ahead;
  const [cx] = proj(he + 6, hn, 0);
  const y0 = yAt(ahead, DECK);
  const y1 = yAt(ahead, DECK + 4.5 * BUILD);
  const y2 = yAt(ahead, DECK + 7.5 * BUILD);
  const w = 21 * BUILD * u * 0.5;
  const s = 16 * BUILD * u * 0.21;
  const timber = tones(MAT.timber, ahead);
  const stone = tones(MAT.stone, ahead);
  // The harbour light: a braced timber tower behind, its lantern on top.
  const [lx] = proj(he + 34, hn - 4, 0);
  const la = viewOf(he + 34, hn - 4)[0];
  const ly0 = yAt(la, DECK);
  const ly1 = yAt(la, DECK + 17 * BUILD);
  const lw = 2.4 * BUILD * (1000 / la);
  const legs: Pt[][] = [
    [
      [lx - lw, ly0],
      [lx - lw * 0.3, ly1],
    ],
    [
      [lx + lw, ly0],
      [lx + lw * 0.3, ly1],
    ],
  ];
  const lbr: Pt[][] = [];
  for (let k = 0; k < 6; k++) {
    const f0 = k / 6;
    const f1 = (k + 1) / 6;
    const xa = (f: number) => lx - lw + lw * 0.7 * f;
    const xb = (f: number) => lx + lw - lw * 0.7 * f;
    const yy = (f: number) => ly0 + (ly1 - ly0) * f;
    lbr.push([
      [xa(f0), yy(f0)],
      [xb(f1), yy(f1)],
    ]);
    lbr.push([
      [xb(f0), yy(f0)],
      [xa(f1), yy(f1)],
    ]);
  }
  const lantern = new Path2D();
  lantern.rect(lx - lw * 0.55, ly1, lw * 1.1, lw * 1.1);
  const flag: Pt[][] = [
    [
      [cx, y2],
      [cx, y2 + 16 * u],
    ],
  ];
  const body = new Path2D();
  body.rect(cx - w - s, y0, 2 * w + s, y1 - y0);
  body.rect(cx - w * 0.92 - s, y1, 2 * w * 0.92 + s, y2 - y1);
  if (c.mode === "colour") {
    strokeLines(c, legs, 1.3, timber.graze, 1);
    strokeLines(c, lbr, 0.6, timber.shade, 0.8);
    ctx.fillStyle = aerial("#e7cf95", la);
    ctx.fill(lantern);
    ctx.fillStyle = timber.shade;
    ctx.beginPath();
    ctx.moveTo(lx - lw * 0.75, ly1 + lw * 1.1);
    ctx.lineTo(lx, ly1 + lw * 1.9);
    ctx.lineTo(lx + lw * 0.75, ly1 + lw * 1.1);
    ctx.closePath();
    ctx.fill();
    // The battery: lower tier of stone-faced timber, the upper tier's parapet.
    ctx.fillStyle = stone.graze;
    ctx.fillRect(cx - w - s, y0, s, y2 - y0);
    ctx.fillStyle = stone.lit;
    ctx.fillRect(cx - w, y0, 2 * w, y1 - y0);
    ctx.fillStyle = mix(timber.lit, stone.lit, 0.4);
    ctx.fillRect(cx - w * 0.92, y1, 2 * w * 0.92, y2 - y1);
    ctx.fillStyle = rgba(stone.shade, 0.6);
    ctx.fillRect(cx - w - s, y1 - 0.5, 2 * w + s, 0.6);
    // Gun ports below, embrasures above, a muzzle in each.
    for (let k = 0; k < 5; k++) {
      const gx = cx - w + ((k + 0.5) * 2 * w) / 5;
      ctx.fillStyle = mix(MAT.window, stone.shade, 0.3);
      ctx.fillRect(
        gx - w * 0.07,
        y0 + (y1 - y0) * 0.35,
        w * 0.14,
        (y1 - y0) * 0.32,
      );
      ctx.fillRect(
        gx - w * 0.06,
        y2 - (y2 - y1) * 0.45,
        w * 0.12,
        (y2 - y1) * 0.46,
      );
      ctx.fillStyle = "#2f2a2a";
      ctx.fillRect(
        gx - w * 0.025,
        y0 + (y1 - y0) * 0.43,
        w * 0.05,
        (y1 - y0) * 0.14,
      );
    }
    strokeLines(c, flag, 0.8, timber.shade, 1);
    // The tricolour, hanging in the calm.
    const fy = y2 + 16 * u;
    const fw = 4.5 * u;
    const fh = 3 * u;
    const cols = ["#4f5f86", "#e9e0cc", "#b4584a"];
    cols.forEach((col, i) => {
      ctx.fillStyle = aerial(col, ahead);
      ctx.fillRect(cx + (i * fw) / 3, fy - fh, fw / 3 + 0.05, fh);
    });
  } else {
    const pen = penAt(ahead);
    ctx.fillStyle = PAPER.low;
    ctx.fill(lantern);
    strokeLines(c, legs, pen, INK.line, 1);
    strokeLines(c, lbr, pen * 0.45, INK.hatch, 0.8);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen * 0.8);
    ctx.stroke(lantern);
    ctx.fillStyle = PAPER.low;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    const hl: Pt[][] = [];
    for (let x = cx - w - s; x < cx - w; x += c.pen(1.4))
      hl.push([
        [x, y0],
        [x, y2],
      ]);
    for (let y = y0 + 0.6; y < y2; y += c.pen(2.6))
      hl.push(
        ...brokenLine(
          [
            [cx - w, y],
            [cx + w, y],
          ],
          6,
          2,
          Math.floor(y * 10),
        ),
      );
    strokeLines(c, hl, pen * 0.45, INK.hatch, 0.7);
    ctx.restore();
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen);
    ctx.stroke(body);
    ctx.fillStyle = INK.line;
    for (let k = 0; k < 5; k++) {
      const gx = cx - w + ((k + 0.5) * 2 * w) / 5;
      ctx.fillRect(
        gx - w * 0.06,
        y0 + (y1 - y0) * 0.35,
        w * 0.12,
        (y1 - y0) * 0.3,
      );
      ctx.fillRect(
        gx - w * 0.05,
        y2 - (y2 - y1) * 0.45,
        w * 0.1,
        (y2 - y1) * 0.46,
      );
    }
    strokeLines(c, flag, pen * 0.8, INK.line, 1);
    const fy = y2 + 16 * u;
    ctx.strokeRect(cx, fy - 3 * u, 4.5 * u, 3 * u);
  }
}

function jettyPlate(id: string, depth: number, t0: number, t1: number): Plate {
  const jobs = (): PlateJob[] => {
    const out: PlateJob[] = [
      (c) => paintJetty(c, 0, t0, t1),
      (c) => paintJetty(c, 1, t0, t1),
    ];
    if (t0 === 0) out.push((c) => paintBattery(c));
    return out;
  };
  return { id, depth, box: JETTY_BOX, group: "land", jobs };
}

// ----------------------------------------------------------- the wooden fort

/**
 * The wooden fort's place: on the low-water line north of the channel,
 * 70 m south of geo.ts's PLACES.woodenFort (inside its stated 200-300 m
 * uncertainty), so the hold's frame holds it whole through the drift
 * instead of cutting it at the left edge.
 */
const FORT: Pt = [-640, 150];

function fortGeometry() {
  const [ahead, right] = viewOf(FORT[0], FORT[1]);
  const u = 1000 / ahead;
  const x = (1000 * right) / ahead;
  const y = (h: number) => yAt(ahead, h);
  return { ahead, u, x, y };
}

const FORT_BOX: Box = [-560, -372, -34, 44];

function paintFort(
  c: PlateCanvas,
  part: "piles" | "works" | "reflection",
): void {
  const { ctx } = c;
  const f = fortGeometry();
  const { u, x } = f;
  const sand = f.y(0);
  const deck = f.y(8.6);
  const para = f.y(11.2);
  // The plan seen from the roads: a west face square to the eye, the north-west and south-west faces turned away.
  const wW = 12 * u;
  const wS = 7.5 * u;
  const L = x - wW - wS;
  const R = x + wW + wS;
  const timber = tones(MAT.timber, f.ahead);
  const red = tones(
    { lit: "#c98f5f", graze: "#9a6c58", shade: "#5f4a4c" },
    f.ahead,
  );
  const weed = aerial("#3f4630", f.ahead);
  const pen = penAt(f.ahead);
  const rng = createRng(808);
  const piles: Pt[][] = [];
  const back: Pt[][] = [];
  for (let px = L + 0.6; px < R; px += 2.2 * u * (0.85 + rng() * 0.3)) {
    piles.push([
      [px, sand],
      [px, deck],
    ]);
    if (rng() < 0.7)
      back.push([
        [px + 0.9 * u, sand + 0.4],
        [px + 0.9 * u, deck],
      ]);
  }
  const braces: Pt[][] = [];
  for (let px = L; px < R - 4 * u; px += 4.4 * u) {
    braces.push([
      [px, sand + 1.5 * u],
      [px + 4.4 * u, deck - 0.6 * u],
    ]);
    braces.push([
      [px + 4.4 * u, sand + 1.5 * u],
      [px, deck - 0.6 * u],
    ]);
  }
  if (part === "reflection") {
    // Its reflection in the wet sand: broken, darker, short.
    const refl: Pt[][] = [];
    for (const [a] of piles) {
      let yy = sand - 0.3;
      while (yy > sand - 14) {
        const l = 1 + rng() * 3;
        if (rng() < 0.7)
          refl.push([
            [a[0], yy],
            [a[0], yy - l],
          ]);
        yy -= l + 0.6 + rng() * 1.6;
      }
    }
    if (c.mode === "colour") {
      ctx.fillStyle = rgba(mix(timber.shade, "#8b8790", 0.4), 0.28);
      ctx.fillRect(L, sand - 10, R - L, 10);
      strokeLines(c, refl, 1.4, timber.shade, 0.35);
    } else strokeLines(c, refl, pen * 0.6, INK.hatch, 0.5);
    return;
  }
  if (part === "piles") {
    if (c.mode === "colour") {
      strokeLines(c, back, 1.5, timber.shade, 0.9);
      strokeLines(c, braces, 1, timber.shade, 0.85);
      strokeLines(c, piles, 1.9, mix(timber.graze, timber.lit, 0.55), 1);
      strokeLines(
        c,
        piles.map(([a]) => [a, [a[0], a[1] + 1.8 * u]] as Pt[]),
        2.1,
        weed,
        0.95,
      );
      strokeLines(
        c,
        piles.map(
          ([a, b]) =>
            [
              [a[0] + 0.25, a[1]],
              [b[0] + 0.25, b[1]],
            ] as Pt[],
        ),
        0.7,
        timber.shade,
        0.8,
      );
    } else {
      strokeLines(c, back, pen * 0.7, INK.hatch, 0.8);
      strokeLines(c, braces, pen * 0.55, INK.hatch, 0.85);
      strokeLines(c, piles, pen, INK.line, 1);
      const wl: Pt[][] = [];
      for (const [a] of piles)
        for (const o of [-0.6, 0, 0.6])
          wl.push([
            [a[0] + o, a[1]],
            [a[0] + o * 1.3, a[1] + 1.4 * u],
          ]);
      strokeLines(c, wl, pen * 0.6, INK.line, 0.7);
    }
    return;
  }
  // The platform's edge, the parapet's three faces with embrasures and guns, the guard house, the flagstaff.
  const faces: { x0: number; x1: number; tone: string; hatch: number }[] = [
    { x0: L, x1: x - wW, tone: red.lit, hatch: 0 },
    { x0: x - wW, x1: x + wW, tone: mix(red.lit, red.graze, 0.15), hatch: 0 },
    { x0: x + wW, x1: R, tone: red.graze, hatch: 1 },
  ];
  const edge = new Path2D();
  edge.rect(L - 0.5 * u, deck - 0.9 * u, R - L + u, 0.9 * u);
  const parapet = new Path2D();
  parapet.moveTo(L, deck);
  parapet.lineTo(L, para - 0.3 * u);
  parapet.lineTo(x - wW, para);
  parapet.lineTo(x + wW, para);
  parapet.lineTo(R, para - 0.3 * u);
  parapet.lineTo(R, deck);
  parapet.closePath();
  const ports: number[] = [];
  for (let k = 0; k < 6; k++) ports.push(x - wW + ((k + 0.5) * 2 * wW) / 6);
  ports.push(L + wS * 0.5, R - wS * 0.5);
  const hutX = x + 2 * u;
  const hutW = 6 * u;
  const hutY0 = para - 0.4 * u;
  const hutY1 = f.y(13.6);
  const hutR = f.y(15.6);
  const staff: Pt[][] = [
    [
      [x - 6 * u, para],
      [x - 6 * u, f.y(23)],
    ],
  ];
  if (c.mode === "colour") {
    ctx.fillStyle = timber.shade;
    ctx.fill(edge);
    strokeLines(
      c,
      [
        [
          [L - 0.5 * u, deck],
          [R + 0.5 * u, deck],
        ],
      ],
      0.8,
      timber.lit,
      0.9,
    );
    for (const fc of faces) {
      ctx.fillStyle = fc.tone;
      ctx.fillRect(fc.x0, deck, fc.x1 - fc.x0, para - deck);
    }
    // Planking.
    const planks: Pt[][] = [];
    for (let k = 1; k < 5; k++)
      planks.push([
        [L, deck + ((para - deck) * k) / 5],
        [R, deck + ((para - deck) * k) / 5],
      ]);
    strokeLines(c, planks, 0.5, red.shade, 0.35);
    // The guard house: its west end lit, the roof grazed.
    ctx.fillStyle = timber.graze;
    ctx.fillRect(hutX - hutW / 2 - 1.2 * u, hutY0, 1.2 * u, hutY1 - hutY0);
    ctx.fillStyle = mix(timber.lit, MAT.glint, 0.15);
    ctx.fillRect(hutX - hutW / 2, hutY0, hutW, hutY1 - hutY0);
    ctx.fillStyle = tones(MAT.tile, f.ahead).graze;
    ctx.beginPath();
    ctx.moveTo(hutX - hutW / 2 - 1.6 * u, hutY1);
    ctx.lineTo(hutX + hutW / 2 + 0.4 * u, hutY1);
    ctx.lineTo(hutX + hutW / 2 - 0.6 * u, hutR);
    ctx.lineTo(hutX - hutW / 2 - 0.9 * u, hutR);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = MAT.window;
    ctx.fillRect(hutX - 0.6 * u, hutY0 + 0.6 * u, 1.2 * u, 1.3 * u);
    // Embrasures, a gun's muzzle in each.
    for (const px of ports) {
      ctx.fillStyle = mix(MAT.window, red.shade, 0.3);
      ctx.fillRect(px - 0.75 * u, para - 1.5 * u, 1.5 * u, 1.5 * u + 0.05);
      ctx.fillStyle = "#2b2626";
      ctx.fillRect(px - 0.35 * u, para - 1.1 * u, 0.7 * u, 0.55 * u);
    }
    strokeLines(
      c,
      [
        [
          [L, para - 0.3 * u],
          [x - wW, para],
          [x + wW, para],
        ],
      ],
      0.8,
      mix(red.lit, MAT.glint, 0.4),
      0.9,
    );
    strokeLines(c, staff, 1, timber.shade, 1);
    const fy = f.y(23);
    const fw = 3.6 * u;
    const fh = 2.4 * u;
    ["#4f5f86", "#e9e0cc", "#b4584a"].forEach((col, i) => {
      ctx.fillStyle = aerial(col, f.ahead);
      ctx.beginPath();
      const xa = x - 6 * u + (i * fw) / 3;
      const xb = xa + fw / 3;
      const sag = (i + 1) * 0.25 * u;
      ctx.moveTo(xa, fy - i * 0.25 * u);
      ctx.lineTo(xb + 0.05, fy - sag);
      ctx.lineTo(xb + 0.05, fy - sag - fh);
      ctx.lineTo(xa, fy - i * 0.25 * u - fh);
      ctx.closePath();
      ctx.fill();
    });
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(edge);
    ctx.fill(parapet);
    ctx.fillRect(
      hutX - hutW / 2 - 1.2 * u,
      hutY0,
      hutW + 1.2 * u,
      hutR - hutY0,
    );
    const hl: Pt[][] = [];
    for (let k = 1; k < 5; k++)
      hl.push(
        ...brokenLine(
          [
            [L, deck + ((para - deck) * k) / 5],
            [R, deck + ((para - deck) * k) / 5],
          ],
          10,
          1.5,
          70 + k,
        ),
      );
    for (let px = x + wW; px < R; px += c.pen(1.5))
      hl.push([
        [px, deck],
        [px, para],
      ]);
    for (
      let px = hutX - hutW / 2 - 1.2 * u;
      px < hutX - hutW / 2;
      px += c.pen(1.5)
    )
      hl.push([
        [px, hutY0],
        [px, hutY1],
      ]);
    strokeLines(c, hl, pen * 0.5, INK.hatch, 0.8);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen);
    ctx.stroke(parapet);
    strokeLines(
      c,
      [
        [
          [L - 0.5 * u, deck - 0.9 * u],
          [R + 0.5 * u, deck - 0.9 * u],
        ],
        [
          [x - wW, deck],
          [x - wW, para],
        ],
        [
          [x + wW, deck],
          [x + wW, para],
        ],
        [
          [hutX - hutW / 2 - 1.2 * u, hutY0],
          [hutX - hutW / 2 - 1.2 * u, hutY1],
          [hutX + hutW / 2, hutY1],
          [hutX + hutW / 2, hutY0],
        ],
        [
          [hutX - hutW / 2 - 1.6 * u, hutY1],
          [hutX - hutW / 2 - 0.9 * u, hutR],
          [hutX + hutW / 2 - 0.6 * u, hutR],
          [hutX + hutW / 2 + 0.4 * u, hutY1],
        ],
      ],
      pen,
      INK.line,
      1,
    );
    ctx.fillStyle = INK.line;
    for (const px of ports)
      ctx.fillRect(px - 0.7 * u, para - 1.4 * u, 1.4 * u, 1.4 * u);
    strokeLines(c, staff, pen * 0.8, INK.line, 1);
    const fy = f.y(23);
    ctx.strokeRect(x - 6 * u, fy - 2.4 * u, 3.6 * u, 2.4 * u);
  }
}

/** A stub of the fascine dike, running from the fort toward the shore. */
function paintDike(c: PlateCanvas): void {
  const { ctx } = c;
  const top: Pt[] = [];
  const foot: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const e = FORT[0] + 22 + k * 12;
    const n = FORT[1] + 2 + k * 0.6;
    top.push(proj(e, n, 1.4));
    foot.push(proj(e, n, 0));
  }
  const p = new Path2D();
  p.moveTo(foot[0][0], foot[0][1]);
  for (const q of foot) p.lineTo(q[0], q[1]);
  for (let i = top.length - 1; i >= 0; i--) p.lineTo(top[i][0], top[i][1]);
  p.closePath();
  const air = viewOf(FORT[0], FORT[1])[0];
  if (c.mode === "colour") {
    ctx.fillStyle = aerial("#5a5040", air);
    ctx.fill(p);
    strokeLines(c, [top], 0.8, aerial("#b0915f", air), 0.8);
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(p);
    strokeLines(c, [top], penAt(air) * 0.8, INK.line, 0.9);
    const hl: Pt[][] = [];
    for (let i = 0; i < top.length; i++) hl.push([foot[i], top[i]]);
    strokeLines(c, hl, penAt(air) * 0.5, INK.hatch, 0.7);
  }
}

function fortPlate(): Plate {
  const f = () => fortGeometry();
  return {
    id: "wooden-fort",
    depth: Math.round(viewOf(FORT[0], FORT[1])[0]),
    box: FORT_BOX,
    group: "land",
    jobs: () => [
      (c) => {
        f();
        paintDike(c);
      },
      (c) => paintFort(c, "reflection"),
      (c) => paintFort(c, "piles"),
      (c) => paintFort(c, "works"),
    ],
  };
}

/** The harbour's plates, far to near. */
export function harbourPlates(): Plate[] {
  return [
    basinPlate(),
    jettyPlate("jetty-roots", 1290, 0.5, 1),
    jettyPlate("jetty-heads", 1140, 0, 0.5),
    fortPlate(),
  ];
}
