import {
  BufferAttribute,
  type Camera,
  FloatType,
  GLSL3,
  InstancedBufferGeometry,
  NearestFilter,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { Glyphs } from "./Glyphs";
import { GLSL_GLYPH_HEIGHT } from "./height";

/**
 * What the glyph shader makes of each ship this frame, read back for tests
 * and tuning: her foot on screen (device px from the bottom left), her
 * glyph's height (device px) and how much of it shows (mode 0); how her
 * height came about (mode 1: her room in km, the height the room allows,
 * the camera's height over her distance, her height before the room); how
 * she is drawn (mode 2: her facing, -1 to 1, her cell, the cell she turns
 * into and how far); her wake and room as set (mode 3: wake, fixed room,
 * how far the coast has taken over, the room's floor in km). The probe runs the
 * glyphs' own GLSL for the same instances and uniforms, one point per
 * ship into a float texture, so what it reports is what was drawn. Used to
 * sweep the scene and find any glyph that jumps, flickers or changes size
 * from one step to the next (scripts/dev/glyph-sweep.mjs).
 */

const VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iFit;
in vec4 iForm;
in vec4 iMore;
uniform float uPull;
uniform float uCount;
uniform float uMode;
out vec4 vOut;
${GLSL_GLYPH_HEIGHT}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float lead = length(base - cameraPosition);
  vec4 parts;
  float h = glyphBerth(glyphHeightParts(iPos.xy, lead, iPos.w, iFit.xyz, parts), lead, iFit.y, iMore.x);
  vec3 foot = glyphFoot(base, iPos.z, lead, iForm.xy, h);
  vec3 w = foot + (cameraPosition - foot) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vec2 px = (clip.xy / clip.w * 0.5 + 0.5) * uViewport;
  float alpha = iStyle.z * glyphShow(lead, h, iFit.w, iFit.y);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  float facing = dot(vec2(sin(iPos.z), cos(iPos.z)), normalize(right.xy + 1e-6));
  if (uMode > 2.5) vOut = vec4(iStyle.w, iFit.x, iFit.y, iFit.z);
  else if (uMode > 1.5) vOut = vec4(facing, iStyle.x, iForm.z, iForm.w);
  else if (uMode > 0.5) vOut = parts;
  else vOut = vec4(px, h, clip.w > 0.0 ? alpha : -1.0);
  gl_Position = vec4((float(gl_InstanceID) + 0.5) / uCount * 2.0 - 1.0, 0.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in vec4 vOut;
out vec4 fragColor;
void main() {
  fragColor = vOut;
}
`;

export interface GlyphSample {
  /** Per ship, in mark order: foot x, foot y (device px), height (device px), opacity (-1 behind the camera). */
  values: Float32Array;
}

export class GlyphProbe {
  private readonly scene = new Scene();
  private readonly target: WebGLRenderTarget;
  private readonly sorted: Float32Array;
  private readonly values: Float32Array;
  private readonly material: ShaderMaterial;

  constructor(private readonly glyphs: Glyphs) {
    const n = glyphs.markCount;
    const g = new InstancedBufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
    for (const name of ["iPos", "iStyle", "iFit", "iForm", "iMore"] as const)
      g.setAttribute(name, glyphs.ships.geometry.getAttribute(name));
    g.instanceCount = n;
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...glyphs.ships.material.uniforms,
        uCount: { value: n },
        uMode: { value: 0 },
      },
    });
    const points = new Points(g, this.material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.target = new WebGLRenderTarget(Math.max(1, n), 1, {
      type: FloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
    });
    this.sorted = new Float32Array(Math.max(1, n) * 4);
    this.values = new Float32Array(Math.max(1, n) * 4);
  }

  /** Reads this frame's glyphs; call right after the chart has drawn. */
  read(renderer: WebGLRenderer, camera: Camera, mode = 0): GlyphSample {
    const n = this.glyphs.markCount;
    if (n === 0) return { values: this.values };
    const before = renderer.getRenderTarget();
    this.material.uniforms.uMode.value = mode;
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, camera);
    renderer.readRenderTargetPixels(this.target, 0, 0, n, 1, this.sorted);
    renderer.setRenderTarget(before);
    // The layer draws its ships sorted back to front: back to mark order.
    const order = this.glyphs.drawOrder;
    for (let i = 0; i < n; i++) {
      const k = order[i];
      for (let c = 0; c < 4; c++)
        this.values[k * 4 + c] = this.sorted[i * 4 + c];
    }
    return { values: this.values };
  }

  dispose(): void {
    this.target.dispose();
    for (const child of this.scene.children) {
      const p = child as Points;
      p.geometry.dispose();
      (p.material as ShaderMaterial).dispose();
    }
  }
}
