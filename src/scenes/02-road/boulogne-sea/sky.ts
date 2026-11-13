import { buildCloud, type CloudArt } from "@/scenes/01-dawn/layers/clouds";

/**
 * The sky over Boulogne at a golden August evening, looking east with the
 * sun behind: pale and warm over the land, deepening to a clear blue
 * overhead. Its stops follow the chart's own sky in its campaign light
 * (components/chart/light/states.ts) at the same heights above the
 * horizon, a little warmer low down and bluer high up, so the chart's sky
 * becomes this one without a jump as it dissolves.
 *
 * Layer units up from the horizon (view.ts) and colours.
 */
export const SKY_STOPS: readonly (readonly [number, string])[] = [
  [-60, "#e6d1a9"],
  [0, "#ead4ab"],
  [22, "#e4cca6"],
  [58, "#d8c4a6"],
  [117, "#bdb6ae"],
  [198, "#97a2ae"],
  [304, "#768aa1"],
  [458, "#5b728d"],
  [700, "#445c78"],
];

/**
 * Broken cloud in the east, lit full in the face by the low sun behind the
 * eye: warm cream on the heads, lavender grey under the base. Strands are
 * scene 1's (01-dawn/layers/clouds.ts) with their shading turned round:
 * there the dawn sun lit the clouds' undersides from below.
 *
 * x in layer units across the view, y in layer units DOWN from the top of
 * the sky box (SKY_TOP), thickness in layer units.
 */
export const SKY_TOP = 700;

export interface Cloud {
  art: CloudArt;
  /** Opacity, so the higher, thinner ones recede. */
  opacity: number;
}

export function buildClouds(): Cloud[] {
  const strands = [
    { x0: -980, x1: -380, y: SKY_TOP - 168, thickness: 26, seed: 901, o: 0.9 },
    { x0: -300, x1: 260, y: SKY_TOP - 205, thickness: 20, seed: 902, o: 0.82 },
    { x0: 340, x1: 980, y: SKY_TOP - 150, thickness: 30, seed: 903, o: 0.92 },
    { x0: -760, x1: -200, y: SKY_TOP - 330, thickness: 14, seed: 904, o: 0.6 },
    { x0: 120, x1: 720, y: SKY_TOP - 372, thickness: 12, seed: 905, o: 0.55 },
  ];
  return strands.map((s) => ({
    art: buildCloud({
      x0: s.x0,
      x1: s.x1,
      y: s.y,
      thickness: s.thickness,
      seed: s.seed,
    }),
    opacity: s.o,
  }));
}
