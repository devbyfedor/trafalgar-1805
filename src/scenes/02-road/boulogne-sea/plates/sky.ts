import { INK, PAPER, type Plate, type PlateJob } from "../paint/plate";
import { PALETTE } from "../scene";
import { buildClouds, SKY_STOPS, SKY_TOP } from "../sky";

/**
 * The sky (legacy port of session 24's: its ramp and scene 1's cloud
 * strands; to be painted anew). Its engraving: the paper, ruled across
 * as an engraver lays a sky, closer toward the top.
 */

const BOX = [-1300, 1300, -80, SKY_TOP] as const;

function colourJobs(): PlateJob[] {
  return [
    (c) => {
      const { ctx } = c;
      const g = ctx.createLinearGradient(0, SKY_TOP, 0, -80);
      for (const [y, col] of SKY_STOPS)
        g.addColorStop((SKY_TOP - y) / (SKY_TOP + 80), col);
      ctx.fillStyle = g;
      ctx.fillRect(BOX[0], BOX[2], BOX[1] - BOX[0], BOX[3] - BOX[2]);
    },
    (c) => {
      const { ctx } = c;
      ctx.translate(0, SKY_TOP);
      ctx.scale(1, -1);
      for (const cl of buildClouds()) {
        ctx.globalAlpha = cl.opacity;
        ctx.fillStyle = PALETTE.cloud.litWarm;
        ctx.fill(new Path2D(cl.art.body));
        ctx.globalAlpha = cl.opacity * 0.5;
        ctx.fillStyle = PALETTE.cloud.shadeDeep;
        ctx.fill(new Path2D(cl.art.rim));
      }
    },
  ];
}

function inkJobs(): PlateJob[] {
  return [
    (c) => {
      const { ctx } = c;
      ctx.fillStyle = PAPER.low;
      ctx.fillRect(BOX[0], BOX[2], BOX[1] - BOX[0], BOX[3] - BOX[2]);
    },
    (c) => {
      const { ctx } = c;
      ctx.strokeStyle = INK.hatch;
      ctx.lineWidth = c.pen(0.7);
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let y = 40; y < SKY_TOP; y += 2.2 + (SKY_TOP - y) * 0.012) {
        ctx.moveTo(BOX[0], y);
        ctx.lineTo(BOX[1], y);
      }
      ctx.stroke();
    },
  ];
}

export function skyPlates(): Plate[] {
  return [
    {
      id: "sky",
      depth: Number.POSITIVE_INFINITY,
      box: BOX,
      group: "sky",
      jobs: (mode) => (mode === "colour" ? colourJobs() : inkJobs()),
    },
  ];
}
