import type { TrackSpec } from "@/components/chart/lines/Track";
import { day } from "./dates";

/**
 * The army's march from Boulogne to Ulm, 28 August to 20 October 1805: a
 * dashed line drawn by dates across the relief, as the fleets' tracks are
 * (the owner's answer of 14 November 2026). A composite labelled as the
 * army, as the history notes rule ("The turn east and Ulm", "Routes on the
 * chart"): the head of Soult's IV corps, the corps from the Boulogne camps,
 * by its own road (Saint-Omer, Douai and Cambrai, the Ardennes by Avesnes,
 * Hirson and Mézières, up the Meuse to Verdun, Metz, across the Vosges by
 * Bitche to Wissembourg, the Rhine at Rheinhausen by Speyer, Bruchsal,
 * Heilbronn, Hall, Ellwangen and Nördlingen) to the Danube at Donauwörth;
 * then up the Danube's left bank by Ney's VI corps (Günzburg, Elchingen)
 * to Ulm, where the garrison marched out and laid down its arms from 2 p.m.
 * on 20 October.
 *
 * The places and dates are the research's thinner set for a chart of
 * western Europe (docs/research/scene-02/session-32/army-march.md: every
 * left-out stage within about 8 km of the line); between Boulogne and Metz
 * the dates are derived from a division of the same corps on the same road
 * and held by the reports at Mézières and Metz (medium confidence), from
 * Metz on they are the order of movement and the reports (high). A halt is
 * a stay (`until`): the head waits there. Present-day town centres; the
 * roads between them are smoothed by the track's curve.
 */
export const ARMY_MARCH: TrackSpec = {
  id: "army",
  style: "army",
  side: "above",
  points: [
    // The first divisions leave the camps on the morning of 28 August.
    { lon: 1.612, lat: 50.726, day: day(8, 28, 6), label: "28 August" },
    { lon: 2.253, lat: 50.752, day: day(8, 29, 18) },
    { lon: 3.08, lat: 50.368, day: day(9, 2, 18) },
    { lon: 3.235, lat: 50.176, day: day(9, 3, 18), until: day(9, 5, 6) },
    { lon: 3.932, lat: 50.122, day: day(9, 6, 18) },
    { lon: 4.084, lat: 49.92, day: day(9, 7, 18) },
    // Mézières: arrived on the 9th, held on the 10th, gone on the 11th.
    { lon: 4.697, lat: 49.765, day: day(9, 9, 18), until: day(9, 11, 6) },
    { lon: 4.943, lat: 49.703, day: day(9, 11, 18) },
    { lon: 5.387, lat: 49.159, day: day(9, 14, 18), until: day(9, 16, 6) },
    // Metz: in on the 16th, held on the 17th, gone on the 18th (the order).
    { lon: 6.176, lat: 49.12, day: day(9, 16, 18), until: day(9, 18, 6) },
    { lon: 7.425, lat: 49.051, day: day(9, 21, 18) },
    { lon: 7.945, lat: 49.037, day: day(9, 23, 18) },
    { lon: 8.367, lat: 49.222, day: day(9, 24, 18) },
    // The Rhine at Rheinhausen, opposite Speyer: the advance guard over by
    // ferry at noon on the 26th, the corps over by the 30th.
    {
      lon: 8.473,
      lat: 49.28,
      day: day(9, 26, 12),
      label: "26–30 September",
      // A date stands square to its line: at the crossing's sharp turn,
      // north (outside it) beyond Spire's mark, whose name stands west. The
      // dates lie on the chart, so north of a town they come nearer on
      // screen as the view meets the chart at a slant: far enough to clear
      // the mark in the cut-away's view.
      side: "above",
      clear: 7,
    },
    { lon: 8.598, lat: 49.124, day: day(9, 27, 18) },
    // Heilbronn: the first two divisions on the 29th, gone on 2 October.
    { lon: 9.219, lat: 49.142, day: day(9, 29, 18), until: day(10, 2, 6) },
    { lon: 9.737, lat: 49.112, day: day(10, 3, 18) },
    { lon: 10.132, lat: 48.962, day: day(10, 5, 6) },
    { lon: 10.489, lat: 48.852, day: day(10, 6, 12) },
    // Donauwörth: taken in the night of the 6th, the Danube crossed on the 7th.
    { lon: 10.781, lat: 48.718, day: day(10, 7, 6) },
    // Höchstädt, where Ney's corps came down to the Danube on the evening of
    // the 7th: the line passes here from Soult's road to Ney's (only
    // Donauwörth to Höchstädt no corps marched). The day of the Danube is
    // lettered here, on the straight reach up the river, south-east of the
    // line: at Donauwörth the road's turn, the town's name and the Danube's
    // leave it no room in the cut-away's view.
    {
      lon: 10.566,
      lat: 48.611,
      day: day(10, 7, 20),
      label: "7 October",
      side: "below",
      clear: 1.4,
    },
    // Ney's corps along the left bank: the Günzburg bridge on the evening of
    // the 9th, Elchingen at 8 a.m. on the 14th, the Michelsberg above Ulm
    // on the afternoon of the 15th.
    { lon: 10.277, lat: 48.455, day: day(10, 9, 18) },
    { lon: 10.08, lat: 48.45, day: day(10, 14, 8) },
    { lon: 9.981, lat: 48.421, day: day(10, 15, 15) },
    {
      lon: 9.993,
      lat: 48.399,
      day: day(10, 20, 14),
      label: "20 October",
      // West, beyond the arrowhead: the town's name stands east, the road
      // comes in from the north-east.
      side: "left",
      clear: 2.4,
    },
  ],
  legend: {
    text: "March of the Grande Armée",
    from: day(9, 5),
    to: day(9, 14),
    side: "above",
  },
};
