import {
  BufferAttribute,
  FloatType,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NearestFilter,
  OrthographicCamera,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import { GLSL_COAST_ROOM } from "./height";

/**
 * The chart's distance from the coast (km, 0 on land) at many points at
 * once, read on the GPU as the glyphs read it (GLSL_COAST_ROOM): one point
 * per texel into a float target, read back without stalling a frame. For
 * rooms worked out ahead of time, such as a squadron's along its route.
 */

const WIDTH = 1024;

const VERTEX = /* glsl */ `
precision highp float;
in vec2 iAt;
uniform vec3 uTexelKm;
uniform vec2 uSize;
out float vCoast;
${GLSL_GEO}
${GLSL_FIELD}
${GLSL_COAST_ROOM}
void main() {
  vCoast = coastRoom(iAt);
  float i = float(gl_InstanceID);
  vec2 texel = vec2(mod(i, uSize.x), floor(i / uSize.x)) + 0.5;
  gl_Position = vec4(texel / uSize * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in float vCoast;
out vec4 fragColor;
void main() {
  fragColor = vec4(vCoast, 0.0, 0.0, 1.0);
}
`;

/** `points` holds world x, y pairs (km); the result one distance per point. */
export async function readCoastKm(
  renderer: WebGLRenderer,
  field: TerrainField,
  points: Float32Array,
): Promise<Float32Array> {
  const n = points.length / 2;
  const out = new Float32Array(n);
  if (n === 0) return out;
  const w = Math.min(n, WIDTH);
  const h = Math.ceil(n / WIDTH);
  const g = new InstancedBufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
  g.setAttribute("iAt", new InstancedBufferAttribute(points, 2));
  g.instanceCount = n;
  const material = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      ...field.uniforms,
      uTexelKm: { value: field.texelKm },
      uSize: { value: [w, h] },
    },
  });
  const scene = new Scene();
  const dots = new Points(g, material);
  dots.frustumCulled = false;
  scene.add(dots);
  const target = new WebGLRenderTarget(w, h, {
    type: FloatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
  });
  const before = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, new OrthographicCamera());
    renderer.setRenderTarget(before);
    const texels = new Float32Array(w * h * 4);
    await renderer.readRenderTargetPixelsAsync(target, 0, 0, w, h, texels);
    for (let i = 0; i < n; i++) out[i] = texels[i * 4];
    return out;
  } finally {
    renderer.setRenderTarget(before);
    target.dispose();
    g.dispose();
    material.dispose();
  }
}
