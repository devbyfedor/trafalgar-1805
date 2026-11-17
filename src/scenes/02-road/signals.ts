import type { ChartLayer, FrameInfo } from "@/components/chart";
import { rand, smoothstep } from "@/components/chart/fx/common";
import type { FlagKind, Hoists } from "@/components/chart/fx/Hoists";
import {
  type PuffSpec,
  puffSpec,
  type Smoke,
} from "@/components/chart/fx/Smoke";
import type { Glyphs } from "@/components/chart/glyphs/Glyphs";
import type { MastId } from "@/components/ship/types";
import { FLEETS_OFF_CADIZ } from "./director";
import { BRITISH, COMBINED } from "./fleets";
import { pOfRelayHour, RELAY_LINKS, type RelayLink } from "./relay";

/**
 * The day signals of the relay of 19 October 1805 in beat 4
 * (docs/history-notes.md, "Signals in 1805", "The signal chain, 19 to 21
 * October" and "How the chart shows the signals", by day;
 * docs/decisions.md, "Scene 2, Stage B: the relay of 19 October, part
 * two"): No. 370, "the enemy's ships are coming out of port", passed down
 * the chain from the Sirius off San Sebastián to the Victory, about 50 nm
 * west, from 7.00 to 9.30 (relay.ts, RELAY_LINKS, their hours on the
 * story's clock). Nothing travels between the ships: each link shows the
 * signal at her own masthead in turn.
 *
 * - **A link** hoists No. 370 at her main truck, three numeral flags (the
 *   same three at every link: the same message, repeated), and fires a
 *   counted pair or three of guns to draw the eye to it: white puffs at
 *   her side, one after another, drifting off on the light airs. Her
 *   hoist stays up until the answer has come back past her (the signal
 *   book's rule: a signal flew until repeated to the commander-in-chief
 *   and answered), so lit links accumulate westward as the camera follows
 *   the signal.
 * - **The Phoebe**, sent west by the Euryalus at 7.20, fires three-minute
 *   guns as she runs (the Euryalus's log at 8: "firing three minute guns";
 *   Nelson's order of 10 October for the ship bringing news of a sortie):
 *   a gun every three minutes of the story's clock, her puffs strung
 *   astern of her.
 * - **The Mars**, about 9: her coloured flags cannot be read from the
 *   fleet, hull-down, so she hauls them down and makes the distant signal,
 *   a flag, a ball and a pendant, one at each masthead (Cumby; Nelson's
 *   order for distant signals), kept until the Victory answers.
 * - **The Victory**, 9.30, answers and makes the general chase in the
 *   south-east quarter: one flag, the SE compass flag, and two guns
 *   (Nelson's diary, Beatty); then the fleet makes sail for the Strait.
 *
 * Licences (history-notes "Assumptions and licences"): the flags' tints
 * (the 1804 values of the numeral flags were not transcribed; the plates'
 * muted red, white, blue and yellow); the guns' counts at the links the
 * logs don't count (a pair or three, as the Euryalus's signals of the 20th
 * went); the hours the hoists come down as the answer runs back (not
 * logged). The Sirius's telegraph at 6.04 and the Euryalus's No. 163
 * "West" to the Phoebe are not drawn: the first comes before the camera's
 * hold over the harbour, the second is a second hoist at the same truck,
 * which at the glyphs' size would read as one hoist of five.
 *
 * Timing on the scroll: a hoist goes up and comes down over HOIST_P of p,
 * and a gun's puff lives GUN_LIFE_P of p (as the smoke at Finisterre:
 * smoke.ts, LIFE_P), so neither pops in a frame on a reader's scroll; the
 * hours each happens at are the story's (pOfRelayHour), so a link shows as
 * the clock reaches her hour wherever the camera is.
 *
 * Laid out after the ships each frame (the layer is added after the glyph
 * layout), and drawn by the engine's hoists (fx/Hoists.ts) and a smoke of
 * its own (fx/Smoke.ts, named "signal-smoke"), its wind the day's.
 */

/**
 * No. 370 as three numeral flags: three flags, one a digit, as the 1799
 * Signal Book hoisted a number (Perrin 1922; FOTW). Their designs in 1805
 * are not known (the values were changed in 1803-04 and the new ones not
 * transcribed): drawn as three dabs of the plates' tints, the same at
 * every link.
 */
const NO_370: readonly FlagKind[] = ["blue", "yellow", "red"];

/**
 * The general chase in the south-east quarter, as the Victory made it at
 * 9.30: one flag, the SE compass flag (Hudson 1917; its design not
 * transcribed: a licence, a tint not among No. 370's first two).
 */
const CHASE_SE: readonly FlagKind[] = ["white"];

/**
 * The distant signal: a flag, a ball and a pendant, one at each masthead
 * (Cumby 1899), each with its hoist id's slot (the main's 3, apart from the
 * colours' at the same truck); the one-flag hoists made once, not each
 * frame.
 */
const DISTANT: readonly (readonly [MastId, readonly FlagKind[], number])[] = [
  ["fore", ["dark-flag"], 0],
  ["main", ["dark-ball"], 3],
  ["mizzen", ["dark-pendant"], 2],
];

/**
 * The wind off Cádiz that morning: light airs, calm by noon inshore (the
 * Euryalus's log), easterly at the fleet before the chase (Nelson's diary,
 * Beatty): from the east, light, so the guns' smoke hangs and drifts west.
 */
export const RELAY_WIND = { fromDeg: 90, strength: 0.18 } as const;

/**
 * A hoist goes up (and comes down) over this much p before its hour
 * (after): about 65 px of scroll on the owner's screen (at 0.0016 a hoist
 * came in within a few frames of a reader's scroll, a pop).
 */
const HOIST_P = 0.003;
/** A link's first gun this long after her hoist is up, the next every GUN_EVERY_P. */
const GUN_DELAY_P = 0.0003;
const GUN_EVERY_P = 0.0022;
/** A gun's puff lives this much p of scroll, give or take GUN_LIFE_SPREAD. */
const GUN_LIFE_P = 0.0095;
const GUN_LIFE_SPREAD = 0.2;
/** The Phoebe's minute guns: every three minutes of the story's clock, from her hour to 8.10. */
const MINUTE_GUNS_TO_H = 8 + 10 / 60;
const MINUTE_GUN_H = 3 / 60;
/** Her minute guns' puffs live shorter, so her trail holds five or six. */
const MINUTE_LIFE_P = 0.0045;
/**
 * The Mars hauls her colours down and makes the distant signal a few
 * minutes after she has hoisted No. 370 (about 9: her colours unread from
 * the fleet, then the shapes; Cumby): one hoist going up as the other
 * comes down, so she is never without a signal.
 */
const MARS_DISTANT_H = 9 + 6 / 60;
/** Each link's hoist comes down this many story hours after the next one's, as the answer runs back. */
const ANSWER_BACK_H = 0.1;
/**
 * The Victory's flag flies through the fleet's making sail, and every flag
 * and puff goes with its ship as the October fleets leave the story while
 * the camera still holds over the station (director.ts, FLEETS_OFF_CADIZ,
 * 0.826 to 0.833: a flag or puff draws only on a ship drawn). The relay's
 * own fade (HOIST_P) comes after that, where nothing shows, so it never
 * cuts a flag; from there the relay does no work.
 */
const RELAY_END_P = FLEETS_OFF_CADIZ[3] + HOIST_P;

/**
 * A gun puff's size in bloom (glyph heights), its swelling over its life,
 * its drift (glyph heights, downwind) and how far below her foot it stands
 * (glyph heights): small round puffs, one a gun, each a little older and
 * farther off than the next, so a counted pair or three reads as two or
 * three (larger, they ran together into one cloud), at her side toward the
 * eye, where her hull does not hide them.
 */
const GUN_SIZE = 0.3;
const GUN_SWELL = 0.55;
const GUN_DRIFT = 1.5;
const GUN_BELOW = 0.12;

/** Guns each link fires with her hoist (none: the Phoebe's are her minute guns). */
const GUNS: Readonly<Record<string, number>> = {
  Sirius: 2,
  Euryalus: 3,
  Phoebe: 0,
  Defence: 2,
  Colossus: 2,
  Mars: 3,
  Victory: 2,
};

/** Hoist ids (Hoists.hoist): four a link, by mast, the fourth the Mars's second main. */
const IDS_PER_LINK = 4;
const MAST_ID: Record<MastId, number> = { fore: 0, main: 1, mizzen: 2 };
export const SIGNAL_HOIST_IDS = RELAY_LINKS.length * IDS_PER_LINK;

/** A link as the scene plays it: her mark and the p of each of her moments. */
interface LinkPlay {
  link: RelayLink;
  mark: number;
  /** Her signal up (her hour), and down as the answer comes back past her. */
  up: number;
  down: number;
  /** Her counted guns' births. */
  guns: number[];
  /** Her minute guns' births (the Phoebe's). */
  minute: number[];
  /** The Mars: her colours down and her distant signal up, at this p (else NaN). */
  distant: number;
  seed: number;
}

export class RelaySignals implements ChartLayer {
  private p = 0;
  private readonly spec: PuffSpec = puffSpec();
  private readonly links: LinkPlay[];
  /** The p from which a hoist may be up, and to which a puff may live. */
  readonly span: readonly [number, number];

  /**
   * `hoists` and `smoke` draw; `fleets` is both fleets' glyph layer, its
   * marks `[...BRITISH, ...COMBINED]` (director.ts, fleetMarks).
   */
  constructor(
    private readonly hoists: Hoists,
    private readonly smoke: Smoke,
    private readonly fleets: Glyphs,
  ) {
    this.smoke.setWind(RELAY_WIND.fromDeg, RELAY_WIND.strength);
    this.links = playLinks();
    const first = Math.min(...this.links.map((l) => l.up)) - HOIST_P;
    this.span = [first, RELAY_END_P];
  }

  /** The scene's progress this frame (set from the director's state). */
  setProgress(p: number): void {
    this.p = p;
  }

  update(_frame: FrameInfo): void {
    const hoists = this.hoists;
    const smoke = this.smoke;
    hoists.clear();
    smoke.clear();
    const p = this.p;
    if (!(p > this.span[0] && p < this.span[1])) return;
    const fleets = this.fleets;
    // Every link fades out with the relay's end, as her fleet goes out of
    // the story for the cut-away.
    const end = 1 - smoothstep(RELAY_END_P - HOIST_P, RELAY_END_P, p);
    for (let k = 0; k < this.links.length; k++) {
      const l = this.links[k];
      const id = k * IDS_PER_LINK;
      const up =
        smoothstep(l.up - HOIST_P, l.up, p) *
        (1 - smoothstep(l.down, l.down + HOIST_P, p)) *
        end;
      if (Number.isNaN(l.distant)) {
        const flags = l.link.name === "Victory" ? CHASE_SE : NO_370;
        hoists.hoist(fleets, l.mark, flags, up, id + MAST_ID.main, "main");
      } else {
        // The Mars: her colours, hauled down as the distant signal goes up.
        const colours =
          up * (1 - smoothstep(l.distant - HOIST_P, l.distant, p));
        hoists.hoist(
          fleets,
          l.mark,
          NO_370,
          colours,
          id + MAST_ID.main,
          "main",
        );
        const shapes =
          smoothstep(l.distant - HOIST_P, l.distant, p) *
          (1 - smoothstep(l.down, l.down + HOIST_P, p)) *
          end;
        if (shapes > 0.001)
          for (let d = 0; d < DISTANT.length; d++) {
            const [mast, flags, slot] = DISTANT[d];
            hoists.hoist(fleets, l.mark, flags, shapes, id + slot, mast);
          }
      }
      for (let g = 0; g < l.guns.length; g++)
        this.gun(l, g, l.guns[g], GUN_LIFE_P, l.guns.length);
      for (let g = 0; g < l.minute.length; g++)
        this.gun(l, 16 + g, l.minute[g], MINUTE_LIFE_P, 1);
    }
  }

  /**
   * Gun `g` of a link, born at p `born`, its puff living about `life` of
   * p: a white puff from her upper-deck ports, the guns of a counted
   * salvo from forward aft along her side, swelling and drifting off on
   * the light airs.
   */
  private gun(
    l: LinkPlay,
    g: number,
    born: number,
    life: number,
    count: number,
  ): void {
    const p = this.p;
    if (!(p > born)) return;
    const s = l.seed * 64 + g;
    const span = life * (1 + GUN_LIFE_SPREAD * (rand(s, 1) - 0.5));
    const age = (p - born) / span;
    if (!(age < 1)) return;
    const ship = this.smoke.anatomy.cell(
      this.fleets.intent.turn[l.mark] > 0.5
        ? this.fleets.intent.cell2[l.mark]
        : this.fleets.intent.cell[l.mark],
    );
    // Successive ports from forward aft, a little uneven (branch 2's gunPort).
    const step = count > 1 ? (g % 16) / (count - 1) : 0.5;
    const along = Math.min(
      1,
      Math.max(0, 0.8 - 0.6 * step + 0.12 * (rand(s, 2) - 0.5)),
    );
    const r = rand(s, 3);
    const size = GUN_SIZE * (0.9 + 0.2 * r) * (1 + GUN_SWELL * age);
    const spec = this.spec;
    spec.along = ship.gunsAft + (ship.gunsFore - ship.gunsAft) * along;
    spec.up = ship.gunsUp - 0.3 * size;
    spec.dx = 0;
    // A little toward the eye from her side, as the side the camera sees.
    spec.dy = -GUN_BELOW;
    spec.drift = GUN_DRIFT * (0.8 + 0.4 * rand(s, 4)) * age;
    spec.size = size;
    spec.age = age;
    spec.seed = s;
    spec.opacity = 0.95;
    spec.lie = 0.15 * rand(s, 5);
    this.smoke.puffAtShip(this.fleets, l.mark, spec);
  }

  dispose(): void {}
}

/** How many puffs the relay may need at once. */
export function signalPuffCapacity(): number {
  const counted = Object.values(GUNS).reduce((a, b) => a + b, 0);
  return counted + 24;
}

/** How many hoists the relay may set at once (every link's, the Mars's two). */
export function signalHoistCapacity(): number {
  return RELAY_LINKS.length + DISTANT.length;
}

/** Every link's moments on the scroll, from the story's clock. */
function playLinks(): LinkPlay[] {
  const ships = [...BRITISH, ...COMBINED];
  const markOf = (name: string) => {
    const i = ships.findIndex((s) => s.side === "british" && s.name === name);
    if (i < 0) throw new Error(`signals: no British ship ${name}`);
    return i;
  };
  const last = RELAY_LINKS.length - 1;
  const answer = RELAY_LINKS[last].hour;
  return RELAY_LINKS.map((link, k) => {
    const up = pOfRelayHour(link.hour);
    // Down as the answer runs back past her: the Mars first, then up the
    // chain; the Victory's flag flies on through the chase, to the relay's
    // end (past it: a smoothstep of an infinite edge would be NaN).
    const back = last - k;
    const down =
      k === last
        ? RELAY_END_P + 1
        : pOfRelayHour(answer + ANSWER_BACK_H * back);
    const n = GUNS[link.name] ?? 0;
    const guns = Array.from(
      { length: n },
      (_, g) => up + GUN_DELAY_P + g * GUN_EVERY_P,
    );
    const minute: number[] = [];
    if (link.name === "Phoebe")
      for (let h = link.hour; h <= MINUTE_GUNS_TO_H + 1e-6; h += MINUTE_GUN_H)
        minute.push(pOfRelayHour(h));
    const distant =
      link.name === "Mars" ? pOfRelayHour(MARS_DISTANT_H) : Number.NaN;
    return {
      link,
      mark: markOf(link.name),
      up,
      down,
      guns,
      minute,
      distant,
      seed: 101 + k * 7,
    };
  });
}
