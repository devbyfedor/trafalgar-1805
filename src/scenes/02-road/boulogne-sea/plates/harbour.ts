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
import {
  basinCraft,
  basinTiers,
  engraveCraft,
  paintCraft,
} from "./harbour/basin";
import { DUSK } from "./town/houses";
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

/** Points along the river, every `step` metres, with the direction there. */
function alongRiver(
  from: number,
  to: number,
  step: number,
): { e: number; n: number; dx: number; dn: number }[] {
  const out: { e: number; n: number; dx: number; dn: number }[] = [];
  let s = 0;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, ay] = RIVER[i];
    const [bx, by] = RIVER[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    for (let t = 0; t < len; t += step) {
      const at = s + t;
      if (at >= from && at <= to)
        out.push({
          e: ax + ((bx - ax) * t) / len,
          n: ay + ((by - ay) * t) / len,
          dx: (bx - ax) / len,
          dn: (by - ay) / len,
        });
    }
    s += len;
  }
  return out;
}
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
  const n = foot.length;
  // Its ends fade out over a few segments, never a cut.
  const fade = (i: number) => Math.min(1, Math.min(i, n - 1 - i) / 4);
  const seg = (i: number, k0: number, k1: number): Path2D => {
    const p = new Path2D();
    const at = (j: number, k: number): Pt => [
      foot[j][0] + (top[j][0] - foot[j][0]) * k,
      foot[j][1] + (top[j][1] - foot[j][1]) * k,
    ];
    const q = [at(i, k0), at(i + 1, k0), at(i + 1, k1), at(i, k1)];
    p.moveTo(q[0][0], q[0][1]);
    for (const r of q) p.lineTo(r[0], r[1]);
    p.closePath();
    return p;
  };
  // The quay's dressed stone, weathered dark like the town's.
  const t = tones(
    { lit: "#a88d6c", graze: "#7c6f62", shade: "#55525a" },
    BASIN_DEPTH,
  );
  if (c.mode === "colour") {
    const g = ctx.createLinearGradient(0, -3, 0, 4);
    g.addColorStop(0, mix(t.shade, "#4d4a3c", 0.4));
    g.addColorStop(0.45, t.graze);
    g.addColorStop(1, t.lit);
    const weed = aerial("#323a2a", BASIN_DEPTH);
    const course = rgba(t.shade, 0.35);
    for (let i = 0; i < n - 1; i++) {
      ctx.globalAlpha = fade(i + 0.5);
      // The wall: its dressed stone, weed and wet at the foot, courses, the coping lit along its top.
      ctx.fillStyle = g;
      ctx.fill(seg(i, 0, 1));
      ctx.fillStyle = weed;
      ctx.fill(seg(i, 0, 0.22));
      ctx.strokeStyle = course;
      ctx.lineWidth = c.pen(0.4);
      ctx.stroke(seg(i, 0.45, 0.7));
      ctx.fillStyle = mix(t.lit, MAT.glint, 0.3);
      ctx.fill(seg(i, 0.92, 1));
    }
    ctx.globalAlpha = 1;
  } else {
    for (let i = 0; i < n - 1; i++) {
      ctx.globalAlpha = fade(i + 0.5);
      ctx.fillStyle = PAPER.low;
      ctx.fill(seg(i, 0, 1));
    }
    ctx.globalAlpha = 1;
    strokeLines(
      c,
      brokenLine(top.slice(3, -3), 14, 3, 61),
      penAt(BASIN_DEPTH) * 0.8,
      INK.line,
      0.75,
    );
    strokeLines(
      c,
      brokenLine(
        foot
          .slice(3, -3)
          .map(([x, y], i) => [x, y + (top[i + 3][1] - y) * 0.2] as Pt),
        6,
        3,
        62,
      ),
      penAt(BASIN_DEPTH) * 0.5,
      INK.hatch,
      0.7,
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

/** The battery's front across the view (metres either side of the west jetty's axis, + to the left) and its centre: the pile platform under it is as broad. */
const BATTERY = { left: 27.7, right: 21, depth: 14 } as const;

interface Bent {
  /** Metres back from the head. */
  s: number;
  piles: Pt[][];
  ahead: number;
}

/** A jetty's bents of piles from t0 to t1 (far to near), each four piles across (and, under the battery, the platform's twelve). */
function bentsOf(j: number, t0: number, t1: number): Bent[] {
  const [he, hn] = jettyAt(j, 0);
  const [re, rn] = jettyAt(j, 1);
  const len = Math.hypot(re - he, rn - hn);
  const dx = (re - he) / len;
  const dn = (rn - hn) / len;
  // Across the jetty: its north side is +.
  const ax = -dn;
  const an = dx;
  const half = 4.5 * BUILD * 0.5;
  const out: Bent[] = [];
  for (let s = len * t1; s >= len * t0 - 1e-6; s -= 4.2) {
    const [e, n] = jettyAt(j, s / len);
    const across: number[] =
      j === 1 && s < BATTERY.depth
        ? Array.from(
            { length: 12 },
            (_, k) =>
              -BATTERY.right + ((BATTERY.left + BATTERY.right) * k) / 11,
          )
        : [-half, -half * 0.34, half * 0.34, half];
    const piles = across.map((a) => {
      const pe = e + ax * a;
      const pn = n + an * a;
      return [proj(pe, pn, -0.5), proj(pe, pn, DECK)];
    });
    out.push({ s, piles, ahead: viewOf(e, n)[0] });
  }
  return out;
}

/** The deck's two edges from t0 to t1 (head to root), at the deck's height: the side lit by the low sun and the side in shade. */
function deckEdges(
  j: number,
  t0: number,
  t1: number,
): { lit: Pt[]; shade: Pt[] } {
  const [he, hn] = jettyAt(j, 0);
  const [re, rn] = jettyAt(j, 1);
  const len = Math.hypot(re - he, rn - hn);
  const ax = -(rn - hn) / len;
  const an = (re - he) / len;
  const half = 4.5 * BUILD * 0.5;
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let s = len * t0; s <= len * t1 + 0.01; s += 6) {
    const [e, n] = jettyAt(j, s / len);
    const wide = j === 1 && s < BATTERY.depth;
    a.push(
      proj(
        e + ax * (wide ? BATTERY.left : half),
        n + an * (wide ? BATTERY.left : half),
        DECK,
      ),
    );
    b.push(
      proj(
        e - ax * (wide ? BATTERY.right : half),
        n - an * (wide ? BATTERY.right : half),
        DECK,
      ),
    );
  }
  // The north side (+, left in the view) faces the low sun's quarter (it is the side the eye sees on the left).
  return { lit: a, shade: b };
}

/**
 * A timber jetty seen almost end-on, as what it is: a tunnel of bents of
 * piles receding toward the harbour, the head's bent full size with its
 * cap beam, the deck's edge and a handrail; the bents behind smaller,
 * thinner and lost in the dark under the deck, the gaps between them open
 * on the strand and the lit harbour; braces only on the nearest bents;
 * weed and wet at the piles' feet, their broken reflections on the wet
 * sand. Under the battery the west jetty's head widens into a pile
 * platform as broad as the battery.
 */
function paintJetty(c: PlateCanvas, j: number, t0: number, t1: number): void {
  const { ctx } = c;
  const bents = bentsOf(j, t0, t1);
  if (!bents.length) return;
  const [he, hn] = jettyAt(j, 0);
  const air = viewOf(he, hn)[0];
  const timber = tones(MAT.timber, air);
  const tar = aerial("#2f2a26", air);
  const weed = aerial("#2f3626", air);
  const pen = penAt(air);
  const head = t0 === 0;
  const edges = deckEdges(j, t0, t1);
  // The deck's underside between its edges, in the dark: the tunnel's ceiling.
  const ceiling = new Path2D();
  ceiling.moveTo(edges.lit[0][0], edges.lit[0][1]);
  for (const q of edges.lit) ceiling.lineTo(q[0], q[1]);
  for (let i = edges.shade.length - 1; i >= 0; i--)
    ceiling.lineTo(edges.shade[i][0], edges.shade[i][1]);
  ceiling.closePath();
  // Braces on the nearest bents only: a diagonal each, alternating, from a pile's foot to its neighbour's head.
  const braces: Pt[][] = [];
  bents.forEach((b) => {
    const fromHead = Math.round(b.s / 4.2);
    if (!head || fromHead > 3) return;
    const ps = b.piles;
    for (let k = 0; k < ps.length - 1; k++) {
      const [a0, a1] = ps[k];
      const [b0, b1] = ps[k + 1];
      const up = (p: Pt, q: Pt, f: number): Pt => [
        p[0] + (q[0] - p[0]) * f,
        p[1] + (q[1] - p[1]) * f,
      ];
      if ((k + fromHead) % 2) braces.push([up(a0, a1, 0.12), up(b0, b1, 0.82)]);
      else braces.push([up(b0, b1, 0.12), up(a0, a1, 0.82)]);
    }
  });
  if (c.mode === "colour") {
    ctx.fillStyle = mix(tar, "#4a3d33", 0.25);
    ctx.fill(ceiling);
    // Far to near: the farther bents darker (under the deck, in each other's shadow) and finer; the head's lit square-on.
    bents.forEach((b) => {
      const fromHead = Math.round(b.s / 4.2);
      // Beyond the nearest bents only every third shows, fading into the dark under the deck.
      if (fromHead > 5 && fromHead % 3) return;
      const atHead = head && fromHead === 0;
      const k = Math.min(1, fromHead / 8);
      const fade = fromHead > 5 ? Math.max(0.25, 0.7 - fromHead * 0.012) : 1;
      const body = atHead
        ? mix(timber.graze, timber.lit, 0.35)
        : mix(mix(timber.shade, tar, 0.5), aerial("#6c6660", air), k * 0.35);
      const px = atHead ? 1.9 : Math.max(0.7, 1.5 - fromHead * 0.12);
      strokeLines(c, b.piles, px, body, fade);
      if (atHead || (head && fromHead < 3))
        // The low sun on each pile's west edge.
        strokeLines(
          c,
          b.piles.map(
            ([a, z]) =>
              [
                [a[0] - c.pen(px * 0.35), a[1] + (z[1] - a[1]) * 0.18],
                [z[0] - c.pen(px * 0.35), z[1]],
              ] as Pt[],
          ),
          0.6,
          mix(timber.lit, MAT.glint, atHead ? 0.35 : 0.1),
          atHead ? 0.9 : 0.5,
        );
      // Weed: the piles' feet green-black to the high-water mark.
      strokeLines(
        c,
        b.piles.map(
          ([a, z]) => [a, [z[0], a[1] + (z[1] - a[1]) * 0.2]] as Pt[],
        ),
        px + 0.3,
        weed,
        0.95 * fade,
      );
    });
    strokeLines(c, braces, 0.7, mix(timber.shade, tar, 0.3), 0.85);
    // The deck's edges: the shaded one dark, the lit one a gold line on a dark plank.
    strokeLines(c, [edges.shade], 1.2, tar, 0.95);
    strokeLines(c, [edges.lit], 1.3, mix(timber.shade, tar, 0.4), 1);
    strokeLines(
      c,
      [edges.lit.map(([x, y]) => [x, y + 0.25] as Pt)],
      0.7,
      mix(timber.lit, MAT.glint, 0.4),
      0.95,
    );
    if (head) {
      const hb = bents[bents.length - 1];
      const l = hb.piles[0][1];
      const r = hb.piles[hb.piles.length - 1][1];
      // The cap beam across the head's bent, its lit face; the handrail with its posts above.
      strokeLines(c, [[l, r]], 1.6, tar, 1);
      strokeLines(
        c,
        [
          [
            [l[0], l[1] + 0.22],
            [r[0], r[1] + 0.22],
          ],
        ],
        0.6,
        mix(timber.lit, MAT.glint, 0.3),
        0.9,
      );
      const rail = (1.1 * BUILD * 1000) / hb.ahead;
      const posts: Pt[][] = hb.piles.map(([, z]) => [z, [z[0], z[1] + rail]]);
      strokeLines(c, posts, 0.8, mix(timber.graze, timber.shade, 0.4), 1);
      strokeLines(
        c,
        [
          [
            [l[0], l[1] + rail],
            [r[0], r[1] + rail],
          ],
        ],
        0.8,
        mix(timber.graze, timber.lit, 0.3),
        1,
      );
      // The wet sand at the head's feet: a dark wet line and the piles' broken reflections.
      const rng = createRng(330 + j);
      const refl: Pt[][] = [];
      for (const [a] of hb.piles) {
        let yy = a[1] - 0.3;
        while (yy > a[1] - 7) {
          const len = 0.6 + rng() * 1.6;
          if (rng() < 0.7)
            refl.push([
              [a[0], yy],
              [a[0], yy - len],
            ]);
          yy -= len + 0.4 + rng() * 1.2;
        }
      }
      strokeLines(c, refl, 1.3, mix(tar, "#7d7a80", 0.35), 0.45);
      strokeLines(
        c,
        [
          [
            [l[0] - 1, hb.piles[0][0][1] - 0.15],
            [r[0] + 1, hb.piles[0][0][1] - 0.15],
          ],
        ],
        1,
        aerial("#4c4a46", air),
        0.4,
      );
    }
  } else {
    // The engraving: hairlines for the far bents, hatching for the dark under the deck, the head's bent outlined.
    ctx.save();
    ctx.clip(ceiling);
    const hl: Pt[][] = [];
    for (let x = -205; x < -60; x += c.pen(1.6))
      hl.push([
        [x, -2],
        [x + 4, 30],
      ]);
    strokeLines(c, hl, pen * 0.4, INK.hatch, 0.7);
    ctx.restore();
    bents.forEach((b) => {
      const fromHead = Math.round(b.s / 4.2);
      // The engraver draws the head's bent, two behind it, and only a hairline or two of the dark beyond.
      if (fromHead % 2 || (fromHead > 4 && fromHead % 8)) return;
      const atHead = head && fromHead === 0;
      strokeLines(
        c,
        b.piles,
        atHead ? pen : fromHead < 4 && head ? pen * 0.6 : pen * 0.35,
        atHead ? INK.line : INK.hatch,
        atHead ? 1 : fromHead < 5 ? 0.7 : 0.3,
      );
    });
    strokeLines(c, braces, pen * 0.45, INK.hatch, 0.8);
    // Weed at the piles' feet: short strokes.
    const weedL: Pt[][] = [];
    for (const b of bents.slice(-4))
      for (const [a] of b.piles)
        for (const o of [-0.4, 0.4])
          weedL.push([
            [a[0] + o, a[1]],
            [a[0] + o * 1.3, a[1] + 1.3],
          ]);
    strokeLines(c, weedL, pen * 0.5, INK.line, 0.6);
    strokeLines(c, [edges.lit, edges.shade], pen * 0.8, INK.line, 0.9);
    if (head) {
      const hb = bents[bents.length - 1];
      const l = hb.piles[0][1];
      const r = hb.piles[hb.piles.length - 1][1];
      const rail = (1.1 * BUILD * 1000) / hb.ahead;
      strokeLines(
        c,
        [
          [l, r],
          [
            [l[0], l[1] + rail],
            [r[0], r[1] + rail],
          ],
          ...hb.piles.map(([, z]) => [z, [z[0], z[1] + rail]] as Pt[]),
        ],
        pen * 0.8,
        INK.line,
        1,
      );
    }
  }
}

/**
 * The pierhead battery on the western jetty's head (history-notes.md,
 * "The harbour works": two tiers, ten 36-pounders): seated on its pile
 * platform, the deck's edge a tarred band lit along its top; the lower
 * tier's front of coursed stone with a slight batter, its five gun ports'
 * lids hinged up over the muzzles; the upper tier's timber parapet, its
 * top line cut by five embrasures with a muzzle in each; the west front
 * lit warm, the south face in cool shade. Set back from it, the taller
 * wooden harbour light (Lewis's tall, white, pointed "Light House"): a
 * boarded, white-painted, tapering timber tower, its glazed lantern under
 * a pointed roof catching the sun.
 */
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
  // The south face, turned from the eye a little (the battery stands left of the view's axis): a strip at the right.
  const s = 16 * BUILD * u * 0.12;
  const L = cx - w - 6.7 * u;
  const R = cx + w;
  const bat = 0.35;
  const stone = tones(
    { lit: "#a68a6a", graze: "#7a6c60", shade: "#56525b" },
    ahead,
  );
  const timber = tones(MAT.timber, ahead);
  const tar = aerial("#2f2a26", ahead);
  const pen = penAt(ahead);
  // The harbour light, set back: base and top half-widths, heights.
  const [lx] = proj(he + 34, hn - 4, 0);
  const la = viewOf(he + 34, hn - 4)[0];
  const lu = 1000 / la;
  const ly0 = yAt(la, DECK);
  const ly1 = yAt(la, DECK + 15 * BUILD);
  const lb = 2.6 * BUILD * lu;
  const lt = 1.5 * BUILD * lu;
  const lh = 2.2 * BUILD * lu;
  const lr = yAt(la, DECK + 15 * BUILD) + lh;
  const lapex = lr + 3 * BUILD * lu;
  const ports = Array.from(
    { length: 5 },
    (_, k) => L + 1.2 + ((k + 0.5) * (R - L - 2.4)) / 5,
  );
  // The lower tier's front, battered; the upper tier's parapet with its embrasures cut down into its top.
  const lower = new Path2D();
  lower.moveTo(L - bat, y0);
  lower.lineTo(R + bat, y0);
  lower.lineTo(R, y1);
  lower.lineTo(L, y1);
  lower.closePath();
  const notchW = (R - L) * 0.045;
  const notchD = (y2 - y1) * 0.42;
  const parapet = new Path2D();
  parapet.moveTo(L + 0.2, y1);
  parapet.lineTo(R - 0.2, y1);
  parapet.lineTo(R - 0.35, y2);
  for (let k = ports.length - 1; k >= 0; k--) {
    const px = ports[k];
    parapet.lineTo(px + notchW, y2);
    parapet.lineTo(px + notchW * 0.7, y2 - notchD);
    parapet.lineTo(px - notchW * 0.7, y2 - notchD);
    parapet.lineTo(px - notchW, y2);
  }
  parapet.lineTo(L + 0.35, y2);
  parapet.closePath();
  const side = new Path2D();
  side.moveTo(R + bat, y0);
  side.lineTo(R + bat + s, y0 + 0.3);
  side.lineTo(R + s - 0.15, y2 - 0.2);
  side.lineTo(R - 0.35, y2);
  side.lineTo(R, y1);
  side.closePath();
  const tower = new Path2D();
  tower.moveTo(lx - lb, ly0);
  tower.lineTo(lx + lb, ly0);
  tower.lineTo(lx + lt, ly1);
  tower.lineTo(lx - lt, ly1);
  tower.closePath();
  const roof = new Path2D();
  roof.moveTo(lx - lt * 1.35, lr);
  roof.lineTo(lx, lapex);
  roof.lineTo(lx + lt * 1.35, lr);
  roof.closePath();
  // The flagstaff on the battery's left half, clear of the light behind.
  const fx = cx - w * 0.45;
  const flag: Pt[][] = [
    [
      [fx, y2],
      [fx, y2 + 16 * u],
    ],
  ];
  if (c.mode === "colour") {
    // The light: its west face white in the sun, its south face cool; boards; the gallery, the lantern glazed and glinting, the pointed roof.
    const white = tones(
      { lit: "#efe2c6", graze: "#c6bba8", shade: "#8e8d98" },
      la,
    );
    ctx.fillStyle = white.lit;
    ctx.fill(tower);
    ctx.fillStyle = white.shade;
    ctx.beginPath();
    ctx.moveTo(lx + lb * 0.35, ly0);
    ctx.lineTo(lx + lb, ly0);
    ctx.lineTo(lx + lt, ly1);
    ctx.lineTo(lx + lt * 0.35, ly1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(white.shade, 0.45);
    ctx.lineWidth = c.pen(0.45);
    ctx.beginPath();
    for (let y = ly0 + 0.9; y < ly1 - 0.3; y += 0.9) {
      const k = (y - ly0) / (ly1 - ly0);
      const half = lb + (lt - lb) * k;
      ctx.moveTo(lx - half, y);
      ctx.lineTo(lx + half, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(aerial(DUSK, la), 0.5);
    ctx.fillRect(lx - lb, ly0, lb * 2, (ly1 - ly0) * 0.12);
    // The lantern.
    ctx.fillStyle = aerial("#3a3434", la);
    ctx.fillRect(lx - lt, ly1, lt * 2, lh);
    ctx.fillStyle = aerial("#f6d98c", la);
    ctx.fillRect(lx - lt * 0.8, ly1 + lh * 0.18, lt * 0.95, lh * 0.64);
    ctx.fillStyle = rgba(aerial("#fff0c0", la), 0.9);
    ctx.fillRect(lx - lt * 0.65, ly1 + lh * 0.3, lt * 0.35, lh * 0.4);
    strokeLines(
      c,
      [
        [
          [lx - lt * 1.3, ly1],
          [lx + lt * 1.3, ly1],
        ],
      ],
      0.9,
      tar,
      1,
    );
    const lg = ctx.createLinearGradient(lx - lt, 0, lx + lt, 0);
    lg.addColorStop(0, aerial("#8d8a8e", la));
    lg.addColorStop(0.4, aerial("#6c6a72", la));
    lg.addColorStop(1, aerial("#3c3c48", la));
    ctx.fillStyle = lg;
    ctx.fill(roof);
    strokeLines(
      c,
      [
        [
          [lx, lapex],
          [lx, lapex + 1.2],
        ],
      ],
      0.6,
      tar,
      1,
    );
    // The platform's deck edge: a tarred band, lit along its top.
    ctx.fillStyle = tar;
    ctx.fillRect(L - 1, y0 - 0.9, R - L + s + 2, 0.9);
    strokeLines(
      c,
      [
        [
          [L - 1, y0],
          [R + s + 1, y0],
        ],
      ],
      0.8,
      mix(timber.lit, MAT.glint, 0.3),
      0.95,
    );
    // The lower tier: coursed stone, warm on the west front; a dusk at its foot.
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix(stone.lit, stone.shade, 0.35));
    g.addColorStop(0.3, stone.lit);
    g.addColorStop(1, mix(stone.lit, "#fff0d0", 0.08));
    ctx.fillStyle = g;
    ctx.fill(lower);
    ctx.fillStyle = mix(stone.shade, "#4a4652", 0.2);
    ctx.fill(side);
    ctx.save();
    ctx.clip(lower);
    const courses: Pt[][] = [];
    for (let y = y0 + 0.75; y < y1; y += 0.75)
      courses.push([
        [L - 1, y],
        [R + 1, y],
      ]);
    strokeLines(c, courses, 0.4, stone.shade, 0.35);
    ctx.restore();
    // The upper tier's timber parapet: weathered planks, lit on its top, the embrasures cut into it.
    ctx.fillStyle = mix(timber.lit, stone.graze, 0.35);
    ctx.fill(parapet);
    ctx.save();
    ctx.clip(parapet);
    const planks: Pt[][] = [];
    for (let y = y1 + 0.55; y < y2; y += 0.55)
      planks.push([
        [L, y],
        [R, y],
      ]);
    strokeLines(c, planks, 0.4, timber.shade, 0.4);
    ctx.restore();
    strokeLines(
      c,
      [
        [
          [L, y1],
          [R, y1],
        ],
      ],
      1,
      tar,
      0.8,
    );
    strokeLines(
      c,
      [
        [
          [L + 0.35, y2 - 0.1],
          [R - 0.35, y2 - 0.1],
        ],
      ],
      0.7,
      mix(timber.lit, MAT.glint, 0.35),
      0.8,
    );
    for (const px of ports) {
      // The upper guns' muzzles in their embrasures.
      ctx.fillStyle = aerial("#221d1d", ahead);
      ctx.fillRect(
        px - notchW * 0.35,
        y2 - notchD - 0.05,
        notchW * 0.7,
        notchD * 0.45,
      );
      // The lower tier's ports: dark, a muzzle, the lid hinged up over it.
      const pw = notchW * 1.1;
      const ph = (y1 - y0) * 0.3;
      const py = y0 + (y1 - y0) * 0.38;
      ctx.fillStyle = aerial("#2b2526", ahead);
      ctx.fillRect(px - pw / 2, py, pw, ph);
      ctx.fillStyle = aerial("#120f10", ahead);
      ctx.fillRect(px - pw * 0.2, py + ph * 0.3, pw * 0.4, ph * 0.4);
      strokeLines(
        c,
        [
          [
            [px - pw / 2, py + ph],
            [px - pw * 0.15, py + ph + ph * 0.7],
          ],
        ],
        0.9,
        mix(timber.shade, tar, 0.4),
        1,
      );
    }
    strokeLines(c, flag, 0.8, tar, 1);
    // The tricolour, hanging in the calm.
    const fy = y2 + 16 * u;
    const fw = 4.5 * u;
    const fh = 3 * u;
    const cols = ["#4f5f86", "#e9e0cc", "#b4584a"];
    cols.forEach((col, i) => {
      ctx.fillStyle = aerial(col, ahead);
      ctx.fillRect(fx + (i * fw) / 3, fy - fh, fw / 3 + 0.05, fh);
    });
  } else {
    // The light: its outline, boards hatched on the shaded face, the lantern's bars, the roof hatched.
    ctx.fillStyle = PAPER.low;
    ctx.fill(tower);
    ctx.fill(roof);
    ctx.fillRect(lx - lt, ly1, lt * 2, lh);
    const hl: Pt[][] = [];
    for (let x = lx + lb * 0.35; x < lx + lb; x += c.pen(1.4)) {
      const k = (x - lx) / lb;
      hl.push([
        [x, ly0],
        [lx + lt * k, ly1],
      ]);
    }
    for (let x = lx; x < lx + lt * 1.3; x += c.pen(1.4))
      hl.push([
        [x, lr],
        [lx + (x - lx) * 0.2, lapex - 0.5],
      ]);
    strokeLines(c, hl, pen * 0.4, INK.hatch, 0.8);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen * 0.8);
    ctx.stroke(tower);
    ctx.stroke(roof);
    strokeLines(
      c,
      [
        [
          [lx - lt, ly1],
          [lx - lt, ly1 + lh],
        ],
        [
          [lx, ly1],
          [lx, ly1 + lh],
        ],
        [
          [lx + lt, ly1],
          [lx + lt, ly1 + lh],
        ],
        [
          [lx - lt * 1.3, ly1],
          [lx + lt * 1.3, ly1],
        ],
      ],
      pen * 0.6,
      INK.line,
      1,
    );
    // The battery: paper, hatching on the shaded face and the lower tier's courses, the embrasures and ports outlined, muzzles as short strokes.
    ctx.fillStyle = PAPER.low;
    ctx.fill(lower);
    ctx.fill(parapet);
    ctx.fill(side);
    const bl: Pt[][] = [];
    for (let x = R; x < R + s + bat; x += c.pen(1.2))
      bl.push([
        [x, y0],
        [x, y2],
      ]);
    for (let y = y0 + 0.75; y < y1; y += 1.5)
      bl.push(
        ...brokenLine(
          [
            [L, y],
            [R, y],
          ],
          5,
          1.5,
          Math.floor(y * 10),
        ),
      );
    strokeLines(c, bl, pen * 0.4, INK.hatch, 0.75);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(pen);
    ctx.stroke(parapet);
    ctx.stroke(lower);
    ctx.stroke(side);
    const marks: Pt[][] = [];
    for (const px of ports) {
      const pw = notchW * 1.1;
      const ph = (y1 - y0) * 0.3;
      const py = y0 + (y1 - y0) * 0.38;
      marks.push([
        [px - pw / 2, py],
        [px - pw / 2, py + ph],
        [px + pw / 2, py + ph],
        [px + pw / 2, py],
        [px - pw / 2, py],
      ]);
      marks.push([
        [px - pw * 0.25, py + ph * 0.5],
        [px + pw * 0.25, py + ph * 0.5],
      ]);
      marks.push([
        [px - pw / 2, py + ph],
        [px - pw * 0.15, py + ph * 1.7],
      ]);
      marks.push([
        [px - notchW * 0.35, y2 - notchD + 0.2],
        [px + notchW * 0.35, y2 - notchD + 0.2],
      ]);
    }
    strokeLines(c, marks, pen * 0.6, INK.line, 0.9);
    strokeLines(
      c,
      [
        [
          [L - 1, y0],
          [R + s + 1, y0],
        ],
        [
          [L - 1, y0 - 0.9],
          [R + s + 1, y0 - 0.9],
        ],
      ],
      pen * 0.8,
      INK.line,
      1,
    );
    strokeLines(c, flag, pen * 0.8, INK.line, 1);
    const fy = y2 + 16 * u;
    ctx.strokeRect(fx, fy - 3 * u, 4.5 * u, 3 * u);
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

/**
 * The wooden fort (history-notes.md: a timber gun platform on piles on the
 * low-water line, eight 24-pounders and two howitzers; "a low reddish
 * block bristling with guns", its red paint only hinted by its name): the
 * piles tarred dark, each lit on its west edge, braced, green-black with
 * weed to the high-water mark and wet at the sand; the platform's edge;
 * the parapet's planks in a dull red worn by the sea, tar at the joints,
 * its top cut by embrasures with a muzzle in each, so it bristles with
 * guns; the guard house; the flag hanging in the calm. At under half a
 * kilometre it is the nearest piece of land, drawn at the craft's level.
 */
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
  const tar = aerial("#2f2a26", f.ahead);
  const red = tones(
    { lit: "#a96e52", graze: "#86584a", shade: "#553f42" },
    f.ahead,
  );
  const weed = aerial("#2c3424", f.ahead);
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
    // Its reflection in the wet sand: broken vertical streaks under each pile, the platform's dark band.
    const refl: Pt[][] = [];
    for (const [a] of piles) {
      let yy = sand - 0.3;
      while (yy > sand - 16) {
        const l = 1 + rng() * 3.2;
        if (rng() < 0.75)
          refl.push([
            [a[0] + (rng() - 0.5) * 0.3, yy],
            [a[0], yy - l],
          ]);
        yy -= l + 0.5 + rng() * 1.4;
      }
    }
    if (c.mode === "colour") {
      // The platform's dark mirrored under the piles, fading down the wet sand.
      const rg = ctx.createLinearGradient(0, sand, 0, sand - 9);
      rg.addColorStop(0, rgba(mix(tar, "#7d7a86", 0.45), 0.28));
      rg.addColorStop(1, rgba(mix(tar, "#7d7a86", 0.45), 0));
      ctx.fillStyle = rg;
      ctx.fillRect(L + 0.6, sand - 9, R - L - 1.2, 9);
      strokeLines(c, refl, 1.6, mix(tar, "#6e6a72", 0.25), 0.5);
      strokeLines(
        c,
        refl.filter((_, i) => i % 3 === 0),
        0.6,
        aerial("#d8b98a", f.ahead),
        0.25,
      );
    } else strokeLines(c, refl, pen * 0.6, INK.hatch, 0.5);
    return;
  }
  if (part === "piles") {
    if (c.mode === "colour") {
      strokeLines(c, back, 1.6, mix(tar, "#1f1b19", 0.4), 0.95);
      strokeLines(c, braces, 1.1, mix(tar, timber.shade, 0.3), 0.95);
      strokeLines(c, piles, 2.1, tar, 1);
      // Each pile's west edge in the low sun.
      strokeLines(
        c,
        piles.map(
          ([a, b]) =>
            [
              [a[0] - 0.32, a[1] + 1.8 * u],
              [b[0] - 0.32, b[1]],
            ] as Pt[],
        ),
        0.7,
        mix(timber.lit, MAT.glint, 0.2),
        0.8,
      );
      // Weed to the high-water mark, green-black; the wet sheen at the sand.
      strokeLines(
        c,
        piles.map(([a]) => [a, [a[0], a[1] + 2 * u]] as Pt[]),
        2.4,
        weed,
        1,
      );
      strokeLines(
        c,
        piles
          .map(([a]) => [a, [a[0], a[1] + 2 * u]] as Pt[])
          .map((l) => l.map(([px, py]) => [px - 0.35, py] as Pt)),
        0.5,
        aerial("#6f7a55", f.ahead),
        0.6,
      );
      strokeLines(
        c,
        [
          [
            [L - 1.5 * u, sand + 0.1],
            [R + 1.5 * u, sand + 0.1],
          ],
        ],
        1.2,
        aerial("#c9b896", f.ahead),
        0.35,
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
  const faces: { x0: number; x1: number; tone: string; shade: boolean }[] = [
    { x0: L, x1: x - wW, tone: mix(red.lit, red.graze, 0.35), shade: false },
    { x0: x - wW, x1: x + wW, tone: red.lit, shade: false },
    { x0: x + wW, x1: R, tone: red.graze, shade: true },
  ];
  const ports: number[] = [];
  for (let k = 0; k < 6; k++) ports.push(x - wW + ((k + 0.5) * 2 * wW) / 6);
  ports.push(L + wS * 0.5, R - wS * 0.5);
  const nw = 0.8 * u;
  const nd = 1.2 * u;
  // The parapet's outline, its top cut by the embrasures.
  const parapet = new Path2D();
  parapet.moveTo(L, deck);
  parapet.lineTo(R, deck);
  parapet.lineTo(R, para - 0.3 * u);
  const top = (px: number) =>
    px < x - wW
      ? para - 0.3 * u * (1 - (px - L) / wS)
      : px > x + wW
        ? para - 0.3 * u * ((px - x - wW) / wS)
        : para;
  const sorted = [...ports].sort((a, b) => b - a);
  for (const px of sorted) {
    parapet.lineTo(px + nw, top(px + nw));
    parapet.lineTo(px + nw * 0.6, top(px) - nd);
    parapet.lineTo(px - nw * 0.6, top(px) - nd);
    parapet.lineTo(px - nw, top(px - nw));
  }
  parapet.lineTo(L, para - 0.3 * u);
  parapet.closePath();
  const edge = new Path2D();
  edge.rect(L - 0.5 * u, deck - 0.9 * u, R - L + u, 0.9 * u);
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
    // The platform's edge: tar, lit along its top.
    ctx.fillStyle = tar;
    ctx.fill(edge);
    strokeLines(
      c,
      [
        [
          [L - 0.5 * u, deck],
          [R + 0.5 * u, deck],
        ],
      ],
      0.9,
      mix(timber.lit, MAT.glint, 0.2),
      0.9,
    );
    // The guard house behind the parapet: its west end lit, the roof grazed.
    ctx.fillStyle = timber.graze;
    ctx.fillRect(hutX - hutW / 2 - 1.2 * u, hutY0, 1.2 * u, hutY1 - hutY0);
    ctx.fillStyle = mix(timber.lit, MAT.glint, 0.1);
    ctx.fillRect(hutX - hutW / 2, hutY0, hutW, hutY1 - hutY0);
    ctx.fillStyle = mix(timber.shade, tar, 0.3);
    ctx.fillRect(hutX - hutW / 2, hutY0, hutW, (hutY1 - hutY0) * 0.25);
    const tile = tones(MAT.tile, f.ahead);
    ctx.fillStyle = tile.graze;
    ctx.beginPath();
    ctx.moveTo(hutX - hutW / 2 - 1.6 * u, hutY1);
    ctx.lineTo(hutX + hutW / 2 + 0.4 * u, hutY1);
    ctx.lineTo(hutX + hutW / 2 - 0.6 * u, hutR);
    ctx.lineTo(hutX - hutW / 2 - 0.9 * u, hutR);
    ctx.closePath();
    ctx.fill();
    strokeLines(
      c,
      [
        [
          [hutX - hutW / 2 - 1.6 * u, hutY1],
          [hutX + hutW / 2 + 0.4 * u, hutY1],
        ],
      ],
      0.8,
      tar,
      0.8,
    );
    ctx.fillStyle = aerial("#2a2426", f.ahead);
    ctx.fillRect(hutX - 0.6 * u, hutY0 + 0.6 * u, 1.2 * u, 1.3 * u);
    // The parapet: the faces' dull red, worn.
    ctx.save();
    ctx.clip(parapet);
    for (const fc of faces) {
      ctx.fillStyle = fc.tone;
      ctx.fillRect(fc.x0, deck, fc.x1 - fc.x0, para - deck + 0.1);
    }
    // Planks: worn paint in patches, tar at the joints, each plank's lit upper edge.
    const prng = createRng(818);
    const rows = 6;
    const ph = (para - deck) / rows;
    for (let k = 0; k < rows; k++) {
      const y = deck + k * ph;
      for (let px = L; px < R; ) {
        const len = (3 + prng() * 6) * u;
        const worn = prng();
        if (worn < 0.35) {
          ctx.fillStyle = rgba(
            worn < 0.15 ? timber.graze : mix(red.graze, timber.shade, 0.4),
            0.55,
          );
          ctx.fillRect(px, y, len, ph);
        }
        px += len;
        strokeLines(
          c,
          [
            [
              [px, y],
              [px, y + ph],
            ],
          ],
          0.5,
          tar,
          0.6,
        );
      }
      strokeLines(
        c,
        [
          [
            [L, y],
            [R, y],
          ],
        ],
        0.55,
        tar,
        0.65,
      );
      strokeLines(
        c,
        [
          [
            [L, y + ph - 0.18],
            [x + wW, y + ph - 0.18],
          ],
        ],
        0.4,
        mix(red.lit, MAT.glint, 0.25),
        0.45,
      );
    }
    // The shaded south-west face a step darker, the corner between the faces crisp.
    ctx.fillStyle = rgba(red.shade, 0.35);
    ctx.fillRect(x + wW, deck, R - x - wW, para - deck);
    ctx.restore();
    strokeLines(
      c,
      [
        [
          [x + wW, deck],
          [x + wW, para],
        ],
      ],
      0.7,
      mix(red.shade, tar, 0.5),
      0.8,
    );
    strokeLines(
      c,
      [
        [
          [x - wW, deck],
          [x - wW, para],
        ],
      ],
      0.6,
      mix(red.lit, MAT.glint, 0.3),
      0.6,
    );
    // The embrasures' cheeks dark and a gun's muzzle in each.
    for (const px of ports) {
      const y = top(px) - nd;
      ctx.fillStyle = aerial("#2a2223", f.ahead);
      ctx.beginPath();
      ctx.moveTo(px - nw * 0.6, y);
      ctx.lineTo(px + nw * 0.6, y);
      ctx.lineTo(px + nw * 0.45, y - 0.5 * u);
      ctx.lineTo(px - nw * 0.45, y - 0.5 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = aerial("#151112", f.ahead);
      ctx.fillRect(px - 0.32 * u, y - 0.05, 0.64 * u, 0.5 * u);
      ctx.fillStyle = rgba(aerial("#8a7a6a", f.ahead), 0.7);
      ctx.fillRect(px - 0.32 * u, y + 0.38 * u, 0.3 * u, 0.1 * u);
    }
    // The parapet's top lit where the sun takes it.
    const lit: Pt[] = [];
    for (let k = 0; k <= 30; k++) {
      const px = L + ((x + wW - L) * k) / 30;
      if (ports.some((p) => Math.abs(p - px) < nw)) {
        if (lit.length > 1)
          strokeLines(
            c,
            [lit.splice(0)],
            0.8,
            mix(red.lit, MAT.glint, 0.4),
            0.9,
          );
        lit.length = 0;
      } else lit.push([px, top(px) - 0.05]);
    }
    if (lit.length > 1)
      strokeLines(c, [lit], 0.8, mix(red.lit, MAT.glint, 0.4), 0.9);
    strokeLines(c, staff, 1, tar, 1);
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
    for (let k = 1; k < 6; k++)
      hl.push(
        ...brokenLine(
          [
            [L, deck + ((para - deck) * k) / 6],
            [R, deck + ((para - deck) * k) / 6],
          ],
          10,
          1.5,
          70 + k,
        ),
      );
    for (let px = x + wW; px < R; px += c.pen(1.5))
      hl.push([
        [px, deck],
        [px, para - 0.3 * u],
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
    for (let px = L - 0.5 * u; px < R + 0.5 * u; px += c.pen(1.4))
      hl.push([
        [px, deck - 0.9 * u],
        [px, deck],
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
    // Muzzles in the embrasures: short heavy strokes.
    strokeLines(
      c,
      ports.map((px) => [
        [px - 0.3 * u, top(px) - nd + 0.25 * u],
        [px + 0.3 * u, top(px) - nd + 0.25 * u],
      ]),
      pen * 1.4,
      INK.line,
      1,
    );
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
