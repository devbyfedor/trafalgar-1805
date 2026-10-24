import type {
  GunDeckSpec,
  MastSpec,
  Nation,
  PaintSpec,
  ShipSpec,
  YardSpec,
} from "../types";

/**
 * Derives a ship from a reference spec by scaling it and changing what
 * differs between rates: deck count, ports, sail set and paint. Used for the
 * distant silhouettes in scene 1 (where only proportions and sail set read)
 * and as the starting point for the sixty specs later scenes will need.
 */

export type SailSet =
  /** Courses, topsails, topgallants, royals, spanker, headsails. */
  | "full"
  /** Topsails, spanker and a headsail: easy sail, close-hauled. */
  | "easy";

export interface DeriveOptions {
  id: string;
  name: string;
  nation: Nation;
  guns: number;
  decks: 2 | 3 | 4;
  /** Linear scale against the reference (hull length ratio). */
  scale: number;
  sailSet: SailSet;
  seed: number;
  paint?: Partial<PaintSpec>;
}

const scaleLine = <T extends { y: number; riseAft: number; riseFwd: number }>(
  l: T,
  k: number,
): T => ({ ...l, y: l.y * k, riseAft: l.riseAft * k, riseFwd: l.riseFwd * k });

function scaleYard(y: YardSpec, k: number, sailSet: SailSet): YardSpec {
  const keep =
    sailSet === "full" ? true : y.id === "topsail" || y.id === "mizzenTopsail";
  return {
    ...y,
    y: y.y * k,
    length: y.length * k,
    diameter: y.diameter * k,
    sail: y.sail
      ? {
          ...y.sail,
          set: y.sail.set && keep,
          footRoach: y.sail.footRoach * k,
          drop: y.sail.drop ? y.sail.drop * k : undefined,
        }
      : undefined,
  };
}

function scaleMast(m: MastSpec, k: number, sailSet: SailSet): MastSpec {
  return {
    ...m,
    x: m.x * k,
    deckY: m.deckY * k,
    topY: m.topY * k,
    lowerHeadY: m.lowerHeadY * k,
    topmastHeadY: m.topmastHeadY * k,
    crosstreesY: m.crosstreesY * k,
    topgallantHeadY: m.topgallantHeadY * k,
    truckY: m.truckY * k,
    topWidth: m.topWidth * k,
    diameters: {
      lower: m.diameters.lower * k,
      topmast: m.diameters.topmast * k,
      topgallant: m.diameters.topgallant * k,
    },
    yards: m.yards.map((y) => scaleYard(y, k, sailSet)),
  };
}

/** Gun decks for a two-decker drop the middle tier; a four-decker adds one. */
function decksFor(
  ref: readonly GunDeckSpec[],
  decks: 2 | 3 | 4,
  k: number,
): GunDeckSpec[] {
  const scaled = ref.map((d) => ({
    ...d,
    sill: scaleLine(d.sill, k),
    port: { width: d.port.width * k, height: d.port.height * k },
    firstX: d.firstX * k,
    lastX: d.lastX * k,
  }));
  const lower = scaled.find((d) => d.id === "lower");
  const middle = scaled.find((d) => d.id === "middle");
  const upper = scaled.find((d) => d.id === "upper");
  const rest = scaled.filter(
    (d) => d.id !== "lower" && d.id !== "middle" && d.id !== "upper",
  );
  if (!lower || !middle || !upper) return scaled;
  if (decks === 3) return scaled;
  if (decks === 2) {
    // The upper deck sits where the middle deck was; upper works drop too.
    const drop = upper.sill.y - middle.sill.y;
    return [
      lower,
      { ...upper, sill: { ...middle.sill }, portsPerSide: middle.portsPerSide },
      ...rest.map((d) => ({ ...d, sill: { ...d.sill, y: d.sill.y - drop } })),
    ];
  }
  // Four decks: an extra tier above the upper deck.
  const step = upper.sill.y - middle.sill.y;
  return [
    lower,
    middle,
    upper,
    {
      ...upper,
      id: "fourth",
      sill: { ...upper.sill, y: upper.sill.y + step },
    },
    ...rest.map((d) => ({ ...d, sill: { ...d.sill, y: d.sill.y + step } })),
  ];
}

export function deriveSpec(ref: ShipSpec, o: DeriveOptions): ShipSpec {
  const k = o.scale;
  // Hull height follows the deck count: about 2.5 m per tier at this scale.
  const tierShift = (o.decks - ref.decks) * 2.5 * k;
  const hull = ref.hull;
  return {
    ...ref,
    id: o.id,
    name: o.name,
    nation: o.nation,
    guns: o.guns,
    decks: o.decks,
    seed: o.seed,
    hull: {
      ...hull,
      gunDeckLength: hull.gunDeckLength * k,
      waterlineLength: hull.waterlineLength * k,
      draught: hull.draught * k,
      sternOverhang: hull.sternOverhang * k,
      stemOverhang: hull.stemOverhang * k,
      sheer: {
        lowX: hull.sheer.lowX * k,
        aftX: hull.sheer.aftX * k,
        fwdX: hull.sheer.fwdX * k,
      },
      rail: { ...scaleLine(hull.rail, k), y: hull.rail.y * k + tierShift },
      forecastle: { ...hull.forecastle, endX: hull.forecastle.endX * k },
      quarterdeck: { ...hull.quarterdeck, startX: hull.quarterdeck.startX * k },
      poop: hull.poop
        ? { ...hull.poop, startX: hull.poop.startX * k }
        : undefined,
    },
    gunDecks: decksFor(ref.gunDecks, o.decks, k),
    wales: ref.wales.map((w) => ({
      line: scaleLine(w.line, k),
      thickness: w.thickness * k,
    })),
    details: {
      ...ref.details,
      quarterGallery: ref.details.quarterGallery
        ? {
            ...ref.details.quarterGallery,
            startX: ref.details.quarterGallery.startX * k,
            endX: ref.details.quarterGallery.endX * k,
            bottom: ref.details.quarterGallery.bottom * k,
            top: ref.details.quarterGallery.top * k + tierShift,
            tiers: o.decks === 2 ? 2 : ref.details.quarterGallery.tiers,
          }
        : undefined,
      head: {
        ...ref.details.head,
        length: ref.details.head.length * k,
        figureheadBase: ref.details.head.figureheadBase * k,
        figureheadTop: ref.details.head.figureheadTop * k,
      },
      entryPort: undefined,
      sideSteps: ref.details.sideSteps
        ? { x: ref.details.sideSteps.x * k }
        : undefined,
      beakhead: ref.details.beakhead
        ? {
            x: ref.details.beakhead.x * k,
            bottom: ref.details.beakhead.bottom * k + tierShift,
          }
        : undefined,
      hawse: ref.details.hawse?.map((h) => ({ x: h.x * k, y: h.y * k })),
      boats: ref.details.boats
        ? {
            startX: ref.details.boats.startX * k,
            endX: ref.details.boats.endX * k,
            rise: ref.details.boats.rise * k,
          }
        : undefined,
      channels: ref.details.channels.map((c) => ({
        ...c,
        y: c.y * k + tierShift,
        startX: c.startX * k,
        endX: c.endX * k,
      })),
      cathead: {
        x: ref.details.cathead.x * k,
        y: ref.details.cathead.y * k + tierShift,
      },
    },
    rig: {
      ...ref.rig,
      masts: ref.rig.masts.map((m) => scaleMast(m, k, o.sailSet)),
      bowsprit: {
        ...ref.rig.bowsprit,
        heelX: ref.rig.bowsprit.heelX * k,
        heelY: ref.rig.bowsprit.heelY * k + tierShift,
        length: ref.rig.bowsprit.length * k,
        diameter: ref.rig.bowsprit.diameter * k,
        jibBoom: {
          length: ref.rig.bowsprit.jibBoom.length * k,
          overlap: ref.rig.bowsprit.jibBoom.overlap * k,
        },
        flyingJibBoom: ref.rig.bowsprit.flyingJibBoom
          ? {
              length: ref.rig.bowsprit.flyingJibBoom.length * k,
              overlap: ref.rig.bowsprit.flyingJibBoom.overlap * k,
            }
          : undefined,
      },
      spanker: {
        ...ref.rig.spanker,
        gaffThroatY: ref.rig.spanker.gaffThroatY * k,
        gaffLength: ref.rig.spanker.gaffLength * k,
        boomY: ref.rig.spanker.boomY * k + tierShift,
        boomLength: ref.rig.spanker.boomLength * k,
      },
      headsails: ref.rig.headsails.map((h) => ({
        ...h,
        set: o.sailSet === "full" ? h.set : h.id === "foreTopmastStaysail",
      })),
    },
    flags: [],
    paint: { ...ref.paint, ...o.paint },
  };
}
