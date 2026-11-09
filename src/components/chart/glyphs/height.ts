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
  [1400, 25],
  [6000, 20],
];

const glyphPx = monotoneCurve(
  GLYPH_PX.map(([a, px]) => [Math.log(a), px] as const),
);

/** A glyph cell's height on screen, CSS px, for a camera altitude (km). */
export function glyphPxAt(altitudeKm: number): number {
  return glyphPx(Math.log(Math.max(altitudeKm, 0.01)));
}

/**
 * A glyph's nominal height on screen, CSS px: the altitude's size, larger
 * for glyphs nearer than where the camera looks (sizeRef, km) and smaller
 * for those beyond. Seen from high up a fleet keeps nearly one size (the
 * difference to the power 0.35); seen at a grazing angle (the camera's
 * height under 0.3 of the distance) the ones beyond shrink with distance
 * as true perspective has them, as scene 1's ships on the horizon do,
 * while nearer ones keep their size (capped above as before). Shared by
 * the glyph layout and scene 1's hand-off (the director).
 */
export function glyphNominalPx(
  altitudeKm: number,
  dist: number,
  sizeRef: number,
): number {
  const t = Math.min(
    1,
    Math.max(0, (altitudeKm / Math.max(dist, 1e-6) - 0.12) / 0.18),
  );
  const steep = t * t * (3 - 2 * t);
  const lo = 0.3 + 0.25 * steep;
  const k = Math.min(1.8, Math.max(lo, sizeRef / Math.max(dist, 1e-6)));
  const power = k >= 1 ? 0.35 : 1 - 0.65 * steep;
  return glyphPxAt(altitudeKm) * k ** power;
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
/**
 * A moving ship's room: her distance from the nearest coast (km), where the
 * chart's field is smooth over a couple of kilometres. Needs GLSL_GEO,
 * GLSL_FIELD and the uniform uTexelKm. Shared by the glyphs and by
 * readCoastKm (coast.ts), so a room read ahead of time is the one drawn.
 */
export const GLSL_COAST_ROOM = /* glsl */ `
float coastRoom(vec2 p) {
  return max(sampleFieldLod(p, max(vec3(0.0), log2(2.0 / uTexelKm))).y, 0.0);
}
`;

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
// The least share of its height a glyph keeps however little room it has
// (0: none; a squadron's symbol keeps more, so it never vanishes at sea).
uniform float uRoomFloor;
${GLSL_COAST_ROOM}
// room: x, a fixed room (map km; 0 for none); y, how far the coast's
// distance has taken over from it (0..1, so a ship weighing from a bay
// passes smoothly from the one to the other); z, the least room by a coast.
// parts, for the probe: the room (km), the height it allows, the camera's
// height over the glyph's distance, and the height before the room.
float glyphHeightParts(vec2 at, float dist, float size, vec3 room, out vec4 parts) {
  float h = uSizePx * pow(clamp(uSizeRef / dist, 0.55, 1.8), 0.35) * size;
  parts = vec4(0.0, h, 0.0, h);
  if (room.x <= 0.0 && room.y <= 0.0) return h;
  float r = room.x;
  if (room.y > 0.0) {
    float coast = max(coastRoom(at), room.z);
    r = room.x > 0.0 ? mix(room.x, coast, room.y) : coast;
  }
  float z = max(cameraPosition.z, 1e-3);
  float d = length(at - cameraPosition.xy);
  float fit = (atan(z, d) - atan(z, d + r)) * uPxPerRadian;
  parts = vec4(r, fit, z / dist, h);
  // From low over the sea the glyph stands against the sky, not the chart.
  return mix(h, min(h, max(fit, uRoomFloor * h)), smoothstep(0.03, 0.08, z / dist));
}
float glyphHeight(vec2 at, float dist, float size, vec3 room) {
  vec4 parts;
  return glyphHeightParts(at, dist, size, room, parts);
}
// A ship at anchor draws no wider than her berth: her glyph no more than a
// little wider than the gap to her nearest neighbour at anchor on screen
// (berth, map km), down to half her size; closer than that, a crowded
// anchorage stands as a forest of masts. underWay is how far she is under
// way (the coast's takeover of her room, iFit.y), so the rule eases off as
// she weighs.
float glyphBerth(float h, float dist, float underWay, float berth) {
  float anchored = 1.0 - underWay;
  if (berth <= 0.0 || anchored <= 0.0) return h;
  float gap = berth * uPxPerRadian / dist;
  float cap = max(1.35 * gap / uAspect, 0.5 * h);
  return mix(h, min(h, cap), anchored);
}
// weight: how much the group rule applies (0..1): not to a ship at anchor,
// and smoothly as she weighs and joins her group under sail.
float glyphShow(float dist, float h, float spacing, float weight) {
  float show = smoothstep(3.5, 6.5, h / uDpr);
  if (spacing > 0.0)
    show *= mix(1.0, smoothstep(0.25, 0.55, spacing * uPxPerRadian / dist / (h * uAspect)), weight);
  return show;
}

// A ship's place in a squadron's block, device px from her lead: form is
// (steps astern, in glyph widths; rows up the screen, in glyph heights).
// The block is drawn as a chart draws a fleet: rows across the screen, the
// ships of each one astern of the other on the side away from the bows,
// whatever the heading, so every ship shows and the count reads at any
// zoom. Seen end-on the steps close up with the glyphs' width, and as the
// heading turns through end-on the rows fold through the lead (with the
// mirror's crossfade) instead of swinging across.
vec2 formationPx(float heading, vec2 form, float h) {
  if (form.x == 0.0 && form.y == 0.0) return vec2(0.0);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  float facing = dot(vec2(sin(heading), cos(heading)), normalize(right.xy + 1e-6));
  float side = clamp(facing / 0.14, -1.0, 1.0);
  float width = mix(0.3, 1.0, abs(facing));
  return vec2(form.x * uAspect * width * side, form.y) * h;
}

// Where a ship stands on the sea: her mark's place, or, in a formation, the
// sea under her place on screen. Kept at her lead's depth, a ship moved
// down the screen would sink into the sea in front of her lead; set down on
// the sea under her own foot, she stands on it at any angle.
vec3 glyphFoot(vec3 base, float heading, float dist, vec2 form, float h) {
  if (form.x == 0.0 && form.y == 0.0) return base;
  vec4 clip = projectionMatrix * viewMatrix * vec4(base, 1.0);
  vec2 ndc = clip.xy / clip.w + formationPx(heading, form, h) / (0.5 * uViewport);
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
  /** The least share of its height a glyph keeps for want of room. */
  uRoomFloor: { value: number };
  uHazeVisibility: { value: number };
}

/** Fresh uniforms for a material that sizes things like glyphs. */
export function glyphSizeUniforms(
  field: TerrainField,
  aspect: number,
  roomFloor = 0,
): GlyphSizeUniforms {
  return {
    uTexelKm: { value: field.texelKm },
    uViewport: { value: new Vector2(1, 1) },
    uSizePx: { value: 30 },
    uSizeRef: { value: 100 },
    uPxPerRadian: { value: 1000 },
    uDpr: { value: 1 },
    uAspect: { value: aspect },
    uRoomFloor: { value: roomFloor },
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
