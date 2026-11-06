import {
  BufferAttribute,
  BufferGeometry,
  GLSL3,
  Matrix4,
  Mesh,
  type PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from "three";
import type { LightBlend } from "../light/states";
import { GLSL_SKY } from "../shaders/common";

/**
 * The sky behind the chart: scene 1's gradient, horizon glow, sun halo and
 * disc, as functions of direction. A full-screen triangle at the far plane,
 * drawn after the chart so it shades only the pixels the chart leaves.
 *
 * Scene 1's sun (src/scenes/01-dawn/layers/Sun.tsx) measured through the
 * chart's 40° lens: a disc 6.2 vh across is 2.48°; its halo, a gradient
 * over a box 2.8 discs wide, fades out at about 3.5° from the centre.
 */

const VERTEX = /* glsl */ `
out vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_SKY}
uniform mat4 uInvViewProj;
uniform float uSunRadius;
in vec2 vNdc;
out vec4 fragColor;

void main() {
  vec4 far = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 dir = normalize(far.xyz / far.w - cameraPosition);
  vec3 c = skyColor(dir);

  float r = degrees(acos(clamp(dot(dir, uSunDir), -1.0, 1.0)));
  float k = r / uSunRadius;
  // Halo: 0.8 at the centre, 0.34 at 1.19 radii, 0.1 at 2.06, 0 at 2.85.
  float halo = k < 1.19 ? mix(0.8, 0.34, k / 1.19)
             : k < 2.06 ? mix(0.34, 0.1, (k - 1.19) / 0.87)
             : mix(0.1, 0.0, clamp((k - 2.06) / 0.79, 0.0, 1.0));
  vec3 haloColor = mix(vec3(1.0, 0.941, 0.831), vec3(1.0, 0.839, 0.588), clamp(k / 2.85, 0.0, 1.0));
  c = mix(c, haloColor, halo * uSunDisc);
  // Disc: flat, a little warmer at the limb, with a one-pixel soft edge.
  float edge = fwidth(k) * 1.2;
  float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, k);
  vec3 discColor = mix(vec3(1.0, 0.988, 0.953), vec3(1.0, 0.965, 0.878), clamp(k, 0.0, 1.0));
  c = mix(c, discColor, disc * uSunDisc);
  fragColor = vec4(c, 1.0);
}
`;

export class Sky {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly invViewProj = new Matrix4();

  constructor() {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthWrite: false,
      uniforms: {
        uInvViewProj: { value: this.invViewProj },
        uSunRadius: { value: 1.24 },
        uSkyStops: { value: [] as Vector3[] },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uSunDisc: { value: 0 },
        uGlowColor: { value: new Vector3() },
        uGlow: { value: 0 },
        uHazeColor: { value: new Vector3() },
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = "sky";
    this.mesh.frustumCulled = false;
    // After the chart: the depth test leaves it only the empty pixels.
    this.mesh.renderOrder = 10;
  }

  applyLight(light: LightBlend): void {
    const u = this.mesh.material.uniforms;
    u.uSkyStops.value = light.skyStops;
    u.uSunDir.value = light.sunDir;
    u.uSunDisc.value = light.sunDisc;
    u.uGlowColor.value = light.glowColor;
    u.uGlow.value = light.glow;
    u.uHazeColor.value = light.haze;
  }

  update(camera: PerspectiveCamera): void {
    this.invViewProj
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
