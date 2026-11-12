/**
 * The soundings' plate angle per detail tile, degrees anticlockwise from
 * east to the figures' baseline (lettering/Soundings.ts). Period charts set
 * their figures to the sheet, and a sheet was not always north-up (the
 * owner's licence, 7 November 2026). The Gulf's figures stand upright for
 * a view toward the north-east (bearing 50°), between beat 4's views up
 * the coast (bearings 0-26°) and the descent and the last frame's
 * (52-77.5°). The Channel's stand upright for beat 1's views of Boulogne
 * up the Strait (bearings 49-50° at p = 0.18 and 0.235, the only views
 * close enough to show them).
 */
export const SOUNDING_ANGLES: Readonly<Record<string, number>> = {
  cadiz: -50,
  channel: -50,
};
