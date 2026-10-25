import type { GunDeckSpec, MastSpec, ShipSpec } from "../types";

/**
 * HMS Victory as at Trafalgar, 21 October 1805 (after the 1800–1803 great
 * repair). Sources, measurements and doubts: docs/history-notes.md.
 *
 * Metres. x = 0 is the aft end of the gun deck (the sternpost at the
 * waterline); y = 0 the load waterline. Heights and positions along the hull
 * come from measurements of the contemporary 1:48 model (RMG SLR0513) and
 * the sheer plan (ZAZ0120), scaled from the 186 ft gun deck.
 */

/** Port spacing, centre to centre (about 11.5 ft). */
const SPACING = 3.536;
/** Upper-deck ports: 15 a side, from just forward of the quarter gallery. */
const UPPER_X = Array.from({ length: 15 }, (_, i) => 2.8 + i * SPACING);
/** The middle-deck ports are staggered midway between the others. */
const MIDDLE_X = UPPER_X.map((x) => x + SPACING / 2);

const SHEER = { riseAft: 1.5, riseFwd: 1.7 } as const;

/*
 * Masts and yards: Steel 1794, "Dimensions of Masts and Yards in the Royal
 * Navy", 100 guns (checked against Victory's surviving 1803 fore topsail),
 * set at heights reconstructed above the load waterline. Mast positions by
 * the RN rule (1/9, 5/9 and 17/20 of the gun deck from the stem), raked aft.
 * Topsails: four reef bands (Victory's log, 24 Oct 1805), straight feet;
 * courses: one reef band, hollow feet; each with a middle band.
 */
const fore: MastSpec = {
  id: "fore",
  x: 50.37,
  rakeDeg: 0.5,
  deckY: 5.3,
  topY: 23.3,
  lowerHeadY: 27.7,
  topmastHeadY: 41.7,
  crosstreesY: 39.5,
  topgallantHeadY: 48.1,
  truckY: 54.1,
  topWidth: 4.79,
  diameters: { lower: 0.88, topmast: 0.5, topgallant: 0.26 },
  yards: [
    {
      id: "course",
      y: 21.8,
      length: 27.15,
      diameter: 0.53,
      sail: {
        set: true,
        reefBands: 1,
        footRoach: 1.3,
        drop: 12.2,
        middleBand: true,
        buntlineCloths: 4,
      },
    },
    {
      id: "topsail",
      y: 37.7,
      length: 19.66,
      diameter: 0.35,
      sail: {
        set: true,
        reefBands: 4,
        footRoach: 0,
        middleBand: true,
        buntlineCloths: 2,
      },
    },
    {
      id: "topgallant",
      y: 47.5,
      length: 13.11,
      diameter: 0.22,
      sail: { set: true, reefBands: 0, footRoach: 0 },
    },
    {
      id: "royal",
      y: 53.0,
      length: 9.75,
      diameter: 0.16,
      sail: { set: true, reefBands: 0, footRoach: 0 },
    },
  ],
  shroudsPerSide: 10,
  topmastShroudsPerSide: 5,
  topgallantShroudsPerSide: 3,
  backstaysPerSide: 4,
};

const main: MastSpec = {
  id: "main",
  x: 25.04,
  rakeDeg: 2,
  deckY: 5.3,
  topY: 25.6,
  lowerHeadY: 30.6,
  topmastHeadY: 46.2,
  crosstreesY: 43.8,
  topgallantHeadY: 53.4,
  truckY: 60.2,
  topWidth: 5.33,
  diameters: { lower: 0.98, topmast: 0.54, topgallant: 0.28 },
  yards: [
    {
      id: "course",
      y: 24.1,
      length: 31.19,
      diameter: 0.61,
      sail: {
        set: true,
        reefBands: 1,
        footRoach: 1.0,
        drop: 13.1,
        middleBand: true,
        buntlineCloths: 4,
      },
    },
    {
      id: "topsail",
      y: 41.7,
      length: 22.25,
      diameter: 0.39,
      sail: {
        set: true,
        reefBands: 4,
        footRoach: 0,
        middleBand: true,
        buntlineCloths: 2,
      },
    },
    {
      id: "topgallant",
      y: 52.8,
      length: 14.86,
      diameter: 0.25,
      sail: { set: true, reefBands: 0, footRoach: 0 },
    },
    {
      id: "royal",
      y: 59.1,
      length: 10.97,
      diameter: 0.18,
      sail: { set: true, reefBands: 0, footRoach: 0 },
    },
  ],
  shroudsPerSide: 11,
  topmastShroudsPerSide: 5,
  topgallantShroudsPerSide: 3,
  backstaysPerSide: 4,
};

const mizzen: MastSpec = {
  id: "mizzen",
  x: 8.12,
  rakeDeg: 3.5,
  deckY: 7.5,
  topY: 23.3,
  lowerHeadY: 26.8,
  topmastHeadY: 39.2,
  crosstreesY: 37.4,
  topgallantHeadY: 44.8,
  truckY: 49.9,
  topWidth: 3.96,
  diameters: { lower: 0.66, topmast: 0.4, topgallant: 0.2 },
  yards: [
    // The crossjack spreads the mizzen topsail foot; no sail of its own.
    { id: "crossjack", y: 21.8, length: 19.66, diameter: 0.35 },
    {
      id: "mizzenTopsail",
      y: 36.2,
      length: 14.94,
      diameter: 0.27,
      sail: {
        set: true,
        reefBands: 3,
        footRoach: 0.69,
        middleBand: true,
        buntlineCloths: 2,
      },
    },
    {
      id: "mizzenTopgallant",
      y: 44.2,
      length: 9.98,
      diameter: 0.17,
      sail: { set: true, reefBands: 0, footRoach: 0 },
    },
  ],
  shroudsPerSide: 7,
  topmastShroudsPerSide: 4,
  topgallantShroudsPerSide: 2,
  backstaysPerSide: 3,
};

const gunDecks: GunDeckSpec[] = [
  {
    // 15 a side, one per gun, as on the contemporary model of the 1800–03
    // repair: the new bow port one space forward of the foremost upper-deck
    // port, and none under the aftmost. (A Trafalgar midshipman and the
    // present ship have 16; the owner chose the model. history-notes.md.)
    id: "lower",
    portsPerSide: 15,
    sill: { y: 1.42, ...SHEER },
    port: { width: 1.0, height: 0.95 },
    firstX: UPPER_X[1],
    lastX: UPPER_X[14] + SPACING,
    xs: [...UPPER_X.slice(1), UPPER_X[14] + SPACING],
    band: { below: 0.08, above: 0.3, taper: 0.3 },
  },
  {
    // 15 broadside ports, staggered, plus a small double-door bow port.
    id: "middle",
    portsPerSide: 15,
    sill: { y: 3.75, ...SHEER },
    port: { width: 0.95, height: 0.9 },
    firstX: MIDDLE_X[0],
    lastX: MIDDLE_X[14],
    xs: MIDDLE_X,
    band: { below: 0.06, above: 0.36, taper: 0.25 },
    bowPort: { x: 56.4 },
  },
  {
    // 15 a side; the central eight (3rd–10th from forward) had no lids.
    id: "upper",
    portsPerSide: 15,
    sill: { y: 5.9, ...SHEER },
    port: { width: 0.86, height: 0.82 },
    firstX: UPPER_X[0],
    lastX: UPPER_X[14],
    xs: UPPER_X,
    band: { below: 0.05, above: 0.28, taper: 0.2 },
    openPorts: [5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    // Three lidded cabin ports under the poop, four open ones forward.
    id: "quarterdeck",
    portsPerSide: 7,
    sill: { y: 8.15, ...SHEER },
    port: { width: 0.74, height: 0.68 },
    firstX: 3.4,
    lastX: 24.5,
    xs: [3.4, 6.7, 10.0, 14.6, 17.9, 21.2, 24.5],
    openPorts: [3, 4, 5, 6],
  },
  {
    id: "forecastle",
    portsPerSide: 3,
    sill: { y: 8.25, ...SHEER },
    port: { width: 0.74, height: 0.68 },
    firstX: 42.6,
    lastX: 54.2,
    xs: [42.6, 52.0, 54.2],
    openPorts: [0, 1, 2],
  },
];

export const VICTORY_1805: ShipSpec = {
  id: "victory-1805",
  name: "HMS Victory",
  nation: "britain",
  year: 1805,
  guns: 104,
  decks: 3,
  seed: 1765,
  hull: {
    gunDeckLength: 56.7,
    waterlineLength: 56.55,
    draught: 7.6,
    sternpostRakeDeg: 8,
    sternOverhang: 4.0,
    stemOverhang: 2.0,
    // Lowest a little abaft amidships; about 1.5 m up at the stern and
    // 1.7 m at the bow.
    sheer: { lowX: 27, aftX: 1.8, fwdX: 55.4 },
    // The rails have about half the wales' sheer; the raised decks step up
    // in drifts: waist 8.8 m, quarterdeck 10.1, forecastle 10.3–10.9, poop
    // 12.0–12.5 at the taffrail.
    rail: { y: 8.8, riseAft: 0.8, riseFwd: 0.9 },
    forecastle: { endX: 41.7, rail: 1.26 },
    quarterdeck: { startX: 27, rail: 1.24 },
    poop: { startX: 12.2, rail: 2.92 },
    copperAbove: 0.4,
  },
  gunDecks,
  wales: [
    { line: { y: 0, ...SHEER }, thickness: 1.34 },
    { line: { y: 2.67, ...SHEER }, thickness: 1.02 },
    { line: { y: 5.01, ...SHEER }, thickness: 0.84 },
  ],
  details: {
    quarterGallery: {
      startX: -3.6,
      endX: 1.5,
      bottom: 3.7,
      top: 10.7,
      tiers: 3,
      windowsPerTier: 3,
    },
    head: {
      length: 6.3,
      figureheadBase: 7.5,
      figureheadTop: 10.6,
      rails: 3,
    },
    sideSteps: { x: 27.6 },
    beakhead: { x: 55.4, bottom: 7.0 },
    hawse: [
      { x: 56.2, y: 3.85 },
      { x: 56.95, y: 3.7 },
    ],
    channels: [
      { mast: "fore", y: 7.0, startX: 41.4, endX: 50.6 },
      { mast: "main", y: 7.0, startX: 10.0, endX: 25.3 },
      { mast: "mizzen", y: 7.0, startX: 0.8, endX: 9.1 },
    ],
    cathead: { x: 54.7, y: 10.0 },
    sternTiers: 3,
    hammockNettings: true,
    lanterns: 3,
    boats: { startX: 31.5, endX: 40.0, rise: 0.55 },
  },
  rig: {
    masts: [fore, main, mizzen],
    // Bowsprit 74 ft at about 34° (Steel: "nearly thirty-six degrees"),
    // bedded at the stem head and just clearing the figurehead's crown;
    // jib-boom 53 ft; a flying jib-boom (carried in 1805); spritsail yard
    // crossed, sail furled.
    bowsprit: {
      heelX: 58.2,
      heelY: 7.3,
      steeveDeg: 34,
      length: 16.9,
      diameter: 0.94,
      jibBoom: { length: 16.15, overlap: 5.8 },
      flyingJibBoom: { length: 13.0, overlap: 6.9 },
      spritsailYard: { along: 11, length: 19.66, diameter: 0.35 },
      dolphinStriker: 3.4,
    },
    // Driver (spanker) on a gaff and boom, eased about 25° toward the viewer.
    spanker: {
      set: true,
      gaffThroatY: 22.7,
      gaffLength: 13.7,
      gaffAngleDeg: 30,
      boomY: 12.3,
      boomLength: 20.7,
      boomRise: 1.1,
      easeDeg: 25,
    },
    headsails: [
      {
        id: "foreStaysail",
        set: false,
        luffFraction: 0.5,
        tackAngleDeg: 70,
        footRatio: 0.55,
      },
      {
        id: "foreTopmastStaysail",
        set: true,
        luffFraction: 0.62,
        tackAngleDeg: 68,
        footRatio: 0.5,
      },
      {
        id: "jib",
        set: true,
        luffFraction: 0.7,
        tackAngleDeg: 64,
        footRatio: 0.5,
      },
      {
        id: "flyingJib",
        set: true,
        luffFraction: 0.68,
        tackAngleDeg: 60,
        footRatio: 0.46,
      },
    ],
    // Braced about 30° from square (the log puts the wind 2–3 points abaft
    // the beam); drawn a little wider, as the ship portraitists did.
    braceForeshortening: 0.64,
    // Steel: 13 in apart; drawn wider so they stay legible at this scale.
    ratlineSpacing: 0.55,
  },
  // Flags about 1:2, streaming toward the viewer and to the right, so drawn
  // at about three quarters of their true fly.
  flags: [
    {
      id: "vice-admiral",
      design: "vice-admiral-white",
      at: { kind: "masthead", mast: "fore" },
      hoist: 3.6,
      fly: 5.4,
    },
    {
      id: "ensign",
      design: "white-ensign",
      at: { kind: "gaffPeak" },
      hoist: 5.6,
      fly: 8.6,
    },
  ],
  paint: {
    // The 2015 NMRN paint research: "Victory Hull Ochre" (NCS S 3020-Y40R)
    // and a near-neutral black (NCS S 8500-N); red port linings.
    hull: "#2d2c2b",
    wale: "#2a2928",
    band: "#c29a77",
    bandStyle: "chequer",
    portLid: "#2d2c2b",
    upperWorks: "#2d2c2b",
    copper: "#8c6649",
    copperShade: "#5f6e5c",
    sternBase: "#2d2c2b",
    sternTrim: "#c29a77",
    glass: "#3a4553",
    hammocks: "#cfc7b6",
    spar: "#a88a60",
    sparDark: "#2a2826",
    figurehead: "#e6e0d2",
    figureAccents: {
      crown: "#c9a24a",
      sashStarboard: "#34508a",
      scroll: "#3b5a8a",
    },
    portLining: "#a6432a",
    beakhead: "#3b5a8a",
    galleryGround: "#2d2c2b",
    galleryTrim: "#c29a77",
    lowerMast: "#c9a456",
    canvas: {
      lit: "#e9dfc8",
      shade: "#cfc3a6",
      seam: "#b8ab8c",
      boltRope: "#8d8067",
      reef: "#a69a7f",
    },
    rigging: { standing: "#2a221c", running: "#5a4a3a" },
    warmLight: "#f4c27c",
  },
};
