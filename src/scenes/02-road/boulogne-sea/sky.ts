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
  [-60, "#ecd3a5"],
  [0, "#f1d7a9"],
  [25, "#eccea3"],
  [60, "#e2c4a3"],
  [110, "#cfb5a8"],
  [180, "#b0a1ab"],
  [270, "#8f95aa"],
  [400, "#7182a1"],
  [560, "#596c8d"],
  [700, "#495c7d"],
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
  // A low bank of stratocumulus over the land, a few heaped clouds in the
  // middle sky, and thin high streaks, all lit from the west behind the
  // eye; nearer the horizon lower in contrast.
  const strands = [
    {
      x0: -1000,
      x1: -560,
      y: SKY_TOP - 128,
      thickness: 18,
      seed: 911,
      o: 0.62,
    },
    { x0: -470, x1: -40, y: SKY_TOP - 142, thickness: 14, seed: 912, o: 0.55 },
    { x0: 260, x1: 1000, y: SKY_TOP - 120, thickness: 20, seed: 913, o: 0.6 },
    { x0: -900, x1: -330, y: SKY_TOP - 250, thickness: 40, seed: 914, o: 0.9 },
    { x0: 120, x1: 760, y: SKY_TOP - 232, thickness: 46, seed: 915, o: 0.92 },
    { x0: -640, x1: 40, y: SKY_TOP - 470, thickness: 9, seed: 916, o: 0.45 },
    { x0: 300, x1: 960, y: SKY_TOP - 520, thickness: 8, seed: 917, o: 0.4 },
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
