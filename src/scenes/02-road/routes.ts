import type { Waypoint } from "@/components/chart/lines/Route";

/**
 * The fleets' routes as waypoints (longitude, latitude), drawn on the chart
 * as ink lines. Sources and doubts: docs/history-notes.md, "Scene 2".
 */

/**
 * Villeneuve from Toulon to Cádiz, 30 March to 9 April 1805: the table of
 * docs/research/scene-02/draft-h1.md ("Routes on the chart"), as checked
 * in v-draft-h1.md and ruled in a-v-draft-h1.md, after the noon positions
 * in the Atlas's log (Desbrière 1907, p. 9) and Nelson's frigates' bearings
 * of Cape Sicié, with the stretches between them estimated. Out of the
 * Grande Rade and south past Cape Sicié, west across the open sea south of
 * the Gulf of Lion and south-east of Barcelona, inside the Balearics, round
 * Cabo de Palos to Cartagena (becalmed on 7 April) and past Cape de Gata,
 * through the Strait in two columns on the morning of 9 April, past Cape
 * Trafalgar at about 4 p.m., through the offing of Cádiz and to an
 * anchorage outside the bay that evening. The drawn curve keeps at least
 * 2.2 nautical miles off every coast and cape but the road it leaves, on
 * Natural Earth's coastline.
 */
export const TOULON_TO_CADIZ: readonly Waypoint[] = [
  [5.99, 43.092], // the Grande Rade, 30 March, weighed about 4 p.m.
  [6.0, 43.045], // a league SE of Cap Sépet, about 7 p.m.
  [5.833, 42.55], // Cape Sicié N by E 10 leagues, 31 March, 8 a.m.
  [5.6, 42.067], // Cape Sicié N by E 20 leagues, 31 March, 8 p.m.
  [4.517, 41.65], // noon, 1 April
  [2.55, 41.067], // noon, 2 April
  [1.233, 40.0], // noon, 3 April
  [0.75, 38.983], // noon, 4 April
  [0.167, 38.45], // noon, 5 April
  [-0.333, 37.717], // noon, 6 April
  [-0.633, 37.5], // south of Cabo de Palos, 6–7 April
  [-1.0, 37.5], // becalmed off Cartagena, 7 April
  [-2.2, 36.583], // south of Cape de Gata, night of 7–8 April
  [-2.833, 36.083], // noon, 8 April
  [-5.25, 36.017], // entering the Strait, 9 April, about 9 a.m.
  [-5.583, 35.933], // off Tarifa, about 11 a.m.
  [-6.0, 36.0], // the west mouth, early afternoon
  [-6.183, 36.233], // past Cape Trafalgar, off Conil, about 4 p.m.
  [-6.36, 36.42], // the offing of Cádiz, evening
  [-6.37, 36.55], // at anchor outside the bay, about 7.45 p.m.
];
