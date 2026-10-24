import { createRng } from "@/lib/random";

/**
 * Soft drifting haze on a 2D canvas.
 *
 * - The backing store runs at a fraction of CSS resolution (soft haze looks
 *   right that way and costs a quarter of the fill).
 * - Sprites are pre-rendered once to offscreen canvases; each frame only
 *   draws them at drifting positions.
 * - Tinting is one `source-in` fill per frame from a pre-built colour table,
 *   so nothing is allocated per frame.
 * - Density and warmth come from the scroll timeline; time comes from the
 *   shared GSAP ticker.
 */

export interface HazeBand {
  /** Vertical centre of the haze band, as a fraction of the canvas height. */
  center: number;
  /** Spread of the band around its centre (fraction of height). */
  spread: number;
}

export interface HazeOptions {
  seed: number;
  count: number;
  band: HazeBand;
  /** Sprite width as a fraction of the canvas width (min, max). */
  size: readonly [number, number];
  /** Drift speed in canvas widths per second (min, max); positive drifts right. */
  drift: readonly [number, number];
  /** Peak alpha for a single sprite. */
  alpha: number;
  /** Fraction of CSS pixels used for the backing store. */
  resolution?: number;
  /** How far the band rises (fraction of height) as the haze lifts. */
  lift?: number;
  coolColor: string;
  warmColor: string;
  /** Optional horizontal weighting, e.g. denser on the left at dawn. */
  leftBias?: number;
}

const SPRITE_W = 256;
const SPRITE_H = 64;
const TINT_STEPS = 64;

function makeSprite(kind: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  // Draw a round soft blob, then stretch it horizontally into a wisp.
  ctx.save();
  ctx.scale(SPRITE_W / SPRITE_H, 1);
  const r = SPRITE_H / 2;
  const blobs =
    kind === 0
      ? [[0.5, 0.5, 1]]
      : kind === 1
        ? [
            [0.32, 0.55, 0.75],
            [0.62, 0.45, 0.9],
          ]
        : [
            [0.25, 0.5, 0.6],
            [0.5, 0.55, 0.8],
            [0.75, 0.48, 0.65],
          ];
  for (const [cx, cy, k] of blobs) {
    const x = cx * SPRITE_H;
    const y = cy * SPRITE_H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * k);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.32)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SPRITE_H, SPRITE_H);
  }
  ctx.restore();
  return canvas;
}

function parseHex(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function buildTintTable(cool: string, warm: string): string[] {
  const a = parseHex(cool);
  const b = parseHex(warm);
  const table: string[] = [];
  for (let i = 0; i <= TINT_STEPS; i++) {
    const t = i / TINT_STEPS;
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
    table.push(`rgb(${c[0]},${c[1]},${c[2]})`);
  }
  return table;
}

export class HazeRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly opts: Required<HazeOptions>;
  private readonly sprites: HTMLCanvasElement[];
  private readonly tints: string[];
  // Per-sprite parameters in typed arrays: no objects touched per frame.
  private readonly x0: Float32Array;
  private readonly y0: Float32Array;
  private readonly w: Float32Array;
  private readonly speed: Float32Array;
  private readonly alpha: Float32Array;
  private readonly threshold: Float32Array;
  private readonly kind: Uint8Array;
  private width = 0;
  private height = 0;
  private density = 1;
  private warmth = 0;
  private liftAmount = 0;

  constructor(canvas: HTMLCanvasElement, options: HazeOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.opts = {
      resolution: 0.5,
      lift: 0,
      leftBias: 0,
      ...options,
    };
    this.sprites = [makeSprite(0), makeSprite(1), makeSprite(2)];
    this.tints = buildTintTable(options.coolColor, options.warmColor);

    const n = options.count;
    this.x0 = new Float32Array(n);
    this.y0 = new Float32Array(n);
    this.w = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.threshold = new Float32Array(n);
    this.kind = new Uint8Array(n);

    const rng = createRng(options.seed);
    const { band, size, drift } = options;
    const bias = this.opts.leftBias;
    for (let i = 0; i < n; i++) {
      // Spread across 1.6 widths so sprites can wrap off both edges.
      let u = rng();
      if (bias > 0) u = u ** (1 + bias);
      this.x0[i] = u * 1.6 - 0.3;
      // Triangular distribution around the band centre.
      const v = (rng() + rng() - 1) * band.spread;
      this.y0[i] = band.center + v;
      this.w[i] = size[0] + (size[1] - size[0]) * rng();
      this.speed[i] = drift[0] + (drift[1] - drift[0]) * rng();
      this.alpha[i] = options.alpha * (0.55 + 0.45 * rng());
      // Sprites drop out one by one as density falls, so the haze breaks up
      // rather than fading uniformly.
      this.threshold[i] = rng() * 0.85;
      this.kind[i] = Math.floor(rng() * 3) % 3;
    }
  }

  /** Size in CSS pixels. Call from a ResizeObserver. */
  resize(cssWidth: number, cssHeight: number): void {
    const r = this.opts.resolution;
    const w = Math.max(1, Math.round(cssWidth * r));
    const h = Math.max(1, Math.round(cssHeight * r));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setDensity(value: number): void {
    this.density = value;
  }

  setWarmth(value: number): void {
    this.warmth = value;
  }

  /** 0 = haze at its dawn position, 1 = fully lifted. */
  setLift(value: number): void {
    this.liftAmount = value;
  }

  draw(timeSeconds: number): void {
    const ctx = this.ctx;
    if (!ctx || this.width === 0) return;
    const { width, height } = this;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    if (this.density <= 0.001) return;

    const lift = this.liftAmount * this.opts.lift;
    const n = this.x0.length;
    for (let i = 0; i < n; i++) {
      const visible = (this.density - this.threshold[i]) / 0.25;
      if (visible <= 0) continue;
      const a =
        this.alpha[i] * Math.min(1, visible) * Math.min(1, this.density * 1.4);
      if (a <= 0.004) continue;
      // Wrap the drift over 1.6 widths.
      let u = (this.x0[i] + this.speed[i] * timeSeconds + 0.3) % 1.6;
      if (u < 0) u += 1.6;
      u -= 0.3;
      const sw = this.w[i] * width;
      const sh = sw * (SPRITE_H / SPRITE_W) * 1.15;
      const x = u * width - sw / 2;
      const y = (this.y0[i] - lift) * height - sh / 2;
      ctx.globalAlpha = a;
      ctx.drawImage(this.sprites[this.kind[i]], x, y, sw, sh);
    }
    ctx.globalAlpha = 1;
    // Tint everything drawn so far, keeping its alpha.
    ctx.globalCompositeOperation = "source-in";
    const t = Math.round(Math.min(1, Math.max(0, this.warmth)) * TINT_STEPS);
    ctx.fillStyle = this.tints[t];
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  clear(): void {
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }
}
