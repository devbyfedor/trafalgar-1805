import {
  Frustum,
  LinearSRGBColorSpace,
  type Material,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  type CameraRig,
  type ContourStyle,
  contourIntervalAt,
  exaggerationAt,
  HAZE_OPAQUE,
  hazeVisibilityAt,
} from "../camera/rig";
import { type LowresHeights, landIndex, loadLowres } from "../data/loaders";
import { type ChartManifest, loadManifest } from "../data/manifest";
import { type ClashLayer, type ClashResult, probeClash } from "../glyphs/clash";
import { LightBlend, type LightId } from "../light/states";
import { Sky } from "../sky/Sky";
import { TerrainField } from "../terrain/field";
import { probeWaterLift, type WaterLift } from "../terrain/liftProbe";
import { Terrain } from "../terrain/Terrain";
import { QUALITY_LADDER, QualityLadder, type QualityLevel } from "./quality";
import { SLICE_MS, Slicer } from "./slice";

/**
 * The chart engine: a WebGL 2 renderer, the terrain, the sky and the layers
 * a scene adds (rivers, routes, lettering, ship glyphs). It owns no loop:
 * the host calls `frame` from gsap.ticker, the page's one clock, only while
 * the chart is on screen and the tab is visible.
 */

/** What every layer sees each frame. */
export interface FrameInfo {
  camera: PerspectiveCamera;
  eye: Vector3;
  target: Vector3;
  /** Vertical exaggeration of the relief this frame. */
  exaggeration: number;
  /** Device pixels per CSS pixel in use. */
  dpr: number;
  /** Device pixels per radian of view, vertically. */
  pxPerRadian: number;
  /** The drawing buffer, device pixels. */
  width: number;
  height: number;
  /** Haze visibility distance this frame, km (see hazeVisibilityAt). */
  hazeVisibility: number;
  /**
   * The terrain's split factor: its mesh cells are about distance / lodK
   * wide, so a layer on the relief can read the field where the surface does.
   */
  lodK: number;
  time: number;
  light: LightBlend;
  effects: boolean;
}

export interface ChartLayer {
  update(frame: FrameInfo): void;
  /** Rebuild GPU state after a lost context was restored. */
  restore?(): void;
  dispose(): void;
}

export interface ChartStats {
  calls: number;
  triangles: number;
  textures: number;
  programs: number;
  quality: number;
  width: number;
  height: number;
  dpr: number;
  /** Estimated GPU memory of the chart's own textures, MB. */
  gpuMB: number;
  exaggeration: number;
  altitude: number;
  nodes: number;
}

/** Camera altitudes (km) over which cast shadows come in. */
const SHADOW_FROM_KM = 20;
const SHADOW_FULL_KM = 160;

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export interface ChartOptions {
  canvas: HTMLCanvasElement;
  /**
   * The canvas's WebGL 2 context if the host made it already, with
   * CHART_CONTEXT_ATTRIBUTES (chartContext): making one holds the main
   * thread 15 to 190 ms on the owner's GPU, so a page makes it while it
   * loads, not while it scrolls.
   */
  context?: WebGL2RenderingContext;
  /** Called when the chart can't go on (WebGL lost for good). */
  onFatal?: (reason: string) => void;
  /** Pins a quality level (lab and tests); otherwise the ladder adapts. */
  quality?: number;
  signal?: AbortSignal;
}

export class Chart {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(40, 16 / 9, 0.05, 60000);
  readonly light = new LightBlend();
  readonly eye = new Vector3();
  readonly target = new Vector3();
  readonly stats: ChartStats = {
    calls: 0,
    triangles: 0,
    textures: 0,
    programs: 0,
    quality: 0,
    width: 0,
    height: 0,
    dpr: 1,
    gpuMB: 0,
    exaggeration: 1,
    altitude: 0,
    nodes: 0,
  };

  private readonly layers: ChartLayer[] = [];
  private readonly drawingSize = new Vector2();
  private readonly terrain: Terrain;
  private readonly sky = new Sky();
  private readonly quality: QualityLadder;
  private readonly frustum = new Frustum();
  private readonly viewProj = new Matrix4();
  private readonly contours: ContourStyle = { interval: 100, blend: 0 };
  private readonly info: FrameInfo;
  private cssWidth = 1;
  private cssHeight = 1;
  private lost = false;
  private lossTimer = 0;
  private disposed = false;
  private extraGpuBytes = 0;

  static async create(options: ChartOptions): Promise<Chart> {
    const renderer = new WebGLRenderer({
      canvas: options.canvas,
      context: options.context,
      antialias: true,
      alpha: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    // Given a context, three takes its clear alpha from the context's own
    // alpha, which it always makes true: opaque, as on a context of its own.
    if (options.context) renderer.setClearAlpha(1);
    // The chart writes sRGB values straight to the canvas (shaders/common.ts):
    // no output conversion, for its own materials and for troika's text.
    renderer.outputColorSpace = LinearSRGBColorSpace;
    // Reading a program's logs waits for its link: worth it in development,
    // where a shader error must show, not in production, where each wait
    // held the main thread 15 to 43 ms while the chart loaded.
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    try {
      const ext = renderer.extensions;
      if (
        !ext.has("EXT_color_buffer_float") &&
        !ext.has("EXT_color_buffer_half_float")
      ) {
        throw new Error("half-float render targets are not supported");
      }
      const manifest = await loadManifest(options.signal);
      const field = new TerrainField(renderer, manifest);
      const [low] = await Promise.all([
        loadLowres(manifest, options.signal),
        field.load(LightBlend.AZIMUTHS, options.signal),
      ]);
      const land = await landIndex(low, options.signal);
      return new Chart(renderer, manifest, field, low, land.any, options);
    } catch (error) {
      renderer.dispose();
      throw error;
    }
  }

  private constructor(
    readonly renderer: WebGLRenderer,
    readonly manifest: ChartManifest,
    readonly field: TerrainField,
    readonly lowres: LowresHeights,
    hasLand: (
      x0: number,
      y0: number,
      size: number,
      marginKm: number,
    ) => boolean,
    private readonly options: ChartOptions,
  ) {
    this.terrain = new Terrain(field);
    this.terrain.cdlod.hasLand = hasLand;
    this.scene.add(this.terrain.mesh, this.sky.mesh);
    this.camera.up.set(0, 0, 1);
    // The canvas's own CSS size from the start, so a level forced now sizes
    // its drawing buffer as it will stay (applyQuality).
    this.cssWidth = Math.max(1, renderer.domElement.clientWidth);
    this.cssHeight = Math.max(1, renderer.domElement.clientHeight);
    this.quality = new QualityLadder((level) => this.applyQuality(level));
    if (options.quality !== undefined) this.quality.force(options.quality);
    this.info = {
      camera: this.camera,
      eye: this.eye,
      target: this.target,
      exaggeration: 1,
      dpr: 1,
      pxPerRadian: 1,
      width: 1,
      height: 1,
      hazeVisibility: 100,
      lodK: 100,
      time: 0,
      light: this.light,
      effects: true,
    };
    this.setLight("dawn", "dawn", 0);
    const canvas = renderer.domElement;
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
  }

  /** Adds a layer's objects and keeps it updated each frame. */
  add(layer: ChartLayer, ...objects: Parameters<Scene["add"]>): void {
    this.layers.push(layer);
    if (objects.length) this.scene.add(...objects);
  }

  /** GPU memory a layer holds outside three's own accounting, bytes. */
  addGpuBytes(bytes: number): void {
    this.extraGpuBytes += bytes;
  }

  /**
   * Development: every water pixel's height above the sea in the frame
   * last drawn (terrain/liftProbe.ts); none may be above it.
   */
  probeWaterLift(): WaterLift {
    return probeWaterLift(this.renderer, this.scene, this.camera, this.terrain);
  }

  /**
   * Development and tests: every glyph's ink on land or on another glyph's
   * in the frame last drawn (glyphs/clash.ts); none may be.
   */
  probeClash(layers: readonly ClashLayer[], ink?: number): ClashResult {
    return probeClash(
      this.renderer,
      this.scene,
      this.camera,
      this.terrain,
      layers,
      ink,
    );
  }

  /**
   * Measurement only: shows or hides the chart's objects of that name
   * ("terrain", "sky", "glyphs", "soundings" and so on), so a bench can time
   * a layer's share of the frame on alternate frames (engine/bench.ts).
   * Returns how many objects it found.
   */
  showNamed(name: string, shown: boolean): number {
    let found = 0;
    this.scene.traverse((object) => {
      if (object.name !== name) return;
      object.visible = shown;
      found++;
    });
    return found;
  }

  setLight(a: LightId, b: LightId, t: number): void {
    this.light.set(a, b, t);
    this.terrain.applyLight(this.light);
    this.sky.applyLight(this.light);
  }

  /** Points the camera (world km); `fov` is vertical, degrees. */
  setView(eye: Vector3, target: Vector3, fov: number): void {
    this.eye.copy(eye);
    this.target.copy(target);
    const cam = this.camera;
    cam.position.copy(eye);
    cam.lookAt(target);
    cam.fov = fov;
    // Planes follow the altitude: depth precision goes where the camera is.
    cam.near = Math.min(200, Math.max(0.02, eye.z * 0.3));
    cam.far = Math.max(45000, eye.z * 25);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /** Points the camera where a rig puts it at progress p. */
  fly(rig: CameraRig, p: number): void {
    const fov = rig.evaluate(p, this.eye, this.target);
    this.setView(this.eye, this.target, fov);
  }

  /** CSS size of the canvas. */
  resize(width: number, height: number): void {
    this.cssWidth = Math.max(1, width);
    this.cssHeight = Math.max(1, height);
    this.applyQuality(this.quality.current);
  }

  /** Renders one frame. `time` is gsap.ticker's time, seconds. */
  frame(time: number): void {
    if (this.lost || this.disposed) return;
    if (this.options.quality === undefined) this.quality.frame(time);
    const dpr = this.prepareFrame(time);

    this.renderer.render(this.scene, this.camera);

    const r = this.renderer.info;
    const s = this.stats;
    s.calls = r.render.calls;
    s.triangles = r.render.triangles;
    s.textures = r.memory.textures;
    s.programs = r.programs?.length ?? 0;
    s.quality = this.quality.level;
    s.width = this.renderer.domElement.width;
    s.height = this.renderer.domElement.height;
    s.dpr = dpr;
    s.gpuMB = Math.round((this.field.gpuBytes + this.extraGpuBytes) / 1e5) / 10;
    s.exaggeration = Math.round(this.info.exaggeration * 10) / 10;
    s.altitude = Math.round(this.eye.z * 10) / 10;
    s.nodes = this.terrain.cdlod.count;
  }

  /**
   * Everything a frame sets before it draws: the frame's information, the
   * terrain's patches and uniforms, the sky and every layer. Returns the
   * pixel ratio.
   */
  private prepareFrame(time: number): number {
    const level = this.quality.current;
    const dpr = this.renderer.getPixelRatio();
    const exaggeration = exaggerationAt(Math.max(0.05, this.eye.z));
    const info = this.info;
    info.exaggeration = exaggeration;
    info.dpr = dpr;
    info.pxPerRadian =
      (this.cssHeight * dpr) /
      (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    info.time = time;
    info.effects = level.effects;

    this.viewProj.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    this.frustum.setFromProjectionMatrix(this.viewProj);
    const visibility = hazeVisibilityAt(this.eye.z) / this.light.hazeDensity;
    const cdlod = this.terrain.cdlod;
    cdlod.setResolution(this.cssHeight * dpr, this.camera.fov, 7);
    cdlod.detailLimit = visibility * HAZE_OPAQUE;
    this.terrain.update(this.eye, this.frustum, exaggeration, dpr);
    const contours = contourIntervalAt(this.eye.z, this.contours);
    const u = this.terrain.uniforms;
    u.uPxPerRad.value = info.pxPerRadian;
    u.uHazeVisibility.value = visibility;
    u.uContourInterval.value = contours.interval;
    u.uContourBlend.value = contours.blend;
    // Cast shadows come in as the camera climbs: from a few dozen
    // kilometres the hills of a lowland would shred it into blotches under
    // a low sun, while from higher up the sierras' long shadows carry the
    // drama (the hill shading stays at every height).
    u.uShadowStrength.value = level.effects
      ? this.light.shadowStrength *
        smooth(SHADOW_FROM_KM, SHADOW_FULL_KM, this.eye.z)
      : 0;
    info.width = this.renderer.domElement.width;
    info.height = this.renderer.domElement.height;
    info.hazeVisibility = visibility;
    info.lodK = cdlod.k;
    this.sky.update(this.camera);
    for (const layer of this.layers) layer.update(info);
    return dpr;
  }

  /**
   * What the layers would see this frame, without drawing it or updating
   * them: for laying things out ahead over the scroll (the glyph layout's
   * baked tables). Call after the camera and the light are set.
   */
  peekFrame(): FrameInfo {
    const info = this.info;
    const dpr = this.renderer.getPixelRatio();
    info.exaggeration = exaggerationAt(Math.max(0.05, this.eye.z));
    info.dpr = dpr;
    info.pxPerRadian =
      (this.cssHeight * dpr) /
      (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    info.width = this.renderer.domElement.width;
    info.height = this.renderer.domElement.height;
    info.hazeVisibility = hazeVisibilityAt(this.eye.z) / this.light.hazeDensity;
    return info;
  }

  /**
   * Compiles every material and draws each object once, so the first
   * visible frame never hitches. ANGLE on Direct3D (the owner's Intel Arc)
   * finishes compiling at the first draw: on that GPU compileAsync alone
   * left 15 to 55 ms for the first frame, with the extra draw 4 to 7 ms
   * (research, three r186 notes). The host calls it while the chart is
   * still hidden, under scene 1, and draws nothing until the chart comes
   * near.
   *
   * Spread over idle slices (engine/slice.ts), since in one go the warm
   * frame was a 41 to 62 ms task while scene 1 played, and light on the
   * GPU, which scene 1 keeps busy: every texture uploaded in a slice of its
   * own; then each of the scene's objects drawn alone into a target of a
   * few pixels, its buffers uploaded and its programs finished (drawn into
   * the canvas, a slice had cost the GPU 4 to 13 ms, and each presented a
   * frame of the hidden canvas); then the canvas cleared once.
   */
  async warm(signal?: AbortSignal): Promise<void> {
    this.camera.updateMatrixWorld();
    // Every object, shown now or not: three compiles only what is visible,
    // and an object first shown mid-scene (a route in the chase) would
    // compile and upload there.
    const objects = [...this.scene.children];
    const visible = objects.map((o) => o.visible);
    const restore = () => {
      objects.forEach((o, i) => {
        o.visible = visible[i];
      });
    };
    try {
      for (const o of objects) o.visible = true;
      await this.renderer.compileAsync(this.scene, this.camera);
    } finally {
      restore();
    }
    if (this.disposed || this.lost) return;
    const slicer = new Slicer(SLICE_MS, signal);
    for (const texture of texturesOf(this.scene)) {
      this.renderer.initTexture(texture);
      await slicer.next();
      if (this.disposed || this.lost) return;
    }
    const r = this.renderer;
    // A target of a few pixels: three keys its programs as the canvas's
    // (linear output, no tone mapping), and drawing there fills nothing and
    // leaves the canvas alone, which presents a frame each time it is drawn.
    const target = new WebGLRenderTarget(4, 4, { samples: 4 });
    this.prepareFrame(0);
    try {
      r.setRenderTarget(target);
      for (const object of objects) {
        for (const o of objects) o.visible = o === object;
        r.render(this.scene, this.camera);
        await slicer.next();
        if (this.disposed || this.lost) return;
      }
    } finally {
      restore();
      r.setRenderTarget(null);
      target.dispose();
    }
    // The canvas's own buffers made once while it is hidden: a clear.
    r.clear();
    await slicer.next();
    this.quality.reset();
  }

  /** Forget frame timing after a pause (scroll out of view, hidden tab). */
  pause(): void {
    this.quality.reset();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.clearTimeout(this.lossTimer);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("webglcontextlost", this.onLost);
    canvas.removeEventListener("webglcontextrestored", this.onRestored);
    for (const layer of this.layers) layer.dispose();
    this.terrain.dispose();
    this.sky.dispose();
    this.field.dispose();
    this.renderer.dispose();
  }

  private applyQuality(level: QualityLevel) {
    const device =
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const dpr = Math.min(device, level.dpr);
    // Only when the drawing buffer's size changes, and in one step: three's
    // setPixelRatio sets the canvas's size and setSize again, and each
    // change reallocates the multisampled buffer (a 42 to 54 ms task as the
    // chart loaded). The host creates the canvas at this size to begin
    // with (chartPixelRatio), so the first call changes nothing.
    const canvas = this.renderer.domElement;
    const size = this.renderer.getSize(this.drawingSize);
    if (
      this.renderer.getPixelRatio() !== dpr ||
      size.x !== this.cssWidth ||
      size.y !== this.cssHeight ||
      canvas.width !== Math.floor(this.cssWidth * dpr) ||
      canvas.height !== Math.floor(this.cssHeight * dpr)
    )
      this.renderer.setDrawingBufferSize(this.cssWidth, this.cssHeight, dpr);
    this.camera.aspect = this.cssWidth / this.cssHeight;
    this.camera.updateProjectionMatrix();
    this.quality.reset();
  }

  private readonly onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    // A context that doesn't come back in a few seconds isn't coming back.
    this.lossTimer = window.setTimeout(
      () => this.options.onFatal?.("webgl-context-lost"),
      4000,
    );
  };

  private readonly onRestored = () => {
    window.clearTimeout(this.lossTimer);
    this.lost = false;
    this.field.restore();
    for (const layer of this.layers) layer.restore?.();
    this.quality.reset();
  };
}

export { QUALITY_LADDER };

/**
 * The textures a scene's materials sample that the renderer uploads itself
 * (not render targets', which their passes make): their maps and their
 * uniforms' values, each once.
 */
function texturesOf(scene: Scene): Texture[] {
  const found = new Set<Texture>();
  const take = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const v of value) take(v);
      return;
    }
    if (value instanceof Texture && !value.isRenderTargetTexture)
      found.add(value);
  };
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) take(value);
      const uniforms = (m as { uniforms?: Record<string, { value: unknown }> })
        .uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) take(u?.value);
    }
  });
  return [...found];
}
