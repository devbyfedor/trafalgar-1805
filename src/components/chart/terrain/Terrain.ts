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
 * The chart's surface: land and sea in one instanced draw. The CDLOD
 * quadtree picks the patches each frame; the shaders do the rest.
 */

const GRID = 32;
/** The quadtree's root: a square well beyond the stage, so the sea reaches the horizon. */
const ROOT_SIZE = 32768;
const MAX_DEPTH = 12;

export interface TerrainStyle {
  contourInterval: number;
  contourBlend: number;
}

export class Terrain {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly cdlod: Cdlod;
  private readonly nodes: InstancedBufferAttribute;
  private readonly eye = new Vector3();

  constructor(field: TerrainField, texelKm: [number, number]) {
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
    const positions = new Float32Array((coords.length / 2) * 3);
    for (let i = 0; i < coords.length / 2; i++) {
      positions[i * 3] = coords[i * 2];
      positions[i * 3 + 1] = coords[i * 2 + 1];
    }
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setIndex(new BufferAttribute(index, 1));
    this.nodes = new InstancedBufferAttribute(this.cdlod.instances, 4);
    this.nodes.setUsage(DynamicDrawUsage);
    geometry.setAttribute("node", this.nodes);
    geometry.instanceCount = 0;

    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: TERRAIN_VERTEX,
      fragmentShader: TERRAIN_FRAGMENT,
      side: FrontSide,
      uniforms: {
        ...field.uniforms,
        uGridN: { value: GRID },
        uExag: { value: 1 },
        uEye: { value: this.eye },
        uTexelKm: { value: texelKm },
        uDpr: { value: 1 },
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
        uShadowStrength: { value: 0.5 },
        uLightDirA: { value: new Vector3(0, 0, 1) },
        uLightDirB: { value: new Vector3(0, 0, 1) },
        uLightOnA: { value: 0 },
        uLightOnB: { value: 0 },
        uLightMix: { value: 0 },
        uSlotA: { value: new Vector3() },
        uSlotB: { value: new Vector3() },
        uHazeDensity: { value: 1 },
        // Chart style.
        uContourInterval: { value: 200 },
        uContourBlend: { value: 0 },
        uWaterSpacingPx: { value: 2.6 },
        uWaterBand: { value: 3 },
        uWaterExtent: { value: 30 },
        uIsobathDeepest: { value: 200 },
        uHazeNear: { value: 120 },
        uHazeScale: { value: 2.2 },
        uHazeMax: { value: 0.92 },
        uStageFadeKm: { value: 420 },
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
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
    u.uHazeDensity.value = light.hazeDensity;
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
    this.mesh.geometry.instanceCount = count;
    this.nodes.clearUpdateRanges();
    this.nodes.addUpdateRange(0, count * 4);
    this.nodes.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
