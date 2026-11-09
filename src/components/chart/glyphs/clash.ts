import {
  type Camera,
  Color,
  type Material,
  type Mesh,
  type Scene,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { Terrain } from "../terrain/Terrain";
import type { Glyphs } from "./Glyphs";

/**
 * Development and tests: proof that no ship glyph touches land or another
 * glyph in the frame last drawn. Three passes off screen at the drawing
 * buffer's size, each read back:
 *
 * 1. the terrain alone as a land mask: how much land or coastline shows in
 *    each pixel through the haze, raised land standing in front of the sea
 *    included (Terrain.landMaskMaterial);
 * 2. every glyph layer's ink, counted per pixel, with the ink that falls on
 *    land, and the wakes' ink on land (Glyphs.clashMaterials, added);
 * 3. the glyphs' ids, the largest and the smallest per pixel (MAX), so each
 *    touch and each overlap is put to its ships.
 *
 * Ink is any pixel whose drawn alpha is at least `ink` (0.1 by default:
 * faint, but there to see); land is any pixel whose land or coastline shows
 * at least as much. The glyphs are tested whole, with no depth test, so a
 * ship standing behind a hill counts as touching it. Call it right after
 * Chart.frame, which sets the patches, the glyphs' order and the uniforms.
 */

/** A glyph layer as the probe reads it. */
export interface ClashLayer {
  glyphs: Glyphs;
}

export interface ClashResult {
  /** The drawing buffer, device px. */
  width: number;
  height: number;
  /** Pixels holding any glyph's ink. */
  ink: number;
  /** Pixels showing land or coastline through the haze. */
  landShown: number;
  /** Glyph ink on land or coastline, px. */
  land: number;
  /** Pixels where the ink of two or more glyphs meets. */
  overlap: number;
  /** Wake ink on land or coastline, px. */
  wakeLand: number;
  /** Each glyph touching land: [layer, mark, px, x, y] (a pixel of it, from the top left). */
  onLand: number[][];
  /** Each pair overlapping: [layer, mark, layer, mark, px, x, y]. */
  pairs: number[][];
}

const size = new Vector2();
const clear = new Color();

/** Ids are bytes: 254 glyphs at most across the layers tested. */
const MAX_IDS = 254;

export function probeClash(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  terrain: Terrain,
  layers: readonly ClashLayer[],
  ink = 0.1,
): ClashResult {
  renderer.getDrawingBufferSize(size);
  const w = Math.max(1, Math.floor(size.x));
  const h = Math.max(1, Math.floor(size.y));
  const bases: number[] = [];
  let total = 0;
  for (const l of layers) {
    bases.push(total);
    total += l.glyphs.markCount;
  }
  if (total > MAX_IDS)
    throw new Error(`clash: ${total} glyphs, at most ${MAX_IDS}`);

  const landTarget = new WebGLRenderTarget(w, h);
  const countTarget = new WebGLRenderTarget(w, h, { depthBuffer: false });
  const idTarget = new WebGLRenderTarget(w, h, { depthBuffer: false });
  const landPx = new Uint8Array(w * h * 4);
  const countPx = new Uint8Array(w * h * 4);
  const idPx = new Uint8Array(w * h * 4);

  // Everything shown is hidden but what each pass draws, and put back.
  const shown = scene.children.filter((c) => c.visible);
  const swapped: [Mesh, Material | Material[]][] = [];
  const swap = (mesh: Mesh, material: Material) => {
    swapped.push([mesh, mesh.material]);
    mesh.material = material;
  };
  const showOnly = (objects: readonly Mesh[]) => {
    for (const c of scene.children) c.visible = false;
    for (const o of objects) o.visible = true;
  };
  const before = renderer.getRenderTarget();
  renderer.getClearColor(clear);
  const alpha = renderer.getClearAlpha();
  try {
    renderer.setClearColor(0x000000, 0);
    // 1. The land mask.
    showOnly([terrain.mesh]);
    swap(terrain.mesh, terrain.landMaskMaterial());
    renderer.setRenderTarget(landTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(landTarget, 0, 0, w, h, landPx);

    // 2. Ink, and ink on land.
    const materials = layers.map((l) => l.glyphs.clashMaterials());
    layers.forEach((l, i) => {
      const u = materials[i].uniforms;
      u.uClashLand.value = landTarget.texture;
      u.uClashInk.value = ink;
      u.uClashBase.value = bases[i];
      swap(l.glyphs.ships, materials[i].count);
      swap(l.glyphs.wakes, materials[i].wakes);
    });
    showOnly(layers.flatMap((l) => [l.glyphs.wakes, l.glyphs.ships]));
    renderer.setRenderTarget(countTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(countTarget, 0, 0, w, h, countPx);

    // 3. Ids, ships only.
    layers.forEach((l, i) => {
      l.glyphs.ships.material = materials[i].id;
    });
    showOnly(layers.map((l) => l.glyphs.ships));
    renderer.setRenderTarget(idTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(idTarget, 0, 0, w, h, idPx);
  } finally {
    renderer.setRenderTarget(before);
    renderer.setClearColor(clear, alpha);
    for (let i = swapped.length - 1; i >= 0; i--) {
      const [mesh, material] = swapped[i];
      mesh.material = material;
    }
    for (const c of scene.children) c.visible = shown.includes(c);
    for (const l of layers)
      l.glyphs.clashMaterials().uniforms.uClashLand.value = null;
    landTarget.dispose();
    countTarget.dispose();
    idTarget.dispose();
  }

  // An id back to its layer and mark (instances are drawn sorted).
  const markOf = (id: number): [number, number] => {
    let layer = layers.length - 1;
    while (layer > 0 && id < bases[layer]) layer--;
    const order = layers[layer].glyphs.drawOrder;
    return [layer, order[id - bases[layer]] ?? -1];
  };
  const inkByte = Math.ceil(ink * 255);
  const result: ClashResult = {
    width: w,
    height: h,
    ink: 0,
    landShown: 0,
    land: 0,
    overlap: 0,
    wakeLand: 0,
    onLand: [],
    pairs: [],
  };
  const onLand = new Map<number, number[]>();
  const pairs = new Map<number, number[]>();
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (landPx[o] >= inkByte) result.landShown++;
    if (countPx[o + 2] > 0) result.wakeLand++;
    const n = countPx[o];
    if (n === 0) continue;
    result.ink++;
    const hi = idPx[o] - 1;
    const lo = 254 - idPx[o + 1];
    // Read back from the bottom row up.
    const x = i % w;
    const y = h - 1 - Math.floor(i / w);
    if (countPx[o + 1] > 0) {
      result.land++;
      for (const id of n >= 2 ? [lo, hi] : [hi]) {
        const e = onLand.get(id);
        if (e) e[2]++;
        else onLand.set(id, [...markOf(id), 1, x, y]);
      }
    }
    if (n >= 2) {
      result.overlap++;
      const key = lo * 256 + hi;
      const e = pairs.get(key);
      if (e) e[4]++;
      else pairs.set(key, [...markOf(lo), ...markOf(hi), 1, x, y]);
    }
  }
  result.onLand = [...onLand.values()].sort((a, b) => b[2] - a[2]);
  result.pairs = [...pairs.values()].sort((a, b) => b[4] - a[4]);
  return result;
}
