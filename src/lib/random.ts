/**
 * Seeded randomness for geometry. Render code never calls Math.random: the
 * same spec must produce byte-identical SVG on the server and the client.
 */

export type Rng = () => number;

/** mulberry32: small, fast, good enough for visual irregularity. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash, to derive a seed from a ship id or a part name. */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A child generator, so adding a part never shifts another part's sequence. */
export function forkRng(seed: number, part: string): Rng {
  return createRng((seed ^ seedFrom(part)) >>> 0);
}

export function between(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Symmetric noise in [-amount, amount]. */
export function jitter(rng: Rng, amount: number): number {
  return (rng() * 2 - 1) * amount;
}
