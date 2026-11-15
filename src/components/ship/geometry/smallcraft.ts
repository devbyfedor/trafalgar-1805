import { type PathBuilder, path } from "./path";
import { deg, lerp, type Vec } from "./vec";

/**
 * Small craft in starboard elevation, in the layers buildShip gives a ship
 * of the line (hull, spars, sails, rigging), for the chart's glyph atlas:
 * the vessels under the frigates that sailed with the fleets in October
 * 1805 (a naval brig, the schooner Pickle, the cutter Entreprenante; their
 * sources in docs/history-notes.md, "Scene 2: the road to Trafalgar", "Fleet sizes
 * at each stage", "The fleets in the close views"), and the small craft of the invasion flotilla at Boulogne. The
 * flotilla's designs of 1803
 * (Desbrière, Projets III, p. 90 and its plate; James III, pp. 216–217; in
 * docs/history-notes.md, "Scene 2: Boulogne from the sea (beat 1)", "The
 * flotilla in the roads and in the harbour"):
 *
 * - the prame: 110 × 25 × 8 French feet (about 36 × 8 × 2.6 m), three
 *   masts, ship-rigged ("gréement de corvette"), twelve 24-pounders;
 * - the chaloupe canonnière: a brig of 76–80 feet (about 25 m);
 * - the bateau canonnier: a lugger of 60 × 14 feet (about 19.5 × 4.5 m);
 * - the péniche: a lugger of 60 × 10 × 3½ feet, an open boat, its lugsails
 *   on two masts as Desbrière's plate draws them.
 *
 * The sources give the hulls and the kind of rig, not the spars, so masts
 * and yards are scaled from the hulls as a corvette's, a brig's and a
 * lugger's of the period would be: estimates, made so each type reads at
 * a glance. A craft at anchor shows bare masts and yards, as the anchored
 * ships of the line do (a lugger's yards come down with her sails); under
 * sail, the easy sail of a craft working in the road.
 *
 * Units and axes as buildShip's: metres, x from the sternpost at the
 * waterline toward the bow, y up from the waterline; the path builder
 * writes SVG's y down.
 */

export type CraftKind =
  | "prame"
  | "chaloupe"
  | "bateau"
  | "peniche"
  | "brig"
  | "schooner"
  | "cutter";

export interface CraftSilhouette {
  hull: string;
  spars: string;
  sails: string;
  rigging: string;
  /** The hull's length on the waterline: its middle is the glyph's anchor. */
  length: number;
}

/** Yards are drawn face-on, foreshortened as scene 1's ships' are. */
const BRACE = 0.64;

interface HullShape {
  /** Waterline length, sternpost (x = 0) to stem. */
  length: number;
  /** Height of the top of the side at the stern, its lowest point and the bow. */
  rail: readonly [number, number, number];
  /** x of the sheer's lowest point. */
  lowX: number;
  /** How far the stern's top stands aft of x = 0, and the stem's forward of the waterline's end. */
  sternRake: number;
  stemRake: number;
  /** A double-ended hull, its sternpost curved as the stem is. */
  pointed?: boolean;
}

/** Height of the top of the side at x. */
function railAt(h: HullShape, x: number): number {
  const [aft, low, fwd] = h.rail;
  if (x <= h.lowX) {
    const t = (h.lowX - x) / (h.lowX + h.sternRake);
    return low + (aft - low) * t * t;
  }
  const t = (x - h.lowX) / (h.length + h.stemRake - h.lowX);
  return low + (fwd - low) * t * t;
}

function hullOutline(h: HullShape): string {
  const pts: Vec[] = [];
  const [aft, , fwd] = h.rail;
  const below = -1;
  // Up the stern: a raked transom, or a curved post on a double-ended hull.
  pts.push([0.15, below]);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const y = aft * t;
    const run = h.pointed ? t ** 1.6 : t;
    pts.push([-h.sternRake * run, y]);
  }
  // Along the sheer to the stem head.
  for (let i = 1; i < 24; i++) {
    const x = -h.sternRake + ((h.length + h.stemRake + h.sternRake) * i) / 24;
    pts.push([x, railAt(h, x)]);
  }
  // Down the stem, curving back into the forefoot.
  for (let i = 0; i <= 8; i++) {
    const t = 1 - i / 8;
    pts.push([h.length + h.stemRake * t ** 1.3, fwd * t]);
  }
  pts.push([h.length - 0.5, below]);
  return path().polygon(pts).toString();
}

/** A tapered spar from a to b, widths wa and wb. */
function spar(b: PathBuilder, a: Vec, c: Vec, wa: number, wc: number): void {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  b.polygon([
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [c[0] + (nx * wc) / 2, c[1] + (ny * wc) / 2],
    [c[0] - (nx * wc) / 2, c[1] - (ny * wc) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
  ]);
}

/** A yard face-on: thickest in the slings, a little over a third at the arms. */
function yard(b: PathBuilder, centre: Vec, length: number, d: number): void {
  const half = (length * BRACE) / 2;
  const [cx, cy] = centre;
  b.polygon([
    [cx - half, cy + d * 0.21],
    [cx - half * 0.5, cy + d * 0.44],
    [cx, cy + d / 2],
    [cx + half * 0.5, cy + d * 0.44],
    [cx + half, cy + d * 0.21],
    [cx + half, cy - d * 0.21],
    [cx + half * 0.5, cy - d * 0.44],
    [cx, cy - d / 2],
    [cx - half * 0.5, cy - d * 0.44],
    [cx - half, cy - d * 0.21],
  ]);
}

interface MastShape {
  /** Where the mast stands at the deck. */
  x: number;
  /** Rake aft of vertical, degrees (negative: forward, as a lugger's foremast). */
  rake: number;
  deck: number;
  /** The top's platform and the lower masthead; a pole mast has neither. */
  top?: number;
  head?: number;
  topmastHead?: number;
  truck: number;
  /** Diameters: the lower mast, the topmast, the topgallant pole. */
  d: readonly [number, number, number];
  /** Fore-and-aft width of the top. */
  topWidth?: number;
  /** Yards from the lowest: height and length. */
  yards?: readonly (readonly [number, number])[];
}

interface MastLayout {
  shape: MastShape;
  /** Points on the lower mast's axis, the topmast's and the pole's. */
  lowerAt: (y: number) => Vec;
  topmastAt: (y: number) => Vec;
  poleAt: (y: number) => Vec;
  /** Each yard's centre, from the lowest. */
  yards: Vec[];
}

function mast(b: PathBuilder, m: MastShape): MastLayout {
  const lean = Math.tan(deg(m.rake));
  const lowerAt = (y: number): Vec => [m.x - (y - m.deck) * lean, y];
  const [dL, dT, dG] = m.d;
  // Topmasts stand forward of the lower masthead, through the cap.
  const topOffset = (dL * 0.8 + dT) / 2 + 0.04;
  const topmastAt = (y: number): Vec => {
    const [x] = lowerAt(y);
    return [x + topOffset, y];
  };
  const poleOffset = topOffset + (dT * 0.8 + dG) / 2 + 0.03;
  const poleAt = (y: number): Vec => {
    const [x] = lowerAt(y);
    return [x + poleOffset, y];
  };

  if (m.head === undefined || m.top === undefined) {
    // A lugger's pole mast, stepped on the floor, tapering to the truck.
    spar(b, lowerAt(m.deck - 0.2), lowerAt(m.truck), dL, dL * 0.55);
    return {
      shape: m,
      lowerAt,
      topmastAt: lowerAt,
      poleAt: lowerAt,
      yards: [],
    };
  }
  spar(b, lowerAt(m.deck - 0.2), lowerAt(m.head), dL, dL * 0.78);
  // The top, a thin platform reaching forward of the mast.
  const tw = m.topWidth ?? 2;
  const [tx, ty] = lowerAt(m.top);
  b.rect(tx - tw * 0.3, ty, tw, 0.22);
  // The cap over the masthead.
  const [cx, cy] = lowerAt(m.head);
  b.rect(cx - dL * 0.5, cy - 0.04, topOffset + dT, 0.24);
  const topHead = m.topmastHead ?? m.head;
  spar(b, topmastAt(m.top - 0.4), topmastAt(topHead), dT, dT * 0.72);
  // Crosstrees at the topmast head.
  const [kx, ky] = topmastAt(topHead - 0.5);
  b.rect(kx - tw * 0.16, ky, tw * 0.38, 0.14);
  spar(b, poleAt(topHead - 1.1), poleAt(m.truck), dG, dG * 0.5);

  const yards: Vec[] = [];
  (m.yards ?? []).forEach(([y, length], i) => {
    const axis = i === 0 ? lowerAt(y) : i === 1 ? topmastAt(y) : poleAt(y);
    const centre: Vec = [axis[0] + 0.08, y];
    const d = i === 0 ? dL * 0.6 : i === 1 ? dT * 0.7 : dG * 0.8;
    yard(b, centre, length, d);
    yards.push(centre);
  });
  return { shape: m, lowerAt, topmastAt, poleAt, yards };
}

/** Half a yard's drawn length. */
function halfYard(m: MastLayout, i: number): number {
  const ys = m.shape.yards ?? [];
  return (ys[i][1] * BRACE) / 2;
}

/**
 * A square sail from its yard to the yard below (or a course's foot),
 * bellied toward the bow, its leeches bowing forward, as scene 1 draws
 * them. Corners: head left and right, foot left and right.
 */
function squareSail(
  b: PathBuilder,
  hl: Vec,
  hr: Vec,
  fl: Vec,
  fr: Vec,
  belly: number,
): void {
  const height = (hl[1] + hr[1]) / 2 - (fl[1] + fr[1]) / 2;
  const at = (u: number, v: number): Vec => {
    const [x, y] = lerp(lerp(hl, hr, u), lerp(fl, fr, u), v);
    const across = 0.62 + 0.38 * Math.sin(Math.PI * u);
    return [x + belly * height * Math.sin(Math.PI * v ** 0.8) * across, y];
  };
  const pts: Vec[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) pts.push(at(0, i / n));
  for (let i = 1; i <= n; i++) pts.push(at(i / n, 1));
  for (let i = n - 1; i >= 0; i--) pts.push(at(1, i / n));
  for (let i = n - 1; i > 0; i--) pts.push(at(i / n, 0));
  b.polygon(pts);
}

/**
 * A fore-and-aft sail through its corners, its leech (the edge from corner
 * `leech` to the next) cut with a little roach, bowing outward.
 */
function foreAndAft(
  b: PathBuilder,
  corners: readonly Vec[],
  leech: number,
  roach: number,
): void {
  const n = corners.length;
  const cx = corners.reduce((s, p) => s + p[0], 0) / n;
  const cy = corners.reduce((s, p) => s + p[1], 0) / n;
  const pts: Vec[] = [];
  corners.forEach((p, i) => {
    pts.push(p);
    if (i !== leech) return;
    const q = corners[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    // The edge's normal that points away from the sail's middle.
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * ((p[0] + q[0]) / 2 - cx) + ny * ((p[1] + q[1]) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const s = Math.sin(Math.PI * t) * roach * len;
      pts.push([p[0] + dx * t + nx * s, p[1] + dy * t + ny * s]);
    }
  });
  b.polygon(pts);
}

/** Shrouds from the side up to a masthead. */
function shrouds(
  b: PathBuilder,
  h: HullShape,
  m: MastLayout,
  y: number,
  feet: readonly number[],
): void {
  const head = m.lowerAt(y);
  for (const dx of feet) {
    const x = m.shape.x + dx;
    b.segment([x, railAt(h, x) + 0.1], head);
  }
}

// ---- The craft ---------------------------------------------------------

/** Ship-rigged like a corvette, on a long, low, flat hull. */
function prame(sail: boolean): CraftSilhouette {
  // Bulwarks high enough to fight twelve 24-pounders on the one deck.
  const hull: HullShape = {
    length: 34.8,
    rail: [3.4, 2.8, 3.3],
    lowX: 17,
    sternRake: 1.0,
    stemRake: 1.0,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const mizzen = mast(spars, {
    x: 7.8,
    rake: 4,
    deck: 1.3,
    top: 10.4,
    head: 11.6,
    topmastHead: 16.6,
    truck: 19.6,
    d: [0.4, 0.25, 0.14],
    topWidth: 2,
    yards: [
      [10.1, 11.6],
      [15.2, 8.2],
    ],
  });
  const main = mast(spars, {
    x: 17.6,
    rake: 2.5,
    deck: 1.3,
    top: 14.3,
    head: 15.6,
    topmastHead: 23,
    truck: 27.4,
    d: [0.6, 0.36, 0.2],
    topWidth: 3.2,
    yards: [
      [13.9, 16.6],
      [21, 12.2],
      [25.6, 7.6],
    ],
  });
  const fore = mast(spars, {
    x: 28.4,
    rake: 1,
    deck: 1.3,
    top: 13.2,
    head: 14.4,
    topmastHead: 21.2,
    truck: 25.2,
    d: [0.56, 0.34, 0.19],
    topWidth: 2.9,
    yards: [
      [12.8, 15],
      [19.2, 11],
      [23.6, 6.8],
    ],
  });
  // Bowsprit and jib-boom.
  const heel: Vec = [33.6, 2.6];
  const dir: Vec = [Math.cos(deg(30)), Math.sin(deg(30))];
  const cap: Vec = [heel[0] + dir[0] * 9, heel[1] + dir[1] * 9];
  spar(spars, [heel[0] - dir[0] * 1.5, heel[1] - dir[1] * 1.5], cap, 0.5, 0.36);
  const jbStart: Vec = [cap[0] - dir[0] * 2.6, cap[1] - dir[1] * 2.6 + 0.28];
  const jbEnd: Vec = [jbStart[0] + dir[0] * 6.5, jbStart[1] + dir[1] * 6.5];
  spar(spars, jbStart, jbEnd, 0.26, 0.16);
  // Spanker gaff and boom on the mizzen, eased off toward us.
  const throat = mizzen.lowerAt(10);
  const ease = Math.cos(deg(25));
  const peak: Vec = [
    throat[0] - Math.cos(deg(36)) * 7.4 * ease,
    throat[1] + Math.sin(deg(36)) * 7.4,
  ];
  spar(spars, throat, peak, 0.22, 0.14);
  const boomHeel = mizzen.lowerAt(3.4);
  const boomEnd: Vec = [boomHeel[0] - 9.6 * ease, boomHeel[1] + 0.5];
  spar(spars, boomHeel, boomEnd, 0.26, 0.18);

  // Standing rigging.
  for (const m of [mizzen, main, fore]) {
    const s = m.shape;
    shrouds(rig, hull, m, (s.top ?? 0) - 0.3, [-1.7, -1, -0.3]);
    const top = m.lowerAt(s.top ?? 0);
    const tw = s.topWidth ?? 2;
    const tmHead = m.topmastAt((s.topmastHead ?? 0) - 0.4);
    rig.segment([top[0] - tw * 0.3, top[1]], tmHead);
    rig.segment([top[0] + tw * 0.5, top[1]], tmHead);
    // A backstay from the topmast head to the side, well aft.
    const bx = s.x - 4.2;
    rig.segment(m.topmastAt(s.topmastHead ?? 0), [bx, railAt(hull, bx)]);
  }
  rig.segment(fore.lowerAt(14.2), [heel[0] + dir[0] * 3, heel[1] + dir[1] * 3]);
  rig.segment(fore.topmastAt(21), cap);
  rig.segment(fore.poleAt(23.8), jbEnd);
  rig.segment(main.lowerAt(15.4), fore.lowerAt(2.6));
  rig.segment(main.topmastAt(22.8), fore.lowerAt(13.2));
  rig.segment(main.poleAt(27), fore.topmastAt(21));
  rig.segment(mizzen.lowerAt(11.4), main.lowerAt(4));
  rig.segment(mizzen.topmastAt(16.4), main.lowerAt(14.3));

  if (sail) {
    // Easy sail: topsails, the fore course, the jib and the spanker.
    for (const m of [fore, main]) {
      const [course, topsail] = m.yards;
      const ht = halfYard(m, 1);
      const hc = halfYard(m, 0);
      squareSail(
        sails,
        [topsail[0] - ht, topsail[1]],
        [topsail[0] + ht, topsail[1]],
        [course[0] - hc * 0.96, course[1] + 0.2],
        [course[0] + hc * 0.96, course[1] + 0.2],
        0.1,
      );
    }
    const [course] = fore.yards;
    const hc = halfYard(fore, 0);
    squareSail(
      sails,
      [course[0] - hc, course[1]],
      [course[0] + hc, course[1]],
      [course[0] - hc * 0.94, 4.4],
      [course[0] + hc * 0.94, 4.6],
      0.12,
    );
    const jibStay = fore.poleAt(23.8);
    foreAndAft(
      sails,
      [lerp(jbEnd, jibStay, 0.06), lerp(jbEnd, jibStay, 0.72), [35.4, 5]],
      1,
      0.05,
    );
    foreAndAft(sails, [mizzen.lowerAt(4), throat, peak, boomEnd], 2, 0.04);
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

/** Brig-rigged: two square-rigged masts and a gaff mainsail. */
function chaloupe(sail: boolean): CraftSilhouette {
  const hull: HullShape = {
    length: 24.6,
    rail: [2.0, 1.55, 2.05],
    lowX: 11,
    sternRake: 0.8,
    stemRake: 0.8,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const main = mast(spars, {
    x: 10,
    rake: 3,
    deck: 0.95,
    top: 10.8,
    head: 12,
    topmastHead: 17,
    truck: 20.4,
    d: [0.46, 0.28, 0.16],
    topWidth: 2.4,
    yards: [
      [10.4, 12.4],
      [15.8, 8.9],
      [19.4, 5.6],
    ],
  });
  const fore = mast(spars, {
    x: 18.2,
    rake: 1.5,
    deck: 0.95,
    top: 10.2,
    head: 11.4,
    topmastHead: 16.2,
    truck: 19.4,
    d: [0.44, 0.27, 0.15],
    topWidth: 2.3,
    yards: [
      [9.8, 12],
      [15, 8.6],
      [18.4, 5.4],
    ],
  });
  const heel: Vec = [23.8, 1.8];
  const dir: Vec = [Math.cos(deg(26)), Math.sin(deg(26))];
  const cap: Vec = [heel[0] + dir[0] * 7.2, heel[1] + dir[1] * 7.2];
  spar(spars, [heel[0] - dir[0] * 1.2, heel[1] - dir[1] * 1.2], cap, 0.4, 0.28);
  const jbStart: Vec = [cap[0] - dir[0] * 2.2, cap[1] - dir[1] * 2.2 + 0.22];
  const jbEnd: Vec = [jbStart[0] + dir[0] * 5.6, jbStart[1] + dir[1] * 5.6];
  spar(spars, jbStart, jbEnd, 0.2, 0.12);
  // The gaff mainsail's spars, the boom reaching past the stern.
  const throat = main.lowerAt(10.2);
  const ease = Math.cos(deg(20));
  const peak: Vec = [
    throat[0] - Math.cos(deg(34)) * 6.6 * ease,
    throat[1] + Math.sin(deg(34)) * 6.6,
  ];
  spar(spars, throat, peak, 0.2, 0.13);
  const boomHeel = main.lowerAt(2.7);
  const boomEnd: Vec = [boomHeel[0] - 11.4 * ease, boomHeel[1] + 0.4];
  spar(spars, boomHeel, boomEnd, 0.24, 0.16);

  for (const m of [main, fore]) {
    const s = m.shape;
    shrouds(rig, hull, m, (s.top ?? 0) - 0.3, [-1.3, -0.7, -0.1]);
    const top = m.lowerAt(s.top ?? 0);
    const tw = s.topWidth ?? 2;
    const tmHead = m.topmastAt((s.topmastHead ?? 0) - 0.4);
    rig.segment([top[0] - tw * 0.3, top[1]], tmHead);
    rig.segment([top[0] + tw * 0.5, top[1]], tmHead);
    const bx = s.x - 3.4;
    rig.segment(m.topmastAt(s.topmastHead ?? 0), [bx, railAt(hull, bx)]);
  }
  rig.segment(fore.lowerAt(11.2), [
    heel[0] + dir[0] * 2.5,
    heel[1] + dir[1] * 2.5,
  ]);
  rig.segment(fore.topmastAt(16), cap);
  rig.segment(fore.poleAt(18.9), jbEnd);
  rig.segment(main.lowerAt(11.8), fore.lowerAt(2.2));
  rig.segment(main.topmastAt(16.8), fore.lowerAt(10.2));
  rig.segment(main.poleAt(20), fore.topmastAt(16));

  if (sail) {
    // The fore course and both topsails, the gaff mainsail, two headsails.
    for (const m of [fore, main]) {
      const [course, topsail] = m.yards;
      const ht = halfYard(m, 1);
      const hc = halfYard(m, 0);
      squareSail(
        sails,
        [topsail[0] - ht, topsail[1]],
        [topsail[0] + ht, topsail[1]],
        [course[0] - hc * 0.96, course[1] + 0.2],
        [course[0] + hc * 0.96, course[1] + 0.2],
        0.1,
      );
    }
    const [course] = fore.yards;
    const hc = halfYard(fore, 0);
    squareSail(
      sails,
      [course[0] - hc, course[1]],
      [course[0] + hc, course[1]],
      [course[0] - hc * 0.94, 3.2],
      [course[0] + hc * 0.94, 3.4],
      0.12,
    );
    foreAndAft(sails, [main.lowerAt(3), throat, peak, boomEnd], 2, 0.04);
    const jibStay = fore.poleAt(18.9);
    foreAndAft(
      sails,
      [lerp(jbEnd, jibStay, 0.06), lerp(jbEnd, jibStay, 0.7), [25, 3.8]],
      1,
      0.05,
    );
    const stay = fore.topmastAt(16);
    foreAndAft(
      sails,
      [lerp(cap, stay, 0.05), lerp(cap, stay, 0.62), [20.2, 3.6]],
      1,
      0.05,
    );
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

interface LugSail {
  /** Where the yard is slung on the mast (a third of it forward of the mast). */
  sling: Vec;
  /** The yard's length and its rise toward the peak, degrees. */
  length: number;
  angle: number;
  tack: Vec;
  clew: Vec;
}

/** A dipping lug under its yard, the yard slung across the mast. */
function lugSail(
  spars: PathBuilder,
  sails: PathBuilder,
  s: LugSail,
  d: number,
): void {
  const c = Math.cos(deg(s.angle));
  const r = Math.sin(deg(s.angle));
  const [x, y] = s.sling;
  const throat: Vec = [x + c * s.length * 0.33, y - r * s.length * 0.33];
  const peak: Vec = [x - c * s.length * 0.67, y + r * s.length * 0.67];
  spar(spars, throat, peak, d, d * 0.6);
  foreAndAft(sails, [s.tack, throat, peak, s.clew], 2, 0.05);
}

/** Lug-rigged on three masts: the bateau canonnier. */
function bateau(sail: boolean): CraftSilhouette {
  const hull: HullShape = {
    length: 18.8,
    rail: [1.5, 1.25, 1.6],
    lowX: 9,
    sternRake: 0.5,
    stemRake: 0.7,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const fore = mast(spars, {
    x: 16.4,
    rake: -3,
    deck: 0.8,
    truck: 11.6,
    d: [0.32, 0, 0],
  });
  const main = mast(spars, {
    x: 9.2,
    rake: 5,
    deck: 0.8,
    truck: 13,
    d: [0.34, 0, 0],
  });
  const mizzen = mast(spars, {
    x: 0.6,
    rake: 8,
    deck: 0.8,
    truck: 7.4,
    d: [0.2, 0, 0],
  });
  // A running bowsprit, and the bumkin over the stern for the mizzen sheet.
  spar(spars, [16.2, 1.45], [22, 1.95], 0.24, 0.16);
  spar(spars, [1, 1.35], [-3.4, 1.05], 0.16, 0.12);

  rig.segment(fore.lowerAt(11.2), [21.6, 1.9]);
  rig.segment(main.lowerAt(12.6), fore.lowerAt(10.8));
  rig.segment(mizzen.lowerAt(7.1), main.lowerAt(1.6));
  shrouds(rig, hull, fore, 10.9, [-0.9, -0.2]);
  shrouds(rig, hull, main, 12.3, [-1.2, -0.4]);
  shrouds(rig, hull, mizzen, 6.9, [0.5]);

  if (sail) {
    const lugs: [MastLayout, LugSail, number][] = [
      [
        fore,
        {
          sling: [0, 8.8],
          length: 7.6,
          angle: 32,
          tack: [19.2, 1.7],
          clew: [11.2, 2],
        },
        0.18,
      ],
      [
        main,
        {
          sling: [0, 10],
          length: 8.6,
          angle: 30,
          tack: [10.6, 1.45],
          clew: [2.4, 1.8],
        },
        0.2,
      ],
      [
        mizzen,
        {
          sling: [0, 6],
          length: 4.6,
          angle: 28,
          tack: [1, 1.55],
          clew: [-3.3, 1.1],
        },
        0.13,
      ],
    ];
    for (const [m, lug, d] of lugs) {
      lugSail(spars, sails, { ...lug, sling: m.lowerAt(lug.sling[1]) }, d);
    }
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

/** An open boat, lug-rigged on two masts: the péniche. */
function peniche(sail: boolean): CraftSilhouette {
  const hull: HullShape = {
    length: 19,
    rail: [1.05, 0.8, 1.15],
    lowX: 9.5,
    sternRake: 0.45,
    stemRake: 0.55,
    pointed: true,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const fore = mast(spars, {
    x: 14.6,
    rake: -2,
    deck: 0.3,
    truck: 8.6,
    d: [0.22, 0, 0],
  });
  const main = mast(spars, {
    x: 7.6,
    rake: 4,
    deck: 0.3,
    truck: 9.6,
    d: [0.24, 0, 0],
  });

  rig.segment(fore.lowerAt(8.3), [19.4, 1.1]);
  rig.segment(main.lowerAt(9.3), fore.lowerAt(8));
  shrouds(rig, hull, fore, 8.1, [-0.5]);
  shrouds(rig, hull, main, 9.1, [-0.7]);

  if (sail) {
    lugSail(
      spars,
      sails,
      {
        sling: fore.lowerAt(7),
        length: 6,
        angle: 30,
        tack: [18.4, 1.1],
        clew: [10.4, 1.2],
      },
      0.14,
    );
    lugSail(
      spars,
      sails,
      {
        sling: main.lowerAt(7.8),
        length: 7,
        angle: 30,
        tack: [9, 0.95],
        clew: [1, 1.2],
      },
      0.15,
    );
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

/**
 * A drawing made larger about its waterline's sternpost: path data written
 * with absolute M, L, Q and C commands (and Z), so every number is a
 * coordinate in metres.
 */
function scaled(c: CraftSilhouette, k: number): CraftSilhouette {
  const by = (d: string) =>
    d.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, (v) =>
      String(Math.round(Number(v) * k * 1000) / 1000),
    );
  return {
    hull: by(c.hull),
    spars: by(c.spars),
    sails: by(c.sails),
    rigging: by(c.rigging),
    length: c.length * k,
  };
}

/**
 * A naval brig of 16 to 18 guns, as the French Argus and Furet and the
 * brig Observateur left at Cádiz: the gun-brig's rig (two square-rigged
 * masts, a gaff mainsail) on a hull of about 29.5 m, its masts in
 * proportion (the main truck about 24.5 m over the water).
 */
function brig(sail: boolean): CraftSilhouette {
  return scaled(chaloupe(sail), 1.2);
}

/** A gaff from a mast, peaked up, eased off toward us. */
function gaffFrom(
  spars: PathBuilder,
  m: MastLayout,
  at: number,
  length: number,
  angle: number,
  ease: number,
): readonly [Vec, Vec] {
  const throat = m.lowerAt(at);
  const peak: Vec = [
    throat[0] - Math.cos(deg(angle)) * length * ease,
    throat[1] + Math.sin(deg(angle)) * length,
  ];
  spar(spars, throat, peak, 0.18, 0.12);
  return [throat, peak];
}

/**
 * A topsail schooner, as the Pickle: a Bermuda-built hull of about 22 m on
 * deck, two masts raking well aft with gaff sails on both, the foremast's
 * topmast crossing a square topsail over a square foresail's yard, a long
 * bowsprit and jib-boom; the mainsail's boom reaching past the stern.
 */
function schooner(sail: boolean): CraftSilhouette {
  const hull: HullShape = {
    length: 22.3,
    rail: [1.9, 1.45, 2.0],
    lowX: 10,
    sternRake: 0.7,
    stemRake: 0.9,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const main = mast(spars, {
    x: 8.6,
    rake: 8,
    deck: 0.9,
    top: 14.6,
    head: 15.3,
    topmastHead: 20.4,
    truck: 21.6,
    d: [0.42, 0.24, 0.12],
    topWidth: 1.1,
  });
  const fore = mast(spars, {
    x: 16.4,
    rake: 6,
    deck: 0.9,
    top: 13.7,
    head: 14.4,
    topmastHead: 19.2,
    truck: 20.4,
    d: [0.4, 0.23, 0.12],
    topWidth: 1.2,
    yards: [
      [12.9, 10.6],
      [17.4, 7.6],
    ],
  });
  const heel: Vec = [21.6, 1.75];
  const dir: Vec = [Math.cos(deg(13)), Math.sin(deg(13))];
  const cap: Vec = [heel[0] + dir[0] * 7.4, heel[1] + dir[1] * 7.4];
  spar(
    spars,
    [heel[0] - dir[0] * 1.2, heel[1] - dir[1] * 1.2],
    cap,
    0.36,
    0.26,
  );
  const jbStart: Vec = [cap[0] - dir[0] * 2, cap[1] - dir[1] * 2 + 0.2];
  const jbEnd: Vec = [jbStart[0] + dir[0] * 5.2, jbStart[1] + dir[1] * 5.2];
  spar(spars, jbStart, jbEnd, 0.18, 0.11);
  // The gaffs, peaked up, and the main boom past the stern.
  const ease = Math.cos(deg(22));
  const [mThroat, mPeak] = gaffFrom(spars, main, 14.2, 7.4, 30, ease);
  const [fThroat, fPeak] = gaffFrom(spars, fore, 13.2, 5.8, 28, ease);
  const boomHeel = main.lowerAt(2.6);
  const boomEnd: Vec = [boomHeel[0] - 12.4 * ease, boomHeel[1] + 0.5];
  spar(spars, boomHeel, boomEnd, 0.22, 0.15);

  for (const m of [main, fore]) {
    const s = m.shape;
    shrouds(rig, hull, m, (s.head ?? 0) - 0.4, [-1.1, -0.4]);
    const bx = s.x - 4.2;
    rig.segment(m.topmastAt(s.topmastHead ?? 0), [bx, railAt(hull, bx)]);
  }
  const stayFoot: Vec = [heel[0] + dir[0] * 2, heel[1] + dir[1] * 2];
  rig.segment(fore.lowerAt(14.2), stayFoot);
  rig.segment(fore.topmastAt(19), jbEnd);
  rig.segment(main.lowerAt(15), fore.lowerAt(13.9));
  rig.segment(main.topmastAt(20.2), fore.topmastAt(19));

  if (sail) {
    // Easy sail: the fore topsail, both gaff sails, the jib and staysail.
    const [foreYard, topsailYard] = fore.yards;
    const ht = halfYard(fore, 1);
    const hf = halfYard(fore, 0);
    squareSail(
      sails,
      [topsailYard[0] - ht, topsailYard[1]],
      [topsailYard[0] + ht, topsailYard[1]],
      [foreYard[0] - hf * 0.96, foreYard[1] + 0.2],
      [foreYard[0] + hf * 0.96, foreYard[1] + 0.2],
      0.1,
    );
    foreAndAft(sails, [main.lowerAt(2.9), mThroat, mPeak, boomEnd], 2, 0.04);
    // The foresail loose-footed, its clew near the mainmast.
    foreAndAft(
      sails,
      [fore.lowerAt(1.9), fThroat, fPeak, [main.shape.x + 1.6, 2.4]],
      2,
      0.04,
    );
    const stay = fore.topmastAt(19);
    foreAndAft(
      sails,
      [lerp(jbEnd, stay, 0.06), lerp(jbEnd, stay, 0.7), [22.8, 2.9]],
      1,
      0.05,
    );
    const foreStay = fore.lowerAt(14.2);
    foreAndAft(
      sails,
      [
        lerp(stayFoot, foreStay, 0.05),
        lerp(stayFoot, foreStay, 0.66),
        [18.4, 2.4],
      ],
      1,
      0.05,
    );
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

/**
 * A naval cutter, as the Entreprenante: a hull of about 21 m with one tall
 * mast stepped well forward, the gaff mainsail on a boom reaching far past
 * the stern, a square topsail on the topmast over a square-sail yard, and a
 * long running bowsprit nearly level, for the jib.
 */
function cutter(sail: boolean): CraftSilhouette {
  const hull: HullShape = {
    length: 20.6,
    rail: [1.8, 1.4, 1.95],
    lowX: 9,
    sternRake: 0.8,
    stemRake: 0.7,
  };
  const spars = path();
  const sails = path();
  const rig = path();
  const m = mast(spars, {
    x: 12,
    rake: 3,
    deck: 0.9,
    top: 15.8,
    head: 16.8,
    topmastHead: 23.6,
    truck: 25,
    d: [0.56, 0.3, 0.14],
    topWidth: 1.6,
    yards: [
      [15.2, 13.2],
      [21.4, 8.8],
    ],
  });
  // The running bowsprit, nearly level, run out far beyond the stem.
  const heel: Vec = [18.6, 1.65];
  const end: Vec = [heel[0] + 13.2, heel[1] + 0.9];
  spar(spars, heel, end, 0.38, 0.22);
  // The gaff and the long boom.
  const ease = Math.cos(deg(20));
  const [throat, peak] = gaffFrom(spars, m, 14.6, 10.2, 32, ease);
  const boomHeel = m.lowerAt(2.5);
  const boomEnd: Vec = [boomHeel[0] - 17.6 * ease, boomHeel[1] + 0.7];
  spar(spars, boomHeel, boomEnd, 0.28, 0.18);

  const stemHead: Vec = [20.9, 1.95];
  shrouds(rig, hull, m, 16.4, [-1.4, -0.7, 0]);
  const bx = m.shape.x - 5.2;
  rig.segment(m.topmastAt(23.4), [bx, railAt(hull, bx)]);
  rig.segment(m.lowerAt(16.2), stemHead);
  rig.segment(m.topmastAt(23.2), end);

  if (sail) {
    // Easy sail: the topsail, the mainsail, the foresail and the jib.
    const [yardLow, yardTop] = m.yards;
    const ht = halfYard(m, 1);
    const hl = halfYard(m, 0);
    squareSail(
      sails,
      [yardTop[0] - ht, yardTop[1]],
      [yardTop[0] + ht, yardTop[1]],
      [yardLow[0] - hl * 0.96, yardLow[1] + 0.2],
      [yardLow[0] + hl * 0.96, yardLow[1] + 0.2],
      0.1,
    );
    foreAndAft(sails, [m.lowerAt(2.8), throat, peak, boomEnd], 2, 0.04);
    const stay = m.lowerAt(16.2);
    foreAndAft(
      sails,
      [lerp(stemHead, stay, 0.05), lerp(stemHead, stay, 0.7), [14.4, 2.3]],
      1,
      0.05,
    );
    const jibStay = m.topmastAt(23.2);
    foreAndAft(
      sails,
      [lerp(end, jibStay, 0.04), lerp(end, jibStay, 0.62), [21.6, 2.4]],
      1,
      0.05,
    );
  }

  return {
    hull: hullOutline(hull),
    spars: spars.toString(),
    sails: sails.toString(),
    rigging: rig.toString(),
    length: hull.length,
  };
}

const BUILDERS: Record<CraftKind, (sail: boolean) => CraftSilhouette> = {
  prame,
  chaloupe,
  bateau,
  peniche,
  brig,
  schooner,
  cutter,
};

/** A craft at anchor (bare masts) or under easy sail. */
export function buildCraft(
  kind: CraftKind,
  underSail: boolean,
): CraftSilhouette {
  return BUILDERS[kind](underSail);
}
