import type { Waypoint } from "@/components/chart/lines/Route";
import { day } from "./dates";

/**
 * The fleets' routes as dated waypoints, drawn on the chart as tracks that
 * draw themselves day by day. Sources and doubts: docs/history-notes.md,
 * "Scene 2", "Routes on the chart"; the tables are docs/research/scene-02
 * /routes-draft.json with the corrections of a-v-draft-h1.md (ruling 1:
 * the Vigo legs keep clear of the rocks off San Martiño).
 *
 * A point's day is the time the ship was there (days since 1 January 1805,
 * ship's time); points without one are estimated places between dated
 * ones, and the head passes them by distance. `mark` puts a day circle on
 * a noon position, as the period's track charts did; Villeneuve's crossing
 * has none, since which day each of the Atlas's noons belongs to is
 * disputed (a-h1ac.md, H1-07): its printed dates only pace the drawing.
 * Every line was checked against Natural Earth's coast (2 nm off every
 * coast but at anchorages and harbour approaches).
 */

export interface DatedWaypoint {
  lon: number;
  lat: number;
  /** Days since 1 January 1805; none for an estimated place between dated ones. */
  day?: number;
  /** A day circle at this noon position. */
  mark?: boolean;
}

export interface Leg {
  id: string;
  side: "british" | "combined";
  waypoints: readonly DatedWaypoint[];
}

/** Villeneuve, Toulon to Cádiz, 30 March to 9 April 1805 (the leg Stage A draws). Table A of research/scene-02/h1-campaign.md, section 7, as checked in v-h1c.md (H1-35) and ruled in a-h1ac.md (H1-35e). */
export const villeneuveToulonCadiz: Leg = {
  id: "villeneuve-toulon-cadiz",
  side: "combined",
  waypoints: [
    { lon: 5.99, lat: 43.092, day: day(3, 30, 16) }, // 30 March, weighed about 4 p.m.: Toulon road, middle of the Grande Rade (berths not recorded; est.). Desbrière 1907, p. 7
    { lon: 6, lat: 43.045, day: day(3, 30, 19) }, // 30 March, about 7 p.m.: a league SE of Cap Sépet: the Atlas's log has the cape NW 1/4 N, one league; computed with gufm1's 19.8° W variation
    { lon: 5.833, lat: 42.55, day: day(3, 31, 8) }, // 31 March, 8 a.m.: first seen by Active and Phoebe, Cape Sicié N by E 10 leagues (Nicolas VI 398); compass or true not stated, the two readings…
    { lon: 5.6, lat: 42.067, day: day(3, 31, 20) }, // 31 March, 8 p.m.: Cape Sicié N by E (true) 20 leagues: the frigates' position, close to the fleet (Nicolas VI 396)
    { lon: 4.517, lat: 41.65, day: day(4, 1), mark: true }, // 1 April, noon: Atlas's log, open sea south of the Gulf of Lion
    { lon: 2.55, lat: 41.067, day: day(4, 2), mark: true }, // 2 April, noon: Atlas's log, about 25 nm SE of Barcelona
    { lon: 1.233, lat: 40, day: day(4, 3), mark: true }, // 3 April, noon: Atlas's log, east of the Columbretes
    { lon: 0.75, lat: 38.983, day: day(4, 4), mark: true }, // 4 April, noon: Atlas's latitude; longitude est., mid-channel between Ibiza and Cabo de la Nao (20 nm from Ibiza)
    { lon: 0.167, lat: 38.45, day: day(4, 5), mark: true }, // 5 April, noon: Atlas's latitude; longitude est., about 20 nm off Benidorm
    { lon: -0.333, lat: 37.717, day: day(4, 6), mark: true }, // 6 April, noon: Atlas's latitude; longitude est., about 20 nm off the Mar Menor
    { lon: -0.633, lat: 37.5, day: day(4, 7, 0) }, // 6-7 April: est., about 8 nm south of Cabo de Palos and the Hormigas
    { lon: -1, lat: 37.5, day: day(4, 7), mark: true }, // 7 April: becalmed off Cartagena (Atlas's noon latitude; Desbrière 1907, p. 8; Corbett 1910, p. 61); longitude est., about 5 nm off the harbour mouth
    { lon: -2.2, lat: 36.583, day: day(4, 8, 0) }, // night of 7-8 April: est., about 8 nm south of Cabo de Gata
    { lon: -2.833, lat: 36.083, day: day(4, 8), mark: true }, // 8 April, noon: Atlas's latitude; longitude est., NE of Alborán Island
    { lon: -5.25, lat: 36.017, day: day(4, 9, 9) }, // 9 April, about 9 a.m.: entering the Strait in two columns, frigates ahead (Desbrière 1907, p. 9); position est.
    { lon: -5.583, lat: 35.933, day: day(4, 9, 11) }, // 9 April, about 11 a.m.: mid-Strait off Tarifa (est.; a-h1ac.md, H1-35e)
    { lon: -6, lat: 36, day: day(4, 9, 13) }, // 9 April, early afternoon: west mouth, mid-channel between Cape Trafalgar and Cape Spartel (est.)
    { lon: -6.183, lat: 36.233, day: day(4, 9, 16) }, // 9 April, about 4 p.m.: just past Cape Trafalgar, off Conil, when the frigates signalled Orde's six (a-h1ac.md, H1-35e; no source gives the position)
    { lon: -6.36, lat: 36.42, day: day(4, 9, 19) }, // 9 April, evening: est., in the offing; keeps the line about 3 nm off Sancti Petri and the rocks off Cádiz
    { lon: -6.37, lat: 36.55, day: day(4, 9, 19.9) }, // 9 April, about 7.45-8 p.m., to 1.30-2 a.m. on 10 April: anchored outside the bay (Desbrière 1907, pp. 9, 26 n.; Corbett 1910, p. 68); position…
  ],
};

/** Villeneuve, Cádiz to Martinique, 10 April to 14 May 1805. Table B: the Atlas's 32 dead-reckoning noon positions (Desbrière 1907, p. */
export const villeneuveCrossing: Leg = {
  id: "villeneuve-crossing",
  side: "combined",
  waypoints: [
    { lon: -6.37, lat: 36.55, day: day(4, 10, 1.75) }, // 10 April, 1.30-2 a.m.: weighed from the anchorage outside Cádiz bay
    { lon: -7.25, lat: 36.15, day: day(4, 10), mark: true }, // 10 April, noon: Atlas's log (table A, last row)
    { lon: -8.167, lat: 35.45, day: day(4, 11) }, // 11 April (printed)
    { lon: -9.167, lat: 34.717, day: day(4, 12) }, // 12 April (printed)
    { lon: -9.7, lat: 33.917, day: day(4, 13) }, // 13 April (printed)
    { lon: -10.217, lat: 33, day: day(4, 14) }, // 14 April (printed)
    { lon: -10.15, lat: 32.75, day: day(4, 15) }, // 15 April (printed): off Cape Cantin, where the fleet turned west
    { lon: -11.783, lat: 32.033, day: day(4, 16) }, // 16 April (printed)
    { lon: -13.917, lat: 31.133, day: day(4, 17) }, // 17 April (printed)
    { lon: -16.25, lat: 30.317, day: day(4, 18) }, // 18 April (printed): close to the Salvages (Nelson's diary, Nicolas VI 468)
    { lon: -19.767, lat: 29.317, day: day(4, 19) }, // 19 April (printed)
    { lon: -22.033, lat: 28.067, day: day(4, 20) }, // 20 April (printed)
    { lon: -24.1, lat: 26.917, day: day(4, 21) }, // 21 April (printed)
    { lon: -26.233, lat: 25.867, day: day(4, 22) }, // 22 April (printed)
    { lon: -28.367, lat: 24.6, day: day(4, 23) }, // 23 April (printed)
    { lon: -30.367, lat: 24.233, day: day(4, 24) }, // 24 April (printed)
    { lon: -31.217, lat: 23.8, day: day(4, 25) }, // 25 April (printed)
    { lon: -32.117, lat: 23.3, day: day(4, 26) }, // 26 April (printed): westerlies force a run SSW until 2 May
    { lon: -32.433, lat: 22.883, day: day(4, 27) }, // 27 April (printed)
    { lon: -33.033, lat: 21.75, day: day(4, 28) }, // 28 April (printed)
    { lon: -33.617, lat: 20.9, day: day(4, 29) }, // 29 April (printed)
    { lon: -33.667, lat: 19.967, day: day(4, 30) }, // 30 April (printed)
    { lon: -34.017, lat: 19.567, day: day(5, 1) }, // 1 May (printed)
    { lon: -34.8, lat: 19.033, day: day(5, 2) }, // 2 May (printed)
    { lon: -35.75, lat: 18.733, day: day(5, 3) }, // 3 May (printed)
    { lon: -37.45, lat: 18.433, day: day(5, 4) }, // 4 May (printed)
    { lon: -39.183, lat: 18.183, day: day(5, 5) }, // 5 May (printed)
    { lon: -42.1, lat: 17.933, day: day(5, 6) }, // 6 May (printed)
    { lon: -44.35, lat: 17.383, day: day(5, 7) }, // 7 May (printed)
    { lon: -48.35, lat: 16.467, day: day(5, 9) }, // 9 May (printed)
    { lon: -50.8, lat: 15.933, day: day(5, 10) }, // 10 May (printed)
    { lon: -58.65, lat: 14.567, day: day(5, 12) }, // 12 May (printed): reckoning; about 1°50' too far east
    { lon: -60.47, lat: 14.583, day: day(5, 13, 13) }, // 13 May, 1 p.m.: land signalled seven leagues to the west (Villeneuve's journal, Desbrière 1907, p. 26 n.); est.
    { lon: -60.917, lat: 14.25, day: day(5, 14, 6) }, // 14 May, daybreak: entering the St Lucia Channel (Desbrière 1907, p. 25); mid-channel, est.
    { lon: -61.085, lat: 14.43, day: day(5, 14) }, // 14 May: est., about 2.8 nm W of Diamond Rock, which fired on the fleet as it passed
    { lon: -61.165, lat: 14.52 }, // est., off Cap Salomon, keeping 2 nm off the coast
    { lon: -61.08, lat: 14.59, day: day(5, 14), mark: true }, // 14 May: anchored off Fort-de-France (Fort Royal); est. berth in the bay
  ],
};

/** Villeneuve in the West Indies, 5 to 10 June 1805. Table C: the places named in Reille's journal and Villeneuve's report (Desbrière 1907, pp. */
export const villeneuveWestIndies: Leg = {
  id: "villeneuve-west-indies",
  side: "combined",
  waypoints: [
    { lon: -61.08, lat: 14.59, day: day(6, 5, 5) }, // 5 June, 5 a.m.: sailed from Fort-de-France
    { lon: -61.16, lat: 14.57 }, // est., out of the bay
    { lon: -61.29, lat: 14.8 }, // est., off NW Martinique
    { lon: -61.47, lat: 15.25 }, // est., under the lee of Dominica
    { lon: -61.545, lat: 15.58, day: day(6, 6), mark: true }, // 6 June: off Prince Rupert's Bay (a British convoy lay there, left alone)
    { lon: -61.783, lat: 16, day: day(6, 6, 15) }, // 6 June, 3-9 p.m.: off Basse-Terre, Guadeloupe: troops and pilots embarked
    { lon: -61.783, lat: 16, day: day(6, 6, 21) }, // the same berth, leaving
    { lon: -61.88, lat: 16.35 }, // est., north along Guadeloupe's lee
    { lon: -62, lat: 17.083, day: day(6, 8, 0) }, // night of 7-8 June: under the lee of Antigua (est.)
    { lon: -62.083, lat: 17.75, day: day(6, 8, 10) }, // 8 June, 10 a.m. to evening: convoy of 15 sighted to leeward of Barbuda, 14 taken (est.)
    { lon: -61.733, lat: 19.233, day: day(6, 10), mark: true }, // 10 June: turn for Europe, NNE for the Azores (Corbett's chart, read at ±0.3°)
  ],
};

/** Villeneuve, return to Europe, Cape Finisterre and Vigo, 10 June to 28 July 1805. Table D: Corbett's chart after Desbrière (±0.3°) with the Sally's noon position (British DR). */
export const villeneuveReturn: Leg = {
  id: "villeneuve-return",
  side: "combined",
  waypoints: [
    { lon: -61.733, lat: 19.233, day: day(6, 10), mark: true }, // 10 June: turn for Europe
    { lon: -60.967, lat: 27.467, day: day(6, 15, 19) }, // 15 June, 7 p.m.: the American schooner Sally sees about 22 sail; her noon position (Nicolas VI 463, 474)
    { lon: -59.05, lat: 28.667, day: day(6, 17), mark: true }, // 17 June: Corbett's chart
    { lon: -58.15, lat: 29.217, day: day(6, 18), mark: true }, // 18 June: Corbett's chart
    { lon: -57.95, lat: 31.733, day: day(6, 20), mark: true }, // 20 June: Corbett's chart
    { lon: -57.083, lat: 33.117, day: day(6, 21), mark: true }, // 21 June: Corbett's chart
    { lon: -55.883, lat: 33.717, day: day(6, 23, 0) }, // 22-23 June: Corbett's chart, the corner
    { lon: -55.6, lat: 34.817, day: day(6, 24), mark: true }, // 24 June: Corbett's chart; last daily mark
    { lon: -31.433, lat: 39.883, day: day(7, 2), mark: true }, // 2 July: Corvo sighted (Reille, Desbrière 1907, p. 57; chart)
    { lon: -26.5, lat: 41.283, day: day(7, 5), mark: true }, // 5 July: Corbett's chart
    { lon: -25.533, lat: 41.733, day: day(7, 6), mark: true }, // 6 July: Corbett's chart
    { lon: -22.017, lat: 42.083, day: day(7, 7), mark: true }, // 7 July: Corbett's chart
    { lon: -21.167, lat: 42.267, day: day(7, 8), mark: true }, // 8 July: Corbett's chart
    { lon: -20.317, lat: 42.433, day: day(7, 9), mark: true }, // 9 July: NE gale; Indomptable loses her main topmast
    { lon: -16.733, lat: 40.85, day: day(7, 12), mark: true }, // 12 July: nearest approach, about 300 miles west of Oporto
    { lon: -19.5, lat: 43.983, day: day(7, 16), mark: true }, // 16 July: Corbett's chart, after four days driven back west
    { lon: -16.983, lat: 43.283, day: day(7, 20), mark: true }, // 20 July: Corbett's chart; running east from the 19th
    { lon: -11.667, lat: 43.583, day: day(7, 22), mark: true }, // 22 July: the action (a-h1ac.md, H1-26: 43°35'N 11°40'W)
    { lon: -10.167, lat: 43, day: day(7, 25) }, // 25 July, noon: the Didon sights Cape Finisterre ESE (Desbrière 1907, p. 67); est.
    { lon: -8.98, lat: 42.16 }, // est., SW of the Cíes, clear of the rocks off San Martiño
    { lon: -8.88, lat: 42.17 }, // est., the south mouth of the Ría de Vigo
    { lon: -8.8, lat: 42.232 }, // est., in the ría, about 0.5 nm or more from the shore
    { lon: -8.75, lat: 42.25, day: day(7, 28, 19) }, // 28 July, nightfall: anchored in Vigo Bay (Desbrière 1907, pp. 68-69)
  ],
};

/** Vigo to A Coruña, 31 July to 2 August 1805. Estimated course: out by the south mouth of the ría, north outside Ons and Sálvora, round Cape Finisterre about 8 nm off (Desbrière 1907, p. */
export const villeneuveVigoCoruna: Leg = {
  id: "villeneuve-vigo-coruna",
  side: "combined",
  waypoints: [
    { lon: -8.75, lat: 42.25, day: day(7, 31), mark: true }, // 31 July: sailed from Vigo Bay with 15 of the line
    { lon: -8.8, lat: 42.232 }, // est., in the ría
    { lon: -8.88, lat: 42.17 }, // est., the south mouth
    { lon: -8.98, lat: 42.16 }, // est., SW of the Cíes, clear of the rocks off San Martiño
    { lon: -9.12, lat: 42.45 }, // est., outside Ons and Sálvora
    { lon: -9.25, lat: 42.7 }, // est.
    { lon: -9.45, lat: 42.883, day: day(8, 1, 19) }, // 1 August, evening: doubling Cape Finisterre, about 8 nm off (est.)
    { lon: -9.4, lat: 43.12 }, // est., off Cape Toriñana and Cape Villano
    { lon: -9, lat: 43.38 }, // est., outside the Sisargas
    { lon: -8.55, lat: 43.44 }, // est.
    { lon: -8.42, lat: 43.44 }, // est., north of the Torre de Hércules
    { lon: -8.375, lat: 43.395 }, // est., entering the ría
    { lon: -8.365, lat: 43.375, day: day(8, 2), mark: true }, // 2 August: the 13 French anchored at A Coruña (Desbrière 1907, p. 86); est. berth
  ],
};

/** Combined fleet, Ferrol to Cádiz, 13 to 20 August 1805. Table E: one British fix (the Iris, 14 August, Corbett 1910, p. */
export const combinedFerrolCadiz: Leg = {
  id: "combined-ferrol-cadiz",
  side: "combined",
  waypoints: [
    { lon: -8.3, lat: 43.42, day: day(8, 13) }, // 10-13 August: assembled in the outer bay off Ares (the Golfo Ártabro); est.
    { lon: -8.37, lat: 43.44 }, // est., the bay's mouth
    { lon: -8.62, lat: 43.52, day: day(8, 13, 15) }, // 13 August, afternoon: est., running west
    { lon: -9.433, lat: 44.283, day: day(8, 14, 14) }, // 14 August, about 2 p.m.: the Iris's report: course W by N 1/2 N (British DR; the frigate's or the fleet's position)
    { lon: -12.33, lat: 43.75, day: day(8, 15, 19) }, // 15 August, nightfall: turned for Cádiz (Villeneuve's letter); position est., low
    { lon: -11.75, lat: 41.5, day: day(8, 16) }, // 16 August: est., running south out of sight of land
    { lon: -11.25, lat: 38.667, day: day(8, 17) }, // 17 August: est.
    { lon: -9.333, lat: 36.833, day: day(8, 18, 0) }, // 17 or 18 August: off Cape St Vincent, three merchantmen burnt (est. position)
    { lon: -7.667, lat: 36.5, day: day(8, 19) }, // 19 August: est.
    { lon: -6.7, lat: 36.217, day: day(8, 20, 10) }, // 20 August, 10 a.m.: Cádiz NE about nine leagues (James III 375), as a true bearing; as a compass bearing about 36°07'N 6°32'W
    { lon: -6.42, lat: 36.5 }, // est., approach
    { lon: -6.34, lat: 36.5545 }, // west end of the channel between Las Puercas and El Diamante
    { lon: -6.278, lat: 36.5545 }, // east end of the channel
    { lon: -6.272, lat: 36.563, day: day(8, 20, 19) }, // 20 August, evening: anchored in Cádiz road: the outer-bay berth of a-h2c.md, H2-36d
  ],
};

/** Nelson, Sardinia to Cape St Vincent, 3 April to 11 May 1805. Table F, corrected by a-h1b.md (Palmas 26-30 March, Pula 31 March-3 April, off Palermo 9-10 April not Ustica on the 7th, Lagos 9-11 May, the bear-away point SE of the cape). */
export const nelsonMediterranean: Leg = {
  id: "nelson-mediterranean",
  side: "british",
  waypoints: [
    { lon: 9.033, lat: 38.967, day: day(4, 3, 5.5) }, // 31 March to 3 April, 5.30 a.m.: Pula Roads (Nicolas VI 390, 392)
    { lon: 8.88, lat: 38.83 }, // est., south of Capo Spartivento
    { lon: 8.62, lat: 38.8 }, // est., south of Capo Teulada
    { lon: 8.065, lat: 38.725, day: day(4, 4, 10) }, // 4 April, about 10 a.m.: the Phoebe joins with the news; Toro E 3/4 N 6 leagues at noon, computed by compass with 18.5° W
    { lon: 8.75, lat: 38.167, day: day(4, 5) }, // 4-6 April: between Sardinia and Galita, 48 hours (est.)
    { lon: 12.55, lat: 38.33 }, // control point north of Capo San Vito, outbound
    { lon: 13.22, lat: 38.27, day: day(4, 10, 0) }, // 9-10 April: off Palermo (Nicolas VI 402, 408)
    { lon: 12.6, lat: 38.45 }, // control point north of Capo San Vito, homebound
    { lon: 8.3, lat: 38.8, day: day(4, 17) }, // 16-18 April: off Toro (est.)
    { lon: 7.77, lat: 38.86, day: day(4, 19), mark: true }, // 19 April: ten leagues west of Toro
    { lon: 4, lat: 37.75, day: day(4, 23) }, // about 23 April: est., beating west
    { lon: 0.5, lat: 37, day: day(4, 27) }, // about 27 April: est., beating west
    { lon: -4.5, lat: 36.167, day: day(4, 30), mark: true }, // 30 April: Gibraltar Rock in sight (est.)
    { lon: -5.25, lat: 35.63, day: day(5, 4, 10.5) }, // 4-5 May: Tetuan (Mazari) Bay off the mouth of the Martil, watering (a-h2c.md, H2-39)
    { lon: -5.25, lat: 35.63, day: day(5, 5) }, // the same berth, leaving
    { lon: -5.2, lat: 35.92 }, // est., east of Ceuta
    { lon: -5.33, lat: 36.04 }, // est., 4 nm south of Europa Point
    { lon: -5.386, lat: 36.093, day: day(5, 6, 14) }, // 6 May, 2-6 p.m.: mouth of Gibraltar Bay
    { lon: -5.386, lat: 36.093, day: day(5, 6, 18) }, // the same berth, leaving
    { lon: -5.395, lat: 36.03 }, // est.
    { lon: -5.55, lat: 35.97 }, // est., through the Gut
    { lon: -5.62, lat: 35.95 }, // est., off Tarifa
    { lon: -6, lat: 36 }, // est., west mouth
    { lon: -8.58, lat: 37.02 }, // est., approach to Lagos Bay
    { lon: -8.62, lat: 37.09, day: day(5, 9, 21) }, // 9 May, 9 p.m., to 11 May, 9.10 a.m.: Lagos Bay (Nicolas VI 429, 433)
    { lon: -8.62, lat: 37.09, day: day(5, 11, 9.1667) }, // the same berth, leaving
    { lon: -8.66, lat: 37.02 }, // est., out of the bay
    { lon: -8.683, lat: 36.783, day: day(5, 11, 18.8333) }, // 11 May, 6.50 p.m.: bore up for the West Indies, Cape St Vincent NW by N 7 leagues (a-h1b.md, S3-11MAY; ±5 nm)
  ],
};

/** Nelson, Cape St Vincent to Barbados, 11 May to 4 June 1805. Table G: the daily marks of Faden's chart of 1807 ('copied from his Lordship's original MS.') as Corbett redrew them, read at ±0.3°; the 14 May mark fits 'thirty-eight leagues from Madeira' (Nicolas VI 436). */
export const nelsonOutward: Leg = {
  id: "nelson-outward",
  side: "british",
  waypoints: [
    { lon: -8.683, lat: 36.783, day: day(5, 11, 18.8333) }, // 11 May, 6.50 p.m.
    { lon: -9.917, lat: 35.533, day: day(5, 12), mark: true }, // 12 May
    { lon: -12.733, lat: 34.45, day: day(5, 13), mark: true }, // 13 May
    { lon: -14.817, lat: 33.017, day: day(5, 14), mark: true }, // 14 May: 38 leagues from Madeira
    { lon: -17.15, lat: 31.5, day: day(5, 15), mark: true }, // 15 May: Madeira in sight
    { lon: -18.967, lat: 30.25, day: day(5, 16), mark: true }, // 16 May
    { lon: -20.983, lat: 29.117, day: day(5, 17), mark: true }, // 17 May
    { lon: -22.567, lat: 28.367, day: day(5, 18), mark: true }, // 18 May
    { lon: -23.45, lat: 27.533, day: day(5, 19), mark: true }, // 19 May
    { lon: -25.6, lat: 25.333, day: day(5, 20), mark: true }, // 20 May
    { lon: -28.833, lat: 24.05, day: day(5, 21), mark: true }, // 21 May
    { lon: -31.35, lat: 23, day: day(5, 22), mark: true }, // 22 May
    { lon: -34.133, lat: 21.633, day: day(5, 23), mark: true }, // 23 May
    { lon: -36.4, lat: 20.55, day: day(5, 24), mark: true }, // 24 May
    { lon: -38.083, lat: 19.75, day: day(5, 25), mark: true }, // 25 May
    { lon: -39.983, lat: 18.8, day: day(5, 26), mark: true }, // 26 May
    { lon: -41.283, lat: 18.2, day: day(5, 27), mark: true }, // 27 May
    { lon: -42.933, lat: 17.383, day: day(5, 28), mark: true }, // 28 May
    { lon: -45.4, lat: 16.183, day: day(5, 29), mark: true }, // 29 May: Amazon sent ahead
    { lon: -47.7, lat: 15.017, day: day(5, 30), mark: true }, // 30 May
    { lon: -50.417, lat: 14.917, day: day(5, 31), mark: true }, // 31 May
    { lon: -52.883, lat: 14.583, day: day(6, 1), mark: true }, // 1 June
    { lon: -54.967, lat: 13.8, day: day(6, 2), mark: true }, // 2 June
    { lon: -57.183, lat: 13.3, day: day(6, 3), mark: true }, // 3 June
    { lon: -59.3, lat: 13.05 }, // est., Barbados in sight at 6 a.m. on 4 June
    { lon: -59.53, lat: 12.99 }, // est., south of South Point
    { lon: -59.62, lat: 13.08, day: day(6, 4, 16.8333) }, // 4 June, 4.50 p.m.: anchored in Carlisle Bay (Nicolas VI 445)
  ],
};

/** Nelson in the West Indies, 5 to 12 June 1805. Table H: the places in the Victory's log and Nelson's letters (Nicolas VI 445-456); the passages between them estimated. */
export const nelsonWestIndies: Leg = {
  id: "nelson-west-indies",
  side: "british",
  waypoints: [
    { lon: -59.62, lat: 13.08, day: day(6, 5, 9.5) }, // 5 June, 9.30 a.m.: weighed from Carlisle Bay, steering south
    { lon: -59.72, lat: 12.95 }, // est.
    { lon: -60.87, lat: 11.23, day: day(6, 6), mark: true }, // 6 June, noon: off Great Courland Bay, Tobago
    { lon: -60.92, lat: 11.1, day: day(6, 6, 18.1667) }, // 6 June, 6.10 p.m.: off Sandy Point: the schooner's false signal 'enemy at Trinidad'
    { lon: -61.4, lat: 10.85 }, // est., along Trinidad's north coast
    { lon: -61.72, lat: 10.8 }, // est.
    { lon: -61.81, lat: 10.705, day: day(6, 7), mark: true }, // 7 June: the Boca Grande (Dragon's Mouth)
    { lon: -61.81, lat: 10.66 }, // est.
    { lon: -61.72, lat: 10.625, day: day(6, 7, 17.5) }, // 7 June, 5.30 p.m., to 8 June, 7 a.m.: anchored in the Gulf of Paria near the west Boca (est. berth)
    { lon: -61.72, lat: 10.625, day: day(6, 8, 7) }, // the same berth, leaving
    { lon: -61.81, lat: 10.66 }, // est.
    { lon: -61.81, lat: 10.705 }, // out by the Boca Grande
    { lon: -61.8, lat: 10.8 }, // est.
    { lon: -61.87, lat: 11.97 }, // est., SW of Point Salines
    { lon: -61.8, lat: 12.045, day: day(6, 9), mark: true }, // 9 June, noon: hove to in St George's Bay, Grenada
    { lon: -61.85, lat: 12.15 }, // est.
    { lon: -61.88, lat: 16.37, day: day(6, 11), mark: true }, // 11 June, noon: Basse-Terre S 21° E, 8 leagues (computed)
    { lon: -62.22, lat: 16.63 }, // est., south-west of Montserrat
    { lon: -62.3, lat: 16.72 }, // est., under Montserrat
    { lon: -62.304, lat: 16.805, day: day(6, 11, 18.8333) }, // 11 June, 6.50 p.m.: north end of Montserrat E 1/2 N, 6 miles (computed)
    { lon: -62.15, lat: 17.32, day: day(6, 12, 6) }, // 12 June, 6 a.m.: Antigua SE by E 7-8 leagues (computed by compass with 2.3° E; est.)
    { lon: -61.885, lat: 17.135, day: day(6, 12, 19) }, // 12 June, 7 p.m.: anchored in St John's Road, Antigua
  ],
};

/** Nelson, Antigua to Gibraltar, 13 June to 19 July 1805. Table I: Faden's daily marks as Corbett redrew them (±0.3°), which agree with the log fixes of 29 June and 1 July within 0.3°. */
export const nelsonHomeward: Leg = {
  id: "nelson-homeward",
  side: "british",
  waypoints: [
    { lon: -61.885, lat: 17.135, day: day(6, 13, 11.8333) }, // 13 June, 11.50 a.m.: weighed from St John's Road for Europe
    { lon: -62.433, lat: 19.483, day: day(6, 14), mark: true }, // 14 June
    { lon: -62.483, lat: 21.767, day: day(6, 15), mark: true }, // 15 June
    { lon: -61.8, lat: 24.167, day: day(6, 16), mark: true }, // 16 June
    { lon: -60.767, lat: 25.133, day: day(6, 17), mark: true }, // 17 June: boarded the Sally
    { lon: -59.283, lat: 26.517, day: day(6, 18), mark: true }, // 18 June
    { lon: -57.75, lat: 27.917, day: day(6, 19), mark: true }, // 19 June
    { lon: -55.783, lat: 28.75, day: day(6, 20), mark: true }, // 20 June
    { lon: -53.717, lat: 29.483, day: day(6, 21), mark: true }, // 21 June
    { lon: -52.317, lat: 29.917, day: day(6, 22), mark: true }, // 22 June
    { lon: -51.817, lat: 30.667, day: day(6, 23), mark: true }, // 23 June
    { lon: -51.15, lat: 33.367, day: day(6, 25), mark: true }, // 25 June
    { lon: -48.5, lat: 34.133, day: day(6, 26), mark: true }, // 26 June
    { lon: -45.283, lat: 35, day: day(6, 27), mark: true }, // 27 June
    { lon: -41.333, lat: 35.75, day: day(6, 28), mark: true }, // 28 June
    { lon: -37.967, lat: 35.917, day: day(6, 29), mark: true }, // 29 June: log fix about 36°03'N 38°07'W
    { lon: -36.817, lat: 36.483, day: day(6, 30), mark: true }, // 30 June
    { lon: -35.75, lat: 37.117, day: day(7, 1), mark: true }, // 1 July: log fix about 37°07'N 36°03'W
    { lon: -34.517, lat: 37.1, day: day(7, 2), mark: true }, // 2 July
    { lon: -32.817, lat: 37.033, day: day(7, 3), mark: true }, // 3 July
    { lon: -29.267, lat: 37.183, day: day(7, 5), mark: true }, // 5 July
    { lon: -28.267, lat: 37.333, day: day(7, 7), mark: true }, // 7 July
    { lon: -26.96, lat: 37.88, day: day(7, 8, 11.5) }, // 8 July, 11.30 a.m.: log fix: São Miguel ESE by compass, 17½ leagues (Nicolas VI 468)
    { lon: -26.083, lat: 37.967 }, // control point (a-h1b.md, scene impact 5)
    { lon: -25.5, lat: 37.967, day: day(7, 9), mark: true }, // 9 July: north of São Miguel
    { lon: -23.417, lat: 37.917, day: day(7, 10), mark: true }, // 10 July
    { lon: -21.05, lat: 36.95, day: day(7, 11), mark: true }, // 11 July
    { lon: -19.05, lat: 36.1, day: day(7, 12), mark: true }, // 12 July
    { lon: -17.4, lat: 36.233, day: day(7, 13), mark: true }, // 13 July
    { lon: -14.583, lat: 36.467, day: day(7, 14), mark: true }, // 14 July
    { lon: -12.067, lat: 36.683, day: day(7, 15), mark: true }, // 15 July
    { lon: -10.917, lat: 36.733, day: day(7, 16), mark: true }, // 16 July
    { lon: -9.767, lat: 36.683, day: day(7, 17), mark: true }, // 17 July: Cape St Vincent in sight
    { lon: -6.65, lat: 35.95, day: day(7, 18), mark: true }, // 18 July, noon: Cape Spartel S 75° E, 12 leagues, as a true bearing (Nicolas VI 471)
    { lon: -5.62, lat: 35.96 }, // est., off Tarifa
    { lon: -5.395, lat: 36.03 }, // est., south of Punta Carnero
    { lon: -5.386, lat: 36.093 }, // mouth of Gibraltar Bay
    { lon: -5.365, lat: 36.123, day: day(7, 19, 7.5) }, // 19 July, 7.30 a.m.: anchored in Rosia Bay (Nicolas VI 473)
  ],
};

/** Nelson, Gibraltar to Ushant and Spithead, 22 July to 18 August 1805. Table J: estimates to Cape St Vincent, then Faden's marks as Corbett redrew them, with the diary's positions of 3 and 7 August (Desbrière 1907, pp. */
export const nelsonUshantSpithead: Leg = {
  id: "nelson-ushant-spithead",
  side: "british",
  waypoints: [
    { lon: -5.365, lat: 36.123, day: day(7, 22), mark: true }, // 22 July: Rosia Bay
    { lon: -5.386, lat: 36.093 }, // mouth of Gibraltar Bay
    { lon: -5.395, lat: 36.03 }, // est.
    { lon: -5.55, lat: 35.97 }, // est.
    { lon: -5.62, lat: 35.96, day: day(7, 25, 3.75) }, // 25 July, about 3.30-4 a.m.: off Tarifa: the Termagant brings news of the Curieux's sighting
    { lon: -6, lat: 36 }, // est., west mouth
    { lon: -9.25, lat: 36.917, day: day(7, 27, 6) }, // 27 July, daylight: off Cape St Vincent (diary; est.)
    { lon: -12.55, lat: 36.967, day: day(7, 29), mark: true }, // 29 July: chart; '143 miles from Cape St Vincent' (diary)
    { lon: -14.917, lat: 36.967, day: day(7, 30), mark: true }, // 30 July
    { lon: -15.25, lat: 37.7, day: day(7, 31), mark: true }, // 31 July
    { lon: -15.35, lat: 38.317, day: day(8, 1), mark: true }, // 1 August
    { lon: -16, lat: 39.017, day: day(8, 3), mark: true }, // 3 August: diary, 39°1'N 16°W
    { lon: -18.233, lat: 41.133, day: day(8, 7), mark: true }, // 7 August: diary, 41°8'N 18°14'W
    { lon: -18.05, lat: 42.067, day: day(8, 8), mark: true }, // 8 August
    { lon: -17.383, lat: 43.95, day: day(8, 9), mark: true }, // 9 August
    { lon: -17.05, lat: 44.95, day: day(8, 10), mark: true }, // 10 August
    { lon: -16.417, lat: 45.767, day: day(8, 11), mark: true }, // 11 August
    { lon: -14.367, lat: 47.6, day: day(8, 12), mark: true }, // 12 August: spoke the Niobe
    { lon: -11.717, lat: 49.333, day: day(8, 13), mark: true }, // 13 August: chart (diary latitude 49°7')
    { lon: -8.817, lat: 49.183, day: day(8, 14), mark: true }, // 14 August
    { lon: -5.75, lat: 48.5, day: day(8, 15, 15) }, // 15 August, 3 p.m.: Ushant SE by E 8-9 leagues, by compass with 24.7° W (computed); joins Cornwallis at 6 p.m.
    { lon: -1.3, lat: 50.5 }, // est., south of St Catherine's Point
    { lon: -1.15, lat: 50.6, day: day(8, 17, 22.25) }, // 17 August, 10.15 p.m.: anchored at Dunnose
    { lon: -0.99, lat: 50.65 }, // est.
    { lon: -0.99, lat: 50.715 }, // est., east of the Foreland
    { lon: -1.1, lat: 50.765, day: day(8, 18, 8.5) }, // 18 August, 8.30 a.m.: anchored at Spithead
  ],
};

/** Villeneuve's legs in order, from Toulon to Cádiz by the West Indies. */
export const VILLENEUVE: readonly Leg[] = [
  villeneuveToulonCadiz,
  villeneuveCrossing,
  villeneuveWestIndies,
  villeneuveReturn,
  villeneuveVigoCoruna,
  combinedFerrolCadiz,
];

/** Nelson's legs in order, from Sardinia to the West Indies and home. */
export const NELSON: readonly Leg[] = [
  nelsonMediterranean,
  nelsonOutward,
  nelsonWestIndies,
  nelsonHomeward,
  nelsonUshantSpithead,
];

/** The Toulon–Cádiz leg as plain waypoints, for the lab's Stage A flight. */
export const TOULON_TO_CADIZ: readonly Waypoint[] =
  villeneuveToulonCadiz.waypoints.map((w) => [w.lon, w.lat] as const);
