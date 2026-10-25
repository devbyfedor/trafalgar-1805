/**
 * The chart engine's entry point. Hosts load it with a dynamic `import()`,
 * so three.js and the engine form a chunk of their own that never enters
 * the initial bundle (docs/scene-02-brief.md, "Loading").
 */

export { type CameraKey, CameraRig } from "./camera/rig";
export { loadRivers } from "./data/loaders";
export {
  Chart,
  type ChartLayer,
  type ChartOptions,
  type ChartStats,
  type FrameInfo,
} from "./engine/Chart";
export { QUALITY_LADDER } from "./engine/quality";
export { LIGHT_STATES, type LightId } from "./light/states";
export { Rivers } from "./lines/Rivers";
export { Route, type Waypoint } from "./lines/Route";
