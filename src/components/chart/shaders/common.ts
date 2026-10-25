/**
 * GLSL shared by the chart's materials (GLSL ES 3.00, three's GLSL3 mode).
 *
 * World space: Mercator km, x east, y north, z up (src/components/chart/geo
 * /mercator.ts). Colours are sRGB values written straight to the canvas:
 * the chart matches scene 1's CSS palette exactly, and no material includes
 * three's colour-space conversion.
 */

export const GLSL_GEO = /* glsl */ `
#define EARTH_R 6378.137
// Mercator y of the world origin, km.
uniform float uOriginMercY;
// The local Mercator scale (sec φ) at a world y: sec(gd(y / R)) = cosh(y / R).
float secLat(float worldY) {
  return cosh((worldY + uOriginMercY) / EARTH_R);
}
`;

/**
 * The terrain field: the overview tile everywhere (open sea beyond it),
 * the detail tile where it exists, blended across a band at its edges.
 * Each field texel holds (height m, coast distance km, slope east, slope
 * north), the slopes as rise over ground run of the land surface.
 */
export const GLSL_FIELD = /* glsl */ `
uniform sampler2D uFieldA;
uniform vec4 uRectA;
uniform sampler2D uFieldB;
uniform vec4 uRectB;
uniform float uFadeB;
uniform float uHasB;
uniform sampler2D uHorizonA;
uniform sampler2D uHorizonB;

vec2 tileUv(vec2 p, vec4 rect) {
  return vec2((p.x - rect.x) / rect.z, (rect.y - p.y) / rect.w);
}

// Distance inside a tile from its nearest edge, km (negative outside).
float insideKm(vec2 uv, vec4 rect) {
  vec2 e = min(uv, 1.0 - uv) * rect.zw;
  return min(e.x, e.y);
}

const vec4 OPEN_SEA = vec4(-4000.0, 1.0e4, 0.0, 0.0);

// Weight of the detail tile at a point.
float detailWeight(vec2 uvB) {
  return uHasB * smoothstep(0.0, 1.0, clamp(insideKm(uvB, uRectB) / uFadeB, 0.0, 1.0));
}

vec4 sampleField(vec2 p) {
  vec2 uvA = tileUv(p, uRectA);
  vec4 a = texture(uFieldA, uvA);
  a = insideKm(uvA, uRectA) > 0.0 ? a : OPEN_SEA;
  vec2 uvB = tileUv(p, uRectB);
  vec4 b = texture(uFieldB, uvB);
  return mix(a, b, detailWeight(uvB));
}

vec4 sampleFieldLod(vec2 p, float lodA, float lodB) {
  vec2 uvA = tileUv(p, uRectA);
  vec4 a = textureLod(uFieldA, uvA, lodA);
  a = insideKm(uvA, uRectA) > 0.0 ? a : OPEN_SEA;
  vec2 uvB = tileUv(p, uRectB);
  vec4 b = textureLod(uFieldB, uvB, lodB);
  return mix(a, b, detailWeight(uvB));
}

// Horizon tangents toward the two lighting states' suns (true scale).
vec2 sampleHorizon(vec2 p) {
  vec2 uvA = tileUv(p, uRectA);
  vec2 a = texture(uHorizonA, uvA).rg;
  a = insideKm(uvA, uRectA) > 0.0 ? a : vec2(0.0);
  vec2 uvB = tileUv(p, uRectB);
  vec2 b = texture(uHorizonB, uvB).rg;
  vec2 h = mix(a, b, detailWeight(uvB));
  // Stored as sqrt(t / 0.25).
  return h * h * 0.25;
}
`;

/** Anti-aliased line coverage for a distance in pixels and a width in pixels. */
export const GLSL_LINES = /* glsl */ `
float lineCov(float distPx, float widthPx) {
  float w = max(widthPx, 1.0);
  // Lines thinner than a pixel keep a pixel's footprint and lose opacity.
  float a = min(widthPx, 1.0);
  return a * (1.0 - smoothstep(w * 0.5 - 0.5, w * 0.5 + 0.5, distPx));
}
`;

/**
 * The sky and the haze. The gradient is scene 1's dawn sky expressed as a
 * function of elevation, so the chart's horizon matches the painted one;
 * the stops' colours come from the lighting state.
 */
export const GLSL_SKY = /* glsl */ `
uniform vec3 uSkyStops[9];
uniform vec3 uSunDir;
uniform float uSunDisc;
uniform vec3 uGlowColor;
uniform float uGlow;
uniform vec3 uHazeColor;

const float SKY_ELEV[9] = float[9](0.0, 1.25, 3.33, 6.66, 11.2, 16.9, 24.6, 34.8, 90.0);

vec3 skyGradient(float elevDeg) {
  float e = clamp(elevDeg, 0.0, 90.0);
  vec3 c = uSkyStops[0];
  for (int i = 1; i < 9; i++) {
    float t = clamp((e - SKY_ELEV[i - 1]) / (SKY_ELEV[i] - SKY_ELEV[i - 1]), 0.0, 1.0);
    c = mix(c, uSkyStops[i], t);
  }
  return c;
}

// Scene 1's horizon glow: an ellipse about 30° wide and 14° tall, centred
// on the horizon under the sun.
float horizonGlow(vec3 dir) {
  float az = atan(dir.x, dir.y);
  float sunAz = atan(uSunDir.x, uSunDir.y);
  float dAz = abs(mod(az - sunAz + 3.14159265, 6.2831853) - 3.14159265);
  float elev = asin(clamp(dir.z, -1.0, 1.0));
  vec2 q = vec2(dAz / radians(30.0), elev / radians(14.0));
  float r = length(q);
  // Stops at 0, 0.24, 0.52, 0.72 of the radius: 0.62, 0.32, 0.12, 0.
  float a = r < 0.24 ? mix(0.62, 0.32, r / 0.24)
          : r < 0.52 ? mix(0.32, 0.12, (r - 0.24) / 0.28)
          : mix(0.12, 0.0, clamp((r - 0.52) / 0.2, 0.0, 1.0));
  return a * uGlow;
}

vec3 skyColor(vec3 dir) {
  float elevDeg = degrees(asin(clamp(dir.z, -1.0, 1.0)));
  vec3 c = skyGradient(elevDeg);
  c = mix(c, uGlowColor, horizonGlow(dir));
  return c;
}

// Haze takes the colour of the sky just above the horizon in the view
// direction, so distant chart dissolves into the horizon seamlessly.
vec3 hazeColorFor(vec3 dir) {
  vec2 across = length(dir.xy) > 1e-4 ? normalize(dir.xy) : vec2(0.0, 1.0);
  vec3 horizonDir = normalize(vec3(across, 0.02));
  vec3 c = skyColor(horizonDir);
  // Looking down, the haze is the general colour of the air.
  return mix(c, uHazeColor, clamp(-dir.z * 0.8, 0.0, 0.6));
}
`;
