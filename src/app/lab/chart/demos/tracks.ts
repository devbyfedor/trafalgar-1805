import {
  buildGlyphAtlas,
  type Formation,
  GlyphLayout,
  Glyphs,
  type RoutePoint,
  type ShipMark,
  type TrackPoint,
  type TrackSpec,
  Tracks,
} from "@/components/chart";
import { dayOf } from "@/components/chart/lines/dates";
import { GLYPH_TYPES } from "@/scenes/02-road/fleets";
import type { LabDemo, LabDemoContext } from "./index";

/**
 * The tracks' period styling: Nelson's outward track with its day circles
 * and Villeneuve's crossing without (its dating is disputed), and the
 * army's march to Ulm with its dates. Squadrons sail at the heads, each a
 * squadron's symbol the glyph layout lays out (glyphs/layout.ts), as the
 * scene's are.
 *
 * `/lab/chart/?demo=tracks&light=campaign` with a view:
 * - the Atlantic from the south: `eye=-37,-11,5000&look=-32,24.5&fov=52`
 * - the West Indies closer: `eye=-58,6,900&look=-60,14.5`
 * - the march over France and Germany: `eye=3,42,1300&look=7,49`
 *
 * `head=` sets the date the sea tracks are drawn to (default 1 June 1805,
 * at the day circle) and `army=` the march's (default 20 October): a month
 * and day, `06-01`, with an hour if wanted, `06-01T18`, or a day number.
 *
 * The waypoints are the research's (docs/research/scene-02/routes-draft.json,
 * "nelson-outward" and "villeneuve-crossing"; the march from
 * history-scene-02-merged.md, "The turn east and Ulm"); the scene's own
 * route data will hold them.
 */

/** Nelson from Cape St Vincent to Barbados, 11 May to 4 June 1805: Faden's daily marks. */
const NELSON_OUTWARD: TrackPoint[] = [
  {
    lon: -8.683,
    lat: 36.783,
    day: dayOf(5, 11, 18 + 50 / 60),
    label: "11 May",
  },
  { lon: -9.917, lat: 35.533, day: dayOf(5, 12), noon: true, side: "above" },
  { lon: -12.733, lat: 34.45, day: dayOf(5, 13), noon: true, side: "above" },
  { lon: -14.817, lat: 33.017, day: dayOf(5, 14), noon: true, side: "above" },
  { lon: -17.15, lat: 31.5, day: dayOf(5, 15), noon: true, side: "above" },
  { lon: -18.967, lat: 30.25, day: dayOf(5, 16), noon: true, side: "above" },
  { lon: -20.983, lat: 29.117, day: dayOf(5, 17), noon: true, side: "above" },
  { lon: -22.567, lat: 28.367, day: dayOf(5, 18), noon: true, side: "above" },
  { lon: -23.45, lat: 27.533, day: dayOf(5, 19), noon: true, side: "above" },
  { lon: -25.6, lat: 25.333, day: dayOf(5, 20), noon: true },
  { lon: -28.833, lat: 24.05, day: dayOf(5, 21), noon: true },
  { lon: -31.35, lat: 23, day: dayOf(5, 22), noon: true },
  { lon: -34.133, lat: 21.633, day: dayOf(5, 23), noon: true, side: "above" },
  { lon: -36.4, lat: 20.55, day: dayOf(5, 24), noon: true, side: "above" },
  { lon: -38.083, lat: 19.75, day: dayOf(5, 25), noon: true, side: "above" },
  { lon: -39.983, lat: 18.8, day: dayOf(5, 26), noon: true, side: "above" },
  { lon: -41.283, lat: 18.2, day: dayOf(5, 27), noon: true, side: "above" },
  { lon: -42.933, lat: 17.383, day: dayOf(5, 28), noon: true },
  { lon: -45.4, lat: 16.183, day: dayOf(5, 29), noon: true },
  { lon: -47.7, lat: 15.017, day: dayOf(5, 30), noon: true },
  { lon: -50.417, lat: 14.917, day: dayOf(5, 31), noon: true },
  { lon: -52.883, lat: 14.583, day: dayOf(6, 1), noon: true },
  { lon: -54.967, lat: 13.8, day: dayOf(6, 2), noon: true },
  { lon: -57.183, lat: 13.3, day: dayOf(6, 3), noon: true },
  // Barbados in sight at 6 a.m. (position estimated), round South Point.
  { lon: -59.3, lat: 13.05, day: dayOf(6, 4, 6) },
  { lon: -59.53, lat: 12.99 },
  // Anchored in Carlisle Bay, 4.50 p.m.
  {
    lon: -59.62,
    lat: 13.08,
    day: dayOf(6, 4, 16 + 50 / 60),
    label: "4 June",
  },
];

/**
 * Villeneuve from Cádiz to Martinique, 10 April to 14 May 1805: the Atlas's
 * noon positions by reckoning at their printed dates (no day circles: the
 * dating is disputed), then the landfall, the St Lucia Channel and the lee
 * coast to Fort-de-France.
 */
const VILLENEUVE_CROSSING: TrackPoint[] = [
  {
    lon: -6.37,
    lat: 36.55,
    day: dayOf(4, 10, 1.75),
    label: "10 April",
    side: "below",
  },
  { lon: -7.25, lat: 36.15, day: dayOf(4, 10) },
  { lon: -8.167, lat: 35.45, day: dayOf(4, 11) },
  { lon: -9.167, lat: 34.717, day: dayOf(4, 12) },
  { lon: -9.7, lat: 33.917, day: dayOf(4, 13) },
  { lon: -10.217, lat: 33, day: dayOf(4, 14) },
  { lon: -10.15, lat: 32.75, day: dayOf(4, 15) },
  { lon: -11.783, lat: 32.033, day: dayOf(4, 16) },
  { lon: -13.917, lat: 31.133, day: dayOf(4, 17) },
  { lon: -16.25, lat: 30.317, day: dayOf(4, 18) },
  { lon: -19.767, lat: 29.317, day: dayOf(4, 19) },
  { lon: -22.033, lat: 28.067, day: dayOf(4, 20) },
  { lon: -24.1, lat: 26.917, day: dayOf(4, 21) },
  { lon: -26.233, lat: 25.867, day: dayOf(4, 22) },
  { lon: -28.367, lat: 24.6, day: dayOf(4, 23) },
  { lon: -30.367, lat: 24.233, day: dayOf(4, 24) },
  { lon: -31.217, lat: 23.8, day: dayOf(4, 25) },
  { lon: -32.117, lat: 23.3, day: dayOf(4, 26) },
  { lon: -32.433, lat: 22.883, day: dayOf(4, 27) },
  { lon: -33.033, lat: 21.75, day: dayOf(4, 28) },
  { lon: -33.617, lat: 20.9, day: dayOf(4, 29) },
  { lon: -33.667, lat: 19.967, day: dayOf(4, 30) },
  { lon: -34.017, lat: 19.567, day: dayOf(5, 1) },
  { lon: -34.8, lat: 19.033, day: dayOf(5, 2) },
  { lon: -35.75, lat: 18.733, day: dayOf(5, 3) },
  { lon: -37.45, lat: 18.433, day: dayOf(5, 4) },
  { lon: -39.183, lat: 18.183, day: dayOf(5, 5) },
  { lon: -42.1, lat: 17.933, day: dayOf(5, 6) },
  { lon: -44.35, lat: 17.383, day: dayOf(5, 7) },
  { lon: -48.35, lat: 16.467, day: dayOf(5, 9) },
  { lon: -50.8, lat: 15.933, day: dayOf(5, 10) },
  { lon: -58.65, lat: 14.567, day: dayOf(5, 12) },
  { lon: -60.47, lat: 14.583, day: dayOf(5, 13, 13) },
  { lon: -60.917, lat: 14.25, day: dayOf(5, 14, 5.5) },
  { lon: -61.085, lat: 14.43, day: dayOf(5, 14, 10) },
  { lon: -61.165, lat: 14.52 },
  {
    lon: -61.08,
    lat: 14.59,
    day: dayOf(5, 14, 16),
    label: "14 May",
    side: "above",
  },
];

/**
 * The march from Boulogne to Ulm, 28 August to 20 October 1805: Soult's
 * road by Metz and Bitche to the Rhine at Speyer, and on by Heilbronn and
 * Nördlingen to the Danube at Donauwörth; then Ney's by Elchingen to Ulm.
 * The places are the history notes'; the roads between them are smoothed.
 */
const ARMY: TrackPoint[] = [
  { lon: 1.61, lat: 50.73, day: dayOf(8, 28, 6), label: "28 August" },
  { lon: 6.18, lat: 49.12 },
  { lon: 7.43, lat: 49.05 },
  {
    lon: 8.43,
    lat: 49.32,
    day: dayOf(9, 25),
    until: dayOf(9, 30),
    label: "25–30 September",
  },
  { lon: 9.22, lat: 49.14 },
  { lon: 10.49, lat: 48.85 },
  { lon: 10.78, lat: 48.72, day: dayOf(10, 7), label: "7 October" },
  { lon: 10.1, lat: 48.45 },
  { lon: 9.99, lat: 48.4, day: dayOf(10, 20, 14), label: "20 October" },
];

const SPECS: readonly TrackSpec[] = [
  {
    id: "nelson-outward",
    style: "british",
    points: NELSON_OUTWARD,
    side: "below",
    legend: {
      text: "Track of H.M.S. Victory to the West Indies",
      from: dayOf(5, 28),
      to: dayOf(6, 3),
      side: "below",
    },
  },
  {
    id: "villeneuve-crossing",
    style: "combined",
    points: VILLENEUVE_CROSSING,
    legend: {
      text: "Combined Fleets to Martinique",
      from: dayOf(5, 6),
      to: dayOf(5, 10),
      side: "above",
    },
  },
  {
    id: "army",
    style: "army",
    points: ARMY,
    side: "above",
    legend: {
      text: "March of the Grande Armée",
      from: dayOf(8, 30),
      to: dayOf(9, 18),
      side: "above",
    },
  },
];

/** A squadron at each sea track's head: its lead and two astern. */
const SQUADRONS: readonly (readonly [track: string, types: string[]])[] = [
  ["nelson-outward", ["victory", "british-74", "british-74"]],
  ["villeneuve-crossing", ["french-80", "french-74", "spanish-74"]],
];

/** A date from the query: `06-01`, `06-01T18`, or a day number. */
function dayParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const date = /^(\d{1,2})-(\d{1,2})(?:T(\d{1,2}(?:\.\d+)?))?$/.exec(raw);
  if (date) {
    const hour = date[3] === undefined ? 12 : Number(date[3]);
    return dayOf(Number(date[1]), Number(date[2]), hour);
  }
  const day = Number(raw);
  return Number.isFinite(day) ? day : fallback;
}

export default async function tracksDemo({
  chart,
  query,
}: LabDemoContext): Promise<LabDemo> {
  const tracks = new Tracks(chart.field, SPECS);
  chart.add(tracks, ...tracks.objects);
  const sea = dayParam(query.get("head"), dayOf(6, 1));
  const march = dayParam(query.get("army"), dayOf(10, 20, 14));
  tracks.track("nelson-outward").setHead(sea);
  tracks.track("villeneuve-crossing").setHead(sea);
  tracks.track("army").setHead(march);

  const marks: ShipMark[] = SQUADRONS.flatMap(([, types]) =>
    types.map((type) => ({
      type,
      side:
        type.startsWith("british") || type === "victory"
          ? "british"
          : "combined",
      lon: 0,
      lat: 0,
      heading: 0,
      underWay: true,
    })),
  );
  const atlas = await buildGlyphAtlas(GLYPH_TYPES);
  const glyphs = new Glyphs(atlas, marks);
  // The glyphs draw only what the layout places: each squadron a formation
  // at its head, kept off the land and off the other's glyphs.
  let first = 0;
  const formations: Formation[] = SQUADRONS.map(([, types]) => {
    const places = types.map((_, i) => first + i);
    first += types.length;
    return {
      kind: "formation",
      layer: glyphs,
      places,
      types: [...new Set(types)],
      x: 0,
      y: 0,
      heading: 0,
      meets: null,
      meeting: 0,
    };
  });
  const coast = await chart.field.readBack();
  chart.add(new GlyphLayout(coast, formations));
  chart.add(glyphs, glyphs.wakes, glyphs.ships);
  chart.addGpuBytes(atlas.gpuBytes);
  await tracks.ready;

  // The squadrons sail at the heads while the tracks are being drawn.
  const at: RoutePoint = { x: 0, y: 0, heading: 0 };
  SQUADRONS.forEach(([id], s) => {
    const track = tracks.track(id);
    const sailing = sea >= track.start && sea < track.end;
    track.pointAtDay(sea, at);
    const formation = formations[s];
    formation.x = at.x;
    formation.y = at.y;
    formation.heading = at.heading;
    for (const k of formation.places) {
      glyphs.place(k, at.x, at.y, at.heading);
      glyphs.setOpacity(k, sailing ? 1 : 0);
    }
  });

  const debug = window as { __tracks?: () => unknown };
  debug.__tracks = () => tracks.snapshot();
  return {
    dispose() {
      debug.__tracks = undefined;
      atlas.texture.dispose();
    },
  };
}
