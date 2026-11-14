import { createRng } from "@/lib/random";
import { BUILD, project, viewOf } from "./scene";

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
  /** The sprite as a bitmap once made: drawn from a canvas, every puff made the browser take a snapshot of it (session 28's trace of the hold). */
  private bitmap: ImageBitmap | null = null;
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
      if (typeof createImageBitmap === "function")
        createImageBitmap(this.sprite).then(
          (b) => {
            this.bitmap = b;
          },
          () => {},
        );
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
    const sprite = this.bitmap ?? this.sprite;
    for (let i = 0; i < this.plumes.length; i++) {
      const p = this.plumes[i];
      for (let k = 0; k < PUFFS; k++) {
        const j = i * PUFFS + k;
        // Each puff climbs the plume and starts again at the fire.
        const age = (time / CLIMB + this.phase[j]) % 1;
        // The column slows as it climbs into the still evening air and
        // bends over with the breeze, then spreads flat over the plateau.
        const h = p.rise * (1 - (1 - age) ** 1.6);
        const wind = p.lean * h * (0.45 + 0.9 * age * age);
        const wave =
          Math.sin(time * 0.35 + this.sway[j] + age * 5) *
          age *
          p.spread *
          0.35;
        const x = p.x + wind + wave;
        const y = p.y + h;
        const r = (1.2 + age * p.spread) * s;
        const rx = r * (1 + age * 0.9);
        const ry = r * (1 - age * 0.3);
        const alpha =
          p.strength *
          this.intensity *
          Math.min(1, age * 10) *
          (1 - age) ** 1.4;
        if (alpha < 0.004) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite,
          (x - x0) * s - rx,
          (y1 - y) * s - ry,
          rx * 2,
          ry * 2,
        );
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** A fire on the land: metres east and north of the jetty heads, `up` metres above the sea as drawn (scene.ts VEX). */
export interface SmokeSource {
  east: number;
  north: number;
  up: number;
}

/**
 * Plumes for fires on the land (the camps' kitchens at the back of each
 * camp, a few chimneys of the lower town), placed through the painting's
 * own projection so they rise where the plates put their camps and roofs.
 * A plume rises `metres` (drawn BUILD times, as the huts are) before it has
 * thinned away, leaning `lean` units sideways per unit risen: on the
 * evening's south-west breeze the smoke streams away from the eye and to
 * the left, along the heights (history notes). The farther, the fainter.
 */
export function plumesOf(
  sources: readonly SmokeSource[],
  o: { metres: number; lean: number; strength: number; seed: number },
): Plume[] {
  const rng = createRng(o.seed);
  return sources.map((s, i) => {
    const [ahead] = viewOf(s.east, s.north);
    const [x, y] = project(s.east, s.north, s.up);
    const unit = 1000 / Math.max(1, ahead);
    const rise = o.metres * BUILD * unit * (0.8 + rng() * 0.4);
    return {
      x,
      y,
      rise,
      lean: o.lean * (0.85 + rng() * 0.3),
      spread: rise * (0.32 + rng() * 0.1),
      strength: o.strength * (0.75 + rng() * 0.25) * Math.min(1, 2200 / ahead),
      seed: o.seed * 100 + i,
    };
  });
}

/** One smoke canvas: its plumes, its box (layer units: x0, x1, y0 bottom, y1 top) and the depth it stands at among the plates. */
export interface SmokeGroup {
  id: string;
  depth: number;
  plumes: readonly Plume[];
  box: readonly [number, number, number, number];
}

/** The box that holds every puff of `plumes`, with a margin, layer units. */
function boxOf(plumes: readonly Plume[]): [number, number, number, number] {
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const p of plumes) {
    const drift = p.lean * p.rise * 1.3;
    const reach = (1.2 + p.spread) * 1.9;
    x0 = Math.min(x0, p.x + Math.min(0, drift) - reach);
    x1 = Math.max(x1, p.x + Math.max(0, drift) + reach);
    y0 = Math.min(y0, p.y - 3);
    y1 = Math.max(y1, p.y + p.rise + reach);
  }
  return [
    Math.floor(x0 / 10) * 10,
    Math.ceil(x1 / 10) * 10,
    Math.floor(y0 / 10) * 10,
    Math.ceil(y1 / 10) * 10,
  ];
}

/**
 * The painting's smoke (the brief: kitchen smoke rising and drifting with
 * the wind): the right camp's kitchens behind its crest, the left camp's
 * behind Outreau's brow, and a few chimneys of the lower town. Each group
 * stands at its own depth, so the land in front hides the fires and the
 * smoke rises from behind the skyline, and so it moves with its own land
 * through the drift. On the evening's light westerly air the smoke leans
 * away from the eye and to the left, the same way as the flags
 * (decisions.md, "One wind").
 */
export function smokeGroups(
  kitchens: readonly SmokeSource[],
  chimneys: readonly SmokeSource[],
): SmokeGroup[] {
  const north = plumesOf(
    kitchens.filter((k) => k.north > 0),
    { metres: 110, lean: -0.42, strength: 0.62, seed: 11 },
  );
  const south = plumesOf(
    kitchens.filter((k) => k.north <= 0),
    { metres: 90, lean: -0.42, strength: 0.66, seed: 23 },
  );
  const town = plumesOf(chimneys, {
    metres: 38,
    lean: -0.36,
    strength: 0.5,
    seed: 37,
  });
  return [
    // Behind the right camp's far plate (2400), in front of the hills.
    { id: "north", depth: 2600, plumes: north, box: boxOf(north) },
    // Behind the Outreau heights (2000).
    { id: "south", depth: 2050, plumes: south, box: boxOf(south) },
    // Over the lower town's near plate (1760), its chimneys showing.
    { id: "town", depth: 1759, plumes: town, box: boxOf(town) },
  ];
}
