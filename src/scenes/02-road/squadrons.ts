import { day } from "./dates";

/**
 * The squadrons that sail at the routes' drawing heads in beats 2 and 3,
 * with their size at each stage (docs/history-notes.md, "Scene 2", "Fleet
 * sizes at each stage"). A squadron is drawn as its lead glyph at the head
 * and the others in a compact formation astern of it, spaced on screen, so
 * its size reads at any zoom.
 */

export interface Composition {
  /**
   * From this day on, the squadron is these ship types, lead first, each
   * ship in her own place in the block; null leaves a place empty, so a
   * ship that leaves doesn't move the others up (a ship's place is its
   * index in every stage).
   */
  from: number;
  types: readonly (string | null)[];
}

export interface SquadronSpec {
  id: string;
  side: "british" | "combined";
  /** Shown from and to these days (it fades in and out at the ends). */
  shown: readonly [number, number];
  /** Its make-up over time, in order of `from`. */
  stages: readonly Composition[];
}

const F80 = "french-80";
const F74 = "french-74";
const S74 = "spanish-74";
const S112 = "spanish-112";
const B98 = "british-98";
const B74 = "british-74";
const VIC = "victory";
const BFR = "british-frigate";

const repeat = (type: string, n: number) =>
  Array.from({ length: n }, () => type);

/** Villeneuve's eleven out of Toulon: four 80s and seven 74s. */
const TOULON = [F80, F80, F80, F80, ...repeat(F74, 7)];

export const SQUADRONS: readonly SquadronSpec[] = [
  {
    id: "villeneuve",
    side: "combined",
    shown: [day(3, 30, 15), day(8, 21)],
    stages: [
      { from: day(3, 30), types: TOULON },
      // At Cádiz the Aigle and Gravina's ships came out; 14 crossed in
      // company (12 French, the Argonauta and the América).
      { from: day(4, 10, 2), types: [...TOULON, F74, S74, S74] },
      // Martinique: the Firme, Terrible and España on 14 May, the San
      // Rafael (an 80) on the 16th: 18.
      {
        from: day(5, 14, 16),
        types: [...TOULON, F74, S74, S74, S74, S74, S74],
      },
      {
        from: day(5, 16),
        types: [...TOULON, F74, S74, S74, S74, S74, S74, S74],
      },
      // Magon with the Algésiras and Achille, 4 June: 20.
      {
        from: day(6, 4),
        types: [...TOULON, F74, F74, F74, ...repeat(S74, 6)],
      },
      // Off Finisterre the San Rafael and the Firme were taken: 18.
      {
        from: day(7, 22, 20.5),
        types: [...TOULON, F74, F74, F74, S74, S74, S74, S74],
      },
      // Out of Vigo with 15, the Atlas, España and América left behind.
      {
        from: day(7, 31),
        types: [...TOULON.slice(0, 10), F74, F74, F74, S74, S74],
      },
      // Out of Ferrol with 29: Gourdon's five and nine Spaniards, the
      // Príncipe de Asturias among them.
      {
        from: day(8, 13),
        types: [
          ...TOULON.slice(0, 10),
          F74,
          F74,
          F74,
          ...repeat(F74, 5),
          S112,
          ...repeat(S74, 10),
        ],
      },
    ],
  },
  {
    id: "nelson",
    side: "british",
    // On to Spithead in August; in September from St Helens back to the
    // fleet off Cádiz (history notes, "Nelson's passage").
    shown: [day(4, 3, 5), day(9, 28, 18)],
    stages: [
      // Eleven of the line in the Mediterranean, the Royal Sovereign among them.
      { from: day(4, 3), types: [VIC, B98, ...repeat(B74, 9)] },
      // The Royal Sovereign went with Knight on 11 May: ten crossed.
      { from: day(5, 11, 17), types: [VIC, B98, ...repeat(B74, 8)] },
      // The Northumberland and Spartiate at Barbados: twelve.
      { from: day(6, 4, 17), types: [VIC, B98, ...repeat(B74, 10)] },
      // Homeward with eleven; the Northumberland stayed.
      { from: day(6, 13, 12), types: [VIC, B98, ...repeat(B74, 9)] },
      // Off Ushant he left Cornwallis nine and went on with the Superb.
      { from: day(8, 15, 18), types: [VIC, B74] },
      // At Spithead he struck his flag (19 August): the Victory alone.
      { from: day(8, 19, 12), types: [VIC] },
      // From St Helens on 15 September with the frigate Euryalus.
      { from: day(9, 15, 8), types: [VIC, BFR] },
      // The Ajax and Thunderer join off the Lizard on the 18th.
      { from: day(9, 18), types: [VIC, BFR, B74, B74] },
      // The Euryalus sent ahead to Collingwood at 4 p.m. on the 26th.
      { from: day(9, 26, 16), types: [VIC, null, B74, B74] },
    ],
  },
  {
    id: "orde",
    side: "british",
    // Off Cádiz when the French passed, drawing off toward Lagos.
    shown: [day(4, 8), day(4, 11)],
    stages: [
      { from: day(4, 8), types: [B98, B74, B74, B74, B74] },
      { from: day(4, 9, 12), types: [B98, B74, B74, B74, B74, B74] },
    ],
  },
  {
    id: "calder",
    side: "british",
    // Fifteen of the line off Finisterre: four 98s, one 80, eight 74s, two 64s.
    shown: [day(7, 20), day(7, 26)],
    stages: [
      {
        from: day(7, 20),
        types: [B98, B98, B98, B98, B74, ...repeat(B74, 10)],
      },
      // With the San Rafael and the Firme as prizes.
      {
        from: day(7, 22, 20.5),
        types: [B98, B98, B98, B98, B74, ...repeat(B74, 10), S74, S74],
      },
    ],
  },
  {
    id: "collingwood",
    side: "british",
    // Off Cádiz on 20 August with three of the line.
    shown: [day(8, 19), day(8, 22)],
    stages: [{ from: day(8, 19), types: [B98, B74, B74] }],
  },
];

/** How many rows a squadron's block has, by its largest make-up. */
export function formationRows(largest: number): number {
  return largest <= 3 ? 1 : largest <= 8 ? 2 : 3;
}

/**
 * A ship's place in her squadron's block (Glyphs.setFormation): steps
 * astern of the lead in glyph widths, rows up the screen in glyph heights.
 * The lead at (0, 0); the others in rows astern of her, one ship to a step,
 * the rows above and below staggered half a step and 0.8 of a glyph apart,
 * so every hull shows and the count reads at any zoom, as a chart draws a
 * fleet. A little ragged. A ship keeps her place through every change of
 * the squadron (the rows are set by its largest make-up), so nothing jumps
 * when ships join or leave.
 */
export function formationSlot(
  index: number,
  rows: number,
): [along: number, up: number] {
  if (index === 0) return [0, 0];
  const k = index - 1;
  const row = rows === 1 ? 0 : k % rows;
  const column =
    rows === 1 ? k + 1 : Math.floor(k / rows) + (row === 0 ? 1 : 0.5);
  const up = [0, 0.8, -0.8][row];
  // A ragged hand: a fixed, small offset per place.
  const wobble = Math.sin(index * 12.9898) * 0.05;
  return [-0.72 * column + wobble, up + wobble * 0.4];
}

/** The largest squadron, so the layer can hold every ship of each. */
export function largest(spec: SquadronSpec): number {
  return Math.max(...spec.stages.map((s) => s.types.length));
}
