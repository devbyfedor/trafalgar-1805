import {
  BufferAttribute,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
} from "three";

/**
 * What the chart's effects share (fx/Smoke.ts now; the night lights and the
 * signal hoists after it): the hashes their shapes come from, the quad each
 * instance is drawn on and the buffer its values are written to each frame.
 *
 * Ported from the signals branch (`worktree-wf_016f0c7a-068-2`, fx/common.ts)
 * without its ship reading: there an effect found its ship on the GPU from
 * the mark's inputs (`Glyphs.readMark`, `GLSL_FX_SHIP`), which `main`
 * replaced with the CPU glyph layout (glyphs/layout.ts); an effect now
 * stands where the layout drew its ship this frame (`Glyphs.drawn`).
 */

/**
 * GLSL: hashes for shapes. A seed is any float the scene keeps for an
 * effect's life.
 */
export const GLSL_FX = /* glsl */ `
float fxHash(uint n) {
  n = (n ^ 61u) ^ (n >> 16u);
  n *= 9u;
  n ^= n >> 4u;
  n *= 0x27d4eb2du;
  n ^= n >> 15u;
  return float(n & 0xffffu) / 65536.0;
}

// The k-th random number of a seed, 0..1.
float fxRand(float seed, int k) {
  return fxHash(floatBitsToUint(seed) * 747796405u + uint(k) * 2891336453u);
}

// Where an effect's quad goes when there is nothing to draw: out of the
// clip volume.
const vec4 FX_NOWHERE = vec4(0.0, 0.0, 2.0, 1.0);
`;

/** A number in [0, 1) from a seed and an index, the same every frame. */
export function rand(seed: number, k: number): number {
  let n =
    Math.imul(Math.floor(seed) | 0, 0x27d4eb2d) ^ Math.imul(k, 0x85ebca6b);
  n ^= n >>> 15;
  n = Math.imul(n, 0x2c1b3c6d);
  n ^= n >>> 12;
  n = Math.imul(n, 0x297a2d39);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

/**
 * A wind as the logs give it, where it blows from (degrees true), as the
 * way it blows toward on the chart: x east, y north (a unit vector).
 */
export function windToward(fromDeg: number, out: { x: number; y: number }) {
  const towards = ((fromDeg + 180) * Math.PI) / 180;
  out.x = Math.sin(towards);
  out.y = Math.cos(towards);
}

/** The quad every effect is drawn on: corners (0, 0) to (1, 1). */
export function effectQuad(): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
      3,
    ),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.instanceCount = 0;
  return g;
}

/**
 * One interleaved buffer of per-instance vec4s, written each frame and
 * uploaded as far as it is used: `names` are its attributes, in order.
 */
export class InstanceData {
  readonly array: Float32Array;
  readonly stride: number;
  private readonly buffer: InstancedInterleavedBuffer;
  /** Reused every frame: three's addUpdateRange would allocate one. */
  private readonly range = { start: 0, count: 0 };

  constructor(
    geometry: InstancedBufferGeometry,
    capacity: number,
    names: readonly string[],
  ) {
    this.stride = names.length * 4;
    this.array = new Float32Array(Math.max(1, capacity) * this.stride);
    this.buffer = new InstancedInterleavedBuffer(this.array, this.stride, 1);
    this.buffer.setUsage(DynamicDrawUsage);
    for (let i = 0; i < names.length; i++)
      geometry.setAttribute(
        names[i],
        new InterleavedBufferAttribute(this.buffer, 4, i * 4),
      );
  }

  /** Uploads the first `count` instances this frame. */
  upload(count: number): void {
    if (count <= 0) return;
    this.range.start = 0;
    this.range.count = count * this.stride;
    this.buffer.clearUpdateRanges();
    this.buffer.updateRanges.push(this.range);
    this.buffer.needsUpdate = true;
  }
}
