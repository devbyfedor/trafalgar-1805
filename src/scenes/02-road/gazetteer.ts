import type { Label } from "@/components/chart/lettering/Lettering";

/**
 * The names on the chart, in the forms of 1805 (docs/history-notes.md,
 * "Scene 2", names). Sizes are em heights on the chart in world km, chosen
 * so each name is read at the scale where it matters; positions are the
 * label's centre, off the coast for capes and waters.
 */
export const GAZETTEER: readonly Label[] = [
  // Oceans and seas: spaced capitals, as period charts set them.
  {
    text: "ATLANTIC OCEAN",
    role: "ocean",
    lon: -36,
    lat: 33.5,
    size: 210,
    tracking: 0.32,
    showPx: [12, 80],
  },
  {
    text: "MEDITERRANEAN SEA",
    role: "sea",
    lon: 4.6,
    lat: 38.4,
    size: 62,
    tracking: 0.22,
    angle: 6,
    showPx: [10, 60],
  },
  { text: "Bay of Biscay", role: "water", lon: -5.2, lat: 45.6, size: 44 },
  {
    text: "The Channel",
    role: "water",
    lon: -2.4,
    lat: 49.95,
    size: 20,
    angle: 12,
  },
  {
    text: "Gulf of Cadiz",
    role: "water",
    lon: -7.0,
    lat: 36.22,
    size: 8,
    angle: -8,
  },
  {
    text: "Straits of Gibraltar",
    role: "water",
    lon: -5.62,
    lat: 35.9,
    size: 3.6,
    angle: 6,
  },
  {
    text: "C. Trafalgar",
    role: "water",
    lon: -6.33,
    lat: 36.12,
    size: 4,
  },
  {
    text: "C. St Vincent",
    role: "water",
    lon: -9.55,
    lat: 36.9,
    size: 6,
  },
  {
    text: "C. Finisterre",
    role: "water",
    lon: -10.15,
    lat: 42.85,
    size: 9,
  },
  // Places.
  { text: "Cadiz", role: "place", lon: -6.05, lat: 36.6, size: 5.4 },
  { text: "Gibraltar", role: "place", lon: -5.12, lat: 36.24, size: 4.2 },
  { text: "Tangier", role: "place", lon: -5.75, lat: 35.66, size: 4.2 },
  { text: "Ceuta", role: "place", lon: -5.18, lat: 35.8, size: 3.4 },
  { text: "Seville", role: "place", lon: -5.98, lat: 37.45, size: 5.4 },
  { text: "Lisbon", role: "place", lon: -8.75, lat: 38.78, size: 8 },
  { text: "Ferrol", role: "place", lon: -7.85, lat: 43.5, size: 8 },
  { text: "Madrid", role: "place", lon: -3.7, lat: 40.42, size: 13 },
  { text: "Toulon", role: "place", lon: 6.05, lat: 43.35, size: 10 },
  { text: "Brest", role: "place", lon: -4.1, lat: 48.5, size: 10 },
  { text: "Boulogne", role: "place", lon: 2.15, lat: 50.68, size: 7 },
  { text: "Portsmouth", role: "place", lon: -1.1, lat: 50.98, size: 7 },
  { text: "Paris", role: "place", lon: 2.35, lat: 48.86, size: 16 },
  { text: "London", role: "place", lon: -0.12, lat: 51.55, size: 14 },
  // Lands.
  { text: "Spain", role: "land", lon: -4.2, lat: 39.6, size: 64 },
  {
    text: "Portugal",
    role: "land",
    lon: -7.95,
    lat: 39.75,
    size: 26,
  },
  { text: "France", role: "land", lon: 2.4, lat: 46.6, size: 70 },
  { text: "England", role: "land", lon: -1.6, lat: 52.6, size: 34 },
  { text: "Barbary", role: "land", lon: -5.6, lat: 32.6, size: 70 },
  // Islands.
  { text: "Madeira", role: "place", lon: -16.95, lat: 33.15, size: 16 },
  { text: "Canary Islands", role: "place", lon: -15.6, lat: 29.35, size: 24 },
  { text: "Western Islands", role: "place", lon: -27.6, lat: 39.5, size: 30 },
  { text: "West Indies", role: "water", lon: -63.5, lat: 18.6, size: 54 },
  { text: "Martinico", role: "place", lon: -61.0, lat: 14.95, size: 9 },
  { text: "Barbadoes", role: "place", lon: -59.55, lat: 13.45, size: 8 },
];
