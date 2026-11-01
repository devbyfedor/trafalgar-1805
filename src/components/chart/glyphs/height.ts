import { Vector2 } from "three";
import { monotoneCurve } from "@/lib/curve";
import type { FrameInfo } from "../engine/Chart";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import type { TerrainField } from "../terrain/field";

/**
 * How tall a ship glyph stands on screen, shared by the glyphs and by
 * anything drawn at a ship (her wake, lights at her masthead, smoke at her
 * side), so those stay with the glyph at every zoom.
 *
 * Size is a chart convention, not true scale: a cell's height on screen per
 * camera altitude (`GLYPH_PX`), a little larger for nearer glyphs, and no
 * taller than the open water beyond the ship (her room) seen from here.
 */

/**
 * A glyph cell's height on screen (CSS px) for the camera's altitude (km):
 * scene 1's ships on the horizon at the start, chart symbols above.
 */
export const GLYPH_PX: readonly (readonly [number, number])[] = [
  [0.05, 22],
  [9, 28],
  [120, 34],
  [1400, 21],
  [6000, 14],
];

const glyphPx = monotoneCurve(
  GLYPH_PX.map(([a, px]) => [Math.log(a), px] as const),
);

/** A glyph cell's height on screen, CSS px, for a camera altitude (km). */
export function glyphPxAt(altitudeKm: number): number {
  return glyphPx(Math.log(Math.max(altitudeKm, 0.01)));
}

/**
 * A glyph's height on screen, device px: nearer glyphs a little larger,
 * within the view's own range, and no taller than the water beyond it
 * (ShipMark.room) seen from here: the angle between the glyph's foot and
 * the chart that much farther on. How much of it shows: a glyph shrunk to
 * its room fades out before it is too small to read, and a ship of a group
 * gives way to the group's lead once her spacing (ShipMark.spacing) is
 * narrower on screen than the glyph.
 *
 * Needs the uniforms of `glyphUniforms` and the terrain field's.
 */
export const GLSL_GLYPH_HEIGHT = /* glsl */ `
${GLSL_GEO}
${GLSL_FIELD}
uniform vec3 uTexelKm;
uniform float uSizePx;
uniform float uSizeRef;
uniform float uPxPerRadian;
uniform float uDpr;
uniform float uAspect;
// A moving ship's room (a negative room): her distance from the nearest
// coast, where the chart's field is smooth over a couple of kilometres.
float coastRoom(vec2 p) {
  return max(sampleFieldLod(p, max(vec3(0.0), log2(2.0 / uTexelKm))).y, 0.0);
}
float glyphHeight(vec2 at, float dist, float size, float room) {
  float h = uSizePx * pow(clamp(uSizeRef / dist, 0.55, 1.8), 0.35) * size;
  if (room == 0.0) return h;
  if (room < 0.0) room = coastRoom(at);
  float z = max(cameraPosition.z, 1e-3);
  float d = length(at - cameraPosition.xy);
  float fit = (atan(z, d) - atan(z, d + room)) * uPxPerRadian;
  // From low over the sea the glyph stands against the sky, not the chart.
  return mix(h, min(h, fit), smoothstep(0.03, 0.08, z / dist));
}
float glyphShow(float dist, float h, float spacing) {
  float show = smoothstep(3.5, 6.5, h / uDpr);
  if (spacing > 0.0)
    show *= smoothstep(0.3, 0.5, spacing * uPxPerRadian / dist / (h * uAspect));
  return show;
}
`;

/** The uniforms GLSL_GLYPH_HEIGHT reads (besides the field's). */
export interface GlyphSizeUniforms {
  uTexelKm: { value: TerrainField["texelKm"] };
  uViewport: { value: Vector2 };
  uSizePx: { value: number };
  uSizeRef: { value: number };
  uPxPerRadian: { value: number };
  uDpr: { value: number };
  /** The glyph cell's width over its height. */
  uAspect: { value: number };
  uHazeVisibility: { value: number };
}

/** Fresh uniforms for a material that sizes things like glyphs. */
export function glyphSizeUniforms(
  field: TerrainField,
  aspect: number,
): GlyphSizeUniforms {
  return {
    uTexelKm: { value: field.texelKm },
    uViewport: { value: new Vector2(1, 1) },
    uSizePx: { value: 30 },
    uSizeRef: { value: 100 },
    uPxPerRadian: { value: 1000 },
    uDpr: { value: 1 },
    uAspect: { value: aspect },
    uHazeVisibility: { value: 100 },
  };
}

/** Feeds this frame's view to glyph-sized uniforms. */
export function updateGlyphSize(u: GlyphSizeUniforms, frame: FrameInfo): void {
  const eye = frame.eye;
  u.uViewport.value.set(frame.width, frame.height);
  u.uSizePx.value = glyphPxAt(eye.z) * frame.dpr;
  // The distance at which glyphs take their nominal size: about where the
  // camera's view of the chart is centred.
  u.uSizeRef.value = Math.hypot(
    frame.target.x - eye.x,
    frame.target.y - eye.y,
    eye.z,
  );
  u.uPxPerRadian.value = frame.pxPerRadian;
  u.uDpr.value = frame.dpr;
  u.uHazeVisibility.value = frame.hazeVisibility;
}
