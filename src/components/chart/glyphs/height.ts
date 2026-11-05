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
uniform vec2 uViewport;
uniform float uSizePx;
uniform float uSizeRef;
uniform float uPxPerRadian;
uniform float uDpr;
uniform float uAspect;
// A moving ship's room: her distance from the nearest coast, where the
// chart's field is smooth over a couple of kilometres.
float coastRoom(vec2 p) {
  return max(sampleFieldLod(p, max(vec3(0.0), log2(2.0 / uTexelKm))).y, 0.0);
}
// room: x, a fixed room (map km; 0 for none); y, how far the coast's
// distance has taken over from it (0..1, so a ship weighing from a bay
// passes smoothly from the one to the other); z, the least room by a coast.
float glyphHeight(vec2 at, float dist, float size, vec3 room) {
  float h = uSizePx * pow(clamp(uSizeRef / dist, 0.55, 1.8), 0.35) * size;
  if (room.x <= 0.0 && room.y <= 0.0) return h;
  float r = room.x;
  if (room.y > 0.0) {
    float coast = max(coastRoom(at), room.z);
    r = room.x > 0.0 ? mix(room.x, coast, room.y) : coast;
  }
  float z = max(cameraPosition.z, 1e-3);
  float d = length(at - cameraPosition.xy);
  float fit = (atan(z, d) - atan(z, d + r)) * uPxPerRadian;
  // From low over the sea the glyph stands against the sky, not the chart.
  return mix(h, min(h, fit), smoothstep(0.03, 0.08, z / dist));
}
// weight: how much the group rule applies (0..1): not to a ship at anchor,
// and smoothly as she weighs and joins her group under sail.
float glyphShow(float dist, float h, float spacing, float weight) {
  float show = smoothstep(3.5, 6.5, h / uDpr);
  if (spacing > 0.0)
    show *= mix(1.0, smoothstep(0.25, 0.55, spacing * uPxPerRadian / dist / (h * uAspect)), weight);
  return show;
}

// A ship's place in a squadron's formation, device px from her lead: form
// is (steps along the heading as it runs on screen, rows up the screen) in
// glyph heights. Seen end-on the steps shorten with the heading's run on
// screen, as a column seen from ahead closes up, instead of swinging round.
vec2 formationPx(vec3 w, vec4 clip, float heading, float dist, vec2 form, float h) {
  if (form.x == 0.0 && form.y == 0.0) return vec2(0.0);
  vec2 ahead = vec2(sin(heading), cos(heading)) * dist * 0.01;
  vec4 c2 = projectionMatrix * viewMatrix * vec4(w + vec3(ahead, 0.0), 1.0);
  vec2 d = (c2.xy / c2.w - clip.xy / clip.w) * 0.5 * uViewport;
  // A step of 1 % of the distance runs about 0.01 rad on screen when the
  // heading crosses the view; under a third of that, the column closes up.
  vec2 dir = d / max(length(d), 0.0035 * uPxPerRadian);
  return (dir * form.x * uAspect + vec2(0.0, form.y)) * h;
}

// Where a ship stands on the sea: her mark's place, or, in a formation, the
// sea under her place on screen. Kept at her lead's depth, a ship moved
// down the screen would sink into the sea in front of her lead; set down on
// the sea under her own foot, she stands on it at any angle.
vec3 glyphFoot(vec3 base, float heading, float dist, vec2 form, float h) {
  if (form.x == 0.0 && form.y == 0.0) return base;
  vec4 clip = projectionMatrix * viewMatrix * vec4(base, 1.0);
  vec2 ndc = clip.xy / clip.w + formationPx(base, clip, heading, dist, form, h) / (0.5 * uViewport);
  vec3 ray = vec3(
    (ndc.x + projectionMatrix[2][0]) / projectionMatrix[0][0],
    (ndc.y + projectionMatrix[2][1]) / projectionMatrix[1][1],
    -1.0
  );
  // The view's rotation is orthonormal: its transpose takes view to world.
  vec3 dir = transpose(mat3(viewMatrix)) * ray;
  // A place above the horizon (only ever in the sky at dawn): the lead's.
  if (dir.z > -1e-6) return base;
  return cameraPosition + dir * (-cameraPosition.z / dir.z);
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
