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
import { highestLand, type LowresHeights, loadBitmap } from "../data/loaders";
import {
  type ChartManifest,
  type TileInfo,
  type TileRole,
  tileRect,
} from "../data/manifest";
import { SLICE_MS, Slicer } from "../engine/slice";
import { mercatorScale, mercatorY } from "../geo/mercator";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import { CoastField, type CoastTile } from "./coast";
import {
  planAlong,
  type SlotChoice,
  SlotFollower,
  SlotJudge,
  type SlotPlan,
  type SlotTile,
  type SlotView,
} from "./slot";

/**
 * The terrain field on the GPU. Each tile's WebP (height and coast distance
 * codes, scripts/data/config.ts) is decoded once by a full-screen pass into
 * a half-float texture of (height m, coast distance km, slope east, slope
 * north), mipmapped and filtered, so the chart's shaders sample real
 * heights and distances with one texture fetch per tile. Three layers: the
 * coarse surround, the overview (the stage) and a detail tile.
 *
 * Detail tiles (the Gulf of Cádiz, the Channel) share the one detail layer,
 * B in GLSL_FIELD, so the shaders cost the same however many there are.
 * Every detail tile's field, land mask and horizon map is made at load and
 * kept on the GPU; each frame the chart asks slot.ts which tile layer B
 * holds and at what weight (`focusAlong` on a flight, from the flight's
 * plan made at load; `focus` for a free camera), and this points layer B's
 * samplers at that tile's textures and cell (uTexelKm's detail entry) and
 * sets its weight, uHasB (0 the overview alone, 1 the tile in full). A
 * change of tile only re-points uniforms: no pass runs and nothing is
 * uploaded. The bound tile shows in full; the samplers move only while
 * nothing of the tile they leave can reach the screen, or at a weight of
 * nothing, so a change of tile never shows. The uniforms are shared by
 * reference with every material that reads the field, so all of them read
 * the same tile in a frame, and the CPU copy (`readBack`, terrain/coast.ts)
 * reads the same binding.
 *
 * Until a frame binds what the view needs, layer B holds the first detail
 * tile (the Gulf of Cádiz) in full.
 *
 * The horizon maps of the overview and the detail tiles are baked from the
 * decoded heights the same way: for each texel, the steepest rise of the
 * land toward each lighting state's sun azimuth, at true scale. Shadows
 * then follow any exaggeration and sun height without re-baking: a point
 * is in shadow when exaggeration × that tangent exceeds the tangent of the
 * sun's elevation. The surround, seen only from far off, casts none. Each
 * detail tile is baked with itself in layer B; the overview with the first
 * detail tile there, as it was before the tiles shared the layer (the far
 * relief the owner approved), so no map depends on what a view has bound.
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

/**
 * How many texels a band of each load pass covers (TerrainField.runBanded):
 * about 2 ms of the owner's GPU (the overview's decode ran 8 to 21 ms
 * whole, the detail tile's horizon bake, 68 steps a texel, up to 47 ms).
 */
const BAND_TEXELS = {
  decode: 200_000,
  land: 400_000,
  horizon: 40_000,
  /** readBack's: its copy out of the GPU, 1.6 MB a band. */
  encode: 400_000,
} as const;

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
    /** Layer B's weight: 0 the overview alone, 1 the bound detail tile in full. */
    uHasB: { value: 0 },
    uHorizonA: { value: null as Texture | null },
    uHorizonB: { value: null as Texture | null },
    uLandC: { value: null as Texture | null },
    uLandA: { value: null as Texture | null },
    uLandB: { value: null as Texture | null },
  };
  /** Cell sizes of the overview, the bound detail tile and the surround, km. */
  readonly texelKm = new Vector3(1, 1, 1);
  /**
   * What layer B holds for drawing: a detail tile (an index into the detail
   * tiles, in the manifest's order) and its weight (0 for none). The CPU
   * copy of the field (terrain/coast.ts) reads it too, so the glyph layout
   * keeps ships off the coast the frame draws.
   */
  readonly binding: SlotChoice = { index: -1, weight: 0 };

  private tiles: FieldTile[] = [];
  /** The detail tiles, in the manifest's order. */
  private details: FieldTile[] = [];
  /** The detail tiles as the slot judges them; empty until `measureRelief`. */
  private slotTiles: SlotTile[] = [];
  /** The rule frame by frame, for a free camera; null until `measureRelief`. */
  private follower: SlotFollower | null = null;
  /** Development: layer B held on a tile (−1 empty) at a weight, whatever the view. */
  private held: SlotChoice | null = null;
  /** The detail tile layer B's samplers point at now (a bake or the warm-up may borrow them). */
  private filled = -1;
  private readonly choice: SlotChoice = { index: -1, weight: 0 };
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
   * alone; then bakes the horizon maps, which read every layer. Every
   * detail tile is made now, whichever a view will need: a change of tile
   * later re-points uniforms only. Layer B holds the first detail tile in
   * full until a frame says otherwise.
   */
  async load(azimuths: HorizonAzimuths, signal?: AbortSignal): Promise<void> {
    this.azimuths = azimuths;
    const infos = LOAD_ORDER.flatMap((role) =>
      this.manifest.tiles.filter((t) => t.role === role),
    );
    const bitmaps = infos.map((t) => loadBitmap(t.file, signal));
    // The passes' programs compiled off the main thread while the tiles
    // load: compiled at first use, each held the main thread (and the GPU
    // process's) 15 to 43 ms waiting for its link.
    await this.compilePasses([
      this.decodeMaterial,
      this.landMaterial,
      this.horizonMaterial,
    ]);
    signal?.throwIfAborted();
    // Every pass in bands of rows, a band per idle slice (BAND_TEXELS): run
    // whole, the overview's decode held the GPU 8 to 21 ms and a horizon
    // bake up to 47 ms, while scene 1's compositor needed it every frame.
    const slicer = new Slicer(SLICE_MS, signal);
    for (const [i, info] of infos.entries()) {
      const bitmap = await bitmaps[i];
      signal?.throwIfAborted();
      const tile = this.createTile(info, bitmap);
      this.tiles.push(tile);
      await this.decode(tile, slicer);
      if (info.role === "detail") this.details.push(tile);
      else this.bind(tile);
    }
    if (this.details.length > 0) {
      this.binding.index = 0;
      this.binding.weight = 1;
    }
    await this.bakeAll(slicer);
  }

  /**
   * Gives layer B's rule (slot.ts) the height of each detail tile's land,
   * from the low-resolution grid of the highest land (which holds the
   * overview's heights, so a fifth and 100 m are added for the detail's
   * sharper peaks). The chart calls it once, after `load`.
   */
  measureRelief(low: LowresHeights): void {
    this.slotTiles = this.details.map((t) => {
      const r = t.rect;
      const highest = highestLand(
        low,
        r.x + r.z / 2,
        r.y - r.w / 2,
        Math.max(r.z, r.w) / 2,
      );
      const reliefKm =
        ((highest * 1.2 + 100) / 1000) * mercatorScale(t.info.north);
      return { rect: r, cellKm: t.info.cellKm, reliefKm };
    });
    this.follower = new SlotFollower(
      new SlotJudge(this.slotTiles, this.texelKm.x),
    );
  }

  /**
   * Gives layer B to the tile a free camera's view needs, by the rule run
   * frame by frame (slot.ts, SlotFollower), from whatever is bound now. The
   * chart calls it once a frame, after placing the camera and before its
   * layers update, with CSS pixels per radian of view (so the choice never
   * follows the quality ladder's resolution). Allocates nothing.
   */
  focus(view: SlotView): void {
    const follower = this.follower;
    if (!follower) return;
    follower.state.index = this.binding.index;
    follower.state.weight = this.binding.weight;
    const choice = follower.follow(view);
    this.apply(choice.index, choice.weight);
  }

  /**
   * As `focus`, for a camera on a flight: the tile and weight the flight's
   * plan (`planAlong`) gives at its progress p. Allocates nothing.
   */
  focusAlong(plan: SlotPlan, p: number): void {
    if (this.details.length === 0) return;
    plan.at(p, this.choice);
    this.apply(this.choice.index, this.choice.weight);
  }

  /**
   * Runs layer B's rule along a flight (slot.ts, planAlong) in idle slices:
   * `view(p)` places a camera where the flight has it at p. Null without
   * detail tiles (or before `measureRelief`). For `focusAlong`.
   */
  planAlong(
    view: (p: number) => SlotView,
    signal?: AbortSignal,
  ): Promise<SlotPlan> | null {
    if (this.slotTiles.length === 0) return null;
    // A judge of its own, so a free camera's frames may judge meanwhile.
    return planAlong(
      new SlotJudge(this.slotTiles, this.texelKm.x),
      view,
      signal,
    );
  }

  /** The detail tiles' ids, in the order the slot's indices count them. */
  get detailIds(): string[] {
    return this.details.map((t) => t.info.id);
  }

  /**
   * The warm-up (Chart.warm): points layer B at detail tile k in full, so a
   * draw samples its textures once while the chart is hidden, before any
   * view needs them; null gives layer B back to the binding.
   */
  lend(k: number | null): void {
    if (k === null) {
      this.rebind();
      return;
    }
    this.fillSlot(k);
    this.uniforms.uHasB.value = 1;
  }

  /**
   * Development (the lab's `detail` demo): holds layer B on a detail tile
   * (by id) at a weight, or empty (null), whatever the view; `undefined`
   * gives it back to the view. Applies from the next frame.
   */
  hold(id: string | null | undefined, weight = 1): void {
    if (id === undefined) {
      this.held = null;
      return;
    }
    const index =
      id === null ? -1 : this.details.findIndex((t) => t.info.id === id);
    if (id !== null && index < 0) throw new Error(`no detail tile "${id}"`);
    this.held = { index, weight: Math.min(1, Math.max(0, weight)) };
  }

  /**
   * Development: layer B now; and, as the last free-camera frame (`focus`)
   * judged them, each detail tile's claim and whether it was in sight.
   */
  get detail(): {
    tile: string | null;
    weight: number;
    held: boolean;
    claims: Record<string, number>;
    seen: Record<string, boolean>;
  } {
    const claims: Record<string, number> = {};
    const seen: Record<string, boolean> = {};
    const judge = this.follower?.judge;
    for (const [i, t] of this.details.entries()) {
      claims[t.info.id] = judge?.claims[i] ?? 0;
      seen[t.info.id] = judge?.seen[i] === 1;
    }
    const { index, weight } = this.binding;
    return {
      tile: index >= 0 ? this.details[index].info.id : null,
      weight,
      held: this.held !== null,
      claims,
      seen,
    };
  }

  /**
   * Reads every tile's coast distance and height back to the CPU once, as
   * the GPU decoded them (terrain/coast.ts), without stalling: each tile is
   * encoded as bytes by a pass and read asynchronously, in bands of rows,
   * a band per idle slice (each whole tile's copy out of the GPU had held
   * the main thread 13 to 14 ms). Every detail tile is read; the copy
   * layers them by the field's `binding`, as layer B does, so it always
   * holds the coast the frame draws.
   */
  async readBack(signal?: AbortSignal): Promise<CoastField> {
    const slicer = new Slicer(SLICE_MS, signal);
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
      await this.compilePasses([material]);
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
          const bytes = new Uint8Array(info.cols * info.rows * 4);
          const band = Math.max(1, Math.floor(BAND_TEXELS.encode / info.cols));
          target.scissorTest = true;
          for (let y = 0; y < info.rows; y += band) {
            const h = Math.min(band, info.rows - y);
            target.scissor.set(0, y, info.cols, h);
            this.run(material, target);
            await this.renderer.readRenderTargetPixelsAsync(
              target,
              0,
              y,
              info.cols,
              h,
              bytes.subarray(y * info.cols * 4, (y + h) * info.cols * 4),
            );
            await slicer.next();
          }
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
    // The detail tiles come in `this.tiles` in the order of `details`, the
    // order the binding's index counts.
    return new CoastField(tiles, this.binding);
  }

  /** Rebakes the shadows for other sun azimuths (lighting states). */
  setAzimuths(azimuths: HorizonAzimuths): void {
    if (azimuths[0] === this.azimuths[0] && azimuths[1] === this.azimuths[1])
      return;
    this.azimuths = azimuths;
    void this.bakeAll(null);
  }

  /** After a lost context comes back: decode and bake everything again, at once. */
  restore(): void {
    for (const tile of this.tiles) void this.decode(tile, null);
    void this.bakeAll(null);
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
    this.details = [];
    this.slotTiles = [];
    this.follower = null;
    this.binding.index = -1;
    this.binding.weight = 0;
    this.filled = -1;
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

  /**
   * Compiles full-screen passes' programs ahead of their first use, with
   * the parallel compile extension where there is one (three's
   * compileAsync), so no pass waits on a link.
   */
  private async compilePasses(materials: ShaderMaterial[]): Promise<void> {
    const scene = new Scene();
    for (const material of materials) {
      const mesh = new Mesh(this.pass.geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    await this.renderer.compileAsync(scene, this.passCamera);
  }

  private run(material: ShaderMaterial, target: WebGLRenderTarget) {
    const previous = this.renderer.getRenderTarget();
    this.pass.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.passScene, this.passCamera);
    this.renderer.setRenderTarget(previous);
  }

  /**
   * Runs a pass into a target, in bands of rows of about `texels` each, a
   * band per idle slice (or whole, with no slicer). The target's mipmaps
   * are made once, after the last band; its storage was made with them
   * (initRenderTarget), since three sizes it by generateMipmaps when it
   * first sets the target up.
   */
  private async runBanded(
    material: ShaderMaterial,
    target: WebGLRenderTarget,
    texels: number,
    slicer: Slicer | null,
  ): Promise<void> {
    if (!slicer) {
      this.run(material, target);
      return;
    }
    const { width, height } = target;
    const rows = Math.max(1, Math.floor(texels / width));
    const texture = target.texture;
    const mips = texture.generateMipmaps;
    this.renderer.initRenderTarget(target);
    target.scissorTest = true;
    try {
      for (let y = 0; y < height; y += rows) {
        const last = y + rows >= height;
        texture.generateMipmaps = mips && last;
        target.scissor.set(0, y, width, Math.min(rows, height - y));
        this.run(material, target);
        if (!last) await slicer.next();
      }
    } finally {
      target.scissorTest = false;
      target.scissor.set(0, 0, width, height);
      texture.generateMipmaps = mips;
    }
    await slicer.next();
  }

  private async decode(tile: FieldTile, slicer: Slicer | null) {
    const packed = new Texture(tile.bitmap);
    packed.flipY = false;
    packed.generateMipmaps = false;
    packed.minFilter = NearestFilter;
    packed.magFilter = NearestFilter;
    packed.premultiplyAlpha = false;
    packed.needsUpdate = true;
    if (slicer) {
      // The packed tile's upload, a slice of its own.
      this.renderer.initTexture(packed);
      await slicer.next();
    }
    const u = this.decodeMaterial.uniforms;
    u.uPacked.value = packed;
    u.uSdfRange.value = tile.info.sdfRange;
    u.uCellKm.value = tile.info.cellKm;
    u.uMercTop.value = tile.info.yTop + this.uniforms.uOriginMercY.value;
    await this.runBanded(
      this.decodeMaterial,
      tile.field,
      BAND_TEXELS.decode,
      slicer,
    );
    // The packed copy is only needed for this pass.
    packed.dispose();
    u.uPacked.value = null;
    const l = this.landMaterial.uniforms;
    l.uField.value = tile.field.texture;
    l.uCellKm.value = tile.info.cellKm;
    await this.runBanded(
      this.landMaterial,
      tile.land,
      BAND_TEXELS.land,
      slicer,
    );
    l.uField.value = null;
  }

  /**
   * Bakes every horizon map, then gives layer B back to the binding: the
   * bakes borrow it. Nothing draws the chart meanwhile (at load the chart
   * isn't made yet; without a slicer every pass runs before the next frame).
   */
  private async bakeAll(slicer: Slicer | null): Promise<void> {
    try {
      for (const tile of this.tiles) await this.bake(tile, slicer);
    } finally {
      this.rebind();
    }
  }

  private async bake(tile: FieldTile, slicer: Slicer | null) {
    if (!tile.horizon) return;
    const u = this.horizonMaterial.uniforms;
    const detail = tile.info.role === "detail";
    // A detail tile's rays read its own heights, then the layers below past
    // its edges; the overview's read it with the first detail tile in
    // layer B, as before the tiles shared the layer.
    if (this.details.length > 0) {
      this.fillSlot(detail ? this.details.indexOf(tile) : 0);
      this.uniforms.uHasB.value = 1;
    } else this.uniforms.uHasB.value = 0;
    u.uTarget.value.copy(tile.rect);
    u.uSize.value = [tile.horizon.width, tile.horizon.height];
    u.uAzimuth.value = [this.azimuths[0], this.azimuths[1]];
    // Ground step: about half a cell near the point, growing out to a few
    // hundred kilometres, where long low-sun shadows end.
    u.uStep0.value = tile.info.cellKm * 0.5;
    u.uGrowth.value = detail ? 1.12 : 1.1;
    u.uSteps.value = detail ? 68 : 52;
    await this.runBanded(
      this.horizonMaterial,
      tile.horizon,
      BAND_TEXELS.horizon,
      slicer,
    );
  }

  /** Binds the surround or the overview to its layer. */
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
    }
  }

  /**
   * Gives layer B to a detail tile (−1 for none) at a weight, unless it is
   * held. The rule (slot.ts) moves the samplers only while the tile they
   * leave is out of sight or at nothing; a hold moves them at once. Only
   * uniforms change: no pass, no upload.
   */
  private apply(index: number, weight: number) {
    const held = this.held;
    const i = held ? held.index : index;
    const b = this.binding;
    b.weight = i < 0 ? 0 : held ? held.weight : weight;
    if (i >= 0) b.index = i;
    if (b.index >= 0 && b.index !== this.filled) this.fillSlot(b.index);
    this.uniforms.uHasB.value = b.weight;
  }

  /** Points layer B at the binding's tile and weight again. */
  private rebind() {
    const { index, weight } = this.binding;
    if (index >= 0) this.fillSlot(index);
    this.uniforms.uHasB.value = index >= 0 ? weight : 0;
  }

  /**
   * Points layer B at detail tile k: its field, horizon map and land mask,
   * with its rectangle, distance cap and cell. Its weight, uHasB, is set
   * apart; the uniforms' objects never change, only their values.
   */
  private fillSlot(k: number) {
    const tile = this.details[k];
    const u = this.uniforms;
    u.uFieldB.value = tile.field.texture;
    u.uRectB.value.copy(tile.rect);
    u.uSatB.value = saturation(tile.info);
    if (tile.horizon) u.uHorizonB.value = tile.horizon.texture;
    u.uLandB.value = tile.land.texture;
    this.texelKm.y = tile.info.cellKm;
    this.filled = k;
  }
}
