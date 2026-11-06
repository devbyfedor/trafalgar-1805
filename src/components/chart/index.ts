/**
 * The chart engine's entry point. Hosts load it with a dynamic `import()`,
 * so three.js and the engine form a chunk of their own that never enters
 * the initial bundle (docs/scene-02-brief.md, "Loading").
 */

export { type CameraKey, CameraRig } from "./camera/rig";
export { loadRivers, loadSoundings } from "./data/loaders";
export {
  Chart,
  type ChartLayer,
  type ChartOptions,
  type ChartStats,
  type FrameInfo,
} from "./engine/Chart";
export { QUALITY_LADDER } from "./engine/quality";
export {
  buildGlyphAtlas,
  FOOT,
  type GlyphAtlas,
  type GlyphSilhouette,
} from "./glyphs/atlas";
export {
  Glyphs,
  type GlyphType,
  type ShipMark,
  type Side,
} from "./glyphs/Glyphs";
export {
  buildDigitAtlas,
  type DigitAtlas,
  SOUNDING_FONT_FILE,
} from "./lettering/digits";
export { fontUrl } from "./lettering/fonts";
export {
  type Label,
  type LabelRole,
  type LabelState,
  Lettering,
  type MarkKind,
} from "./lettering/Lettering";
export { Soundings, type SoundingsOptions } from "./lettering/Soundings";
export { LIGHT_STATES, type LightId } from "./light/states";
export { Rivers } from "./lines/Rivers";
export { Route, type RoutePoint, type Waypoint } from "./lines/Route";
