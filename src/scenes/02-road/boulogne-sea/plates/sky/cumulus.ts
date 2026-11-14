import { createRng, field, wobble } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas } from "../../paint/plate";
import { skyAt } from "./ground";

/**
 * A cloud as a painter builds it: a body of broad forms; lumps all round
 * its outline, bigger up the towers and smaller toward the base; smaller
 * lumps on their lit upper left and smaller again on those; a few on the
 * face; a scalloped base and torn fragments. Each form is a dome standing
 * out of the forms behind it, so the cloud has one continuous surface,
 * its outline scalloped, its face modelled, with crevices between lumps.
 *
 * The light comes from behind the eye, the sun 5° up and a little to the
 * left: a form's face is lit, its upper left brightest; its lower right
 * turns at a crisp terminator into cool lilac shade. The low sun warms
 * the undersides golden; the tops go pinker; a crisp lit rim runs where
 * the light grazes the outline's upper left. Lower clouds stand deeper
 * in the haze (softer, lower in contrast), and every base is ragged and
 * soft, never a flat cut.
 *
 * The colour is shaded per pixel from the forms' surface (a 2D shader in
 * plain JavaScript: no filter, no blur, no grain), the surface sampled on
 * a grid of every second device pixel and interpolated, so the steps stay
 * crisp. The engraving draws from the same surface: paper where the cloud
 * is, its outline (light and broken on the lit side, firmer in shade),
 * curved strokes along the terminators, more in deeper shade, and along
 * the warm underside.
 */

export interface CloudSpec {
  seed: number;
  /** Extent across, layer units. */
  x0: number;
  x1: number;
  /** The base's height at the middle, and its slope (units up per unit right). */
  base: number;
  tilt: number;
  /** The tallest tower above the base. */
  height: number;
  /** Heads along the top. */
  towers: number;
  /** Vertical squash of the forms (stratocumulus below 1). */
  flat?: number;
  /** Taken toward the sky behind, 0..1 (lower and farther: more). */
  haze: number;
  /** How far up the base fades, units. */
  soft?: number;
  /** The lumps' size, relative (1 by default). */
  billow?: number;
  /** Torn fragments under the base. */
  fragments?: number;
  /** How the ends taper (smaller: blunter; 0.55 by default). */
  taper?: number;
}

interface Lobe {
  x: number;
  y: number;
  /** Radii across and up. */
  a: number;
  b: number;
  /** The dome's depth (flatter for the body's broad forms). */
  d: number;
  /** How far the dome's foot stands out toward the eye. */
  z: number;
  /** The outline's irregularity (third harmonic). */
  c3: number;
  s3: number;
}

export interface Cloud {
  spec: CloudSpec;
  n: number;
  lx: Float64Array;
  ly: Float64Array;
  ia: Float64Array;
  ib: Float64Array;
  /** The dome's depth, and its slopes' scale across and up (depth over radius). */
  ld: Float64Array;
  kx: Float64Array;
  ky: Float64Array;
  mn: Float64Array;
  lz: Float64Array;
  c3: Float64Array;
  s3: Float64Array;
  lim2: Float64Array;
  /** Box with the fringe, layer units: x0, x1, y0, y1. */
  box: [number, number, number, number];
  bottom: number;
  top: number;
  baseAt: (x: number) => number;
  /** Lobes by cell. */
  cell: number;
  cx0: number;
  cy0: number;
  cw: number;
  ch: number;
  cells: Int32Array[];
}

/** The fringe outside the outline, units: a faint translucent edge. */
const FRINGE = 2.2;
/** The outline's irregularity, at most. */
const IRREG = 0.07;
/** A form's shadow on what lies behind it, as a share of how far it stands out. */
const SHADOW = 0.42;
/** Where shadows fall, as seen: away from the eye, a little right and down. */
const SX = 0.55;
const SY = -0.83;

/** The surface's height at a point: the highest dome over it (0: none). */
function domeAt(lobes: readonly Lobe[], x: number, y: number): number {
  let h = 0;
  for (const l of lobes) {
    const dx = (x - l.x) / l.a;
    const dy = (y - l.y) / l.b;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1) h = Math.max(h, l.z + l.d * Math.sqrt(1 - r2));
  }
  return h;
}

function lobe(x: number, y: number, a: number, b: number, d: number): Lobe {
  return { x, y, a, b, d, z: 0, c3: 0, s3: 0 };
}

/** Sets a lobe to stand `out` of its radius proud of the surface under its centre, and adds it. */
function seat(surface: Lobe[], l: Lobe, out: number): Lobe {
  l.z = domeAt(surface, l.x, l.y) - l.d * (1 - out);
  surface.push(l);
  return l;
}

/** Lumps on a form, toward its lit upper left. */
function lumpsOn(
  parents: readonly Lobe[],
  surface: Lobe[],
  rng: () => number,
  flat: number,
  min: number,
  count: () => number,
  size: readonly [number, number],
  arc: readonly [number, number],
): Lobe[] {
  const out: Lobe[] = [];
  for (const p of parents) {
    if (p.a < min) continue;
    const k = count();
    for (let i = 0; i < k; i++) {
      const th = ((arc[0] + (arc[1] - arc[0]) * rng()) * Math.PI) / 180;
      const r = p.a * (size[0] + (size[1] - size[0]) * rng());
      const at = 0.6 + 0.22 * rng();
      const l = lobe(
        p.x + Math.cos(th) * p.a * at,
        p.y + Math.sin(th) * p.b * at,
        r,
        r * flat * (0.86 + 0.2 * rng()),
        r,
      );
      out.push(seat(surface, l, 0.48 + 0.12 * rng()));
    }
  }
  return out;
}

function lobesOf(s: CloudSpec): {
  lobes: Lobe[];
  baseAt: (x: number) => number;
} {
  const rng = createRng(s.seed);
  const w = s.x1 - s.x0;
  const flat = s.flat ?? 1;
  const H = s.height;
  const bs = s.billow ?? 1;
  const heads = Array.from({ length: s.towers }, () => ({
    c: 0.16 + 0.68 * rng(),
    w: 0.07 + 0.15 * rng(),
    h: 0.32 + 0.55 * rng(),
  }));
  heads[Math.floor(rng() * heads.length)].h = 1;
  const topWob = wobble(s.seed + 5, [
    [w * 0.23, 0.06],
    [w * 0.08, 0.035],
  ]);
  const taper = s.taper ?? 0.55;
  const env = (t: number): number => {
    let m = 0;
    for (const k of heads)
      m = Math.max(m, k.h * Math.exp(-(((t - k.c) / k.w) ** 2)));
    const end = Math.max(0, Math.sin(Math.PI * t)) ** taper;
    return Math.max(0, Math.min(1, (0.2 + 0.8 * m + topWob(t * w)) * end));
  };
  const baseWob = wobble(s.seed + 3, [
    [w * 0.41, H * 0.04],
    [w * 0.13, H * 0.022],
  ]);
  const mid = (s.x0 + s.x1) / 2;
  const baseAt = (x: number) => s.base + s.tilt * (x - mid) + baseWob(x - s.x0);
  const topAt = (x: number) => baseAt(x) + H * env((x - s.x0) / w);
  const thick = (x: number) => Math.max(H * 0.1, topAt(x) - baseAt(x));
  const lobes: Lobe[] = [];

  // The body: broad, flat forms filling the space from base to top, its
  // surface hidden under the lumps but for the lowest part.
  let x = s.x0 + w * 0.03;
  while (x < s.x1 - w * 0.03) {
    const T = thick(x);
    const r = T * (0.5 + 0.06 * rng());
    const a = r * (1 + 0.25 * rng());
    const b = Math.min(r, T * 0.55) * flat;
    lobes.push(lobe(x, baseAt(x) + b * 0.95, a, b, a * 0.3));
    if (T > 2.3 * b) {
      const r2 = Math.min(a, (T - b) * 0.5);
      lobes.push(
        lobe(
          x + (rng() - 0.5) * a * 0.4,
          topAt(x) - r2 * flat * 0.95,
          r2,
          r2 * flat,
          r2 * 0.3,
        ),
      );
    }
    x += a * (0.7 + 0.25 * rng());
  }

  // Big lumps along the top and down the flanks.
  const big: Lobe[] = [];
  x = s.x0 + w * 0.012;
  while (x < s.x1 - w * 0.008) {
    const T = thick(x);
    const r = Math.max(2.4, Math.min(H * 0.4, T * (0.2 + 0.14 * rng()) * bs));
    const a = r * (0.9 + 0.25 * rng());
    const b = r * flat * (0.88 + 0.18 * rng());
    const l = lobe(x, topAt(x) - b * (0.5 + 0.3 * rng()), a, b, a);
    big.push(seat(lobes, l, 0.55));
    x += a * (0.9 + 0.45 * rng());
  }
  // Lumps over the face, packed loosely, bigger in the thick of the cloud
  // and smaller toward its edges; the lowest part left smooth.
  const face: Lobe[] = [];
  const tries = Math.round((w * H) / (H * H * 0.012 + 30));
  for (let i = 0; i < tries; i++) {
    const fx = s.x0 + w * (0.04 + 0.92 * rng());
    const b0 = baseAt(fx);
    const T = thick(fx);
    const fy = b0 + T * (0.3 + 0.62 * rng());
    const r = Math.max(2.2, T * (0.16 + 0.12 * rng()) * bs);
    if (fy + r * flat * 0.5 > topAt(fx)) continue;
    let crowded = false;
    for (const o of face)
      if (Math.hypot(o.x - fx, (o.y - fy) / flat) < 0.9 * (o.a + r)) {
        crowded = true;
        break;
      }
    if (crowded) continue;
    face.push(
      seat(lobes, lobe(fx, fy, r, r * flat * (0.85 + 0.2 * rng()), r), 0.42),
    );
  }

  // Smaller lumps on the lit upper left of the big ones, and smaller again.
  const mid2 = lumpsOn(
    big,
    lobes,
    rng,
    flat,
    3.6,
    () => 1 + Math.floor(rng() * 3),
    [0.34, 0.52],
    [35, 195],
  );
  lumpsOn(
    mid2,
    lobes,
    rng,
    flat,
    3.2,
    () => Math.floor(rng() * 2),
    [0.38, 0.55],
    [60, 190],
  );

  // Torn fragments under the base, toward the ends.
  const nf = s.fragments ?? 2;
  for (let i = 0; i < nf; i++) {
    const t = rng() < 0.5 ? 0.05 + 0.25 * rng() : 0.7 + 0.25 * rng();
    const fx = s.x0 + t * w;
    const r = H * (0.03 + 0.035 * rng());
    lobes.push(
      lobe(
        fx,
        baseAt(fx) - H * (0.04 + 0.07 * rng()),
        r * 2.2,
        r * 0.6 * flat,
        r,
      ),
    );
  }

  for (const l of lobes) {
    const amp = IRREG * (0.4 + 0.6 * rng());
    const ph = rng() * Math.PI * 2;
    l.c3 = amp * Math.cos(ph);
    l.s3 = amp * Math.sin(ph);
  }
  return { lobes, baseAt };
}

/** A cloud's forms, packed for the shader, with its box and its lobes by cell. */
export function cloudOf(s: CloudSpec): Cloud {
  const { lobes, baseAt } = lobesOf(s);
  const n = lobes.length;
  const arr = () => new Float64Array(n);
  const c: Cloud = {
    spec: s,
    n,
    lx: arr(),
    ly: arr(),
    ia: arr(),
    ib: arr(),
    ld: arr(),
    kx: arr(),
    ky: arr(),
    mn: arr(),
    lz: arr(),
    c3: arr(),
    s3: arr(),
    lim2: arr(),
    box: [0, 0, 0, 0],
    bottom: 0,
    top: 0,
    baseAt,
    cell: 12,
    cx0: 0,
    cy0: 0,
    cw: 0,
    ch: 0,
    cells: [],
  };
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  lobes.forEach((l, i) => {
    c.lx[i] = l.x;
    c.ly[i] = l.y;
    c.ia[i] = 1 / l.a;
    c.ib[i] = 1 / l.b;
    c.ld[i] = l.d;
    c.kx[i] = l.d / l.a;
    c.ky[i] = l.d / l.b;
    c.mn[i] = Math.min(l.a, l.b);
    c.lz[i] = l.z;
    c.c3[i] = l.c3;
    c.s3[i] = l.s3;
    // How far out (in the lobe's own radii) it still adds to the fringe
    // or casts its shadow.
    const reach =
      1 + IRREG + Math.max(FRINGE, SHADOW * l.d + 1) / Math.min(l.a, l.b);
    c.lim2[i] = reach * reach;
    x0 = Math.min(x0, l.x - l.a * reach);
    x1 = Math.max(x1, l.x + l.a * reach);
    y0 = Math.min(y0, l.y - l.b * reach);
    y1 = Math.max(y1, l.y + l.b * reach);
  });
  c.box = [x0, x1, y0, y1];
  c.bottom = Math.min(...lobes.map((l) => l.y - l.b));
  c.top = Math.max(...lobes.map((l) => l.y + l.b));
  c.cx0 = x0;
  c.cy0 = y0;
  c.cw = Math.ceil((x1 - x0) / c.cell);
  c.ch = Math.ceil((y1 - y0) / c.cell);
  const lists: number[][] = Array.from({ length: c.cw * c.ch }, () => []);
  lobes.forEach((l, i) => {
    const reach = Math.sqrt(c.lim2[i]);
    const i0 = Math.max(0, Math.floor((l.x - l.a * reach - x0) / c.cell));
    const i1 = Math.min(
      c.cw - 1,
      Math.floor((l.x + l.a * reach - x0) / c.cell),
    );
    const j0 = Math.max(0, Math.floor((l.y - l.b * reach - y0) / c.cell));
    const j1 = Math.min(
      c.ch - 1,
      Math.floor((l.y + l.b * reach - y0) / c.cell),
    );
    for (let j = j0; j <= j1; j++)
      for (let k = i0; k <= i1; k++) lists[j * c.cw + k].push(i);
  });
  c.cells = lists.map((l) => Int32Array.from(l));
  return c;
}

// ------------------------------------------------------------------ the surface

/** The light, from behind the eye: left, up, toward the eye (normalised). */
const L = (() => {
  const v = [-0.45, 0.42, 0.79];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m] as const;
})();
const L2 = Math.hypot(L[0], L[1]);

/** The grid's spacing, device px. */
const G = 3;

/**
 * The cloud's surface sampled on a grid over its box on one canvas (every
 * G device px): the distance inside the outline (units; negative outside),
 * the light on the surface, and the normal's x and y.
 */
export interface Surface {
  /** The canvas's transform: x px = a·x + e, y px = d·y + f. */
  a: number;
  d: number;
  e: number;
  f: number;
  /** The grid's first point, canvas px, and its size. */
  px0: number;
  py0: number;
  gw: number;
  gh: number;
  /** The pixel rectangle the cloud covers on the canvas. */
  rx0: number;
  ry0: number;
  rx1: number;
  ry1: number;
  E: Float32Array;
  lam: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  /** The shadow cast on the surface by forms in front, 0..1. */
  sh: Float32Array;
  /** Grid rows done. */
  rows: number;
}

export function surfaceFor(cl: Cloud, c: PlateCanvas): Surface {
  const t = c.ctx.getTransform();
  const W = c.ctx.canvas.width;
  const Hc = c.ctx.canvas.height;
  const [x0, x1, y0, y1] = cl.box;
  const rx0 = Math.max(0, Math.floor(t.a * x0 + t.e));
  const rx1 = Math.min(W, Math.ceil(t.a * x1 + t.e));
  const ry0 = Math.max(0, Math.floor(t.d * y1 + t.f));
  const ry1 = Math.min(Hc, Math.ceil(t.d * y0 + t.f));
  const gw = Math.max(2, Math.ceil((rx1 - rx0) / G) + 2);
  const gh = Math.max(2, Math.ceil((ry1 - ry0) / G) + 2);
  const n = gw * gh;
  return {
    a: t.a,
    d: t.d,
    e: t.e,
    f: t.f,
    px0: rx0,
    py0: ry0,
    gw,
    gh,
    rx0,
    ry0,
    rx1: Math.max(rx0, rx1),
    ry1: Math.max(ry0, ry1),
    E: new Float32Array(n),
    lam: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    sh: new Float32Array(n),
    rows: 0,
  };
}

/** Samples the surface's grid rows up to `upTo` (exclusive). */
export function sampleRows(cl: Cloud, sf: Surface, upTo: number): void {
  const end = Math.min(sf.gh, upTo);
  const kb = 1 / 1.4;
  const { lx, ly, ia, ib, ld, kx, ky, mn, lz, c3, s3, lim2, cells, cell } = cl;
  for (let gj = sf.rows; gj < end; gj++) {
    const y = (sf.py0 + gj * G - sf.f) / sf.d;
    const cj = Math.floor((y - cl.cy0) / cell);
    for (let gi = 0; gi < sf.gw; gi++) {
      const x = (sf.px0 + gi * G - sf.e) / sf.a;
      const ci = Math.floor((x - cl.cx0) / cell);
      const o = gj * sf.gw + gi;
      let E = -FRINGE - 1;
      let Hm = -1e9;
      let W = 0;
      let Nx = 0;
      let Ny = 0;
      let Nz = 0;
      if (ci >= 0 && ci < cl.cw && cj >= 0 && cj < cl.ch) {
        const list = cells[cj * cl.cw + ci];
        for (let q = 0; q < list.length; q++) {
          const k = list[q];
          const dx = (x - lx[k]) * ia[k];
          const dy = (y - ly[k]) * ib[k];
          const r2 = dx * dx + dy * dy;
          if (r2 >= lim2[k]) continue;
          const rho = Math.sqrt(r2) + 1e-9;
          const cs = dx / rho;
          const sn = dy / rho;
          const m =
            1 + c3[k] * cs * (4 * cs * cs - 3) + s3[k] * sn * (3 - 4 * sn * sn);
          const u = rho / m;
          const e = (1 - u) * mn[k] * m;
          if (e > E) E = e;
          if (u < 1) {
            const sh = Math.sqrt(1 - u * u);
            const h = lz[k] + ld[k] * sh;
            if (h > Hm) {
              const f = Math.exp((Hm - h) * kb);
              W *= f;
              Nx *= f;
              Ny *= f;
              Nz *= f;
              Hm = h;
            }
            const wgt = Math.exp((h - Hm) * kb);
            W += wgt;
            Nx += wgt * cs * u * kx[k];
            Ny += wgt * sn * u * ky[k];
            Nz += wgt * sh;
          }
        }
      }
      sf.E[o] = E;
      // The shadow of forms standing in front of this surface, falling
      // just past their lower right edge.
      let shadow = 0;
      if (W > 0) {
        const list = cells[cj * cl.cw + ci];
        const aa = sf.a / G;
        for (let q = 0; q < list.length; q++) {
          const k = list[q];
          const dx = (x - lx[k]) * ia[k];
          const dy = (y - ly[k]) * ib[k];
          const r2 = dx * dx + dy * dy;
          if (r2 <= 1 || r2 >= lim2[k]) continue;
          const p = lz[k] + ld[k] * 0.75 - Hm;
          if (p <= 0) continue;
          const rho = Math.sqrt(r2);
          const dir = (dx * SX + dy * SY) / rho;
          if (dir <= 0) continue;
          const reach = SHADOW * p * Math.min(1, dir * 1.5);
          const dist = (rho - 1) * mn[k];
          const v = Math.max(0, Math.min(1, (reach - dist) * aa + 0.5));
          if (v > shadow) shadow = v;
        }
      }
      sf.sh[o] = shadow;
      if (W > 0) {
        const m = Math.hypot(Nx, Ny, Nz) || 1;
        const nx = Nx / m;
        const ny = Ny / m;
        const nz = Nz / m;
        sf.lam[o] = nx * L[0] + ny * L[1] + nz * L[2];
        sf.nx[o] = nx;
        sf.ny[o] = ny;
      } else {
        sf.lam[o] = 0.6;
        sf.nx[o] = 0;
        sf.ny[o] = 0;
      }
    }
  }
  sf.rows = Math.max(sf.rows, end);
}

// ------------------------------------------------------------------ colour

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** The light where the shade ends and the lit face begins: a crisp terminator. */
const TERM = 0.4;

/** The shaded side by the light on it, then the lit side: [low in the cloud, high in it]. */
const SHADE: readonly (readonly [number, string, string])[] = [
  [-0.4, "#9a91aa", "#958eab"],
  [0.1, "#ab9daf", "#a59bb1"],
  [TERM, "#cdb3b3", "#c7b0b9"],
];
const LIT: readonly (readonly [number, string, string])[] = [
  [TERM, "#ebc9a8", "#ebcdbd"],
  [0.72, "#f3d5b2", "#f3d9c6"],
  [0.95, "#fae4c6", "#fbe9d6"],
];

/** A ramp's colour at light v, low (0) or high (1) in the cloud. */
function rampAt(
  ramp: readonly (readonly [number, string, string])[],
  v: number,
  hi: 0 | 1,
): RGB {
  if (v <= ramp[0][0]) return rgb(ramp[0][hi ? 2 : 1]);
  for (let i = 1; i < ramp.length; i++) {
    if (v <= ramp[i][0]) {
      const a = rgb(ramp[i - 1][hi ? 2 : 1]);
      const b = rgb(ramp[i][hi ? 2 : 1]);
      const t = (v - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0]);
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
    }
  }
  return rgb(ramp[ramp.length - 1][hi ? 2 : 1]);
}

/** Lookup tables, light -1..1 in 256 steps: shade low, shade high, lit low, lit high. */
const LUTS = (() => {
  const n = 256;
  return [SHADE, LIT].flatMap((ramp) =>
    ([0, 1] as const).map((hi) => {
      const out = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const c = rampAt(ramp, -1 + (2 * i) / (n - 1), hi);
        out.set(c, i * 3);
      }
      return out;
    }),
  );
})();

const WARM = rgb("#f4c591");
const WARM_SHADE = rgb("#d5a99d");
const RIM = rgb("#fff3dc");
const FRINGE_C = rgb("#ecd3bd");

let scratch: HTMLCanvasElement | OffscreenCanvas | null = null;

function scratchFor(
  w: number,
  h: number,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  if (!scratch) {
    scratch =
      typeof OffscreenCanvas === "function"
        ? new OffscreenCanvas(w, h)
        : document.createElement("canvas");
  }
  if (scratch.width < w) scratch.width = w;
  if (scratch.height < h) scratch.height = h;
  return scratch.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
}

/** Draws an ImageData over the canvas at pixel (x, y), compositing over what is there. */
function blit(c: PlateCanvas, img: ImageData, x: number, y: number): void {
  const s = scratchFor(img.width, img.height);
  if (!s || !scratch) return;
  s.clearRect(0, 0, img.width, img.height);
  s.putImageData(img, 0, 0);
  const { ctx } = c;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(
    scratch,
    0,
    0,
    img.width,
    img.height,
    x,
    y,
    img.width,
    img.height,
  );
  ctx.restore();
}

/**
 * Paints the cloud's rows of canvas pixels [r0, r1) in colour, or as the
 * engraving's paper (`paper`), compositing over the canvas.
 */
export function paintRows(
  cl: Cloud,
  sf: Surface,
  c: PlateCanvas,
  r0: number,
  r1: number,
  paper: boolean,
): void {
  const y0 = Math.max(sf.ry0, r0);
  const y1 = Math.min(sf.ry1, r1);
  const w = sf.rx1 - sf.rx0;
  if (y1 <= y0 || w <= 0) return;
  sampleRows(cl, sf, Math.ceil((y1 - sf.py0) / G) + 2);
  const img = new ImageData(w, y1 - y0);
  const data = img.data;
  const s = cl.spec;
  const kk = sf.a;
  const soft = s.soft ?? 4;
  const rimW = 0.9;
  const span = Math.max(1, cl.top - cl.bottom);
  const pr = rgb(PAPER.low);
  const gw = sf.gw;
  const { E: GE, lam: GL, nx: GX, ny: GY, sh: SH } = sf;
  const [shLo, shHi, ltLo, ltHi] = LUTS;
  // Per column: the base's ragged line.
  const rag = wobble(s.seed + 41, [
    [31, 0.3],
    [13, 0.18],
  ]);
  const baseX = new Float32Array(w);
  for (let i = 0; i < w; i++) {
    const x = (sf.rx0 + i + 0.5 - sf.e) / sf.a;
    baseX[i] = cl.baseAt(x) + soft * rag(x) * 0.6;
  }
  for (let py = y0; py < y1; py++) {
    const y = (py + 0.5 - sf.f) / sf.d;
    const fy = (py + 0.5 - sf.py0) / G;
    const j = Math.floor(fy);
    const ty = fy - j;
    const hz = Math.max(0, Math.min(1, (y - cl.bottom) / span));
    const sky = rgb(skyAt(y));
    const haze = Math.min(0.92, s.haze + 0.2 * (1 - hz) ** 2);
    // The undersides, warmed by the low sun, in the cloud's lower part.
    const low = 1 - Math.max(0, Math.min(1, (hz - 0.18) / 0.3));
    const row = (py - y0) * w * 4;
    for (let i = 0; i < w; i++) {
      const fx = (sf.rx0 + i + 0.5 - sf.px0) / G;
      const gi = Math.floor(fx);
      const tx = fx - gi;
      const go = j * gw + gi;
      const e00 = GE[go];
      const e10 = GE[go + 1];
      const e01 = GE[go + gw];
      const e11 = GE[go + gw + 1];
      const E =
        (e00 + (e10 - e00) * tx) * (1 - ty) + (e01 + (e11 - e01) * tx) * ty;
      if (E <= -FRINGE) continue;
      const base = Math.max(0, Math.min(1, (y - baseX[i]) / soft + 0.35));
      const ab = Math.max(0, Math.min(1, E * kk + 0.5)) * base;
      const o = row + i * 4;
      if (paper) {
        if (ab <= 0) continue;
        data[o] = pr[0];
        data[o + 1] = pr[1];
        data[o + 2] = pr[2];
        data[o + 3] = Math.round(ab * 255);
        continue;
      }
      const af = E < 0 ? 0.13 * (1 + E / FRINGE) ** 2 * base : 0;
      if (ab <= 0 && af <= 0) continue;
      const l00 = GL[go];
      const l10 = GL[go + 1];
      const l01 = GL[go + gw];
      const l11 = GL[go + gw + 1];
      const lam =
        (l00 + (l10 - l00) * tx) * (1 - ty) + (l01 + (l11 - l01) * tx) * ty;
      const li = Math.max(0, Math.min(255, Math.round((lam + 1) * 127.5))) * 3;
      // The terminator, anti-aliased by the light's change per pixel.
      const dl = Math.max(
        0.004,
        (Math.abs(l10 - l00) + Math.abs(l01 - l00) + Math.abs(l11 - l10)) /
          (2 * G),
      );
      const s00 = SH[go];
      const s10 = SH[go + 1];
      const s01 = SH[go + gw];
      const s11 = SH[go + gw + 1];
      const shd =
        (s00 + (s10 - s00) * tx) * (1 - ty) + (s01 + (s11 - s01) * tx) * ty;
      const st =
        Math.max(0, Math.min(1, (lam - TERM) / dl + 0.5)) * (1 - shd * 0.9);
      const r0s = shLo[li] + (shHi[li] - shLo[li]) * hz;
      const g0s = shLo[li + 1] + (shHi[li + 1] - shLo[li + 1]) * hz;
      const b0s = shLo[li + 2] + (shHi[li + 2] - shLo[li + 2]) * hz;
      const r0l = ltLo[li] + (ltHi[li] - ltLo[li]) * hz;
      const g0l = ltLo[li + 1] + (ltHi[li + 1] - ltLo[li + 1]) * hz;
      const b0l = ltLo[li + 2] + (ltHi[li + 2] - ltLo[li + 2]) * hz;
      let r = r0s + (r0l - r0s) * st;
      let g = g0s + (g0l - g0s) * st;
      let b = b0s + (b0l - b0s) * st;
      // The warm underside: where the surface turns down, low in the cloud.
      if (low > 0) {
        const n00 = GY[go];
        const n10 = GY[go + 1];
        const n01 = GY[go + gw];
        const n11 = GY[go + gw + 1];
        const ny =
          (n00 + (n10 - n00) * tx) * (1 - ty) + (n01 + (n11 - n01) * tx) * ty;
        const dn = Math.max(
          0.004,
          (Math.abs(n10 - n00) + Math.abs(n01 - n00)) / (2 * G),
        );
        const u = Math.max(0, Math.min(1, (-0.22 - ny) / dn + 0.5)) * low * 0.8;
        if (u > 0) {
          const wr = WARM_SHADE[0] + (WARM[0] - WARM_SHADE[0]) * st;
          const wg = WARM_SHADE[1] + (WARM[1] - WARM_SHADE[1]) * st;
          const wb = WARM_SHADE[2] + (WARM[2] - WARM_SHADE[2]) * st;
          r += (wr - r) * u;
          g += (wg - g) * u;
          b += (wb - b) * u;
        }
      }
      // A crisp lit rim on the outline's upper left.
      if (E < rimW + 1) {
        const nx = (GX[go] + GX[go + 1] + GX[go + gw] + GX[go + gw + 1]) * 0.25;
        const ny = (GY[go] + GY[go + 1] + GY[go + gw] + GY[go + gw + 1]) * 0.25;
        const m = Math.hypot(nx, ny) || 1;
        const face = (nx * L[0] + ny * L[1]) / (m * L2);
        const k =
          Math.max(0, Math.min(1, (face - 0.1) * 2)) *
          Math.max(0, Math.min(1, (rimW - E) * kk + 0.5)) *
          0.75;
        r += (RIM[0] - r) * k;
        g += (RIM[1] - g) * k;
        b += (RIM[2] - b) * k;
      }
      // The fringe under the body.
      let a = ab;
      if (af > 0) {
        const fa = af * (1 - ab);
        a = ab + fa;
        const t = fa / a;
        r += (FRINGE_C[0] - r) * t;
        g += (FRINGE_C[1] - g) * t;
        b += (FRINGE_C[2] - b) * t;
      }
      // The haze between the eye and the cloud.
      r += (sky[0] - r) * haze;
      g += (sky[1] - g) * haze;
      b += (sky[2] - b) * haze;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = Math.round(a * 255);
    }
  }
  blit(c, img, sf.rx0, y0);
}

// ------------------------------------------------------------------ the engraving

/**
 * Segments where a field crosses `level` on the surface's grid (marching
 * squares), within grid rows [j0, j1), into `path` (layer units), kept
 * where `keep(x, y, i, j)` says so.
 */
function contour(
  sf: Surface,
  arr: Float32Array,
  level: number,
  j0: number,
  j1: number,
  path: Path2D,
  keep: (x: number, y: number, i: number, j: number) => boolean,
): void {
  const { gw } = sf;
  const ux = (gi: number) => (sf.px0 + gi * G - sf.e) / sf.a;
  const uy = (gj: number) => (sf.py0 + gj * G - sf.f) / sf.d;
  const pts: number[] = [];
  for (let j = Math.max(0, j0); j < Math.min(sf.gh - 1, j1); j++) {
    for (let i = 0; i < gw - 1; i++) {
      const o = j * gw + i;
      const a = arr[o] - level;
      const b = arr[o + 1] - level;
      const c = arr[o + gw + 1] - level;
      const d = arr[o + gw] - level;
      const pa = a > 0;
      const pb = b > 0;
      const pc = c > 0;
      const pd = d > 0;
      if (pa === pb && pb === pc && pc === pd) continue;
      pts.length = 0;
      // Edges: top (a-b), right (b-c), bottom (d-c), left (a-d).
      if (pa !== pb) pts.push(i + a / (a - b), j);
      if (pb !== pc) pts.push(i + 1, j + b / (b - c));
      if (pd !== pc) pts.push(i + d / (d - c), j + 1);
      if (pa !== pd) pts.push(i, j + a / (a - d));
      for (let p = 0; p + 3 < pts.length; p += 4) {
        const xa = ux(pts[p]);
        const ya = uy(pts[p + 1]);
        const xb = ux(pts[p + 2]);
        const yb = uy(pts[p + 3]);
        if (!keep((xa + xb) / 2, (ya + yb) / 2, i, j)) continue;
        path.moveTo(xa, ya);
        path.lineTo(xb, yb);
      }
    }
  }
}

function strokeInk(c: PlateCanvas, p: Path2D, px: number, alpha: number) {
  const { ctx } = c;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = c.pen(px);
  ctx.strokeStyle = `rgba(${rgb(INK.hatch).join(",")},${alpha})`;
  ctx.stroke(p);
}

/**
 * The engraved cloud's strokes in grid rows [j0, j1): its outline, light
 * and broken on the lit upper left, firmer on the shaded lower right; the
 * terminators of the forms, and curves following them deeper in the
 * shade; and the underside's edge with a curve under it. `weight` scales
 * the pen (far clouds lighter).
 */
export function inkRows(
  cl: Cloud,
  sf: Surface,
  c: PlateCanvas,
  j0: number,
  j1: number,
  weight: number,
): void {
  sampleRows(cl, sf, j1 + 2);
  const s = cl.spec;
  const breaks = field(s.seed + 61, 14, 2);
  const rng = createRng(s.seed + 62 + j0);
  const at = (arr: Float32Array, i: number, j: number) =>
    arr[Math.min(sf.gh - 1, j) * sf.gw + Math.min(sf.gw - 1, i)];
  const facing = (i: number, j: number) => {
    const nx = at(sf.nx, i, j);
    const ny = at(sf.ny, i, j);
    const m = Math.hypot(nx, ny) || 1;
    return (nx * L[0] + ny * L[1]) / (m * L2);
  };
  const soft = s.soft ?? 4;
  const span = Math.max(1, cl.top - cl.bottom);
  const above = (x: number, y: number, k: number) =>
    y > cl.baseAt(x) + soft * k;
  const lit = new Path2D();
  const shade = new Path2D();
  const form = new Path2D();
  const deep = new Path2D();
  // The outline: the lit side sparse, the shaded side firmer.
  contour(sf, sf.E, 0.15, j0, j1, lit, (x, y, i, j) => {
    if (!above(x, y, 0.2)) return false;
    return facing(i + 1, j + 1) > 0.15 && breaks(x, y) > 0.15 && rng() > 0.2;
  });
  contour(sf, sf.E, 0.15, j0, j1, shade, (x, y, i, j) => {
    if (!above(x, y, 0.2)) return false;
    return facing(i + 1, j + 1) <= 0.15 && breaks(x, y) > -0.6 && rng() > 0.05;
  });
  const inside = (i: number, j: number) => at(sf.E, i + 1, j + 1) > 1.1;
  // The terminators, then curves following them into the shade.
  contour(sf, sf.lam, TERM, j0, j1, form, (x, y, i, j) => {
    if (!inside(i, j) || !above(x, y, 0.3)) return false;
    return breaks(x * 1.3, y * 1.3) > -0.45 && rng() > 0.08;
  });
  for (const [lv, k] of [
    [TERM - 0.16, -0.25],
    [TERM - 0.32, -0.05],
  ] as const) {
    contour(sf, sf.lam, lv, j0, j1, deep, (x, y, i, j) => {
      if (!inside(i, j) || !above(x, y, 0.3)) return false;
      return breaks(x * 1.7, y * 1.7) > k && rng() > 0.15;
    });
  }
  // The underside: where the surface turns down, low in the cloud.
  contour(sf, sf.ny, -0.22, j0, j1, deep, (x, y, i, j) => {
    if (!inside(i, j) || !above(x, y, 0.3)) return false;
    if ((y - cl.bottom) / span > 0.42) return false;
    return breaks(x * 1.5, y) > -0.3 && rng() > 0.12;
  });
  contour(sf, sf.ny, -0.5, j0, j1, deep, (x, y, i, j) => {
    if (!inside(i, j) || !above(x, y, 0.3)) return false;
    if ((y - cl.bottom) / span > 0.42) return false;
    return breaks(x * 1.5, y) > -0.1 && rng() > 0.2;
  });
  strokeInk(c, lit, 0.45 * weight, 0.32);
  strokeInk(c, shade, 0.7 * weight, 0.75);
  strokeInk(c, form, 0.55 * weight, 0.6);
  strokeInk(c, deep, 0.45 * weight, 0.5);
}

/** The grid rows a pixel row range covers. */
export function gridRows(
  sf: Surface,
  r0: number,
  r1: number,
): [number, number] {
  return [
    Math.max(0, Math.floor((r0 - sf.py0) / G)),
    Math.min(sf.gh - 1, Math.ceil((r1 - sf.py0) / G)),
  ];
}
