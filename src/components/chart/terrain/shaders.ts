import {
  GLSL_FIELD,
  GLSL_FIELD_SMOOTH,
  GLSL_GEO,
  GLSL_LINES,
  GLSL_SKY,
  GLSL_SURFACE,
} from "../shaders/common";

/**
 * The chart's surface: one CDLOD mesh for land and sea, its look drawn
 * analytically per pixel so every line stays crisp at every zoom
 * (docs/decisions.md, "How each feature is drawn").
 */

export const TERRAIN_VERTEX = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
in vec4 node;
uniform float uGridN;
uniform float uExag;
uniform vec3 uEye;
uniform vec3 uTexelKm;
uniform float uDpr;
uniform float uPxPerRad;
uniform float uWaterSpacingPx;
uniform float uWaterReach;
uniform float uWaterWindow;
out vec3 vWorld;
out float vLandShare;
${GLSL_SURFACE}

void main() {
  float cell = node.z / uGridN;
  vec2 grid = position.xy;
  vec2 p = node.xy + grid * cell;
  // CDLOD morph: odd vertices slide onto the coarser grid near the range end.
  float dist = length(vec3(p - uEye.xy, uEye.z));
  float morph = clamp((dist - 0.7 * node.w) / (0.3 * node.w), 0.0, 1.0);
  p -= mod(grid, 2.0) * cell * morph;
  // Read the field at a mip level matching the mesh spacing.
  vec4 f = sampleFieldLod(p, max(vec3(0.0), log2(cell / uTexelKm)));
  // Morphing stretches the triangles toward the coarser grid's cells.
  float z = surfaceZ(p, cell * (1.0 + morph), f);
  // Skirt vertices (position.z = 1) hang below the patch's edge.
  z -= position.z * cell * 0.5;
  vWorld = vec3(p, z);
  // The share of land in a window round this water, reaching past its coast
  // distance by a share of the waterlining's reach (seen face on; a mask
  // texel is two field cells), for the waterlines' strength (waterAlone).
  // It varies slowly enough to be read per vertex.
  float reachKm = uWaterReach * uWaterSpacingPx * uDpr * dist / uPxPerRad;
  float windowKm = 2.0 * (max(f.y, 0.0) + uWaterWindow * reachKm);
  vLandShare = landShare(p, max(vec3(0.0), log2(windowKm / (2.0 * uTexelKm))));
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

export const TERRAIN_FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
${GLSL_FIELD_SMOOTH}
${GLSL_LINES}
${GLSL_SKY}
in vec3 vWorld;
in float vLandShare;
out vec4 fragColor;

uniform float uExag;
uniform float uDpr;
uniform vec3 uEye;

uniform vec3 uSeaDeep;
uniform vec3 uSeaShallow;
uniform float uSeaReflect;
uniform vec3 uPaperLow;
uniform vec3 uPaperHigh;
uniform vec3 uInk;
uniform vec3 uInkPale;
uniform vec3 uContourInk;
uniform vec3 uSunColor;
uniform vec3 uShadeColor;
uniform float uReliefGain;
uniform vec2 uReliefSlope;
uniform float uShadowStrength;
uniform float uShadowExag;
uniform vec3 uLightDirA;
uniform vec3 uLightDirB;
uniform float uLightOnA;
uniform float uLightOnB;
uniform float uLightMix;
uniform vec3 uSlotA;
uniform vec3 uSlotB;

uniform float uContourInterval;
uniform float uContourBlend;
uniform vec2 uCloseKm;
uniform vec2 uCoastPx;
uniform float uReliefCloseFrom;
uniform float uContourWeight;
uniform float uWaterSpacingPx;
uniform vec2 uWaterOpen;
uniform float uWaterReach;
uniform vec2 uWaterAlone;
uniform float uWaterAloneReach;
uniform float uWaterAloneStrength;
uniform float uIsobathDeepest;
uniform float uSmoothBias;
uniform float uHazeVisibility;
uniform float uStageFadeKm;

// One lighting state's light on the relief. x: how the slope faces the
// sun against flat ground, compressed to (-0.5, 1), so slopes toward a low
// sun never blaze. y: the cast shadow, where the exaggerated horizon rises
// above the sun. A state with no sun leaves the relief unlit.
vec2 reliefLight(vec3 n, vec3 L, float horizonTan, float on) {
  float tanSun = L.z / max(length(L.xy), 1e-4);
  // Shadows take a capped exaggeration: at continental scale a low sun
  // would otherwise throw shadows a hundred kilometres long across plains.
  // A shadow deepens with how far the relief rises above the sun's line,
  // over a range that grows with the sun's height: a low hill that barely
  // clips a dawn sun casts only a faint wash (at full strength the lowland
  // read as dark blotches close up), a sierra its full long shadow.
  float rise = min(uExag, uShadowExag) * horizonTan - tanSun;
  float soft = max(0.04, 0.5 * tanSun);
  float shadow = smoothstep(0.0, soft, rise);
  float facing = max(dot(n, L), 0.0) / max(L.z, 0.02) - 1.0;
  return on * vec2(facing / (1.0 + abs(facing)), shadow);
}

// Waterlining, after the engraved waterlining of the Ordnance Survey
// (1801-1809) and of Arrowsmith and Hall (1817): many fine lines whose
// spacing opens smoothly about twofold across the band, fading in strength
// outward, so a band reads as tone (docs/research/scene-02/t4-chart-style.md,
// section 1, and the independent check v-t4.md).
//
// The nearest line of the set at spacing s (lines at every multiple of s
// from the coast): the distance to it and its own distance from the coast,
// km. Sets at s, 2s, 4s and 8s nest, and each line stays where it is in
// the world as the camera zooms.
vec2 waterLine(float d, float s) {
  float line = floor(d / s + 0.5) * s;
  return vec2(abs(d - line), line);
}

// An engraver's hand: each line's weight differs a little from the next.
// Hashed from the line's distance from the coast, so a line keeps its
// weight in every octave it appears in.
float lineHand(float lineKm) {
  uint n = uint(lineKm * 1000.0 + 0.5);
  n = (n ^ 61u) ^ (n >> 16u);
  n *= 9u;
  n ^= n >> 4u;
  n *= 0x27d4eb2du;
  n ^= n >> 15u;
  return float(n & 0xffffu) / 65535.0;
}

// How alone the nearest land is (0..1): a small island far from other land
// gets a small, soft halo, as Hall drew a soft small patch round an isolated
// rock (full-size faint rings would keep a target's geometry), while a
// coast keeps its band (docs/research/scene-02/a-t4.md, directive 4). From
// the share of land in a
// window round the water that reaches past its own coast distance by a
// share of the reach (vLandShare): along any coast, however far out in the
// band, the window holds a good share of land; round a speck, even one in
// a strait between two coasts, almost none. The window follows the water,
// not its nearest coast, so halos meet without seams and an islet close
// inshore leaves the coast's band whole.
float waterAlone() {
  return 1.0 - smoothstep(uWaterAlone.x, uWaterAlone.y, vLandShare);
}

// d: the coast distance, km; band: the band's reach, km (constant on
// screen); alone: waterAlone(), which shrinks and softens the band.
float waterlines(float d, float pxKm, float band, float alone) {
  float reach = band * mix(1.0, uWaterAloneReach, alone);
  if (d < 0.0 || d >= reach) return 0.0;
  float Z = log2(uWaterSpacingPx * uDpr * pxKm / 0.001);
  float zf = floor(Z);
  float z = Z - zf;
  float s = 0.001 * exp2(zf);
  float u = d / reach;
  // Full strength at the coast, nothing at the reach; the first few lines
  // about twice the weight of the middle ones, a rim of tone at the shore.
  float strength = pow(1.0 - u, 1.5) * mix(1.0, uWaterAloneStrength, alone);
  float w = (0.55 + 0.75 * (1.0 - smoothstep(0.08, 0.4, u))) * uDpr;
  float cov = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 line = waterLine(d, s * exp2(float(i)));
    // The set's level against the spacing on screen (r): the finest set
    // fades as the camera pulls back, and each coarser set reaches farther
    // out, so the spacing opens smoothly instead of in a step. The coarsest
    // set reaches past the band, so nothing jumps when the octave changes.
    float r = float(i) - z;
    float edge = uWaterOpen.x + uWaterOpen.y * r;
    float shown = (1.0 - smoothstep(edge - 0.12, edge + 0.12, u)) * (i == 0 ? 1.0 - smoothstep(0.0, 1.0, z) : 1.0);
    float hand = lineHand(line.y);
    cov = max(cov, lineCov(line.x / pxKm, w * (0.8 + 0.4 * hand)) * (0.85 + 0.3 * hand) * shown);
  }
  return cov * strength;
}

// Whether a line drawn where a field crosses a level stays put (1) or
// would wander (0): where the ground is nearly flat, the field's own noise
// (the half-float filtering rounds to about 1 part in 2,000 of the value,
// and the height code to a tenth of a metre near sea level) moves the
// crossing by pixels from one pixel to the next, and the line breaks into
// speckle. A level on such flat ground is no line a surveyor could draw.
// v: the value at the level (m); perPx: how fast it changes, m per pixel.
float steady(float v, float perPx) {
  float noisePx = (abs(v) * 6e-4 + 0.03) / max(perPx, 1e-6);
  return 1.0 - smoothstep(0.25, 0.6, noisePx);
}

// Clear near the camera, closing smoothly to opaque at the far distance.
float hazeAmount(float dist) {
  float x = dist / uHazeVisibility;
  return 1.0 - exp(-x * x);
}

void main() {
  vec2 p = vWorld.xy;
  // The field (f), and read a mip bias coarser (fs) for the isobaths, the
  // contours and the shading, which follow the landforms, not every gully
  // and every sounding; both smooth close up (GLSL_FIELD_SMOOTH).
  vec2 dpx = dFdx(p);
  vec2 dpy = dFdy(p);
  vec4 f;
  vec4 fs;
  vec2 slope;
  sampleFieldBoth(p, dpx, dpy, uSmoothBias, f, fs, slope);
  // How fast the smoothed height changes per pixel: from the B-spline's
  // taps where it is read so (free of the filtering's rounding noise, of
  // which a screen derivative of a nearly flat field is mostly made), else
  // from the screen derivative. The isobaths and contours use it.
  float hDeriv = length(vec2(dFdx(fs.x), dFdy(fs.x)));
  float hPerPx = max(mix(hDeriv, slope.x / max(slope.y, 1e-6), slope.y), 1e-5);
  float h = f.x;
  float sdf = f.y;
  float dpr = uDpr;
  // Km per pixel across the coast (the distance field's gradient is 1).
  float pxKm = max(length(vec2(dFdx(sdf), dFdy(sdf))), 1e-6);
  // How far the chart is held to the eye here (0 far, 1 close), by its
  // scale on screen (km per CSS px, from the area a pixel covers, so a
  // slanting view doesn't count as far): close up it draws as a pilot
  // chart would, a finer coast and relief carried by the weight of lines.
  float areaKm = sqrt(abs(dpx.x * dpy.y - dpx.y * dpy.x));
  float closeUp = 1.0 - smoothstep(uCloseKm.x, uCloseKm.y, areaKm * dpr);

  // The world ends at the surround's edges, far out in the haze.
  float stage = smoothstep(0.0, uStageFadeKm, insideKm(tileUv(p, uRectC), uRectC));
  float land = clamp(0.5 - sdf / pxKm, 0.0, 1.0) * stage;

  vec3 toPoint = vWorld - cameraPosition;
  float dist = length(toPoint);
  vec3 view = toPoint / dist;

  // ---- Sea ----------------------------------------------------------
  float depth = max(-h, 0.0);
  float shelf = smoothstep(0.0, 1.0, log2(1.0 + depth / 15.0) / 5.5);
  vec3 sea = mix(uSeaShallow, uSeaDeep, shelf);

  // Isobaths in fathoms, on the shelf and its edge only: deep water was
  // unsounded in 1805 and stays blank. All of one weight, as Buache drew
  // them (no index line); the 200-fathom line, past the edge of soundings
  // of the period's lead, only faintly (docs/research/scene-02/a-t4.md,
  // directive 7).
  float sounding = max(-fs.x, 0.0);
  float dPx = hPerPx;
  float iso = 0.0;
  float levels[6] = float[6](10.0, 20.0, 50.0, 100.0, 200.0, 500.0);
  for (int i = 0; i < 6; i++) {
    float fm = levels[i];
    if (fm > uIsobathDeepest) break;
    float L = fm * 1.8288;
    float gap = (i < 5 ? levels[i + 1] - fm : fm) * 1.8288;
    float crowd = smoothstep(2.0 * dpr, 7.0 * dpr, gap / dPx);
    float ink = fm > 100.0 ? 0.35 : 1.0;
    iso = max(iso, lineCov(abs(sounding - L) / dPx, 0.8 * dpr) * crowd * ink * steady(L, dPx));
  }
  // Soundings give way to the waterlining where it is strong.
  float reach = uWaterReach * uWaterSpacingPx * dpr * pxKm;
  iso *= smoothstep(0.2, 0.55, sdf / reach);
  float water = waterlines(sdf, pxKm, reach, waterAlone());

  // The sea reflects the sky at grazing angles, as scene 1's sea does.
  float grazing = 1.0 - clamp(-view.z, 0.0, 1.0);
  float fresnel = pow(grazing, 6.0) * uSeaReflect;
  vec3 skyRefl = skyColor(reflect(view, vec3(0.0, 0.0, 1.0)));
  sea = mix(sea, skyRefl, fresnel * 0.85);
  // The sun's road: a soft column under the sun, narrow at the horizon and
  // widening toward the viewer, as on a long swell. Never sparkling.
  vec3 reflDir = reflect(view, vec3(0.0, 0.0, 1.0));
  float dAz = abs(mod(atan(reflDir.x, reflDir.y) - atan(uSunDir.x, uSunDir.y) + 3.14159265, 6.2831853) - 3.14159265);
  float below = asin(clamp(-view.z, 0.0, 1.0));
  float halfWidth = radians(1.2) + 0.35 * below;
  float road = exp(-dAz * dAz / (halfWidth * halfWidth)) * exp(-below / radians(9.0));
  sea = mix(sea, uGlowColor, clamp(road * uSunDisc, 0.0, 0.6));

  vec3 seaColor = sea;
  seaColor = mix(seaColor, uInkPale, iso * 0.28);
  seaColor = mix(seaColor, uInkPale, water * 0.42);

  // ---- Land ---------------------------------------------------------
  float hl = max(h, 0.0);
  vec3 n = normalize(vec3(-uExag * fs.zw, 1.0));
  vec3 hz = vec3(sampleHorizon(p), 0.0);
  vec2 lightA = reliefLight(n, uLightDirA, dot(hz, uSlotA), uLightOnA);
  vec2 lightB = reliefLight(n, uLightDirB, dot(hz, uSlotB), uLightOnB);
  vec2 lit = mix(lightA, lightB, uLightMix);
  vec3 paper = mix(uPaperLow, uPaperHigh, smoothstep(50.0, 2200.0, hl));
  // Restrained hill shading: only real relief is shaded (true-scale slope,
  // so it doesn't grow with the exaggeration); gentle lowland stays plain
  // paper, as on a chart. Cast shadows are their own term: long shadows
  // from a low sun carry the drama. Close up, the data's gentle swells
  // (a texel is 0.46 km on a detail tile) would shade as soft pillows, so
  // the shading starts on steeper ground and the contours carry the rest.
  float reliefFrom = mix(uReliefSlope.x, uReliefCloseFrom, closeUp);
  float relief = smoothstep(reliefFrom, uReliefSlope.y, length(fs.zw));
  float shade = uReliefGain * relief * lit.x - uShadowStrength * lit.y;
  vec3 tint = shade < 0.0 ? uShadeColor : uSunColor;
  vec3 landColor = paper * (1.0 + 0.45 * shade);
  landColor = mix(landColor, landColor * tint, min(abs(shade), 1.0) * 0.6);

  // Contours: an interval and its double, nested, chosen by the camera.
  // Close up they shade as an engraver's lines do: finer and paler on the
  // slopes that face the light, heavier on those turned from it.
  vec2 lightXY = mix(uLightDirA.xy * uLightOnA, uLightDirB.xy * uLightOnB, uLightMix);
  float slopeLen = length(fs.zw);
  float facing = length(lightXY) > 1e-4 && slopeLen > 1e-6
    ? dot(-fs.zw / slopeLen, normalize(lightXY))
    : 0.0;
  float weight = 1.0 - uContourWeight * closeUp * facing;
  float hc = max(fs.x, 0.0);
  float hPx = hPerPx;
  float I = uContourInterval;
  float cw = 0.7 * dpr * weight;
  float cFine = lineCov(abs(hc - floor(hc / I + 0.5) * I) / hPx, cw);
  float cCoarse = lineCov(abs(hc - floor(hc / (2.0 * I) + 0.5) * 2.0 * I) / hPx, cw);
  float contour = max(cCoarse, cFine * (1.0 - uContourBlend)) * steady(hc, hPx);
  contour *= smoothstep(3.0 * dpr, 8.0 * dpr, I / hPx) * smoothstep(0.4 * I, 0.9 * I, hc);
  landColor = mix(landColor, uContourInk, min(contour * 0.32 * weight, 1.0));

  // ---- Together -------------------------------------------------------
  vec3 color = mix(seaColor, landColor, land);
  float coastPx = mix(uCoastPx.x, uCoastPx.y, closeUp);
  float coast = lineCov(abs(sdf) / pxKm, coastPx * dpr) * stage;
  color = mix(color, uInk, coast * 0.92);

  // Beyond the stage the chart gives way to open sea and haze.
  vec3 hazeCol = hazeColorFor(view);
  color = mix(mix(uSeaDeep, hazeCol, 0.25), color, stage);
  color = mix(color, hazeCol, hazeAmount(dist));
  fragColor = vec4(color, 1.0);
  // The water's depth is the sea's own without writing it here: no mesh
  // triangle that holds water is lifted (GLSL_SURFACE).
#ifdef WATER_LIFT
  // Development (terrain/liftProbe.ts): each pixel's height above the sea,
  // metres, coarse in R (4 m steps) and fine in B (0.1 m); G marks water.
  float liftM = max(vWorld.z, 0.0) * 1000.0;
  fragColor = vec4(min(liftM / 4.0, 255.0) / 255.0, sdf > 0.0 ? 1.0 : 0.5, min(liftM * 10.0, 255.0) / 255.0, 1.0);
#endif
#ifdef LAND_MASK
  // Development and tests (glyphs/clash.ts): how much land or coastline
  // shows in this pixel through the haze (0..1), raised land included,
  // where it stands in front of the sea.
  fragColor = vec4(max(land, coast) * (1.0 - hazeAmount(dist)), 0.0, 0.0, 1.0);
#endif
}
`;
