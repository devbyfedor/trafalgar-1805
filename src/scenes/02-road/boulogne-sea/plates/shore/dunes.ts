import { createRng, mix, type Pt, vRamp, wobble } from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../../paint/plate";
import { BUILD, project, VEX, viewOf } from "../../scene";
import { addBush, fieldBase, fieldKey, hash01 } from "./camp";
import {
  addBroken,
  addLine,
  addTicks,
  air,
  band,
  fill,
  flag,
  lerpLine,
  paintFlag,
  SHORE,
  stroke,
  under,
} from "./draw";
import { CHATILLON, shoreAt, smoothstep } from "./terrain";

/**
 * South of the harbour's mouth: the beach above the high-water line, the
 * dunes in two ranks with marram, and Châtillon's rounded hill standing
 * over them with its battery; their faces turned west and north-west, lit
 * almost from behind the eye. The hill in fields of stubble, pasture and
 * fallow with hedges between them, its north flank turned toward the
 * harbour and out of the sun.
 */

const AHEAD = 1450;
const N0 = -72;
const N1 = -1650;
const STEP = 6;

interface DuneGeo {
  ns: number[];
  hw: Pt[];
  foot: Pt[];
  /** The two ranks' crests, the back rank first. */
  ranks: Pt[][];
  /** Châtillon's crest and its west face, contour by contour, crest first. */
  hill: Pt[][];
  /** The same contours' places, [east, north], for their fields. */
  hillEN: [number, number][][];
  hillWorld: [number, number, number][];
}

function crestLine(): [number, number, number][] {
  const pts: [number, number, number][] = [
    [175, -230, 3],
    ...CHATILLON.map((p) => [p[0], p[1], p[2]] as [number, number, number]),
    [60, -1330, 6],
    [-10, -1430, 3],
  ];
  const out: [number, number, number][] = [];
  const noise = wobble(97, [
    [120, 0.9],
    [45, 0.4],
  ]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [e0, n0, h0] = pts[i];
    const [e1, n1, h1] = pts[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(e1 - e0, n1 - n0) / 10));
    for (let s = 0; s < steps; s++) {
      const k = s / steps;
      // A rounded hill: ease between the crest's points.
      const kk = k * k * (3 - 2 * k);
      out.push([
        e0 + (e1 - e0) * k,
        n0 + (n1 - n0) * k,
        h0 + (h1 - h0) * kk + noise(n0 + (n1 - n0) * k) * Math.min(1, h0 / 10),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * A dune rank's heights along the shore: humps of no fixed period (a
 * random walk of widths), the odd larger dune, saddles between them.
 */
function rankHeights(
  seed: number,
  base: number,
  amp: number,
): (n: number) => number {
  const rng = createRng(seed);
  const humps: { n: number; w: number; h: number }[] = [];
  for (let n = N0 + 20; n > N1 - 60; ) {
    const w = 18 + rng() ** 1.5 * 60;
    const big = rng() < 0.12 ? 1.8 : 1;
    humps.push({ n: n - w, w, h: amp * (0.45 + rng() * 0.75) * big });
    n -= w * (1.3 + rng() * 0.9);
  }
  return (n) => {
    let h = base;
    for (const p of humps) {
      const u = (n - p.n) / p.w;
      if (u > -1.6 && u < 1.6)
        h = Math.max(h, base + p.h * Math.cos((u * Math.PI) / 3.2) ** 2);
    }
    return h;
  };
}

function buildGeo(): DuneGeo {
  const ns: number[] = [];
  const hw: Pt[] = [];
  const foot: Pt[] = [];
  const back = wobble(91, [
    [260, 22],
    [90, 9],
  ]);
  const behind = rankHeights(93, 4.2, 3.6);
  const front = rankHeights(95, 2.4, 2.6);
  const ranks: Pt[][] = [[], []];
  for (let n = N0; n >= N1; n -= STEP) {
    const e = shoreAt(n);
    const rise = smoothstep(-70, -260, n);
    ns.push(n);
    hw.push(project(e, n, -0.6));
    foot.push(project(e + 28, n, 1.6 * VEX * (0.4 + 0.6 * rise)));
    ranks[0].push(project(e + 85 + back(n), n, behind(n) * VEX * rise + 2));
    ranks[1].push(
      project(e + 50 + back(n) * 0.5, n, front(n) * VEX * rise + 1.6),
    );
  }
  const crest = crestLine();
  const hill: Pt[][] = [];
  const hillEN: [number, number][][] = [];
  for (const f of [0, 0.1, 0.2, 0.32, 0.45, 0.58, 0.72, 0.86, 1]) {
    hill.push(
      crest.map(([e, n, h]) =>
        project(e - 230 * f ** 0.9, n, (h - (h - 6) * f ** 0.8) * VEX),
      ),
    );
    hillEN.push(crest.map(([e, n]) => [e - 230 * f ** 0.9, n]));
  }
  return { ns, hw, foot, ranks, hill, hillEN, hillWorld: crest };
}

/** How the hill's face stands to the sun at a crest sample: its west face lit, its north flank (toward the harbour) turned away. */
function hillLight(
  crest: readonly (readonly [number, number, number])[],
  i: number,
): number {
  const a = crest[Math.max(0, i - 2)];
  const b = crest[Math.min(crest.length - 1, i + 2)];
  // The face's fall line: west, turned by the crest's run.
  const te = b[0] - a[0];
  const tn = b[1] - a[1];
  const len = Math.hypot(te, tn) || 1;
  // Normal to the crest, the downhill (west) side.
  let ne = tn / len;
  let nn = -te / len;
  if (ne > 0) {
    ne = -ne;
    nn = -nn;
  }
  const sunE = Math.sin((294 * Math.PI) / 180);
  const sunN = Math.cos((294 * Math.PI) / 180);
  return Math.min(1, Math.max(0, 0.25 + 0.75 * (ne * sunE + nn * sunN)));
}

export function dunesPlate(o: {
  id: string;
  depth: number;
  box: Plate["box"];
}): Plate {
  let geo: DuneGeo | undefined;
  const get = () => {
    if (!geo) geo = buildGeo();
    return geo;
  };
  const bottom = o.box[2];

  const colour: PlateJob[] = [
    // The geometry first, a job of its own.
    () => {
      get();
    },
    // Châtillon: its rounded crest, the west face in fields down to the dunes.
    (c) => {
      const g = get();
      const rng = createRng(601);
      fill(
        c,
        under(g.hill[0], bottom),
        air(mix(SHORE.pasture, SHORE.turf, 0.5), AHEAD),
      );
      const hedges = new Path2D();
      const tops = new Path2D();
      const trees = new Path2D();
      const treeTops = new Path2D();
      for (let k = 0; k < g.hill.length - 1; k++) {
        const top = g.hill[k];
        const low = g.hill[k + 1];
        const keyAt = (j: number) => {
          const [e0, n0] = g.hillEN[k][j];
          const [e1, n1] = g.hillEN[k + 1][j];
          return fieldKey((e0 + e1) / 2, (n0 + n1) / 2);
        };
        let a = 0;
        while (a < top.length - 1) {
          const key = keyAt(a);
          let b = a + 1;
          while (b < top.length - 1 && keyAt(b) === key) b++;
          const m = Math.floor((a + b) / 2);
          const lit = Math.round(hillLight(g.hillWorld, m) * 4) / 4;
          const base = fieldBase(key);
          const col =
            lit < 0.5
              ? mix(mix(base, SHORE.turfShade, 0.7), base, lit / 0.5)
              : mix(base, mix(base, "#e2c47e", 0.18), (lit - 0.5) / 0.5);
          fill(
            c,
            band(top.slice(a, b + 1), low.slice(a, b + 1)),
            air(col, AHEAD),
          );
          // Swathes or furrows, each field its own way.
          if (hash01(key + 5) < 0.5) {
            const f = new Path2D();
            addLine(f, lerpLine(top.slice(a, b + 1), low.slice(a, b + 1), 0.5));
            stroke(
              c,
              f,
              0.5,
              air(mix(SHORE.hedge, SHORE.turf, 0.4), AHEAD),
              0.25,
            );
          }
          if (b < top.length - 1) {
            const p = top[b];
            const q = low[b];
            hedges.moveTo(p[0], p[1] + 0.3);
            hedges.lineTo(q[0], q[1]);
            tops.moveTo(p[0] - 0.35, p[1] + 0.5);
            tops.lineTo(q[0] - 0.35, q[1] + 0.2);
            if (rng() < 0.18) {
              const r = 0.9 + rng() * 1.3;
              addBush(trees, p[0], p[1] + r * 0.3, r, r * 0.8, rng);
              addBush(
                treeTops,
                p[0] - r * 0.25,
                p[1] + r * 0.6,
                r * 0.55,
                r * 0.45,
                rng,
              );
            }
          }
          // A hedge along the field's upper side where the field above differs.
          if (k > 0) {
            const [e0, n0] = g.hillEN[k - 1][m];
            const [e1, n1] = g.hillEN[k][m];
            if (fieldKey((e0 + e1) / 2, (n0 + n1) / 2) !== key) {
              addLine(hedges, top.slice(a, b + 1));
              addLine(
                tops,
                top.slice(a, b + 1).map(([x, y]) => [x - 0.2, y + 0.4] as Pt),
              );
            }
          }
          a = b;
        }
      }
      stroke(c, hedges, 1.3, air(SHORE.hedge, AHEAD), 0.85);
      stroke(c, tops, 0.6, air(SHORE.hedgeLit, AHEAD), 0.6);
      fill(c, trees, air(SHORE.hedge, AHEAD), 0.95);
      fill(c, treeTops, air(SHORE.hedgeLit, AHEAD), 0.85);
      // Its north flank, turned toward the harbour: in the sky's cool light.
      const flank = g.hill[0].slice(0, 26);
      if (flank.length > 2) {
        const p = under(flank, bottom);
        const gr = c.ctx.createLinearGradient(
          flank[0][0],
          0,
          flank[flank.length - 1][0],
          0,
        );
        gr.addColorStop(0, air(SHORE.shadeDeep, AHEAD));
        gr.addColorStop(1, `${air(SHORE.shadeDeep, AHEAD)}00`);
        fill(c, p, gr, 0.45);
      }
      const lip = new Path2D();
      addLine(lip, g.hill[0]);
      stroke(c, lip, 0.7, air("#f0dca8", AHEAD), 0.45);
    },
    (c) => battery(c, get(), "colour"),
    // The dunes in two ranks: lit seaward faces, cool saddles, blowouts of bare sand, marram in clumps.
    ...[0, 1].map((r) => (c: PlateCanvas) => {
      const g = get();
      const rng = createRng(611 + r * 7);
      const crest = g.ranks[r];
      {
        const region = under(crest, bottom);
        fill(
          c,
          region,
          vRamp(c.ctx, 18, 0, [
            air(
              r === 0 ? mix(SHORE.dune, SHORE.duneShade, 0.25) : SHORE.dune,
              AHEAD,
            ),
            air(mix(SHORE.dune, SHORE.beach, 0.5), AHEAD),
          ]),
        );
        c.ctx.save();
        c.ctx.clip(region);
        // The saddles between the humps, in the sky's cooler light.
        const saddles = new Path2D();
        for (let i = 2; i < crest.length - 2; i++) {
          const dip = crest[i - 2][1] + crest[i + 2][1] - 2 * crest[i][1];
          if (dip > 0.35 && rng() < 0.6) {
            const p = crest[i];
            saddles.moveTo(p[0] - 3, p[1] + 1);
            saddles.quadraticCurveTo(p[0], p[1] - 3, p[0] + 3.5, p[1] + 1);
            saddles.lineTo(p[0] + 2, p[1] - 4);
            saddles.lineTo(p[0] - 2, p[1] - 4);
            saddles.closePath();
          }
        }
        fill(c, saddles, air(SHORE.duneShade, AHEAD), 0.35);
        // Blowouts: bare scoops of pale sand under a lip of turf.
        for (let k = 0; k < 6; k++) {
          const i = Math.floor(rng() * crest.length);
          const p = crest[i];
          const w = 3 + rng() * 5;
          const scoop = new Path2D();
          scoop.moveTo(p[0] - w, p[1] - 0.4);
          scoop.quadraticCurveTo(p[0], p[1] - 3.5, p[0] + w, p[1] - 0.4);
          scoop.closePath();
          fill(c, scoop, air(mix(SHORE.dune, "#f6e4b8", 0.5), AHEAD), 0.9);
          const lip = new Path2D();
          lip.moveTo(p[0] - w, p[1] - 0.4);
          lip.quadraticCurveTo(p[0], p[1] - 1.2, p[0] + w, p[1] - 0.4);
          stroke(c, lip, 0.6, air(SHORE.duneShade, AHEAD), 0.7);
        }
        c.ctx.restore();
        // Marram in clumps along the crest and down the face, lit at the tips.
        const blades = new Path2D();
        const tips = new Path2D();
        for (let i = 0; i < crest.length; i += 1) {
          if (rng() < 0.55) continue;
          const p = crest[i];
          const x = p[0] + (rng() - 0.5) * 4;
          const y = p[1] - rng() ** 1.5 * 5 - 0.2;
          const n = 3 + Math.floor(rng() * 3);
          for (let k = 0; k < n; k++) {
            const a = 65 + rng() * 50;
            const len = 1 + rng() * 1.4;
            addTicks(blades, [[x + k * 0.25, y]], len, a);
            const t = (a * Math.PI) / 180;
            tips.moveTo(
              x + k * 0.25 + Math.cos(t) * len * 0.6,
              y + Math.sin(t) * len * 0.6,
            );
            tips.lineTo(
              x + k * 0.25 + Math.cos(t) * len,
              y + Math.sin(t) * len,
            );
          }
        }
        stroke(c, blades, 0.5, air(SHORE.marram, AHEAD), 0.9);
        stroke(
          c,
          tips,
          0.45,
          air(mix(SHORE.marram, "#f2e3a6", 0.55), AHEAD),
          0.85,
        );
      }
    }),
    // The beach above the high-water line, and the wrack along it.
    (c) => {
      const g = get();
      const rng = createRng(621);
      fill(
        c,
        band(g.foot, g.hw),
        vRamp(c.ctx, 3, -6, [
          air(SHORE.beach, AHEAD),
          air(SHORE.beachLow, AHEAD),
        ]),
      );
      const wrack = new Path2D();
      addBroken(
        wrack,
        g.hw.map(([x, y]) => [x, y + 0.5] as Pt),
        2,
        1.5,
        rng,
      );
      stroke(c, wrack, 0.8, air(SHORE.seam, AHEAD), 0.4);
    },
  ];

  const ink: PlateJob[] = [
    (c) => {
      const g = get();
      const rng = createRng(631);
      fill(c, under(g.hill[0], bottom), PAPER.low);
      // Strokes down the fall line where the hill turns from the light;
      // hedges as rows of small loops along the fields' bounds.
      const h = new Path2D();
      const hedges = new Path2D();
      for (let k = 0; k < g.hill.length - 1; k++) {
        const top = g.hill[k];
        const low = g.hill[k + 1];
        for (let j = 0; j < top.length; j++) {
          const dark = (0.7 - hillLight(g.hillWorld, j)) * 1.5;
          if (dark > 0.1 && rng() < dark) {
            h.moveTo(top[j][0], top[j][1]);
            h.lineTo(
              top[j][0] + (low[j][0] - top[j][0]) * 0.8,
              top[j][1] + (low[j][1] - top[j][1]) * 0.8,
            );
          }
          const [e0, n0] = g.hillEN[k][j];
          const [e1, n1] = g.hillEN[k + 1][j];
          const key = fieldKey((e0 + e1) / 2, (n0 + n1) / 2);
          if (j > 0) {
            const [ea, na] = g.hillEN[k][j - 1];
            const [eb, nb] = g.hillEN[k + 1][j - 1];
            if (fieldKey((ea + eb) / 2, (na + nb) / 2) !== key) {
              const p = top[j];
              const q = low[j];
              // A hedge: a ragged stroke from tier to tier, a little bumpy.
              hedges.moveTo(p[0], p[1]);
              for (let t = 0.33; t < 1.01; t += 0.33) {
                const x = p[0] + (q[0] - p[0]) * t;
                const y = p[1] + (q[1] - p[1]) * t;
                hedges.lineTo(x + (rng() - 0.5) * 0.5, y + rng() * 0.35);
              }
            }
          }
        }
      }
      stroke(c, h, 0.5, INK.hatch, 0.6);
      stroke(c, hedges, 0.5, INK.line, 0.6);
      const crest = new Path2D();
      addLine(crest, g.hill[0]);
      stroke(c, crest, 1, INK.line, 0.85);
    },
    (c) => battery(c, get(), "ink"),
    (c) => {
      const g = get();
      const rng = createRng(641);
      for (const crestLine of g.ranks) {
        fill(c, under(crestLine, bottom), PAPER.low);
        // Each dune's crest one firm line of its own weight, broken only
        // where a blowout opens (no regular dashes: across the frame those
        // read as the owner's broken horizontal line).
        const crest = new Path2D();
        let run: Pt[] = [];
        for (let i = 0; i < crestLine.length; i++) {
          run.push(crestLine[i]);
          if (run.length > 12 && rng() < 0.04) {
            addLine(crest, run);
            run = [];
            i += 1 + Math.floor(rng() * 3);
          }
        }
        if (run.length > 1) addLine(crest, run);
        stroke(c, crest, 0.85, INK.line, 0.8);
        // The lee of each hump hatched; marram in a few fanned tufts.
        const lee = new Path2D();
        const grass = new Path2D();
        for (let i = 2; i < crestLine.length - 2; i++) {
          const p = crestLine[i];
          const fall = crestLine[i + 1][1] - p[1];
          if (fall < -0.15 && rng() < 0.7) {
            lee.moveTo(p[0] + 0.3, p[1] - 0.2);
            lee.lineTo(p[0] + 1, p[1] - 2.2);
          }
          if (rng() < 0.09) {
            const blades = 3 + Math.floor(rng() * 3);
            for (let k = 0; k < blades; k++)
              addTicks(
                grass,
                [[p[0] + (rng() - 0.5) * 0.6, p[1] - 0.1]],
                0.7 + rng() * 1.1,
                55 + (70 * k) / Math.max(1, blades - 1) + (rng() - 0.5) * 12,
              );
          }
        }
        stroke(c, lee, 0.45, INK.hatch, 0.65);
        stroke(c, grass, 0.45, INK.hatch, 0.8);
      }
    },
    (c) => {
      const g = get();
      const rng = createRng(651);
      fill(c, band(g.foot, g.hw), PAPER.low);
      // The beach: a few short flicks at uneven steps and heights, more of
      // them toward the dunes' foot (a regular row of them read as a
      // dotted rule across the frame, the owner's remark 9).
      const s = new Path2D();
      for (let i = Math.floor(rng() * 6); i < g.hw.length; ) {
        if (rng() < 0.55) {
          const a = g.foot[i];
          const b = g.hw[i];
          const t = 0.15 + rng() * rng() * 0.8;
          const x = a[0] + (b[0] - a[0]) * t;
          const y = a[1] + (b[1] - a[1]) * t;
          s.moveTo(x, y);
          s.lineTo(x + 0.5 + rng() * 1.6, y + (rng() - 0.5) * 0.35);
        }
        i += 2 + Math.floor(rng() * 9);
      }
      stroke(c, s, 0.5, INK.hatch, 0.45);
      // The wrack at the high-water line: clumps of a few strokes along a
      // wandering line, with long gaps between them, never a dashed rule.
      const wrack = new Path2D();
      for (let i = Math.floor(rng() * 12); i < g.hw.length - 1; ) {
        const clump = 2 + Math.floor(rng() * 4);
        const lift = 0.2 + rng() * 1.1;
        for (let k = 0; k < clump && i + k < g.hw.length; k++) {
          const [x, y] = g.hw[i + k];
          const yy = y + lift + (rng() - 0.5) * 0.5;
          wrack.moveTo(x - rng() * 0.4, yy);
          wrack.lineTo(x + 0.4 + rng() * 1.3, yy + (rng() - 0.5) * 0.4);
        }
        i += clump + 5 + Math.floor(rng() * 22);
      }
      stroke(c, wrack, 0.6, INK.hatch, 0.55);
    },
  ];

  return {
    id: o.id,
    depth: o.depth,
    box: o.box,
    group: "land",
    jobs(mode: PlateMode) {
      return mode === "colour" ? colour : ink;
    },
  };
}

/**
 * Châtillon's battery on its crest: a low earth parapet built level, set
 * back from the crest's lip, embrasures notched into its top, a row of
 * gabions, its flag (as the cliffs' batteries: the history's low
 * red-brown block, not a plank).
 */
function battery(c: PlateCanvas, g: DuneGeo, mode: PlateMode): void {
  const crest = g.hillWorld;
  const from = crest.findIndex((p) => p[1] <= -660);
  const to = crest.findIndex((p) => p[1] <= -760);
  if (from < 0 || to < 0) return;
  let level = 0;
  for (let i = from; i <= to; i++) level += crest[i][2];
  level = (level / (to - from + 1)) * VEX;
  const top: Pt[] = [];
  const base: Pt[] = [];
  const cheeks = new Path2D();
  for (let i = from; i <= to; i++) {
    const [e, n, h] = crest[i];
    const gun = (i - from) % 3 === 1;
    top.push(project(e + 6, n, level + (gun ? 1.3 : 2.1) * BUILD));
    base.push(project(e + 6, n, Math.min(level, h * VEX) - 0.4));
    if (gun) {
      const a = project(e + 6, n + 3, level + 1.3 * BUILD);
      const z = project(e + 6, n - 3, level + 1.3 * BUILD);
      const d = project(e + 6, n, level + 0.8 * BUILD);
      addLine(cheeks, [a, z, d], true);
    }
  }
  const [fe, fn, fh] = crest[to];
  const ahead = viewOf(fe, fn)[0];
  const foot = project(fe + 4, fn, fh * VEX);
  const f = flag(foot[0], foot[1], 12 * BUILD * (1000 / ahead), 2.3);
  const body = band(top, base);
  if (mode === "colour") {
    fill(
      c,
      body,
      air(mix(mix(SHORE.earthLit, SHORE.turf, 0.3), "#c3b8bc", 0.12), ahead),
    );
    fill(c, cheeks, air(mix(SHORE.earth, SHORE.shadeDeep, 0.55), ahead));
    const gab = new Path2D();
    for (const p of top) {
      gab.moveTo(p[0], p[1] - 0.05);
      gab.lineTo(p[0], p[1] - 0.5);
    }
    stroke(
      c,
      gab,
      0.5,
      air(mix(SHORE.gabion, SHORE.shadeDeep, 0.3), ahead),
      0.8,
    );
  } else {
    fill(c, body, PAPER.low);
    const l = new Path2D();
    addLine(l, top);
    stroke(c, l, 0.85, INK.line, 0.85);
    stroke(c, cheeks, 0.5, INK.line, 0.8);
  }

  paintFlag(c, f, ahead, mode);
}
