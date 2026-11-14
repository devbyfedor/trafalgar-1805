/**
 * The geography of Boulogne's roads in August 1805 for the painting: the
 * places and lines every plate draws from, in metres east and north of the
 * 1805 jetty heads, and heights in metres above the sea (before the
 * painter's licence on heights, scene.ts VEX and BUILD).
 *
 * Sources: docs/research/scene-02/boulogne-sea/ (town-and-defences.md 1.1
 * for the positions and the terrain model's heights, camps.md (b) for the
 * plateaus, light-and-watch.md 4 and town-and-defences.md "For the
 * painter" 7 and 10 for the strand). Modern positions for what still
 * stands (the belfry, the château, Saint-Nicolas, the Tour d'Odre's site,
 * Mont Lambert, the forts' rocks); the jetty heads, the wooden fort and
 * the shore lines of 1805 are inferences from period descriptions and
 * plans, good to 200–300 m (Low): the painting needs them consistent
 * between its plates more than exact.
 *
 * Plates read these through scene.ts (project, viewOf), never their own
 * copies, so a change here moves every plate together.
 */

/** The 1805 jetty heads: the harbour's mouth (town-and-defences.md 1.1; Low). */
export const ORIGIN = { lat: 50.73, lon: 1.594 } as const;

const M_PER_DEG_LAT = 111_200;
const M_PER_DEG_LON = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** Metres east and north of the jetty heads, for a place in degrees. */
export function en(lat: number, lon: number): readonly [number, number] {
  return [
    (lon - ORIGIN.lon) * M_PER_DEG_LON,
    (lat - ORIGIN.lat) * M_PER_DEG_LAT,
  ];
}

/** Degrees of a place given in metres east and north of the jetty heads. */
export function latLonOf(
  east: number,
  north: number,
): readonly [number, number] {
  return [
    ORIGIN.lat + north / M_PER_DEG_LAT,
    ORIGIN.lon + east / M_PER_DEG_LON,
  ];
}

export type EN = readonly [number, number];

/**
 * Places, metres east and north of the jetty heads. Heights in the notes
 * beside each.
 */
export const PLACES = {
  /** The jetty heads; the western one carries the pierhead battery (Fort Napoléon) and the harbour light near it. */
  jettyHeads: [0, 0] as EN,
  /** The wooden fort on piles at the low-water line, at the end of a 700 m fascine dike north of the channel. */
  woodenFort: en(50.732, 1.585),
  /** The Tour d'Odre's site on the cliff top (cliff 45–55 m); Napoleon's pavilion on a mound in its old bastions, at the edge, rotunda toward the harbour; the admiral's pavilion, the signal mast between them, the great mortar battery a little beyond. */
  tourDOdre: en(50.7317, 1.5972),
  /** The belfry: foot 52 m, tower about 37 m, top about 89 m; the Chappe telegraph on it. */
  belfry: en(50.725, 1.6132),
  /** The château at the upper town's eastern corner (hardly seen from the sea). */
  chateau: en(50.7256, 1.6169),
  /** The old cathedral's site (pulled down from 1798: paint nothing tall there). */
  cathedralSite: en(50.7262, 1.6151),
  /** Saint-Nicolas in the lower town, ground 13 m. */
  saintNicolas: en(50.7233, 1.6073),
  /** The column's site (August 1805: at most foundations; not a landmark), 92 m. */
  column: en(50.7411, 1.6183),
  /** Mont Lambert, 187 m. */
  montLambert: en(50.7175, 1.6514),
  /** Fort de l'Heurt on its reef off Le Portel (out of the view, to the south-south-west). */
  fortHeurt: en(50.7081, 1.5597),
  /** Fort de la Crèche on its rock off the point (out of the view, to the north-north-east). */
  fortCreche: en(50.749, 1.593),
} as const;

/**
 * The upper town's walls: a rectangle of about 400 × 325 m standing corner
 * on to the sea, its western corner toward the roads; walls 13–16 m above
 * the ground outside, dark grey-brown stone, a double row of trees along
 * the top. Corners (east, north), west first, then clockwise as seen from
 * above: north, east, south. Inferred from the belfry and château's places
 * and Bertrand's description (town-and-defences.md "For the painter" 4).
 */
export const RAMPARTS: readonly EN[] = [
  en(50.7249, 1.6098),
  en(50.7276, 1.6131),
  en(50.7258, 1.6178),
  en(50.7231, 1.6145),
];

/** Ground heights, metres: the upper town's plateau, the walls' tops above it. */
export const TOWN_GROUND = 55;
export const RAMPART_HEIGHT = 14;

/**
 * The high-water shore of 1805, north to south: the foot of the cliffs
 * north of the harbour, the harbour's mouth between the jetties' roots,
 * then the beach and dunes south-south-west toward Le Portel.
 */
export const SHORE_HIGH: readonly EN[] = [
  [250, 2600],
  [230, 1900],
  [205, 1200],
  [190, 600],
  [190, 200],
  [210, 60],
  // The harbour's mouth (the jetties' roots: the channel between them).
  [230, -70],
  [180, -400],
  [60, -900],
  [-150, -1500],
  [-480, -2100],
  [-820, -2600],
];

/**
 * The low-water line at spring tides, north to south: about 450 m out at
 * the Crèche, the wooden fort on it north of the channel, about 750 m off
 * the jetty heads, then some 600–700 m off the beach to the south
 * (Desbrière's 450–800 m; light-and-watch.md 4).
 */
export const SHORE_LOW: readonly EN[] = [
  [-230, 2600],
  [-380, 1900],
  [-520, 1100],
  [-640, 220],
  [-750, 0],
  [-760, -300],
  [-700, -900],
  [-830, -1500],
  [-1130, -2100],
  [-1450, -2600],
];

/**
 * The two timber jetties on piles, from their roots at the shore out
 * across the beach to their heads: north and south of the channel.
 */
export const JETTIES: readonly (readonly EN[])[] = [
  [
    [215, 45],
    [100, 40],
    [0, 35],
  ],
  [
    [225, -60],
    [110, -45],
    [0, -35],
  ],
];

/** The cliff's top edge north of the harbour (the plateau's rim), with its height. */
export const CLIFF_EDGE: readonly (readonly [number, number, number])[] = [
  [330, 2600, 55],
  [310, 1900, 45],
  [290, 1500, 32],
  [300, 1200, 40],
  [300, 600, 52],
  [320, 250, 55],
  [380, 120, 40],
];

/**
 * Ground heights inland of the cliff north of the harbour, metres, by
 * distance from the edge (east of it): the right camp's seaward slope
 * climbing in tiers to its crest 1.5–2 km inland (camps.md (b)).
 */
export const NORTH_RISE: readonly (readonly [number, number])[] = [
  [0, 55],
  [300, 61],
  [600, 66],
  [800, 70],
  [1100, 77],
  [1400, 83],
  [2000, 92],
];

/**
 * Outreau, south of the Liane: the harbour flats at 6–9 m, the brow facing
 * the town at 42–50 m about 0.6–0.8 km from the harbour, the plateau level
 * at 53–57 m behind it; the Châtillon ridge about 43 m between the flats
 * and the beach (camps.md (b); town-and-defences.md 1.1).
 */
export const OUTREAU = {
  flats: 7,
  brow: 46,
  plateau: 55,
  chatillon: 43,
  /** The brow's line facing the town and the harbour, east and north. */
  browLine: [
    [1500, -700],
    [1000, -800],
    [600, -1000],
    [250, -1400],
    [0, -1900],
    [-250, -2400],
  ] as readonly EN[],
} as const;
