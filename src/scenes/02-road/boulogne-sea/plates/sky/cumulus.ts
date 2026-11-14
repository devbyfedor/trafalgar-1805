import { createRng, field, wobble } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";
import { skyAt } from "./ground";

/**
 * A cloud as a painter builds it: a body of broad forms; heads along the
 * top of different heights and widths, one of them leading; lumps on the
 * top's silhouette, bigger up the towers and smaller toward the ends, a
 * few smaller ones on the lit upper left of those; a face of a few broad
 * forms below; torn fragments under the base. Each form is a dome
 * standing out of the forms behind it, so the cloud has one continuous
 * surface, its outline scalloped.
 *
 * The light is that of 18:33 on 10 August 1805: the sun 7° up and 8° left
 * of straight behind the eye (history-notes, "The painting's light"), so
 * a cloud in front is lit square-on and nearly without shadow. The forms
 * are modelled by the big masses, not by every lump: the light is read
 * from the surface smoothed at the masses' scale, so a tower turns softly
 * from its lit upper left to a warm half-tone at its lower right, and
 * only the crevices between the masses darken, a little. The lumps show
 * where the light catches them: on the top's silhouette and the towers'
 * upper left. Faces turned up take the cool sky's light; the lower faces
 * glow warm, gold-apricot, by their form and their height above the
 * base, with a thin bright lip where the base's front edge turns toward
 * the eye; under it, on clouds seen from well below, the flat underside
 * shows as a cool lilac shelf whose far edge melts into the sky. Lower
 * and farther clouds stand deeper in the haze.
 *
 * The colour is shaded on a grid of every third device pixel (a 2D shader
 * in plain JavaScript: no filter, no blur, no grain), and interpolated per
 * pixel; the outline, the lip and the rim are found per pixel, so they
 * stay crisp. The engraving draws from the same surface: paper where the
 * cloud is, strokes that follow the form over each mass (the contours of
 * a relief), only where the light falls off, closer in the deeper shade;
 * the underside hatched along the base; a few broken marks on the shaded
 * side's outline, none on the lit side.
 */

export interface CloudSpec {
  seed: number;
  /** Extent across, layer units. */
  x0: number;
  x1: number;
  /** The base's height at the middle, and its slope (units up per unit right). */
  base: number;
  tilt: number;
  /** The tallest head above the base. */
  height: number;
  /** Heads along the top: [where across 0..1, half-width 0..1, height 0..1]. */
  heads?: readonly (readonly [number, number, number])[];
  /** Or a count of heads placed at random (one of them the tallest). */
  towers?: number;
  /** Vertical squash of the forms (stratocumulus below 1). */
  flat?: number;
  /** Taken toward the sky behind, 0..1 (lower and farther: more). */
  haze: number;
  /** How far up the base fades, units. */
  soft?: number;
  /** The lumps' size, relative (1 by default). */
  billow?: number;
  /** The share of the face's lumps kept (0.33 by default). */
  lumps?: number;
  /** Torn fragments under the base. */
  fragments?: number;
  /** How the ends taper (smaller: blunter; 0.55 by default). */
  taper?: number;
  /** The top's height between the heads, a share of `height` (0.16 by default). */
  floor?: number;
  /** The underside seen from below: its depth as a share of `height` (0: none). */
  under?: number;
  /** The base's unevenness, as a share of `height` (0.05 by default). */
  rag?: number;
  /** How much the lumps show in the light: crevices and their own light (1 by default; soft billows below). */
  crisp?: number;
  /** Lost edges: how far inside the outline it may fade where the cloud thins, units (0: crisp all round). */
  lost?: number;
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
  /** Box with the fringe and the underside, layer units: x0, x1, y0, y1. */
  box: [number, number, number, number];
  bottom: number;
  top: number;
  baseAt: (x: number) => number;
  /** The underside's depth below the base at x, units (0: none). */
  underAt: (x: number) => number;
  /** Lobes by cell. */
  cell: number;
  cx0: number;
  cy0: number;
  cw: number;
  ch: number;
  cells: Int32Array[];
}

/** The fringe outside the outline, units: a faint translucent edge. */
const FRINGE = 2;
/** The outline's irregularity, at most. */
const IRREG = 0.07;

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

function lobesOf(s: CloudSpec): {
  lobes: Lobe[];
  baseAt: (x: number) => number;
  thick: (x: number) => number;
} {
  const rng = createRng(s.seed);
  const w = s.x1 - s.x0;
  const flat = s.flat ?? 1;
  const H = s.height;
  const bs = s.billow ?? 1;
  const heads =
    s.heads?.map(([c, hw, h]) => ({ c, w: hw, h })) ??
    (() => {
      const out = Array.from({ length: s.towers ?? 3 }, () => ({
        c: 0.16 + 0.68 * rng(),
        w: 0.07 + 0.15 * rng(),
        h: 0.3 + 0.5 * rng(),
      }));
      out[Math.floor(rng() * out.length)].h = 1;
      return out;
    })();
  const topWob = wobble(s.seed + 5, [
    [w * 0.23, 0.05],
    [w * 0.09, 0.03],
  ]);
  const taper = s.taper ?? 0.55;
  const env = (t: number): number => {
    let m = 0;
    for (const k of heads)
      m = Math.max(m, k.h * Math.exp(-(((t - k.c) / k.w) ** 2)));
    const end = Math.max(0, Math.sin(Math.PI * t)) ** taper;
    const floor = s.floor ?? 0.16;
    return Math.max(
      0,
      Math.min(1, (floor + (1 - floor) * m + topWob(t * w)) * end),
    );
  };
  const rag = s.rag ?? 0.05;
  const baseWob = wobble(s.seed + 3, [
    [w * 0.37, H * rag],
    [w * 0.11, H * rag * 0.5],
  ]);
  const mid = (s.x0 + s.x1) / 2;
  const baseAt = (x: number) => s.base + s.tilt * (x - mid) + baseWob(x - s.x0);
  const topAt = (x: number) => baseAt(x) + H * env((x - s.x0) / w);
  const thick = (x: number) => Math.max(H * 0.08, topAt(x) - baseAt(x));
  const lobes: Lobe[] = [];
  // A body form shrunk until its upper half stays under the top's
  // profile (less a margin the top's lumps cover), so no broad smooth arc
  // stands proud of a tower's flank.
  const fit = (l: Lobe, margin: number, foot?: number): Lobe => {
    for (let k = 0; k < 10; k++) {
      let ok = true;
      for (let q = 1; q < 8; q++) {
        const th = (Math.PI * q) / 8;
        const px = l.x + Math.cos(th) * l.a;
        const py = l.y + Math.sin(th) * l.b;
        if (py > topAt(px) - margin) {
          ok = false;
          break;
        }
      }
      if (ok) break;
      // Narrower, a little lower, its foot kept on the base.
      l.a *= 0.86;
      l.d *= 0.86;
      if (foot !== undefined) {
        l.b *= 0.96;
        l.y = foot + l.b * 0.92;
      } else {
        l.b *= 0.92;
      }
    }
    return l;
  };

  // The foot: wide, low forms along the base, so the base's front edge
  // runs level with shallow scallops, never a row of balls.
  let x = s.x0 + w * 0.02;
  while (x < s.x1 - w * 0.02) {
    const T = thick(x);
    const b = Math.max(3, Math.min(T * 0.32, H * 0.22)) * flat;
    const a = b * (2.2 + 0.9 * rng());
    const l = fit(lobe(x, baseAt(x) + b * 0.97, a, b, b * 0.5), T * 0.04);
    lobes.push(l);
    x += Math.max(l.a, b) * (0.75 + 0.2 * rng());
  }

  // The body: broad, flat forms filling the space from base to top.
  x = s.x0 + w * 0.03;
  while (x < s.x1 - w * 0.03) {
    const T = thick(x);
    const r = T * (0.5 + 0.06 * rng());
    const a = r * (1.0 + 0.25 * rng());
    const b = Math.min(r, T * 0.55) * flat;
    const l = fit(
      lobe(x, baseAt(x) + b * 0.92, a, b, a * 0.3),
      T * 0.06,
      baseAt(x),
    );
    lobes.push(l);
    if (T > 2.3 * b) {
      const r2 = Math.min(a, (T - b) * 0.5);
      lobes.push(
        fit(
          lobe(
            x + (rng() - 0.5) * a * 0.4,
            topAt(x) - r2 * flat * 1.05,
            r2,
            r2 * flat,
            r2 * 0.32,
          ),
          T * 0.05,
        ),
      );
    }
    x += Math.max(l.a, r * 0.6) * (0.7 + 0.25 * rng());
  }

  // Lumps along the top and down the flanks: sizes spread by a power law
  // (many small, a few big), biggest up the towers.
  const big: Lobe[] = [];
  x = s.x0 + w * 0.012;
  while (x < s.x1 - w * 0.008) {
    const T = thick(x);
    const q = rng();
    const r = Math.max(
      2.2,
      Math.min(H * 0.18, T * (0.06 + 0.2 * q * q) * bs + 1.6),
    );
    const a = r * (0.9 + 0.3 * rng());
    const b = r * flat * (0.85 + 0.2 * rng());
    const l = lobe(x, topAt(x) - b * (0.5 + 0.3 * rng()), a, b, a);
    // A stem under it down into the body, so no crown floats free of its
    // tower where the body's broad forms are too wide to reach.
    const stem = Math.min(T * 0.55, b * 4);
    if (stem > b) {
      lobes.push(
        lobe(x, l.y - stem * 0.5, a * 1.05, stem * 0.5 + b * 0.4, a * 0.35),
      );
    }
    big.push(seat(lobes, l, 0.5 + 0.1 * rng()));
    // Step along the top's profile, not across: the steep flanks of a
    // tower get their lumps as its crown does.
    const slope = (topAt(x + 1) - topAt(x - 1)) / 2;
    x += (a * (0.62 + 0.4 * rng())) / Math.sqrt(1 + slope * slope);
  }
  // A few lumps over the upper face; the lower part left to the body's
  // broad forms.
  const face: Lobe[] = [];
  const tries = Math.round(
    ((w * H) / (H * H * 0.012 + 30)) * (s.lumps ?? 0.33),
  );
  for (let i = 0; i < tries; i++) {
    const fx = s.x0 + w * (0.06 + 0.88 * rng());
    const b0 = baseAt(fx);
    const T = thick(fx);
    const fy = b0 + T * (0.5 + 0.42 * rng());
    const q = rng();
    const r = Math.max(2.2, T * (0.12 + 0.18 * q * q) * bs);
    if (fy + r * flat * 0.5 > topAt(fx)) continue;
    let crowded = false;
    for (const o of face)
      if (Math.hypot(o.x - fx, (o.y - fy) / flat) < 1.1 * (o.a + r)) {
        crowded = true;
        break;
      }
    if (crowded) continue;
    face.push(
      seat(lobes, lobe(fx, fy, r, r * flat * (0.85 + 0.2 * rng()), r), 0.4),
    );
  }

  // Smaller lumps on the crowns of the bigger top lumps, more toward the
  // lit upper left.
  for (const p of big) {
    if (p.a < 4.5 || rng() < 0.2) continue;
    const k = 1 + Math.floor(rng() * (p.a > 12 ? 3 : 2));
    for (let i = 0; i < k; i++) {
      const th = ((25 + 150 * rng() ** 0.8) * Math.PI) / 180;
      const q = rng();
      const r = p.a * (0.3 + 0.22 * q * q);
      const at = 0.62 + 0.2 * rng();
      const l2 = seat(
        lobes,
        lobe(
          p.x + Math.cos(th) * p.a * at,
          p.y + Math.sin(th) * p.b * at,
          r,
          r * flat * (0.86 + 0.2 * rng()),
          r,
        ),
        0.45 + 0.12 * rng(),
      );
      // On a crown big enough to show it, the finest lumps: one or two
      // on its lit upper left, where the light catches the silhouette.
      if ((s.crisp ?? 1) >= 1 && l2.a > 4 && th > 0.6 && th < 2.6) {
        const k3 = rng() < 0.55 ? 1 : 2;
        for (let m = 0; m < k3; m++) {
          const t3 = ((70 + 90 * rng()) * Math.PI) / 180;
          const r3 = l2.a * (0.28 + 0.14 * rng());
          seat(
            lobes,
            lobe(
              l2.x + Math.cos(t3) * l2.a * 0.7,
              l2.y + Math.sin(t3) * l2.b * 0.7,
              r3,
              r3 * flat * 0.92,
              r3,
            ),
            0.42 + 0.1 * rng(),
          );
        }
      }
    }
  }

  // Torn fragments under the base, toward the ends: each a few small
  // forms in a loose row, not one lozenge (none where the underside shows:
  // it is the base seen from below).
  const nf = (s.under ?? 0) > 0 ? 0 : (s.fragments ?? 2);
  for (let i = 0; i < nf; i++) {
    const t = rng() < 0.5 ? 0.04 + 0.22 * rng() : 0.74 + 0.22 * rng();
    let fx = s.x0 + t * w;
    const fy = baseAt(fx) - H * (0.03 + 0.05 * rng());
    const r0 = H * (0.022 + 0.025 * rng());
    const parts = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < parts; k++) {
      const r = r0 * (0.55 + 0.6 * rng());
      lobes.push(
        lobe(fx, fy + (rng() - 0.5) * r0 * 0.6, r * 1.5, r * 0.7 * flat, r),
      );
      fx += r * (1.2 + 1.2 * rng()) * (rng() < 0.5 ? -1 : 1);
    }
  }

  for (const l of lobes) {
    const amp = IRREG * (0.4 + 0.6 * rng());
    const ph = rng() * Math.PI * 2;
    l.c3 = amp * Math.cos(ph);
    l.s3 = amp * Math.sin(ph);
  }
  return { lobes, baseAt, thick };
}

/** A cloud's forms, packed for the shader, with its box and its lobes by cell. */
type Forms = ReturnType<typeof lobesOf>;

export function cloudOf(s: CloudSpec, forms: Forms = lobesOf(s)): Cloud {
  const { lobes, baseAt, thick } = forms;
  const n = lobes.length;
  const arr = () => new Float64Array(n);
  const under = s.under ?? 0;
  const uWob = wobble(s.seed + 17, [
    [(s.x1 - s.x0) * 0.43, 0.16],
    [(s.x1 - s.x0) * 0.17, 0.07],
  ]);
  const underAt = (x: number) =>
    under <= 0 || x <= s.x0 || x >= s.x1
      ? 0
      : under *
        s.height *
        (thick(x) / s.height) ** 0.6 *
        Math.sin((Math.PI * (x - s.x0)) / (s.x1 - s.x0)) ** 0.5 *
        Math.max(0, 1 + uWob(x - s.x0));
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
    underAt,
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
    // How far out (in the lobe's own radii) it still adds to the fringe.
    const reach = 1 + IRREG + (FRINGE + 1) / Math.min(l.a, l.b);
    c.lim2[i] = reach * reach;
    x0 = Math.min(x0, l.x - l.a * reach);
    x1 = Math.max(x1, l.x + l.a * reach);
    y0 = Math.min(y0, l.y - l.b * reach);
    y1 = Math.max(y1, l.y + l.b * reach);
  });
  c.bottom = Math.min(...lobes.map((l) => l.y - l.b));
  c.top = Math.max(...lobes.map((l) => l.y + l.b));
  // Room for the underside below the base.
  if (under > 0) {
    let low = y0;
    for (let x = s.x0; x <= s.x1; x += 4)
      low = Math.min(low, baseAt(x) - underAt(x) - (s.soft ?? 4) * 1.5);
    y0 = low;
  }
  c.box = [x0, x1, y0, y1];
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
  const v = [-0.14, 0.12, 0.98];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m] as const;
})();
/**
 * The light the big masses are modelled by: the same sun, read a little
 * more from the side, as a painter models a form (only the masses, so no
 * crescent under every lump).
 */
const LB = (() => {
  const v = [-0.26, 0.2, 0.94];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m] as const;
})();
/** The light's direction in the picture plane (upper left), normalised. */
const LP = (() => {
  const m = Math.hypot(L[0], L[1]);
  return [L[0] / m, L[1] / m] as const;
})();

/** The grid's spacing, device px. */
const G = 3;

/**
 * The cloud's surface sampled on a grid over its box on one canvas (every
 * G device px): the distance inside the outline (units; negative
 * outside), the surface's height and its normal; then, once shaded, the
 * colour, the light's value and the smoothed height (for the engraving).
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
  H: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  /** Shaded: the colour, the light's value 0..1, the height smoothed at the masses' scale. */
  cr: Float32Array;
  cg: Float32Array;
  cb: Float32Array;
  v: Float32Array;
  hs: Float32Array;
  /** How lost the outline is here, 0..1 (by the mass's side and a slow field). */
  lo: Float32Array;
  /** Grid rows sampled, rows shaded, and whether the shading is done. */
  rows: number;
  shadedRows: number;
  shaded: boolean;
  /** While shading: the height smoothed for the masses' normal, and which cells hold colour. */
  hb: Float32Array | null;
  inside: Uint8Array | null;
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
  const f32 = () => new Float32Array(n);
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
    E: f32(),
    H: f32(),
    nx: f32(),
    ny: f32(),
    nz: f32(),
    cr: f32(),
    cg: f32(),
    cb: f32(),
    v: f32(),
    hs: f32(),
    lo: f32(),
    rows: 0,
    shadedRows: 0,
    shaded: false,
    hb: null,
    inside: null,
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
      if (W > 0) {
        const m = Math.hypot(Nx, Ny, Nz) || 1;
        sf.nx[o] = Nx / m;
        sf.ny[o] = Ny / m;
        sf.nz[o] = Nz / m;
        sf.H[o] = Math.max(0, Hm);
      } else {
        sf.nx[o] = 0;
        sf.ny[o] = 0;
        sf.nz[o] = 1;
        sf.H[o] = 0;
      }
    }
  }
  sf.rows = Math.max(sf.rows, end);
}

/** A box blur of radius r cells along rows (dx 1) or columns (dx gw), twice. */
function blur(
  src: Float32Array,
  out: Float32Array,
  tmp: Float32Array,
  gw: number,
  gh: number,
  r: number,
): void {
  const pass = (a: Float32Array, b: Float32Array, along: boolean) => {
    const n = along ? gw : gh;
    const lines = along ? gh : gw;
    const step = along ? 1 : gw;
    const k = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const o0 = along ? l * gw : l;
      let s = 0;
      for (let i = -r; i <= r; i++) if (i >= 0 && i < n) s += a[o0 + i * step];
      for (let i = 0; i < n; i++) {
        b[o0 + i * step] = s * k;
        const add = i + r + 1;
        const sub = i - r;
        if (add < n) s += a[o0 + add * step];
        if (sub >= 0) s -= a[o0 + sub * step];
      }
    }
  };
  pass(src, tmp, true);
  pass(tmp, out, false);
  pass(out, tmp, true);
  pass(tmp, out, false);
}

type RGB = [number, number, number];

function rgb(hex: string): RGB {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The lit face: low in the cloud (warmer) and high (creamier, pinker). */
const LIT_LO = rgb("#f7d6ae");
const LIT_HI = rgb("#fbe7da");
/** The half-tone where a mass turns away: warm rose-grey. */
const HALF = rgb("#dcbfb8");
/** The shade: cool lilac, warmed low in the cloud by the sunlit land's light. */
const SHADE_HI = rgb("#a89cb5");
const SHADE_LO = rgb("#b9a2a7");
/** The lower faces' glow: gold-apricot, and in the half-tone a warm rose. */
const WARM = rgb("#f2be86");
const WARM_HALF = rgb("#e6ad8c");
/** The lip where the base's front edge turns toward the eye. */
const LIP = rgb("#ffd9a6");
/** The underside: near the lip, and at its far edge (before the haze). */
const UNDER_NEAR = rgb("#94889f");
const UNDER_FAR = rgb("#ae9fae");
const RIM = rgb("#fff3e0");
/** The light of the clear sky overhead on faces turned up: cool, pinkish. */
const SKYLIGHT = rgb("#d9cfe3");
const FRINGE_C = rgb("#ecd3bd");

/**
 * Shades the sampled grid: the light read from the surface smoothed at
 * the masses' scale (a little of the lumps' own light only near the top),
 * the crevices between masses, the faces turned up cooled by the sky, the
 * lower faces warmed; the colours carried a little past the outline so
 * the per-pixel interpolation never mixes in a colour from outside.
 */
export function shadeGrid(cl: Cloud, sf: Surface): void {
  if (sf.shaded) return;
  prepShade(cl, sf);
  shadeRows(cl, sf, sf.gh);
  finishShade(sf);
}

/** Shading, first: the surface smoothed at the masses' and the towers' scales. */
function prepShade(cl: Cloud, sf: Surface): void {
  if (sf.hb) return;
  sampleRows(cl, sf, sf.gh);
  const s = cl.spec;
  const { gw, gh, E, H } = sf;
  const n = gw * gh;
  const unitCells = sf.a / G;
  const rb = Math.max(2, Math.round(s.height * 0.09 * unitCells));
  const rc = Math.max(1, Math.round(s.height * 0.035 * unitCells));
  const hb = new Float32Array(n);
  const hc = sf.hs;
  const tmp = new Float32Array(n);
  blur(H, hb, tmp, gw, gh, rb);
  blur(H, hc, tmp, gw, gh, rc);
  // The towers' roundness: the outline inflated, from its coverage
  // smoothed at a tower's scale, so each mass turns away toward its edge.
  const rtU = s.height * 0.16;
  const rt = Math.max(2, Math.round(rtU * unitCells));
  const cov = new Float32Array(n);
  for (let o = 0; o < n; o++)
    cov[o] = Math.max(0, Math.min(1, E[o] * 0.5 + 0.5));
  const ht = new Float32Array(n);
  blur(cov, ht, tmp, gw, gh, rt);
  for (let o = 0; o < n; o++) hb[o] = hb[o] * 0.7 + ht[o] * rtU * 2.2;
  sf.hb = hb;
  sf.inside = new Uint8Array(n);
}

/** Shading, then: the grid's rows up to `upTo` (exclusive). */
function shadeRows(cl: Cloud, sf: Surface, upTo: number): void {
  prepShade(cl, sf);
  const s = cl.spec;
  const { gw, E, H, nx, ny, nz } = sf;
  const hb = sf.hb as Float32Array;
  const hc = sf.hs;
  const inside = sf.inside as Uint8Array;
  const gh = sf.gh;
  const du = G / sf.a;
  const dv = G / sf.d;
  const span = Math.max(1, cl.top - cl.bottom);
  const cavK = 1 / Math.max(1.5, s.height * 0.05);
  const crisp = s.crisp ?? 1;
  // A slow wander of the value shapes' borders, as a brush leaves them.
  const wander = field(s.seed + 91, Math.max(24, s.height * 0.4), 2);
  const lostOn = (s.lost ?? 0) > 0;
  const lostF = field(s.seed + 101, 26, 2);
  const end = Math.min(gh, upTo);
  for (let j = sf.shadedRows; j < end; j++) {
    const y = (sf.py0 + j * G - sf.f) / sf.d;
    const hz = Math.max(0, Math.min(1, (y - cl.bottom) / span));
    for (let i = 0; i < gw; i++) {
      const o = j * gw + i;
      if (E[o] <= 0 && H[o] <= 0) continue;
      inside[o] = 1;
      const x = (sf.px0 + i * G - sf.e) / sf.a;
      // The masses' normal, from the smoothed height.
      const il = i > 0 ? o - 1 : o;
      const ir = i < gw - 1 ? o + 1 : o;
      const jd = j > 0 ? o - gw : o;
      const ju = j < gh - 1 ? o + gw : o;
      const gx = (hb[ir] - hb[il]) / ((ir - il) * du || du);
      const gy = (hb[ju] - hb[jd]) / (((ju - jd) / gw) * dv || dv);
      const m = Math.hypot(gx, gy, 1);
      const bx = -gx / m;
      const by = -gy / m;
      const bz = 1 / m;
      const lamB = bx * LB[0] + by * LB[1] + bz * LB[2];
      if (lostOn) {
        const mb = Math.hypot(bx, by);
        const facing = mb > 0.05 ? (bx * LP[0] + by * LP[1]) / mb : 0;
        sf.lo[o] =
          Math.max(0, Math.min(1, 0.4 - 0.8 * facing + 0.5 * lostF(x, y))) *
          smooth(0.8, 0.4, hz);
      }
      const lamF = nx[o] * L[0] + ny[o] * L[1] + nz[o] * L[2];
      // The lumps' own light: near the top's silhouette and on the upper
      // left, faint elsewhere.
      const edge = 1 - smooth(1.5, 9, E[o]);
      const upLeft = smooth(-0.3, 0.6, bx * LP[0] + by * LP[1]);
      const wf = (0.08 + 0.45 * edge * upLeft * smooth(0.25, 0.7, hz)) * crisp;
      const lam = lamB + (lamF - lamB) * wf;
      const cav = Math.max(0, Math.min(1, (hc[o] - H[o]) * cavK));
      // The light's value: soft, from the half-tone to the full light.
      // In a few broad steps with short soft transitions, as a painter
      // lays the light, the half-tone and the shade as shapes.
      const raw = lam - 0.32 * crisp * cav + 0.07 * wander(x, y);
      const vL = 0.25 * smooth(0.5, 0.6, raw) + 0.75 * smooth(0.74, 0.84, raw);
      const vS =
        0.35 * smooth(0.12, 0.22, raw) + 0.65 * smooth(0.36, 0.46, raw);
      sf.v[o] = vL;
      // Lit, half-tone and shade, each warmer low in the cloud.
      const lr = LIT_LO[0] + (LIT_HI[0] - LIT_LO[0]) * hz;
      const lg = LIT_LO[1] + (LIT_HI[1] - LIT_LO[1]) * hz;
      const lb = LIT_LO[2] + (LIT_HI[2] - LIT_LO[2]) * hz;
      const sr = SHADE_LO[0] + (SHADE_HI[0] - SHADE_LO[0]) * hz;
      const sg = SHADE_LO[1] + (SHADE_HI[1] - SHADE_LO[1]) * hz;
      const sb = SHADE_LO[2] + (SHADE_HI[2] - SHADE_LO[2]) * hz;
      let r = sr + (HALF[0] - sr) * vS;
      let g = sg + (HALF[1] - sg) * vS;
      let b = sb + (HALF[2] - sb) * vS;
      r += (lr - r) * vL;
      g += (lg - g) * vL;
      b += (lb - b) * vL;
      // The lower faces glow warm, by their form and their height above
      // the base.
      const above = Math.max(0, y - cl.baseAt(x));
      const warm =
        Math.exp(-above / (0.3 * s.height)) *
        (0.5 + 0.5 * smooth(0.2, -0.45, by)) *
        0.85;
      if (warm > 0.003) {
        const wr = WARM_HALF[0] + (WARM[0] - WARM_HALF[0]) * vL;
        const wg = WARM_HALF[1] + (WARM[1] - WARM_HALF[1]) * vL;
        const wb = WARM_HALF[2] + (WARM[2] - WARM_HALF[2]) * vL;
        const k = warm * (0.6 + 0.4 * vS);
        r += (wr - r) * k;
        g += (wg - g) * k;
        b += (wb - b) * k;
      }
      // Faces turned up take the cool sky's light.
      if (by > 0) {
        const k = 0.2 * smooth(0, 0.8, by);
        r += (SKYLIGHT[0] - r) * k;
        g += (SKYLIGHT[1] - g) * k;
        b += (SKYLIGHT[2] - b) * k;
      }
      sf.cr[o] = r;
      sf.cg[o] = g;
      sf.cb[o] = b;
    }
  }
  sf.shadedRows = Math.max(sf.shadedRows, end);
}

/** Shading, last: the colours carried two cells past the outline. */
function finishShade(sf: Surface): void {
  if (sf.shaded) return;
  const { gw, gh } = sf;
  const n = gw * gh;
  const inside = sf.inside as Uint8Array;
  for (let it = 0; it < 2; it++) {
    const add: number[] = [];
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++) {
        const o = j * gw + i;
        if (inside[o]) continue;
        let k = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (const q of [o - 1, o + 1, o - gw, o + gw]) {
          if (q < 0 || q >= n || !inside[q]) continue;
          if ((q === o - 1 && i === 0) || (q === o + 1 && i === gw - 1))
            continue;
          r += sf.cr[q];
          g += sf.cg[q];
          b += sf.cb[q];
          k++;
        }
        if (k > 0) {
          sf.cr[o] = r / k;
          sf.cg[o] = g / k;
          sf.cb[o] = b / k;
          add.push(o);
        }
      }
    for (const o of add) inside[o] = 1;
  }
  sf.shaded = true;
  sf.hb = null;
  sf.inside = null;
}

// ------------------------------------------------------------------ colour

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

/** Per pixel column: the base's ragged line, the underside's depth and whether the face stands over it. */
interface Columns {
  base: Float32Array;
  under: Float32Array;
  body: Float32Array;
}

function columnsOf(cl: Cloud, sf: Surface): Columns {
  const w = sf.rx1 - sf.rx0;
  const s = cl.spec;
  const soft = s.soft ?? 4;
  const rag = wobble(s.seed + 41, [
    [31, 0.3],
    [13, 0.18],
  ]);
  const base = new Float32Array(w);
  const under = new Float32Array(w);
  const body = new Float32Array(w);
  for (let i = 0; i < w; i++) {
    const x = (sf.rx0 + i + 0.5 - sf.e) / sf.a;
    base[i] = cl.baseAt(x) + soft * rag(x) * 0.6;
    under[i] = cl.underAt(x);
    body[i] = under[i] > 0 ? 1 : 0;
  }
  return { base, under, body };
}

/** The face's alpha and the underside's alpha at a pixel. */
const COVER: [number, number] = [0, 0];

/** The face's alpha and the underside's alpha at a pixel, into COVER. */
function cover(
  E: number,
  y: number,
  base: number,
  under: number,
  body: number,
  kk: number,
  soft: number,
  ew: number,
): void {
  let af: number;
  let au = 0;
  // The outline: crisp (anti-aliased to a pixel) or lost over `ew` units
  // inside it, where the cloud thins.
  // (one ramp for both, continuous in ew: at ew 0 the pixel's own
  // anti-aliasing)
  const ramp = Math.max(0, Math.min(1, (E * kk + 0.5) / (1 + ew * kk)));
  const edge = ramp * ramp * (3 - 2 * ramp) * 0.5 + ramp * 0.5;
  if (under > 0) {
    // The face runs down to its own lower outline; the underside fills
    // below and behind it, its far edge soft.
    af = edge;
    const bottom = base - under;
    if (y < base + soft && y > bottom - soft) {
      au =
        body *
        Math.max(0, Math.min(1, (y - bottom) / (0.45 * soft + 0.1 * under))) *
        Math.max(0, Math.min(1, (base + soft - y) * kk * 0.5));
    }
  } else {
    af = edge * Math.max(0, Math.min(1, (y - base) / soft + 0.35));
  }
  COVER[0] = af;
  COVER[1] = au;
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
  cols: Columns,
): void {
  const y0 = Math.max(sf.ry0, r0);
  const y1 = Math.min(sf.ry1, r1);
  const w = sf.rx1 - sf.rx0;
  if (y1 <= y0 || w <= 0) return;
  shadeGrid(cl, sf);
  const img = new ImageData(w, y1 - y0);
  const data = img.data;
  const s = cl.spec;
  const kk = sf.a;
  const soft = s.soft ?? 4;
  const rimW = 0.9;
  const lipW = Math.max(1.2, s.height * 0.022);
  const span = Math.max(1, cl.top - cl.bottom);
  const pr = rgb(PAPER.low);
  const gw = sf.gw;
  const { E: GE, cr: CR, cg: CG, cb: CB, nx: GX, ny: GY } = sf;
  const lostMax = s.lost ?? 0;
  // The lip's strength along the base, per column.
  const lipW1 = wobble(s.seed + 71, [
    [47, 0.5],
    [17, 0.3],
  ]);
  const lipK = new Float32Array(w);
  for (let i = 0; i < w; i++)
    lipK[i] = Math.max(
      0,
      Math.min(1, 0.6 + 0.8 * lipW1((sf.rx0 + i + 0.5 - sf.e) / sf.a)),
    );
  for (let py = y0; py < y1; py++) {
    const y = (py + 0.5 - sf.f) / sf.d;
    const fy = (py + 0.5 - sf.py0) / G;
    const j = Math.floor(fy);
    const ty = fy - j;
    const hz = Math.max(0, Math.min(1, (y - cl.bottom) / span));
    const sky = rgb(skyAt(y));
    const haze = Math.min(0.92, s.haze + 0.18 * (1 - hz) ** 2);
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
      const base = cols.base[i];
      const under = cols.under[i];
      if (
        E <= -FRINGE &&
        (under <= 0 || y > base + soft || y < base - under - soft)
      )
        continue;
      // Lost and found edges: crisp where the light catches the outline
      // (the top, the upper left), lost where the cloud thins (the lower
      // and right sides, here and there by a slow field).
      let ew = 0;
      if (lostMax > 0 && E < lostMax && E > -FRINGE) {
        const LO = sf.lo;
        const lost =
          LO[go] * (1 - tx) * (1 - ty) +
          LO[go + 1] * tx * (1 - ty) +
          LO[go + gw] * (1 - tx) * ty +
          LO[go + gw + 1] * tx * ty;
        ew = lostMax * lost * lost;
      }
      cover(E, y, base, under, cols.body[i], kk, soft, ew);
      const af = COVER[0];
      const au = COVER[1];
      const o = row + i * 4;
      if (paper) {
        const a = af + au * (1 - af);
        if (a <= 0) continue;
        data[o] = pr[0];
        data[o + 1] = pr[1];
        data[o + 2] = pr[2];
        data[o + 3] = Math.round(a * 255);
        continue;
      }
      const afr =
        E < 0 && under <= 0
          ? 0.12 *
            (1 + E / FRINGE) ** 2 *
            Math.max(0, Math.min(1, (y - base) / soft + 0.35))
          : 0;
      if (af <= 0 && au <= 0 && afr <= 0) continue;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;
      let r =
        CR[go] * w00 +
        CR[go + 1] * w10 +
        CR[go + gw] * w01 +
        CR[go + gw + 1] * w11;
      let g =
        CG[go] * w00 +
        CG[go + 1] * w10 +
        CG[go + gw] * w01 +
        CG[go + gw + 1] * w11;
      let b =
        CB[go] * w00 +
        CB[go + 1] * w10 +
        CB[go + gw] * w01 +
        CB[go + gw + 1] * w11;
      if (E > -FRINGE && E < Math.max(rimW, lipW) + 1) {
        const nxp =
          GX[go] * w00 +
          GX[go + 1] * w10 +
          GX[go + gw] * w01 +
          GX[go + gw + 1] * w11;
        const nyp =
          GY[go] * w00 +
          GY[go + 1] * w10 +
          GY[go + gw] * w01 +
          GY[go + gw + 1] * w11;
        const m = Math.hypot(nxp, nyp) || 1;
        const face = (nxp * LP[0] + nyp * LP[1]) / m;
        // A crisp lit rim on the outline's upper left.
        const kr =
          Math.max(0, Math.min(1, (face - 0.2) * 2)) *
          Math.max(0, Math.min(1, (rimW - E) * kk + 0.5)) *
          0.3 *
          Math.min(1, hz * 2.5);
        r += (RIM[0] - r) * kr;
        g += (RIM[1] - g) * kr;
        b += (RIM[2] - b) * kr;
        // The lip: the face's lower outline, where it turns under.
        const down = Math.max(0, Math.min(1, (-nyp / m - 0.35) * 2.5));
        if (down > 0 && hz < 0.6) {
          const kl =
            down *
            Math.max(0, Math.min(1, (lipW - E) / lipW)) ** 1.5 *
            lipK[i] *
            (under > 0 ? 0.5 : 0.3);
          r += (LIP[0] - r) * kl;
          g += (LIP[1] - g) * kl;
          b += (LIP[2] - b) * kl;
        }
      }
      let a = af;
      if (au > 0) {
        // The underside behind the face: darker near the lip, lighter and
        // hazier toward its far edge.
        const t = Math.max(0, Math.min(1, (base - y) / Math.max(1, under)));
        const ur = UNDER_NEAR[0] + (UNDER_FAR[0] - UNDER_NEAR[0]) * t;
        const ug = UNDER_NEAR[1] + (UNDER_FAR[1] - UNDER_NEAR[1]) * t;
        const ub = UNDER_NEAR[2] + (UNDER_FAR[2] - UNDER_NEAR[2]) * t;
        const hu = 0.35 * t * t;
        const ua = au * (1 - af);
        a = af + ua;
        const k = ua / a;
        r += (ur + (sky[0] - ur) * hu - r) * k;
        g += (ug + (sky[1] - ug) * hu - g) * k;
        b += (ub + (sky[2] - ub) * hu - b) * k;
      }
      if (afr > 0) {
        const fa = afr * (1 - a);
        const t = fa / (a + fa);
        a += fa;
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
 * where `keep(x, y, o)` says so (o: the cell's grid index).
 */
function contour(
  sf: Surface,
  arr: Float32Array,
  level: number,
  j0: number,
  j1: number,
  path: Path2D,
  keep: (x: number, y: number, o: number) => boolean,
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
      if (pa !== pb) pts.push(i + a / (a - b), j);
      if (pb !== pc) pts.push(i + 1, j + b / (b - c));
      if (pd !== pc) pts.push(i + d / (d - c), j + 1);
      if (pa !== pd) pts.push(i, j + a / (a - d));
      for (let p = 0; p + 3 < pts.length; p += 4) {
        const xa = ux(pts[p]);
        const ya = uy(pts[p + 1]);
        const xb = ux(pts[p + 2]);
        const yb = uy(pts[p + 3]);
        if (!keep((xa + xb) / 2, (ya + yb) / 2, o)) continue;
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
 * The engraved cloud's strokes in grid rows [j0, j1): lines that follow
 * the form over each mass (the contours of the relief y + 0.7·h, curving
 * over the masses as an engraver's lines do), kept only where the light
 * falls off, a second set between them in the deepest shade; the
 * underside hatched along the base, closer near the lip; a few broken
 * marks on the shaded side's outline. The lit side keeps no outline: the
 * paper is reserved against the sky's lines. `weight` scales the pen.
 */
export function inkRows(
  cl: Cloud,
  sf: Surface,
  c: PlateCanvas,
  j0: number,
  j1: number,
  weight: number,
): void {
  shadeGrid(cl, sf);
  const s = cl.spec;
  // Breaks in long runs, never a dash per grid cell.
  const breaks = field(s.seed + 61, 34, 2);
  const span = Math.max(1, cl.top - cl.bottom);
  const soft = s.soft ?? 4;
  const spacing = Math.max(2.4, Math.min(4.5, s.height * 0.035)) / weight;
  // The relief's field, made once per band from the smoothed height.
  const { gw, gh } = sf;
  const F = new Float32Array(gw * gh);
  for (let j = Math.max(0, j0 - 1); j < Math.min(gh, j1 + 2); j++) {
    const y = (sf.py0 + j * G - sf.f) / sf.d;
    for (let i = 0; i < gw; i++) {
      const o = j * gw + i;
      F[o] = (y + 0.45 * sf.hs[o]) / spacing;
    }
  }
  const above = (x: number, y: number) => y > cl.baseAt(x) + soft * 0.3;
  const inside = (o: number) => sf.E[o] > 1.2 && sf.E[o + gw + 1] > 1.2;
  const shade = new Path2D();
  const deep = new Path2D();
  const rim = new Path2D();
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (let j = Math.max(0, j0); j < Math.min(gh, j1 + 1); j++)
    for (let i = 0; i < gw; i++) {
      const v = F[j * gw + i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  for (let lv = Math.floor(lo); lv <= Math.ceil(hi); lv++) {
    contour(sf, F, lv + 0.5, j0, j1, shade, (x, y, o) => {
      if (!inside(o) || !above(x, y)) return false;
      const hz = (y - cl.bottom) / span;
      const m = Math.hypot(sf.nx[o], sf.ny[o]) || 1;
      const lit = (sf.nx[o] * LP[0] + sf.ny[o] * LP[1]) / m;
      // The lowest part is the underside's (inkUnder): no ruled band there.
      if (y < cl.baseAt(x) + 0.16 * s.height) return false;
      const dark = 1 - sf.v[o] + 0.1 * (1 - hz) - 0.25 * Math.max(0, lit);
      return dark > 0.6 + 0.2 * breaks(x, y);
    });
    contour(sf, F, lv, j0, j1, deep, (x, y, o) => {
      if (!inside(o) || !above(x, y)) return false;
      if (y < cl.baseAt(x) + 0.16 * s.height) return false;
      const dark = 1 - sf.v[o];
      return dark > 0.82 + 0.15 * breaks(x * 1.4, y);
    });
  }
  // The outline: firmer and nearly whole on the shaded side, a fine
  // broken line over the top, none on the lit upper left.
  contour(sf, sf.E, 0.2, j0, j1, rim, (x, y, o) => {
    if (y < cl.baseAt(x) - soft) return false;
    const m = Math.hypot(sf.nx[o], sf.ny[o]) || 1;
    const face = (sf.nx[o] * LP[0] + sf.ny[o] * LP[1]) / m;
    if (face < -0.2) return breaks(x * 0.8, y * 0.8) > -0.6;
    return face < 0.5 && breaks(x * 0.6, y * 0.6) > 0.1;
  });
  strokeInk(c, shade, 0.5 * weight, 0.5);
  strokeInk(c, deep, 0.45 * weight, 0.45);
  strokeInk(c, rim, 0.5 * weight, 0.5);
}

/** The underside's hatching: strokes along the base, closer near the lip, broken. */
function inkUnder(cl: Cloud, c: PlateCanvas, weight: number): void {
  const s = cl.spec;
  if (!(s.under && s.under > 0)) return;
  const runs = field(s.seed + 81, 40, 2);
  const p = new Path2D();
  const n = Math.max(2, Math.round((s.under * s.height) / 4.5));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    // Closer toward the lip: the levels bunch up near the base.
    const tt = t * t;
    let on = false;
    for (let x = s.x0; x <= s.x1; x += 2.5) {
      const u = cl.underAt(x);
      const keep = u > 2 && runs(x, k * 13) > -0.5 + 1.1 * tt;
      const y = cl.baseAt(x) - u * tt * 0.95 - 0.6;
      if (keep) {
        if (on) p.lineTo(x, y);
        else p.moveTo(x, y);
      }
      on = keep;
    }
  }
  strokeInk(c, p, 0.45 * weight, 0.45);
}

/** The grid rows a pixel row range covers. */
function gridRows(sf: Surface, r0: number, r1: number): [number, number] {
  return [
    Math.max(0, Math.floor((r0 - sf.py0) / G)),
    Math.min(sf.gh - 1, Math.ceil((r1 - sf.py0) / G)),
  ];
}

// ------------------------------------------------------------------ jobs

/** Device px per unit at the owner's laptop, for sizing jobs. */
const K_EST = 1.48;
/** Grid points sampled per job, at most (about 3 ms). */
const SAMPLES_PER_JOB = 9000;
/** Pixels a colour job paints, at most (about 3 ms). */
const PX_PER_JOB = 18000;

/** A cloud's painting state on the plate's canvas, made by its first job and dropped by its last. */
export interface Slot {
  /** Paint bands' first rows, canvas px. */
  bands: Int32Array | null;
  forms: Forms | null;
  cloud: Cloud | null;
  surface: Surface | null;
  cols: Columns | null;
  key: string;
}

function surfaceOf(slot: Slot, spec: CloudSpec, c: PlateCanvas): Surface {
  slot.cloud ??= cloudOf(spec, slot.forms ?? undefined);
  slot.forms = null;
  const t = c.ctx.getTransform();
  const key = `${t.a},${t.d},${t.e},${t.f},${c.ctx.canvas.width}`;
  if (!slot.surface || slot.key !== key) {
    slot.surface = surfaceFor(slot.cloud, c);
    slot.cols = null;
    slot.bands = null;
    slot.key = key;
  }
  return slot.surface;
}

function colsOf(slot: Slot, sf: Surface): Columns {
  slot.cols ??= columnsOf(slot.cloud as Cloud, sf);
  return slot.cols;
}

/**
 * The jobs that paint one cloud on a plate, each a few milliseconds:
 * build its forms, sample its surface in chunks, shade it, then paint it
 * in bands (and, for the engraving, its strokes band by band). `box` is
 * the plate's box; `weight` the engraving's pen.
 */
export function cloudJobs(
  spec: CloudSpec,
  box: readonly [number, number, number, number],
  mode: "colour" | "ink",
  weight: number,
  slot: Slot = {
    bands: null,
    forms: null,
    cloud: null,
    surface: null,
    cols: null,
    key: "",
  },
): PlateJob[] {
  const w = Math.min(spec.x1, box[1]) - Math.max(spec.x0, box[0]) + 40;
  const h = spec.height * (1.5 + (spec.under ?? 0)) + 30;
  const px = w * h * K_EST * K_EST;
  const nSample = Math.max(1, Math.ceil(px / (G * G) / SAMPLES_PER_JOB));
  // One more band than the work needs: the first is a small one, so the
  // painter's first, unoptimised run is short.
  const nPaint = Math.max(1, Math.ceil(px / PX_PER_JOB)) + 1;
  const jobs: PlateJob[] = [];
  // The forms, then the packing (two jobs: the first is the costlier).
  jobs.push(() => {
    if (!slot.cloud) slot.forms ??= lobesOf(spec);
  });
  jobs.push((c) => {
    surfaceOf(slot, spec, c);
  });
  for (let k = 0; k < nSample; k++) {
    jobs.push((c) => {
      const sf = surfaceOf(slot, spec, c);
      sampleRows(
        slot.cloud as Cloud,
        sf,
        Math.ceil((sf.gh * (k + 1)) / nSample),
      );
    });
  }
  jobs.push((c) => {
    prepShade(slot.cloud as Cloud, surfaceOf(slot, spec, c));
  });
  for (let k = 0; k < nSample; k++) {
    jobs.push((c) => {
      const sf = surfaceOf(slot, spec, c);
      shadeRows(
        slot.cloud as Cloud,
        sf,
        Math.ceil((sf.gh * (k + 1)) / nSample),
      );
    });
  }
  jobs.push((c) => {
    const sf = surfaceOf(slot, spec, c);
    shadeGrid(slot.cloud as Cloud, sf);
    colsOf(slot, sf);
  });
  // Bands of equal work: rows split by how much of each the cloud covers.
  const band = (sf: Surface, b: number): [number, number] => {
    if (!slot.bands || slot.bands.length !== nPaint + 1) {
      const cl = slot.cloud as Cloud;
      const rows = sf.ry1 - sf.ry0;
      const work = new Float64Array(rows + 1);
      const under = (cl.spec.under ?? 0) > 0;
      for (let r = 0; r < rows; r++) {
        const j = Math.min(sf.gh - 1, Math.floor((r + 0.5) / G));
        let n = 8;
        for (let i = 0; i < sf.gw; i++) if (sf.E[j * sf.gw + i] > -FRINGE) n++;
        if (under) {
          const y = (sf.ry0 + r + 0.5 - sf.f) / sf.d;
          const x = (cl.spec.x0 + cl.spec.x1) / 2;
          if (y < cl.baseAt(x) + 6 && y > cl.baseAt(x) - cl.underAt(x) - 8)
            n += sf.gw * 0.7;
        }
        work[r + 1] = work[r] + n;
      }
      const out = new Int32Array(nPaint + 1);
      let r = 0;
      const share = (k: number) =>
        k === 0 ? 0 : (0.12 + (k - 1)) / (0.12 + (nPaint - 1));
      for (let k = 0; k <= nPaint; k++) {
        const goal = work[rows] * share(k);
        while (r < rows && work[r] < goal) r++;
        out[k] = sf.ry0 + r;
      }
      out[nPaint] = sf.ry1;
      slot.bands = out;
    }
    return [slot.bands[b], slot.bands[b + 1]];
  };
  for (let b = 0; b < nPaint; b++) {
    jobs.push((c) => {
      const sf = surfaceOf(slot, spec, c);
      const [r0, r1] = band(sf, b);
      paintRows(
        slot.cloud as Cloud,
        sf,
        c,
        r0,
        r1,
        mode === "ink",
        colsOf(slot, sf),
      );
    });
  }
  if (mode === "ink") {
    for (let b = 0; b < nPaint; b++) {
      jobs.push((c) => {
        const sf = surfaceOf(slot, spec, c);
        const [r0, r1] = band(sf, b);
        const [j0, j1] = gridRows(sf, r0, r1);
        inkRows(slot.cloud as Cloud, sf, c, j0, j1, weight);
      });
    }
    jobs.push((c) => {
      inkUnder(slot.cloud as Cloud, c, weight);
      // The engraving is the last to use the surface.
      slot.surface = null;
      slot.cols = null;
    });
  }
  return jobs;
}

export function newSlot(): Slot {
  return {
    bands: null,
    forms: null,
    cloud: null,
    surface: null,
    cols: null,
    key: "",
  };
}
