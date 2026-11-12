import { CameraRig } from "@/components/chart";
import type { TerrainField } from "@/components/chart/terrain/field";
import type { SlotChoice, SlotPlan } from "@/components/chart/terrain/slot";
import { ROAD_FLIGHT } from "@/scenes/02-road/camera";
import { LAB_FLIGHT } from "../flight";
import type { LabDemo, LabDemoContext } from "./index";

/**
 * The detail tiles and their shared layer (terrain/field.ts, slot.ts):
 * `/lab/chart?demo=detail` flies a stretch of scene 2's own camera, by
 * default from the rising shot off Cádiz (its p = 0.05) through the Gulf,
 * north over Iberia and France to Boulogne close up (p = 0.2 to 0.235),
 * then up and south over the western Mediterranean (p = 0.31), so the layer
 * passes from the Cádiz tile to the Channel tile and back as it does in the
 * scene. `?from=` and `?to=` choose another stretch of the scene's p;
 * `?eye=` and `?look=` hold the camera instead, as in the lab.
 *
 * `?tile=channel|cadiz|none` (with `&weight=`) holds the layer on a tile
 * whatever the view, to compare a place with and without its detail;
 * `?debug` adds a line with the layer, the leader and what is in sight.
 *
 * `window.__detail` (scripts/dev/detail-swap.mjs): the layer now, a hold,
 * and the layer's plan along a flight as the chart uses it.
 */

/** The stretch of scene 2's flight this demo flies by default, by its p. */
const SCENE_FROM = 0.05;
const SCENE_TO = 0.31;

/** A flight's plan as plain data (slot.ts, SlotPlan), for development. */
export interface DetailPlanDump {
  tiles: string[];
  /** Per step (p = step / last): the bound tile (−1 none) and its weight. */
  index: number[];
  weight: number[];
  /** Per tile, per step: in sight (1) or not, and its claim. */
  seen: number[][];
  claims: number[][];
  /** Per step, the tile with the greatest claim (−1 none). */
  leader: number[];
}

function numberParam(query: URLSearchParams, name: string, fallback: number) {
  const value = Number(query.get(name) ?? Number.NaN);
  return Number.isFinite(value) ? value : fallback;
}

export default async function detailDemo({
  chart,
  query,
}: LabDemoContext): Promise<LabDemo> {
  const field = chart.field;
  const tile = query.get("tile");
  if (tile !== null)
    field.hold(tile === "none" ? null : tile, numberParam(query, "weight", 1));
  const fixed = query.has("eye") && query.has("look");
  const from = numberParam(query, "from", SCENE_FROM);
  const to = numberParam(query, "to", SCENE_TO);
  const rig = new CameraRig(ROAD_FLIGHT);
  const sceneP = (p: number) => from + p * (to - from);
  const tiles = field.detailIds;
  const name = (k: number) => (k >= 0 ? tiles[k] : "none");

  const readout = query.has("debug") ? document.createElement("p") : null;
  if (readout) {
    readout.style.cssText =
      "position:fixed;left:12px;bottom:10px;z-index:60;margin:0;" +
      "font:12px/1.4 ui-monospace,monospace;color:#e8dcc4;" +
      "background:rgba(20,26,32,.7);padding:4px 8px;pointer-events:none";
    document.body.append(readout);
  }

  const rigs: Record<string, CameraRig> = {
    scene: rig,
    lab: new CameraRig(LAB_FLIGHT),
  };
  // Both flights planned now, in idle slices, as a scene does at load.
  for (const flightRig of Object.values(rigs))
    await chart.planDetail(flightRig);
  const dump = (flight = "scene"): DetailPlanDump => {
    const flightRig = rigs[flight];
    if (!flightRig) throw new Error(`no flight "${flight}"`);
    const plan = chart.detailPlan(flightRig);
    if (!plan) throw new Error("no detail tiles");
    return {
      tiles,
      index: Array.from(plan.index),
      weight: Array.from(plan.weight),
      seen: plan.seen.map((s) => Array.from(s)),
      claims: plan.claims.map((c) => Array.from(c)),
      leader: Array.from(plan.leader),
    };
  };

  window.__detail = {
    state: () => field.detail,
    hold: (id, weight) => field.hold(id, weight),
    plan: dump,
    sceneP,
    timePlan: async () => {
      const fresh = new CameraRig(ROAD_FLIGHT);
      const started = performance.now();
      await chart.planDetail(fresh);
      return performance.now() - started;
    },
  };

  const step = (plan: SlotPlan, p: number) =>
    Math.round(Math.min(1, Math.max(0, p)) * plan.last);
  const choice: SlotChoice = { index: -1, weight: 0 };
  return {
    update(_time, p) {
      if (!fixed) chart.fly(rig, sceneP(p));
      if (!readout) return;
      const d = field.detail;
      let why: string;
      if (fixed) {
        // A free camera: what this frame's view judged.
        why = tiles
          .map(
            (id) =>
              `${id} ${d.seen[id] ? "in sight" : "out of sight"} ${d.claims[id].toFixed(4)}`,
          )
          .join(", ");
      } else {
        const plan = chart.detailPlan(rig);
        if (!plan) return;
        const q = sceneP(p);
        const i = step(plan, q);
        plan.at(q, choice);
        why = `scene p ${q.toFixed(4)}; leader ${name(plan.leader[i])}; ${tiles
          .map(
            (id, k) =>
              `${id} ${plan.seen[k][i] ? "in sight" : "out of sight"} ${plan.claims[k][i].toFixed(4)}`,
          )
          .join(", ")}`;
      }
      readout.textContent = `detail ${d.tile ?? "none"} ${d.weight.toFixed(3)}${d.held ? " (held)" : ""}; ${why}`;
    },
    dispose() {
      readout?.remove();
      field.hold(undefined);
      window.__detail = undefined;
    },
  };
}

declare global {
  interface Window {
    /** The detail demo's handle, for development (scripts/dev/detail-swap.mjs). */
    __detail?: {
      state: () => TerrainField["detail"];
      hold: (id: string | null | undefined, weight?: number) => void;
      /** The chart's plan along scene 2's flight ("scene") or the lab's ("lab"). */
      plan: (flight?: string) => DetailPlanDump;
      /** The scene's p for the lab's p, on the stretch this demo flies. */
      sceneP: (p: number) => number;
      /**
       * Milliseconds to make the plan of scene 2's flight afresh, in idle
       * slices (the waits between them included).
       */
      timePlan: () => Promise<number>;
    };
  }
}
