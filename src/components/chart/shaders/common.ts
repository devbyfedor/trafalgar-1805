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
 * The terrain field, in three layers: the coarse surround under everything
 * (open sea beyond it), the overview (the stage) over it, and the detail
 * tile over that, each blended in across a band at its edges. Each field
 * texel holds (height m, coast distance km, slope east, slope north), the
 * slopes as rise over ground run of the land surface. Samples are taken
 * outside any branch, so mip selection stays defined.
 */
export const GLSL_FIELD = /* glsl */ `
uniform sampler2D uFieldC;
uniform vec4 uRectC;
uniform sampler2D uFieldA;
uniform vec4 uRectA;
uniform float uFadeA;
uniform float uSatA;
uniform sampler2D uFieldB;
uniform vec4 uRectB;
uniform float uFadeB;
uniform float uSatB;
uniform float uHasB;
uniform sampler2D uHorizonA;
uniform sampler2D uHorizonB;
uniform sampler2D uLandC;
uniform sampler2D uLandA;
uniform sampler2D uLandB;

vec2 tileUv(vec2 p, vec4 rect) {
  return vec2((p.x - rect.x) / rect.z, (rect.y - p.y) / rect.w);
}

// Distance inside a tile from its nearest edge, km (negative outside).
float insideKm(vec2 uv, vec4 rect) {
  vec2 e = min(uv, 1.0 - uv) * rect.zw;
  return min(e.x, e.y);
}

const vec4 OPEN_SEA = vec4(-4000.0, 1.0e4, 0.0, 0.0);

// How much a tile covers a point: 1 inside, easing to 0 across its edge band.
float cover(vec2 p, vec4 rect, float fadeKm) {
  float inside = insideKm(tileUv(p, rect), rect);
  return smoothstep(0.0, 1.0, clamp(inside / fadeKm, 0.0, 1.0));
}

// A finer layer's coast distance stops at its range (sat, km); beyond it
// the coarser layer below knows better. Mixing a capped distance with an
// uncapped one would draw false waterlines across the blend band.
vec4 handOver(vec4 fine, vec4 below, float sat) {
  fine.y = mix(fine.y, below.y, smoothstep(0.85 * sat, sat, abs(fine.y)));
  return fine;
}

// The layers' samples at a point (surround c, overview a, detail b), stacked.
vec4 layered(vec2 p, vec4 c, vec4 a, vec4 b) {
  vec4 f = insideKm(tileUv(p, uRectC), uRectC) > 0.0 ? c : OPEN_SEA;
  f = mix(f, handOver(a, f, uSatA), cover(p, uRectA, uFadeA));
  return mix(f, handOver(b, f, uSatB), uHasB * cover(p, uRectB, uFadeB));
}

vec4 sampleField(vec2 p) {
  return layered(
    p,
    texture(uFieldC, tileUv(p, uRectC)),
    texture(uFieldA, tileUv(p, uRectA)),
    texture(uFieldB, tileUv(p, uRectB))
  );
}

// Explicit levels of detail per layer: (overview, detail, surround).
vec4 sampleFieldLod(vec2 p, vec3 lod) {
  return layered(
    p,
    textureLod(uFieldC, tileUv(p, uRectC), lod.z),
    textureLod(uFieldA, tileUv(p, uRectA), lod.x),
    textureLod(uFieldB, tileUv(p, uRectB), lod.y)
  );
}

// The share of land around a point (0..1), from each layer's land mask read
// at levels (overview, detail, surround) whose texels are as wide as the
// window. Beyond the surround there is only open sea.
float landShare(vec2 p, vec3 lod) {
  float c = textureLod(uLandC, tileUv(p, uRectC), lod.z).r;
  float a = textureLod(uLandA, tileUv(p, uRectA), lod.x).r;
  float b = textureLod(uLandB, tileUv(p, uRectB), lod.y).r;
  float f = insideKm(tileUv(p, uRectC), uRectC) > 0.0 ? c : 0.0;
  f = mix(f, a, cover(p, uRectA, uFadeA));
  return mix(f, b, uHasB * cover(p, uRectB, uFadeB));
}

// Horizon tangents toward the two lighting states' suns (true scale). The
// surround casts no shadows.
vec2 sampleHorizon(vec2 p) {
  vec2 a = texture(uHorizonA, tileUv(p, uRectA)).rg;
  vec2 b = texture(uHorizonB, tileUv(p, uRectB)).rg;
  vec2 h = a * cover(p, uRectA, uFadeA);
  h = mix(h, b, uHasB * cover(p, uRectB, uFadeB));
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

// Haze takes the colour of the sky behind the point: at the view's own
// elevation above the horizon, the horizon's colour below it. Distant
// land dissolves into the very sky behind it and leaves no silhouette.
vec3 hazeColorFor(vec3 dir) {
  vec3 c = skyColor(normalize(vec3(dir.xy, max(dir.z, 0.0)) + vec3(0.0, 0.0, 1e-6)));
  // Looking down, the haze is the general colour of the air.
  return mix(c, uHazeColor, clamp(-dir.z * 0.8, 0.0, 0.6));
}
`;
