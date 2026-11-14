import { createRng, field, mix, rgba, softBlob, wobble } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";

/**
 * The evening sky's ground, looking east with the sun 7° up behind the
 * eye and 8° to the left (18:33, history-notes): the anti-solar sky. Over the land a
 * warm hazy band, pale gold going rose; above it lavender, then a clear
 * blue deepening upward to a deep evening blue at the top left, where the
 * chapter title sits on it with no scrim (luminance at most 0.13 over
 * x -930..-250, y 330..470). The sky a little lighter toward the lower
 * right, round the anti-solar point (8° right of the axis, 7° under the
 * horizon); thin veils of haze low over the land. No sun and no glitter
 * in front: they are behind the eye.
 *
 * Its engraving: the paper ground of the whole engraving, and the sky's
 * long tapered lines, closest at the top, opening downward (sky-hatch).
 */

/**
 * The sky's box, layer units: the widest frame, and low enough for the
 * dive, when the land moves down past the horizon (a plate at depth d
 * shows 54000 / d units lower at the transition's start).
 */
export const SKY_BOX = [-892, 892, -95, 448] as const;

/** The ground's colour by height above the horizon (layer units). */
const RAMP: readonly (readonly [number, string])[] = [
  [-95, "#e7cfae"],
  [0, "#eed6b1"],
  [16, "#ecd0ae"],
  [40, "#e3c4b0"],
  [75, "#d1b6b5"],
  [120, "#b6a8b9"],
  [175, "#958fae"],
  [235, "#717f9f"],
  [295, "#556b91"],
  [350, "#465d82"],
  [448, "#384e71"],
];

/** The sky's colour at a height (layer units), for what stands in it (the clouds' haze). */
export function skyAt(y: number): string {
  if (y <= RAMP[0][0]) return RAMP[0][1];
  for (let i = 1; i < RAMP.length; i++) {
    const [ya, ca] = RAMP[i - 1];
    const [yb, cb] = RAMP[i];
    if (y <= yb) return mix(ca, cb, (y - ya) / (yb - ya));
  }
  return RAMP[RAMP.length - 1][1];
}

function fillBox(c: PlateCanvas, style: string | CanvasGradient): void {
  const [x0, x1, y0, y1] = SKY_BOX;
  c.ctx.fillStyle = style;
  c.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

export function groundColourJobs(): PlateJob[] {
  const [, , y0, y1] = SKY_BOX;
  return [
    // The ramp, horizon to the top.
    (c) => {
      const g = c.ctx.createLinearGradient(0, y1, 0, y0);
      for (const [y, col] of RAMP) g.addColorStop((y1 - y) / (y1 - y0), col);
      fillBox(c, g);
    },
    // Lighter round the anti-solar point (8° right of the axis, 7° under
    // the horizon at 18:33); a touch warmer and greyer behind the cumulus
    // bank; deeper toward the top left (and under the title).
    (c) => {
      softBlob(c, 140, -120, 1150, 560, "#f2dcc0", 0.22, [
        [0, 1],
        [0.5, 0.45],
        [1, 0],
      ]);
      softBlob(c, 600, 280, 420, 150, "#b9a3a6", 0.1, [
        [0, 1],
        [0.6, 0.5],
        [1, 0],
      ]);
      const g = c.ctx.createLinearGradient(-900, 470, -60, 170);
      g.addColorStop(0, rgba("#1f2c45", 0.3));
      g.addColorStop(0.55, rgba("#26344f", 0.12));
      g.addColorStop(1, rgba("#26344f", 0));
      fillBox(c, g);
    },
    // The warm haze low over the land: pale gold at the land, a faint rose
    // band above it, both uneven along the horizon.
    (c) => {
      const g = c.ctx.createLinearGradient(0, 120, 0, -20);
      g.addColorStop(0, rgba("#e9b9a8", 0));
      g.addColorStop(0.35, rgba("#e8bba9", 0.13));
      g.addColorStop(0.62, rgba("#f0cfac", 0.18));
      g.addColorStop(0.86, rgba("#f4dbb2", 0.3));
      g.addColorStop(1, rgba("#f4dbb2", 0.2));
      fillBox(c, g);
      // Thin long veils of haze low over the land, their upper edges
      // uneven.
      const vr = createRng(4411);
      for (const [x0, x1, y0, h, a] of [
        [-892, 380, 22, 16, 0.16],
        [-300, 892, 44, 12, 0.12],
        [120, 760, 62, 8, 0.1],
      ] as const) {
        const top = wobble(4420 + x0, [
          [170, h * 0.35],
          [61, h * 0.18],
          [23, h * 0.08],
        ]);
        const p = new Path2D();
        const n = Math.ceil((x1 - x0) / 6);
        p.moveTo(x0, y0 - h);
        for (let i = 0; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          const t = i / n;
          const taper = Math.sin(Math.PI * t) ** 0.4;
          p.lineTo(x, y0 + (h * 0.6 + top(x)) * taper);
        }
        p.lineTo(x1, y0 - h);
        p.closePath();
        const g = c.ctx.createLinearGradient(0, y0 + h, 0, y0 - h);
        g.addColorStop(0, rgba("#f3d6b9", 0));
        g.addColorStop(0.45, rgba("#f3d6b9", a * (0.6 + 0.4 * vr())));
        g.addColorStop(1, rgba("#f0cdb4", a));
        c.ctx.fillStyle = g;
        c.ctx.fill(p);
      }
      // The painted sky's slow unevenness: a few very large, very faint
      // washes, warmer low and in the middle, cooler high to the right;
      // none lightening the title's corner.
      for (const [x, y, rx, ry, col, al] of [
        [-120, 230, 520, 120, "#c9b2b8", 0.05],
        [420, 160, 460, 110, "#d7bfb6", 0.05],
        [520, 400, 560, 140, "#33496c", 0.06],
        [-40, 380, 420, 90, "#4a5f86", 0.04],
        [-620, 250, 300, 90, "#a596aa", 0.04],
      ] as const)
        softBlob(c, x, y, rx, ry, col, al, [
          [0, 1],
          [0.55, 0.55],
          [1, 0],
        ]);
      const rng = createRng(4401);
      for (let i = 0; i < 14; i++) {
        const x = -900 + (i + rng()) * (1800 / 14);
        softBlob(
          c,
          x,
          8 + rng() * 26,
          120 + rng() * 160,
          10 + rng() * 14,
          rng() < 0.5 ? "#f6dcb4" : "#efcdb0",
          0.16 + rng() * 0.12,
        );
      }
    },
  ];
}

export function groundInkJobs(): PlateJob[] {
  return [(c) => fillBox(c, PAPER.low)];
}

/**
 * The engraved sky's lines, ink only: the whole sky down to the haze over
 * the land, where it thins out to bare paper.
 */
export const HATCH_BOX = [-892, 892, 40, 448] as const;

/** The spacing of the sky's lines at a height: closest at the top, opening downward. */
function spacingAt(y: number): number {
  const t = Math.min(1, Math.max(0, (y - 40) / 400));
  return 17 - 10.5 * t ** 0.7;
}

/**
 * The engraver's sky: long, fine horizontal lines, each tapered at both
 * ends (a thin filled sliver, not a stroke of one weight), closest at the
 * top and opening downward, broken at long irregular intervals; lower
 * down only a light, wide-spaced tint, enough that the clouds' lit edges
 * read as reserved paper (the cloud plates lay paper over these lines).
 * Rows between `from` and `to` (layer units).
 */
function hatchRows(c: PlateCanvas, seed: number, from: number, to: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const patch = field(seed + 7, 420, 2);
  const wave = field(seed + 9, 900, 2);
  const [x0, x1] = HATCH_BOX;
  const w = c.pen(0.6);
  ctx.fillStyle = rgba(INK.hatch, 0.42);
  ctx.beginPath();
  let y = from;
  while (y < to) {
    const t = Math.min(1, Math.max(0, (y - 40) / 400));
    y += spacingAt(y) * (0.82 + 0.36 * rng());
    let x = x0 - rng() * 200;
    while (x < x1) {
      // Long lines low in the sky's tint, longer still high up.
      const len = 90 + rng() * (180 + 520 * t);
      const gap = 10 + rng() * (60 + 160 * (1 - t));
      // Kept everywhere at the top; patchy lower down, where the tint
      // thins out toward the horizon.
      const keep = 0.2 + 0.7 * t + 0.3 * patch(x + len / 2, y);
      if (rng() < keep) {
        const n = Math.max(6, Math.round(len / 14));
        const yy = y + (rng() - 0.5) * 0.8;
        const th = w * (0.55 + 0.45 * t) * (0.8 + 0.4 * rng());
        const at = (k: number): [number, number, number] => {
          const u = k / n;
          const px = x + len * u;
          const py = yy + 2.2 * wave(px, y);
          return [px, py, th * Math.sin(Math.PI * u) ** 0.7];
        };
        let [px, py, h] = at(0);
        ctx.moveTo(px, py);
        for (let k = 1; k <= n; k++) {
          [px, py, h] = at(k);
          ctx.lineTo(px, py + h * 0.5);
        }
        for (let k = n; k >= 0; k--) {
          [px, py, h] = at(k);
          ctx.lineTo(px, py - h * 0.5);
        }
        ctx.closePath();
      }
      x += len + gap;
    }
  }
  ctx.fill();
}

export function hatchInkJobs(): PlateJob[] {
  const [, , yb, yt] = HATCH_BOX;
  const parts = 4;
  const jobs: PlateJob[] = [];
  for (let i = 0; i < parts; i++) {
    const a = yb + ((yt - yb) * i) / parts;
    const b = yb + ((yt - yb) * (i + 1)) / parts;
    jobs.push((c) => hatchRows(c, 4500 + i, a, b));
  }
  return jobs;
}
