import {
  BufferAttribute,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import type { SoundingSet, SoundingsIndex } from "../data/loaders";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { type DigitAtlas, SOUNDING_CHARS } from "./digits";

/**
 * Soundings: the depths a pilot chart of the period wrote over its shoal
 * water, in fathoms, small italic figures lying flat on the sea
 * (docs/decisions.md, "Soundings"; the data, scripts/data/lib/soundings.ts).
 * They keep one size on screen, as engraved figures do at any scale of
 * plate, and come in rank by rank as the camera comes down: a rank shows
 * once its points stand far enough apart on screen, each finer rank filling
 * between the ones above it, by the octave, as the waterlines do. They give
 * way to the waterlining's band at the shore, fade as the chart is
 * foreshortened toward the horizon and with the haze, and take the pale
 * ink of the sea's lines. Every figure of every sounding is one instance
 * of one draw.
 */

const VERTEX = /* glsl */ `
precision highp float;
in vec4 sounding;
in vec4 glyph;
uniform float uCssPerRad;
uniform float uEmPx;
uniform vec2 uShowPx;
uniform float uCoarsestKm;
uniform float uBandPx;
uniform float uHazeVisibility;
uniform float uOpacity;
uniform float uPull;
uniform vec2 uCellEm;
uniform float uBaselineEm;
uniform float uAnchorEm;
uniform float uGlyphs;
out vec2 vUv;
out float vAlpha;

// sounding: the site (world km), its distance from the coast (km), its
// rank; glyph: the figure's cell in the atlas, its centre's offset from the
// number's centre (ems), and the plate's rotation (cos, sin).
void main() {
  vec3 site = vec3(sounding.xy, 0.0);
  float dist = length(site - cameraPosition);
  float kmPerPx = dist / uCssPerRad;
  float spacingPx = uCoarsestKm * exp2(-sounding.w) / kmPerPx;
  float show = smoothstep(uShowPx.x, uShowPx.y, spacingPx);
  float band = smoothstep(0.8, 1.15, sounding.z / (uBandPx * kmPerPx));
  float haze = dist / uHazeVisibility;
  float clear = exp(-haze * haze);
  float tilt = smoothstep(0.1, 0.25, cameraPosition.z / dist);
  float a = show * band * clear * tilt * uOpacity;
  vAlpha = a;
  vUv = vec2(0.0);
  if (a < 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // The cell's corner (position in 0..1, y up) about the number's middle.
  vec2 local = vec2(
    glyph.y + (position.x - 0.5) * uCellEm.x,
    uBaselineEm - (1.0 - position.y) * uCellEm.y - uAnchorEm
  );
  vec2 turned = vec2(local.x * glyph.z - local.y * glyph.w, local.x * glyph.w + local.y * glyph.z);
  vec3 w = vec3(sounding.xy + turned * uEmPx * kmPerPx, 0.0);
  w += (cameraPosition - w) * uPull;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vUv = vec2((glyph.x + position.x) / uGlyphs, 1.0 - position.y);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uInk;
uniform float uWeight;
in vec2 vUv;
in float vAlpha;
out vec4 fragColor;

void main() {
  float sd = texture(uAtlas, vUv).r;
  float w = max(fwidth(sd), 1e-4) * 0.7;
  float edge = 0.5 - uWeight;
  float a = smoothstep(edge - w, edge + w, sd) * vAlpha;
  if (a < 0.003) discard;
  fragColor = vec4(uInk, a);
}
`;

export interface SoundingsOptions {
  /** The figures' em on screen, CSS px. */
  emPx?: number;
  /** A rank's spacing on screen (CSS px) over which it comes in. */
  showPx?: readonly [number, number];
  /** Strength of the ink (0..1). */
  opacity?: number;
  /**
   * Per detail tile, the plate's rotation, degrees anticlockwise from east
   * to the figures' baseline: chosen so the figures read upright in the
   * views of that water, and fixed on the chart, as an engraver set them.
   */
  angles?: Readonly<Record<string, number>>;
}

/** The figures' middle above the baseline, ems (old-style figures). */
const ANCHOR_EM = 0.24;

/** The text of a depth in half-fathoms: 7 → "3½". */
export function soundingText(halfFathoms: number): string {
  const whole = Math.floor(halfFathoms / 2);
  const half = halfFathoms % 2 === 1;
  return half ? (whole > 0 ? `${whole}½` : "½") : `${whole}`;
}

export class Soundings implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly ink = new Vector3();
  private readonly uniforms: Record<string, { value: unknown }>;

  constructor(
    index: SoundingsIndex,
    sets: readonly SoundingSet[],
    atlas: DigitAtlas,
    options: SoundingsOptions = {},
  ) {
    const chars = [...SOUNDING_CHARS];
    const cell = new Map(chars.map((c, i) => [c, i]));
    // One instance per figure of every sounding.
    let figures = 0;
    for (const set of sets)
      for (let i = 0; i < set.count; i++)
        figures += [...soundingText(set.points[i * 4 + 2])].length;
    const sounding = new Float32Array(figures * 4);
    const glyph = new Float32Array(figures * 4);
    let k = 0;
    for (const set of sets) {
      const angle = ((options.angles?.[set.tile] ?? 0) * Math.PI) / 180;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      for (let i = 0; i < set.count; i++) {
        const text = [...soundingText(set.points[i * 4 + 2])];
        const advances = text.map((ch) => atlas.advance[cell.get(ch) ?? 0]);
        const total = advances.reduce((sum, a) => sum + a, 0);
        let x = -total / 2;
        for (const [j, ch] of text.entries()) {
          sounding.set(
            [
              set.points[i * 4],
              set.points[i * 4 + 1],
              set.coastKm[i],
              set.points[i * 4 + 3],
            ],
            k * 4,
          );
          glyph.set([cell.get(ch) ?? 0, x + advances[j] / 2, c, s], k * 4);
          x += advances[j];
          k++;
        }
      }
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute(
      "sounding",
      new InstancedBufferAttribute(sounding, 4),
    );
    geometry.setAttribute("glyph", new InstancedBufferAttribute(glyph, 4));
    geometry.instanceCount = figures;
    this.uniforms = {
      uCssPerRad: { value: 1000 },
      uEmPx: { value: options.emPx ?? 14 },
      uShowPx: { value: [...(options.showPx ?? [55, 85])] },
      uCoarsestKm: { value: index.coarsestKm },
      // The waterlining's reach on screen, CSS px (terrain/Terrain.ts:
      // 26 spacings of 2.2 px).
      uBandPx: { value: 26 * 2.2 },
      uHazeVisibility: { value: 100 },
      uOpacity: { value: options.opacity ?? 0.75 },
      uPull: { value: 0.004 },
      uCellEm: { value: [...atlas.cellEm] },
      uBaselineEm: { value: atlas.baselineEm },
      uAnchorEm: { value: ANCHOR_EM },
      uGlyphs: { value: chars.length },
      uAtlas: { value: atlas.texture },
      uInk: { value: this.ink },
      uWeight: { value: 0.03 },
    };
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: this.uniforms,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = "soundings";
    // Placed in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    // On the chart's surface, under the routes and the ships.
    this.mesh.renderOrder = 19;
    this.mesh.visible = figures > 0;
  }

  /** How many figures the layer draws (development and tests). */
  get figures(): number {
    return this.mesh.geometry.instanceCount;
  }

  /** The strength of the ink, 0..1 (a scene can hold them back). */
  set opacity(value: number) {
    this.uniforms.uOpacity.value = value;
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uCssPerRad.value = frame.pxPerRadian / frame.dpr;
    u.uHazeVisibility.value = frame.hazeVisibility;
    this.ink.copy(frame.light.inkPale);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
