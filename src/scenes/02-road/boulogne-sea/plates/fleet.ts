import type { CraftSpec } from "@/components/ship/craft/types";
import { type EN, SHORE_LOW } from "../geo";
import { createRng } from "../paint/kit";
import type { Plate, PlateJob } from "../paint/plate";
import { EYE_H, viewOf } from "../scene";
import {
  type CraftPlace,
  craftExtent,
  craftJob,
  reflectionJobs,
  reflectionReach,
} from "./heroes/craft-paint";
import {
  SEA_BATEAU,
  SEA_CHALOUPE,
  SEA_PENICHE,
  SEA_PRAME,
} from "./heroes/specs";

/**
 * The moored line in the roads, August 1805: one line, double in strength,
 * parallel to the beach just seaward of the low-water edge (geo.ts
 * SHORE_LOW), seen broadside about 300–430 m off, receding to the left
 * toward Wimereux and continuing to the right south of the harbour's
 * mouth. Craft about every 52 m in each row, the two rows staggered:
 * chaloupes canonnières and bateaux canonniers in about equal numbers (the
 * July 1805 line: 27 and 27), all lying bows to the left, to the stream
 * (north-north-east; an inference, Low). Péniches inshore of the line
 * toward the frame's ends. One prame far along the line on the left: a
 * licence (no 1805 line held one; the sortie of 12 August had them).
 *
 * At true size, in the middle distance: each type known by its rig, hull
 * and ports, without the finest lines; each with its reflection. Plates by
 * row and by stretches across the view, so boxes stay tight and each
 * stretch moves at its own depth.
 */

interface Moored {
  spec: CraftSpec;
  pl: CraftPlace;
  seed: number;
}

/** Points every `step` m along a polyline (east, north), from `start` m, `offset` m seaward (west of its run). */
function along(
  line: readonly EN[],
  step: number,
  start: number,
  offset: number,
): EN[] {
  const out: EN[] = [];
  let acc = 0;
  let next = start;
  for (let i = 0; i + 1 < line.length; i++) {
    const [e0, n0] = line[i];
    const [e1, n1] = line[i + 1];
    const de = e1 - e0;
    const dn = n1 - n0;
    const len = Math.hypot(de, dn);
    const ue = de / len;
    const un = dn / len;
    while (next <= acc + len) {
      const t = next - acc;
      out.push([e0 + ue * t + un * offset, n0 + un * t - ue * offset]);
      next += step;
    }
    acc += len;
  }
  return out;
}

function placeAt(e: number, n: number): CraftPlace | null {
  const [ahead, right] = viewOf(e, n);
  if (ahead < 150) return null;
  return {
    x: (1000 * right) / ahead,
    y: (-1000 * EYE_H) / ahead,
    s: 1000 / ahead,
    bowLeft: true,
    ahead,
  };
}

/** Whether a craft at this place can show at the hold or through the drift. */
function inView(pl: CraftPlace): boolean {
  return pl.x > -980 && pl.x < 960 + 14000 / pl.ahead;
}

const ROWS = [
  { id: "inner", offset: 24, start: 10, seed: 71 },
  { id: "outer", offset: 84, start: 36, seed: 72 },
] as const;

function buildLine(): { row: string; craft: Moored[] }[] {
  const rows = ROWS.map((r) => {
    const rng = createRng(r.seed);
    const craft: Moored[] = [];
    for (const [e, n] of along(SHORE_LOW, 52, r.start, r.offset)) {
      const slip = (rng() - 0.5) * 14;
      const across = (rng() - 0.5) * 12;
      const kind = rng();
      const seed = Math.floor(rng() * 1e6);
      const pl = placeAt(e + across, n + slip);
      if (!pl || !inView(pl)) continue;
      craft.push({ spec: kind < 0.5 ? SEA_CHALOUPE : SEA_BATEAU, pl, seed });
    }
    return { row: r.id, craft };
  });
  // The prame: the outer row's craft nearest the left of the frame.
  const outer = rows[1].craft;
  let best = -1;
  for (let i = 0; i < outer.length; i++) {
    const d = Math.abs(outer[i].pl.x + 600);
    if (best < 0 || d < Math.abs(outer[best].pl.x + 600)) best = i;
  }
  if (best >= 0) outer[best] = { ...outer[best], spec: SEA_PRAME };
  // Péniches inshore of the line toward the frame's ends.
  const rng = createRng(73);
  const peniches: Moored[] = [];
  for (const [e, n] of along(SHORE_LOW, 34, 0, 6)) {
    const skip = rng() < 0.45;
    const seed = Math.floor(rng() * 1e6);
    const pl = placeAt(e, n);
    if (!pl || !inView(pl) || Math.abs(pl.x) < 480 || skip) continue;
    peniches.push({ spec: SEA_PENICHE, pl, seed });
  }
  return [{ row: "peniches", craft: peniches }, ...rows];
}

/** A plate's stretch of a row across the view, layer units. */
const STRETCH = 420;

export function fleetPlates(): Plate[] {
  const plates: Plate[] = [];
  for (const { row, craft } of buildLine()) {
    const sorted = [...craft].sort((a, b) => a.pl.x - b.pl.x);
    let group: Moored[] = [];
    const flush = () => {
      if (!group.length) return;
      const g = group;
      group = [];
      let x0 = Number.POSITIVE_INFINITY;
      let x1 = Number.NEGATIVE_INFINITY;
      let y0 = Number.POSITIVE_INFINITY;
      let y1 = Number.NEGATIVE_INFINITY;
      let depth = 0;
      for (const m of g) {
        const ext = craftExtent(m.spec, m.pl, m.seed);
        x0 = Math.min(x0, ext.x0);
        x1 = Math.max(x1, ext.x1);
        y1 = Math.max(y1, ext.top);
        y0 = Math.min(y0, reflectionReach(m.spec, m.pl, m.seed));
        depth += m.pl.ahead / g.length;
      }
      const far = [...g].sort((a, b) => b.pl.ahead - a.pl.ahead);
      plates.push({
        id: `line-${row}-${plates.length}`,
        depth: Math.round(depth),
        box: [x0 - 6, x1 + 6, y0 - 3, y1 + 3],
        group: "craft",
        jobs: (): PlateJob[] =>
          far.flatMap((m) => [
            ...reflectionJobs(m.spec, m.pl, m.seed),
            craftJob(m.spec, m.pl, "mid", m.seed),
          ]),
      });
    };
    for (const m of sorted) {
      if (group.length && m.pl.x - group[0].pl.x > STRETCH) flush();
      group.push(m);
    }
    flush();
  }
  return plates;
}
