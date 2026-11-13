import { buildFlag, type FlagShape } from "../../geometry/flags";
import { path } from "../../geometry/path";
import type { Vec } from "../../geometry/vec";
import type { CraftSpec } from "../types";
import { buildFittingsArt, type FittingsArt } from "./fittings";
import { buildHullArt, type HullArt } from "./hull";
import { buildPennant, type PennantShape } from "./pennant";
import { buildRigArt, type RigArt } from "./rig";
import { buildRiggingArt, type RiggingArt } from "./rigging";

/**
 * A craft's whole drawing, built once per spec and cached (as buildShip's
 * ships are): the hull, the rig and its canvas, the rigging, the fittings,
 * the flags' places and two wave frames of each, the reflection's shapes,
 * and the box it all sits in.
 */

export interface CraftFlag {
  kind: "ensign" | "pennant";
  /** The hoist's top, in metres. */
  anchor: Vec;
  /** Streams aft: drawn mirrored, its fly to the left of the anchor. */
  fly: number;
  hoist: number;
  /** Two wave frames, for crossfading (flag space: hoist top at 0,0, x to the fly, y down). */
  frames: (FlagShape | PennantShape)[];
  /** The frames' box height. */
  height: number;
}

export interface CraftBox {
  /** SVG viewBox, metres, y down. */
  viewBox: { x: number; y: number; width: number; height: number };
  /** The waterline (y = 0) at the hull's mid-length, as shares of the box from its top left. */
  pivot: { x: number; y: number };
  /** The hull's mid-length, x in metres. */
  midX: number;
}

export interface CraftArt extends CraftBox {
  spec: CraftSpec;
  hull: HullArt;
  rig: RigArt;
  rigging: RiggingArt;
  fittings: FittingsArt;
  flags: CraftFlag[];
  reflection: {
    hull: string;
    /** Masts, yards, spars, the boat. */
    spars: string;
    /** The furled canvas. */
    canvas: string;
    flags: string;
  };
}

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** Bounds of path data written with absolute commands (metres, y down). */
function bounds(paths: readonly string[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const d of paths) {
    const v = d.match(NUM) ?? [];
    for (let i = 0; i + 1 < v.length; i += 2) {
      const x = Number(v[i]);
      const y = Number(v[i + 1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Flag-space path data (M/L/Z, y down from the hoist) placed in the drawing, mirrored to stream aft. */
function placeFlag(d: string, anchor: Vec): string {
  return d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, u: string, v: string) => {
    const x = anchor[0] - Number(u);
    const y = -anchor[1] + Number(v);
    return `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
  });
}

const cache = new Map<string, CraftArt>();

export function buildCraftArt(spec: CraftSpec): CraftArt {
  const key = `${spec.id}:${spec.seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const hull = buildHullArt(spec);
  const rig = buildRigArt(spec);
  const rigging = buildRiggingArt(spec, rig.layout);
  const fittings = buildFittingsArt(spec, hull.farRise);

  const flags: CraftFlag[] = [];
  const e = spec.ensign;
  const ensignFrames = [0, Math.PI].map((phase) =>
    buildFlag("french-ensign", e.fly, e.hoist, {
      amplitude: 0.075,
      waves: 1.2,
      phase,
      droop: 0.24,
    }),
  );
  flags.push({
    kind: "ensign",
    anchor: rig.layout.ensign.anchor,
    fly: e.fly,
    hoist: e.hoist,
    frames: ensignFrames,
    height: ensignFrames[0].height + e.hoist * 0.2,
  });
  if (spec.pennant && rig.layout.pennant) {
    const p = spec.pennant;
    const frames = [0, Math.PI].map((phase) =>
      buildPennant(p.length, p.hoist, {
        amplitude: 0.5,
        waves: 1.6,
        phase,
        droop: 0.1,
      }),
    );
    flags.push({
      kind: "pennant",
      anchor: rig.layout.pennant.anchor,
      fly: p.length,
      hoist: p.hoist,
      frames,
      height: frames[0].height + p.hoist,
    });
  }

  // The box: everything drawn, the flags' boxes, a margin; down to the
  // depth shown below the waterline.
  const parts = [
    hull.outline,
    hull.rudder,
    hull.tiller,
    rig.masts,
    rig.heads,
    rig.yards,
    rig.spars,
    rig.darkSpars,
    rig.canvas,
    rig.lugCanvas,
    rigging.heavy,
    rigging.light,
    rigging.shrouds,
    rigging.running,
    rigging.anchor,
    fittings.guns,
    fittings.oars,
    fittings.chimney,
    fittings.boat?.hull ?? "",
    fittings.boat?.painter ?? "",
  ];
  const b = bounds(parts);
  let minX = Math.min(b.minX, rigging.cableEntry[0]);
  let maxX = Math.max(b.maxX, rigging.cableEntry[0] + 0.3);
  let top = -b.minY;
  for (const f of flags) {
    minX = Math.min(minX, f.anchor[0] - f.fly);
    maxX = Math.max(maxX, f.anchor[0] + 0.1);
    top = Math.max(top, f.anchor[1] + f.hoist * 0.3);
  }
  const margin = 0.6;
  const depth = spec.hull.depthShown;
  const x = Math.floor((minX - margin) * 10) / 10;
  const y = -Math.ceil((top + margin + 0.2) * 10) / 10;
  const width = Math.ceil((maxX + margin - x) * 10) / 10;
  const height = Math.round((depth - y) * 100) / 100;
  const viewBox = { x, y, width, height };
  const midX = spec.hull.length / 2;
  const pivot = { x: (midX - x) / width, y: -y / height };

  // The reflection: the drawing above the water as plain shapes.
  const flagShapes = path();
  for (const f of flags) {
    flagShapes.appendData(placeFlag(f.frames[0].outline, f.anchor));
  }
  const reflection = {
    hull: [hull.aboveWater, hull.rudder, fittings.boat?.hull ?? ""].join(""),
    spars: [
      rig.masts,
      rig.heads,
      rig.yards,
      rig.spars,
      rig.darkSpars,
      rig.lugYards,
      fittings.chimney,
    ].join(""),
    canvas: [rig.canvas, rig.lugCanvas].join(""),
    flags: flagShapes.toString(),
  };

  const art: CraftArt = {
    spec,
    hull,
    rig,
    rigging,
    fittings,
    flags,
    reflection,
    viewBox,
    pivot,
    midX,
  };
  cache.set(key, art);
  return art;
}

/** Where a craft's box sits: for laying it out and pivoting it without rendering. */
export function craftBox(spec: CraftSpec): CraftBox {
  const { viewBox, pivot, midX } = buildCraftArt(spec);
  return { viewBox, pivot, midX };
}
