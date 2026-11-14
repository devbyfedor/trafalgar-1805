import type { DuskGrade, Plate, PlateCanvas, PlateDusk } from "./plate";

/**
 * The evening through the hold (docs/scene-02-boulogne-brief.md,
 * "Concept", stage B): as the reader scrolls through the hold, the light
 * goes from the golden evening of 18:33 (the colour rasters) through the
 * sun's last light, low, orange and rose, to the dusk of about 19:45, some
 * twenty minutes after the sun has set behind the eye (history-notes.md,
 * scene 2, beat 1; research/scene-02/boulogne-sea/evening.md and
 * light-and-watch.md 1.4). As the sun nears the horizon its light reddens
 * and the lit faces glow against a sky darker than them; at sunset the
 * land loses it within minutes, from the water up, the high clouds last;
 * then the land is lit only by the bright western sky behind the eye:
 * soft, cool, darker near and paler far; over the land in the east the
 * Earth's shadow rises under the rose of the Belt of Venus; the sea and
 * the wet strand mirror that sky; the full moon grows bright and lays its
 * path on the water; lights come up in the camps and the town.
 *
 * Each plate may have two more rasters, painted once with the others
 * before the dive, both graded from its colour raster on the GPU, alpha
 * kept: its last light (`glow`: the land, the craft and the clouds) and
 * its dusk; some paint their own (the sky's ramp, the moon, the lights).
 * Through the hold each comes in over the one before by opacity alone,
 * eased over its own stretch of the hold; the one below fades out only
 * under a finished one above (`below`), so no golden edge survives into
 * the dusk and nothing behind a plate shows through it. Golden to orange-
 * rose and rose to violet are neighbouring hues: neither crossfade passes
 * through a dead grey.
 */

// ------------------------------------------------------------- the dusk

/**
 * The far water, out to the strand: a mirror at a grazing angle, it gives
 * back most of the low sky it mirrors, the Earth's shadow's blue-grey,
 * with the belt's rose a band nearer.
 */
const WATER_FAR: DuskGrade = {
  keep: 0.78,
  tint: [
    [-60, "#7a6c88"],
    [-30, "#6e6c8a"],
    [-12, "#6c6d8c"],
  ],
  mix: 0.32,
};
/**
 * The near water, strip by strip: each band the sky as high above the
 * horizon as the water lies below it, the swell blurring it and the
 * mirror weaker as the angle steepens: the far strips the shadow's
 * blue-grey, the middle ones the belt's rose dimmed, the near ones the
 * deep blue overhead. Lighter far, as the golden water was.
 */
const WATER: DuskGrade = {
  keep: [
    [-300, 0.5],
    [-160, 0.56],
    [-70, 0.68],
    [-20, 0.78],
  ],
  tint: [
    [-300, "#1b2338"],
    [-230, "#272b45"],
    [-170, "#4b4262"],
    [-110, "#6a5b78"],
    [-60, "#6c6684"],
    [-20, "#66688a"],
  ],
  mix: 0.44,
};
/** The strand's wet sand: a mirror too, a luminous sliver between the land and the water. */
const STRAND: DuskGrade = {
  hue: { colour: "#8a7f9a", amount: 0.4 },
  keep: 0.7,
  tint: "#6c6888",
  mix: 0.25,
};
/** The craft: dark hulls, the furled canvas cool grey, the flags dulled. */
const CRAFT: DuskGrade = {
  hue: { colour: "#56567c", amount: 0.4 },
  keep: 0.48,
  tint: "#26263a",
  mix: 0.38,
};
/**
 * The near land (the shore, the camps, the harbour), facing the bright
 * western sky behind the eye: its darkness from `keep`, so its drawing
 * holds; the chalk and the limewash, facing that sky, hold the light
 * longest (`lift`), the grass and the roofs go darker.
 */
const NEAR_LAND: DuskGrade = {
  hue: { colour: "#5c5a8a", amount: 0.5 },
  lift: 0.5,
  keep: 0.52,
  tint: "#3a3656",
  mix: 0.15,
};
/** The town on its hill: farther, a little paler and bluer. */
const TOWN: DuskGrade = {
  hue: { colour: "#5c5c8e", amount: 0.5 },
  lift: 0.35,
  keep: 0.52,
  tint: "#46446a",
  mix: 0.2,
};
/** The far hills: in the air, nearly the shadow band behind them. */
const FAR_LAND: DuskGrade = {
  hue: { colour: "#62628f", amount: 0.55 },
  keep: 0.55,
  tint: "#6c6d8c",
  mix: 0.3,
};
/**
 * The clouds: no sun on them, lit softly by the western sky; they dim
 * and keep their modelling, drawn a little toward the dusk sky at their
 * height (so their thin veils melt into it as they did into the blue),
 * their tops a touch of rose.
 */
const CLOUD: DuskGrade = {
  hue: { colour: "#8a7a9c", amount: 0.25 },
  keep: 0.6,
  tint: [
    [90, "#8c7896"],
    [160, "#a6889c"],
    [240, "#7a6f92"],
    [330, "#5f6286"],
    [440, "#4c5070"],
  ],
  mix: 0.28,
};
/** The cirrus, some 9 km up: the last to lose the sun, they end a grey rose a little lighter than the sky. */
const CIRRUS: DuskGrade = {
  hue: { colour: "#b58a9c", amount: 0.4 },
  keep: 0.58,
  tint: "#8e7690",
  mix: 0.3,
};

// -------------------------------------------------------- the last light

/** The land and the craft in the sun's last light: the lit faces orange-red and a little dimmer, the shadows kept. */
const LAST_LIGHT: DuskGrade = {
  hue: { colour: "#c8643a", amount: 0.22 },
  keep: 0.9,
  tint: "#e07a40",
  mix: 0.16,
};
/** The far hills, through more air: the same light, softer. */
const LAST_LIGHT_FAR: DuskGrade = {
  hue: { colour: "#c87a5a", amount: 0.14 },
  keep: 0.92,
  tint: "#d88a68",
  mix: 0.1,
};
/** The clouds blazing salmon and rose after the land is in shade, the higher the warmer. */
const LAST_LIGHT_CLOUD: DuskGrade = {
  hue: { colour: "#e3907c", amount: 0.35 },
  keep: 1,
  tint: [
    [100, "#d98a7a"],
    [440, "#f2a684"],
  ],
  mix: 0.3,
};

// --------------------------------------------------------------- timing

/**
 * The hold's stretches (0..1). The golden light holds to 0.2; the sun's
 * last light comes over the land 0.2-0.4 (it is still sunlight, weaker
 * and redder); then the sunset takes the land from the water up, quickly
 * (0.40-0.62), the clouds keeping their rose to the end; the sky turns
 * all along, the water with it (its colour is the sky it mirrors); the
 * moon brightens and its path comes once the land is dark; the dusk then
 * deepens to 1 while the lights come up (plates/index.ts, LIGHTS).
 */
export const DUSK_AT = {
  lastLight: [0.2, 0.4],
  lastLightClouds: [0.26, 0.5],
  lastLightCirrus: [0.34, 0.6],
  water: [0.16, 0.8],
  strand: [0.4, 0.52],
  craft: [0.4, 0.54],
  nearLand: [0.42, 0.55],
  town: [0.45, 0.58],
  farLand: [0.48, 0.62],
  sky: [0.14, 0.8],
  clouds: [0.55, 0.86],
  cirrus: [0.6, 0.92],
  moon: [0.4, 0.9],
  glade: [0.55, 0.94],
} as const;

/** A plate's dusk: its own, or by its group and depth; null when it has none. */
export function duskOf(p: Plate): PlateDusk | null {
  if (p.dusk === false) return null;
  if (p.dusk) return p.dusk;
  switch (p.group) {
    case "sky":
      return p.id === "cloud-high"
        ? {
            at: DUSK_AT.cirrus,
            grade: CIRRUS,
            glow: { at: DUSK_AT.lastLightCirrus, grade: LAST_LIGHT_CLOUD },
          }
        : {
            at: DUSK_AT.clouds,
            grade: CLOUD,
            glow: { at: DUSK_AT.lastLightClouds, grade: LAST_LIGHT_CLOUD },
          };
    case "craft":
      return {
        at: DUSK_AT.craft,
        grade: CRAFT,
        glow: { at: DUSK_AT.lastLight, grade: LAST_LIGHT },
      };
    case "water":
      if (p.id === "water-deep") return { at: DUSK_AT.water, grade: WATER_FAR };
      return p.depth >= 400
        ? { at: DUSK_AT.strand, grade: STRAND }
        : { at: DUSK_AT.water, grade: WATER };
    default:
      if (p.depth >= 4000)
        return {
          at: DUSK_AT.farLand,
          grade: FAR_LAND,
          glow: { at: DUSK_AT.lastLight, grade: LAST_LIGHT_FAR },
        };
      if (p.depth >= 2000)
        return {
          at: DUSK_AT.town,
          grade: TOWN,
          glow: { at: DUSK_AT.lastLight, grade: LAST_LIGHT },
        };
      return {
        at: DUSK_AT.nearLand,
        grade: NEAR_LAND,
        glow: { at: DUSK_AT.lastLight, grade: LAST_LIGHT },
      };
  }
}

/** A ramp by height as a vertical gradient across the box. */
function rampStyle<T>(
  ctx: CanvasRenderingContext2D,
  ramp: readonly (readonly [number, T])[],
  y0: number,
  y1: number,
  colour: (v: T) => string,
): CanvasGradient {
  const lo = Math.min(y0, ramp[0][0]);
  const hi = Math.max(y1, ramp[ramp.length - 1][0]);
  const g = ctx.createLinearGradient(0, lo, 0, hi);
  g.addColorStop(0, colour(ramp[0][1]));
  for (const [y, v] of ramp) g.addColorStop((y - lo) / (hi - lo), colour(v));
  g.addColorStop(1, colour(ramp[ramp.length - 1][1]));
  return g;
}

/**
 * The job that grades a plate's colour raster into another of its
 * rasters: the colour copied; its hue drawn toward the grade's (each
 * pixel keeping its lightness); its lights lifted against its darks;
 * then by `source-atop` (alpha kept) dimmed toward black and drawn toward
 * the tint (or the tint's ramp by height).
 */
export function gradeJob(grade: DuskGrade): (c: PlateCanvas) => void {
  return (c) => {
    const src = c.colour;
    if (!src || src.width < 2) return;
    const { ctx, box } = c;
    const [x0, x1, y0, y1] = box;
    const copy = (op: GlobalCompositeOperation, alpha = 1) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = op;
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    };
    copy("source-over");
    // The blends paint where the plate is empty too: the colour raster's
    // own alpha is cut back in after them.
    let blended = false;
    if (grade.hue) {
      ctx.globalCompositeOperation = "color";
      ctx.globalAlpha = grade.hue.amount;
      ctx.fillStyle = grade.hue.colour;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 1;
      blended = true;
    }
    if (grade.lift) {
      // The raster multiplied by itself: dark pixels sink further than
      // light ones, so what faces the bright sky holds the light.
      copy("multiply", grade.lift);
      blended = true;
    }
    if (blended) copy("destination-in");
    ctx.globalCompositeOperation = "source-atop";
    const keep = grade.keep;
    if (typeof keep === "number") {
      if (keep < 1) {
        ctx.globalAlpha = 1 - keep;
        ctx.fillStyle = "#000";
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = rampStyle(
        ctx,
        keep,
        y0,
        y1,
        (k) => `rgba(0,0,0,${(1 - k).toFixed(3)})`,
      );
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (grade.mix > 0) {
      ctx.globalAlpha = grade.mix;
      const tint = grade.tint;
      ctx.fillStyle =
        typeof tint === "string"
          ? tint
          : rampStyle(ctx, tint, y0, y1, (v) => v);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };
}

/** A plate's dusk jobs: the grade of its colour raster, then its own. */
export function duskJobs(d: PlateDusk): ((c: PlateCanvas) => void)[] {
  return [...(d.grade ? [gradeJob(d.grade)] : []), ...(d.jobs?.() ?? [])];
}

/** A plate's last-light jobs: the grade of its colour raster. */
export function glowJobs(d: PlateDusk): ((c: PlateCanvas) => void)[] {
  return d.glow ? [gradeJob(d.glow.grade)] : [];
}

/** Hermite smoothstep of x between a and b. */
function ease(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How far a stretch of the hold `at` has come at the hold's progress `t`. */
export function duskShare(at: readonly [number, number], t: number): number {
  return ease(at[0], at[1], t);
}

/**
 * How much of a raster still shows under the one that comes in over it,
 * at that one's share `above`: all of it until the one above is nearly
 * whole, then gone. Faded earlier, what lies behind the plate would show
 * through it; never faded, its anti-aliased edges would show under the
 * finished raster above as a rim of the earlier light.
 */
export function below(above: number): number {
  return 1 - ease(0.8, 1, above);
}

/** The opacities of a plate's three evening rasters. */
export interface EveningOpacities {
  colour: number;
  glow: number;
  dusk: number;
}

/**
 * The opacities of a plate's colour, last-light and dusk rasters at the
 * hold's progress `t` and its colour's share `c` (the transition's).
 */
export function eveningOpacities(
  d: PlateDusk | null,
  t: number,
  c: number,
  out: EveningOpacities,
): EveningOpacities {
  if (!d) {
    out.colour = c;
    out.glow = 0;
    out.dusk = 0;
    return out;
  }
  const k = duskShare(d.at, t);
  const g = d.glow ? duskShare(d.glow.at, t) : 0;
  out.dusk = c * k;
  out.glow = d.glow ? c * g * below(k) : 0;
  out.colour = c * below(Math.max(g, k));
  return out;
}
