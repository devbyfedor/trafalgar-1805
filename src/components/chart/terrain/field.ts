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
  RedFormat,
  RGBAFormat,
  RGFormat,
  Scene,
  ShaderMaterial,
  Texture,
  UnsignedByteType,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { loadBitmap } from "../data/loaders";
import {
  type ChartManifest,
  type TileInfo,
  type TileRole,
  tileRect,
} from "../data/manifest";
import { mercatorY } from "../geo/mercator";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import { CoastField, type CoastTile } from "./coast";

/**
 * The terrain field on the GPU. Each tile's WebP (height and coast distance
 * codes, scripts/data/config.ts) is decoded once by a full-screen pass into
 * a half-float texture of (height m, coast distance km, slope east, slope
 * north), mipmapped and filtered, so the chart's shaders sample real
 * heights and distances with one texture fetch per tile. Three layers: the
 * coarse surround, the overview (the stage) and a detail tile.
 *
 * The horizon maps of the overview and the detail tile are baked from the
 * decoded heights the same way: for each texel, the steepest rise of the
 * land toward each lighting state's sun azimuth, at true scale. Shadows
 * then follow any exaggeration and sun height without re-baking: a point
 * is in shadow when exaggeration × that tangent exceeds the tangent of the
 * sun's elevation. The surround, seen only from far off, casts none.
 *
 * Each tile also gets a land mask at half its resolution, mipmapped, so a
 * mip level is the share of land around a point at that scale (GLSL_FIELD's
 * landShare; the waterlining reads it to tell a small island far from
 * other land).
 *
 * Everything here is GPU state that a lost WebGL context destroys; `restore`
 * rebuilds it from the bitmaps, which are kept.
 */

interface FieldTile {
  info: TileInfo;
  bitmap: ImageBitmap;
  field: WebGLRenderTarget;
  horizon: WebGLRenderTarget | null;
  land: WebGLRenderTarget;
  rect: Vector4;
}

/** Azimuths (radians from north, clockwise) baked into the horizon maps' R and G. */
export type HorizonAzimuths = readonly [number, number];

/** Horizon map size against its tile (the overview's is baked at half size). */
const HORIZON_SCALE: Record<TileRole, number> = {
  surround: 0,
  overview: 0.5,
  detail: 1,
};

/** Width of the band over which a tile blends into the layer below, km. */
const FADE_KM: Record<TileRole, number> = {
  surround: 0,
  overview: 160,
  detail: 18,
};

const LOAD_ORDER: readonly TileRole[] = ["overview", "surround", "detail"];

/** Where a tile's coast distance stops (its code's range), km. */
const saturation = (info: TileInfo) => info.sdfRange * info.cellKm * 0.98;

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
uniform float uSdfRange;
uniform float uCellKm;
uniform float uMercTop;
out vec4 fragColor;

// The texel's bytes (scripts/data/config.ts, SDF_CODE): R and G's high
// nibble the 12-bit height code, B and G's low nibble the distance code.
ivec3 bytesAt(ivec2 p) {
  ivec2 size = textureSize(uPacked, 0);
  vec3 c = texelFetch(uPacked, clamp(p, ivec2(0), size - 1), 0).rgb;
  return ivec3(floor(c * 255.0 + 0.5));
}

float heightAt(ivec2 p) {
  ivec3 b = bytesAt(p);
  // The 16-bit code, centred in its 12-bit step.
  float code = float(b.r * 256 + (b.g & 0xF0) + 8);
  return uHeightCode.x * sinh(uHeightCode.y + code / 65535.0 * (uHeightCode.z - uHeightCode.y));
}

float distanceAt(ivec2 p) {
  ivec3 b = bytesAt(p);
  float code = float(b.b * 16 + (b.g & 0x0F));
  return (code / 4095.0 * 2.0 - 1.0) * uSdfRange * uCellKm;
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

const LAND = /* glsl */ `
precision highp float;
uniform sampler2D uField;
uniform float uCellKm;
out vec4 fragColor;

// A mask texel covers 2 × 2 field texels: the share of them on land, each
// anti-aliased across the coast by its distance.
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2;
  ivec2 last = textureSize(uField, 0) - 1;
  float land = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      float d = texelFetch(uField, min(p + ivec2(i, j), last), 0).y;
      land += clamp(0.5 - d / uCellKm, 0.0, 1.0);
    }
  }
  fragColor = vec4(0.25 * land, 0.0, 0.0, 1.0);
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
uniform vec3 uTexelKm;
out vec4 fragColor;

float landAt(vec2 q, float stepKm) {
  // Far samples read coarser mip levels: an average of what lies between.
  vec3 lod = max(vec3(0.0), log2(max(stepKm, 1e-3) / uTexelKm));
  return max(sampleFieldLod(q, lod).x, 0.0);
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

/**
 * A tile's field as bytes for the CPU (TerrainField.readBack): the coast
 * distance in R and G, the height in B and A, each a 16-bit code.
 */
const ENCODE = /* glsl */ `
precision highp float;
uniform sampler2D uField;
uniform float uRange;
uniform vec2 uHeights;
out vec4 fragColor;

vec2 split16(float u) {
  float code = floor(clamp(u, 0.0, 1.0) * 65535.0 + 0.5);
  float hi = floor(code / 256.0);
  return vec2(hi, code - hi * 256.0) / 255.0;
}

void main() {
  vec4 f = texelFetch(uField, ivec2(gl_FragCoord.xy), 0);
  fragColor = vec4(
    split16(f.y / (2.0 * uRange) + 0.5),
    split16((f.x - uHeights.x) / (uHeights.y - uHeights.x))
  );
}
`;

/** The heights the CPU copy spans, m (0.3 m steps). */
const CPU_HEIGHTS: readonly [number, number] = [-11000, 9000];

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
    uFieldC: { value: null as Texture | null },
    uRectC: { value: new Vector4(0, 0, 1, 1) },
    uFieldA: { value: null as Texture | null },
    uRectA: { value: new Vector4(0, 0, 1, 1) },
    uFadeA: { value: FADE_KM.overview },
    uSatA: { value: 1e4 },
    uFieldB: { value: null as Texture | null },
    uRectB: { value: new Vector4(0, 0, 1, 1) },
    uFadeB: { value: FADE_KM.detail },
    uSatB: { value: 1e4 },
    uHasB: { value: 0 },
    uHorizonA: { value: null as Texture | null },
    uHorizonB: { value: null as Texture | null },
    uLandC: { value: null as Texture | null },
    uLandA: { value: null as Texture | null },
    uLandB: { value: null as Texture | null },
  };
  /** Cell sizes of the overview, detail and surround tiles, km. */
  readonly texelKm = new Vector3(1, 1, 1);

  private tiles: FieldTile[] = [];
  private azimuths: HorizonAzimuths = [0, 0];
  private readonly pass = new Mesh(fullscreenTriangle());
  private readonly passScene = new Scene();
  private readonly passCamera = new OrthographicCamera();
  private readonly decodeMaterial: ShaderMaterial;
  private readonly landMaterial: ShaderMaterial;
  private readonly horizonMaterial: ShaderMaterial;
  /** A 1 × 1 stand-in for a layer that is missing or not loaded yet. */
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
        uSdfRange: { value: 1 },
        uCellKm: { value: 1 },
        uMercTop: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.landMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: LAND,
      uniforms: {
        uField: { value: null },
        uCellKm: { value: 1 },
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
        uTexelKm: { value: this.texelKm },
      },
      depthTest: false,
      depthWrite: false,
    });
    const blank = this.blank.texture;
    this.uniforms.uFieldC.value = blank;
    this.uniforms.uFieldA.value = blank;
    this.uniforms.uFieldB.value = blank;
    this.uniforms.uHorizonA.value = blank;
    this.uniforms.uHorizonB.value = blank;
    this.uniforms.uLandC.value = blank;
    this.uniforms.uLandA.value = blank;
    this.uniforms.uLandB.value = blank;
    const tile = (role: TileRole) =>
      manifest.tiles.find((t) => t.role === role);
    this.texelKm.set(
      tile("overview")?.cellKm ?? 1,
      tile("detail")?.cellKm ?? 1,
      tile("surround")?.cellKm ?? 1,
    );
  }

  /** World-space rectangle of the overview (the stage). */
  get stage(): Vector4 {
    const overview = this.manifest.tiles.find((t) => t.role === "overview");
    return new Vector4(...(overview ? tileRect(overview) : [0, 0, 1, 1]));
  }

  /**
   * Fetches and decodes the tiles, the overview first, so it can show
   * alone; then bakes the horizon maps, which read every layer.
   */
  async load(azimuths: HorizonAzimuths, signal?: AbortSignal): Promise<void> {
    this.azimuths = azimuths;
    const infos = LOAD_ORDER.flatMap((role) =>
      this.manifest.tiles.filter((t) => t.role === role),
    );
    const bitmaps = infos.map((t) => loadBitmap(t.file, signal));
    for (const [i, info] of infos.entries()) {
      const bitmap = await bitmaps[i];
      signal?.throwIfAborted();
      const tile = this.createTile(info, bitmap);
      this.tiles.push(tile);
      this.decode(tile);
      this.bind(tile);
    }
    for (const tile of this.tiles) this.bake(tile);
  }

  /**
   * Reads every tile's coast distance and height back to the CPU once, as
   * the GPU decoded them (terrain/coast.ts), without stalling: each tile is
   * encoded as bytes by a pass and read asynchronously.
   */
  async readBack(): Promise<CoastField> {
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: ENCODE,
      uniforms: {
        uField: { value: null },
        uRange: { value: 1 },
        uHeights: { value: [...CPU_HEIGHTS] },
      },
      depthTest: false,
      depthWrite: false,
    });
    const tiles: CoastTile[] = [];
    try {
      for (const tile of this.tiles) {
        const { info } = tile;
        const target = new WebGLRenderTarget(info.cols, info.rows, {
          type: UnsignedByteType,
          format: RGBAFormat,
          minFilter: NearestFilter,
          magFilter: NearestFilter,
          generateMipmaps: false,
          depthBuffer: false,
        });
        try {
          const range = info.sdfRange * info.cellKm;
          material.uniforms.uField.value = tile.field.texture;
          material.uniforms.uRange.value = range;
          this.run(material, target);
          const bytes = new Uint8Array(info.cols * info.rows * 4);
          await this.renderer.readRenderTargetPixelsAsync(
            target,
            0,
            0,
            info.cols,
            info.rows,
            bytes,
          );
          const [x0, yTop, width, height] = tileRect(info);
          tiles.push({
            role: info.role,
            x0,
            yTop,
            width,
            height,
            cols: info.cols,
            rows: info.rows,
            cellKm: info.cellKm,
            range,
            hMin: CPU_HEIGHTS[0],
            hMax: CPU_HEIGHTS[1],
            sat: info.role === "surround" ? 0 : saturation(info),
            fade: FADE_KM[info.role] || 1,
            bytes,
          });
        } finally {
          target.dispose();
        }
      }
    } finally {
      material.uniforms.uField.value = null;
      material.dispose();
    }
    return new CoastField(tiles);
  }

  /** Rebakes the shadows for other sun azimuths (lighting states). */
  setAzimuths(azimuths: HorizonAzimuths): void {
    if (azimuths[0] === this.azimuths[0] && azimuths[1] === this.azimuths[1])
      return;
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
      if (h) bytes += h.width * h.height * 2 * (4 / 3);
      bytes += t.land.width * t.land.height * 2 * (4 / 3);
    }
    return Math.round(bytes);
  }

  dispose(): void {
    for (const tile of this.tiles) {
      tile.field.dispose();
      tile.horizon?.dispose();
      tile.land.dispose();
      tile.bitmap.close();
    }
    this.tiles = [];
    this.blank.dispose();
    this.pass.geometry.dispose();
    this.decodeMaterial.dispose();
    this.landMaterial.dispose();
    this.horizonMaterial.dispose();
  }

  private createTile(info: TileInfo, bitmap: ImageBitmap): FieldTile {
    const anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
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
    const scale = HORIZON_SCALE[info.role];
    const horizon =
      scale > 0
        ? new WebGLRenderTarget(
            Math.round(info.cols * scale),
            Math.round(info.rows * scale),
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
          )
        : null;
    const land = new WebGLRenderTarget(
      Math.ceil(info.cols / 2),
      Math.ceil(info.rows / 2),
      {
        type: HalfFloatType,
        format: RedFormat,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        generateMipmaps: true,
        depthBuffer: false,
      },
    );
    return {
      info,
      bitmap,
      field,
      horizon,
      land,
      rect: new Vector4(...tileRect(info)),
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
    u.uSdfRange.value = tile.info.sdfRange;
    u.uCellKm.value = tile.info.cellKm;
    u.uMercTop.value = tile.info.yTop + this.uniforms.uOriginMercY.value;
    this.run(this.decodeMaterial, tile.field);
    // The packed copy is only needed for this pass.
    packed.dispose();
    u.uPacked.value = null;
    const l = this.landMaterial.uniforms;
    l.uField.value = tile.field.texture;
    l.uCellKm.value = tile.info.cellKm;
    this.run(this.landMaterial, tile.land);
    l.uField.value = null;
  }

  private bake(tile: FieldTile) {
    if (!tile.horizon) return;
    const u = this.horizonMaterial.uniforms;
    const detail = tile.info.role === "detail";
    u.uTarget.value.copy(tile.rect);
    u.uSize.value = [tile.horizon.width, tile.horizon.height];
    u.uAzimuth.value = [this.azimuths[0], this.azimuths[1]];
    // Ground step: about half a cell near the point, growing out to a few
    // hundred kilometres, where long low-sun shadows end.
    u.uStep0.value = tile.info.cellKm * 0.5;
    u.uGrowth.value = detail ? 1.12 : 1.1;
    u.uSteps.value = detail ? 68 : 52;
    this.run(this.horizonMaterial, tile.horizon);
  }

  private bind(tile: FieldTile) {
    const u = this.uniforms;
    const texture = tile.field.texture;
    switch (tile.info.role) {
      case "surround":
        u.uFieldC.value = texture;
        u.uRectC.value.copy(tile.rect);
        u.uLandC.value = tile.land.texture;
        break;
      case "overview":
        u.uFieldA.value = texture;
        u.uRectA.value.copy(tile.rect);
        u.uSatA.value = saturation(tile.info);
        if (tile.horizon) u.uHorizonA.value = tile.horizon.texture;
        u.uLandA.value = tile.land.texture;
        break;
      case "detail":
        u.uFieldB.value = texture;
        u.uRectB.value.copy(tile.rect);
        u.uSatB.value = saturation(tile.info);
        if (tile.horizon) u.uHorizonB.value = tile.horizon.texture;
        u.uLandB.value = tile.land.texture;
        u.uHasB.value = 1;
        break;
    }
  }
}
