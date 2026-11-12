import {
  Box3,
  Frustum,
  Matrix4,
  type PerspectiveCamera,
  Vector3,
  type Vector4,
} from "three";
import { SLICE_MS, Slicer } from "../engine/slice";

/**
 * Which detail tile the terrain field's one detail layer (B in GLSL_FIELD)
 * shows, and at what weight (uHasB: 0 the overview alone, 1 the tile in
 * full). The detail tiles lie far apart (the Gulf of Cádiz, the Channel),
 * so a view rarely shows two; the layer goes to the one the view needs and
 * changes hands without its ever showing.
 *
 * - A tile's claim is how much the view would gain from it: the share of
 *   the screen its rectangle covers, times the octaves of detail it adds
 *   over the overview that the screen can show at its nearest visible point
 *   (none while an overview cell spans less than a CSS pixel, all of them
 *   once one of its own does), times how clear the haze leaves that point.
 * - The bound tile shows in full, as the Cádiz tile always did, so the
 *   chart is the approved one wherever no change of tile is near.
 * - Its weight changes only at SLOT_RATE a step while any of it can reach
 *   the screen ("in sight", `SlotJudge.seen`: its rectangle, raised to its
 *   highest relief exaggerated, against a frustum a tenth wider than the
 *   view, short of the opaque haze), and the layer changes hands only where
 *   the tile it leaves is out of sight or at nothing. A tile bound out of
 *   sight comes into view in full; one bound in sight fades in.
 *
 * Along a flight (a CameraRig, by its p) the binding is chosen once for the
 * whole flight and kept as a table (`planAlong`, SlotPlan), so the layer is
 * a function of the scroll and reads the same scrolled down or back. It is
 * the binding of least cost: each step costs the claims of the tiles in
 * sight that are not bound (their detail lost), and each change of tile
 * SLOT_FADE_COST steps' worth of the claim of each tile it makes fade (the
 * one leaving if still in sight, the one coming if already in sight), so
 * the layer changes hands where both are out of sight or far off. The plan
 * does not depend on the canvas: a tile is out of sight only when it is
 * outside the view of the widest screen the site serves (SLOT_SEEN_ASPECT),
 * and the claims are judged at the owner's viewport. A free camera (no
 * flight) runs a greedy form of the rule frame by frame (SlotFollower).
 */

/**
 * A change of tile costs as much, for each tile it makes fade in sight, as
 * this many steps of that tile's claim lost (about a viewport height of
 * scene 2's scroll).
 */
export const SLOT_FADE_COST = 64;

/**
 * A free camera's bound tile, in sight, yields when its claim is under this
 * share of the leader's (a far sliver against a view the other fills).
 */
export const SLOT_YIELD = 0.1;

/**
 * Steps a fade spans while its tile is in sight: 0.008 of a flight's p,
 * about a quarter of a viewport height of scene 2's scroll; 16 frames for a
 * free camera. The weight changes by at most SLOT_RATE a step.
 */
export const SLOT_FADE_STEPS = 16;
export const SLOT_RATE = 1 / SLOT_FADE_STEPS;

/** A flight's plan has a step every SLOT_STEP_P of p and reads between them. */
export const SLOT_STEP_P = 0.0005;

/** How much wider, in tangent, the frustum a tile must leave is than the view. */
export const SLOT_SEEN_WIDEN = 1.1;

/** The widest screen a flight's plan allows for (3440 × 1440 is 2.39). */
export const SLOT_SEEN_ASPECT = 2.4;

/** The view at which a flight's plan judges claims: the owner's, in CSS px. */
export const SLOT_PLAN_VIEW = { aspect: 16 / 9, heightPx: 720 } as const;

/**
 * Past this many haze visibilities nothing of a tile shows: the terrain's
 * haze, 1 − exp(−x²), leaves 0.01 % (a thirtieth of a level of colour);
 * at the engine's 2.3 (99.5 %) a tile still moved a pixel by a level.
 */
const SLOT_HAZE_OPAQUE = 3;

/** Room for a rectangle clipped by a frustum's six planes, x and y pairs. */
const CLIP_CAPACITY = 2 * 12;

/**
 * Clips a convex polygon lying on the chart (x, y pairs, z = 0) to the
 * inner side of a plane (Sutherland–Hodgman), into `out`. Returns the new
 * vertex count, at most one more than before.
 */
function clipToPlane(
  src: Float64Array,
  count: number,
  nx: number,
  ny: number,
  c: number,
  out: Float64Array,
): number {
  let n = 0;
  for (let i = 0; i < count; i++) {
    const j = i + 1 === count ? 0 : i + 1;
    const ax = src[2 * i];
    const ay = src[2 * i + 1];
    const bx = src[2 * j];
    const by = src[2 * j + 1];
    const da = nx * ax + ny * ay + c;
    const db = nx * bx + ny * by + c;
    const inA = da >= 0;
    if (inA) {
      out[2 * n] = ax;
      out[2 * n + 1] = ay;
      n++;
    }
    if (inA !== db >= 0) {
      const t = da / (da - db);
      out[2 * n] = ax + (bx - ax) * t;
      out[2 * n + 1] = ay + (by - ay) * t;
      n++;
    }
  }
  return n;
}

/** Distance on the chart from a point to a convex polygon (x, y pairs), 0 inside. */
function polygonDistance(
  poly: Float64Array,
  count: number,
  x: number,
  y: number,
): number {
  let side = 0;
  let inside = true;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i++) {
    const j = i + 1 === count ? 0 : i + 1;
    const ax = poly[2 * i];
    const ay = poly[2 * i + 1];
    const ex = poly[2 * j] - ax;
    const ey = poly[2 * j + 1] - ay;
    const cross = ex * (y - ay) - ey * (x - ax);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (side === 0) side = s;
      else if (s !== side) inside = false;
    }
    const len2 = ex * ex + ey * ey;
    const t =
      len2 > 0
        ? Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / len2))
        : 0;
    const dx = ax + ex * t - x;
    const dy = ay + ey * t - y;
    best = Math.min(best, dx * dx + dy * dy);
  }
  return inside ? 0 : Math.sqrt(best);
}

/** A view of the chart as the slot reads it. */
export interface SlotView {
  /** Placed for the view, its matrices updated. */
  camera: PerspectiveCamera;
  /** The view's frustum. */
  frustum: Frustum;
  /** CSS pixels per radian of view, vertically. */
  pxPerRadian: number;
  /** The haze's visibility for the claims, km. */
  hazeKm: number;
  /** The clearest the haze can be at this altitude, km (for what is in sight). */
  clearHazeKm: number;
  /** The relief's vertical exaggeration. */
  exaggeration: number;
}

/** A detail tile as the slot knows it. */
export interface SlotTile {
  /** World rectangle: west, north, width, height (km). */
  rect: Vector4;
  /** Its cell, world km. */
  cellKm: number;
  /** Its highest land above the sea at true scale, world km (sec φ included). */
  reliefKm: number;
}

/**
 * Each tile's claim on the layer and whether it is in sight, for one view
 * (see the module's comment). Allocates nothing.
 */
export class SlotJudge {
  readonly claims: Float64Array;
  /** 1 where any of the tile's detail could reach the screen. */
  readonly seen: Uint8Array;
  /** The tile with the greatest claim, −1 when none has any. */
  leader = -1;
  private readonly clipA = new Float64Array(CLIP_CAPACITY);
  private readonly clipB = new Float64Array(CLIP_CAPACITY);
  private readonly ndc = new Vector3();
  private readonly box = new Box3();
  private readonly wideProjection = new Matrix4();
  private readonly wideViewProj = new Matrix4();
  private readonly wide = new Frustum();

  /** `overviewCellKm`: the overview's cell, the detail the chart has without the tiles. */
  constructor(
    readonly tiles: readonly SlotTile[],
    private readonly overviewCellKm: number,
  ) {
    this.claims = new Float64Array(tiles.length);
    this.seen = new Uint8Array(tiles.length);
  }

  /**
   * Judges a view; `seenAspect`, the widest screen to allow for when
   * deciding what is in sight (at least the view's own).
   */
  judge(view: SlotView, seenAspect: number): void {
    const camera = view.camera;
    // The view widened: by SLOT_SEEN_WIDEN, and to the widest screen.
    const top =
      camera.near * Math.tan((camera.fov * Math.PI) / 360) * SLOT_SEEN_WIDEN;
    const half = top * Math.max(camera.aspect, seenAspect);
    this.wideProjection.makePerspective(
      -half,
      half,
      top,
      -top,
      camera.near,
      camera.far,
    );
    this.wideViewProj.multiplyMatrices(
      this.wideProjection,
      camera.matrixWorldInverse,
    );
    this.wide.setFromProjectionMatrix(this.wideViewProj);
    const reach = SLOT_HAZE_OPAQUE * view.clearHazeKm;
    this.leader = -1;
    for (let k = 0; k < this.tiles.length; k++) {
      const { rect, reliefKm } = this.tiles[k];
      this.box.min.set(rect.x, rect.y - rect.w, 0);
      this.box.max.set(
        rect.x + rect.z,
        rect.y,
        reliefKm * view.exaggeration + 0.05,
      );
      this.seen[k] =
        this.wide.intersectsBox(this.box) &&
        this.box.distanceToPoint(camera.position) < reach
          ? 1
          : 0;
      const claim = this.seen[k] ? this.claim(this.tiles[k], view) : 0;
      this.claims[k] = claim;
      if (claim > 0 && (this.leader < 0 || claim > this.claims[this.leader]))
        this.leader = k;
    }
  }

  /**
   * How much the view would gain from a tile (see the module's comment).
   * Relief raised above the chart is not counted: at a screen's edge it
   * shows a few pixels more than the rectangle.
   */
  private claim(tile: SlotTile, view: SlotView): number {
    const r = tile.rect;
    const { camera, frustum } = view;
    let poly = this.clipA;
    let spare = this.clipB;
    poly[0] = r.x;
    poly[1] = r.y - r.w;
    poly[2] = r.x + r.z;
    poly[3] = r.y - r.w;
    poly[4] = r.x + r.z;
    poly[5] = r.y;
    poly[6] = r.x;
    poly[7] = r.y;
    let n = 4;
    const planes = frustum.planes;
    for (let k = 0; k < planes.length; k++) {
      const { normal, constant } = planes[k];
      n = clipToPlane(poly, n, normal.x, normal.y, constant, spare);
      if (n < 3) return 0;
      const swap = poly;
      poly = spare;
      spare = swap;
    }
    // Its area on screen: the shoelace over normalised device coordinates,
    // where the screen is 2 × 2.
    let twice = 0;
    let firstX = 0;
    let firstY = 0;
    let lastX = 0;
    let lastY = 0;
    for (let i = 0; i < n; i++) {
      const v = this.ndc.set(poly[2 * i], poly[2 * i + 1], 0).project(camera);
      if (i === 0) {
        firstX = v.x;
        firstY = v.y;
      } else twice += lastX * v.y - v.x * lastY;
      lastX = v.x;
      lastY = v.y;
    }
    twice += lastX * firstY - firstX * lastY;
    const share = Math.abs(twice) / 8;
    const eye = camera.position;
    const across = polygonDistance(poly, n, eye.x, eye.y);
    const nearest = Math.max(Math.hypot(across, eye.z), 1e-6);
    // An overview cell's size on screen there, CSS px: each octave of it
    // past one pixel is an octave of the tile's detail the screen shows.
    const px = (this.overviewCellKm * view.pxPerRadian) / nearest;
    const octaves = Math.min(
      Math.log2(this.overviewCellKm / tile.cellKm),
      Math.max(0, Math.log2(px)),
    );
    const haze = nearest / view.hazeKm;
    return share * octaves * Math.exp(-haze * haze);
  }
}

/** The layer's tile (−1 for none) and weight. */
export interface SlotChoice {
  index: number;
  weight: number;
}

/**
 * The rule frame by frame, for a free camera, greedily: each frame is a
 * step. The bound tile stays in full while in sight unless it yields to
 * the leader (SLOT_YIELD), fading out and handing over at nothing; once out
 * of sight it hands over to the leader at once. The first tile shows at
 * once, nothing having been bound before it. Allocates nothing.
 */
export class SlotFollower {
  readonly state: SlotChoice = { index: -1, weight: 0 };
  private readonly before: Uint8Array;

  constructor(readonly judge: SlotJudge) {
    this.before = new Uint8Array(judge.tiles.length);
  }

  /** Steps on with a view (CSS pixels per radian, the actual screen). */
  follow(view: SlotView): SlotChoice {
    const judge = this.judge;
    judge.judge(view, view.camera.aspect);
    const { claims, leader } = judge;
    const s = this.state;
    const b = s.index;
    if (b < 0) {
      if (leader >= 0) {
        s.index = leader;
        s.weight = 1;
      }
    } else if (!this.inSight(b)) {
      if (leader >= 0 && leader !== b) {
        s.index = leader;
        s.weight = this.inSight(leader) ? 0 : 1;
      } else s.weight = 1;
    } else if (
      leader >= 0 &&
      leader !== b &&
      claims[b] < SLOT_YIELD * claims[leader]
    ) {
      if (s.weight === 0) s.index = leader;
      else s.weight = Math.max(0, s.weight - SLOT_RATE);
    } else s.weight = Math.min(1, s.weight + SLOT_RATE);
    this.before.set(judge.seen);
    return s;
  }

  /** In sight this frame or the last. */
  private inSight(k: number): boolean {
    return this.judge.seen[k] === 1 || this.before[k] === 1;
  }
}

/**
 * The layer along one flight, a step every SLOT_STEP_P of p: the bound tile
 * and its weight, and for development what the rule saw at each step.
 */
export class SlotPlan {
  constructor(
    readonly index: Int16Array,
    readonly weight: Float32Array,
    /** Per tile, 1 where it was in sight. */
    readonly seen: readonly Uint8Array[],
    /** Per tile, its claim. */
    readonly claims: readonly Float32Array[],
    /** Per step, the tile with the greatest claim (−1 none). */
    readonly leader: Int16Array,
  ) {}

  /** The steps' count less one: p = step / last. */
  get last(): number {
    return this.index.length - 1;
  }

  /**
   * The tile and weight at p. Between two steps with the same tile its
   * weight runs straight from one to the other; where the tile changes, the
   * outgoing one runs out to nothing over the first half and the incoming
   * one in from nothing over the second (the plan has each out of sight
   * there, or at nothing).
   */
  at(p: number, out: SlotChoice): SlotChoice {
    const last = this.last;
    const x = Math.min(1, Math.max(0, p)) * last;
    const i = Math.min(last - 1, Math.floor(x));
    const t = x - i;
    const a = this.index[i];
    const b = this.index[i + 1];
    if (a === b) {
      out.index = a;
      out.weight =
        a < 0 ? 0 : this.weight[i] + (this.weight[i + 1] - this.weight[i]) * t;
    } else if (t < 0.5) {
      out.index = a;
      out.weight = a < 0 ? 0 : this.weight[i] * (1 - 2 * t);
    } else {
      out.index = b;
      out.weight = b < 0 ? 0 : this.weight[i + 1] * (2 * t - 1);
    }
    return out;
  }
}

/** The greatest of each value's `r` predecessors (ahead: of itself and its r − 1 successors). */
function windowMax(values: Float32Array, r: number, ahead: boolean) {
  const n = values.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = 0; j < r; j++) {
      const k = ahead ? i + j : i - 1 - j;
      if (k >= 0 && k < n) m = Math.max(m, values[k]);
    }
    out[i] = m;
  }
  return out;
}

/**
 * Plans the layer along a flight (see the module's comment): `view(p)`
 * places a camera where the flight has it at p (0..1), at the plan's view
 * (SLOT_PLAN_VIEW), and returns the view. A couple of thousand views (10
 * to 13 ms in one go), judged in idle slices (engine/slice.ts) so the
 * chart's load never holds a frame of scene 1 back; run once per flight,
 * at load.
 */
export async function planAlong(
  judge: SlotJudge,
  view: (p: number) => SlotView,
  signal?: AbortSignal,
): Promise<SlotPlan> {
  const steps = Math.round(1 / SLOT_STEP_P);
  const tiles = judge.tiles.length;
  const seen = judge.tiles.map(() => new Uint8Array(steps + 1));
  const claims = judge.tiles.map(() => new Float32Array(steps + 1));
  const leader = new Int16Array(steps + 1);
  const slicer = new Slicer(SLICE_MS, signal);
  for (let i = 0; i <= steps; i++) {
    judge.judge(view(i / steps), SLOT_SEEN_ASPECT);
    for (let k = 0; k < tiles; k++) {
      seen[k][i] = judge.seen[k];
      claims[k][i] = judge.claims[k];
    }
    leader[i] = judge.leader;
    await slicer.check();
  }
  const sight = (k: number, i: number) =>
    seen[k][i] === 1 || (i > 0 && seen[k][i - 1] === 1);
  // A fade out spans the steps before a change of tile, a fade in the steps
  // from it: each costs the most its tile claims over them.
  const fadingOut = claims.map((c) => windowMax(c, SLOT_FADE_STEPS, false));
  const fadingIn = claims.map((c) => windowMax(c, SLOT_FADE_STEPS, true));
  const loss = (i: number, bound: number) => {
    let sum = 0;
    for (let k = 0; k < tiles; k++) if (k !== bound) sum += claims[k][i];
    return sum;
  };

  // The binding of least cost: one state per tile, the best way to each
  // tile at each step, then back from the cheapest end.
  let cost = new Float64Array(tiles);
  let next = new Float64Array(tiles);
  const from = new Int16Array((steps + 1) * tiles);
  for (let b = 0; b < tiles; b++) cost[b] = loss(0, b);
  for (let i = 1; i <= steps; i++) {
    for (let b = 0; b < tiles; b++) {
      let best = cost[b];
      let way = b;
      for (let a = 0; a < tiles; a++) {
        if (a === b) continue;
        // A change of tile at all costs a little, so equal ways keep the tile.
        let c = cost[a] + 1e-6;
        if (sight(a, i)) c += SLOT_FADE_COST * fadingOut[a][i];
        if (sight(b, i)) c += SLOT_FADE_COST * fadingIn[b][i];
        if (c < best) {
          best = c;
          way = a;
        }
      }
      next[b] = best + loss(i, b);
      from[i * tiles + b] = way;
    }
    const spare = cost;
    cost = next;
    next = spare;
  }
  const index = new Int16Array(steps + 1).fill(-1);
  if (tiles > 0) {
    let b = 0;
    for (let k = 1; k < tiles; k++) if (cost[k] < cost[b]) b = k;
    for (let i = steps; i >= 0; i--) {
      index[i] = b;
      if (i > 0) b = from[i * tiles + b];
    }
  }

  // Full, but fading over SLOT_FADE_STEPS on either side of each change of
  // tile where a tile is in sight: out to nothing at the last step before
  // it, in from nothing at its first.
  const weight = new Float32Array(steps + 1).fill(tiles > 0 ? 1 : 0);
  for (let i = 1; i <= steps; i++) {
    const a = index[i - 1];
    const b = index[i];
    if (a === b) continue;
    for (let j = 0; j < SLOT_FADE_STEPS; j++) {
      const before = i - 1 - j;
      if (sight(a, i) && before >= 0 && index[before] === a)
        weight[before] = Math.min(weight[before], j * SLOT_RATE);
      const after = i + j;
      if (sight(b, i) && after <= steps && index[after] === b)
        weight[after] = Math.min(weight[after], j * SLOT_RATE);
    }
  }
  return new SlotPlan(index, weight, seen, claims, leader);
}
