import {
  BufferAttribute,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  type Vector3,
} from "three";
import { GLSL_LINES } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import { DRAPE } from "./drape";

/**
 * Town marks, as engravers of the period drew them (docs/research/scene-02
 * /t4-chart-style.md, section 6, checked in v-t4.md): an open ring about
 * the lettering's x-height across, with a stroke about its stem weight, on
 * the town's site; a capital's ring has a dot at its centre, as on
 * Arrowsmith and Hall's plates. Each mark is a small square lying on the
 * chart, draped on the relief like the name it belongs to and sized and
 * faded with it; all of them are one draw call.
 */

export type MarkKind = "town" | "capital";

const KIND: Record<MarkKind, number> = { town: 0, capital: 1 };

/** Half the mark's square, in ems of its name. */
export const MARK_HALF_EM = 0.3;
/** The ring's outer radius, in ems (Baskervville's x-height is 0.44 em). */
export const MARK_RING_EM = 0.22;

const VERTEX = /* glsl */ `
precision highp float;
${DRAPE}
in vec4 mark;
in float kind;
out vec2 vUv;
out float vAlpha;
out float vKind;

// mark: the site (world km), half the square (km), the opacity.
void main() {
  vec3 p = vec3(mark.xy + position.xy * mark.z, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(chartDrape(p), 1.0);
  vUv = position.xy;
  vAlpha = mark.w;
  vKind = kind;
}
`;

// In units of half the square (MARK_HALF_EM ems): the ring's centre line
// and stroke, and a capital's dot.
const FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_LINES}
in vec2 vUv;
in float vAlpha;
in float vKind;
uniform vec3 uInk;
out vec4 fragColor;

const float RING = ${((MARK_RING_EM - 0.035) / MARK_HALF_EM).toFixed(4)};
const float STROKE = ${(0.07 / MARK_HALF_EM).toFixed(4)};
const float DOT = ${(0.06 / MARK_HALF_EM).toFixed(4)};

void main() {
  float r = length(vUv);
  float px = max(fwidth(r), 1e-5);
  float ring = lineCov(abs(r - RING) / px, STROKE / px);
  float centre = vKind > 0.5 ? clamp((DOT - r) / px + 0.5, 0.0, 1.0) : 0.0;
  float a = max(ring, centre) * vAlpha;
  if (a < 0.003) discard;
  fragColor = vec4(uInk, a);
}
`;

export class Marks {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly data: InstancedBufferAttribute;

  /**
   * `drape`: the lettering's drape uniforms (shared, so one update serves
   * both); `ink`: the colour, shared by reference.
   */
  constructor(
    field: TerrainField,
    kinds: readonly MarkKind[],
    drape: Record<string, { value: unknown }>,
    ink: Vector3,
  ) {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    this.data = new InstancedBufferAttribute(
      new Float32Array(kinds.length * 4),
      4,
    );
    this.data.setUsage(DynamicDrawUsage);
    geometry.setAttribute("mark", this.data);
    geometry.setAttribute(
      "kind",
      new InstancedBufferAttribute(
        Float32Array.from(kinds, (k) => KIND[k]),
        1,
      ),
    );
    geometry.instanceCount = kinds.length;
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        ...drape,
        uInk: { value: ink },
      },
    });
    this.mesh = new Mesh(geometry, material);
    // Marks move in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 29;
    this.mesh.visible = kinds.length > 0;
  }

  /** Places mark `i` at a site (world km), half its square (km) and an opacity. */
  set(i: number, x: number, y: number, halfKm: number, opacity: number): void {
    this.data.setXYZW(i, x, y, halfKm, opacity);
  }

  /** Uploads this frame's marks. */
  commit(): void {
    this.data.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
