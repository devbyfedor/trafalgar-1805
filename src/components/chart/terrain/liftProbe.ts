import {
  type Camera,
  Color,
  type Object3D,
  type Scene,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { Terrain } from "./Terrain";

/**
 * Development: proof that nothing standing on the sea can sink into it.
 * The terrain alone is drawn off screen, each pixel as its height above the
 * sea (Terrain.liftMaterial), and read back: every water pixel must lie at
 * sea level exactly (GLSL_SURFACE keeps any mesh triangle that holds water
 * flat), so its depth is the sea's own. Land is counted too, which shows
 * the probe sees heights at all. Call it after Chart.frame, which sets the
 * patches and uniforms for the view.
 */

export interface WaterLift {
  /** Water pixels drawn. */
  water: number;
  /** Water pixels above the sea by 0.05 m or more. */
  lifted: number;
  /** The highest water pixel above the sea, m (exaggerated, as drawn). */
  maxM: number;
  /** Where it is, device pixels from the top left. */
  at: [number, number];
  /** Land pixels above the sea. */
  landRaised: number;
  /** The first lifted water pixels (x, y pairs, device px from the top left). */
  points: number[];
}

const size = new Vector2();
const clear = new Color();

export function probeWaterLift(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  terrain: Terrain,
): WaterLift {
  renderer.getDrawingBufferSize(size);
  const w = Math.max(1, Math.floor(size.x));
  const h = Math.max(1, Math.floor(size.y));
  const target = new WebGLRenderTarget(w, h);
  const hidden: Object3D[] = [];
  for (const child of scene.children) {
    if (child === terrain.mesh || !child.visible) continue;
    child.visible = false;
    hidden.push(child);
  }
  const material = terrain.mesh.material;
  terrain.mesh.material = terrain.liftMaterial();
  const before = renderer.getRenderTarget();
  renderer.getClearColor(clear);
  const alpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(w * h * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
  } finally {
    renderer.setRenderTarget(before);
    renderer.setClearColor(clear, alpha);
    terrain.mesh.material = material;
    for (const child of hidden) child.visible = true;
    target.dispose();
  }
  const result: WaterLift = {
    water: 0,
    lifted: 0,
    maxM: 0,
    at: [-1, -1],
    landRaised: 0,
    points: [],
  };
  for (let i = 0; i < w * h; i++) {
    const g = pixels[i * 4 + 1];
    if (g === 0) continue;
    const r = pixels[i * 4];
    const b = pixels[i * 4 + 2];
    const m = r >= 7 ? r * 4 : b / 10;
    if (g < 192) {
      if (m > 0) result.landRaised++;
      continue;
    }
    result.water++;
    if (m < 0.05) continue;
    result.lifted++;
    if (result.points.length < 1000)
      result.points.push(i % w, h - 1 - Math.floor(i / w));
    if (m > result.maxM) {
      result.maxM = m;
      result.at = [i % w, h - 1 - Math.floor(i / w)];
    }
  }
  return result;
}
