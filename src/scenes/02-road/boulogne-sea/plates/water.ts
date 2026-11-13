import { INK, PAPER, type Plate } from "../paint/plate";
import { EYE_H, PALETTE } from "../scene";
import { buildWater, type WaterStrip } from "../water";

/**
 * The water's backdrop: the sea from the horizon down to the bottom of
 * the frame and well below it (the camera comes down from 60 m in the
 * dive, when near water stands far below the frame), behind the swell's
 * strips (water.ts) and everything on the water. Legacy port: to be
 * painted anew with the strand, the reflections and the swell.
 */
const BOX = [-1300, 1300, -2600, -EYE_H + 6] as const;

export function waterPlates(): Plate[] {
  return [
    {
      id: "water-deep",
      depth: 900,
      box: BOX,
      group: "water",
      jobs: (mode) =>
        mode === "colour"
          ? [
              (c) => {
                const { ctx } = c;
                const g = ctx.createLinearGradient(0, BOX[3], 0, -900);
                g.addColorStop(0, PALETTE.sea.farBody);
                g.addColorStop(0.06, PALETTE.sea.midBody);
                g.addColorStop(0.4, PALETTE.sea.nearBody);
                g.addColorStop(1, PALETTE.sea.nearInner);
                ctx.fillStyle = g;
                ctx.fillRect(BOX[0], BOX[2], BOX[1] - BOX[0], BOX[3] - BOX[2]);
              },
            ]
          : [
              (c) => {
                const { ctx } = c;
                ctx.fillStyle = PAPER.low;
                ctx.fillRect(BOX[0], BOX[2], BOX[1] - BOX[0], BOX[3] - BOX[2]);
                ctx.strokeStyle = INK.hatch;
                ctx.lineWidth = c.pen(0.8);
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                for (
                  let y = BOX[3] - 2;
                  y > BOX[2];
                  y -= 1.5 + (BOX[3] - y) * 0.05
                ) {
                  ctx.moveTo(BOX[0], y);
                  ctx.lineTo(BOX[1], y);
                }
                ctx.stroke();
              },
            ],
    },
  ];
}

/**
 * Session 24's SVG strips of swell (../water.ts), drawn by the painting
 * between the plates until the water's own plates (with `swell`) replace
 * them: then this returns none.
 */
export function legacyStrips(): WaterStrip[] {
  return buildWater();
}
