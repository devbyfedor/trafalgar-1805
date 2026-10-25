import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  RGFormat,
  Scene,
  ShaderMaterial,
  Texture,
  UnsignedByteType,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { loadBitmap } from "../data/loaders";
import { type ChartManifest, type TileInfo, tileRect } from "../data/manifest";
import { mercatorY } from "../geo/mercator";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";

/**
 * The terrain field on the GPU. Each tile's WebP (height code in R and G,
 * coast distance in B) is decoded once by a full-screen pass into a
 * half-float texture of (height m, coast distance km, slope east, slope
 * north), mipmapped and filtered, so the chart's shaders sample real
 * heights and distances with one texture fetch per tile.
 *
 * The horizon maps are baked from the decoded heights the same way: for
 * each texel, the steepest rise of the land toward each lighting state's
 * sun azimuth, at true scale. Shadows then follow any exaggeration and sun
 * height without re-baking: a point is in shadow when exaggeration × that
 * tangent exceeds the tangent of the sun's elevation.
 *
 * Everything here is GPU state that a lost WebGL context destroys; `restore`
 * rebuilds it from the bitmaps, which are kept.
 */

interface FieldTile {
  info: TileInfo;
  bitmap: ImageBitmap;
  field: WebGLRenderTarget;
  horizon: WebGLRenderTarget;
  rect: Vector4;
  /** Horizon map scale against the tile (the overview's is baked at half size). */
  horizonScale: number;
}

/** Azimuths (radians from north, clockwise) baked into the horizon maps' R and G. */
export type HorizonAzimuths = readonly [number, number];

const VERTEX = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const DECODE = /* glsl */ `
precision highp float;
precision highp int;
uniform sampler2D uPacked;
uniform vec3 uHeightCode;
uniform vec4 uSdfCode;
uniform float uCellKm;
uniform float uMercTop;
out vec4 fragColor;

float heightAt(ivec2 p) {
  ivec2 size = textureSize(uPacked, 0);
  vec3 c = texelFetch(uPacked, clamp(p, ivec2(0), size - 1), 0).rgb;
  float code = floor(c.r * 255.0 + 0.5) * 256.0 + floor(c.g * 255.0 + 0.5);
  return uHeightCode.x * sinh(uHeightCode.y + code / 65535.0 * (uHeightCode.z - uHeightCode.y));
}

float distanceAt(ivec2 p) {
  float b = floor(texelFetch(uPacked, p, 0).b * 255.0 + 0.5);
  float s = (b - 127.5) / 127.5;
  float g = abs(s);
  float core = uSdfCode.x;
  float share = uSdfCode.y;
  float range = uSdfCode.z;
  float tail = uSdfCode.w;
  float u = g <= share
    ? g / share * core
    : core + tail * (exp((g - share) / (1.0 - share) * log(1.0 + (range - core) / tail)) - 1.0);
  return sign(s) * u * uCellKm;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float h = heightAt(p);
  // Row 0 is the northern edge.
  float yMerc = uMercTop - (float(p.y) + 0.5) * uCellKm;
  float groundM = uCellKm * 1000.0 / cosh(yMerc / 6378.137);
  float hE = max(heightAt(p + ivec2(1, 0)), 0.0);
  float hW = max(heightAt(p - ivec2(1, 0)), 0.0);
  float hN = max(heightAt(p - ivec2(0, 1)), 0.0);
  float hS = max(heightAt(p + ivec2(0, 1)), 0.0);
  vec2 slope = vec2(hE - hW, hN - hS) / (2.0 * groundM);
  fragColor = vec4(h, distanceAt(p), slope);
}
`;

const HORIZON = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
uniform vec4 uTarget;
uniform vec2 uSize;
uniform vec2 uAzimuth;
uniform float uStep0;
uniform float uGrowth;
uniform int uSteps;
uniform vec2 uTexelKm;
out vec4 fragColor;

float landAt(vec2 q, float stepKm) {
  // Far samples read coarser mip levels: an average of what lies between.
  float lodA = max(0.0, log2(stepKm / uTexelKm.x));
  float lodB = max(0.0, log2(stepKm / uTexelKm.y));
  return max(sampleFieldLod(q, lodA, lodB).x, 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = vec2(uTarget.x + uv.x * uTarget.z, uTarget.y - uv.y * uTarget.w);
  float h0 = landAt(p, 0.0);
  float sec = secLat(p.y);
  vec2 best = vec2(0.0);
  for (int a = 0; a < 2; a++) {
    vec2 dir = vec2(sin(uAzimuth[a]), cos(uAzimuth[a]));
    float s = uStep0;
    float tMax = 0.0;
    for (int i = 0; i < 72; i++) {
      if (i >= uSteps) break;
      // s is a ground distance; the map stretches it by sec φ.
      vec2 q = p + dir * s * sec;
      tMax = max(tMax, (landAt(q, s * (uGrowth - 1.0)) - h0) / (s * 1000.0));
      s *= uGrowth;
    }
    best[a] = tMax;
  }
  fragColor = vec4(sqrt(clamp(best / 0.25, 0.0, 1.0)), 0.0, 1.0);
}
`;

/** A big triangle covering the viewport, for full-screen passes. */
function fullscreenTriangle(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return geometry;
}

export class TerrainField {
  readonly uniforms = {
    uOriginMercY: { value: 0 },
    uFieldA: { value: null as Texture | null },
    uRectA: { value: new Vector4() },
    uFieldB: { value: null as Texture | null },
    uRectB: { value: new Vector4(0, 0, 1, 1) },
    uFadeB: { value: 18 },
    uHasB: { value: 0 },
    uHorizonA: { value: null as Texture | null },
    uHorizonB: { value: null as Texture | null },
  };

  private tiles: FieldTile[] = [];
  private azimuths: HorizonAzimuths = [0, 0];
  private readonly pass = new Mesh(fullscreenTriangle());
  private readonly passScene = new Scene();
  private readonly passCamera = new OrthographicCamera();
  private readonly decodeMaterial: ShaderMaterial;
  private readonly horizonMaterial: ShaderMaterial;
  /** A 1 × 1 stand-in while the detail tile is missing. */
  private readonly blank = new WebGLRenderTarget(1, 1, { type: HalfFloatType });

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly manifest: ChartManifest,
  ) {
    this.pass.frustumCulled = false;
    this.passScene.add(this.pass);
    this.uniforms.uOriginMercY.value = mercatorY(manifest.origin.lat);
    const { scale, min, max } = manifest.height;
    this.decodeMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: DECODE,
      uniforms: {
        uPacked: { value: null },
        uHeightCode: { value: [scale, min, max] },
        uSdfCode: { value: new Vector4() },
        uCellKm: { value: 1 },
        uMercTop: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.horizonMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: HORIZON,
      uniforms: {
        ...this.uniforms,
        uTarget: { value: new Vector4() },
        uSize: { value: [1, 1] },
        uAzimuth: { value: [0, 0] },
        uStep0: { value: 1 },
        uGrowth: { value: 1.1 },
        uSteps: { value: 48 },
        uTexelKm: { value: [1, 1] },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.uniforms.uFieldB.value = this.blank.texture;
    this.uniforms.uHorizonB.value = this.blank.texture;
  }

  /** World-space rectangle of the overview (the stage). */
  get stage(): Vector4 {
    return this.uniforms.uRectA.value;
  }

  /** Fetches and decodes the tiles; the overview first, so it can show alone. */
  async load(azimuths: HorizonAzimuths, signal?: AbortSignal): Promise<void> {
    this.azimuths = azimuths;
    const [overview, ...details] = this.manifest.tiles;
    const bitmaps = [overview, ...details].map((t) => loadBitmap(t.file, signal));
    for (const [i, info] of [overview, ...details].entries()) {
      const bitmap = await bitmaps[i];
      signal?.throwIfAborted();
      const tile = this.createTile(info, bitmap, i === 0 ? 0.5 : 1);
      this.tiles.push(tile);
      this.decode(tile);
      this.bind();
    }
    for (const tile of this.tiles) this.bake(tile);
  }

  /** Rebakes the shadows for other sun azimuths (lighting states). */
  setAzimuths(azimuths: HorizonAzimuths): void {
    if (azimuths[0] === this.azimuths[0] && azimuths[1] === this.azimuths[1]) return;
    this.azimuths = azimuths;
    for (const tile of this.tiles) this.bake(tile);
  }

  /** After a lost context comes back: decode and bake everything again. */
  restore(): void {
    for (const tile of this.tiles) this.decode(tile);
    for (const tile of this.tiles) this.bake(tile);
  }

  /** GPU memory held by the field, bytes (for the debug readout). */
  get gpuBytes(): number {
    let bytes = 0;
    for (const t of this.tiles) {
      bytes += t.info.cols * t.info.rows * 8 * (4 / 3);
      const h = t.horizon;
      bytes += h.width * h.height * 2 * (4 / 3);
    }
    return Math.round(bytes);
  }

  dispose(): void {
    for (const tile of this.tiles) {
      tile.field.dispose();
      tile.horizon.dispose();
      tile.bitmap.close();
    }
    this.tiles = [];
    this.blank.dispose();
    this.pass.geometry.dispose();
    this.decodeMaterial.dispose();
    this.horizonMaterial.dispose();
  }

  private createTile(info: TileInfo, bitmap: ImageBitmap, horizonScale: number): FieldTile {
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const field = new WebGLRenderTarget(info.cols, info.rows, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      generateMipmaps: true,
      depthBuffer: false,
      anisotropy,
    });
    const horizon = new WebGLRenderTarget(
      Math.round(info.cols * horizonScale),
      Math.round(info.rows * horizonScale),
      {
        type: UnsignedByteType,
        format: RGFormat,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        generateMipmaps: true,
        depthBuffer: false,
        anisotropy,
      },
    );
    return {
      info,
      bitmap,
      field,
      horizon,
      rect: new Vector4(...tileRect(info)),
      horizonScale,
    };
  }

  private run(material: ShaderMaterial, target: WebGLRenderTarget) {
    const previous = this.renderer.getRenderTarget();
    this.pass.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.passScene, this.passCamera);
    this.renderer.setRenderTarget(previous);
  }

  private decode(tile: FieldTile) {
    const packed = new Texture(tile.bitmap);
    packed.flipY = false;
    packed.generateMipmaps = false;
    packed.minFilter = NearestFilter;
    packed.magFilter = NearestFilter;
    packed.premultiplyAlpha = false;
    packed.needsUpdate = true;
    const u = this.decodeMaterial.uniforms;
    u.uPacked.value = packed;
    u.uSdfCode.value.set(
      this.manifest.sdf.core,
      this.manifest.sdf.coreShare,
      tile.info.sdfRange,
      tile.info.sdfTail,
    );
    u.uCellKm.value = tile.info.cellKm;
    u.uMercTop.value = tile.info.yTop + this.uniforms.uOriginMercY.value;
    this.run(this.decodeMaterial, tile.field);
    // The packed copy is only needed for this pass.
    packed.dispose();
    u.uPacked.value = null;
  }

  private bake(tile: FieldTile) {
    const u = this.horizonMaterial.uniforms;
    const detail = tile !== this.tiles[0];
    u.uTarget.value.copy(tile.rect);
    u.uSize.value = [tile.horizon.width, tile.horizon.height];
    u.uAzimuth.value = [this.azimuths[0], this.azimuths[1]];
    // Ground step: about half a cell near the point, growing out to a few
    // hundred kilometres, where long low-sun shadows end.
    u.uStep0.value = tile.info.cellKm * 0.5;
    u.uGrowth.value = detail ? 1.12 : 1.1;
    u.uSteps.value = detail ? 68 : 52;
    const texelB = this.tiles[1]?.info.cellKm ?? 1;
    u.uTexelKm.value = [this.tiles[0].info.cellKm, texelB];
    this.run(this.horizonMaterial, tile.horizon);
  }

  private bind() {
    const [overview, detail] = this.tiles;
    if (overview) {
      this.uniforms.uFieldA.value = overview.field.texture;
      this.uniforms.uHorizonA.value = overview.horizon.texture;
      this.uniforms.uRectA.value.copy(overview.rect);
    }
    if (detail) {
      this.uniforms.uFieldB.value = detail.field.texture;
      this.uniforms.uHorizonB.value = detail.horizon.texture;
      this.uniforms.uRectB.value.copy(detail.rect);
      this.uniforms.uHasB.value = 1;
    }
  }
}
