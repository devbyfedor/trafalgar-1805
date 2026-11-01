import { day } from "./dates";

/**
 * The squadrons that sail at the routes' drawing heads in beats 2 and 3,
 * with their size at each stage (docs/history-notes.md, "Scene 2", "Fleet
 * sizes at each stage"). A squadron is drawn as its lead glyph at the head
 * and the others in a compact formation astern of it, spaced on screen, so
 * its size reads at any zoom.
 */

export interface Composition {
  /** From this day on, the squadron is these ship types, lead first. */
  from: number;
  types: readonly string[];
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
    shown: [day(4, 3, 5), day(8, 16)],
    stages: [
      // Eleven of the line in the Mediterranean, the Royal Sovereign among them.
      { from: day(4, 3), types: [VIC, B98, ...repeat(B74, 9)] },
      // The Royal Sovereign went with Knight on 11 May: ten crossed.
      { from: day(5, 11, 17), types: [VIC, B98, ...repeat(B74, 8)] },
      // The Northumberland and Spartiate at Barbados: twelve.
      { from: day(6, 4, 17), types: [VIC, B98, ...repeat(B74, 10)] },
      // Homeward with eleven; the Northumberland stayed.
      { from: day(6, 13, 12), types: [VIC, B98, ...repeat(B74, 9)] },
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

/**
 * A ship's place in her squadron's formation, in glyph heights on screen
 * (Glyphs.setFormation): the lead at (0, 0), the others in short columns
 * astern of her, three to a column, a little ragged.
 */
export function formationSlot(index: number): [along: number, up: number] {
  if (index === 0) return [0, 0];
  const k = index - 1;
  const column = Math.floor(k / 3) + 1;
  const row = k % 3;
  const up = [0, 0.34, -0.34][row];
  // A ragged hand: a fixed, small offset per slot.
  const wobble = Math.sin(index * 12.9898) * 0.06;
  return [-0.58 * column - (row === 0 ? 0 : 0.22) + wobble, up + wobble * 0.5];
}

/** The largest squadron, so the layer can hold every ship of each. */
export function largest(spec: SquadronSpec): number {
  return Math.max(...spec.stages.map((s) => s.types.length));
}
