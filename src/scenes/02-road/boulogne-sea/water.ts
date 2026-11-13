import { createRng } from "@/lib/random";
import {
  buildStrip,
  type StripGeometry,
} from "@/scenes/01-dawn/layers/seaGeometry";
import { EYE_H, mixHex, PALETTE } from "./scene";

/**
 * The water of the roads, as scene 1's sea (01-dawn/layers/seaGeometry.ts):
 * tiling strips of swell, each with its body, a lit band along its crests
 * and a faint inner echo, nearer strips over farther ones. Here each strip
 * stands at a depth (metres ahead of the eye), so its waves are as long
 * and as high as waves that far off look, its colour is the water's at
 * that distance, and it moves with the camera as that depth would.
 *
 * Facing east with the sun low behind, the water reflects the eastern sky:
 * pale and warm near the shore (the lit cliffs in it), cooling to a deep
 * blue-green close by, where the faces of the waves turned to the sun
 * catch it (warm crests) and the troughs keep the sky's blue (brief,
 * "Water").
 */

export interface WaterStrip {
  id: string;
  /** Depth of the strip's far edge, metres: where it moves as (view.ts). */
  depth: number;
  /** Its top (the far edge) at the hold, layer units below the horizon. */
  top: number;
  geometry: StripGeometry;
  body: string;
  crest: string;
  inner: string;
  /** The waves' whole amplitude, layer units (the mean surface lies this far below the strip's top). */
  amp: number;
  /** Crest drift (layer units per second) and swell (units, seconds, delay). */
  drift: number;
  swell: number;
  swellPeriod: number;
  swellDelay: number;
}

/** The strips' far edges, metres: from the shore in to the eye. */
const EDGES = [
  1300, 900, 640, 460, 330, 235, 168, 120, 86, 62, 45, 33, 24, 17,
] as const;

export function buildWater(): WaterStrip[] {
  const rng = createRng(71);
  const strips: WaterStrip[] = [];
  const n = EDGES.length;
  for (let i = 0; i < n; i++) {
    const far = EDGES[i];
    const near = EDGES[i + 1] ?? far * 0.6;
    const top = (1000 * EYE_H) / far;
    const bottom = (1000 * EYE_H) / near;
    // Waves: a swell about 11 m long with shorter chop on it, seen at the
    // strip's distance and as tall as half-metre waves look there; far off
    // drawn longer than true, as scene 1's are, so they read (and their
    // paths stay small).
    const scale = 1000 / far;
    const period = Math.max(64, 11 * scale * (0.9 + rng() * 0.2));
    const amp = Math.min(12, Math.max(0.45, 0.5 * scale));
    const t = i / (n - 1);
    const k = t ** 0.8;
    const body = mixHex(
      mixHex(PALETTE.sea.farBody, PALETTE.sea.midBody, Math.min(1, k * 2)),
      PALETTE.sea.nearBody,
      Math.max(0, k * 2 - 1),
    );
    const crest = mixHex(
      mixHex(PALETTE.sea.farCrest, PALETTE.sea.midCrest, Math.min(1, k * 2)),
      PALETTE.sea.nearCrest,
      Math.max(0, k * 2 - 1),
    );
    const inner = mixHex(
      mixHex(PALETTE.sea.farInner, PALETTE.sea.midInner, Math.min(1, k * 2)),
      PALETTE.sea.nearInner,
      Math.max(0, k * 2 - 1),
    );
    const height = (bottom - top) * 1.6 + amp * 3;
    const geometry = buildStrip({
      id: `boulogne-${i}`,
      period,
      height,
      waves: [
        { k: 1, a: amp },
        { k: 2, a: amp * 0.42 },
        { k: 5, a: amp * 0.16 },
      ],
      sharpness: 0.2 + 0.25 * k,
      highlight: Math.max(0.25, amp * (0.55 + 0.6 * k)),
      seed: 700 + i,
    });
    strips.push({
      id: `w${i}`,
      depth: far,
      top,
      geometry,
      body,
      crest,
      inner,
      amp: amp * (1 + 0.42 + 0.16),
      drift: (2.2 * 1000) / far,
      swell: amp * 0.35,
      swellPeriod: 7.5 + rng() * 2.5,
      swellDelay: 4 * t,
    });
  }
  return strips;
}
