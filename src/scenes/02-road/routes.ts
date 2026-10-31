import type { Waypoint } from "@/components/chart/lines/Route";

/**
 * The fleets' routes as waypoints (longitude, latitude), drawn on the chart
 * as ink lines. Sources and doubts: docs/history-notes.md, "Scene 2".
 */

/**
 * Villeneuve from Toulon to Cádiz, 30 March to 9 April 1805, after the
 * noon positions in the Atlas's log (Desbrière 1907, p. 9) and Nelson's
 * frigates' bearings of Cape Sicié, with the stretches between them
 * estimated (docs/research/scene-02/h1-campaign.md, section 7, table A, as
 * checked in v-h1c.md and ruled in a-h1ac.md, H1-35e): out of the Grande
 * Rade and south past Cape Sicié, west across the open sea south of the
 * Gulf of Lion and south-east of Barcelona, inside the Balearics, off
 * Cartagena (becalmed on 7 April) and Cape de Gata, through the Strait in
 * two columns on the morning of 9 April, off Conil at about 4 p.m., and to
 * an anchorage outside the bay of Cádiz that evening. The line keeps at
 * least 2 nautical miles off every coast but the roads it leaves.
 */
export const TOULON_TO_CADIZ: readonly Waypoint[] = [
  [5.933, 43.1], // the Grande Rade, 30 March, about 4 p.m.
  [6.0, 43.033], // a league SE of Cap Sépet, 7 p.m.
  [5.833, 42.55], // 31 March, 8 a.m.
  [5.6, 42.067], // 31 March, 8 p.m.
  [4.517, 41.65], // noon, 1 April
  [2.55, 41.067], // noon, 2 April
  [1.233, 40.0], // noon, 3 April
  [0.75, 38.983], // noon, 4 April
  [0.467, 38.733],
  [0.167, 38.45], // noon, 5 April
  [-0.333, 37.717], // noon, 6 April
  [-0.633, 37.5],
  [-1.0, 37.5], // off Cartagena, 7 April
  [-1.583, 37.167],
  [-2.2, 36.583], // off Cape de Gata, early 8 April
  [-2.833, 36.083], // noon, 8 April
  [-4.333, 36.083],
  [-5.25, 36.017], // entering the Strait, 9 April, 9 a.m.
  [-5.583, 35.933], // off Tarifa, about 11 a.m.
  [-6.0, 36.0],
  [-6.18, 36.233], // off Conil, about 4 p.m.
  [-6.367, 36.55], // at anchor off Cádiz, 7.45 p.m.
];
