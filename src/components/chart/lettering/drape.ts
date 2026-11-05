import {
  GLSL_FIELD,
  GLSL_FIELD_SMOOTH,
  GLSL_GEO,
  GLSL_SURFACE,
} from "../shaders/common";

/**
 * Laying lettering and its marks on the chart: a point (world km) set on
 * the exaggerated relief, read where the terrain mesh reads it (its cells
 * are about distance / uLodK wide), and pulled a little toward the camera,
 * as the ink lines are, so it stays in front of the surface it lies on.
 */
export const DRAPE = /* glsl */ `
${GLSL_GEO}
${GLSL_FIELD}
uniform float uExag;
uniform vec3 uTexelKm;
uniform float uLodK;
uniform float uPull;
${GLSL_SURFACE}

vec3 chartDrape(vec3 p) {
  float cellKm = max(length(vec3(p.xy - cameraPosition.xy, cameraPosition.z)) / uLodK, 1e-3);
  vec4 f = sampleFieldLod(p.xy, max(vec3(0.0), log2(cellKm / uTexelKm)));
  vec3 w = vec3(p.xy, surfaceZ(p.xy, cellKm, f));
  return w + (cameraPosition - w) * uPull;
}
`;

/**
 * The ground under a fragment of lettering, for its ink: 1 on land, 0 on
 * the sea, switching at the coast within a pixel, as the inked coastline
 * is drawn (read the way the terrain reads it, smooth close up).
 * `vChartXY` is the fragment's place on the chart (world km).
 */
export const GROUND = /* glsl */ `
${GLSL_FIELD}
${GLSL_FIELD_SMOOTH}
uniform vec3 uTexelKm;
varying vec2 vChartXY;

float chartGround() {
  vec2 dx = dFdx(vChartXY);
  vec2 dy = dFdy(vChartXY);
  float px = max(length(abs(dx) + abs(dy)), 1e-6);
  vec4 f;
  vec4 fs;
  vec2 slope;
  sampleFieldBoth(vChartXY, dx, dy, 0.0, f, fs, slope);
  return smoothstep(-px, px, -f.y);
}
`;
