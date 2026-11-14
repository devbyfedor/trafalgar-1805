import { createRng } from "@/lib/random";

/**
 * The sun's glitter path on the water: short horizontal glints in a column
 * under the sun that widens toward the viewer, each flickering on its own
 * phase. The canvas only covers the column, at capped device resolution, so
 * the glints stay crisp while the fill stays small.
 */

export interface GlitterOptions {
  seed: number;
  count: number;
  color: string;
  /** Half-width of the column at the horizon and at the bottom, as fractions of canvas width. */
  halfWidthTop: number;
  halfWidthBottom: number;
  maxDpr?: number;
  /**
   * A faint column of brighter water under the glints, the path's own
   * sheen (Boulogne's moon path); none by default (scene 1's sun path).
   */
  sheen?: { color: string; alpha: number };
}

export class GlitterRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly opts: Required<GlitterOptions>;
  private readonly u: Float32Array;
  private readonly v: Float32Array;
  private readonly len: Float32Array;
  private readonly freq: Float32Array;
  private readonly phase: Float32Array;
  private readonly gain: Float32Array;
  private width = 0;
  private height = 0;
  private scale = 1;
  private intensity = 0;

  constructor(canvas: HTMLCanvasElement, options: GlitterOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.opts = {
      maxDpr: 1.5,
      sheen: undefined,
      ...options,
    } as Required<GlitterOptions>;
    const n = options.count;
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.len = new Float32Array(n);
    this.freq = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.gain = new Float32Array(n);
    const rng = createRng(options.seed);
    for (let i = 0; i < n; i++) {
      // Denser near the horizon, where the path is brightest for a low sun.
      const v = rng() ** 1.7;
      this.v[i] = v;
      // Concentrated toward the column's centre line.
      this.u[i] = (rng() + rng() + rng() - 1.5) / 1.5;
      this.len[i] = 0.35 + rng() * 0.65;
      this.freq[i] = 1.4 + rng() * 3.2;
      this.phase[i] = rng() * Math.PI * 2;
      this.gain[i] = 0.5 + rng() * 0.5;
    }
  }

  resize(cssWidth: number, cssHeight: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    this.scale = dpr;
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  draw(timeSeconds: number): void {
    const ctx = this.ctx;
    if (!ctx || this.width === 0) return;
    const { width, height, scale } = this;
    ctx.clearRect(0, 0, width, height);
    if (this.intensity <= 0.002) return;
    const cx = width / 2;
    const { halfWidthTop, halfWidthBottom, sheen } = this.opts;
    if (sheen) {
      // A soft column, brightest at the far water and narrowest there,
      // broken across by a slow ripple.
      const rows = 24;
      for (let r = 0; r < rows; r++) {
        const v0 = r / rows;
        const v1 = (r + 1) / rows;
        const half =
          (halfWidthTop + (halfWidthBottom - halfWidthTop) * v0 ** 0.85) *
          width *
          0.55;
        const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
        const a =
          sheen.alpha *
          this.intensity *
          (1 - v0 * 0.7) *
          (0.75 + 0.25 * Math.sin(timeSeconds * 0.9 + r * 1.7));
        g.addColorStop(0, `${sheen.color}00`);
        g.addColorStop(0.5, sheen.color);
        g.addColorStop(1, `${sheen.color}00`);
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = g;
        ctx.fillRect(cx - half, v0 * height, half * 2, (v1 - v0) * height);
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = this.opts.color;
    const n = this.u.length;
    for (let i = 0; i < n; i++) {
      const s = Math.sin(timeSeconds * this.freq[i] + this.phase[i]);
      if (s <= 0.35) continue;
      const flicker = (s - 0.35) / 0.65;
      const v = this.v[i];
      const half =
        (halfWidthTop + (halfWidthBottom - halfWidthTop) * v ** 0.85) * width;
      const x = cx + this.u[i] * half;
      const y = v * height;
      // Glints grow toward the viewer.
      const w = (2 + v * 22) * this.len[i] * scale;
      const h = Math.max(1, (0.6 + v * 1.6) * scale);
      // Fade along the column and toward its edges.
      const edge = 1 - Math.abs(this.u[i]) ** 2;
      const along = 1 - v * 0.55;
      ctx.globalAlpha = Math.min(
        1,
        this.intensity * flicker * flicker * edge * along * this.gain[i],
      );
      ctx.fillRect(x - w / 2, y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }
}
