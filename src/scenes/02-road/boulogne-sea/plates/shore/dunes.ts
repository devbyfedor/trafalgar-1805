import {
  createRng,
  mix,
  type Pt,
  softBlob,
  vRamp,
  wobble,
} from "../../paint/kit";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
  type PlateMode,
} from "../../paint/plate";
import { BUILD, project, VEX, viewOf } from "../../scene";
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
 * dunes with marram grass, and Châtillon's rounded hill standing over them
 * with its battery; their faces turned west and north-west, lit almost
 * from behind the eye, flatter than the cliffs.
 */

const AHEAD = 1450;
const N0 = -72;
const N1 = -1650;
const STEP = 6;

interface DuneGeo {
  ns: number[];
  hw: Pt[];
  foot: Pt[];
  top: Pt[];
  /** Châtillon's crest and its west face, contour by contour, crest first. */
  hill: Pt[][];
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

function buildGeo(): DuneGeo {
  const ns: number[] = [];
  const hw: Pt[] = [];
  const foot: Pt[] = [];
  const top: Pt[] = [];
  const back = wobble(91, [
    [260, 22],
    [90, 9],
  ]);
  const high = wobble(93, [
    [140, 2.6],
    [55, 1.4],
    [21, 0.5],
  ]);
  for (let n = N0; n >= N1; n -= STEP) {
    const e = shoreAt(n);
    const rise = smoothstep(-70, -260, n);
    ns.push(n);
    hw.push(project(e, n, -0.6));
    foot.push(project(e + 28, n, 1.6 * VEX * (0.4 + 0.6 * rise)));
    top.push(project(e + 75 + back(n), n, (5.5 + high(n)) * VEX * rise + 2));
  }
  const crest = crestLine();
  const hill: Pt[][] = [];
  for (const f of [0, 0.15, 0.32, 0.5, 0.7, 1]) {
    hill.push(
      crest.map(([e, n, h]) =>
        project(e - 230 * f ** 0.9, n, (h - (h - 6) * f ** 0.8) * VEX),
      ),
    );
  }
  return { ns, hw, foot, top, hill, hillWorld: crest };
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
    // Châtillon: its rounded crest, the west face down to the dunes.
    (c) => {
      const g = get();
      const rng = createRng(601);
      fill(
        c,
        under(g.hill[0], bottom),
        vRamp(c.ctx, 64, 0, [
          air(mix(SHORE.turfLit, SHORE.stubble, 0.4), AHEAD),
          air(SHORE.pasture, AHEAD),
          air(mix(SHORE.pasture, SHORE.turf, 0.5), AHEAD),
        ]),
      );
      for (let k = 0; k < g.hill.length - 1; k++) {
        const top = g.hill[k];
        const low = g.hill[k + 1];
        let a = 0;
        while (a < top.length - 1) {
          const b = Math.min(top.length - 1, a + 3 + Math.floor(rng() * 8));
          const r = rng();
          const col =
            r < 0.4 ? SHORE.stubble : r < 0.7 ? SHORE.pasture : SHORE.fallow;
          fill(
            c,
            band(top.slice(a, b + 1), low.slice(a, b + 1)),
            air(col, AHEAD),
            0.35,
          );
          a = b;
        }
        const h = new Path2D();
        addBroken(h, lerpLine(top, low, 0.5), 4, 2, rng);
        stroke(c, h, 0.5, air(SHORE.hedge, AHEAD), 0.3);
        const hedge = new Path2D();
        addBroken(hedge, low, 1.2, 1, rng, () => 0.5);
        stroke(c, hedge, 0.9, air(SHORE.hedge, AHEAD), 0.45);
      }
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
        gr.addColorStop(0, air(SHORE.shade, AHEAD));
        gr.addColorStop(1, `${air(SHORE.shade, AHEAD)}00`);
        fill(c, p, gr, 0.45);
      }
      const lip = new Path2D();
      addLine(lip, g.hill[0]);
      stroke(c, lip, 0.7, air("#fbe7bb", AHEAD), 0.5);
    },
    (c) => battery(c, get(), "colour"),
    // The dunes: lit faces, cool hollows, marram along the crests.
    (c) => {
      const g = get();
      const rng = createRng(611);
      fill(
        c,
        under(g.top, bottom),
        vRamp(c.ctx, 18, 0, [
          air(SHORE.dune, AHEAD),
          air(mix(SHORE.dune, SHORE.beach, 0.5), AHEAD),
        ]),
      );
      c.ctx.save();
      c.ctx.clip(under(g.top, bottom));
      for (let i = 0; i < g.top.length; i += 4) {
        if (rng() < 0.5) continue;
        const p = g.top[i];
        const q = g.foot[i];
        softBlob(
          c,
          p[0] + 2,
          (p[1] + q[1]) / 2 + 1,
          4 + rng() * 6,
          1.6 + rng(),
          air(SHORE.duneShade, AHEAD),
          0.5,
        );
      }
      c.ctx.restore();
      const grass = new Path2D();
      for (let i = 0; i < g.top.length; i++) {
        if (rng() < 0.35) continue;
        const p = g.top[i];
        const q = g.foot[i];
        const t = rng() * 0.6;
        const x = p[0] + (q[0] - p[0]) * t;
        const y = p[1] + (q[1] - p[1]) * t - 0.2;
        addTicks(grass, [[x, y]], 0.9 + rng() * 1.2, 70 + rng() * 40);
        addTicks(grass, [[x + 0.2, y]], 0.8 + rng(), 95 + rng() * 30);
      }
      stroke(c, grass, 0.5, air(SHORE.marram, AHEAD), 0.85);
    },
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
      // Contour-following hatching down the hill's face, denser on its shaded north flank.
      const h = new Path2D();
      for (let k = 0; k < g.hill.length - 1; k++) {
        for (const t of [0.3, 0.65]) {
          addBroken(h, lerpLine(g.hill[k], g.hill[k + 1], t), 4, 3, rng, (x) =>
            x < 250 ? 0.85 : 0.45,
          );
        }
      }
      stroke(c, h, 0.55, INK.hatch, 0.6);
      const hedges = new Path2D();
      for (let k = 1; k < g.hill.length - 1; k += 2)
        addBroken(hedges, g.hill[k], 0.4, 0.6, rng, () => 0.7);
      stroke(c, hedges, 0.8, INK.line, 0.6);
      const crest = new Path2D();
      addLine(crest, g.hill[0]);
      stroke(c, crest, 1, INK.line, 0.85);
    },
    (c) => battery(c, get(), "ink"),
    (c) => {
      const g = get();
      const rng = createRng(641);
      fill(c, under(g.top, bottom), PAPER.low);
      const crest = new Path2D();
      addBroken(crest, g.top, 9, 1.5, rng);
      stroke(c, crest, 0.9, INK.line, 0.8);
      const grass = new Path2D();
      for (let i = 0; i < g.top.length; i += 2) {
        if (rng() < 0.4) continue;
        const p = g.top[i];
        addTicks(grass, [[p[0], p[1] - 0.3]], 1 + rng(), 70 + rng() * 40);
      }
      stroke(c, grass, 0.5, INK.hatch, 0.8);
      const hollows = new Path2D();
      for (let i = 0; i < g.top.length; i += 5) {
        if (rng() < 0.6) continue;
        const p = g.top[i];
        const q = g.foot[i];
        const y = (p[1] + q[1]) / 2;
        for (let k = 0; k < 3; k++) {
          hollows.moveTo(p[0] + k * 0.7, y + 1);
          hollows.quadraticCurveTo(
            p[0] + k * 0.7 + 1,
            y,
            p[0] + k * 0.7 + 1.6,
            y - 0.8,
          );
        }
      }
      stroke(c, hollows, 0.45, INK.hatch, 0.6);
    },
    (c) => {
      const g = get();
      const rng = createRng(651);
      fill(c, band(g.foot, g.hw), PAPER.low);
      const s = new Path2D();
      for (let i = 0; i < g.hw.length; i += 5) {
        const a = g.foot[i];
        const b = g.hw[i];
        const t = 0.3 + rng() * 0.6;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        s.moveTo(x, y);
        s.lineTo(x + 0.8 + rng() * 1.4, y);
      }
      stroke(c, s, 0.5, INK.hatch, 0.45);
      const wrack = new Path2D();
      addBroken(
        wrack,
        g.hw.map(([x, y]) => [x, y + 0.5] as Pt),
        1.5,
        2,
        rng,
      );
      stroke(c, wrack, 0.6, INK.hatch, 0.6);
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

/** Châtillon's battery on its crest: an earth parapet with embrasures, its flag. */
function battery(c: PlateCanvas, g: DuneGeo, mode: PlateMode): void {
  const crest = g.hillWorld;
  const from = crest.findIndex((p) => p[1] <= -660);
  const to = crest.findIndex((p) => p[1] <= -760);
  if (from < 0 || to < 0) return;
  const top: Pt[] = [];
  const base: Pt[] = [];
  const emb = new Path2D();
  for (let i = from; i <= to; i++) {
    const [e, n, h] = crest[i];
    top.push(project(e - 12, n, h * VEX + 2.2 * BUILD));
    base.push(project(e - 6, n, h * VEX - 1));
  }
  for (let i = from + 1; i < to; i += 2) {
    const [e, n, h] = crest[i];
    const m = project(e - 14, n, h * VEX + 1.5 * BUILD);
    emb.moveTo(m[0] - 0.5, m[1]);
    emb.lineTo(m[0] + 0.5, m[1]);
  }
  const [fe, fn, fh] = crest[to];
  const ahead = viewOf(fe, fn)[0];
  const foot = project(fe - 8, fn, fh * VEX);
  const f = flag(foot[0], foot[1], 12 * BUILD * (1000 / ahead), 2.3);
  const body = band(top, base);
  if (mode === "colour") {
    fill(c, body, air(SHORE.earthLit, ahead));
    stroke(c, emb, 1.1, SHORE.muzzle, 0.95);
  } else {
    fill(c, body, PAPER.low);
    const l = new Path2D();
    addLine(l, top);
    stroke(c, l, 0.9, INK.line, 0.85);
    stroke(c, emb, 0.9, INK.line, 0.9);
  }
  paintFlag(c, f, ahead, mode);
}
