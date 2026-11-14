import { createRng, rgba } from "./kit";
import type { Plate, PlateCanvas, PlateJob } from "./plate";

/**
 * The lights that come up at dusk (docs/scene-02-boulogne-brief.md,
 * "Concept": "the light cools and dims, fires and lit windows come up in
 * the camps"): windows and doors in the town and the huts, the camps'
 * kitchen fires glowing behind the crests, the lamps round Napoleon's
 * pavilion. No lights on the craft: none are recorded (flotilla-check.md,
 * 2.11).
 *
 * An area's painter records its light sites while it paints its colour
 * raster, through `PlateCanvas.lights`, in paint order with what hides
 * them: every shape it lays over earlier ones (a nearer house, a hut, a
 * tier of ground) as an occluder. A lights plate stands just in front of
 * its area's plate and paints, in its dusk raster, the sites of its bank
 * with every later occluder cut out of them, so a light never shows
 * through a nearer roof or crest. Its raster comes in by opacity over its
 * stretch of the hold (paint/dusk.ts), the banks one after another.
 */

export type LightKind = "window" | "door" | "fire" | "lamp";

/** A light, layer units: a window's or door's opening (x, y its bottom left), a fire's or lamp's centre (w its glow's radius). */
export interface LightSite {
  kind: LightKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** For the bank and whether it is lit at all. */
  seed: number;
}

type Event = { site: LightSite } | { occluder: Path2D };

/** What an area's painter records during its colour pass. */
export class LightSink {
  readonly events: Event[] = [];
  add(site: LightSite): void {
    this.events.push({ site });
  }
  /** A shape laid over what came before: it hides the lights recorded so far. */
  occlude(shape: Path2D | readonly (readonly [number, number])[]): void {
    let path: Path2D;
    if (shape instanceof Path2D) path = shape;
    else {
      path = new Path2D();
      shape.forEach(([x, y], i) => {
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
    }
    this.events.push({ occluder: path });
  }
  clear(): void {
    this.events.length = 0;
  }
}

const SINKS = new Map<string, LightSink>();

/** The sink of an area's plate (made on first use; cleared before each of its colour passes). */
export function lightSink(plateId: string): LightSink {
  let s = SINKS.get(plateId);
  if (!s) {
    s = new LightSink();
    SINKS.set(plateId, s);
  }
  return s;
}

/** How many of each kind are lit at dusk (a share of the recorded sites). */
const LIT: Record<LightKind, number> = {
  window: 0.2,
  door: 0.45,
  fire: 1,
  lamp: 1,
};

function hash01(k: number): number {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Device px at least for a light's core, so a lit window 3 km off still reads as a point. */
const CORE_PX = 1.3;

function paintSite(c: PlateCanvas, s: LightSite, rng: () => number): void {
  const { ctx } = c;
  const min = c.pen(CORE_PX);
  if (s.kind === "fire") {
    // A kitchen's fire behind a crest or a hut: the glow on the smoke and
    // the air over it, orange, soft; a hot core where it shows.
    const r = s.w;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, rgba("#ffb257", 0.55));
    g.addColorStop(0.3, rgba("#f08a3a", 0.26));
    g.addColorStop(1, rgba("#c45a2a", 0));
    ctx.fillStyle = g;
    ctx.fillRect(s.x - r, s.y - r, 2 * r, 2 * r);
    return;
  }
  const w = Math.max(min, s.w);
  const h = Math.max(min, s.h);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  // The glow round it in the dusk air (painted, not a bloom).
  const r = Math.max(w, h) * (s.kind === "lamp" ? 2.6 : 2) + c.pen(2.2);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const warm = s.kind === "lamp" ? "#ffd27e" : "#ffb860";
  g.addColorStop(0, rgba(warm, s.kind === "lamp" ? 0.42 : 0.3));
  g.addColorStop(1, rgba(warm, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  // The opening itself: candle and hearth light, a little uneven.
  const tone = rng();
  ctx.fillStyle =
    s.kind === "lamp"
      ? "#fff0c4"
      : tone < 0.3
        ? "#ffd99a"
        : tone < 0.75
          ? "#ffc979"
          : "#f6b466";
  ctx.globalAlpha = s.kind === "door" ? 0.82 : 0.94;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.globalAlpha = 1;
}

/**
 * The dusk job of a lights plate: the source's sites of `bank` (of
 * `banks`; fires in their own bank, -1) painted, each later occluder cut
 * out of what is painted so far.
 */
function lightsJob(source: string, bank: number, banks: number): PlateJob {
  return (c) => {
    const { ctx } = c;
    const rng = createRng(4711 + bank);
    for (const e of lightSink(source).events) {
      if ("occluder" in e) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fill(e.occluder);
        ctx.globalCompositeOperation = "source-over";
        continue;
      }
      const s = e.site;
      if (hash01(s.seed) >= LIT[s.kind]) continue;
      const mine =
        s.kind === "fire"
          ? bank === -1
          : bank >= 0 && Math.floor(hash01(s.seed * 7.31 + 3) * banks) === bank;
      if (mine) paintSite(c, s, rng);
    }
  };
}

/** The lights of an area's plate, how they come up. */
export interface LightsSpec {
  /** Banks of windows, doors and lamps, each coming up over its stretch of the hold, in turn. */
  banks: readonly (readonly [number, number])[];
  /** The fires' stretch, if the area has fires; they flicker. */
  fires?: readonly [number, number];
}

/** The lights plates for an area's plate: just in front of it, its box, dusk rasters only. */
export function lightPlates(source: Plate, spec: LightsSpec): Plate[] {
  const make = (
    suffix: string,
    bank: number,
    at: readonly [number, number],
    flicker?: number,
  ): Plate => ({
    id: `${source.id}-lights-${suffix}`,
    depth: source.depth - 0.001,
    ...(source.order !== undefined ? { order: source.order - 0.001 } : {}),
    box: source.box,
    group: source.group,
    rasters: ["dusk"],
    jobs: () => [],
    dusk: {
      at,
      grade: null,
      ...(flicker ? { flicker } : {}),
      jobs: () => [lightsJob(source.id, bank, spec.banks.length)],
    },
  });
  return [
    ...spec.banks.map((at, i) => make(String(i), i, at)),
    ...(spec.fires ? [make("fires", -1, spec.fires, 0.22)] : []),
  ];
}
