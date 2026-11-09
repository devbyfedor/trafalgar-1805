import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { CoastField } from "../terrain/coast";
import type { GlyphExtent } from "./atlas";
import type { Glyphs } from "./Glyphs";
import { glyphPxAt } from "./height";

/**
 * Where every ship glyph stands on screen, how tall and how much of it
 * shows, decided on the CPU each frame for all glyph layers together, so
 * that no glyph's drawing ever touches land or another glyph's (docs/
 * decisions.md, "Scene 2: ships that never touch land or each other").
 *
 * The rules are pure functions of the frame (the scene is a function of its
 * scroll and plays back alike), and continuous, so nothing jumps:
 *
 * - A glyph is its drawing's box on screen (the atlas's extents of its
 *   type, mirrored with its facing, narrowed end-on, a pen's room round
 *   it), reaching down to its foot. Boxes nest as a glyph shrinks about its
 *   foot, so shrinking never makes an overlap.
 * - Land: a screen disc is clear when the coast lies farther from its
 *   centre on the chart than the disc can reach there (the coast distance
 *   is 1-Lipschitz; the reach is the disc's radius times the most km a
 *   pixel spans at its far edge). A box is covered by a few discs; how far
 *   it may grow before one of them touches land is traced out from nothing
 *   in steps the slack allows, so the first contact is found, and found
 *   again as the camera moves. Land too deep in the haze to show doesn't
 *   count.
 * - Glyphs placed earlier are obstacles for later ones; how far a box may
 *   grow before it meets one is solved exactly.
 * - Ships at their true places (FreeGroup) keep them: a group takes a
 *   common size from its ships' usual spacing, and a ship crowded closer
 *   than that by one placed before her yields: she draws smaller, and
 *   fades once too small to read.
 * - A squadron (Formation) is a symbol drawn at the head of its track: a
 *   block of files along its heading in open water; where that does not
 *   fit, it re-forms through the water into one line along its heading,
 *   then shrinks; ships too small to read fade. Every re-forming runs in
 *   phases that keep each box clear of the others at every moment, the
 *   spacing set by the boxes' support.
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
  /** Files in its block. */
  files: number;
  /** The head: world km, and heading (radians from north, clockwise). */
  x: number;
  y: number;
  heading: number;
  /** A squadron it meets, and how far into the meeting (0..1). */
  meets: Formation | null;
  meeting: number;
  /** In a meeting, its line is drawn above the other's on screen. */
  above?: boolean;
}

export type GlyphGroup = FreeGroup | Formation;

/** Below this height a glyph has faded out, CSS px. */
const READABLE_PX = 7;
/** It is fully there from this height, CSS px. */
const FULL_PX = 9.5;
/** Clear water kept between a glyph's drawing and the coastline's ink, CSS px. */
const LAND_GAP_PX = 1.75;
/** Half the coastline's width at its widest (uCoastPx), CSS px. */
const COAST_HALF_PX = 0.75;
/** Room between two glyphs' drawings, CSS px. */
const GLYPH_GAP_PX = 1.5;
/** Room round a drawing for its pens and antialiasing, device px. */
const PEN_PX = 1;
/**
 * Land farther than this many haze visibilities can't be seen: the clash
 * probe counts land whose share left by the haze is at least 0.1, which
 * ends at sqrt(ln 10) ≈ 1.52 visibilities.
 */
const HAZE_SEEN = 1.6;
/** Discs across and up a glyph's box when testing it against land. */
const DISCS_X = 3;
const DISCS_Y = 2;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

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
  /** Haze: sea farther than this shows no land. */
  seen = 1e9;
  /** The view's right on the chart, normalised (facings). */
  rx = 1;
  ry = 0;
  /** Last projection: screen px (y up). */
  px = 0;
  py = 0;
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
  private readonly near: Float64Array;
  /** A formation's places: block offsets (along, across) and the line's. */
  private readonly blockAlong: Float64Array;
  private readonly blockAcross: Float64Array;
  private readonly lineAlong: Float64Array;
  private readonly layers: readonly Glyphs[];
  /** Device px of clear water round a glyph's drawing, this frame. */
  private landMargin = 4;
  private glyphGap = 2;
  private dpr = 1;
  private sizeRef = 100;
  private nominal = 30;
  /** Last box built (boxOf) and last offset (offsetAt). */
  private boxL = 0;
  private boxR = 0;
  private boxT = 0;
  private offX = 0;
  private offY = 0;
  /** A block's centre from its head and its radius (buildShape); a push (pushToWater). */
  private centreX = 0;
  private centreY = 0;
  private radius = 0;
  private pushX = 0;
  private pushY = 0;
  private cenX = 0;
  private cenY = 0;
  /** Development: each squadron's layout this frame, when asked for (debugNext). */
  debug: Record<string, unknown>[] | null = null;
  /** Squadrons laid out this frame (a meeting lays out both at once). */
  private readonly placed = new Set<Formation>();

  constructor(
    private readonly coast: CoastField | null,
    private readonly groups: readonly GlyphGroup[],
  ) {
    const layers = new Set<Glyphs>();
    let largest = 1;
    for (const g of groups) {
      layers.add(g.layer);
      const n = g.kind === "free" ? g.members.length : g.places.length;
      largest = Math.max(largest, n);
    }
    this.layers = [...layers];
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
    this.near = f64(largest);
    this.blockAlong = f64(largest);
    this.blockAcross = f64(largest);
    this.lineAlong = f64(largest);
  }

  update(frame: FrameInfo): void {
    this.view.set(frame);
    this.dpr = frame.dpr;
    this.landMargin = (COAST_HALF_PX + LAND_GAP_PX) * frame.dpr + PEN_PX;
    this.glyphGap = GLYPH_GAP_PX * frame.dpr;
    this.nominal = glyphPxAt(frame.eye.z) * frame.dpr;
    this.sizeRef = Math.hypot(
      frame.target.x - frame.eye.x,
      frame.target.y - frame.eye.y,
      frame.eye.z,
    );
    // Nothing is drawn unless a group places it.
    for (const l of this.layers) l.drawn.alpha.fill(0);
    this.obstacles = 0;
    this.placed.clear();
    for (const g of this.groups) {
      if (g.kind === "free") this.layoutFree(g);
      else this.layoutFormation(g);
    }
  }

  dispose(): void {}

  // ---- Common -------------------------------------------------------------

  /** A glyph's nominal height on screen at a distance, device px. */
  private heightAt(dist: number, size: number): number {
    const k = Math.min(
      1.8,
      Math.max(0.55, this.sizeRef / Math.max(dist, 1e-6)),
    );
    return this.nominal * k ** 0.35 * size;
  }

  /**
   * A mark's box about its foot at height h (device px), into boxL, boxR
   * and boxT (its bottom is the foot): its drawing's extents, mirrored and
   * narrowed by its facing as the shader draws it (both facings' while it
   * crossfades end-on), and a pen's room round it.
   */
  private boxOf(layer: Glyphs, index: number, heading: number, h: number) {
    const e = layer.extentOf(index, this.ext);
    const facing = this.view.facing(heading);
    const sx = 0.3 + 0.7 * Math.abs(facing);
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
    this.boxL = l * sx * h + PEN_PX;
    this.boxR = r * sx * h + PEN_PX;
    this.boxT = (layer.foot + e.top) * h + PEN_PX;
  }

  /** Records a placed glyph's box (scale s of member k's) as an obstacle. */
  private addObstacle(fx: number, fy: number, s: number, k: number): void {
    const o = this.obstacles++;
    this.ox0[o] = fx - s * this.bl[k];
    this.ox1[o] = fx + s * this.br[k];
    this.oy0[o] = fy;
    this.oy1[o] = fy + s * this.bt[k];
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
   * How much farther a screen disc could reach before land, px (negative
   * once it touches): the disc's centre (cx, cy), radius r (device px, the
   * margin included).
   */
  private slack(cx: number, cy: number, r: number): number {
    const v = this.view;
    const coast = this.coast;
    if (!coast) return 1e9;
    // Its nearest point to the eye (the lowest on screen) above the
    // horizon, or deeper in the haze than land can show: all of it is.
    if (!v.unproject(cx, cy - r) || v.qt > v.seen) return 1e9;
    const x = cx;
    let y = cy;
    let rad = r;
    if (!v.unproject(cx, cy)) {
      // Its centre above the horizon: test the part below it from its
      // lowest point, with room for the whole disc.
      y = cy - r;
      rad = 2 * r;
      v.unproject(x, y);
    }
    const d = coast.distance(v.qx, v.qy) - 0.3 * coast.texelKm(v.qx, v.qy);
    // The most km a pixel spans in the disc: at its far edge (highest on
    // screen), or at the haze's reach if that lies beyond the horizon.
    const far = v.unproject(x, y + rad) ? Math.min(v.qt, v.seen) : v.seen;
    return d / v.kmPerPx(far) - rad;
  }

  /**
   * How far a box may grow about a point, up to `limit`, before it nears
   * land: at scale s the box spans [ax + s·x0, ax + s·x1] ×
   * [ay + s·y0, ay + s·y1], covered by a grid of discs centred at
   * (ax + s·u, ay + s·w) with radius s·ρ plus the margin. Each disc is
   * traced out from s = 0 in steps its slack allows, so the first contact
   * is found, and found again as the camera moves.
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
    const w = x1 - x0;
    const hgt = y1 - y0;
    // The open sea's case: everything the box sweeps on its way from the
    // point to the limit (the hull of the point and the box) in one disc.
    {
      const lx = Math.min(0, limit * x0);
      const hx = Math.max(0, limit * x1);
      const ly = Math.min(0, limit * y0);
      const hy = Math.max(0, limit * y1);
      const rad = Math.hypot(hx - lx, hy - ly) / 2 + m;
      if (this.slack(ax + (lx + hx) / 2, ay + (ly + hy) / 2, rad) >= 0)
        return limit;
    }
    let best = limit;
    const cw = w / DISCS_X;
    const ch = hgt / DISCS_Y;
    const rho = Math.hypot(cw, ch) / 2;
    for (let j = 0; j < DISCS_Y && best > 0; j++) {
      for (let i = 0; i < DISCS_X && best > 0; i++) {
        const ux = x0 + (i + 0.5) * cw;
        const uy = y0 + (j + 0.5) * ch;
        // How fast the disc's far edge moves as s grows, px per unit s.
        const rate = Math.hypot(ux, uy) + rho;
        let s = 0;
        for (let it = 0; it < 32 && s < best; it++) {
          const sl = this.slack(ax + s * ux, ay + s * uy, s * rho + m);
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
  ): void {
    const v = this.view;
    const d = layer.drawn;
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
    d.alpha[index] = h > 0.01 ? alpha : 0;
    d.wakeShare[index] = wakeShare;
  }

  /** How much of a glyph this tall shows (device px). */
  private shows(h: number): number {
    return smoothstep(READABLE_PX * this.dpr, FULL_PX * this.dpr, h);
  }

  // ---- Ships at their true places -----------------------------------------

  private layoutFree(g: FreeGroup): void {
    const layer = g.layer;
    const it = layer.intent;
    const v = this.view;
    const n = g.members.length;
    let present = 0;
    // Each ship's foot, nominal height and box at scale 1.
    for (let k = 0; k < n; k++) {
      const i = g.members[k];
      this.h0[k] = 0;
      if (it.opacity[i] <= 0.001) continue;
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
      present++;
    }
    if (present === 0) return;
    // The group's common scale: the median of how far each ship may grow
    // before she meets her nearest companion, both growing alike.
    let m = 0;
    for (let a = 0; a < n; a++) {
      if (this.h0[a] <= 0) continue;
      let best = 1;
      for (let c = 0; c < n; c++) {
        if (c === a || this.h0[c] <= 0) continue;
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
        if (s < best) best = s;
      }
      this.near[m++] = best;
    }
    const common = Math.min(1, median(this.near, m));
    // In priority order: each ship as large as the common scale, her own
    // water and the glyphs placed before her allow.
    for (let k = 0; k < n; k++) {
      if (this.h0[k] <= 0) continue;
      const i = g.members[k];
      const fx = this.fx[k];
      const fy = this.fy[k];
      const l = this.bl[k];
      const r = this.br[k];
      const t = this.bt[k];
      let s = this.obstacleFit(fx, fy, -l, r, 0, t, common);
      s = this.landFit(fx, fy, -l, r, 0, t, s);
      const h = s * this.h0[k];
      this.draw(
        layer,
        i,
        fx,
        fy,
        it.heading[i],
        h,
        it.opacity[i] * this.shows(h),
        1,
      );
      if (h > 0.01) this.addObstacle(fx, fy, s, k);
    }
  }

  // ---- Squadrons ------------------------------------------------------------

  private layoutFormation(g: Formation): void {
    if (this.placed.has(g)) return;
    const layer = g.layer;
    const it = layer.intent;
    const v = this.view;
    const n = g.places.length;
    if (!v.project(g.x, g.y, 0)) return;
    let ax = v.px;
    let ay = v.py;
    // The heading's direction on screen (a).
    if (!v.project(g.x + Math.sin(g.heading), g.y + Math.cos(g.heading), 0))
      return;
    let axx = v.px - ax;
    let axy = v.py - ay;
    {
      const l = Math.hypot(axx, axy) || 1;
      axx /= l;
      axy /= l;
    }
    const dist = Math.hypot(g.x - v.ex, g.y - v.ey, v.ez);
    // A box that holds any ship of the squadron in any facing: the widest
    // reach either side at full width, the tallest.
    let reach = 0;
    let top = 0;
    let present = 0;
    let h = 0;
    for (let k = 0; k < n; k++) {
      const i = g.places[k];
      if (it.opacity[i] <= 0.001) continue;
      present++;
      const e = layer.extentOf(i, this.ext);
      reach = Math.max(reach, e.left, e.right);
      top = Math.max(top, e.top);
      h = Math.max(h, this.heightAt(dist, it.size[i]));
    }
    if (present === 0) return;
    const half = reach * h + PEN_PX;
    const tall = (layer.foot + top) * h + PEN_PX;
    const gap = this.glyphGap;
    const ww = 2 * half + gap;
    const hh = tall + gap;
    const files = Math.max(1, Math.min(g.files, n));
    // Off the coast into open water, if the block would not fit where its
    // head is.
    this.buildShape(n, files, axx, axy, ww, hh);
    this.pushToWater(ax + this.centreX, ay + this.centreY, this.radius);
    ax += this.pushX;
    ay += this.pushY;
    // Meeting another squadron: both turn into lines on one axis across
    // the line between them, each on its own side of the midpoint, a clear
    // lane between, as a battle plan sets two fleets.
    let heading = g.heading;
    let lineFloor = 0;
    let cap = 1;
    let shift = 0;
    const other = g.meets;
    if (other && g.meeting > 0.001 && v.project(other.x, other.y, 0)) {
      const bxp = v.px;
      const byp = v.py;
      // Lines across the screen, one above the other, as a plan of a
      // battle draws two fleets passing: each ship broadside on, the lead
      // at the end her heading points to.
      const tx = axx >= 0 ? 1 : -1;
      const side = g.above ? 1 : -1;
      const e = smoothstep(0, 1, g.meeting);
      axx += (tx - axx) * e;
      axy += (0 - axy) * e;
      const l = Math.hypot(axx, axy) || 1;
      axx /= l;
      axy /= l;
      // A lane of open water between the lines, 0.6 of a ship high.
      const sep = 0.3 * tall + 0.5 * gap;
      const fx = (ax + bxp) / 2;
      const fy = (ay + byp) / 2 + side * sep - (side < 0 ? tall : 0);
      // Each line no longer than half the screen's width.
      const most = Math.max(n, other.places.length);
      cap = 1 + (Math.min(1, (0.5 * v.w) / (most * ww)) - 1) * e;
      shift = ((n - 1) / 2) * e;
      ax += (fx - ax) * e;
      ay += (fy - ay) * e;
      lineFloor = smoothstep(0, 0.5, g.meeting);
      // Ships sail along their line.
      if (v.unproject(ax, ay)) {
        const x0 = v.qx;
        const y0 = v.qy;
        if (v.unproject(ax + axx * 20, ay + axy * 20)) {
          const lineHeading = Math.atan2(v.qx - x0, v.qy - y0);
          heading = turn(g.heading, lineHeading, e);
        }
      }
      this.buildShape(n, files, axx, axy, ww, hh, shift);
    }
    const bx = -axy;
    const by = axx;
    // How well the block fits, and the line; the morph between them.
    let morph = lineFloor;
    const sBlock =
      morph >= 1
        ? 0
        : this.shapeFit(g, ax, ay, axx, axy, bx, by, morph, half, tall);
    if (files > 1 && sBlock < 0.999 && morph < 1) {
      const sLine = this.shapeFit(g, ax, ay, axx, axy, bx, by, 1, half, tall);
      morph = Math.max(
        morph,
        (1 - smoothstep(0.85, 1.0, sBlock)) *
          smoothstep(0.0, 0.25, sLine - sBlock),
      );
    }
    const scale = Math.min(
      cap,
      morph === lineFloor && morph < 1
        ? sBlock
        : this.shapeFit(g, ax, ay, axx, axy, bx, by, morph, half, tall),
    );
    // Each ship at her place in the shape, scaled about its centre; then
    // her own drawing's box against land and the glyphs placed before.
    this.centroidAt(n, morph, axx, axy, bx, by);
    const cenX = this.cenX;
    const cenY = this.cenY;
    for (let k = 0; k < n; k++) {
      const i = g.places[k];
      if (it.opacity[i] <= 0.001) continue;
      this.offsetAt(k, morph, axx, axy, bx, by);
      const fx = ax + cenX + scale * (this.offX - cenX);
      const fy = ay + cenY + scale * (this.offY - cenY);
      this.boxOf(layer, i, heading, h);
      this.bl[k] = this.boxL;
      this.br[k] = this.boxR;
      this.bt[k] = this.boxT;
      let s = this.obstacleFit(
        fx,
        fy,
        -this.boxL,
        this.boxR,
        0,
        this.boxT,
        scale,
      );
      s = this.landFit(fx, fy, -this.boxL, this.boxR, 0, this.boxT, s);
      const hd = s * h;
      this.draw(
        layer,
        i,
        fx,
        fy,
        heading,
        hd,
        it.opacity[i] * this.shows(hd),
        k === 0 ? 1 : 0.45,
      );
      if (hd > 0.01) this.addObstacle(fx, fy, s, k);
    }
    this.placed.add(g);
    if (this.debug)
      this.debug.push({
        places: g.places[0],
        head: [v.project(g.x, g.y, 0) ? v.px : -1, v.py],
        anchor: [ax, ay],
        push: [this.pushX, this.pushY],
        radius: this.radius,
        sBlock,
        morph,
        scale,
        h,
      });
    // The squadron it meets next, against this one's ships.
    if (other && g.meeting > 0.001 && !this.placed.has(other))
      this.layoutFormation(other);
  }

  /**
   * Each place's offset from the head at scale 1, block and line, along
   * the axis (axx, axy); and the block's centre and radius (centreX,
   * centreY, radius) for pushing it off the coast. Spacing from the support
   * of two boxes' difference (half-widths ww and hh with the gap): files
   * apart by their support across never touch, whatever their offsets
   * along; the ranks of one line apart by its support along never touch,
   * whatever their offsets across; ranks of one file need only clear it
   * along the file. `shift` moves the line along its axis by that many
   * places (the same for all, so they keep apart).
   */
  private buildShape(
    n: number,
    files: number,
    axx: number,
    axy: number,
    ww: number,
    hh: number,
    shift = 0,
  ): void {
    const bx = -axy;
    const by = axx;
    const across = ww * Math.abs(bx) + hh * Math.abs(by);
    const along = ww * Math.abs(axx) + hh * Math.abs(axy);
    const inFile = Math.min(
      ww / Math.max(Math.abs(axx), 1e-6),
      hh / Math.max(Math.abs(axy), 1e-6),
    );
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < n; k++) {
      this.blockAlong[k] = -(k / files) * inFile;
      this.blockAcross[k] = (fileOf(k, files) - (files - 1) / 2) * across;
      this.lineAlong[k] = (shift - k) * along;
      cx += this.blockAlong[k] * axx + this.blockAcross[k] * bx;
      cy += this.blockAlong[k] * axy + this.blockAcross[k] * by;
    }
    cx /= n;
    cy /= n;
    let r = 0;
    for (let k = 0; k < n; k++) {
      const ox = this.blockAlong[k] * axx + this.blockAcross[k] * bx;
      const oy = this.blockAlong[k] * axy + this.blockAcross[k] * by;
      r = Math.max(r, Math.hypot(ox - cx, oy - cy));
    }
    this.centreX = cx;
    this.centreY = cy + hh / 2;
    this.radius = r + Math.hypot(ww, hh) / 2;
  }

  /**
   * How far to move a squadron's symbol off the coast, screen px, into
   * pushX, pushY: the block's centre is pushed along the coast distance's
   * slope, taken across the block's own width (so it is smooth everywhere
   * and fades to nothing midway between two coasts), by what its water
   * lacks, each step short of the nearest coast, eight times over; never more than one and a half times its
   * radius from where it was.
   */
  private pushToWater(cx: number, cy: number, radius: number): void {
    this.pushX = 0;
    this.pushY = 0;
    const v = this.view;
    const coast = this.coast;
    if (!coast) return;
    let x = cx;
    let y = cy;
    for (let iter = 0; iter < 8; iter++) {
      if (!v.unproject(x, y) || v.qt > v.seen) break;
      const qx = v.qx;
      const qy = v.qy;
      const kmpp = v.kmPerPx(v.qt);
      const need = (radius + this.landMargin) * kmpp;
      const d = coast.distance(qx, qy);
      const deficit = need - d;
      if (deficit <= 0) break;
      // The slope across the water's own reach here (no less than a few
      // pixels): never a step past the nearest coast.
      const reach = Math.max(d, 6 * kmpp);
      const gx =
        (coast.distance(qx + reach, qy) - coast.distance(qx - reach, qy)) /
        (2 * reach);
      const gy =
        (coast.distance(qx, qy + reach) - coast.distance(qx, qy - reach)) /
        (2 * reach);
      const k =
        Math.min(deficit, 0.8 * reach) / Math.max(Math.hypot(gx, gy), 0.35);
      if (!v.project(qx + gx * k, qy + gy * k, 0)) break;
      x = v.px;
      y = v.py;
    }
    let dx = x - cx;
    let dy = y - cy;
    const dl = Math.hypot(dx, dy);
    const cap = 1.5 * radius;
    if (dl > cap) {
      dx *= cap / dl;
      dy *= cap / dl;
    }
    this.pushX = dx;
    this.pushY = dy;
  }

  /**
   * A place's offset from the head at scale 1, at a morph from the block
   * (0) to the line (1), into offX, offY: first the ranks spread along to
   * the line's spacing, the files keeping apart; then the files close
   * onto the line.
   */
  private offsetAt(
    k: number,
    morph: number,
    axx: number,
    axy: number,
    bx: number,
    by: number,
  ): void {
    const spread = smoothstep(0, 0.5, morph);
    const close = smoothstep(0.5, 1, morph);
    const a =
      this.blockAlong[k] + (this.lineAlong[k] - this.blockAlong[k]) * spread;
    const c = this.blockAcross[k] * (1 - close);
    this.offX = a * axx + c * bx;
    this.offY = a * axy + c * by;
  }

  /**
   * The shape's centre at a morph, from the head (every place counted,
   * filled or not, so it holds still as ships come and go): into cenX,
   * cenY. A squadron shrinks toward it.
   */
  private centroidAt(
    n: number,
    morph: number,
    axx: number,
    axy: number,
    bx: number,
    by: number,
  ): void {
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < n; k++) {
      this.offsetAt(k, morph, axx, axy, bx, by);
      cx += this.offX;
      cy += this.offY;
    }
    this.cenX = cx / Math.max(1, n);
    this.cenY = cy / Math.max(1, n);
  }

  /**
   * The largest scale (≤ 1) at which the squadron's shape at a morph fits:
   * every place's box grown about the shape's centre from nothing until it
   * meets land or a placed glyph.
   */
  private shapeFit(
    g: Formation,
    ax: number,
    ay: number,
    axx: number,
    axy: number,
    bx: number,
    by: number,
    morph: number,
    half: number,
    tall: number,
  ): number {
    const it = g.layer.intent;
    let best = 1;
    this.centroidAt(g.places.length, morph, axx, axy, bx, by);
    const ox = ax + this.cenX;
    const oy = ay + this.cenY;
    const cenX = this.cenX;
    const cenY = this.cenY;
    for (let k = 0; k < g.places.length && best > 0; k++) {
      if (it.opacity[g.places[k]] <= 0.001) continue;
      this.offsetAt(k, morph, axx, axy, bx, by);
      const x0 = this.offX - cenX - half;
      const x1 = this.offX - cenX + half;
      const y0 = this.offY - cenY;
      const y1 = this.offY - cenY + tall;
      let s = this.obstacleFit(ox, oy, x0, x1, y0, y1, best);
      s = this.landFit(ox, oy, x0, x1, y0, y1, s);
      if (s < best) best = s;
    }
    return best;
  }
}

/** A heading turned toward another by a share t, the short way round (radians). */
function turn(from: number, to: number, t: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;
}

/** Which file a rank sails in: with three, the lead in the middle. */
function fileOf(k: number, files: number): number {
  if (files !== 3) return k % files;
  const f = k % 3;
  return f === 0 ? 1 : f === 1 ? 0 : 2;
}

/** The middle value of the first m entries (sorted in place, no allocation). */
function median(values: Float64Array, m: number): number {
  if (m === 0) return 1;
  for (let i = 1; i < m; i++) {
    const x = values[i];
    let j = i - 1;
    while (j >= 0 && values[j] > x) {
      values[j + 1] = values[j];
      j--;
    }
    values[j + 1] = x;
  }
  return m % 2 ? values[(m - 1) / 2] : (values[m / 2 - 1] + values[m / 2]) / 2;
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
