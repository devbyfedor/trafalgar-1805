import {
  BufferAttribute,
  DynamicDrawUsage,
  FrontSide,
  type Frustum,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import type { LightBlend } from "../light/states";
import { Cdlod, patchGrid } from "./cdlod";
import type { TerrainField } from "./field";
import { TERRAIN_FRAGMENT, TERRAIN_VERTEX } from "./shaders";

/**
 * The chart's surface: land and sea in two instanced draws of one patch.
 * The CDLOD quadtree picks the patches each frame; the shaders do the rest.
 *
 * Where the chart draws water its depth is the sea's own (GLSL_SEA_DEPTH),
 * so nothing standing on the sea sinks into it. Writing a fragment's depth
 * stops the GPU from skipping hidden fragments early, and that costs most
 * where relief hides relief, inland. So the patches with no sea within
 * INLAND_MARGIN_KM (land through and through on the coarse land grid) are
 * drawn by a second material without it; the rest, the coasts and the sea,
 * keep it.
 */

const GRID = 32;
/** The quadtree's root: a square well beyond the stage, so the sea reaches the horizon. */
const ROOT_SIZE = 32768;
const MAX_DEPTH = 12;
/** A patch is inland when there is no sea within this of it (a cell of the coarse land grid). */
const INLAND_MARGIN_KM = 23;

export interface TerrainStyle {
  contourInterval: number;
  contourBlend: number;
}

export class Terrain {
  /** The coasts and the sea: the water writes the sea's depth. */
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  /** The patches inland, with no water to correct. */
  readonly inland: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly cdlod: Cdlod;
  /** Whether a square and a margin round it are all land; without it every patch is coastal. */
  allLand:
    | ((x0: number, y0: number, size: number, marginKm: number) => boolean)
    | null = null;
  private readonly nodes: InstancedBufferAttribute;
  private readonly inlandNodes: InstancedBufferAttribute;
  private readonly eye = new Vector3();

  constructor(field: TerrainField) {
    const stage = field.stage;
    const cx = stage.x + stage.z / 2;
    const cy = stage.y - stage.w / 2;
    this.cdlod = new Cdlod({
      x0: cx - ROOT_SIZE / 2,
      y0: cy - ROOT_SIZE / 2,
      size: ROOT_SIZE,
      grid: GRID,
      maxDepth: MAX_DEPTH,
    });

    const { coords, index } = patchGrid(GRID);
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(coords, 3));
    geometry.setIndex(new BufferAttribute(index, 1));
    const capacity = this.cdlod.instances.length;
    this.nodes = new InstancedBufferAttribute(new Float32Array(capacity), 4);
    this.nodes.setUsage(DynamicDrawUsage);
    geometry.setAttribute("node", this.nodes);
    geometry.instanceCount = 0;
    // The same patch (its vertex and index buffers shared) for the inland draw.
    const inlandGeometry = new InstancedBufferGeometry();
    inlandGeometry.setAttribute("position", geometry.getAttribute("position"));
    inlandGeometry.setIndex(geometry.getIndex());
    this.inlandNodes = new InstancedBufferAttribute(
      new Float32Array(capacity),
      4,
    );
    this.inlandNodes.setUsage(DynamicDrawUsage);
    inlandGeometry.setAttribute("node", this.inlandNodes);
    inlandGeometry.instanceCount = 0;

    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: TERRAIN_VERTEX,
      fragmentShader: TERRAIN_FRAGMENT,
      defines: { SEA_DEPTH: "" },
      side: FrontSide,
      uniforms: {
        ...field.uniforms,
        uGridN: { value: GRID },
        uExag: { value: 1 },
        uEye: { value: this.eye },
        uTexelKm: { value: field.texelKm },
        uDpr: { value: 1 },
        // Device pixels per radian of view, vertically.
        uPxPerRad: { value: 1000 },
        // Sky (shared chunk).
        uSkyStops: { value: [] as Vector3[] },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uSunDisc: { value: 0 },
        uGlowColor: { value: new Vector3() },
        uGlow: { value: 0 },
        uHazeColor: { value: new Vector3() },
        // Palette.
        uSeaDeep: { value: new Vector3() },
        uSeaShallow: { value: new Vector3() },
        uSeaReflect: { value: 1 },
        uPaperLow: { value: new Vector3() },
        uPaperHigh: { value: new Vector3() },
        uInk: { value: new Vector3() },
        uInkPale: { value: new Vector3() },
        uContourInk: { value: new Vector3() },
        uSunColor: { value: new Vector3() },
        uShadeColor: { value: new Vector3() },
        uReliefGain: { value: 0.5 },
        // True-scale slopes over which hill shading fades in (rise / run).
        uReliefSlope: { value: [0.002, 0.04] },
        uShadowStrength: { value: 0.5 },
        // The most exaggeration cast shadows follow.
        uShadowExag: { value: 3.5 },
        uLightDirA: { value: new Vector3(0, 0, 1) },
        uLightDirB: { value: new Vector3(0, 0, 1) },
        uLightOnA: { value: 0 },
        uLightOnB: { value: 0 },
        uLightMix: { value: 0 },
        uSlotA: { value: new Vector3() },
        uSlotB: { value: new Vector3() },
        // Chart style.
        uContourInterval: { value: 200 },
        uContourBlend: { value: 0 },
        // Waterlining (terrain/shaders.ts): spacing at the coast, CSS px;
        // where (as a share of the reach) the lines at the spacing on
        // screen give way to every other one, and how much farther each
        // coarser set reaches; the reach of the band, in spacings.
        uWaterSpacingPx: { value: 2.2 },
        uWaterOpen: { value: [0.45, 0.45] },
        uWaterReach: { value: 26 },
        // A small island far from other land (terrain/shaders.ts,
        // waterAlone): how far its window reaches past the coast distance
        // (in reaches), the share of land in it over which land stops being
        // alone (a straight coast keeps above 0.11 out to the reach), and
        // the share of the reach and of the strength its halo keeps.
        uWaterWindow: { value: 0.3 },
        uWaterAlone: { value: [0.02, 0.08] },
        uWaterAloneReach: { value: 0.55 },
        uWaterAloneStrength: { value: 0.6 },
        uIsobathDeepest: { value: 200 },
        uSmoothBias: { value: 1.5 },
        uHazeVisibility: { value: 100 },
        uStageFadeKm: { value: 900 },
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
    // The inland draw: the same shaders and uniforms, without the depth write.
    const inlandMaterial = material.clone();
    inlandMaterial.uniforms = material.uniforms;
    inlandMaterial.defines = {};
    this.inland = new Mesh(inlandGeometry, inlandMaterial);
    this.inland.frustumCulled = false;
    // Drawn first: a draw that writes its own depth can leave the GPU's
    // coarse depth test off for the draws after it.
    this.inland.renderOrder = -1;
  }

  get uniforms() {
    return this.mesh.material.uniforms;
  }

  /** Applies the blended lighting (shared Vector3s are referenced, not copied). */
  applyLight(light: LightBlend): void {
    const u = this.uniforms;
    u.uSkyStops.value = light.skyStops;
    u.uSunDir.value = light.sunDir;
    u.uSunDisc.value = light.sunDisc;
    u.uGlowColor.value = light.glowColor;
    u.uGlow.value = light.glow;
    u.uHazeColor.value = light.haze;
    u.uSeaDeep.value = light.seaDeep;
    u.uSeaShallow.value = light.seaShallow;
    u.uSeaReflect.value = light.seaReflect;
    u.uPaperLow.value = light.paperLow;
    u.uPaperHigh.value = light.paperHigh;
    u.uInk.value = light.ink;
    u.uInkPale.value = light.inkPale;
    u.uContourInk.value = light.contourInk;
    u.uSunColor.value = light.sunColor;
    u.uShadeColor.value = light.shadeColor;
    u.uReliefGain.value = light.reliefGain;
    u.uShadowStrength.value = light.shadowStrength;
    u.uLightDirA.value = light.lightDirA;
    u.uLightDirB.value = light.lightDirB;
    u.uLightOnA.value = light.lightOnA;
    u.uLightOnB.value = light.lightOnB;
    u.uLightMix.value = light.lightMix;
    u.uSlotA.value = light.slotA;
    u.uSlotB.value = light.slotB;
  }

  /** Selects the patches for this frame. */
  update(
    eye: Vector3,
    frustum: Frustum,
    exaggeration: number,
    dpr: number,
  ): void {
    this.eye.copy(eye);
    this.uniforms.uExag.value = exaggeration;
    this.uniforms.uDpr.value = dpr;
    // The highest land is under 5 km; exaggerated, scaled by sec φ ≤ 1.9.
    const maxZ = 4.9 * 1.9 * exaggeration;
    const count = this.cdlod.select(eye, frustum, maxZ);
    // Inland patches to the second draw, the rest to the first.
    const all = this.cdlod.instances;
    const coast = this.nodes.array as Float32Array;
    const inland = this.inlandNodes.array as Float32Array;
    let nc = 0;
    let ni = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 4;
      const x0 = all[o];
      const y0 = all[o + 1];
      const size = all[o + 2];
      const into =
        this.allLand?.(x0, y0, size, INLAND_MARGIN_KM) === true
          ? inland
          : coast;
      const k = (into === inland ? ni++ : nc++) * 4;
      into[k] = x0;
      into[k + 1] = y0;
      into[k + 2] = size;
      into[k + 3] = all[o + 3];
    }
    this.upload(this.mesh, this.nodes, nc);
    this.upload(this.inland, this.inlandNodes, ni);
  }

  private upload(
    mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>,
    nodes: InstancedBufferAttribute,
    n: number,
  ): void {
    mesh.geometry.instanceCount = n;
    // Nothing to upload when nothing is in view (an empty range would
    // upload the whole buffer).
    if (n === 0) return;
    nodes.clearUpdateRanges();
    nodes.addUpdateRange(0, n * 4);
    nodes.needsUpdate = true;
  }

  /** Patches drawn this frame (both draws). */
  get patches(): number {
    return (
      this.mesh.geometry.instanceCount + this.inland.geometry.instanceCount
    );
  }

  /**
   * Whether the water writes the sea's own depth (on by default; off only
   * to measure what it costs).
   */
  setSeaDepth(on: boolean): void {
    const m = this.mesh.material;
    if (on === "SEA_DEPTH" in m.defines) return;
    if (on) m.defines.SEA_DEPTH = "";
    else delete m.defines.SEA_DEPTH;
    m.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.inland.geometry.dispose();
    this.inland.material.dispose();
  }
}
