import { GLSL_FIELD, GLSL_GEO, GLSL_LINES, GLSL_SKY } from "../shaders/common";

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
out vec3 vWorld;

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
  // Only land rises; it eases to sea level within a mesh cell of the coast.
  float taper = smoothstep(0.0, cell, -f.y);
  float z = max(f.x, 0.0) * 0.001 * secLat(p.y) * uExag * taper;
  // Skirt vertices (position.z = 1) hang below the patch's edge.
  z -= position.z * cell * 0.5;
  vWorld = vec3(p, z);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`;

export const TERRAIN_FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
${GLSL_LINES}
${GLSL_SKY}
in vec3 vWorld;
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
uniform float uShadowStrength;
uniform vec3 uLightDirA;
uniform vec3 uLightDirB;
uniform float uLightOnA;
uniform float uLightOnB;
uniform float uLightMix;
uniform vec3 uSlotA;
uniform vec3 uSlotB;

uniform float uContourInterval;
uniform float uContourBlend;
uniform float uWaterSpacingPx;
uniform float uWaterBand;
uniform float uWaterExtent;
uniform float uIsobathDeepest;
uniform float uSmoothBias;
uniform float uHazeVisibility;
uniform float uStageFadeKm;

// The field read at a coarser mip: soundings, contours and shading follow
// the landforms, not every gully and every sounding. (Fragment shaders
// only: texture() takes a bias only here.)
vec4 sampleFieldBias(vec2 p, float bias) {
  return layered(
    p,
    texture(uFieldC, tileUv(p, uRectC), bias),
    texture(uFieldA, tileUv(p, uRectA), bias),
    texture(uFieldB, tileUv(p, uRectB), bias)
  );
}

// Relief light of one state, relative to lit flat ground (1).
float reliefLight(vec3 n, vec3 L, float horizonTan, float on) {
  float tanSun = L.z / max(length(L.xy), 1e-4);
  // In shadow when the exaggerated horizon rises above the sun.
  float shadow = smoothstep(-0.012, 0.012, uExag * horizonTan - tanSun);
  float direct = max(dot(n, L), 0.0) * (1.0 - shadow * uShadowStrength);
  float lit = direct / max(L.z, 0.09);
  return mix(1.0, lit, on);
}

// One waterlining set at spacing s: multiples of s near the coast, the
// spacing doubling each time the distance doubles beyond 2·band·s. A set at
// 2s is a subset of the set at s, so octaves nest as the camera zooms.
float waterSet(float d, float s, float pxKm, float widthPx) {
  float sigma = s * exp2(max(0.0, ceil(log2(d / (2.0 * uWaterBand * s)))));
  float m = d / sigma;
  return lineCov(abs(m - floor(m + 0.5)) * sigma / pxKm, widthPx);
}

float waterlines(float d, float pxKm) {
  float Z = log2(uWaterSpacingPx * uDpr * pxKm / 0.001);
  float zf = floor(Z);
  float z = Z - zf;
  float s = 0.001 * exp2(zf);
  float sCont = 0.001 * exp2(Z);
  float reach = d / sCont;
  // Lines thin and fade outward.
  float w = mix(1.05, 0.6, smoothstep(0.0, uWaterExtent, reach)) * uDpr;
  float fine = waterSet(d, s, pxKm, w);
  float coarse = waterSet(d, 2.0 * s, pxKm, w);
  float cov = max(coarse, fine * (1.0 - smoothstep(0.0, 1.0, z)));
  float fade = 1.0 - smoothstep(uWaterExtent * 0.45, uWaterExtent, reach);
  return cov * fade * step(0.0, d);
}

// Clear near the camera, closing smoothly to opaque at the far distance.
float hazeAmount(float dist) {
  float x = dist / uHazeVisibility;
  return 1.0 - exp(-x * x);
}

void main() {
  vec2 p = vWorld.xy;
  vec4 f = sampleField(p);
  float h = f.x;
  float sdf = f.y;
  vec4 fs = sampleFieldBias(p, uSmoothBias);
  float dpr = uDpr;
  // Km per pixel across the coast (the distance field's gradient is 1).
  float pxKm = max(length(vec2(dFdx(sdf), dFdy(sdf))), 1e-6);

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
  // unsounded in 1805 and stays blank.
  float sounding = max(-fs.x, 0.0);
  float dPx = max(length(vec2(dFdx(sounding), dFdy(sounding))), 1e-5);
  float iso = 0.0;
  float levels[6] = float[6](10.0, 20.0, 50.0, 100.0, 200.0, 500.0);
  for (int i = 0; i < 6; i++) {
    float fm = levels[i];
    if (fm > uIsobathDeepest) break;
    float L = fm * 1.8288;
    float gap = (i < 5 ? levels[i + 1] - fm : fm) * 1.8288;
    float crowd = smoothstep(2.0 * dpr, 7.0 * dpr, gap / dPx);
    float w = (fm == 100.0 ? 1.15 : 0.8) * dpr;
    iso = max(iso, lineCov(abs(sounding - L) / dPx, w) * crowd);
  }
  // Keep the coast clean: soundings give way to the waterlining.
  float waterReach = sdf / (uWaterSpacingPx * dpr * pxKm);
  iso *= smoothstep(2.0, 6.0, waterReach);

  float water = waterlines(sdf, pxKm);

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
  float lightA = reliefLight(n, uLightDirA, dot(hz, uSlotA), uLightOnA);
  float lightB = reliefLight(n, uLightDirB, dot(hz, uSlotB), uLightOnB);
  float light = mix(lightA, lightB, uLightMix);
  vec3 paper = mix(uPaperLow, uPaperHigh, smoothstep(50.0, 2200.0, hl));
  // Restrained shading: the light moves the paper's value a little.
  float value = 1.0 + uReliefGain * (clamp(light, 0.0, 2.2) - 1.0) * 0.5;
  vec3 tint = mix(uShadeColor, uSunColor, smoothstep(0.0, 1.0, light));
  vec3 landColor = paper * mix(vec3(1.0), tint, uReliefGain) * value;

  // Contours: an interval and its double, nested, chosen by the camera.
  float hc = max(fs.x, 0.0);
  float hPx = max(length(vec2(dFdx(hc), dFdy(hc))), 1e-5);
  float I = uContourInterval;
  float cFine = lineCov(abs(hc - floor(hc / I + 0.5) * I) / hPx, 0.7 * dpr);
  float cCoarse = lineCov(abs(hc - floor(hc / (2.0 * I) + 0.5) * 2.0 * I) / hPx, 0.7 * dpr);
  float contour = max(cCoarse, cFine * (1.0 - uContourBlend));
  contour *= smoothstep(3.0 * dpr, 8.0 * dpr, I / hPx) * smoothstep(0.4 * I, 0.9 * I, hc);
  landColor = mix(landColor, uContourInk, contour * 0.32);

  // ---- Together -------------------------------------------------------
  vec3 color = mix(seaColor, landColor, land);
  float coast = lineCov(abs(sdf) / pxKm, 1.45 * dpr) * stage;
  color = mix(color, uInk, coast * 0.92);

  // Beyond the stage the chart gives way to open sea and haze.
  vec3 hazeCol = hazeColorFor(view);
  color = mix(mix(uSeaDeep, hazeCol, 0.25), color, stage);
  color = mix(color, hazeCol, hazeAmount(dist));
  fragColor = vec4(color, 1.0);
}
`;
