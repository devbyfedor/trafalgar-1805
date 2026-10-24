import { createRng } from "@/lib/random";
import type { ShipSpec } from "../types";
import { deriveSpec } from "./derive";
import { VICTORY_1805 } from "./victory-1805";

/**
 * Silhouette specs for scene 1's distant ships, derived from Victory.
 * At the scale they are seen (a few pixels to a couple of dozen), only
 * the deck count, proportions and sail set read; individual ships get
 * proper specs when later scenes bring them close.
 */

export const BRITISH_98 = deriveSpec(VICTORY_1805, {
  id: "british-98",
  name: "British 98-gun three-decker",
  nation: "britain",
  guns: 98,
  decks: 3,
  scale: 0.96,
  sailSet: "full",
  seed: 98,
});

export const BRITISH_74 = deriveSpec(VICTORY_1805, {
  id: "british-74",
  name: "British 74-gun two-decker",
  nation: "britain",
  guns: 74,
  decks: 2,
  scale: 0.9,
  sailSet: "full",
  seed: 74,
});

const ENEMY_TYPES: Record<string, ShipSpec> = {
  "french-74": deriveSpec(VICTORY_1805, {
    id: "french-74",
    name: "French 74",
    nation: "france",
    guns: 74,
    decks: 2,
    scale: 0.93,
    sailSet: "easy",
    seed: 1074,
  }),
  "french-80": deriveSpec(VICTORY_1805, {
    id: "french-80",
    name: "French 80",
    nation: "france",
    guns: 80,
    decks: 2,
    scale: 0.98,
    sailSet: "easy",
    seed: 1080,
  }),
  "spanish-74": deriveSpec(VICTORY_1805, {
    id: "spanish-74",
    name: "Spanish 74",
    nation: "spain",
    guns: 74,
    decks: 2,
    scale: 0.9,
    sailSet: "easy",
    seed: 2074,
  }),
  "spanish-112": deriveSpec(VICTORY_1805, {
    id: "spanish-112",
    name: "Spanish three-decker",
    nation: "spain",
    guns: 112,
    decks: 3,
    scale: 1.01,
    sailSet: "easy",
    seed: 2112,
  }),
  "santisima-trinidad": deriveSpec(VICTORY_1805, {
    id: "santisima-trinidad",
    name: "Santísima Trinidad",
    nation: "spain",
    guns: 136,
    decks: 4,
    scale: 1.06,
    sailSet: "easy",
    seed: 2136,
  }),
};

export interface FleetShip {
  spec: ShipSpec;
  /** Position along the line, 0 (north, left) to 1 (south, right). */
  u: number;
  /** Relative distance (1 = mid-line); further ships are smaller and lower. */
  depth: number;
  /** Emergence group 0–3, for staggered reveal. */
  group: number;
}

/**
 * The Combined Fleet at dawn: 33 ships of the line (18 French, 15 Spanish),
 * a ragged, roughly straight north–south line heading south under easy sail.
 * The order here is plausible, not the order of battle: the Santísima
 * Trinidad near the centre beside Villeneuve's Bucentaure, the other Spanish
 * three-deckers spread through the line.
 */
export function enemyLine(): FleetShip[] {
  const rng = createRng(1805_10_21);
  // 18 French (14 seventy-fours, 4 eighties) and 15 Spanish (the
  // four-decker, three three-deckers, eleven seventy-fours), shuffled with a
  // seeded generator, then the flagships placed near the centre.
  const pool: string[] = [
    ...Array<string>(13).fill("french-74"),
    ...Array<string>(3).fill("french-80"),
    ...Array<string>(3).fill("spanish-112"),
    ...Array<string>(11).fill("spanish-74"),
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Villeneuve's Bucentaure (80), the Santísima Trinidad, and a French 74.
  const types = [
    ...pool.slice(0, 15),
    "french-80",
    "santisima-trinidad",
    "french-74",
    ...pool.slice(15),
  ];
  // Ragged spacing: gaps and bunches, as the logs describe.
  let u = 0;
  const raw: number[] = [];
  for (let i = 0; i < 33; i++) {
    raw.push(u);
    const bunch = rng() < 0.22;
    u += bunch ? 0.35 + rng() * 0.3 : 0.8 + rng() * 0.9;
  }
  const max = raw[raw.length - 1];
  return raw.map((r, i) => ({
    spec: ENEMY_TYPES[types[i]],
    u: r / max,
    depth: 0.88 + rng() * 0.26,
    group: Math.min(3, Math.floor((r / max) * 4)),
  }));
}
