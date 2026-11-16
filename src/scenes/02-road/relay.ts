import { BEATS, dayAt, RELAY_CLOCK } from "./beats";
import { day } from "./dates";

/**
 * The relay of 19 October in beat 4 (docs/history-notes.md, "The signal
 * chain, 19 to 21 October" and "How the chart shows the signals", "By
 * day"): No. 370, "the enemy's ships are coming out of port", passed from
 * the frigates off Cádiz down the chain of ships of the line to the
 * Victory, about 50 nm west, from 7.00 to 9.30. The links in order, each
 * with the hour her signal is up on the story's clock (beats.ts,
 * RELAY_CLOCK). This part holds the table and its places on the scroll,
 * which the camera follows (camera.ts); what each link shows (her hoist,
 * her counted guns) is drawn from it in the relay's second part.
 *
 * Logged: the Sirius at 7.00 and the Euryalus repeating to the Phoebe at
 * 7.20 with No. 163, "West" (the Euryalus's log and signal log); the
 * Phoebe making all sail "firing guns" (the Sirius's log, at 7 by her
 * clock) and west of the Euryalus at 8 "firing three minute guns" (her
 * hour here, 7.25, is the chart's within those); the Mars "about 9" (Walker,
 * Cumby: her coloured flags unread, then the distant signal), the Victory's
 * answer at 9.30 (Nelson's diary, Beatty). The Defence and the Colossus
 * are not logged: their hours are the chart's, spaced along the long run
 * west. The Agamemnon lay with the Defence, but nothing shows she passed
 * the signal, and the Naiad was placed between the Euryalus and the Phoebe
 * only at 8.10, after No. 370 had gone on: neither is a link.
 */
export interface RelayLink {
  /** The ship, by her name in the British fleet (fleets.ts). */
  name: string;
  /** When her signal is up, hours of 19 October. */
  hour: number;
  /** Whether a log or an eyewitness gives the hour (else it is the chart's). */
  logged: boolean;
}

export const RELAY_LINKS: readonly RelayLink[] = [
  { name: "Sirius", hour: RELAY_CLOCK.sirius[1], logged: true },
  { name: "Euryalus", hour: RELAY_CLOCK.euryalus[1], logged: true },
  { name: "Phoebe", hour: 7 + 25 / 60, logged: true },
  { name: "Defence", hour: 8 + 20 / 60, logged: false },
  { name: "Colossus", hour: 8 + 45 / 60, logged: false },
  { name: "Mars", hour: 9, logged: true },
  { name: "Victory", hour: RELAY_CLOCK.victory[1], logged: true },
];

/**
 * The chain's four ships of the line (history notes, "The chain"): the
 * Defence and the Agamemnon 7 to 10 leagues west of Cádiz, the Colossus and
 * the Mars 5 leagues east of the fleet. Drawn apart from the British fleet
 * as the repeating ships they were (the owner's answer of 14 November
 * 2026): they show on their own where Nelson's body shows as its label.
 */
export const CHAIN_SHIPS: readonly string[] = [
  "Defence",
  "Agamemnon",
  "Colossus",
  "Mars",
];

/** The progress p at which the story's clock reaches an hour of 19 October. */
export function pOfRelayHour(hour: number): number {
  const d = day(10, 19, hour);
  let lo: number = BEATS.cadiz[0];
  let hi: number = BEATS.cadiz[1];
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (dayAt(mid) < d) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The progress p at which a link's signal is up. */
export function relayP(name: string): number {
  const link = RELAY_LINKS.find((l) => l.name === name);
  if (!link) throw new Error(`relay: no link ${name}`);
  return pOfRelayHour(link.hour);
}
