import { mix, rgba } from "./kit";
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
 * through a nearer roof or crest; a site whose middle a later shape hides
 * is not painted at all, so it leaves nothing round that shape's edge.
 * Its raster comes in by opacity over its stretch of the hold
 * (paint/dusk.ts), the banks one after another.
 *
 * How they look (the critics of session 29, docs/reviews/boulogne-sea/
 * s29-dusk-lights.md): candle and hearth light some twenty minutes after
 * sunset, in civil twilight, from 1.5 to 3 km: deep amber points only
 * just brighter than the sky, most of them faint and a few bright, the far
 * ones dimmer and redder; no halo round a point (in clear air a candle-lit
 * opening that far makes none), a little warm light thrown out of a door
 * on the trodden ground; lit in clusters by companies and streets, with
 * dark gaps between.
 */

export type LightKind = "window" | "door" | "fire" | "lamp";

/**
 * A light, layer units: a window's, door's or lamp's box (x, y its bottom
 * left, w, h its size; a lamp is centred on it), a fire's centre (w its
 * glow's radius, h its strength 0..1).
 */
export interface LightSite {
  kind: LightKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** For the bank and whether it is lit at all. */
  seed: number;
  /** The share of such sites lit, where it differs from its kind's (`LIT`, or the area's). */
  lit?: number;
  /** A hearth inside (a camp's kitchen): its door redder and brighter. */
  hearth?: boolean;
}

/** A box, layer units: x0, y0, x1, y1. */
export type Bounds = readonly [number, number, number, number];

type Occluder = { occluder: Path2D; b?: Bounds };
type Event = { site: LightSite } | Occluder;

/** The box of a polygon, layer units. */
function boundsOfPts(pts: readonly (readonly [number, number])[]): Bounds {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** What an area's painter records during its colour pass. */
export class LightSink {
  readonly events: Event[] = [];
  add(site: LightSite): void {
    this.events.push({ site });
  }
  /**
   * A shape laid over what came before: it hides the lights recorded so
   * far. A path's box (layer units), where its painter knows it, lets
   * the lights skip it where it is far from them.
   */
  occlude(
    shape: Path2D | readonly (readonly [number, number])[],
    bounds?: Bounds,
  ): void {
    let path: Path2D;
    let b = bounds;
    if (shape instanceof Path2D) path = shape;
    else {
      path = new Path2D();
      shape.forEach(([x, y], i) => {
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
      b ??= boundsOfPts(shape);
    }
    this.events.push(b ? { occluder: path, b } : { occluder: path });
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

/** How many of each kind are lit at dusk (a share of the recorded sites), unless the area or the site says otherwise. */
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

/** Smooth value noise along a line, 0..1, lattice every unit of `u`. */
function noise(u: number, salt: number): number {
  const i = Math.floor(u);
  const f = u - i;
  const t = f * f * (3 - 2 * f);
  const a = hash01(i * 1.731 + salt * 7.17);
  const b = hash01((i + 1) * 1.731 + salt * 7.17);
  return a + (b - a) * t;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * How much a site's lit share is multiplied by where it stands (layer
 * units), 0..2, about 1 on average: a low-frequency noise across the
 * view (bumps some 60–120 units apart) and a little by height, so the
 * lights cluster by companies and streets with dark gaps between, not
 * evenly as a dotted pattern. `amount` 0 leaves the share even.
 */
function clustered(x: number, y: number, amount: number, salt: number): number {
  if (amount <= 0) return 1;
  const n =
    0.62 * noise(x / 44, salt) + 0.38 * noise(x / 19 + y / 7, salt + 3.3);
  const g = 2.1 * smooth(0.3, 0.68, n);
  return 1 - amount + amount * g;
}

/** Device px at least for a light's core, so a lit window 3 km off still reads as a point. */
const CORE_PX = 1.3;

/** Candle and hearth light behind glass and in doorways, bright to dim (about 1900 K, at this size). */
const CANDLE = ["#ffb04f", "#f0973f", "#d47a38"] as const;
/** A hearth's glow in a kitchen's door: redder and brighter. */
const HEARTH = "#ff8236";
/** The reflector lamps round the Emperor's pavilion: oil, a little paler than a candle. */
const LAMP = "#ffc066";
/** Where a far light's colour goes: the air takes its blue and some of its yellow. */
const FAR = "#c8623a";

/**
 * How far round a site's middle (layer units) what `paintSite` lays can
 * reach: for a painter that drops what nothing could show (the town's
 * book, plates/town/kit.ts).
 */
export function lightReach(s: LightSite, pen: (px: number) => number): number {
  if (s.kind === "fire") return s.w * 1.5;
  const min = pen(CORE_PX);
  return Math.max(min, s.w, s.h) * 1.3 + pen(4);
}

/** The box a site's painting covers, layer units. */
function siteBounds(s: LightSite, pen: (px: number) => number): Bounds {
  const r = lightReach(s, pen);
  const cx = s.kind === "fire" ? s.x : s.x + s.w / 2;
  const cy = s.kind === "fire" ? s.y : s.y + s.h / 2;
  return [cx - r, cy - r, cx + r, cy + r];
}

/** A fire's glow: an upright ellipse, its middle this share of its height up from the fire, on the smoke's foot. */
const FIRE_LIFT = 0.32;
/** A fire's glow, taller than wide: firelight on its own smoke, not a round blob in the sky. */
const FIRE_TALL = 1.6;

function paintFire(c: PlateCanvas, s: LightSite): void {
  const { ctx } = c;
  // A kitchen's fire behind a crest: the hidden fire lighting the foot of
  // its own smoke over the skyline; saturated, low, soft.
  const ry = s.w;
  const rx = ry / FIRE_TALL;
  const a = s.h;
  ctx.save();
  ctx.translate(s.x, s.y + ry * FIRE_LIFT);
  ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, rgba("#ff8a3a", a));
  g.addColorStop(0.22, rgba("#f2743a", a * 0.62));
  g.addColorStop(0.55, rgba("#c8502a", a * 0.22));
  g.addColorStop(1, rgba("#c8502a", 0));
  ctx.fillStyle = g;
  ctx.fillRect(-ry, -ry, 2 * ry, 2 * ry);
  ctx.restore();
}

function paintSite(c: PlateCanvas, s: LightSite): void {
  if (s.kind === "fire") {
    paintFire(c, s);
    return;
  }
  const { ctx } = c;
  const min = c.pen(CORE_PX);
  const w = Math.max(min, s.w);
  const h = Math.max(min, s.h);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  // An opening smaller than the least point that reads (far, or small):
  // drawn at that point, dimmer and redder, as it would be if smaller.
  const size = Math.min(1, Math.max(s.w, s.h) / min);
  const far = s.w <= min && s.h <= min;
  // A near opening (larger than the least point) covers its pixels fully:
  // a little less, so the brightest window stays only a little over the
  // sky at the horizon.
  const fade = far ? 0.84 + 0.16 * size : 0.88;
  const redder = far ? 0.32 * (1 - size) : 0;
  const v = hash01(s.seed * 5.31 + 2.1);
  let core: string;
  let alpha: number;
  if (s.kind === "lamp") {
    core = LAMP;
    alpha = 0.85;
  } else if (s.hearth) {
    core = HEARTH;
    alpha = 0.97;
  } else {
    // Most openings a faint warm tint, a few bright: a room well lit is
    // the paler flame too.
    core = v > 0.68 ? CANDLE[0] : v > 0.28 ? CANDLE[1] : CANDLE[2];
    alpha = 0.7 + 0.26 * v * v;
  }
  core = mix(core, FAR, redder);
  alpha *= fade;
  // The light round it in the dusk air (painted, not a bloom): a little
  // round a lamp and a near window; none round a far point.
  const glow =
    s.kind === "lamp"
      ? { r: Math.max(w, h) * 1.2 + c.pen(0.8), a: 0.14 }
      : s.kind === "window" && !far
        ? { r: Math.max(w, h) * 0.9 + c.pen(0.6), a: 0.12 }
        : s.hearth
          ? { r: Math.max(w, h) * 0.9 + c.pen(0.8), a: 0.16 }
          : null;
  if (glow) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow.r);
    g.addColorStop(0, rgba(core, glow.a * fade));
    g.addColorStop(1, rgba(core, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - glow.r, cy - glow.r, 2 * glow.r, 2 * glow.r);
  }
  if (s.kind === "door") {
    // The light thrown out of the doorway on the trodden ground in front
    // of it: a small warm wedge under the door, widening toward the eye.
    const drop = c.pen(s.hearth ? 3 : 2.4);
    const flare = c.pen(1.1);
    const foot = cy - h / 2;
    const g = ctx.createLinearGradient(0, foot, 0, foot - drop);
    const spill = mix(core, CANDLE[2], 0.4);
    g.addColorStop(0, rgba(spill, (s.hearth ? 0.3 : 0.2) * fade));
    g.addColorStop(1, rgba(spill, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, foot);
    ctx.lineTo(cx + w / 2, foot);
    ctx.lineTo(cx + w / 2 + flare, foot - drop);
    ctx.lineTo(cx - w / 2 - flare, foot - drop);
    ctx.closePath();
    ctx.fill();
  }
  // The opening itself.
  ctx.fillStyle = core;
  ctx.globalAlpha = alpha;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.globalAlpha = 1;
}

/** An area's lit shares and how they cluster (LightsSpec). */
interface Shares {
  lit?: Partial<Record<LightKind, number>>;
  cluster?: { amount: number; salt: number };
}

/** Whether a site is lit at dusk, by its share and where it stands. */
function isLit(s: LightSite, o: Shares): boolean {
  const share = s.lit ?? o.lit?.[s.kind] ?? LIT[s.kind];
  if (share >= 1) return true;
  const k =
    o.cluster && (s.kind === "window" || s.kind === "door")
      ? clustered(s.x + s.w / 2, s.y, o.cluster.amount, o.cluster.salt)
      : 1;
  return hash01(s.seed) < share * k;
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

/**
 * The dusk job of a lights plate: the source's sites of `bank` (of
 * `banks`; fires in their own bank, -1) that are lit and whose middle no
 * later shape hides, painted, each later occluder cut out of what is
 * painted so far (an occluder far from everything painted is skipped).
 */
function lightsJob(
  source: string,
  bank: number,
  banks: number,
  shares: Shares,
): PlateJob {
  return (c) => {
    const { ctx } = c;
    const events = lightSink(source).events;
    // Walking back: which of this bank's lit sites show, each tested
    // against the shapes laid after it (by their boxes first, then the
    // path, in the canvas's own pixels as the transform maps them).
    const m = ctx.getTransform();
    const later: Occluder[] = [];
    const show = new Uint8Array(events.length);
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if ("occluder" in e) {
        later.push(e);
        continue;
      }
      const s = e.site;
      const mine =
        s.kind === "fire"
          ? bank === -1
          : bank >= 0 && Math.floor(hash01(s.seed * 7.31 + 3) * banks) === bank;
      if (!mine || !isLit(s, shares)) continue;
      // A fire stands behind its ground on purpose: its glow shows over it.
      if (s.kind !== "fire") {
        const x = s.x + s.w / 2;
        const y = s.y + s.h / 2;
        const px = m.a * x + m.c * y + m.e;
        const py = m.b * x + m.d * y + m.f;
        let hidden = false;
        for (const o of later) {
          const b = o.b;
          if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) continue;
          if (ctx.isPointInPath(o.occluder, px, py)) {
            hidden = true;
            break;
          }
        }
        if (hidden) continue;
      }
      show[i] = 1;
    }
    const painted: Bounds[] = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if ("occluder" in e) {
        if (!painted.length) continue;
        const b = e.b;
        if (b && !painted.some((p) => overlaps(p, b))) continue;
        // Opaque, whatever the last light left as the fill: a gradient's
        // alpha would cut only part of the way.
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        ctx.fill(e.occluder);
        ctx.globalCompositeOperation = "source-over";
        continue;
      }
      if (!show[i]) continue;
      // DEBUG-COUNT
      {
        const g = globalThis as unknown as { __lit?: Record<string, number> };
        g.__lit ??= {};
        const key = `${source}|${e.site.kind}${e.site.hearth ? "+h" : ""}`;
        g.__lit[key] = (g.__lit[key] ?? 0) + 1;
        if (e.site.kind === "fire")
          (g as unknown as { __fires: string[] }).__fires = [
            ...((g as unknown as { __fires?: string[] }).__fires ?? []),
            `${source} ${e.site.x.toFixed(1)},${e.site.y.toFixed(1)} r${e.site.w.toFixed(1)} a${e.site.h.toFixed(2)}`,
          ];
      }
      paintSite(c, e.site);
      painted.push(siteBounds(e.site, c.pen));
    }
  };
}

/** The lights of an area's plate, how they come up. */
export interface LightsSpec {
  /** Banks of windows, doors and lamps, each coming up over its stretch of the hold, in turn. */
  banks: readonly (readonly [number, number])[];
  /** The fires' stretch, if the area has fires; they flicker. */
  fires?: readonly [number, number];
  /** The share of each kind lit, where the area's differs from the default (`LIT`); a site's own share wins. */
  lit?: Partial<Record<LightKind, number>>;
  /**
   * How the windows and doors lit cluster across the area (`amount` 0:
   * evenly; 1: by companies and streets, dark gaps between), and the
   * noise's seed (plates of one area share it).
   */
  cluster?: { amount: number; salt: number };
}

/** The lights plates for an area's plate: just in front of it, its box, dusk rasters only. */
export function lightPlates(source: Plate, spec: LightsSpec): Plate[] {
  const shares: Shares = {
    ...(spec.lit ? { lit: spec.lit } : {}),
    ...(spec.cluster ? { cluster: spec.cluster } : {}),
  };
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
      jobs: () => [lightsJob(source.id, bank, spec.banks.length, shares)],
    },
  });
  return [
    ...spec.banks.map((at, i) => make(String(i), i, at)),
    ...(spec.fires ? [make("fires", -1, spec.fires, 0.22)] : []),
  ];
}
