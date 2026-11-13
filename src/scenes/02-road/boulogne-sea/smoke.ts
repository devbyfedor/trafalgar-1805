import { createRng } from "@/lib/random";

/**
 * Smoke from the camps' cooking fires, drifting with the evening breeze:
 * each plume a chain of soft puffs rising from its fire, widening and
 * thinning as it climbs, leaning away from the sea with the wind from the
 * south-west behind the eye (history notes). Drawn on a canvas at a reduced
 * resolution from one soft sprite made once, as scene 1's haze is
 * (components/fx/haze.ts); nothing is allocated per frame.
 *
 * Fires and canvas in layer units (view.ts): the canvas covers `box`.
 */

export interface Plume {
  /** The fire, layer units. */
  x: number;
  y: number;
  /** How tall the plume rises before it has thinned away, layer units. */
  rise: number;
  /** Lean per unit risen (right +), and the plume's width at its top. */
  lean: number;
  spread: number;
  /** Strength 0..1. */
  strength: number;
  seed: number;
}

const PUFFS = 26;
/** Seconds for a puff to climb the whole plume. */
const CLIMB = 24;

export class SmokeRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprite: HTMLCanvasElement;
  private readonly phase: Float32Array;
  private readonly sway: Float32Array;
  private width = 1;
  private height = 1;
  /** CSS px per layer unit, and the box's top-left in layer units. */
  private scale = 1;
  private intensity = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly plumes: readonly Plume[],
    private readonly box: readonly [number, number, number, number],
    color: string,
    private readonly resolution = 0.6,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("smoke: no 2D context");
    this.ctx = ctx;
    // One soft round puff, made once.
    this.sprite = document.createElement("canvas");
    this.sprite.width = 64;
    this.sprite.height = 64;
    const s = this.sprite.getContext("2d");
    if (s) {
      const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.45, "rgba(255,255,255,0.3)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      s.fillStyle = g;
      s.fillRect(0, 0, 64, 64);
      s.globalCompositeOperation = "source-in";
      s.fillStyle = color;
      s.fillRect(0, 0, 64, 64);
    }
    this.phase = new Float32Array(plumes.length * PUFFS);
    this.sway = new Float32Array(plumes.length * PUFFS);
    plumes.forEach((p, i) => {
      const rng = createRng(p.seed);
      for (let k = 0; k < PUFFS; k++) {
        this.phase[i * PUFFS + k] = (k + rng() * 0.6) / PUFFS;
        this.sway[i * PUFFS + k] = rng() * Math.PI * 2;
      }
    });
  }

  /** The canvas's CSS size and px per layer unit. */
  resize(cssWidth: number, cssHeight: number, pxPerUnit: number): void {
    this.width = Math.max(1, Math.round(cssWidth * this.resolution));
    this.height = Math.max(1, Math.round(cssHeight * this.resolution));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.scale = pxPerUnit * this.resolution;
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  draw(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.intensity <= 0.002) return;
    const [x0, , , y1] = this.box;
    const s = this.scale;
    for (let i = 0; i < this.plumes.length; i++) {
      const p = this.plumes[i];
      for (let k = 0; k < PUFFS; k++) {
        const j = i * PUFFS + k;
        // Each puff climbs the plume and starts again at the fire.
        const age = (time / CLIMB + this.phase[j]) % 1;
        const h = age * p.rise;
        const wind = p.lean * h * (0.6 + 0.4 * age);
        const wave =
          Math.sin(time * 0.35 + this.sway[j] + age * 5) *
          age *
          p.spread *
          0.35;
        const x = p.x + wind + wave;
        const y = p.y + h;
        const r = (1.2 + age * p.spread) * s;
        const alpha =
          p.strength * this.intensity * Math.min(1, age * 7) * (1 - age) ** 1.4;
        if (alpha < 0.004) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          this.sprite,
          (x - x0) * s - r,
          (y1 - y) * s - r,
          r * 2,
          r * 2,
        );
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** The camps' fires as the scene has them (stage A: a few at the right camp, one at the left). */
export function campPlumes(): Plume[] {
  return [
    {
      x: -560,
      y: 92,
      rise: 120,
      lean: -0.32,
      spread: 9,
      strength: 0.55,
      seed: 1,
    },
    {
      x: -455,
      y: 95,
      rise: 100,
      lean: -0.3,
      spread: 7,
      strength: 0.4,
      seed: 2,
    },
    {
      x: -760,
      y: 96,
      rise: 110,
      lean: -0.34,
      spread: 8,
      strength: 0.45,
      seed: 3,
    },
    { x: 560, y: 104, rise: 95, lean: -0.3, spread: 7, strength: 0.4, seed: 4 },
  ];
}
