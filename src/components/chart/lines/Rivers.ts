import { Mesh } from "three";
import type { RiverData } from "../data/loaders";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { TerrainField } from "../terrain/field";
import { type Polyline, RibbonMaterial, ribbonGeometry } from "./ribbon";

/**
 * The rivers, in brown ink a step lighter than the coast's, tapering as
 * the engravers drew them
 * (docs/research/scene-02/t4-chart-style.md, section 5): a hairline at the
 * source that fades into the paper, widening with the square root of the
 * distance it has run, to about 1.6 px at the mouth for the greatest
 * (Natural Earth's scalerank 0) and 0.8 px for the least. Minor rivers fade
 * out as the camera climbs, as a chart of a larger area would leave them
 * out; the main ones run to their sources at every scale, as on the atlas
 * maps of the period. One draw call for all of them.
 */

/** Distance from the source (km) at which a river reaches its full width. */
const FULL_WIDTH_KM = 450;
/** The width at the source, as a share of the full width. */
const SOURCE_WIDTH = 0.2;

function fullWidth(rank: number): number {
  return Math.max(0.8, 1.6 - 0.08 * rank);
}

/** The highest rank shown at a camera altitude (km), log-linearly. */
const RANKS_BY_ALTITUDE = { near: [150, 10], far: [5000, 3] } as const;

export function riverRankLimit(altitudeKm: number): number {
  const [a0, r0] = RANKS_BY_ALTITUDE.near;
  const [a1, r1] = RANKS_BY_ALTITUDE.far;
  const t =
    (Math.log(altitudeKm) - Math.log(a0)) / (Math.log(a1) - Math.log(a0));
  return r0 + (r1 - r0) * Math.min(1, Math.max(0, t));
}

export class Rivers implements ChartLayer {
  readonly mesh: Mesh;
  private readonly material: RibbonMaterial;

  constructor(field: TerrainField, data: RiverData) {
    const lines: Polyline[] = [];
    for (let i = 0; i < data.ranks.length; i++) {
      const start = data.offsets[i];
      const end = data.offsets[i + 1];
      const rank = data.ranks[i];
      const full = fullWidth(rank);
      const widths = new Float32Array(end - start);
      for (let k = 0; k < widths.length; k++) {
        const run = Math.sqrt(data.flow[start + k] / FULL_WIDTH_KM);
        widths[k] = full * Math.min(1, Math.max(SOURCE_WIDTH, run));
      }
      lines.push({
        points: data.points.subarray(start * 2, end * 2),
        width: full,
        widths,
        tag: rank,
      });
    }
    this.material = new RibbonMaterial(field, { lift: true, opacity: 0.8 });
    this.mesh = new Mesh(ribbonGeometry(lines), this.material);
    this.mesh.name = "rivers";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }

  update(frame: FrameInfo): void {
    this.material.update(frame);
    this.material.tagLimit = riverRankLimit(frame.eye.z);
    // The contours' brown, a step lighter than the coast: a river never
    // reads as a border.
    this.material.color.copy(frame.light.contourInk);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
