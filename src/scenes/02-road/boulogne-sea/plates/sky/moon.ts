import { createRng, rgba, softBlob } from "../../paint/kit";
import { INK, PAPER, type Plate } from "../../paint/plate";

/**
 * The full moon of 10–11 August 1805 rising in the east-south-east over
 * the town around sunset: low, in the haze, pale warm gold, a little
 * dimmed and flattened, faint maria turned as a rising moon shows them
 * from 50° north, a soft halo in the haze. The land's plates hide what
 * lies below their skyline.
 *
 * Layer units: its centre and radius. Where it stood at sunset on 10
 * August 1805 from this eye (docs/research/scene-02/boulogne-sea/
 * evening.md; decisions.md, "The evening"): x 248, 9.3° right of the
 * belfry, over the southern shoulder of Mont Lambert, its lower limb just
 * clear of the painted skyline there (the far hills' plate, y 83.5 at the
 * hold's mid drift; that plate moves under 3 px through the drift).
 * r 8.6: twice the true disc (8.7 units across), BUILD's factor, the most
 * allowed; flattened to 0.92 of its width at 2° up. Everything that needs
 * the moon (the strand's streak) reads it from here.
 */
export const MOON = { x: 248, y: 92, r: 8.6 } as const;

const PAD = 52;
const BOX = [MOON.x - PAD, MOON.x + PAD, MOON.y - PAD, MOON.y + PAD] as const;

/** The maria on a unit disc, the moon's north up: x, y, rx, ry. */
const MARIA: readonly (readonly [number, number, number, number])[] = [
  [-0.32, 0.42, 0.3, 0.24],
  [0.2, 0.42, 0.17, 0.15],
  [0.36, 0.12, 0.2, 0.18],
  [0.72, 0.3, 0.1, 0.12],
  [-0.56, -0.02, 0.28, 0.42],
  [-0.12, -0.42, 0.2, 0.16],
  [0.52, -0.18, 0.14, 0.15],
];

/** The rising moon's tilt: its north turned to the left. */
const TILT = 0.62;
const SQUASH = 0.92;

function disc(): Path2D {
  const p = new Path2D();
  p.ellipse(MOON.x, MOON.y, MOON.r, MOON.r * SQUASH, 0, 0, Math.PI * 2);
  return p;
}

export function moonPlate(): Plate {
  const { x, y, r } = MOON;
  return {
    id: "moon",
    depth: Number.POSITIVE_INFINITY,
    box: BOX,
    group: "sky",
    jobs: (mode) =>
      mode === "colour"
        ? [
            (c) => {
              const { ctx } = c;
              softBlob(c, x, y, PAD - 1, PAD - 2, "#f4e0bb", 0.24, [
                [0, 1],
                [0.2, 0.7],
                [0.45, 0.28],
                [0.75, 0.07],
                [1, 0],
              ]);
              softBlob(c, x, y, r * 2.3, r * 2.25, "#f9e9c8", 0.32);
              const d = disc();
              const g = ctx.createRadialGradient(
                x - r * 0.2,
                y + r * 0.2,
                0,
                x,
                y,
                r,
              );
              g.addColorStop(0, "#fcf1d9");
              g.addColorStop(0.7, "#f7e6c5");
              g.addColorStop(1, "#ecd5ab");
              ctx.fillStyle = g;
              ctx.globalAlpha = 0.96;
              ctx.fill(d);
              ctx.globalAlpha = 1;
              ctx.save();
              ctx.clip(d);
              ctx.translate(x, y);
              ctx.rotate(TILT);
              for (const [mx, my, rx, ry] of MARIA)
                softBlob(c, mx * r, my * r, rx * r, ry * r, "#cbb592", 0.42);
              ctx.restore();
              ctx.lineWidth = c.pen(0.9);
              ctx.strokeStyle = rgba("#fff6e2", 0.4);
              ctx.stroke(d);
            },
          ]
        : [
            (c) => {
              const { ctx } = c;
              const d = disc();
              ctx.fillStyle = PAPER.low;
              ctx.fill(d);
              ctx.lineWidth = c.pen(0.9);
              ctx.strokeStyle = rgba(INK.hatch, 0.85);
              ctx.stroke(d);
              // The maria as small patches of fine strokes, and a little
              // shading along the lower limb.
              const rng = createRng(77);
              ctx.save();
              ctx.clip(d);
              ctx.translate(x, y);
              ctx.rotate(TILT);
              ctx.beginPath();
              for (const [mx, my, rx, ry] of MARIA) {
                for (let k = -ry; k <= ry; k += 0.12) {
                  const half = rx * Math.sqrt(Math.max(0, 1 - (k / ry) ** 2));
                  if (half < 0.05 || rng() < 0.25) continue;
                  ctx.moveTo((mx - half) * r, (my + k) * r);
                  ctx.lineTo((mx + half) * r, (my + k + 0.04) * r);
                }
              }
              ctx.lineWidth = c.pen(0.45);
              ctx.strokeStyle = rgba(INK.hatch, 0.5);
              ctx.stroke();
              ctx.restore();
              ctx.beginPath();
              for (let k = 0; k < 3; k++) {
                const rr = r * (0.9 - k * 0.1);
                ctx.moveTo(
                  x + rr * Math.cos(-2.2 + k * 0.1),
                  y + rr * Math.sin(-2.2 + k * 0.1),
                );
                ctx.arc(x, y, rr, -2.2 + k * 0.1, -0.5 - k * 0.15);
              }
              ctx.lineWidth = c.pen(0.45);
              ctx.strokeStyle = rgba(INK.hatch, 0.45);
              ctx.stroke();
            },
          ],
  };
}
