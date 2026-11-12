import { day } from "./dates";

/**
 * The squadrons that sail at the routes' drawing heads in beats 2 and 3,
 * with their size at each stage (docs/history-notes.md, "Scene 2", "Fleet
 * sizes at each stage"). Each is drawn as a symbol at the head of its track,
 * a block of glyphs laid out on screen with the others (glyphs/layout.ts),
 * so its size reads at any zoom.
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
  /**
   * Under no commander's flag (the Victory at Spithead while Nelson was
   * ashore): no strength is lettered at the head (strengthOf).
   */
  unflagged?: boolean;
}

export interface SquadronSpec {
  id: string;
  side: "british" | "combined";
  /** Shown from and to these days (it fades in before the first and out after the last, over a stretch of scroll). */
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

/**
 * A ship in a squadron's place: her type, the day she is in it from, and
 * the day she leaves it (none: to the end of the squadron's story).
 */
interface Berth {
  type: string;
  from: number;
  until?: number;
}

/**
 * A squadron's make-up over time from its places, each holding its ships
 * in turn (a place left empty by one ship may be taken by another later):
 * a stage at every day a ship comes or goes, listing each place's ship
 * then (null where empty); under no flag between `unflagged`'s days.
 */
function stagesOf(
  places: readonly (readonly Berth[])[],
  unflagged?: readonly [number, number],
): Composition[] {
  const days = new Set<number>();
  for (const place of places)
    for (const b of place) {
      days.add(b.from);
      if (b.until !== undefined) days.add(b.until);
    }
  if (unflagged) for (const d of unflagged) days.add(d);
  const stages: Composition[] = [];
  for (const from of [...days].sort((a, b) => a - b)) {
    const types = places.map(
      (place) =>
        place.find(
          (b) => b.from <= from && (b.until === undefined || from < b.until),
        )?.type ?? null,
    );
    const flagless =
      unflagged !== undefined && from >= unflagged[0] && from < unflagged[1];
    const last = stages[stages.length - 1];
    if (
      last &&
      Boolean(last.unflagged) === flagless &&
      last.types.every((t, k) => t === types[k])
    )
      continue;
    stages.push(flagless ? { from, types, unflagged: true } : { from, types });
  }
  return stages;
}

/** A place held by one ship from a day on (to the end, or to `until`). */
const berth = (type: string, from: number, until?: number): Berth[] => [
  until === undefined ? { type, from } : { type, from, until },
];

/**
 * Villeneuve's days (docs/research/scene-02/session-21/strengths-by-date.md
 * and history-notes.md): out of Toulon; out of Cádiz with the 14 the owner
 * counts as going with him (about 2 a.m. on 10 April); the Firme, Terrible
 * and España found off Fort-de-France (14 May); the San Rafael in with the
 * fleet (the afternoon of the 16th); Magon's two (4 June); the Firme and
 * San Rafael struck (about 8.30 p.m. on 22 July); out of Vigo without the
 * Atlas, España and América (31 July); the Argonauta and Terrible into
 * Ferrol, the French at A Coruña (2 August); Gourdon's five and eight
 * Spaniards in the bay of Ares (about 2 p.m. on 10 August); the last three
 * (the forenoon of the 13th).
 */
const V = {
  toulon: day(3, 30),
  cadiz: day(4, 10, 2),
  martinique: day(5, 14, 16),
  sanRafael: day(5, 16, 15),
  magon: day(6, 4),
  struck: day(7, 22, 20.5),
  vigo: day(7, 31),
  coruna: day(8, 2),
  ares: day(8, 10, 14),
  ferrol: day(8, 13, 9),
};

/**
 * Nelson's days: out of Pula Roads (3 April); the Royal Sovereign gone with
 * Knight (about 5 p.m. on 11 May); the Northumberland and Spartiate at
 * Barbados (about 5 p.m. on 4 June); homeward without the Northumberland
 * (noon on 13 June); off Ushant on with the Superb, nine left with
 * Cornwallis (the evening of 15 August); his flag struck at Spithead (19
 * August) and hoisted again at St Helens (11.30 a.m. on 14 September); the
 * Ajax and Thunderer off the Lizard (18 September).
 */
const N = {
  med: day(4, 3),
  knight: day(5, 11, 17),
  barbados: day(6, 4, 17),
  homeward: day(6, 13, 12),
  ushant: day(8, 15, 18),
  spithead: day(8, 19, 12),
  stHelens: day(9, 14, 11.5),
  lizard: day(9, 18),
};

/**
 * The squadrons at the tracks' heads, each a block of its ships of the
 * line only, the ships its label counts (strengthOf): the label's figure
 * and the ships that come in at the head as the camera nears are the same
 * (the owner's rule of 12 November 2026), so no frigate sails in a block
 * (the Euryalus with the Victory in September) and no prize (Calder's San
 * Rafael and Firme). Each place is one ship's, or holds ships in turn.
 */
export const SQUADRONS: readonly SquadronSpec[] = [
  {
    id: "villeneuve",
    side: "combined",
    shown: [day(3, 30, 15), day(8, 21)],
    stages: stagesOf([
      // Bucentaure, Formidable, Neptune, Indomptable.
      berth(F80, V.toulon),
      berth(F80, V.toulon),
      berth(F80, V.toulon),
      berth(F80, V.toulon),
      // Pluton, Mont-Blanc, Berwick, Swiftsure, Scipion, Intrépide.
      berth(F74, V.toulon),
      berth(F74, V.toulon),
      berth(F74, V.toulon),
      berth(F74, V.toulon),
      berth(F74, V.toulon),
      berth(F74, V.toulon),
      // The Atlas, left at Vigo; then the Fougueux (Gourdon's).
      [
        { type: F74, from: V.toulon, until: V.vigo },
        { type: F74, from: V.ares },
      ],
      // The Aigle.
      berth(F74, V.cadiz),
      // The Argonauta, into Ferrol; then the Redoutable.
      [
        { type: S74, from: V.cadiz, until: V.coruna },
        { type: F74, from: V.ares },
      ],
      // The América, left at Vigo; then the Argonaute.
      [
        { type: S74, from: V.cadiz, until: V.vigo },
        { type: F74, from: V.ares },
      ],
      // The Firme, struck; then the Duguay-Trouin.
      [
        { type: S74, from: V.martinique, until: V.struck },
        { type: F74, from: V.ares },
      ],
      // The Terrible, into Ferrol; then the Héros.
      [
        { type: S74, from: V.martinique, until: V.coruna },
        { type: F74, from: V.ares },
      ],
      // The España, left at Vigo; then the Príncipe de Asturias.
      [
        { type: S74, from: V.martinique, until: V.vigo },
        { type: S112, from: V.ares },
      ],
      // The San Rafael, struck; then a Spaniard from Ferrol.
      [
        { type: S74, from: V.sanRafael, until: V.struck },
        { type: S74, from: V.ares },
      ],
      // The Algésiras and Achille (Magon).
      berth(F74, V.magon),
      berth(F74, V.magon),
      // Six more Spaniards out of Ferrol on the 10th, the last three on
      // the 13th.
      berth(S74, V.ares),
      berth(S74, V.ares),
      berth(S74, V.ares),
      berth(S74, V.ares),
      berth(S74, V.ares),
      berth(S74, V.ares),
      berth(S74, V.ferrol),
      berth(S74, V.ferrol),
      berth(S74, V.ferrol),
    ]),
  },
  {
    id: "nelson",
    side: "british",
    // On to Spithead in August; in September from St Helens back to the
    // fleet off Cádiz (history notes, "Nelson's passage").
    shown: [day(4, 3, 5), day(9, 28, 18)],
    stages: stagesOf(
      [
        berth(VIC, N.med),
        // The Royal Sovereign (drawn as a 98), gone with Knight; the
        // Northumberland from Barbados to Antigua; the Ajax.
        [
          { type: B98, from: N.med, until: N.knight },
          { type: B74, from: N.barbados, until: N.homeward },
          { type: B74, from: N.lizard },
        ],
        // The Canopus (an 80, drawn as a 74), left off Ushant; the Thunderer.
        [
          { type: B74, from: N.med, until: N.ushant },
          { type: B74, from: N.lizard },
        ],
        // The Superb, with him to Spithead.
        berth(B74, N.med, N.spithead),
        // Spencer, Swiftsure, Belleisle, Conqueror, Tigre (an 80), Leviathan
        // and Donegal, left with Cornwallis off Ushant.
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        berth(B74, N.med, N.ushant),
        // The Spartiate, from Barbados, left off Ushant.
        berth(B74, N.barbados, N.ushant),
      ],
      [N.spithead, N.stHelens],
    ),
  },
  {
    id: "orde",
    side: "british",
    // Off Cádiz when the French passed, drawing off toward Lagos.
    shown: [day(4, 8), day(4, 11)],
    stages: stagesOf([
      // The Glory; the Defence; the Polyphemus, Agamemnon and Ruby (64s,
      // drawn as 74s); Strachan's Renown about midday on the 9th.
      berth(B98, day(4, 8)),
      berth(B74, day(4, 8)),
      berth(B74, day(4, 8)),
      berth(B74, day(4, 8)),
      berth(B74, day(4, 8)),
      berth(B74, day(4, 9, 12)),
    ]),
  },
  {
    id: "calder",
    side: "british",
    // Fifteen of the line off Finisterre: four 98s, one 80, eight 74s and
    // two 64s (the 80 and 64s drawn as 74s). His two prizes are not his
    // strength and are not drawn; the Windsor Castle went home with them at
    // 8 p.m. on the 26th, after his window.
    shown: [day(7, 20), day(7, 26)],
    stages: stagesOf([
      ...Array.from({ length: 4 }, () => berth(B98, day(7, 20))),
      ...Array.from({ length: 11 }, () => berth(B74, day(7, 20))),
    ]),
  },
  {
    id: "collingwood",
    side: "british",
    // Off Cádiz on 20 August with three of the line; the Mars, back from
    // Tangier, made four about midnight (Desbrière 1907, p. 107; James III
    // 375). His window closes as Bickerton's four join on the 22nd: from
    // there he is the fleet off Cádiz, which the scene letters only with
    // Nelson's arrival.
    shown: [day(8, 19), day(8, 22, 12)],
    stages: stagesOf([
      // The Dreadnought; the Colossus and Achille; the Mars.
      berth(B98, day(8, 19)),
      berth(B74, day(8, 19)),
      berth(B74, day(8, 19)),
      berth(B74, day(8, 21, 0)),
    ]),
  },
];

/** The largest squadron, so the layer can hold every ship of each. */
export function largest(spec: SquadronSpec): number {
  return Math.max(...spec.stages.map((s) => s.types.length));
}

/** Each type of ship of the line, and her side (the rest are frigates). */
const LINE_TYPES: Readonly<Record<string, SquadronSpec["side"]>> = {
  [VIC]: "british",
  [B98]: "british",
  [B74]: "british",
  [F80]: "combined",
  [F74]: "combined",
  [S74]: "combined",
  [S112]: "combined",
};

/**
 * A stage's strength as lettered at its track's head (HeadLabels), after
 * the commander's name: its ships of the line under his flag, the unit in
 * which the dispatches gave a squadron's strength ("20 Sail of the Line"),
 * so frigates, small craft and prizes (Calder's two Spaniards) are not
 * counted. A squadron of one ship of the line is lettered with her name
 * ("Nelson, Victory"); one under no flag not at all (null).
 */
export function strengthOf(
  spec: SquadronSpec,
  stage: Composition,
): string | null {
  if (stage.unflagged) return null;
  const line = stage.types.filter(
    (t): t is string => t !== null && LINE_TYPES[t] === spec.side,
  );
  if (line.length === 1 && line[0] === VIC) return "Victory";
  return line.length > 0 ? `${line.length} sail` : null;
}

/** The commander lettered at a squadron's head. */
export const COMMANDERS: Readonly<Record<string, string>> = {
  villeneuve: "Villeneuve",
  nelson: "Nelson",
  orde: "Orde",
  calder: "Calder",
  collingwood: "Collingwood",
};
