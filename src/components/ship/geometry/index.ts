import type { Detail, FlagSpec, ShipSpec } from "../types";
import { buildHull, DEPTH_SHOWN, type HullGeometry } from "./hull";
import { buildRig, type RigLayout } from "./rig";
import { buildRigging, type RiggingGeometry } from "./rigging";
import { buildSails, type SailsGeometry } from "./sails";
import type { Vec } from "./vec";

/**
 * Turns a ShipSpec into everything the component renders. Pure and
 * deterministic: the same spec always yields the same strings, so server
 * and client renders match.
 */

export interface FlagAnchor {
  spec: FlagSpec;
  /** Top of the hoist, where the flag is bent on (ship space). */
  anchor: Vec;
}

export interface ShipGeometry {
  /** SVG viewBox in metres, y down. */
  viewBox: { x: number; y: number; width: number; height: number };
  hull: HullGeometry;
  rig: RigLayout;
  sails: SailsGeometry;
  rigging: RiggingGeometry;
  silhouette: { hull: string; spars: string; sails: string; rigging: string };
  flags: FlagAnchor[];
  bowWave: { anchor: Vec; length: number };
  /** Height of the tallest truck above the waterline. */
  truckHeight: number;
}

const cache = new Map<string, ShipGeometry>();

export function buildShip(
  spec: ShipSpec,
  _detail: Detail = "hero",
): ShipGeometry {
  const key = `${spec.id}:${spec.seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const hull = buildHull(spec);
  const rig = buildRig(spec);
  const sails = buildSails(spec, rig, hull);
  const rigging = buildRigging(spec, rig, hull, sails);

  const flags: FlagAnchor[] = spec.flags.map((f) => {
    if (f.at.kind === "gaffPeak") return { spec: f, anchor: rig.gaff.peak };
    const m = rig.masts.get(f.at.mast);
    const anchor: Vec = m ? m.topgallantAt(m.spec.truckY - 0.35) : [0, 0];
    return { spec: f, anchor };
  });

  const truckHeight = Math.max(...spec.rig.masts.map((m) => m.truckY));
  const flagReach = Math.max(0, ...spec.flags.map((f) => f.fly));
  const foremostX = Math.max(
    rig.flyingJibBoom?.end[0] ?? rig.jibBoom.end[0],
    rig.jibBoom.end[0],
    hull.bounds.maxX,
  );
  const minX =
    Math.min(rig.boom.end[0], rig.gaff.peak[0], hull.bounds.minX) - 1.2;
  const maxX = foremostX + 1.2 + flagReach * 0.15;
  const maxY = truckHeight + 1.5;
  const minY = -DEPTH_SHOWN;
  const viewBox = {
    x: Math.floor(minX),
    y: Math.floor(-maxY),
    width: Math.ceil(maxX - Math.floor(minX)),
    height: Math.ceil(maxY - minY),
  };

  const silhouette = {
    hull: [
      hull.outline,
      hull.head.knee,
      hull.head.figure,
      hull.gallery.ground,
      hull.rudder,
      hull.catheads,
    ].join(""),
    spars: [rig.lowerMasts, rig.spars, rig.sparsDark, rig.yards, rig.tops].join(
      "",
    ),
    sails: [...sails.square, ...sails.foreAndAft]
      .map((s) => s.outline)
      .join(""),
    rigging: [
      rigging.shrouds,
      rigging.stays,
      rigging.light,
      rigging.ratlines,
      rigging.running,
    ].join(""),
  };

  const geometry: ShipGeometry = {
    viewBox,
    hull,
    rig,
    sails,
    rigging,
    silhouette,
    flags,
    bowWave: { anchor: hull.stemAtWaterline, length: 7 },
    truckHeight,
  };
  cache.set(key, geometry);
  return geometry;
}
