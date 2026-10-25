import type { Waypoint } from "@/components/chart/lines/Route";

/**
 * The fleets' routes as waypoints (longitude, latitude), drawn on the chart
 * as ink lines. Sources and doubts: docs/history-notes.md, "Scene 2".
 */

/**
 * Villeneuve from Toulon to Cádiz, 30 March to 9 April 1805: out of Toulon
 * and south-west, between the Balearics and the Spanish coast (he had word
 * that Nelson was off Sardinia), past Cartagena and Cape de Gata, through
 * the middle of the Strait, and round Cape Trafalgar to Cádiz.
 */
export const TOULON_TO_CADIZ: readonly Waypoint[] = [
  [5.93, 43.06],
  [5.4, 42.5],
  [3.4, 41.3],
  [1.3, 40.0],
  [0.6, 38.6],
  [-0.7, 37.4],
  [-1.95, 36.55],
  [-4.2, 36.3],
  [-5.35, 36.0],
  [-5.62, 35.95],
  [-6.15, 36.12],
  [-6.38, 36.5],
];
