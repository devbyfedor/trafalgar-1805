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

/**
 * The field read smoothly close up (fragment shaders only; needs
 * GLSL_FIELD). Read bilinearly, a magnified field draws every line made
 * from it (the coast, the waterlines, the isobaths, the contours) as a
 * chain of short curves that kink at each texel's edge, and its shading in
 * soft lozenges: on the Cádiz tile a texel spans 30-40 px from 16 km up.
 * Wherever a texel spans more than a pixel, each layer is read through a
 * cubic B-spline instead, which is smooth to its second derivative: the
 * lines become curves and the shading continuous. Four bilinear taps make
 * the sixteen-texel B-spline (Sigg and Hadwiger, "Fast third-order texture
 * filtering", GPU Gems 2, ch. 20). Where a texel spans less than a pixel
 * the hardware's own filtering stays, and between the two they blend over
 * an octave, so nothing changes in a step as the camera moves.
 *
 * The field and the smoothed field (read a mip bias coarser, for the lines
 * and the shading) are read together: once magnified past the bias they
 * are the same B-spline. Layers that a finer one hides are not read at all:
 * inside the detail tile, away from its edge band and its distance cap,
 * the overview and the surround cost nothing.
 */
export const GLSL_FIELD_SMOOTH = /* glsl */ `
// The cubic B-spline of a texture's mip level at uv (size: the level's
// size in texels), in four bilinear taps. grad: the slope of its first
// channel per unit of uv, from the taps' differences about two texels
// apart, which carry almost none of the filtering's rounding noise.
vec4 bsplineAt(sampler2D tex, vec2 uv, vec2 size, float level, out vec2 grad) {
  vec2 t = uv * size - 0.5;
  vec2 f = fract(t);
  t -= f;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  // Each pair of texels as one bilinear tap between their centres.
  vec2 h0 = (t - 0.5 + w1 / g0) / size;
  vec2 h1 = (t + 1.5 + w3 / g1) / size;
  vec4 a = textureLod(tex, h0, level);
  vec4 b = textureLod(tex, vec2(h1.x, h0.y), level);
  vec4 c = textureLod(tex, vec2(h0.x, h1.y), level);
  vec4 d = textureLod(tex, h1, level);
  grad = vec2(
    (g0.y * (b.x - a.x) + g1.y * (d.x - c.x)) / (h1.x - h0.x),
    (g0.x * (c.x - a.x) + g1.x * (d.x - b.x)) / (h1.y - h0.y)
  );
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

// One layer's field (f) and smoothed field (fs, a mip bias coarser) at uv,
// with the uv's screen derivatives. Its texels per pixel, along the
// footprint's longer axis, choose the filter: below one pixel's worth of
// texel the B-spline, above it the hardware's, blended over an octave.
// The smoothed field serves two ends, read two ways close up: its slopes
// (zw, the shading) through the base level's B-spline, crisp and without
// facets, as the bias would have read the base level; its height and
// distance (xy, the isobaths and contours) through the next level's (0.93
// km texels on a detail tile), so those lines follow the landforms as an
// engraver's form lines did, not the data's metre-scale noise. slope: how
// fast that height changes per pixel, from the B-spline's taps, and how
// much the estimate counts (where the hardware filters instead, a screen
// derivative does).
void sampleLayerBoth(sampler2D tex, vec2 uv, vec2 dx, vec2 dy, float bias, out vec4 f, out vec4 fs, out vec2 slope) {
  vec2 size = vec2(textureSize(tex, 0));
  float rho = max(length(dx * size), length(dy * size));
  float lod = log2(max(rho, 1e-8));
  float lb = lod + bias;
  float tf = clamp(lod + 1.0, 0.0, 1.0);
  float tz = clamp(lb, 0.0, 1.0);
  float tx = clamp(lb - 1.0, 0.0, 1.0);
  vec2 g = vec2(0.0);
  vec2 gS = vec2(0.0);
  vec4 cubic = tf < 1.0 ? bsplineAt(tex, uv, size, 0.0, g) : vec4(0.0);
  vec4 lin = tf > 0.0 ? textureGrad(tex, uv, dx, dy) : vec4(0.0);
  vec4 cubicS = tx < 1.0 ? bsplineAt(tex, uv, vec2(textureSize(tex, 1)), 1.0, gS) : vec4(0.0);
  float k = exp2(bias);
  vec4 linS = tz > 0.0 ? textureGrad(tex, uv, dx * k, dy * k) : vec4(0.0);
  f = mix(cubic, lin, tf);
  fs = vec4(mix(cubicS.xy, linS.xy, tx), mix(cubic.zw, linS.zw, tz));
  float w = 1.0 - tx;
  slope = vec2(w * length(vec2(dot(gS, dx), dot(gS, dy))), w);
}

// GLSL_FIELD's layered(), for both reads at once, reading a layer only
// where it shows. dp: the world point's screen derivatives (dFdx, dFdy),
// taken before any branch. slope: as sampleLayerBoth's, layered alike
// (its first part already weighted by its second).
void sampleFieldBoth(vec2 p, vec2 dpx, vec2 dpy, float bias, out vec4 f, out vec4 fs, out vec2 slope) {
  const vec2 FLIP = vec2(1.0, -1.0);
  float cb = uHasB * cover(p, uRectB, uFadeB);
  vec4 bf = vec4(0.0);
  vec4 bs = vec4(0.0);
  vec2 bg = vec2(0.0);
  if (cb > 0.0) {
    sampleLayerBoth(uFieldB, tileUv(p, uRectB), dpx / uRectB.zw * FLIP, dpy / uRectB.zw * FLIP, bias, bf, bs, bg);
    // Inside the detail tile and short of its distance cap, it alone shows.
    if (cb >= 1.0 && max(abs(bf.y), abs(bs.y)) < 0.85 * uSatB) {
      f = bf;
      fs = bs;
      slope = bg;
      return;
    }
  }
  float ca = cover(p, uRectA, uFadeA);
  vec4 af = vec4(0.0);
  vec4 as = vec4(0.0);
  vec2 ag = vec2(0.0);
  if (ca > 0.0) {
    sampleLayerBoth(uFieldA, tileUv(p, uRectA), dpx / uRectA.zw * FLIP, dpy / uRectA.zw * FLIP, bias, af, as, ag);
  }
  vec4 cf = OPEN_SEA;
  vec4 cs = OPEN_SEA;
  vec2 cg = vec2(0.0);
  bool overviewAlone = ca >= 1.0 && max(abs(af.y), abs(as.y)) < 0.85 * uSatA;
  if (!overviewAlone && insideKm(tileUv(p, uRectC), uRectC) > 0.0) {
    sampleLayerBoth(uFieldC, tileUv(p, uRectC), dpx / uRectC.zw * FLIP, dpy / uRectC.zw * FLIP, bias, cf, cs, cg);
  }
  f = mix(cf, handOver(af, cf, uSatA), ca);
  fs = mix(cs, handOver(as, cs, uSatA), ca);
  slope = mix(cg, ag, ca);
  f = mix(f, handOver(bf, f, uSatB), cb);
  fs = mix(fs, handOver(bs, fs, uSatB), cb);
  slope = mix(slope, bg, cb);
}
`;

/**
 * The chart's surface, shared by the terrain mesh and everything laid on it
 * (lettering, rivers, routes), so they rise and fall together. Needs
 * GLSL_GEO and GLSL_FIELD, and the uniforms uExag and uTexelKm. cellKm is
 * the mesh's cell where the surface is read, as the morph has stretched it
 * (between distance / 1.4 k and distance / k; distance / k is a safe
 * estimate for layers laid on it).
 *
 * The water is the sea's own surface: no mesh triangle that holds any water
 * is lifted. Every point of a triangle lies within √2 cells of each of its
 * corners, and the coast read here (bilinear, a level four times finer than
 * the mesh's, so a bay or a strait a few cells wide is not averaged into
 * land) lies within 0.6 of that read's texel of the coast the fragments
 * draw (finer still, through a B-spline close up). Land rises only beyond
 * both, over the next cell; nearer the coast it stays at sea level, and its
 * relief there is drawn by the shading and the contours alone. So a ship, a
 * wake, a route or a sounding on the sea is never hidden by a raised sea.
 */
export const GLSL_SURFACE = /* glsl */ `
// The texel whose error bounds the coast read at p, km: the finest layer's
// where it covers in full; where a layer covers only in part (its edge band,
// or a detail tile fading in or out of the slot) the read blends it with the
// coarser layer below, whose error then sets the margin.
float finestTexelKm(vec2 p) {
  float ca = insideKm(tileUv(p, uRectA), uRectA) > 0.0 ? cover(p, uRectA, uFadeA) : 0.0;
  float t = ca >= 1.0 ? uTexelKm.x : uTexelKm.z;
  return uHasB * cover(p, uRectB, uFadeB) >= 1.0 ? uTexelKm.y : t;
}

float surfaceZ(vec2 p, float cellKm, vec4 f) {
  float coast = sampleFieldLod(p, max(vec3(0.0), log2(0.25 * cellKm / uTexelKm))).y;
  float from = 1.42 * cellKm + 0.6 * max(finestTexelKm(p), 0.25 * cellKm);
  float rise = smoothstep(from, from + cellKm, -coast);
  return max(f.x, 0.0) * 0.001 * secLat(p.y) * uExag * rise;
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
