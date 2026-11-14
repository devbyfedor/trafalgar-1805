import type { CraftSpec } from "@/components/ship/craft/types";
import { ORDER, type Plate } from "../paint/plate";
import { EYE_H } from "../scene";
import {
  type CraftPlace,
  craftExtent,
  craftJob,
  prepJobs,
  reflectionJobs,
  reflectionReach,
} from "./heroes/craft-paint";
import { SEA_BATEAU, SEA_CHALOUPE } from "./heroes/specs";

/**
 * The nearest craft, large in the foreground, at anchor around the eye's
 * own boat in the roads: a chaloupe canonnière (a gun-brig) about 80 m off
 * on the right and a bateau canonnier (a lugger) about 135 m off on the
 * left, both bows to the left like the whole line (to the stream), at
 * their true size. Each is two plates rocking at anchor: the craft, and
 * its reflection, which rolls the other way.
 */

interface Hero {
  id: string;
  spec: CraftSpec;
  /** Metres ahead of the eye and to the right of the view's axis. */
  ahead: number;
  right: number;
  roll: number;
  heave: number;
  period: number;
  phase: number;
  seed: number;
}

const HEROES: readonly Hero[] = [
  {
    id: "hero-chaloupe",
    spec: SEA_CHALOUPE,
    ahead: 80,
    right: 27,
    roll: 0.75,
    heave: 0.2,
    period: 6.6,
    phase: 0,
    seed: 501,
  },
  {
    id: "hero-bateau",
    spec: SEA_BATEAU,
    ahead: 135,
    right: -44,
    roll: 0.6,
    heave: 0.16,
    period: 7.8,
    phase: 2.3,
    seed: 502,
  },
];

/** The frame's lowest reach at the hold, layer units (with a margin). */
const FRAME_BOTTOM = -292;

export function heroPlates(): Plate[] {
  const out: Plate[] = [];
  for (const h of HEROES) {
    const pl: CraftPlace = {
      x: (1000 * h.right) / h.ahead,
      y: (-1000 * EYE_H) / h.ahead,
      s: 1000 / h.ahead,
      bowLeft: true,
      ahead: h.ahead,
    };
    const ext = craftExtent(h.spec, pl, h.seed);
    const pad = 3;
    const reach = Math.max(FRAME_BOTTOM, reflectionReach(h.spec, pl, h.seed));
    out.push({
      id: `${h.id}-reflection`,
      depth: h.ahead,
      order: ORDER.reflection(h.ahead),
      box: [ext.x0 - pad - 4, ext.x1 + pad + 4, reach - pad, pl.y + pad],
      group: "craft",
      jobs: () => [
        ...prepJobs(h.spec),
        ...reflectionJobs(h.spec, pl, h.seed, reach),
      ],
      // The reflection rolls the other way but rises and falls with the
      // water at the hull, as the craft does: a negative roll rather than
      // `mirror`, which turns the heave over too and opens a gap at the
      // waterline.
      rock: {
        pivot: [pl.x, pl.y],
        roll: -h.roll,
        heave: h.heave,
        period: h.period,
        phase: h.phase,
      },
    });
    out.push({
      id: h.id,
      depth: h.ahead,
      order: ORDER.craft(h.ahead),
      box: [ext.x0 - pad, ext.x1 + pad, ext.bottom - pad, ext.top + pad],
      group: "craft",
      jobs: () => [...prepJobs(h.spec), craftJob(h.spec, pl, "hero", h.seed)],
      rock: {
        pivot: [pl.x, pl.y],
        roll: h.roll,
        heave: h.heave,
        period: h.period,
        phase: h.phase,
      },
    });
  }
  return out;
}
