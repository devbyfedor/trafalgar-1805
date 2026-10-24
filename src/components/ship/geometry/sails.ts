import { forkRng, type Rng } from "@/lib/random";
import type { HeadsailSpec, ShipSpec, YardId } from "../types";
import type { HullGeometry } from "./hull";
import { type PathBuilder, path } from "./path";
import type { RigLayout } from "./rig";
import { lerp, type Vec } from "./vec";

/**
 * Sails, cut as the Royal Navy cut them in 1805 (Steel 1794; Victory's own
 * surviving 1803 fore topsail): cloths 24 in wide sewn with 1½ in seams,
 * running vertically, the leeches gored across the outer cloths; four reef
 * bands on the topsails and one on the courses, each with a middle band;
 * topsail, topgallant and royal feet cut straight, course and mizzen
 * topsail feet hollow; leech linings and buntline cloths on the fore side.
 *
 * A square sail is a parametric surface S(u, v): u runs aft to fore (left to
 * right), v from the head (yard) to the foot. We see the sails' forward
 * faces, filled toward the bow: the leeches bow to the right and the belly is
 * deepest low down. Every mark on the sail derives from the same surface.
 */

export interface SailArt {
  id: string;
  outline: string;
  lit: string;
  seams: string;
  reefs: string;
  reefPoints: string;
  linings: string;
  weather: string;
  shadow: string;
  boltRope: string;
  buntlines: string;
  /** Strip along the sunward edge, for the warm light layer. */
  warm: string;
}

export interface SailsGeometry {
  square: SailArt[];
  foreAndAft: SailArt[];
  /** Headsail luff ends on the stays, for the rigging. */
  stays: { from: Vec; to: Vec; heavy: boolean }[];
}

type Surface = (u: number, v: number) => Vec;

/** Seam spacing: a 24 in cloth less a 1½ in seam. */
const CLOTH = 0.57;

/** Catmull-Rom through points, appended to a builder (moveTo if `start`). */
function smoothThrough(
  b: PathBuilder,
  pts: readonly Vec[],
  start: boolean,
): void {
  if (start) b.moveTo(pts[0]);
  else b.lineTo(pts[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    b.cubicTo(
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    );
  }
}

const samples = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

/** Region of the surface between u0(v) and u1(v), from v0 to v1. */
function band(
  s: Surface,
  u0: (v: number) => number,
  u1: (v: number) => number,
  v0 = 0,
  v1 = 1,
): string {
  const vs = samples(12).map((t) => v0 + (v1 - v0) * t);
  const left = vs.map((v) => s(u0(v), v));
  const right = vs.map((v) => s(u1(v), v)).reverse();
  const b = path();
  smoothThrough(b, left, true);
  smoothThrough(b, right, false);
  return b.close().toString();
}

/** Region between two v levels, full width. */
function strip(s: Surface, v0: number, v1: number): string {
  const us = samples(10);
  const top = us.map((u) => s(u, v0));
  const bottom = us.map((u) => s(u, v1)).reverse();
  const b = path();
  smoothThrough(b, top, true);
  smoothThrough(b, bottom, false);
  return b.close().toString();
}

function outlineOf(s: Surface): string {
  const vs = samples(12);
  const us = samples(12);
  const b = path();
  smoothThrough(
    b,
    vs.map((v) => s(0, v)),
    true,
  );
  smoothThrough(
    b,
    us.map((u) => s(u, 1)),
    false,
  );
  smoothThrough(
    b,
    [...vs].reverse().map((v) => s(1, v)),
    false,
  );
  smoothThrough(
    b,
    [...us].reverse().map((u) => s(u, 0)),
    false,
  );
  return b.close().toString();
}

interface SquareSailInput {
  id: string;
  hl: Vec;
  hr: Vec;
  fl: Vec;
  fr: Vec;
  /** Belly toward the bow, as a fraction of the sail's depth. */
  belly: number;
  /** Hollow foot: rise of the foot's middle above the clews, metres. */
  hollow: number;
  reefBands: number;
  reefStep: number;
  middleBand: boolean;
  buntlineCloths: number;
  /** Seam spacing in the drawing (cloth width × brace foreshortening). */
  seam: number;
  rng: Rng;
}

function squareSail(input: SquareSailInput): SailArt {
  const { hl, hr, fl, fr, belly, hollow } = input;
  const height = (hl[1] + hr[1]) / 2 - (fl[1] + fr[1]) / 2;
  // Belly deepest low down (the "bag" above the foot), and a little at the
  // foot itself between the clews.
  const surface: Surface = (u, v) => {
    const top = lerp(hl, hr, u);
    const bottom = lerp(fl, fr, u);
    const [x, y] = lerp(top, bottom, v);
    const across = 0.62 + 0.38 * Math.sin(Math.PI * u);
    const bag =
      Math.sin(Math.PI * v ** 0.8) + 0.25 * v ** 4 * Math.sin(Math.PI * u);
    const lift = hollow * v ** 6 * Math.sin(Math.PI * u);
    return [x + belly * height * bag * across, y + lift];
  };

  const outline = outlineOf(surface);
  // Lit: the part of the forward face turned toward the low sun ahead.
  const lit = band(
    surface,
    (v) => 0.44 - 0.1 * Math.sin(Math.PI * v),
    () => 1,
  );

  // Seams run vertically; the leeches are gored across the outer cloths, so
  // seams start or stop where a leech crosses them.
  const left = (v: number) => hl[0] + (fl[0] - hl[0]) * v;
  const right = (v: number) => hr[0] + (fr[0] - hr[0]) * v;
  const centre = (hl[0] + hr[0] + fl[0] + fr[0]) / 4;
  const span = Math.max(hr[0], fr[0]) - Math.min(hl[0], fl[0]);
  const seams = path();
  const half = Math.ceil(span / input.seam / 2) + 1;
  const vs = samples(10);
  for (let j = -half; j <= half; j++) {
    const X = centre + j * input.seam;
    const pts: Vec[] = [];
    for (const v of vs) {
      const u = (X - left(v)) / (right(v) - left(v));
      if (u >= 0 && u <= 1) pts.push(surface(u, v));
    }
    if (pts.length >= 2) smoothThrough(seams, pts, true);
  }

  // Reef bands: thin strips across the sail, with two points per cloth.
  const reefs = path();
  const reefPoints = path();
  let lowest = 0;
  const bandAt = (v: number, thickness: number) => {
    const t = thickness / Math.max(1, height);
    reefs.appendData(strip(surface, v - t / 2, v + t / 2));
  };
  for (let r = 1; r <= input.reefBands; r++) {
    const v = r * input.reefStep;
    if (v >= 0.92) break;
    lowest = v;
    bandAt(v, 0.16);
    const wv = right(v) - left(v);
    const count = Math.max(2, Math.round((wv / input.seam) * 2));
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const [x, y] = surface(u, v);
      reefPoints.moveTo([x, y - 0.04]).lineTo([x + 0.02, y - 0.58]);
    }
  }
  const linings = path();
  if (input.middleBand) {
    const mid = (Math.max(lowest, input.reefStep) + 1) / 2;
    const t = 0.55 / Math.max(1, height);
    linings.appendData(strip(surface, mid - t / 2, mid + t / 2));
  }
  // Leech linings, a cloth wide, and buntline cloths up from the foot.
  const lw = (v: number) =>
    (CLOTH * (0.5 + v)) / Math.max(1, right(v) - left(v));
  linings.appendData(band(surface, () => 0, lw));
  linings.appendData(
    band(
      surface,
      (v) => 1 - lw(v),
      () => 1,
    ),
  );
  const buntlines = path();
  const bc = input.buntlineCloths;
  for (let i = 0; i < bc; i++) {
    const u = (i + 1) / (bc + 1);
    const w = CLOTH / Math.max(1, right(0.8) - left(0.8)) / 2;
    linings.appendData(
      band(
        surface,
        () => u - w,
        () => u + w,
        0.45,
        1,
      ),
    );
    smoothThrough(
      buntlines,
      vs.map((v) => surface(u, v)),
      true,
    );
  }

  // Weathering: a few cloths a shade off, seeded.
  const weatherParts: string[] = [];
  const patches = 2 + Math.floor(input.rng() * 3);
  for (let k = 0; k < patches; k++) {
    const u0 = input.rng() * 0.85;
    const u1 = Math.min(1, u0 + 0.04 + input.rng() * 0.06);
    const v0 = input.rng() * 0.3;
    const v1 = 0.65 + input.rng() * 0.35;
    weatherParts.push(
      band(
        surface,
        () => u0,
        () => u1,
        v0,
        v1,
      ),
    );
  }

  // The yard's shadow on the head of the sail.
  const shadow = strip(surface, 0, Math.min(0.06, 0.5 / Math.max(1, height)));

  const boltRope = path();
  smoothThrough(
    boltRope,
    vs.map((v) => surface(0, v)),
    true,
  );
  smoothThrough(
    boltRope,
    samples(10).map((u) => surface(u, 1)),
    false,
  );
  smoothThrough(
    boltRope,
    [...vs].reverse().map((v) => surface(1, v)),
    false,
  );

  const warm = band(
    surface,
    (v) => 0.8 - 0.05 * Math.sin(Math.PI * v),
    () => 1,
  );

  return {
    id: input.id,
    outline,
    lit,
    seams: seams.toString(),
    reefs: reefs.toString(),
    reefPoints: reefPoints.toString(),
    linings: linings.toString(),
    weather: weatherParts.join(""),
    shadow,
    boltRope: boltRope.toString(),
    buntlines: buntlines.toString(),
    warm,
  };
}

interface FlatSailInput {
  id: string;
  /** Corners: luff top (head/throat), luff bottom (tack), clew, peak/head end. */
  corners: [Vec, Vec, Vec, Vec];
  /** Curve of the leech, metres to the left (aft). */
  leechBelly: number;
  /** Curve of the foot, metres downward. */
  footBelly: number;
  seam: number;
  rng: Rng;
}

/**
 * A fore-and-aft sail (spanker or headsail) over its four corners: u from
 * the luff (0) to the leech (1), v from the head (0) to the foot (1).
 * Triangular headsails pass the head twice (corner 0 = corner 3). Cloths run
 * parallel to the leech.
 */
function flatSail(input: FlatSailInput): SailArt {
  const [a, b, c, d] = input.corners;
  const surface: Surface = (u, v) => {
    const top = lerp(a, d, u);
    const bottom = lerp(b, c, u);
    const [x, y] = lerp(top, bottom, v);
    const leech = input.leechBelly * Math.sin(Math.PI * v) * u ** 2;
    const foot = input.footBelly * Math.sin(Math.PI * u) * v ** 3;
    return [x - leech, y - foot];
  };
  const outline = outlineOf(surface);
  const lit = band(
    surface,
    () => 0,
    (v) => 0.5 + 0.08 * Math.sin(Math.PI * v),
  );
  const length = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const cloths = Math.max(3, Math.round(length / input.seam));
  const seams = path();
  const vs = samples(8);
  for (let i = 1; i < cloths; i++) {
    const u = i / cloths;
    smoothThrough(
      seams,
      vs.map((v) => surface(u, v)),
      true,
    );
  }
  const boltRope = path();
  smoothThrough(
    boltRope,
    vs.map((v) => surface(0, v)),
    true,
  );
  smoothThrough(
    boltRope,
    samples(10).map((u) => surface(u, 1)),
    false,
  );
  smoothThrough(
    boltRope,
    [...vs].reverse().map((v) => surface(1, v)),
    false,
  );
  const warm = band(
    surface,
    () => 0,
    (v) => 0.2 + 0.04 * Math.sin(Math.PI * v),
  );
  const patch = Math.floor(input.rng() * cloths);
  const weather = band(
    surface,
    () => patch / cloths,
    () => Math.min(1, (patch + 1) / cloths),
    0.1,
    0.9,
  );
  // Leech lining.
  const linings = band(
    surface,
    (v) => 1 - (CLOTH / Math.max(1, length)) * (1 + v),
    () => 1,
  );
  return {
    id: input.id,
    outline,
    lit,
    seams: seams.toString(),
    reefs: "",
    reefPoints: "",
    linings,
    weather,
    shadow: "",
    boltRope: boltRope.toString(),
    buntlines: "",
    warm,
  };
}

/** Yardarm margins: how far in from each end the sail's corners sit. */
const YARDARM: Partial<Record<YardId, number>> = {
  course: 0.065,
  crossjack: 0.05,
  topsail: 0.08,
  mizzenTopsail: 0.08,
};
const yardarm = (id: YardId) => YARDARM[id] ?? 0.07;

export function buildSails(
  spec: ShipSpec,
  rig: RigLayout,
  hull: HullGeometry,
): SailsGeometry {
  const rng = forkRng(spec.seed, "sails");
  const f = spec.rig.braceForeshortening;
  const square: SailArt[] = [];
  const foreAndAft: SailArt[] = [];
  const stays: SailsGeometry["stays"] = [];

  // Square sails, mizzen first, so where they overlap the nearer yardarms
  // of the main and fore come in front.
  for (const mastId of ["mizzen", "main", "fore"] as const) {
    const mast = rig.masts.get(mastId);
    if (!mast) continue;
    const yards = mast.spec.yards;
    for (let i = 0; i < yards.length; i++) {
      const yard = yards[i];
      const sail = yard.sail;
      if (!sail?.set) continue;
      const head = mast.yards.get(yard.id);
      if (!head) continue;
      const hw = (yard.length * (1 - 2 * yardarm(yard.id)) * f) / 2;
      const hl: Vec = [head.centre[0] - hw, head.centre[1] + 0.1];
      const hr: Vec = [head.centre[0] + hw, head.centre[1] + 0.1];
      let fl: Vec;
      let fr: Vec;
      let belly = 0.055;
      const isCourse = yard.id === "course";
      if (isCourse) {
        // A course: hangs free above the rail, the foot a little wider than
        // the head (gored leeches), cut hollow.
        const railHere = Math.max(
          ...hull.railTop
            .filter(([x]) => x > hl[0] - 2 && x < hr[0] + 2)
            .map(([, y]) => y),
        );
        const footY = Math.max(
          railHere + 0.9,
          head.centre[1] - (sail.drop ?? 10),
        );
        const flare = 0.3 * f;
        fl = [hl[0] - flare, footY];
        fr = [hr[0] + flare, footY];
        belly = 0.075;
      } else {
        const below = yards[i - 1];
        const lower = below ? mast.yards.get(below.id) : undefined;
        if (!below || !lower) continue;
        const margin =
          below.id === "course" || below.id === "crossjack" ? 0.05 : 0.062;
        const fw = (below.length * (1 - 2 * margin) * f) / 2;
        fl = [lower.centre[0] - fw, lower.centre[1] + 0.16];
        fr = [lower.centre[0] + fw, lower.centre[1] + 0.16];
        // Topgallants and royals are flatter.
        belly =
          yard.id === "topsail" || yard.id === "mizzenTopsail" ? 0.06 : 0.045;
      }
      square.push(
        squareSail({
          id: `${mastId}-${yard.id}`,
          hl,
          hr,
          fl,
          fr,
          belly,
          hollow: sail.footRoach,
          reefBands: sail.reefBands,
          reefStep: sail.reefStep ?? (isCourse ? 1 / 6 : 1 / 8),
          middleBand: sail.middleBand ?? false,
          buntlineCloths: sail.buntlineCloths ?? 0,
          seam: CLOTH * f,
          rng,
        }),
      );
    }
  }

  // Spanker: throat and peak on the gaff, tack at the mast, clew on the boom.
  const sp = spec.rig.spanker;
  const mizzen = rig.masts.get("mizzen");
  if (sp.set && mizzen) {
    const throat = rig.gaff.throat;
    const peak = rig.gaff.peak;
    const tack = mizzen.lowerAt(sp.boomY + 0.5);
    const clew: Vec = [rig.boom.end[0] + 0.6, rig.boom.end[1] + 0.3];
    foreAndAft.push(
      flatSail({
        id: "spanker",
        corners: [
          [throat[0] - 0.3, throat[1] - 0.25],
          [tack[0] - 0.3, tack[1]],
          clew,
          [peak[0] + 0.4, peak[1] - 0.2],
        ],
        leechBelly: 0.8,
        footBelly: 0.45,
        seam: CLOTH * 1.05,
        rng,
      }),
    );
  }

  // Headsails on their stays, sheeted to starboard (toward the viewer).
  const fore = rig.masts.get("fore");
  if (fore) {
    const foreTopmastHead = fore.topmastAt(fore.spec.crosstreesY - 0.2);
    const foreTgHead = fore.topgallantAt(fore.spec.topgallantHeadY - 0.2);
    const bow = rig.bowsprit;
    const along = (t: number): Vec => [
      bow.heel[0] + bow.dir[0] * t,
      bow.heel[1] + bow.dir[1] * t,
    ];
    const jbAlong = (t: number): Vec =>
      lerp(rig.jibBoom.start, rig.jibBoom.end, t);
    const fjEnd = rig.flyingJibBoom?.end ?? rig.jibBoom.end;
    const stayDefs: Record<HeadsailSpec["id"], { from: Vec; to: Vec }> = {
      foreStaysail: {
        from: fore.lowerAt(fore.spec.topY - 0.6),
        to: along(spec.rig.bowsprit.length * 0.4),
      },
      foreTopmastStaysail: { from: foreTopmastHead, to: bow.cap },
      jib: { from: foreTopmastHead, to: jbAlong(0.86) },
      flyingJib: { from: foreTgHead, to: fjEnd },
    };
    // Outer sails first, so the inner ones (nearer the mast) overlap them.
    const order: HeadsailSpec["id"][] = [
      "flyingJib",
      "jib",
      "foreTopmastStaysail",
      "foreStaysail",
    ];
    const headsails = [...spec.rig.headsails].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );
    for (const hs of headsails) {
      const stay = stayDefs[hs.id];
      stays.push({
        ...stay,
        heavy: hs.id === "foreTopmastStaysail" || hs.id === "foreStaysail",
      });
      if (!hs.set) continue;
      const tack = lerp(stay.to, stay.from, 0.03);
      const head = lerp(stay.to, stay.from, hs.luffFraction);
      // The foot leaves the tack at a fixed angle from the luff (the sail's
      // tack angle), so the clew falls aft and low, sheeted to the bow.
      const lx = head[0] - tack[0];
      const ly = head[1] - tack[1];
      const luff = Math.hypot(lx, ly);
      const ang = (hs.tackAngleDeg * Math.PI) / 180;
      const fx = (lx * Math.cos(ang) - ly * Math.sin(ang)) / luff;
      const fy = (lx * Math.sin(ang) + ly * Math.cos(ang)) / luff;
      const footLen = luff * hs.footRatio;
      const clew: Vec = [tack[0] + fx * footLen, tack[1] + fy * footLen];
      foreAndAft.push(
        flatSail({
          id: hs.id,
          corners: [head, tack, clew, head],
          leechBelly: 0.55,
          footBelly: 0.4,
          seam: CLOTH * 1.05,
          rng,
        }),
      );
    }
  }

  return { square, foreAndAft, stays };
}
