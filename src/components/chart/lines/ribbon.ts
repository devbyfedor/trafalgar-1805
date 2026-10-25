import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  GLSL3,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { FrameInfo } from "../engine/Chart";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import type { TerrainField } from "../terrain/field";

/**
 * Ink lines on the chart: rivers, routes, the army's march. Each polyline
 * is a triangle strip widened in screen space in the vertex shader (miter
 * joins, a pixel of room for the anti-aliased edge), so a line keeps its
 * pen width at every zoom. Lines on land read the terrain field where the
 * surface does and sit on the exaggerated relief; every line is pulled a
 * little toward the camera along its view ray, which leaves it in place on
 * screen and in front of the surface it lies on. A line can draw itself up
 * to a head (km along it), and fades with the chart's haze.
 */

export interface Polyline {
  /** Interleaved world x, y, km. */
  points: ArrayLike<number>;
  /** Pen width, CSS pixels. */
  width: number;
  /** A value per line the material can thin out by (rivers: their rank). */
  tag?: number;
}

/** Builds one geometry holding every polyline's strip. */
export function ribbonGeometry(lines: readonly Polyline[]): BufferGeometry {
  let points = 0;
  let segments = 0;
  for (const line of lines) {
    const n = line.points.length / 2;
    if (n < 2) continue;
    points += n;
    segments += n - 1;
  }
  const position = new Float32Array(points * 2 * 3);
  const prev = new Float32Array(points * 2 * 2);
  const next = new Float32Array(points * 2 * 2);
  const along = new Float32Array(points * 2);
  const width = new Float32Array(points * 2);
  const tag = new Float32Array(points * 2);
  const wide = points * 2 > 65535;
  const index = wide
    ? new Uint32Array(segments * 6)
    : new Uint16Array(segments * 6);
  let v = 0;
  let k = 0;
  for (const line of lines) {
    const xy = line.points;
    const n = xy.length / 2;
    if (n < 2) continue;
    let distance = 0;
    for (let i = 0; i < n; i++) {
      const x = xy[i * 2];
      const y = xy[i * 2 + 1];
      if (i > 0) distance += Math.hypot(x - xy[i * 2 - 2], y - xy[i * 2 - 1]);
      const p = Math.max(0, i - 1);
      const q = Math.min(n - 1, i + 1);
      for (const side of [-1, 1]) {
        position.set([x, y, side], v * 3);
        prev.set([xy[p * 2], xy[p * 2 + 1]], v * 2);
        next.set([xy[q * 2], xy[q * 2 + 1]], v * 2);
        along[v] = distance;
        width[v] = line.width;
        tag[v] = line.tag ?? 0;
        v++;
      }
      if (i < n - 1) {
        const a = v - 2;
        index.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], k);
        k += 6;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("prev", new Float32BufferAttribute(prev, 2));
  geometry.setAttribute("next", new Float32BufferAttribute(next, 2));
  geometry.setAttribute("along", new Float32BufferAttribute(along, 1));
  geometry.setAttribute("width", new Float32BufferAttribute(width, 1));
  geometry.setAttribute("tag", new Float32BufferAttribute(tag, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

const VERTEX = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
in vec2 prev;
in vec2 next;
in float along;
in float width;
in float tag;
uniform float uExag;
uniform vec3 uTexelKm;
uniform vec2 uViewport;
uniform float uLodK;
uniform float uPull;
uniform float uLift;
uniform float uDpr;
uniform float uTagLimit;
out float vAcross;
out float vAlong;
out float vWidth;
out float vDist;
out float vFade;

// A point on the relief, read where the terrain mesh reads it (its cells
// are about cellKm wide here), or on the sea surface.
vec3 lift(vec2 p, float cellKm) {
  if (uLift < 0.5) return vec3(p, 0.0);
  vec4 f = sampleFieldLod(p, max(vec3(0.0), log2(cellKm / uTexelKm)));
  float taper = smoothstep(0.0, cellKm, -f.y);
  return vec3(p, max(f.x, 0.0) * 0.001 * secLat(p.y) * uExag * taper);
}

vec2 screen(vec4 clip) {
  return clip.xy / clip.w * 0.5 * uViewport;
}

void main() {
  vec2 p = position.xy;
  float side = position.z;
  float cellKm = max(length(vec3(p - cameraPosition.xy, cameraPosition.z)) / uLodK, 1e-3);
  vec3 w = lift(p, cellKm);
  w += (cameraPosition - w) * uPull;
  mat4 viewProj = projectionMatrix * viewMatrix;
  vec4 c = viewProj * vec4(w, 1.0);
  vec4 cp = viewProj * vec4(lift(prev, cellKm), 1.0);
  vec4 cn = viewProj * vec4(lift(next, cellKm), 1.0);

  // Directions of the segments on either side, on screen; a neighbour
  // behind the camera gives none.
  vec2 s = screen(c);
  vec2 d1 = cp.w > 0.0 ? s - screen(cp) : vec2(0.0);
  vec2 d2 = cn.w > 0.0 ? screen(cn) - s : vec2(0.0);
  float l1 = length(d1);
  float l2 = length(d2);
  d1 = l1 > 1e-4 ? d1 / l1 : d2 / max(l2, 1e-4);
  d2 = l2 > 1e-4 ? d2 / l2 : d1;
  vec2 tangent = d1 + d2;
  tangent = length(tangent) > 1e-4 ? normalize(tangent) : d1;
  vec2 normal = vec2(-tangent.y, tangent.x);
  // A miter keeps the width through a bend, limited at sharp turns.
  float miter = 1.0 / max(abs(dot(normal, vec2(-d1.y, d1.x))), 0.5);

  float px = width * uDpr;
  float halfWidth = 0.5 * max(px, 1.0) + 1.0;
  c.xy += normal * side * halfWidth * miter / (0.5 * uViewport) * c.w;
  gl_Position = c;
  vAcross = side * halfWidth;
  vAlong = along;
  vWidth = px;
  vDist = length(w - cameraPosition);
  vFade = 1.0 - smoothstep(uTagLimit - 0.5, uTagLimit + 0.5, tag);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in float vAcross;
in float vAlong;
in float vWidth;
in float vDist;
in float vFade;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHead;
uniform float uHazeVisibility;
out vec4 fragColor;

void main() {
  if (vAlong > uHead) discard;
  // Lines thinner than a pixel keep a pixel's footprint and lose ink.
  float w = max(vWidth, 1.0);
  float cover = min(vWidth, 1.0) * clamp(0.5 * w + 0.5 - abs(vAcross), 0.0, 1.0);
  float x = vDist / uHazeVisibility;
  float alpha = cover * uOpacity * vFade * exp(-x * x);
  if (alpha < 0.002) discard;
  fragColor = vec4(uColor, alpha);
}
`;

export interface RibbonOptions {
  /** Lines lie on the relief (true) or on the sea surface. */
  lift: boolean;
  opacity: number;
  /** Fraction of the distance a line is pulled toward the camera. */
  pull?: number;
}

/** A material for ribbons; `update` feeds it the frame. */
export class RibbonMaterial extends ShaderMaterial {
  constructor(field: TerrainField, options: RibbonOptions) {
    super({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        uExag: { value: 1 },
        uViewport: { value: new Vector2(1, 1) },
        uLodK: { value: 100 },
        uPull: { value: options.pull ?? 0.004 },
        uLift: { value: options.lift ? 1 : 0 },
        uDpr: { value: 1 },
        uTagLimit: { value: 1e6 },
        uColor: { value: new Vector3() },
        uOpacity: { value: options.opacity },
        uHead: { value: 1e9 },
        uHazeVisibility: { value: 100 },
      },
    });
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uViewport.value.set(frame.width, frame.height);
    u.uLodK.value = frame.lodK;
    u.uDpr.value = frame.dpr;
    u.uHazeVisibility.value = frame.hazeVisibility;
  }

  /** Draws the lines only up to this distance along each, km. */
  set head(km: number) {
    this.uniforms.uHead.value = km;
  }

  /** Lines whose tag is above this fade out. */
  set tagLimit(value: number) {
    this.uniforms.uTagLimit.value = value;
  }

  get color(): Vector3 {
    return this.uniforms.uColor.value;
  }
}
