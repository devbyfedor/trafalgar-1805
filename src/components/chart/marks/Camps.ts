import {
  BufferAttribute,
  DoubleSide,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { mercatorScale, worldX, worldY } from "../geo/mercator";
import { DRAPE } from "../lettering/drape";
import type { TerrainField } from "../terrain/field";

/**
 * Army camps on the chart: huts in rows along the camp streets, as the
 * plans of the period drew a hutted camp, each hut a short ink dash lying
 * on the land in the contours' brown, draped on the relief like the
 * lettering and pulled a little toward the camera, as the ink lines are.
 *
 * A hut is a few metres long, nothing at the scale the chart is seen at,
 * so the dashes are a convention: one stands for a stretch of hut row, its
 * length a share of the camp's pitch on the chart, its stroke a pen width
 * on screen. A camp shows only while its pattern reads: once the huts of
 * a row, or its rows, close up to a few pixels on screen (seen from far
 * off or foreshortened toward the horizon) it fades, rather than turning
 * into a texture. It fades with the haze too, and a hut whose site the
 * chart draws as sea (a coarse coastline) doesn't show.
 *
 * Every hut is an instance of one quad, widened on screen around the
 * dash, so all camps are one draw call.
 */

/** A camp: its huts, and the layout they keep. */
export interface Camp {
  /** For development: whose camp, and where. */
  name: string;
  /** The direction of the camp's rows (its streets), degrees from north, clockwise. */
  bearing: number;
  /** Ground metres from one hut to the next along a row. */
  pitch: number;
  /** Ground metres from one row to the next. */
  street: number;
  /** Each hut's site, degrees: [lon, lat]. */
  huts: readonly (readonly [number, number])[];
}

/** Camps the layer can fade one by one (setCampOpacity). */
export const MAX_CAMPS = 16;
/** A hut's dash, as a share of the pitch along its row. */
const DASH = 0.56;
/** The dash's stroke, CSS px. */
const PEN_PX = 1.1;
/**
 * The band (CSS px of the pitch or the street on screen, whichever is
 * smaller) over which a camp comes in: below it the rows run together.
 */
const LEGIBLE_PX: readonly [number, number] = [2.4, 3.6];

const VERTEX = /* glsl */ `
precision highp float;
${DRAPE}
in vec4 hut;
in vec4 shape;
uniform vec2 uViewport;
uniform float uDpr;
uniform float uPen;
uniform vec2 uLegible;
uniform float uHazeVisibility;
uniform float uOpacity;
uniform float uCampOpacity[${MAX_CAMPS}];
out vec2 vLocal;
out float vHalf;
out float vPen;
out float vAlpha;

vec2 toScreen(vec4 clip) {
  return clip.xy / clip.w * 0.5 * uViewport;
}

// hut: the site (world km) and the row's direction; shape: half the dash,
// the pitch along the row and the street across it (world km), the camp.
void main() {
  vec2 site = hut.xy;
  vec2 along = hut.zw;
  vec2 across = vec2(-along.y, along.x);
  mat4 viewProj = projectionMatrix * viewMatrix;
  vec3 m = chartDrape(vec3(site, 0.0));
  vec4 cm = viewProj * vec4(m, 1.0);
  vec4 ca = viewProj * vec4(chartDrape(vec3(site - along * shape.x, 0.0)), 1.0);
  vec4 cb = viewProj * vec4(chartDrape(vec3(site + along * shape.x, 0.0)), 1.0);
  vec4 cp = viewProj * vec4(m + vec3(along * shape.y, 0.0), 1.0);
  vec4 cs = viewProj * vec4(m + vec3(across * shape.z, 0.0), 1.0);

  // The camp's pattern on screen: how far apart its huts are along a row,
  // and its rows across their own line.
  vec2 sm = toScreen(cm);
  vec2 row = toScreen(cp) - sm;
  float pitchPx = length(row);
  vec2 next = toScreen(cs) - sm;
  float streetPx = abs(row.x * next.y - row.y * next.x) / max(pitchPx, 1e-3);
  float legible = smoothstep(uLegible.x, uLegible.y, min(pitchPx, streetPx) / uDpr);
  // Not on the chart's sea, wherever its coastline is coarser than the camp.
  float inland = -sampleFieldLod(site, vec3(0.0)).y;
  float onLand = smoothstep(0.0, shape.x, inland);
  float x = length(m - cameraPosition) / uHazeVisibility;
  float alpha = uOpacity * uCampOpacity[int(shape.w)] * legible * onLand * exp(-x * x);
  if (alpha < 0.002 || min(min(ca.w, cb.w), cm.w) <= 0.0) {
    // Nothing to draw: the quad leaves the view.
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    vLocal = vec2(0.0);
    vHalf = 0.0;
    vPen = 0.0;
    vAlpha = 0.0;
    return;
  }

  // A quad round the dash, widened on screen for its pen and a pixel of
  // anti-aliasing.
  vec2 sa = toScreen(ca);
  vec2 sb = toScreen(cb);
  vec2 axis = sb - sa;
  float len = length(axis);
  vec2 t = len > 1e-3 ? axis / len : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float pen = uPen * uDpr;
  float halfLen = 0.5 * len;
  float halfWidth = 0.5 * max(pen, 1.0) + 1.0;
  vec2 local = vec2(position.x * (halfLen + 1.0), position.y * halfWidth);
  vec2 s = 0.5 * (sa + sb) + t * local.x + n * local.y;
  vec4 clip = 0.5 * (ca + cb);
  gl_Position = vec4(s / (0.5 * uViewport) * clip.w, clip.z, clip.w);
  vLocal = local;
  vHalf = halfLen;
  vPen = pen;
  vAlpha = alpha;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in vec2 vLocal;
in float vHalf;
in float vPen;
in float vAlpha;
uniform vec3 uInk;
out vec4 fragColor;

void main() {
  // A square-ended stroke; thinner than a pixel, it keeps a pixel's
  // footprint and loses ink.
  float w = max(vPen, 1.0);
  float across = min(vPen, 1.0) * clamp(0.5 * w + 0.5 - abs(vLocal.y), 0.0, 1.0);
  float along = clamp(vHalf + 0.5 - abs(vLocal.x), 0.0, 1.0);
  float a = across * along * vAlpha;
  if (a < 0.003) discard;
  fragColor = vec4(uInk, a);
}
`;

export class Camps implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  /** Huts drawn, all camps together. */
  readonly count: number;
  private readonly uniforms = {
    uExag: { value: 1 },
    uLodK: { value: 100 },
    uPull: { value: 0.004 },
    uViewport: { value: new Vector2(1, 1) },
    uDpr: { value: 1 },
    uPen: { value: PEN_PX },
    uLegible: { value: new Vector2(...LEGIBLE_PX) },
    uHazeVisibility: { value: 100 },
    uOpacity: { value: 1 },
    uCampOpacity: { value: new Array<number>(MAX_CAMPS).fill(1) },
    uInk: { value: new Vector3() },
  };

  constructor(field: TerrainField, camps: readonly Camp[]) {
    if (camps.length > MAX_CAMPS) {
      throw new Error(`camps: at most ${MAX_CAMPS}`);
    }
    const n = camps.reduce((sum, c) => sum + c.huts.length, 0);
    const hut = new Float32Array(n * 4);
    const shape = new Float32Array(n * 4);
    let i = 0;
    camps.forEach((camp, c) => {
      const b = (camp.bearing * Math.PI) / 180;
      for (const [lon, lat] of camp.huts) {
        // Ground metres to the chart's km, at the hut's latitude.
        const km = mercatorScale(lat) / 1000;
        hut.set([worldX(lon), worldY(lat), Math.sin(b), Math.cos(b)], i * 4);
        shape.set(
          [(DASH * camp.pitch * km) / 2, camp.pitch * km, camp.street * km, c],
          i * 4,
        );
        i++;
      }
    });
    this.count = n;

    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute("hut", new InstancedBufferAttribute(hut, 4));
    geometry.setAttribute("shape", new InstancedBufferAttribute(shape, 4));
    geometry.instanceCount = n;
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      // The quad is built on screen, so its winding can go either way.
      side: DoubleSide,
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        ...this.uniforms,
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = "camps";
    // Huts move in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    // On the land with the other ink, under the ships standing off it.
    this.mesh.renderOrder = 23;
    this.mesh.visible = n > 0;
  }

  /** The whole layer's opacity (0..1). */
  set opacity(value: number) {
    this.uniforms.uOpacity.value = value;
  }

  /** One camp's opacity (0..1), by its place in the list. */
  setCampOpacity(index: number, opacity: number): void {
    this.uniforms.uCampOpacity.value[index] = opacity;
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uLodK.value = frame.lodK;
    u.uViewport.value.set(frame.width, frame.height);
    u.uDpr.value = frame.dpr;
    u.uHazeVisibility.value = frame.hazeVisibility;
    u.uInk.value.copy(frame.light.contourInk);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
