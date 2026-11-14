import type { GlyphType, ShipMark } from "@/components/chart/glyphs/Glyphs";
import type { Camp } from "@/components/chart/marks/Camps";
import {
  buildCraft,
  type CraftKind,
} from "@/components/ship/geometry/smallcraft";
import { createRng, jitter } from "@/lib/random";

/**
 * Boulogne in the summer of 1805 (beat 1): the army's hutted camps along
 * the coast and the invasion flotilla in the roads. Sources and doubts:
 * docs/history-notes.md, "Scene 2: the road to Trafalgar" ("Boulogne and the
 * invasion army", "Positions on the chart") and "Scene 2: Boulogne from the
 * sea (beat 1)" ("The camps", "The flotilla in the roads and in the
 * harbour"); the conventions: docs/decisions.md, "Boulogne:
 * the camps and the flotilla".
 */

type LonLat = readonly [number, number];

/** Metres per degree of latitude. */
const M_PER_DEG = 111_195;

/** A site moved by ground metres east and north. */
function offset([lon, lat]: LonLat, east: number, north: number): LonLat {
  const cos = Math.cos((lat * Math.PI) / 180);
  return [lon + east / (M_PER_DEG * cos), lat + north / M_PER_DEG];
}

// ---- The camps -----------------------------------------------------------

/**
 * A camp's plan: rows of huts along its streets, the rows cut by cross
 * streets into the blocks of its regiments.
 */
interface CampPlan {
  name: string;
  centre: LonLat;
  /** The rows' direction, degrees from north, clockwise: along the plateau. */
  bearing: number;
  rows: number;
  /** Huts in each block of a row, block by block. */
  blocks: readonly number[];
  /** Ground metres between huts along a row, and between rows. */
  pitch: number;
  street: number;
  seed: number;
}

/**
 * The camps, south to north. From the autumn of 1803 the troops lived in
 * wooden huts in rows by regiment along camp streets (tents were campaign
 * kit). Soult's corps lay in two camps either side of Boulogne: the right
 * on the cliff plateau north of the Liane by the Tour d'Ordre, where the
 * Emperor had his hut, running toward Terlincthun; the left on the plateau
 * of Outreau south of the river. Lannes's advance guard, Oudinot's
 * grenadiers, lay at Wimereux; Davout's corps at Ambleteuse; Ney's (the
 * camp of Montreuil) at Étaples, its headquarters inland at Montreuil
 * (James III 325–326; Corr. XI No. 9137). Rows run along each plateau,
 * parallel to the coast and facing the sea, as a camp's front faced the
 * enemy. Their sizes follow the corps' strengths (Soult's about 46,000, in
 * two camps; Davout's 33,000; Ney's 27,000; the grenadiers fewer), not
 * their counts of huts, which no source gives for 1805. Where on each
 * plateau the rows stood is not documented: the sites are on the heights
 * the sources name, Outreau's and the extent toward Terlincthun as the
 * history notes set them out ("Boulogne from the sea", "The camps", "Where
 * they stood").
 */
const CAMP_PLANS: readonly CampPlan[] = [
  {
    name: "Ney's corps, Étaples",
    centre: [1.64, 50.533],
    bearing: 10,
    rows: 3,
    blocks: [4, 4],
    pitch: 240,
    street: 560,
    seed: 1805_01,
  },
  {
    name: "Soult's left camp, Outreau",
    centre: [1.5925, 50.703],
    bearing: 8,
    rows: 3,
    blocks: [4, 4],
    pitch: 240,
    street: 560,
    seed: 1805_02,
  },
  {
    name: "Soult's right camp, the Tour d'Ordre",
    centre: [1.6005, 50.7425],
    bearing: 19,
    rows: 3,
    blocks: [5, 4],
    pitch: 240,
    street: 560,
    seed: 1805_03,
  },
  {
    name: "Oudinot's grenadiers, Wimereux",
    centre: [1.6215, 50.78],
    bearing: 10,
    rows: 2,
    blocks: [5],
    pitch: 240,
    street: 560,
    seed: 1805_04,
  },
  {
    name: "Davout's corps, Ambleteuse",
    centre: [1.616, 50.82],
    bearing: 345,
    rows: 3,
    blocks: [4, 4],
    pitch: 240,
    street: 560,
    seed: 1805_05,
  },
];

function layCamp(plan: CampPlan): Camp {
  const rng = createRng(plan.seed);
  const b = (plan.bearing * Math.PI) / 180;
  // Along the rows, and across them toward the land's side.
  const along = [Math.sin(b), Math.cos(b)] as const;
  const across = [Math.cos(b), -Math.sin(b)] as const;
  // A cross street between blocks is one hut's pitch wide.
  const slots: number[] = [];
  let at = 0;
  plan.blocks.forEach((n, i) => {
    if (i > 0) at += 1;
    for (let k = 0; k < n; k++) slots.push(at++);
  });
  const mid = (at - 1) / 2;
  const huts: LonLat[] = [];
  for (let r = 0; r < plan.rows; r++) {
    const v = (r - (plan.rows - 1) / 2) * plan.street;
    // Regiments differ in strength: a row may stop a hut short at either end.
    const first = rng() < 0.3 ? 1 : 0;
    const last = slots.length - (rng() < 0.3 ? 1 : 0);
    for (let k = first; k < last; k++) {
      const u = (slots[k] - mid) * plan.pitch;
      huts.push(
        offset(
          plan.centre,
          along[0] * u + across[0] * v,
          along[1] * u + across[1] * v,
        ),
      );
    }
  }
  return {
    name: plan.name,
    bearing: plan.bearing,
    pitch: plan.pitch,
    street: plan.street,
    huts,
  };
}

export const CAMPS: readonly Camp[] = CAMP_PLANS.map(layCamp);

// ---- The flotilla --------------------------------------------------------

/** The flotilla's kinds: at anchor, and the few under sail. */
const AT_ANCHOR: readonly CraftKind[] = [
  "prame",
  "chaloupe",
  "bateau",
  "peniche",
];
const UNDER_SAIL_KINDS: readonly CraftKind[] = [
  "chaloupe",
  "bateau",
  "peniche",
];

/** The flotilla's glyph types, added to the scene's atlas (stage.ts). */
export const FLOTILLA_TYPES: readonly GlyphType[] = [
  ...AT_ANCHOR.map((kind) => ({
    id: `flotilla-${kind}`,
    silhouette: buildCraft(kind, false),
  })),
  ...UNDER_SAIL_KINDS.map((kind) => ({
    id: `flotilla-${kind}-sailing`,
    silhouette: buildCraft(kind, true),
  })),
];

/**
 * The lines in the roads off Boulogne, Wimereux and Ambleteuse, south to
 * north, parallel to the coast: the outer line of the heavy craft, the
 * inner of the light. A chart's convention, each craft drawn standing for
 * a division of the flotilla (eighteen craft; history notes, "The
 * flotilla"): about 150 craft lay in a double line 0.6 nm off Boulogne's
 * pier in October 1804 (James III 232), some 30 m apart, and their layout
 * in August 1805 is not documented. Packed so close no craft could read
 * one by one at beat 1's view of Boulogne, which the owner approved, and
 * under his rule (the ships come in only where each reads one by one) they
 * would never have shown. So the drawn lines lie where the view lets each
 * craft read: about 1.3 km apart along a line (some 20 CSS px at the hold,
 * 1280×720), the inner line 2.6 km off the coast and the outer 5.6 km (on
 * screen the lines lie along the view, foreshortened: nearer, a prame of
 * the outer line stood over the inner line's craft), so
 * that seen from the south-west, low over the Channel, no craft stands
 * against the land behind it (decisions.md, "Boulogne: the camps and the
 * flotilla").
 */
const LINES: readonly {
  from: LonLat;
  to: LonLat;
  kinds: readonly CraftKind[];
  /** Where along the line the first craft lies, as a share of a gap. */
  phase: number;
}[] = [
  {
    // The outer line: prames at its ends and in its middle, chaloupes.
    from: [1.4935, 50.706],
    to: [1.5245, 50.8],
    kinds: [
      "prame",
      "chaloupe",
      "chaloupe",
      "bateau",
      "prame",
      "chaloupe",
      "bateau",
      "chaloupe",
      "prame",
    ],
    phase: 0,
  },
  {
    // The inner line: the bateaux and the péniches, the light luggers.
    from: [1.538, 50.712],
    to: [1.567, 50.796],
    kinds: [
      "peniche",
      "bateau",
      "peniche",
      "bateau",
      "peniche",
      "bateau",
      "peniche",
      "peniche",
    ],
    phase: 0.5,
  },
];

/**
 * Where the craft head at anchor, degrees true. A craft rides head to wind,
 * or to the stream where it runs strong; the prevailing wind in the eastern
 * Channel is from the south-west, and off Boulogne the tidal stream runs
 * NNE–SSW along the coast: moored in lines along the stream, the craft
 * swing as far into the south-westerly as their moorings let them, heads
 * to the SSW–SW. Seen from the south-west, as beat 1 sees them, they show
 * three-quarter views.
 */
const ANCHORED_HEADING = 210;

/**
 * A few craft under sail outside the lines, standing along the coast (the
 * flotilla exercised in the roads that August), about 2 km outside the
 * outer line so it reads apart from it.
 */
const UNDER_SAIL: readonly { kind: CraftKind; at: LonLat; heading: number }[] =
  [
    { kind: "chaloupe", at: [1.461, 50.724], heading: 20 },
    { kind: "peniche", at: [1.468, 50.759], heading: 25 },
    { kind: "bateau", at: [1.479, 50.792], heading: 195 },
  ];

function layFlotilla(): ShipMark[] {
  const rng = createRng(1805_08);
  const marks: ShipMark[] = [];
  for (const line of LINES) {
    const n = line.kinds.length;
    const span = n - 1 + line.phase;
    line.kinds.forEach((kind, i) => {
      const u = (i + line.phase) / span;
      const base: LonLat = [
        line.from[0] + (line.to[0] - line.from[0]) * u,
        line.from[1] + (line.to[1] - line.from[1]) * u,
      ];
      // Moorings are never quite in line: a few score metres either way.
      const [lon, lat] = offset(base, jitter(rng, 90), jitter(rng, 120));
      marks.push({
        type: `flotilla-${kind}`,
        side: "combined",
        lon,
        lat,
        heading: ANCHORED_HEADING + jitter(rng, 8),
        underWay: false,
      });
    });
  }
  for (const s of UNDER_SAIL) {
    marks.push({
      type: `flotilla-${s.kind}-sailing`,
      side: "combined",
      lon: s.at[0],
      lat: s.at[1],
      heading: s.heading,
      underWay: true,
    });
  }
  return marks;
}

/**
 * The flotilla: seventeen craft at anchor in the two lines, three under
 * sail. They come in together, and only where every one of them reads one
 * by one (director.ts, the flotilla's gate); far off nothing of them shows.
 */
export const FLOTILLA: readonly ShipMark[] = layFlotilla();
