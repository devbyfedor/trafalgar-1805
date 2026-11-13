import { buildFleet, type MooredCraft, placeCraft } from "../fleet";
import {
  INK,
  PAPER,
  type Plate,
  type PlateCanvas,
  type PlateJob,
} from "../paint/plate";

/**
 * The moored lines (legacy port: the chart's silhouettes of each type at
 * their true size for their distance), to be painted anew: the line
 * broadside to the viewer about 300 m ahead, the farther lines.
 */

export function drawCraft(c: PlateCanvas, m: MooredCraft, near: boolean): void {
  const { ctx } = c;
  const { x, y, scale } = placeCraft(m);
  const mid = m.art.length / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (m.bowRight ? 1 : -1), -scale);
  ctx.translate(-mid, 0);
  const hull = new Path2D(m.art.hull);
  const spars = new Path2D(m.art.spars);
  const rig = new Path2D(m.art.rigging);
  if (c.mode === "colour") {
    ctx.fillStyle = m.hull;
    ctx.fill(hull);
    ctx.fillStyle = m.spar;
    ctx.fill(spars);
    ctx.strokeStyle = m.spar;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = near ? 0.09 : 0.14;
    ctx.stroke(rig);
  } else {
    ctx.fillStyle = PAPER.low;
    ctx.fill(hull);
    ctx.strokeStyle = INK.line;
    ctx.lineWidth = c.pen(1) / scale;
    ctx.stroke(hull);
    ctx.fillStyle = INK.line;
    ctx.fill(spars);
    ctx.strokeStyle = INK.hatch;
    ctx.lineWidth = c.pen(0.7) / scale;
    ctx.stroke(rig);
  }
  ctx.restore();
}

export function fleetPlates(): Plate[] {
  return buildFleet().map((l) => ({
    id: l.id,
    depth: l.depth,
    box: [-1000, 1000, -40, 80] as const,
    group: "craft" as const,
    jobs: (): PlateJob[] =>
      l.craft.map((m) => (c: PlateCanvas) => drawCraft(c, m, l.depth < 600)),
  }));
}
