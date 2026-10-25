import { Mesh } from "three";
import type { RiverData } from "../data/loaders";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { TerrainField } from "../terrain/field";
import { type Polyline, RibbonMaterial, ribbonGeometry } from "./ribbon";

/**
 * The rivers, in the coast's ink, thinner: Natural Earth's greatest rivers
 * (scalerank 0) at 1.35 px, the least at about 0.7 px. Minor rivers fade
 * out as the camera climbs, as a chart of a larger area would leave them
 * out. One draw call for all of them.
 */

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
      const start = data.offsets[i] * 2;
      const end = data.offsets[i + 1] * 2;
      const rank = data.ranks[i];
      lines.push({
        points: data.points.subarray(start, end),
        width: Math.max(0.7, 1.35 - 0.065 * rank),
        tag: rank,
      });
    }
    this.material = new RibbonMaterial(field, { lift: true, opacity: 0.6 });
    this.mesh = new Mesh(ribbonGeometry(lines), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }

  update(frame: FrameInfo): void {
    this.material.update(frame);
    this.material.tagLimit = riverRankLimit(frame.eye.z);
    this.material.color.copy(frame.light.ink);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
