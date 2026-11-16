import type { ChartLayer, FrameInfo } from "@/components/chart";
import { smoothstep } from "@/components/chart/fx/common";
import {
  GIVE_WAY_ALL,
  type LanternPlace,
  type Lights,
} from "@/components/chart/fx/Lights";
import type { Glyphs } from "@/components/chart/glyphs/Glyphs";
import { dayAt } from "./beats";
import { day } from "./dates";
import { BRITISH, COMBINED, DAWN, type Ship } from "./fleets";

/**
 * The fleets' lanterns on the night of 20 to 21 October 1805
 * (docs/decisions.md, "Scene 2, Stage B: the lanterns at night";
 * docs/history-notes.md, "Dark and light", "Lanterns and the dark", and
 * "Assumptions and licences", 19):
 *
 * - the combined fleet's line lit, "like a well lit up street" some six
 *   miles long (Fraser 1906, p. 95, unattributed): at nightfall it lit its
 *   stern lights and the top light (Prigny, of the Bucentaure, Desbrière
 *   1907, annexes p. 139). Every ship of the line her stern lanterns, one
 *   point on the chart (a chart's convention: her two or three poop
 *   lanterns, a few metres apart, are one mark at the glyphs' scale); a
 *   top light at the flagships only (the Bucentaure's is Prigny's own; the
 *   other admirals' a licence: his "nous" may be the fleet or the
 *   flagship); and from 8 p.m. Gravina's light at his mizzen, as he led
 *   the line of battle to mark his place (Desbrière pp. 164-165). Its
 *   frigates and brigs dark (no source names their lights);
 * - the British dark but for "the light of the English fleet" (the
 *   Euryalus at midnight): the Admiral's, the Victory's stern lights and a
 *   top light (a licence, as an admiral's ship carried one: no British log
 *   names it); and the Royal Sovereign's, by the Sirius's "our Admirals"
 *   at 7.40 p.m. (an inference, read as the two columns' admirals: the
 *   Britannia, Northesk's, left dark). The private ships' order to carry a
 *   light, of the night before, had lapsed at sunset on the 20th (Corbett
 *   1910, p. 339); the watching ships, the frigates and the chain's ships
 *   of the line, hid theirs ("we concealed every light");
 * - lit after sunset (about 5.35 p.m. on the 20th), by nightfall (about
 *   6), and put out with the daylight of the 21st (the logs' "daylight",
 *   5.30 to 6.10; sunrise 6.27): no record says when, so out between 5.45
 *   and 6.20, before the camera's last hold (beats.ts, LAST_HOLD).
 *
 * The night's signals (the blue lights, rockets and guns of the chain and
 * of the combined fleet, the answers, the lights the fleet showed as it
 * wore) are the relay's, built with it (the owner's answer of 14 November
 * 2026).
 *
 * The lanterns are set each frame in an order where each comes after
 * those it gives way to (Lights.lantern): the four leads' stern lights,
 * then each line's in the ruler order along it from its lead (so a
 * receding line keeps every other light, then every fourth, and so on),
 * then the top and mizzen lights.
 */

/** Lit over these hours of 20 October and put out over these of the 21st (story days). */
const LIT_FROM: readonly [number, number] = [
  day(10, 20, 17.5),
  day(10, 20, 18.25),
];
const OUT_BY: readonly [number, number] = [
  day(10, 21, 5.75),
  day(10, 21, 6.33),
];
/** Gravina's light at his mizzen, from about 8 p.m. as the line formed. */
const MIZZEN_FROM: readonly [number, number] = [
  day(10, 20, 19.75),
  day(10, 20, 20.25),
];

/** The flag officers' ships of the combined fleet, each showing a top light. */
const FLAGSHIPS: ReadonlySet<string> = new Set([
  "Bucentaure", // Villeneuve
  "Santísima Trinidad", // Cisneros
  "Santa Ana", // Álava
  "Formidable", // Dumanoir
  "Príncipe de Asturias", // Gravina
  "Algésiras", // Magon
]);

/**
 * The British admirals' ships, their lights the fleet's only ones: Nelson's
 * and Collingwood's, at the heads of the two columns (the Sirius's "our
 * Admirals"); Northesk's Britannia left dark, so the British side shows as
 * little as the record has it.
 */
const ADMIRALS: ReadonlySet<string> = new Set(["Victory", "Royal Sovereign"]);

interface LanternSpec {
  mark: number;
  place: LanternPlace;
  intensity: number;
  /** Lit only from this time (story days), as MIZZEN_FROM; else always while the fleet's are. */
  from: readonly [number, number] | null;
  seed: number;
  /** The lanterns it gives way to by spacing (their indices among the specs; -1 none). */
  parentA: number;
  parentB: number;
}

export class NightLanterns implements ChartLayer {
  private p = 0;
  private readonly specs: LanternSpec[];
  /**
   * `lights` draws; `fleets` is both fleets' glyph layer, its marks
   * `[...BRITISH, ...COMBINED]` (director.ts, fleetMarks).
   */
  constructor(
    private readonly lights: Lights,
    private readonly fleets: Glyphs,
  ) {
    this.specs = lanternSpecs();
  }

  /** The scene's progress this frame (set from the director's state). */
  setProgress(p: number): void {
    this.p = p;
  }

  update(_frame: FrameInfo): void {
    const lights = this.lights;
    lights.clear();
    const d = dayAt(this.p);
    const lit = lanternsLit(d);
    if (!(lit > 0)) return;
    for (const s of this.specs) {
      const from = s.from ? smoothstep(s.from[0], s.from[1], d) : 1;
      lights.lantern(
        this.fleets,
        s.mark,
        s.place,
        lit * from * s.intensity,
        s.seed,
        s.parentA,
        s.parentB,
      );
    }
  }

  dispose(): void {}
}

/** How far the fleets' lanterns are lit on story day d, 0..1. */
export function lanternsLit(d: number): number {
  return (
    smoothstep(LIT_FROM[0], LIT_FROM[1], d) *
    (1 - smoothstep(OUT_BY[0], OUT_BY[1], d))
  );
}

/** How many lanterns the night may set at once. */
export function lanternCapacity(): number {
  return lanternSpecs().length;
}

/** Every lantern of the night, in the order it is set (each after those it gives way to). */
function lanternSpecs(): LanternSpec[] {
  const ships = [...BRITISH, ...COMBINED];
  const markOf = new Map<Ship, number>(ships.map((s, i) => [s, i]));
  const mark = (s: Ship) => markOf.get(s) ?? -1;
  const out: LanternSpec[] = [];
  /** Each ship's stern light, by its index in `out`. */
  const sternOf = new Map<Ship, number>();
  const add = (
    s: Ship,
    place: LanternPlace,
    intensity: number,
    parents: readonly number[] = [],
    from: LanternSpec["from"] = null,
  ): void => {
    if (mark(s) < 0) return;
    if (place === "stern") sternOf.set(s, out.length);
    out.push({
      mark: mark(s),
      place,
      intensity,
      from,
      seed: mark(s) * 8 + (place === "stern" ? 0 : place === "top" ? 1 : 2),
      parentA: parents[0] ?? -1,
      parentB: parents[1] ?? -1,
    });
  };
  const admirals = BRITISH.filter((s) => ADMIRALS.has(s.name));
  const lines = (["main", "gravina"] as const).map((g) =>
    rulerLine(COMBINED.filter((s) => s.group === g && !s.stays)),
  );
  // The admirals' stern lights and the leads' first: they never give way.
  for (const s of admirals) add(s, "stern", 0.95);
  // Then each line's stern lights in the ruler order, the two lines in
  // turn, each giving way to its next of a higher rank either side.
  const longest = Math.max(...lines.map((l) => l.order.length));
  for (let k = 0; k < longest; k++)
    for (const line of lines) {
      const s = line.order[k];
      if (!s) continue;
      const parents = line
        .parents(s)
        .map((p) => sternOf.get(p) ?? -1)
        .filter((i) => i >= 0);
      add(s, "stern", 1, parents);
    }
  // The top lights, then Gravina's at his mizzen, each giving way to every
  // light set before it (her own stern light, far off at one point with
  // it; the stern lights of the ships beyond her, among which a light high
  // over her stands on screen).
  for (const s of admirals) add(s, "top", 0.85, [GIVE_WAY_ALL]);
  for (const line of lines)
    for (const s of line.order)
      if (FLAGSHIPS.has(s.name)) add(s, "top", 0.85, [GIVE_WAY_ALL]);
  const gravina = COMBINED.find((s) => s.name === "Príncipe de Asturias");
  if (gravina) add(gravina, "mizzen", 0.85, [GIVE_WAY_ALL], MIZZEN_FROM);
  return out;
}

/**
 * A line in the ruler order from its lead, and each ship's lights of a
 * higher rank: the lead first, then the ships 16, 8, 4, 2 and 1 places from
 * her (the level of a ship m places from the lead is the power of two that
 * divides m), each level from the lead outward; a ship m places off gives
 * way to the two m ± 2^level places off (both of a higher level), so a
 * receding line thins out evenly, every other light first, then every
 * fourth, the lead's never. The line is taken in its order at dawn, north
 * to south (the night's line is a scaled copy of it: movements.ts).
 */
function rulerLine(line: readonly Ship[]): {
  order: Ship[];
  parents: (s: Ship) => Ship[];
} {
  const along = [...line].sort(
    (a, b) => (DAWN.get(b)?.lat ?? 0) - (DAWN.get(a)?.lat ?? 0),
  );
  const lead = Math.max(
    0,
    along.findIndex((s) => s.lead),
  );
  const level = (k: number) => {
    let m = Math.abs(k - lead);
    if (m === 0) return Number.POSITIVE_INFINITY;
    let r = 0;
    while (m % 2 === 0) {
      m /= 2;
      r++;
    }
    return r;
  };
  const order = along
    .map((s, k) => ({ s, k, level: level(k), off: Math.abs(k - lead) }))
    .sort((a, b) => b.level - a.level || a.off - b.off || a.k - b.k)
    .map((x) => x.s);
  const parents = (s: Ship): Ship[] => {
    const k = along.indexOf(s);
    const r = level(k);
    if (!Number.isFinite(r)) return [];
    const step = 2 ** r;
    return [k - step, k + step]
      .filter((j) => j >= 0 && j < along.length)
      .map((j) => along[j]);
  };
  return { order, parents };
}
