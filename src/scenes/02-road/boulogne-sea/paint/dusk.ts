import type { DuskGrade, Plate, PlateCanvas, PlateDusk } from "./plate";

/**
 * The dusk through the hold (docs/scene-02-boulogne-brief.md, "Concept",
 * stage B): as the reader scrolls through the hold, the evening goes from
 * the golden light of 18:33 (the colour rasters) to the dusk of about
 * 19:45, some twenty minutes after the sun has set behind the eye
 * (history-notes.md, scene 2, beat 1; research/scene-02/boulogne-sea/
 * evening.md and light-and-watch.md 1.4). The land loses the sun and is
 * lit only by the bright western sky behind the eye: soft, cool, its
 * values closed up, darker near and paler far; over the land in the east
 * the Earth's shadow rises under the rose of the Belt of Venus; the sea
 * mirrors that darker sky; the full moon grows bright and lays its path on
 * the water; lights come up in the camps and the town.
 *
 * Each plate has a dusk raster, painted once with the others before the
 * dive: its colour raster graded on the GPU (alpha kept), and for some its
 * own painting (the sky's ramp, the moon, the lights). Through the hold
 * it comes in over the colour raster by opacity alone, eased over its own
 * stretch of the hold: low things first and the high clouds last, as the
 * light leaves the land from the water up; never a step.
 */

/**
 * The water: it mirrors the darkened eastern sky, each band of it the sky
 * as high above the horizon as the water lies below it (the swell blurring
 * it): the far water the Earth's shadow's blue-grey, the middle water the
 * Belt of Venus's rose, the near water the deeper blue overhead. Its warm
 * crests go.
 */
const WATER: DuskGrade = {
  keep: 0.55,
  tint: [
    [-300, "#1b2338"],
    [-230, "#262b45"],
    [-165, "#463d5c"],
    [-110, "#4f4363"],
    [-60, "#46425f"],
    [-20, "#3a405e"],
  ],
  mix: 0.44,
};
/** The strand's wet sand: a mirror of the sky's rose and the dark land. */
const STRAND: DuskGrade = { keep: 0.5, tint: "#4e4b68", mix: 0.42 };
/** The craft: dark hulls, the furled canvas cool grey, the flags dulled. */
const CRAFT: DuskGrade = {
  hue: { colour: "#56567c", amount: 0.4 },
  keep: 0.48,
  tint: "#26263a",
  mix: 0.38,
};
/** The near land (the shore, the camps, the harbour): lit by the western sky. */
const NEAR_LAND: DuskGrade = {
  hue: { colour: "#5a5a8c", amount: 0.5 },
  keep: 0.44,
  tint: "#3a3656",
  mix: 0.32,
};
/** The town on its hill: farther, a little paler and bluer. */
const TOWN: DuskGrade = {
  hue: { colour: "#5c5c8e", amount: 0.5 },
  keep: 0.46,
  tint: "#46446a",
  mix: 0.36,
};
/** The far hills: nearly the sky's own colour low down. */
const FAR_LAND: DuskGrade = {
  hue: { colour: "#62628f", amount: 0.55 },
  keep: 0.52,
  tint: "#5a5880",
  mix: 0.46,
};
/** The clouds: no sun on them; the high ones keep some rose longest. */
const CLOUD: DuskGrade = {
  hue: { colour: "#86789c", amount: 0.45 },
  keep: 0.6,
  tint: [
    [120, "#6c6886"],
    [260, "#8d7c98"],
    [420, "#ad8ca0"],
  ],
  mix: 0.5,
};

/** The hold's stretches (0..1) over which each kind turns to dusk. */
export const DUSK_AT = {
  water: [0.1, 0.62],
  strand: [0.12, 0.64],
  craft: [0.12, 0.66],
  nearLand: [0.16, 0.68],
  town: [0.19, 0.71],
  farLand: [0.22, 0.74],
  sky: [0.14, 0.8],
  clouds: [0.28, 0.86],
  moon: [0.3, 0.9],
  glade: [0.46, 0.94],
} as const;

/** A plate's dusk: its own, or by its group and depth; null when it has none. */
export function duskOf(p: Plate): PlateDusk | null {
  if (p.dusk === false) return null;
  if (p.dusk) return p.dusk;
  switch (p.group) {
    case "sky":
      return { at: DUSK_AT.clouds, grade: CLOUD };
    case "craft":
      return { at: DUSK_AT.craft, grade: CRAFT };
    case "water":
      return p.depth >= 400
        ? { at: DUSK_AT.strand, grade: STRAND }
        : { at: DUSK_AT.water, grade: WATER };
    default:
      if (p.depth >= 4000) return { at: DUSK_AT.farLand, grade: FAR_LAND };
      if (p.depth >= 2000) return { at: DUSK_AT.town, grade: TOWN };
      return { at: DUSK_AT.nearLand, grade: NEAR_LAND };
  }
}

/**
 * The job that grades a plate's colour raster into its dusk raster: the
 * colour copied, then by `source-atop` (alpha kept) dimmed toward black
 * and drawn toward the tint (or the tint's ramp by height).
 */
export function gradeJob(grade: DuskGrade): (c: PlateCanvas) => void {
  return (c) => {
    const src = c.colour;
    if (!src || src.width < 2) return;
    const { ctx, box } = c;
    const [x0, x1, y0, y1] = box;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    if (grade.hue) {
      // The blend paints where the plate is empty too: the colour
      // raster's own alpha cut back in after it.
      ctx.globalCompositeOperation = "color";
      ctx.globalAlpha = grade.hue.amount;
      ctx.fillStyle = grade.hue.colour;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-in";
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(src, 0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-atop";
    if (grade.keep < 1) {
      ctx.globalAlpha = 1 - grade.keep;
      ctx.fillStyle = "#000";
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (grade.mix > 0) {
      ctx.globalAlpha = grade.mix;
      if (typeof grade.tint === "string") ctx.fillStyle = grade.tint;
      else {
        const ramp = grade.tint;
        const lo = Math.min(y0, ramp[0][0]);
        const hi = Math.max(y1, ramp[ramp.length - 1][0]);
        const g = ctx.createLinearGradient(0, lo, 0, hi);
        g.addColorStop(0, ramp[0][1]);
        for (const [y, col] of ramp) g.addColorStop((y - lo) / (hi - lo), col);
        g.addColorStop(1, ramp[ramp.length - 1][1]);
        ctx.fillStyle = g;
      }
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

/** Hermite smoothstep of x between a and b. */
function ease(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** How far a stretch of the hold `at` has come at the hold's progress `t`. */
export function duskShare(at: readonly [number, number], t: number): number {
  return ease(at[0], at[1], t);
}
