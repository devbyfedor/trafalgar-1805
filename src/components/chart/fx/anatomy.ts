import type { MastId, ShipSpec } from "@/components/ship/types";
import { FOOT, type GlyphAtlas, type GlyphType } from "../glyphs/atlas";

/**
 * Where things are on a ship's glyph: the places the logs name for lights,
 * guns and signals (her poop lanterns, her main top, her three mastheads,
 * her quarter, her broadside), taken from the same spec the atlas draws her
 * from (glyphs/atlas.ts), so a lantern hangs on her taffrail, a hoist flies
 * from her truck and a puff leaves her ports at every size and every turn
 * of her glyph.
 *
 * In the glyph's own units: `along` in glyph heights from her hull's middle
 * toward her bow (the atlas centres the hull in its cell), `up` in glyph
 * heights from the glyph's foot (her waterline is FOOT above it). A point
 * at (along, up) stands `along × narrowing × facing` and `up` glyph heights
 * from her foot on screen (fx/Smoke.ts, `place`), as her drawing does.
 */

/** A point of a glyph: glyph heights toward her bow and up from her foot. */
export interface ShipPoint {
  along: number;
  up: number;
}

export interface Anatomy {
  /** Her poop lanterns, standing on the taffrail. */
  stern: ShipPoint;
  /** A light in her main top. */
  top: ShipPoint;
  /** Her main truck: rockets went up from the masthead. */
  masthead: ShipPoint;
  /** Each mast's truck, where a hoist flies (the distant signal used all three). */
  mastheads: Readonly<Record<MastId, ShipPoint>>;
  /** Her quarterdeck rail abreast the mizzen, where blue lights were burned. */
  quarter: ShipPoint;
  /** Her upper-deck ports, aft and fore (along), and their height (up). */
  gunsAft: number;
  gunsFore: number;
  gunsUp: number;
}

/** A lantern's height over the rail it stands on, metres. */
const LANTERN_M = 1.1;

type Metres = readonly [number, number];

/** A type's places, metres: x from the hull's middle toward the bow, y above the waterline. */
interface Places {
  stern: Metres;
  top: Metres;
  mastheads: Record<MastId, Metres>;
  quarter: Metres;
  /** Aft port, fore port, their height. */
  guns: readonly [number, number, number];
}

function fromSpec(spec: ShipSpec): Places {
  const hull = spec.hull;
  const half = hull.gunDeckLength / 2;
  const railAft = hull.rail.y + hull.rail.riseAft;
  const taffrail = railAft + (hull.poop?.rail ?? hull.quarterdeck.rail);
  const quarterRail = railAft + hull.quarterdeck.rail;
  const mast = (id: MastId) =>
    spec.rig.masts.find((m) => m.id === id) ?? spec.rig.masts[0];
  // A mast rakes aft: its x at a height (rig.ts, lowerAt).
  const mastX = (id: MastId, y: number) => {
    const m = mast(id);
    return m.x - (y - m.deckY) * Math.tan((m.rakeDeg * Math.PI) / 180);
  };
  const truck = (id: MastId): Metres => [
    mastX(id, mast(id).truckY) - half,
    mast(id).truckY,
  ];
  const main = mast("main");
  // Signal guns were the upper deck's: the highest deck of the broadside.
  const decks = spec.gunDecks.filter(
    (d) => d.id !== "quarterdeck" && d.id !== "forecastle",
  );
  const guns = decks.reduce((a, b) => (b.sill.y > a.sill.y ? b : a));
  return {
    stern: [-hull.sternOverhang + 0.8 - half, taffrail + LANTERN_M],
    top: [mastX("main", main.topY) - half, main.topY + LANTERN_M],
    mastheads: {
      fore: truck("fore"),
      main: truck("main"),
      mizzen: truck("mizzen"),
    },
    quarter: [mastX("mizzen", quarterRail) - 2.5 - half, quarterRail + 0.4],
    guns: [
      guns.firstX - half,
      guns.lastX - half,
      guns.sill.y + guns.port.height / 2,
    ],
  };
}

/**
 * A silhouette's places, metres, from its length and the height the atlas
 * found it fills (its drawing gives no decks or masts by name).
 */
function fromSilhouette(length: number, top: number): Places {
  const half = length / 2;
  return {
    stern: [-0.92 * half, 2.4],
    top: [0, 0.45 * top],
    mastheads: {
      fore: [0.45 * half, 0.9 * top],
      main: [0, top],
      mizzen: [-0.45 * half, 0.8 * top],
    },
    quarter: [-0.6 * half, 2],
    guns: [-0.6 * half, 0.6 * half, 1.3],
  };
}

/** Every glyph type's anatomy, by its atlas cell. */
export class ShipAnatomy {
  /** The glyph cell's width over its height (the atlas's). */
  readonly aspect: number;
  private readonly cells: Anatomy[] = [];
  private readonly ids = new Map<string, number>();

  constructor(atlas: GlyphAtlas, types: readonly GlyphType[]) {
    this.aspect = atlas.aspect;
    const metres = atlas.cellMetres;
    const point = ([x, y]: Metres): ShipPoint => ({
      along: x / metres,
      up: FOOT + y / metres,
    });
    for (const type of types) {
      const cell = atlas.index.get(type.id);
      if (cell === undefined) throw new Error(`fx: no cell for "${type.id}"`);
      const fill = atlas.fill.get(type.id);
      const m =
        "spec" in type
          ? fromSpec(type.spec)
          : fromSilhouette(
              type.silhouette.length,
              ((fill?.height ?? 0.5) - FOOT) * metres,
            );
      const mastheads = {
        fore: point(m.mastheads.fore),
        main: point(m.mastheads.main),
        mizzen: point(m.mastheads.mizzen),
      };
      this.cells[cell] = {
        stern: point(m.stern),
        top: point(m.top),
        masthead: mastheads.main,
        mastheads,
        quarter: point(m.quarter),
        gunsAft: m.guns[0] / metres,
        gunsFore: m.guns[1] / metres,
        gunsUp: FOOT + m.guns[2] / metres,
      };
      this.ids.set(type.id, cell);
    }
  }

  /** A type's anatomy by its atlas cell (`Glyphs.intent.cell`). */
  cell(cell: number): Anatomy {
    const a = this.cells[Math.round(cell)];
    if (!a) throw new Error(`fx: no anatomy for cell ${cell}`);
    return a;
  }

  /** A type's anatomy by its id (GlyphType.id). */
  type(id: string): Anatomy {
    const cell = this.ids.get(id);
    if (cell === undefined) throw new Error(`fx: no type "${id}"`);
    return this.cells[cell];
  }
}
