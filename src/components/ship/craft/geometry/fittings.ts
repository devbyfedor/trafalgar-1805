import { between, forkRng } from "@/lib/random";
import { path } from "../../geometry/path";
import type { Vec } from "../../geometry/vec";
import type { CraftSpec, GunSpec } from "../types";
import { deckAt, quadPoints, railAt, sampleX, strip, taper } from "./shapes";

/**
 * What stands inboard and shows over the side (the chase guns on their
 * slides, a péniche's oars laid in, the galley's chimney), the thole pins
 * on a péniche's gunwale, and a boat lying astern on her painter.
 */

export interface FittingsArt {
  guns: string;
  gunShade: string;
  gunGlint: string;
  gunSlides: string;
  oars: string;
  oarShade: string;
  tholes: string;
  chimney: string;
  chimneyShade: string;
  /** Where smoke would leave the chimney. */
  chimneyTop: Vec | null;
  boat: {
    hull: string;
    shade: string;
    strake: string;
    inside: string;
    seams: string;
    painter: string;
  } | null;
  boatSpan: { min: number; max: number; top: number } | null;
}

/** A gun's barrel in profile, its radius along it (0: breech, 1: muzzle). */
function barrel(g: GunSpec): Vec[] {
  const D = g.bore * 1.5;
  const prof: [number, number][] =
    g.kind === "long"
      ? [
          [0, 0.5],
          [0.04, 0.5],
          [0.05, 0.46],
          [0.34, 0.43],
          [0.35, 0.41],
          [0.6, 0.37],
          [0.61, 0.35],
          [0.86, 0.31],
          [0.93, 0.33],
          [0.96, 0.37],
          [1, 0.36],
        ]
      : [
          [0, 0.5],
          [0.08, 0.5],
          [0.1, 0.46],
          [0.75, 0.42],
          [0.86, 0.46],
          [1, 0.45],
        ];
  const top: Vec[] = [];
  const bottom: Vec[] = [];
  for (const [s, rr] of prof) {
    const x = g.x + g.dir * g.length * s;
    top.push([x, g.y + rr * D]);
    bottom.push([x, g.y - rr * D]);
  }
  // The cascabel's knob behind the breech.
  const knob = g.x - g.dir * D * 0.32;
  return [
    [knob, g.y + D * 0.12],
    ...top,
    ...bottom.reverse(),
    [knob, g.y - D * 0.12],
  ];
}

export function buildFittingsArt(
  spec: CraftSpec,
  farRise: (x: number) => number,
): FittingsArt {
  const h = spec.hull;
  const guns = path();
  const gunShade = path();
  const gunGlint = path();
  const gunSlides = path();
  for (const g of spec.guns) {
    const D = g.bore * 1.5;
    guns.polygon(barrel(g));
    // The barrel's underside in shade, a glint along its top.
    const a: Vec = [g.x, g.y];
    const b: Vec = [g.x + g.dir * g.length, g.y];
    gunShade.polygon(
      strip(
        a,
        b,
        D * 0.9,
        D * 0.66,
        g.dir > 0 ? 0.08 : -0.5,
        g.dir > 0 ? 0.5 : -0.08,
      ),
    );
    gunGlint.polygon(
      strip(
        a,
        b,
        D * 0.9,
        D * 0.66,
        g.dir > 0 ? -0.36 : 0.22,
        g.dir > 0 ? -0.22 : 0.36,
      ),
    );
    // The slide it lies on, its fore end raised under the barrel.
    const deck = deckAt(h, g.x);
    const x0 = g.x - g.dir * D * 0.5;
    const x1 = g.x + g.dir * g.length * 0.55;
    gunSlides.polygon([
      [x0, deck],
      [x1, deck],
      [x1, g.y - D * 0.38],
      [x0, g.y - D * 0.42],
    ]);
  }

  // A péniche's oars laid in fore and aft on the thwarts, inside the boat.
  const oars = path();
  const oarShade = path();
  const tholes = path();
  if (spec.oars) {
    const o = spec.oars;
    const r = forkRng(spec.seed, "oars");
    for (let i = 0; i < o.shown; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const mid =
        o.from +
        ((o.to - o.from) * (i + 0.5)) / o.shown +
        between(r, -0.5, 0.5);
      const x0 = mid - (dir * o.length) / 2;
      const x1 = mid + (dir * o.length) / 2;
      const yAt = (x: number) =>
        railAt(h, x) + farRise(x) * between(r, 0.15, 0.55) + 0.025;
      const y0 = yAt(x0);
      const y1 = yAt(x1);
      // Loom, then the blade at the far end.
      oars.polygon(taper([x0, y0], [x1, y1], 0.075, 0.06));
      const bladeStart: Vec = [
        x1 - dir * 1.15,
        y1 + (y0 - y1) * (1.15 / o.length),
      ];
      oars.polygon(taper(bladeStart, [x1, y1], 0.06, 0.15));
      oarShade.polygon(
        strip(
          [x0, y0],
          [x1, y1],
          0.075,
          0.06,
          dir > 0 ? 0.1 : -0.5,
          dir > 0 ? 0.5 : -0.1,
        ),
      );
    }
    // Thole pins on the gunwale, a pair to each oar.
    for (let i = 0; i < o.pairs; i++) {
      const x = o.from + ((o.to - o.from) * i) / Math.max(1, o.pairs - 1);
      for (const dx of [-0.07, 0.07]) {
        const y = railAt(h, x + dx);
        tholes.rect(x + dx - 0.022, y - 0.01, 0.044, 0.15);
      }
    }
  }

  // The galley's chimney, a short iron pipe with a cap.
  const chimney = path();
  const chimneyShade = path();
  let chimneyTop: Vec | null = null;
  if (spec.chimney) {
    const c = spec.chimney;
    const base = deckAt(h, c.x);
    const top = base + c.height;
    chimney.rect(c.x - 0.1, base, 0.2, c.height);
    chimney.rect(c.x - 0.15, top - 0.04, 0.3, 0.12);
    chimneyShade.rect(c.x + 0.03, base, 0.07, c.height - 0.04);
    chimneyShade.rect(c.x + 0.06, top - 0.04, 0.09, 0.12);
    chimneyTop = [c.x, top + 0.08];
  }

  // A boat astern on her painter, lying the same way, her stem toward the stern.
  let boat: FittingsArt["boat"] = null;
  let boatSpan: FittingsArt["boatSpan"] = null;
  if (spec.boat) {
    const b = spec.boat;
    const stem = -h.sternRake - b.gap;
    const stern = stem - b.length;
    const gun = (x: number) => {
      const t = (x - stern) / b.length;
      const low = b.height;
      return low + 0.14 * (1 - t) ** 2 * 2.2 + 0.22 * t ** 2.4;
    };
    const below = 0.6;
    const outline: Vec[] = [
      [stern + 0.18, -below],
      [stern + 0.06, 0],
      [stern - 0.12, gun(stern)],
      ...sampleX(stern, stem, 16, gun).slice(1, -1),
      [stem + 0.25, gun(stem)],
      [stem + 0.1, gun(stem) * 0.5],
      [stem - 0.15, 0],
      [stem - 0.7, -below],
    ];
    const hull = path().polygon(outline).toString();
    const shade = path();
    shade.polygon([
      ...sampleX(stern + 0.1, stem - 0.1, 12, (x) => gun(x) * 0.38),
      [stem - 0.5, -below],
      [stern + 0.2, -below],
    ]);
    const strake = path();
    strake.polygon([
      ...sampleX(stern - 0.1, stem + 0.2, 16, gun),
      ...sampleX(stern - 0.1, stem + 0.2, 16, (x) => gun(x) - 0.09).reverse(),
    ]);
    const inside = path();
    const rise = (x: number) =>
      0.09 * Math.sin((Math.PI * (x - stern)) / b.length) ** 0.7;
    inside.polygon([
      ...sampleX(stern, stem, 16, (x) => gun(x) + rise(x)),
      ...sampleX(stern, stem, 16, (x) => gun(x) - 0.01).reverse(),
    ]);
    const seams = path();
    for (const f of [0.35, 0.62]) {
      seams.polyline(
        sampleX(stern + 0.15, stem - 0.2, 12, (x) => gun(x) * (1 - f) + 0.02),
      );
    }
    // The painter: from the craft's stern down to the boat's stem head, slack.
    const taff: Vec = [-h.sternRake + 0.15, h.rail[0] - 0.25];
    const head: Vec = [stem + 0.2, gun(stem) + 0.03];
    const sag: Vec = [
      (taff[0] + head[0]) / 2,
      Math.min(taff[1], head[1]) - 0.45,
    ];
    const painter = path()
      .polyline(quadPoints(taff, sag, head, 12))
      .toString();
    boat = {
      hull,
      shade: shade.toString(),
      strake: strake.toString(),
      inside: inside.toString(),
      seams: seams.toString(),
      painter,
    };
    boatSpan = { min: stern - 0.2, max: stem + 0.3, top: gun(stem) + 0.2 };
  }

  return {
    guns: guns.toString(),
    gunShade: gunShade.toString(),
    gunGlint: gunGlint.toString(),
    gunSlides: gunSlides.toString(),
    oars: oars.toString(),
    oarShade: oarShade.toString(),
    tholes: tholes.toString(),
    chimney: chimney.toString(),
    chimneyShade: chimneyShade.toString(),
    chimneyTop,
    boat,
    boatSpan,
  };
}
