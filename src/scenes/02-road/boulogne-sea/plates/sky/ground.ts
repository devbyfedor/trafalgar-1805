import { createRng, field, mix, rgba, softBlob } from "../../paint/kit";
import { INK, PAPER, type PlateCanvas, type PlateJob } from "../../paint/plate";

/**
 * The evening sky's ground, looking east with the sun about 5° up behind
 * the eye and a little to the left: the anti-solar sky. Over the land a
 * warm hazy band, pale gold going rose; above it lavender, then a clear
 * blue deepening upward to a deep evening blue at the top left, where the
 * chapter title sits on it with no scrim (luminance at most 0.13 over
 * x -930..-250, y 330..470). The sky a little lighter toward the lower
 * right, round the anti-solar point (16° right of the axis, 5° under the
 * horizon). No sun and no glitter in front: they are behind the eye.
 *
 * Its engraving: the paper ground of the whole engraving, with only a few
 * fine broken strokes toward the top (sky-hatch).
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
    // Lighter round the anti-solar point, lower right; deeper toward the
    // top left (and under the title).
    (c) => {
      softBlob(c, 300, -40, 1150, 520, "#f2dcc0", 0.2, [
        [0, 1],
        [0.5, 0.45],
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

/** The engraved sky's strokes: the top of the sky only, ink only. */
export const HATCH_BOX = [-892, 892, 226, 448] as const;

/**
 * A few fine broken strokes, sparse low down and a little closer toward
 * the top, each slightly bowed, their rows unevenly spaced and patchy, so
 * the sky stays open paper and never reads as ruling.
 */
function hatchRows(c: PlateCanvas, seed: number, from: number, to: number) {
  const { ctx } = c;
  const rng = createRng(seed);
  const patch = field(seed + 7, 300, 3);
  const [x0, x1, yb, yt] = HATCH_BOX;
  ctx.lineCap = "round";
  ctx.lineWidth = c.pen(0.55);
  ctx.strokeStyle = rgba(INK.hatch, 0.4);
  ctx.beginPath();
  let y = from;
  while (y < to) {
    const t = Math.min(1, Math.max(0, (y - yb) / (yt - yb)));
    y += (8.5 - 4.5 * t) * (0.65 + rng() * 0.7);
    let x = x0 - rng() * 60;
    while (x < x1) {
      const len = 10 + rng() * (26 + 60 * t);
      const gap = 6 + rng() * (70 - 46 * t);
      const keep = 0.04 + 0.5 * t ** 1.5 + 0.28 * patch(x, y);
      if (rng() < keep) {
        const yy = y + (rng() - 0.5) * 1.4;
        ctx.moveTo(x, yy);
        ctx.quadraticCurveTo(
          x + len * (0.4 + rng() * 0.2),
          yy + (rng() - 0.5) * 1.2,
          x + len,
          yy + (rng() - 0.5) * 0.8,
        );
      }
      x += len + gap;
    }
  }
  ctx.stroke();
}

export function hatchInkJobs(): PlateJob[] {
  const [, , yb, yt] = HATCH_BOX;
  const parts = 3;
  const jobs: PlateJob[] = [];
  for (let i = 0; i < parts; i++) {
    const a = yb + ((yt - yb) * i) / parts;
    const b = yb + ((yt - yb) * (i + 1)) / parts;
    jobs.push((c) => hatchRows(c, 4500 + i, a, b));
  }
  return jobs;
}
