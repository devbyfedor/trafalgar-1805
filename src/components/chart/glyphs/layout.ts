import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { CoastField } from "../terrain/coast";
import type { GlyphExtent } from "./atlas";
import type { Glyphs } from "./Glyphs";
import { glyphNominalPx } from "./height";

/**
 * Where every ship glyph stands on screen, how tall and how much of it
 * shows, decided on the CPU each frame for all glyph layers together, so
 * that no glyph's ink ever touches land or another glyph's (docs/
 * decisions.md, "Scene 2: ships clear of land and of each other").
 *
 * Every rule is a pure function of the frame (the scene is a function of
 * its scroll and plays back alike) and continuous: no rule decides by a
 * threshold; whatever comes and goes (a ship joining, a glyph fading, land
 * in the haze) does so by a weight that comes and goes smoothly.
 *
 * - A glyph is its ink's box on screen (measured from the atlas's own
 *   texels at the two levels it is drawn from, mirrored with its facing,
 *   narrowed end-on), reaching down to its foot. Boxes nest as a glyph
 *   shrinks about its foot, so shrinking never makes an overlap.
 * - Land: a screen rectangle is clear when the coast lies farther from its
 *   middle on the chart than any of its corners (the coast distance is
 *   1-Lipschitz, up to the field's own error, allowed for); the rectangle
 *   is clipped first to what can show, below the horizon and short of the
 *   haze. A glyph's box is covered by a few such pieces; how far it may
 *   grow about its foot before one meets land is traced out from nothing
 *   in steps the slack allows, so it is found again, smoothly, as the
 *   camera moves.
 * - Glyphs placed earlier are obstacles for later ones, each as much as its
 *   ink shows; how far a box may grow before it meets one is solved
 *   exactly.
 * - Ships at their true places (FreeGroup) keep them: a group takes a
 *   common size from its ships' usual spacing (a weighted median), and a
 *   ship crowded closer than that by one placed before her yields: she
 *   draws smaller, and fades once too small to read. A group's lead is
 *   held only by land and the glyphs before her.
 * - A squadron (Formation) is a symbol at the head of its track: the lead
 *   in a row of her own, the others in level rows above and below,
 *   staggered, as a chart draws a fleet; pushed off the coast into open
 *   water; one scale shared by every squadron on screen; below a floor its
 *   sign (the lead alone, the others shrinking and fading where they are).
 *   Two squadrons meeting zip into two lines on the action's course, one
 *   above the other, a lane between.
 * - What would change at the story's pace (a squadron's fit, its push off
 *   the coast, a fleet's common size) is baked ahead over the scroll for
 *   the viewport and eased, the least fit within reach taken first, so a
 *   block closes before an island and opens after it at the pace of the
 *   scroll. Each frame reads the tables and keeps only the fixed-foot
 *   clamps live: they guarantee the result, the tables keep it smooth.
 */

/** Ships at their true places. */
export interface FreeGroup {
  kind: "free";
  layer: Glyphs;
  /** Mark indices, in priority order (the lead first). */
  members: readonly number[];
}

/** A squadron drawn as a symbol at the head of its track. */
export interface Formation {
  kind: "formation";
  layer: Glyphs;
  /** Mark indices of its places in rank order, the lead's first. */
  places: readonly number[];
  /** Every type it ever carries (its ships' box is the largest of them). */
  types: readonly string[];
  /** The head: world km, and heading (radians from north, clockwise). */
  x: number;
  y: number;
  heading: number;
  /** A squadron it meets, and how far into the meeting (0..1). */
  meets: Formation | null;
  meeting: number;
  /** In a meeting, its line is drawn above the other's on screen. */
  above?: boolean;
  /** In a meeting, the action's course both squadrons take (radians). */
  course?: number;
}

export type GlyphGroup = FreeGroup | Formation;

/** Below this height a glyph has faded out, CSS px. */
const READABLE_PX = 7;
/** It is fully there from this height, CSS px. */
const FULL_PX = 9.5;
/**
 * The least height a squadron's ships are drawn at, CSS px (the atlas's
 * 17 px drawing at the owner's 1.5 device pixels still shows a three-
 * master); a squadron that can't hold it turns into its sign.
 */
const FLOOR_PX = 11;
/** Clear water kept between a glyph's ink and the coastline's, CSS px. */
const LAND_GAP_PX = 1.75;
/** Half the coastline's width at its widest (uCoastPx) and its antialiasing, CSS px. */
const COAST_HALF_PX = 1;
/** Room between two glyphs' ink, CSS px. */
const GLYPH_GAP_PX = 1.5;
/**
 * Land farther than this many haze visibilities can't be seen: the clash
 * probe counts land whose share left by the haze is at least 0.1, which
 * ends at sqrt(ln 10) ≈ 1.52 visibilities.
 */
const HAZE_SEEN = 1.52;
/** The least a glyph narrows to end-on: a ship as seen, a squadron's symbol held nearer broadside. */
const NARROW_SHIP = 0.3;
const NARROW_SYMBOL = 0.65;
/** Pieces across and up a glyph's box when testing it against land. */
const PIECES_X = 3;
const PIECES_Y = 2;
/** Baked tables: the least fit taken within this much p, then eased over this much. */
const BAKE_LEAST_P = 0.004;
const BAKE_EASE_P = 0.004;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** How much a glyph's ink counts as an obstacle by how much of it shows. */
const inkWeight = (alpha: number) => smoothstep(0.03, 0.08, alpha);

/** The camera as the layout needs it: world to screen and back. */
class View {
  /** Drawing buffer, device px. */
  w = 1;
  h = 1;
  /** Device px per radian. */
  pxPerRad = 1;
  ex = 0;
  ey = 0;
  ez = 1;
  /** Haze: its visibility, and the distance past which no land shows. */
  vis = 100;
  seen = 1e9;
  /** The view's right on the chart, normalised (facings). */
  rx = 1;
  ry = 0;
  /** Last projection: screen px (y up), and depth along the view. */
  px = 0;
  py = 0;
  pz = 0;
  /** Last unprojection: the sea point and its distance from the eye. */
  qx = 0;
  qy = 0;
  qt = 0;
  private readonly m = new Float64Array(16);
  private readonly r = new Float64Array(9);
  private p0 = 1;
  private p5 = 1;
  private p8 = 0;
  private p9 = 0;

  set(frame: FrameInfo): void {
    const cam = frame.camera;
    this.w = frame.width;
    this.h = frame.height;
    this.pxPerRad = frame.pxPerRadian;
    this.ex = frame.eye.x;
    this.ey = frame.eye.y;
    this.ez = Math.max(frame.eye.z, 1e-6);
    this.vis = frame.hazeVisibility;
    this.seen = frame.hazeVisibility * HAZE_SEEN;
    const P = cam.projectionMatrix.elements;
    const V = cam.matrixWorldInverse.elements;
    // m = P × V, column-major.
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += P[k * 4 + r] * V[c * 4 + k];
        this.m[c * 4 + r] = s;
      }
    this.p0 = P[0];
    this.p5 = P[5];
    this.p8 = P[8];
    this.p9 = P[9];
    // The view's axes in the world: its world matrix's columns.
    const W = cam.matrixWorld.elements;
    const r = this.r;
    r[0] = W[0];
    r[1] = W[1];
    r[2] = W[2];
    r[3] = W[4];
    r[4] = W[5];
    r[5] = W[6];
    r[6] = W[8];
    r[7] = W[9];
    r[8] = W[10];
    const len = Math.hypot(W[0], W[1]) || 1;
    this.rx = W[0] / len;
    this.ry = W[1] / len;
  }

  /** Projects a world point to screen px (y up); false behind the eye. */
  project(x: number, y: number, z: number): boolean {
    const m = this.m;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    this.pz = cw;
    if (cw <= 1e-9) return false;
    this.px = ((cx / cw) * 0.5 + 0.5) * this.w;
    this.py = ((cy / cw) * 0.5 + 0.5) * this.h;
    return true;
  }

  /** The sea point under a screen point; false above the horizon. */
  unproject(px: number, py: number): boolean {
    const nx = (px / this.w) * 2 - 1;
    const ny = (py / this.h) * 2 - 1;
    const vx = (nx + this.p8) / this.p0;
    const vy = (ny + this.p9) / this.p5;
    const r = this.r;
    // The view ray (vx, vy, -1) in the world.
    const dx = r[0] * vx + r[3] * vy - r[6];
    const dy = r[1] * vx + r[4] * vy - r[7];
    const dz = r[2] * vx + r[5] * vy - r[8];
    if (dz > -1e-9) return false;
    const t = -this.ez / dz;
    this.qx = this.ex + dx * t;
    this.qy = this.ey + dy * t;
    this.qt = t * Math.sqrt(dx * dx + dy * dy + dz * dz);
    return true;
  }

  /** The highest screen row on a column, between y0 (shown) and y1, whose sea still shows. */
  clipRow(x: number, y0: number, y1: number): number {
    let lo = y0;
    let hi = y1;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (this.unproject(x, mid) && this.qt <= this.seen) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /**
   * The most km a pixel spans on the sea this far from the eye: a pixel's
   * angle (at most 1 / pxPerRad, off the axis less) times the distance,
   * stretched by 1 / sin of the view's angle to the sea (ez / dist).
   */
  kmPerPx(dist: number): number {
    return (dist * dist) / (this.pxPerRad * this.ez);
  }

  /** A heading's facing on screen (-1 left, 1 right), as GLSL glyphFacing. */
  facing(heading: number): number {
    return Math.sin(heading) * this.rx + Math.cos(heading) * this.ry;
  }

  /** How much of a glyph this far off the haze leaves (as the shader's exp(-x²)). */
  haze(dist: number): number {
    const x = dist / this.vis;
    return Math.exp(-x * x);
  }
}

export class GlyphLayout implements ChartLayer {
  private readonly view = new View();
  private readonly ext: GlyphExtent = { left: 0, right: 0, top: 0 };
  /** Placed glyphs' boxes this frame, obstacles for later ones. */
  private readonly ox0: Float64Array;
  private readonly oy0: Float64Array;
  private readonly ox1: Float64Array;
  private readonly oy1: Float64Array;
  private obstacles = 0;
  /** Per member of the group being laid out. */
  private readonly fx: Float64Array;
  private readonly fy: Float64Array;
  private readonly bl: Float64Array;
  private readonly br: Float64Array;
  private readonly bt: Float64Array;
  private readonly h0: Float64Array;
  private readonly wt: Float64Array;
  private readonly near: Float64Array;
  private readonly order: Int32Array;
  /** Points pulling a shape off the coast (pushPoints): centres and radii. */
  private readonly sx: Float64Array;
  private readonly sy: Float64Array;
  private readonly sr: Float64Array;
  private readonly layers: readonly Glyphs[];
  private readonly formations: Formation[];
  private readonly frees: FreeGroup[];
  private readonly plans = new Map<Formation, SquadronPlan>();
  private readonly pairs = new Map<Formation, PairPlan>();
  private frameNo = 0;
  /** Device px of clear water round a glyph's ink, and between glyphs, this frame. */
  private landMargin = 4;
  private glyphGap = 2;
  private dpr = 1;
  private sizeRef = 100;
  /** The last box built (boxOf), and the last push (pushPoints). */
  private boxL = 0;
  private boxR = 0;
  private boxT = 0;
  private pushX = 0;
  private pushY = 0;
  /** The scene's progress this frame (setProgress), for the baked tables. */
  private p = Number.NaN;
  /** Baked tables and the viewport they were baked for. */
  private bake: Bake | null = null;
  private baked: Bake | null = null;
  /** Development: each squadron's layout this frame, when asked for. */
  debug: Record<string, unknown>[] | null = null;

  constructor(
    private readonly coast: CoastField | null,
    groups: readonly GlyphGroup[],
  ) {
    const layers = new Set<Glyphs>();
    let largest = 1;
    for (const g of groups) {
      layers.add(g.layer);
      const n = g.kind === "free" ? g.members.length : g.places.length;
      largest = Math.max(largest, n);
    }
    this.layers = [...layers];
    this.formations = groups.filter(
      (g): g is Formation => g.kind === "formation",
    );
    this.frees = groups.filter((g): g is FreeGroup => g.kind === "free");
    let total = 0;
    for (const l of this.layers) total += l.markCount;
    const f64 = (n: number) => new Float64Array(Math.max(1, n));
    this.ox0 = f64(total);
    this.oy0 = f64(total);
    this.ox1 = f64(total);
    this.oy1 = f64(total);
    this.fx = f64(largest);
    this.fy = f64(largest);
    this.bl = f64(largest);
    this.br = f64(largest);
    this.bt = f64(largest);
    this.h0 = f64(largest);
    this.wt = f64(largest);
    this.near = f64(largest);
    this.order = new Int32Array(Math.max(1, largest));
    this.sx = f64(2 * largest);
    this.sy = f64(2 * largest);
    this.sr = f64(2 * largest);
  }

  /** The scene's progress for this frame (the baked tables are read at it). */
  setProgress(p: number): void {
    this.p = p;
  }

  update(frame: FrameInfo): void {
    this.begin(frame);
    // Nothing is drawn unless a group places it.
    for (const l of this.layers) l.drawn.alpha.fill(0);
    const baked = this.tablesFor(frame);
    // The fleets at their true places first; the squadrons' symbols fit
    // round them.
    for (let i = 0; i < this.frees.length; i++)
      this.layoutFree(this.frees[i], baked ? baked.at(i, this.p) : null);
    this.layoutSquadrons(baked);
  }

  dispose(): void {}

  private begin(frame: FrameInfo): void {
    this.frameNo++;
    this.view.set(frame);
    this.dpr = frame.dpr;
    this.landMargin = (COAST_HALF_PX + LAND_GAP_PX) * frame.dpr;
    this.glyphGap = GLYPH_GAP_PX * frame.dpr;
    this.sizeRef = Math.hypot(
      frame.target.x - frame.eye.x,
      frame.target.y - frame.eye.y,
      frame.eye.z,
    );
    this.obstacles = 0;
  }

  // ---- Baking -------------------------------------------------------------

  /**
   * Starts baking the tables for p from `from` to `to` by `step`, for the
   * viewport of the frames to come: the host then sets the scene at each
   * step and calls bakeStep with its frame (without drawing), in idle time,
   * and bakeEnd when done. Until a bake for the viewport is done, the
   * layout decides everything from the frame alone.
   */
  bakeBegin(from: number, to: number, step: number): number[] {
    const steps = Math.max(2, Math.round((to - from) / step) + 1);
    this.bake = new Bake(
      from,
      step,
      steps,
      this.formations.length,
      this.frees.length,
    );
    return Array.from({ length: steps }, (_, k) => from + k * step);
  }

  /** Records the decisions at step k, for the scene as set at its p. */
  bakeStep(frame: FrameInfo, k: number): void {
    const bake = this.bake;
    if (!bake) return;
    if (k === 0) bake.key = viewKey(frame);
    this.begin(frame);
    for (let i = 0; i < this.frees.length; i++)
      bake.common[i][k] = this.commonOf(this.frees[i], null);
    for (let i = 0; i < this.formations.length; i++) {
      const g = this.formations[i];
      const plan = this.prepare(g, null);
      const f = bake.squad[i];
      if (!plan.ok) {
        f.fit[k] = Number.NaN;
        f.offX[k] = Number.NaN;
        f.offY[k] = Number.NaN;
        continue;
      }
      f.fit[k] = plan.fit;
      f.offX[k] = plan.ax - plan.headX;
      f.offY[k] = plan.ay - plan.headY;
    }
  }

  /** Eases the baked tables; from now on the frames read them. */
  bakeEnd(): void {
    const bake = this.bake;
    if (!bake) return;
    bake.finish();
    this.baked = bake;
    this.bake = null;
  }

  /** The baked tables, if they were baked for this frame's viewport and cover its p. */
  private tablesFor(frame: FrameInfo): Bake | null {
    const b = this.baked;
    if (!b || Number.isNaN(this.p)) return null;
    if (b.key !== viewKey(frame)) return null;
    return this.p >= b.from && this.p <= b.to ? b : null;
  }

  // ---- Common -------------------------------------------------------------

  /** A glyph's nominal height on screen at a distance, device px. */
  private heightAt(dist: number, size: number): number {
    return glyphNominalPx(this.view.ez, dist, this.sizeRef) * this.dpr * size;
  }

  /**
   * A mark's ink box about its foot at height h (device px), into boxL,
   * boxR and boxT (its bottom is the foot): its ink at the levels drawn
   * there, mirrored and narrowed by its facing as the shader draws it (both
   * facings' while it crossfades end-on), the narrowing's own blur across.
   */
  private boxOf(
    layer: Glyphs,
    index: number,
    heading: number,
    h: number,
    narrow = NARROW_SHIP,
  ) {
    const e = layer.extentOf(index, h, this.ext);
    const facing = this.view.facing(heading);
    const sx = narrow + (1 - narrow) * Math.abs(facing);
    const right = smoothstep(-0.14, 0.14, facing);
    let l = e.left;
    let r = e.right;
    if (right <= 0.001) {
      l = e.right;
      r = e.left;
    } else if (right < 0.999) {
      l = Math.max(e.left, e.right);
      r = l;
    }
    // Squeezed across, the texture is read coarser that way.
    const blur = 0.5 / sx + 0.5;
    this.boxL = l * sx * h + blur;
    this.boxR = r * sx * h + blur;
    this.boxT = (layer.foot + e.top) * h + 0.5;
  }

  /**
   * Records a placed glyph's box as an obstacle for those placed after it:
   * member k's box at scale s, as much of it as its ink shows (shrunk about
   * its foot by that weight, so a fading glyph frees its water smoothly).
   */
  private addObstacle(
    fx: number,
    fy: number,
    s: number,
    k: number,
    shows: number,
  ): void {
    const w = s * inkWeight(shows);
    if (w <= 0) return;
    const o = this.obstacles++;
    this.ox0[o] = fx - w * this.bl[k];
    this.ox1[o] = fx + w * this.br[k];
    this.oy0[o] = fy;
    this.oy1[o] = fy + w * this.bt[k];
  }

  /**
   * How far a box may grow about a point before it meets a placed glyph,
   * up to `limit`: at scale s it spans [ax + s·x0, ax + s·x1] ×
   * [ay + s·y0, ay + s·y1].
   */
  private obstacleFit(
    ax: number,
    ay: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    limit: number,
  ): number {
    let best = limit;
    const g = this.glyphGap;
    for (let k = 0; k < this.obstacles && best > 0; k++) {
      const s = contact(
        ax,
        ay,
        x0,
        x1,
        y0,
        y1,
        this.ox0[k] - g,
        this.oy0[k] - g,
        this.ox1[k] + g,
        this.oy1[k] + g,
      );
      if (s < best) best = s;
    }
    return Math.max(0, best);
  }

  /**
   * How much farther a screen rectangle could reach before land, px
   * (negative once it touches): centre (cx, cy), half-sizes hx, hy (device
   * px, the margin included). It is clipped to what can show (below the
   * horizon, short of the haze's reach); its corners' points on the sea lie
   * within the largest of their distances from its middle's, and the
   * coast distance there, less the field's error, must exceed that.
   */
  private slack(cx: number, cy: number, hx: number, hy: number): number {
    const v = this.view;
    const coast = this.coast;
    if (!coast) return 1e9;
    const y0 = cy - hy;
    // Its lowest row, the nearest: above the horizon or past the haze,
    // none of it can show land.
    if (!v.unproject(cx, y0) || v.qt > v.seen) return 1e9;
    let y1 = cy + hy;
    if (!v.unproject(cx - hx, y1) || v.qt > v.seen)
      y1 = v.clipRow(cx - hx, y0, y1);
    if (!v.unproject(cx + hx, y1) || v.qt > v.seen)
      y1 = v.clipRow(cx + hx, y0, y1);
    const ym = (y0 + y1) / 2;
    if (!v.unproject(cx, ym)) return 1e9;
    const mx = v.qx;
    const my = v.qy;
    let r = 0;
    let far = 0;
    for (let c = 0; c < 4; c++) {
      const x = c & 1 ? cx + hx : cx - hx;
      const y = c & 2 ? y1 : y0;
      if (!v.unproject(x, y)) continue;
      r = Math.max(r, Math.hypot(v.qx - mx, v.qy - my));
      far = Math.max(far, v.qt);
    }
    const d = coast.distance(mx, my);
    const texel = coast.texelKm(mx, my);
    // The field's own error: half a texel near the coast, where it holds
    // true distances; more beyond, where it holds bounds.
    const error = texel * (0.5 + 0.4 * smoothstep(5, 7, Math.abs(d) / texel));
    return (d - error - r) / v.kmPerPx(Math.min(far, v.seen));
  }

  /**
   * How far a box may grow about a point, up to `limit`, before it nears
   * land: at scale s the box spans [ax + s·x0, ax + s·x1] ×
   * [ay + s·y0, ay + s·y1], covered by a grid of pieces, each grown with
   * it (plus the margin all round). Each piece is traced out from s = 0 in
   * steps its slack allows, so the first contact is found, and found again
   * as the camera moves.
   */
  private landFit(
    ax: number,
    ay: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    limit: number,
  ): number {
    if (!this.coast || limit <= 0) return Math.max(0, limit);
    const m = this.landMargin;
    // The open sea's case: everything the box sweeps on its way to the
    // limit (the hull of the point and the box) in one piece.
    {
      const lx = Math.min(0, limit * x0);
      const hx = Math.max(0, limit * x1);
      const ly = Math.min(0, limit * y0);
      const hy = Math.max(0, limit * y1);
      const cx = ax + (lx + hx) / 2;
      const cy = ay + (ly + hy) / 2;
      if (this.slack(cx, cy, (hx - lx) / 2 + m, (hy - ly) / 2 + m) >= 0)
        return limit;
    }
    let best = limit;
    const pw = (x1 - x0) / PIECES_X;
    const ph = (y1 - y0) / PIECES_Y;
    for (let j = 0; j < PIECES_Y && best > 0; j++) {
      for (let i = 0; i < PIECES_X && best > 0; i++) {
        const ux = x0 + (i + 0.5) * pw;
        const uy = y0 + (j + 0.5) * ph;
        // How fast the piece's far corner moves as s grows, px per unit s.
        const rate = Math.hypot(Math.abs(ux) + pw / 2, Math.abs(uy) + ph / 2);
        let s = 0;
        for (let it = 0; it < 32 && s < best; it++) {
          const sl = this.slack(
            ax + s * ux,
            ay + s * uy,
            (s * pw) / 2 + m,
            (s * ph) / 2 + m,
          );
          if (sl <= 0.02) break;
          s += (0.7 * sl) / Math.max(rate, 1e-6);
        }
        if (s < best) best = s;
      }
    }
    return Math.max(0, Math.min(best, limit));
  }

  /** Writes a glyph's drawing for the frame: its foot (screen px), height and opacity. */
  private draw(
    layer: Glyphs,
    index: number,
    fx: number,
    fy: number,
    heading: number,
    h: number,
    alpha: number,
    wakeShare: number,
    narrow = NARROW_SHIP,
  ): void {
    const v = this.view;
    const d = layer.drawn;
    d.narrow[index] = narrow;
    // The foot on the sea under the screen point (above the horizon, the
    // ship's own place).
    if (v.unproject(fx, fy)) {
      d.x[index] = v.qx;
      d.y[index] = v.qy;
    } else {
      d.x[index] = layer.intent.x[index];
      d.y[index] = layer.intent.y[index];
    }
    d.heading[index] = heading;
    d.height[index] = h;
    d.alpha[index] = alpha;
    d.wakeShare[index] =
      wakeShare > 0 && layer.intent.wake[index] > 0 && h > 0.01
        ? wakeShare *
          this.wakeFit(d.x[index], d.y[index], fx, fy, heading, h * wakeShare)
        : wakeShare;
  }

  /**
   * How much of a wake may be drawn before it reaches land (0..1): the wake
   * as the shader lays it on the sea astern of the foot (WAKE_VERTEX: a
   * quad from 0.12 to 1.12 of its length astern, 0.4 of it either side, its
   * length 1.5 glyph heights at the glyph's distance), its box on screen
   * grown from the foot until it nears land.
   */
  private wakeFit(
    x: number,
    y: number,
    fx: number,
    fy: number,
    heading: number,
    h: number,
  ): number {
    const v = this.view;
    const dist = Math.hypot(x - v.ex, y - v.ey, v.ez);
    const len = (1.5 * h * dist) / v.pxPerRad;
    const ax = Math.sin(heading);
    const ay = Math.cos(heading);
    let x0 = 0;
    let x1 = 0;
    let y0 = 0;
    let y1 = 0;
    for (let c = 0; c < 4; c++) {
      const along = c & 1 ? 1.12 : 0.12;
      const across = c & 2 ? 0.4 : -0.4;
      const wx = x - ax * len * along + ay * len * across;
      const wy = y - ay * len * along - ax * len * across;
      if (!v.project(wx, wy, 0)) return 0;
      x0 = Math.min(x0, v.px - fx);
      x1 = Math.max(x1, v.px - fx);
      y0 = Math.min(y0, v.py - fy);
      y1 = Math.max(y1, v.py - fy);
    }
    // The ink's own width round it.
    const pen = 1.5 * this.dpr;
    return this.landFit(fx, fy, x0 - pen, x1 + pen, y0 - pen, y1 + pen, 1);
  }

  /** How much of a glyph this tall shows (device px). */
  private shows(h: number): number {
    return smoothstep(READABLE_PX * this.dpr, FULL_PX * this.dpr, h);
  }

  // ---- Ships at their true places -----------------------------------------

  /**
   * Each ship's foot, nominal height, box and weight (her presence, the
   * haze, and how far in front of the eye she is), into fx, fy, h0, bl, br,
   * bt, wt. Returns the total weight.
   */
  private measureFree(g: FreeGroup): number {
    const layer = g.layer;
    const it = layer.intent;
    const v = this.view;
    let total = 0;
    for (let k = 0; k < g.members.length; k++) {
      const i = g.members[k];
      this.wt[k] = 0;
      this.h0[k] = 0;
      if (it.opacity[i] <= 0) continue;
      if (!v.project(it.x[i], it.y[i], 0)) continue;
      const dist = Math.hypot(it.x[i] - v.ex, it.y[i] - v.ey, v.ez);
      const h = this.heightAt(dist, it.size[i]);
      this.boxOf(layer, i, it.heading[i], h);
      this.fx[k] = v.px;
      this.fy[k] = v.py;
      this.bl[k] = this.boxL;
      this.br[k] = this.boxR;
      this.bt[k] = this.boxT;
      this.h0[k] = h;
      this.wt[k] = it.opacity[i] * v.haze(dist) * smoothstep(0.02, 0.1, v.pz);
      total += this.wt[k];
    }
    return total;
  }

  /**
   * A group's common scale: the weighted median of how far each ship may
   * grow before she meets her nearest companion (both growing alike, a
   * fading companion counting as little as she shows).
   */
  private commonOf(g: FreeGroup, measured: number | null): number {
    const total = measured ?? this.measureFree(g);
    const n = g.members.length;
    if (total <= 0) return 1;
    for (let a = 0; a < n; a++) {
      this.near[a] = 1;
      if (this.wt[a] <= 0) continue;
      let best = 1;
      for (let c = 0; c < n; c++) {
        if (c === a || this.wt[c] <= 0) continue;
        const s = mutual(
          this.fx[c] - this.fx[a],
          this.fy[c] - this.fy[a],
          this.bl[a],
          this.br[a],
          this.bt[a],
          this.bl[c],
          this.br[c],
          this.bt[c],
          this.glyphGap,
        );
        const relaxed = Math.max(s, 1 - Math.min(1, this.wt[c]));
        if (relaxed < best) best = relaxed;
      }
      this.near[a] = best;
    }
    return Math.min(1, weightedMedian(this.near, this.wt, this.order, n));
  }

  private layoutFree(g: FreeGroup, baked: number | null): void {
    const layer = g.layer;
    const it = layer.intent;
    const total = this.measureFree(g);
    if (total <= 0) return;
    const common = baked ?? this.commonOf(g, total);
    // In priority order: each ship as large as the common scale (her
    // group's lead as large as she can be), her own water and the glyphs
    // placed before her allow.
    for (let k = 0; k < g.members.length; k++) {
      if (this.h0[k] <= 0) continue;
      const i = g.members[k];
      const fx = this.fx[k];
      const fy = this.fy[k];
      const l = this.bl[k];
      const r = this.br[k];
      const t = this.bt[k];
      let s = this.obstacleFit(fx, fy, -l, r, 0, t, k === 0 ? 1 : common);
      s = this.landFit(fx, fy, -l, r, 0, t, s);
      const h = s * this.h0[k];
      const alpha = it.opacity[i] * this.shows(h);
      this.draw(layer, i, fx, fy, it.heading[i], h, alpha, 1);
      this.addObstacle(
        fx,
        fy,
        s,
        k,
        alpha * this.view.haze(this.distOf(layer, i)),
      );
    }
  }

  private distOf(layer: Glyphs, i: number): number {
    const v = this.view;
    const it = layer.intent;
    return Math.hypot(it.x[i] - v.ex, it.y[i] - v.ey, v.ez);
  }

  // ---- Squadrons ------------------------------------------------------------

  /**
   * Every squadron's symbol: first each one's shape and place (prepare),
   * then one scale shared by all of them on screen, so a seventy-four in
   * one squadron is drawn as large as in another; then each is drawn at
   * that scale or less, against land and the glyphs before it.
   */
  private layoutSquadrons(baked: Bake | null): void {
    let shared = 1;
    const v = this.view;
    for (let i = 0; i < this.formations.length; i++) {
      const g = this.formations[i];
      const plan = this.prepare(g, baked ? baked.squadAt(i, this.p) : null);
      if (!plan.ok) continue;
      // A squadron counts as much as it shows: coming into the story, on
      // screen (its shape's centre within its radius of the frame), and
      // not given way to its sign (which it does below the floor).
      const sign = 1 - smoothstep(0.8 * plan.floor, plan.floor, plan.fit);
      const cx = plan.ax + plan.cx;
      const cy = plan.ay + plan.cy;
      const out = Math.max(-cx, cx - v.w, -cy, cy - v.h);
      const onScreen = 1 - smoothstep(0, plan.radius + 1, out);
      const weight = plan.presence * onScreen * (1 - sign);
      shared = Math.min(
        shared,
        1 + (Math.max(plan.fit, plan.floor) - 1) * weight,
      );
    }
    for (const g of this.formations) {
      const plan = this.plans.get(g);
      if (plan?.ok) this.drawSquadron(g, plan, shared);
    }
  }

  /**
   * A squadron's shape and place this frame, at scale 1: its head on
   * screen, pushed off the coast into open water if its block won't fit
   * there (or as baked); its side (which way astern lies, from its
   * facing); its ships' box (the largest of every type it carries); each
   * place's offset from the lead; and how far it fits (or as baked).
   *
   * The block: the lead in a row of her own, the others in level rows
   * above and below her (two rows, or four for a large squadron), each one
   * step astern of the next, the rows staggered half a step, as a chart
   * draws a fleet. When the heading turns through end-on the outer rows
   * slide past her, each whole, so nothing crosses; a squadron of three has
   * its followers drop half a row to pass. Meeting another squadron, both
   * zip into single lines (the rows spread to the line's spacing, then
   * close onto the lead's row), on the action's course, one above the other
   * with a lane between, as a plan of the battle draws them.
   */
  private prepare(g: Formation, baked: BakedSquad | null): SquadronPlan {
    let plan = this.plans.get(g);
    if (!plan) {
      plan = newPlan(g.places.length);
      this.plans.set(g, plan);
    }
    plan.ok = false;
    const v = this.view;
    const n = g.places.length;
    if (!v.project(g.x, g.y, 0)) return plan;
    const headX = v.px;
    const headY = v.py;
    let ax = headX;
    let ay = headY;
    // The meeting's course: both squadrons turn into it.
    const other = g.meets;
    const e = other && g.meeting > 0 ? smoothstep(0, 1, g.meeting) : 0;
    const heading =
      e > 0 && g.course !== undefined
        ? turn(g.heading, g.course, e)
        : g.heading;
    if (!this.boxDims(g, heading)) return plan;
    const { half, tall, h, presence } = this.dims;
    const facing = v.facing(heading);
    const step = 2 * half + this.glyphGap;
    // Which way astern lies: -1 to the left (bows right) .. 1. From the
    // facing while the ships show their sides; sailing nearly end-on, the
    // side with the more open water, both by weights that come and go
    // smoothly.
    const byFacing = 1 - 2 * smoothstep(-0.3, 0.3, facing);
    const sideways = smoothstep(0.15, 0.4, Math.abs(facing));
    const side =
      sideways >= 1
        ? byFacing
        : byFacing * sideways +
          this.openSide(headX, headY + tall, n * step * 0.4) * (1 - sideways);
    const rowSep = tall + this.glyphGap;
    // Meeting another squadron: both zip into lines on one spacing, at
    // one place.
    const pair = other && e > 0 ? this.pairOf(g, other) : null;
    const zip = smoothstep(0, 0.6, e);
    const lineStep = pair ? step + (pair.step - step) * e : step;
    this.shapeOffsets(plan, g, n, side, zip, lineStep, rowSep);
    let cap = 1;
    if (baked) {
      ax += baked.offX;
      ay += baked.offY;
      if (pair) cap = 1 + (pair.cap - 1) * e;
    } else {
      // Off the coast, if the shape won't fit where its head is: each
      // ship's box pulls it away from the coast nearest her.
      const r = Math.hypot(half, tall / 2);
      for (let k = 0; k < n; k++) {
        this.sx[k] = ax + plan.ox[k];
        this.sy[k] = ay + plan.oy[k] + tall / 2;
        this.sr[k] = r;
      }
      this.pushPoints(n, 2.5 * plan.radius, plan.radius);
      ax += this.pushX;
      ay += this.pushY;
      if (pair) {
        // This squadron's lead at the end of its line her bows point to,
        // each line centred on the pair's place.
        const length = g === pair.first ? pair.lengthA : pair.lengthB;
        const lx = pair.mx + (side > 0 ? -length / 2 : length / 2);
        const ly = pair.my + (g.above ? pair.lane / 2 : -pair.lane / 2 - tall);
        ax += (lx - ax) * e;
        ay += (ly - ay) * e;
        cap = 1 + (pair.cap - 1) * e;
      }
    }
    plan.ok = true;
    plan.headX = headX;
    plan.headY = headY;
    plan.ax = ax;
    plan.ay = ay;
    plan.heading = heading;
    plan.h = h;
    plan.half = half;
    plan.tall = tall;
    plan.presence = presence;
    plan.floor = (FLOOR_PX * this.dpr) / h;
    plan.cap = cap;
    plan.fit = baked
      ? Math.min(cap, baked.fit)
      : Math.min(cap, this.shapeFit(g, plan));
    return plan;
  }

  /**
   * Which side of a point on screen has the more open water, -1 (left) to
   * 1 (right): the coast's distance (in px) a reach to either side,
   * compared smoothly.
   */
  private openSide(x: number, y: number, reach: number): number {
    const v = this.view;
    const coast = this.coast;
    if (!coast) return 0;
    const clearAt = (px: number) => {
      if (!v.unproject(px, y)) return reach;
      return Math.min(
        reach,
        Math.max(0, coast.distance(v.qx, v.qy) / v.kmPerPx(v.qt)),
      );
    };
    const left = clearAt(x - reach) + 0.5 * clearAt(x - reach / 2);
    const right = clearAt(x + reach) + 0.5 * clearAt(x + reach / 2);
    const d = (right - left) / Math.max(right + left, 1e-6);
    return Math.max(-1, Math.min(1, 3 * d));
  }

  /**
   * A squadron's ships' box on a heading, into `dims`: the widest reach
   * either side of every type it carries (any facing, narrowed as drawn),
   * the tallest, its nominal height, and how much of the squadron shows.
   * False when none of it does.
   */
  private boxDims(g: Formation, heading: number): boolean {
    const layer = g.layer;
    const it = layer.intent;
    const v = this.view;
    let presence = 0;
    for (let k = 0; k < g.places.length; k++)
      presence = Math.max(presence, it.opacity[g.places[k]]);
    if (presence <= 0) return false;
    const dist = Math.hypot(g.x - v.ex, g.y - v.ey, v.ez);
    const h = this.heightAt(dist, 1);
    let reach = 0;
    let top = 0;
    for (const type of g.types) {
      const e = layer.typeExtent(type, h, this.ext);
      reach = Math.max(reach, e.left, e.right);
      top = Math.max(top, e.top);
    }
    const sx =
      NARROW_SYMBOL + (1 - NARROW_SYMBOL) * Math.abs(v.facing(heading));
    const d = this.dims;
    d.half = reach * sx * h + 0.5 / sx + 0.5;
    d.tall = (layer.foot + top) * h + 0.5;
    d.h = h;
    d.presence = presence;
    return true;
  }

  private readonly dims = { half: 0, tall: 0, h: 0, presence: 0 };

  /**
   * Two squadrons meeting, laid out once for both (by whichever comes
   * first): one spacing for both lines (the larger ships', on the action's
   * course), their common length, the lane between them, and their place:
   * the midpoint of the two heads, pushed off the coast by every ship of
   * both lines; each line no longer than half the screen.
   */
  private pairOf(g: Formation, other: Formation): PairPlan | null {
    const first =
      this.formations.indexOf(g) <= this.formations.indexOf(other) ? g : other;
    let pair = this.pairs.get(first);
    if (pair && pair.frame === this.frameNo) return pair.ok ? pair : null;
    if (!pair) {
      pair = {
        frame: 0,
        ok: false,
        mx: 0,
        my: 0,
        step: 0,
        tall: 0,
        lane: 0,
        lengthA: 0,
        lengthB: 0,
        first: null,
        cap: 1,
      };
      this.pairs.set(first, pair);
    }
    pair.frame = this.frameNo;
    pair.ok = false;
    const v = this.view;
    const course = g.course ?? other.course ?? g.heading;
    if (!this.boxDims(g, course)) return null;
    const halfA = this.dims.half;
    const tallA = this.dims.tall;
    if (!this.boxDims(other, course)) return null;
    const half = Math.max(halfA, this.dims.half);
    const tall = Math.max(tallA, this.dims.tall);
    if (!v.project(g.x, g.y, 0)) return null;
    const hx = v.px;
    const hy = v.py;
    if (!v.project(other.x, other.y, 0)) return null;
    const mx = (hx + v.px) / 2;
    const my = (hy + v.py) / 2;
    const step = 2 * half + this.glyphGap;
    // Each line as long as its ships there.
    const countA = presentCount(g);
    const countB = presentCount(other);
    const most = Math.max(countA, countB, 1);
    const length = (most - 1) * step;
    const lane = 0.6 * tall;
    // Both lines' ships pull the pair off the coast.
    const r = Math.hypot(half, tall / 2);
    let k = 0;
    for (let j = 0; j < Math.ceil(most); j++) {
      const x = mx + (j - (most - 1) / 2) * step;
      this.sx[k] = x;
      this.sy[k] = my + lane / 2 + tall / 2;
      this.sr[k++] = r;
      this.sx[k] = x;
      this.sy[k] = my - lane / 2 - tall / 2;
      this.sr[k++] = r;
    }
    this.pushPoints(k, length / 2 + tall, length / 2 + tall);
    pair.ok = true;
    pair.mx = mx + this.pushX;
    pair.my = my + this.pushY;
    pair.step = step;
    pair.tall = tall;
    pair.lane = lane;
    pair.lengthA = (countA - 1) * step;
    pair.lengthB = (countB - 1) * step;
    pair.first = first;
    pair.cap = Math.min(1, (0.5 * v.w) / (most * step));
    return pair;
  }

  /**
   * Each place's offset from the lead's foot at scale 1 (ox, oy), the
   * shape's centre (cx, cy, from the lead) and radius, for a side (-1 bows
   * right .. 1 bows left, astern being the other way) and a zip (0 block,
   * 1 line).
   */
  private shapeOffsets(
    plan: SquadronPlan,
    g: Formation,
    n: number,
    side: number,
    zip: number,
    step: number,
    rowSep: number,
  ): void {
    const it = g.layer.intent;
    // Each place's share: how much of its ship is there, against the
    // squadron's whole, so a ship coming or going opens or closes her
    // room smoothly and an empty place takes none.
    let most = 0;
    for (let k = 0; k < n; k++) most = Math.max(most, it.opacity[g.places[k]]);
    const share = plan.share;
    for (let k = 0; k < n; k++)
      share[k] =
        most > 0 ? Math.min(1, Math.max(0, it.opacity[g.places[k]] / most)) : 0;
    const astern = side; // +1: astern to the right
    const spread = smoothstep(0, 0.5, zip);
    const close = smoothstep(0.5, 1, zip);
    plan.ox[0] = 0;
    plan.oy[0] = 0;
    const rows = n <= 3 ? 1 : n - 1 <= 12 ? 2 : 4;
    // The line's order from the lead: depth by depth, the rows in turn,
    // each row's ships nearest the lead first on this side (zipped only on
    // a course that holds its side); along it, each ship one step on from
    // the last, in proportion to their shares.
    let at = 0.5;
    let prev = share[0];
    for (let d = 0; d * rows < n; d++) {
      for (let r = 0; r < rows; r++) {
        const m = Math.floor((n - 1 - r - 1) / rows) + 1;
        const j = side > 0 ? m - 1 - d : d;
        if (j < 0 || j >= m) continue;
        const k = 1 + r + j * rows;
        if (k >= n) continue;
        at += (prev + share[k]) / 2;
        plan.lineU[k] = at;
        prev = share[k];
      }
    }
    for (let r = 0; r < rows; r++) {
      const m = Math.floor((n - 1 - r - 1) / rows) + 1;
      // The row's length in steps, its ships each taking their share.
      let length = 0;
      let last = 0;
      for (let j = 0; j < m; j++) {
        const s = share[1 + r + j * rows];
        length += j === 0 ? s / 2 : (last + s) / 2;
        last = s;
      }
      length += last / 2;
      let c: number;
      let by: number;
      if (rows === 1) {
        // One row: the followers drop a row to pass the lead.
        const a = Math.abs(side);
        const drop = 1 - smoothstep(0.55, 1, a);
        const reach = (0.5 + length / 2) * step;
        c = a >= 0.55 ? Math.sign(side) * reach : (side / 0.55) * reach;
        by = -drop * rowSep;
      } else {
        // A row astern of the lead by a step, sliding whole across her as
        // the side changes, the rows staggered half a step.
        const stagger = r === 1 || r === 2 ? step / 2 : 0;
        c = side * (0.5 * step + stagger + (length * step) / 2);
        by = (r % 2 === 0 ? 1 : -1) * (Math.floor(r / 2) + 1) * rowSep;
      }
      // A rigid row, its order fixed on screen (j = 0 at its right end).
      let u = 0;
      last = 0;
      for (let j = 0; j < m; j++) {
        const k = 1 + r + j * rows;
        const s = share[k];
        u += j === 0 ? s / 2 : (last + s) / 2;
        last = s;
        const bx = c + (length / 2 - u) * step;
        const lx = astern * plan.lineU[k] * step;
        plan.ox[k] = bx + (lx - bx) * spread;
        plan.oy[k] = by * (1 - close);
      }
    }
    // The shape's centre and radius, each ship counting as she is there.
    let cx = 0;
    let cy = 0;
    let weight = 0;
    for (let k = 0; k < n; k++) {
      cx += share[k] * plan.ox[k];
      cy += share[k] * plan.oy[k];
      weight += share[k];
    }
    cx /= Math.max(weight, 1e-6);
    cy /= Math.max(weight, 1e-6);
    let radius = 0;
    for (let k = 0; k < n; k++)
      radius = Math.max(
        radius,
        share[k] * Math.hypot(plan.ox[k] - cx, plan.oy[k] - cy),
      );
    plan.cx = cx;
    plan.cy = cy;
    plan.count = weight;
    plan.radius = radius + Math.hypot(step, rowSep) / 2;
  }

  /**
   * The largest scale (≤ 1) at which a squadron's shape fits: every
   * place's box grown about the shape's centre from nothing until it meets
   * land, each place counting as much as it is there (a ship joining
   * presses on it only as she comes).
   */
  private shapeFit(g: Formation, plan: SquadronPlan): number {
    const it = g.layer.intent;
    const ox = plan.ax + plan.cx;
    const oy = plan.ay + plan.cy;
    let best = 1;
    for (let k = 0; k < g.places.length && best > 0; k++) {
      const presence = it.opacity[g.places[k]];
      if (presence <= 0) continue;
      const dx = plan.ox[k] - plan.cx;
      const dy = plan.oy[k] - plan.cy;
      const s = this.landFit(
        ox,
        oy,
        dx - plan.half,
        dx + plan.half,
        dy,
        dy + plan.tall,
        best,
      );
      best = Math.min(best, Math.max(s, 1 - presence));
    }
    return best;
  }

  /**
   * Draws a squadron at the shared scale or less (its fit); then each ship
   * against land and the glyphs before her. Below the floor, its sign: the
   * rear ranks shrink and fade where they are, and once they have gone the
   * lead grows to the shared scale.
   */
  private drawSquadron(g: Formation, plan: SquadronPlan, shared: number): void {
    const layer = g.layer;
    const it = layer.intent;
    const n = g.places.length;
    const fit = plan.fit;
    const scale = Math.min(shared, fit);
    const sign = 1 - smoothstep(0.8 * plan.floor, plan.floor, fit);
    plan.sign = sign;
    const ox = plan.ax + plan.cx;
    const oy = plan.ay + plan.cy;
    const dist = Math.hypot(
      g.x - this.view.ex,
      g.y - this.view.ey,
      this.view.ez,
    );
    const haze = this.view.haze(dist);
    for (let k = 0; k < n; k++) {
      const i = g.places[k];
      if (it.opacity[i] <= 0) continue;
      let fx = ox + scale * (plan.ox[k] - plan.cx);
      let fy = oy + scale * (plan.oy[k] - plan.cy);
      // As a sign, the lead stands where the water was found for the whole
      // squadron, once the others have gone.
      if (k === 0) {
        const t = smoothstep(0.95, 1, sign);
        fx += (ox - fx) * t;
        fy += (oy - fy) * t;
      }
      this.boxOf(layer, i, plan.heading, plan.h, NARROW_SYMBOL);
      this.bl[k] = this.boxL;
      this.br[k] = this.boxR;
      this.bt[k] = this.boxT;
      // The rear ranks go first.
      const rank = n > 1 ? k / (n - 1) : 0;
      const going =
        k === 0
          ? 0
          : smoothstep(0.6 * (1 - rank), 0.6 * (1 - rank) + 0.4, sign);
      // The lead grows to the shared scale once the others have gone.
      const limit =
        k === 0
          ? scale +
            (Math.max(shared, scale) - scale) * smoothstep(0.95, 1, sign)
          : scale * (1 - going);
      let s = this.obstacleFit(
        fx,
        fy,
        -this.boxL,
        this.boxR,
        0,
        this.boxT,
        limit,
      );
      s = this.landFit(fx, fy, -this.boxL, this.boxR, 0, this.boxT, s);
      const hd = s * plan.h;
      const alpha = it.opacity[i] * (1 - going) * this.shows(hd);
      this.draw(
        layer,
        i,
        fx,
        fy,
        plan.heading,
        hd,
        alpha,
        k === 0 ? 1 : 0,
        NARROW_SYMBOL,
      );
      this.addObstacle(fx, fy, s, k, alpha * haze);
      if (k === 0) {
        plan.leadX = fx;
        plan.leadY = fy;
        plan.leadH = hd;
      }
    }
    if (this.debug)
      this.debug.push({
        places: g.places[0],
        p: this.p,
        baked: this.baked ? this.baked.key : "none",
        anchor: [plan.ax, plan.ay],
        radius: plan.radius,
        fit,
        shared,
        scale,
        sign,
        h: plan.h,
      });
  }

  /**
   * How far to move a shape off the coast, screen px, into pushX, pushY:
   * each of its points (sx, sy; each needing a clear radius sr) pulls it by
   * what its water lacks, along the coast distance's slope taken across
   * the whole shape (`scale` px), so a block straddling a chain of
   * islands moves off the chain as a whole instead of being pulled both
   * ways at once; the pulls are averaged, each weighted smoothly by its
   * lack, so they come and go without a jump, eight times over; never more
   * than `cap` px in all.
   */
  private pushPoints(count: number, cap: number, scale: number): void {
    this.pushX = 0;
    this.pushY = 0;
    const v = this.view;
    const coast = this.coast;
    if (!coast) return;
    let tx = 0;
    let ty = 0;
    for (let iter = 0; iter < 8; iter++) {
      let px = 0;
      let py = 0;
      let weight = 0;
      for (let k = 0; k < count; k++) {
        const x = this.sx[k] + tx;
        const y = this.sy[k] + ty;
        if (!v.unproject(x, y)) continue;
        // Land deep in the haze pulls as little as it shows.
        const seen = 1 - smoothstep(0.9 * v.seen, v.seen, v.qt);
        if (seen <= 0) continue;
        const qx = v.qx;
        const qy = v.qy;
        const kmpp = v.kmPerPx(v.qt);
        const d = coast.distance(qx, qy);
        const lack = (this.sr[k] + this.landMargin - d / kmpp) * seen;
        if (lack <= 0) continue;
        // Away from the coast, across the shape's reach.
        const reach = Math.max(Math.abs(d), scale * kmpp, 6 * kmpp);
        const gx =
          (coast.distance(qx + reach, qy) - coast.distance(qx - reach, qy)) /
          (2 * reach);
        const gy =
          (coast.distance(qx, qy + reach) - coast.distance(qx, qy - reach)) /
          (2 * reach);
        const gl = Math.hypot(gx, gy);
        if (gl < 1e-6) continue;
        // That direction on screen.
        const step = 0.5 * reach;
        if (!v.project(qx + (gx / gl) * step, qy + (gy / gl) * step, 0))
          continue;
        let dx = v.px - x;
        let dy = v.py - y;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl;
        dy /= dl;
        // A weak slope (midway between two coasts) pulls weakly.
        const pull = lack * Math.min(1, gl / 0.35);
        const w = smoothstep(0, 8, lack);
        px += w * pull * dx;
        py += w * pull * dy;
        weight += w;
      }
      if (weight <= 0) break;
      tx += px / Math.max(weight, 1);
      ty += py / Math.max(weight, 1);
    }
    const tl = Math.hypot(tx, ty);
    if (tl > cap) {
      tx *= cap / tl;
      ty *= cap / tl;
    }
    this.pushX = tx;
    this.pushY = ty;
  }

  /**
   * Each squadron's sign this frame (for its count's lettering): how far
   * it has turned into it (0..1), and its lead's foot and height on screen,
   * device px from the bottom left.
   */
  signOf(g: Formation): { sign: number; x: number; y: number; h: number } {
    const plan = this.plans.get(g);
    const out = this.signOut;
    out.sign = plan?.ok ? plan.sign : 0;
    out.x = plan?.leadX ?? 0;
    out.y = plan?.leadY ?? 0;
    out.h = plan?.leadH ?? 0;
    return out;
  }

  private readonly signOut = { sign: 0, x: 0, y: 0, h: 0 };
}

/** A squadron's layout this frame, at scale 1 (GlyphLayout.prepare). */
interface SquadronPlan {
  ok: boolean;
  /** Its head, and its lead's foot, device px. */
  headX: number;
  headY: number;
  ax: number;
  ay: number;
  heading: number;
  /** Nominal glyph height, and a ship's box's half-width and height, device px. */
  h: number;
  half: number;
  tall: number;
  /** Each place's offset from the lead's foot. */
  ox: Float64Array;
  oy: Float64Array;
  /** Each place's share (how much of its ship is there), and its place along the line, steps. */
  share: Float64Array;
  lineU: Float64Array;
  /** How many ships are there, in shares. */
  count: number;
  /** The shape's centre (from the lead) and radius. */
  cx: number;
  cy: number;
  radius: number;
  /** How far it fits; the least scale at which its ships still read; its cap. */
  fit: number;
  floor: number;
  cap: number;
  presence: number;
  /** How far it has turned into its sign; its lead's foot and height drawn. */
  sign: number;
  leadX: number;
  leadY: number;
  leadH: number;
}

function newPlan(n: number): SquadronPlan {
  return {
    ok: false,
    headX: 0,
    headY: 0,
    ax: 0,
    ay: 0,
    heading: 0,
    h: 0,
    half: 0,
    tall: 0,
    ox: new Float64Array(Math.max(1, n)),
    oy: new Float64Array(Math.max(1, n)),
    share: new Float64Array(Math.max(1, n)),
    lineU: new Float64Array(Math.max(1, n)),
    count: 0,
    cx: 0,
    cy: 0,
    radius: 0,
    fit: 0,
    floor: 0,
    cap: 1,
    presence: 0,
    sign: 0,
    leadX: 0,
    leadY: 0,
    leadH: 0,
  };
}

/** Two squadrons meeting, laid out once for both (GlyphLayout.pairOf). */
interface PairPlan {
  frame: number;
  ok: boolean;
  /** Where the lane between the two lines runs, device px. */
  mx: number;
  my: number;
  /** One spacing for both lines, each line's length (the first's, the other's), the ships' height, the lane. */
  step: number;
  tall: number;
  lengthA: number;
  lengthB: number;
  first: Formation | null;
  lane: number;
  /** The most scale at which each line is no longer than half the screen. */
  cap: number;
}

/** A squadron's baked decisions at a p: its fit, and its lead's offset from its head. */
interface BakedSquad {
  fit: number;
  offX: number;
  offY: number;
}

/** The viewport a bake belongs to. */
function viewKey(frame: FrameInfo): string {
  return `${frame.width}x${frame.height}@${frame.dpr}`;
}

/**
 * Tables of the layout's decisions over p for one viewport (GlyphLayout.
 * bakeBegin): each squadron's fit and its lead's offset from its head,
 * each fleet group's common scale. Eased when done: the fit (and common
 * scale) take the least value within BAKE_LEAST_P either side, then all
 * are smoothed over about BAKE_EASE_P, so a squadron shrinks before an
 * island and grows after it at the pace of the scroll.
 */
class Bake {
  key = "";
  readonly to: number;
  readonly squad: {
    fit: Float32Array;
    offX: Float32Array;
    offY: Float32Array;
  }[];
  readonly common: Float32Array[];
  private readonly out: BakedSquad = { fit: 1, offX: 0, offY: 0 };

  constructor(
    readonly from: number,
    readonly step: number,
    readonly steps: number,
    squads: number,
    frees: number,
  ) {
    this.to = from + (steps - 1) * step;
    this.squad = Array.from({ length: squads }, () => ({
      fit: new Float32Array(steps),
      offX: new Float32Array(steps),
      offY: new Float32Array(steps),
    }));
    this.common = Array.from({ length: frees }, () => new Float32Array(steps));
  }

  finish(): void {
    const reach = Math.round(BAKE_LEAST_P / this.step);
    const sigma = BAKE_EASE_P / this.step;
    for (const s of this.squad) {
      fillGaps(s.fit, 1);
      fillGaps(s.offX, 0);
      fillGaps(s.offY, 0);
      ease(least(s.fit, reach), sigma, s.fit);
      ease(s.offX, sigma, s.offX);
      ease(s.offY, sigma, s.offY);
    }
    for (const c of this.common) ease(least(c, reach), sigma, c);
  }

  squadAt(i: number, p: number): BakedSquad {
    const s = this.squad[i];
    this.out.fit = this.read(s.fit, p);
    this.out.offX = this.read(s.offX, p);
    this.out.offY = this.read(s.offY, p);
    return this.out;
  }

  at(i: number, p: number): number {
    return this.read(this.common[i], p);
  }

  private read(t: Float32Array, p: number): number {
    const x = Math.min(
      this.steps - 1,
      Math.max(0, (p - this.from) / this.step),
    );
    const k = Math.min(this.steps - 2, Math.floor(x));
    return t[k] + (t[k + 1] - t[k]) * (x - k);
  }
}

/** NaN entries (nothing there at that step) filled from their neighbours, or `fallback`. */
function fillGaps(t: Float32Array, fallback: number): void {
  let last = Number.NaN;
  for (let i = 0; i < t.length; i++) {
    if (Number.isNaN(t[i])) t[i] = last;
    else last = t[i];
  }
  last = Number.NaN;
  for (let i = t.length - 1; i >= 0; i--) {
    if (Number.isNaN(t[i])) t[i] = last;
    else last = t[i];
  }
  for (let i = 0; i < t.length; i++) if (Number.isNaN(t[i])) t[i] = fallback;
}

/** The least value within `reach` steps either side. */
function least(t: Float32Array, reach: number): Float32Array {
  const out = new Float32Array(t.length);
  for (let i = 0; i < t.length; i++) {
    let m = Number.POSITIVE_INFINITY;
    const end = Math.min(t.length - 1, i + reach);
    for (let k = Math.max(0, i - reach); k <= end; k++) m = Math.min(m, t[k]);
    out[i] = m;
  }
  return out;
}

/** A Gaussian of `sigma` steps over a table (the ends held), into `out`. */
function ease(t: Float32Array, sigma: number, out: Float32Array): void {
  const r = Math.ceil(3 * sigma);
  const kernel = new Float64Array(2 * r + 1);
  let total = 0;
  for (let k = -r; k <= r; k++) {
    kernel[k + r] = Math.exp(-(k * k) / (2 * sigma * sigma));
    total += kernel[k + r];
  }
  const src = Float32Array.from(t);
  for (let i = 0; i < t.length; i++) {
    let sum = 0;
    for (let k = -r; k <= r; k++)
      sum += src[Math.min(t.length - 1, Math.max(0, i + k))] * kernel[k + r];
    out[i] = sum / total;
  }
}

/** How many of a squadron's ships are there, each as much as she is (against its whole). */
function presentCount(g: Formation): number {
  const it = g.layer.intent;
  let most = 0;
  for (const i of g.places) most = Math.max(most, it.opacity[i]);
  if (most <= 0) return 0;
  let count = 0;
  for (const i of g.places) count += Math.min(1, it.opacity[i] / most);
  return count;
}

/** A heading turned toward another by a share t, the short way round (radians). */
function turn(from: number, to: number, t: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;
}

/**
 * The weighted median of the first n values, interpolated by cumulative
 * weight so it moves smoothly as the values and their weights do (each
 * value spans its weight; the median is read where half the total falls,
 * between the middles of the spans either side). No allocation.
 */
function weightedMedian(
  values: Float64Array,
  weights: Float64Array,
  order: Int32Array,
  n: number,
): number {
  let m = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (weights[i] <= 0) continue;
    order[m++] = i;
    total += weights[i];
  }
  if (m === 0) return 1;
  for (let i = 1; i < m; i++) {
    const x = order[i];
    let j = i - 1;
    while (j >= 0 && values[order[j]] > values[x]) {
      order[j + 1] = order[j];
      j--;
    }
    order[j + 1] = x;
  }
  const half = total / 2;
  let before = 0;
  let prevMid = 0;
  let prevValue = values[order[0]];
  for (let i = 0; i < m; i++) {
    const w = weights[order[i]];
    const mid = before + w / 2;
    const value = values[order[i]];
    if (mid >= half) {
      if (i === 0) return value;
      const t = (half - prevMid) / Math.max(mid - prevMid, 1e-12);
      return prevValue + (value - prevValue) * t;
    }
    before += w;
    prevMid = mid;
    prevValue = value;
  }
  return prevValue;
}

/**
 * The scales s ≥ 0 at which s·coef ≤ rhs: an upper bound (an interval from
 * 0), a lower bound (from some s on), all or none. Folded into the running
 * least upper and lower bounds of `contact` and `mutual`.
 */
let upperBound = -1;
let lowerBound = Number.POSITIVE_INFINITY;
function apart(coef: number, rhs: number): void {
  if (coef > 1e-12) {
    if (rhs >= 0) upperBound = Math.max(upperBound, rhs / coef);
  } else if (coef < -1e-12)
    lowerBound = Math.min(lowerBound, Math.max(0, rhs / coef));
  else if (rhs >= 0) upperBound = Number.POSITIVE_INFINITY;
}

/** The largest s from 0 up to which some way of being apart holds throughout. */
function firstContact(): number {
  if (lowerBound <= 0) return Number.POSITIVE_INFINITY;
  if (upperBound < 0) return 0;
  if (lowerBound <= upperBound) return Number.POSITIVE_INFINITY;
  return upperBound;
}

/**
 * How far a box may grow about a point before it touches the box
 * [qx0, qx1] × [qy0, qy1]: at scale s it spans [ax + s·x0, ax + s·x1] ×
 * [ay + s·y0, ay + s·y1]. The largest s from 0 up to which they stay apart
 * (0 if they already meet, infinite if they never do).
 */
function contact(
  ax: number,
  ay: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  qx0: number,
  qy0: number,
  qx1: number,
  qy1: number,
): number {
  upperBound = -1;
  lowerBound = Number.POSITIVE_INFINITY;
  apart(x1, qx0 - ax); // its right edge left of the other's left
  apart(-x0, ax - qx1); // its left edge right of the other's right
  apart(y1, qy0 - ay); // its top below the other's bottom
  apart(-y0, ay - qy1); // its bottom above the other's top
  return firstContact();
}

/**
 * How far two glyphs' boxes may grow alike about their feet before they
 * touch, a gap g kept: the second's foot at (dx, dy) from the first's;
 * each box [-l·s, r·s] × [0, t·s] about its foot.
 */
function mutual(
  dx: number,
  dy: number,
  al: number,
  ar: number,
  at: number,
  cl: number,
  cr: number,
  ct: number,
  g: number,
): number {
  upperBound = -1;
  lowerBound = Number.POSITIVE_INFINITY;
  apart(ar + cl, dx - g); // the second right of the first
  apart(al + cr, -dx - g); // the second left of the first
  apart(at, dy - g); // the second's foot above the first's top
  apart(ct, -dy - g); // the first's foot above the second's top
  return firstContact();
}
