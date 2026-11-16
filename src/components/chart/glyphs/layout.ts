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
 *   water; one scale shared by every squadron on screen. Two squadrons
 *   meeting zip into two lines on the action's course, one above the
 *   other, a lane between.
 * - A group shows as far as its host says (`shown`): far off, the chart
 *   shows a fleet by its track alone, and its ships come in as the camera
 *   comes down. A group not shown is not laid out at all.
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
  /**
   * How much of the group shows (0..1, 1 when not set): its ships fade
   * together, at their sizes, and a group not shown is not laid out.
   */
  shown?: number;
  /**
   * Groups with the same gate come in together, and only where every one
   * of their ships reads one by one (a fleet's ships of the line, whose
   * label gives way to them as they come in: gateShown). Without a gate a
   * group's lead stands for it where its ships are too crowded to read.
   */
  gate?: number;
  /**
   * The group comes and goes with its gate but doesn't hold it (small
   * craft keeping with a fleet's body, uncounted: neither must they read
   * for it to come in).
   */
  gateFollows?: boolean;
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
  /**
   * In a meeting, the action's course both squadrons take (radians),
   * unwrapped against `heading`: the formation turns from its heading onto
   * it in a straight line through the angles (`course - heading` is the
   * turn, the way round included). The scene chooses the way round, so it
   * never flips: taken the short way frame by frame, a squadron heading
   * nearly opposite the course swung from one way round to the other as its
   * own heading drifted, and its glyphs mirrored within a step.
   */
  course?: number;
  /** How much of the squadron shows (0..1, 1 when not set), as FreeGroup.shown. */
  shown?: number;
}

export type GlyphGroup = FreeGroup | Formation;

/** Below this a group isn't laid out at all. */
const SHOWN_MIN = 0.001;

/** How much of a group shows (FreeGroup.shown, Formation.shown). */
function shownOf(g: GlyphGroup): number {
  return g.shown === undefined ? 1 : Math.min(1, Math.max(0, g.shown));
}

/** Below this height a glyph has faded out, CSS px. */
const READABLE_PX = 7;
/** It is fully there from this height, CSS px. */
const FULL_PX = 9.5;
/**
 * The least height the squadrons' shared scale draws their ships at, CSS
 * px (the atlas's 17 px drawing at the owner's 1.5 device pixels still
 * shows a three-master): a squadron squeezed by land below it shrinks
 * alone, and never drags the others down with it.
 */
const FLOOR_PX = 11;
/** Clear water kept between a glyph's ink and the coastline's, CSS px. */
const LAND_GAP_PX = 1.75;
/** Half the coastline's width at its widest (uCoastPx) and its antialiasing, CSS px. */
const COAST_HALF_PX = 1;
/**
 * A shape's spacing a little wider than the room it must keep between
 * its ships (device px), so the clamps that keep it never find two of them
 * exactly touching, where rounding would close them up.
 */
const SLACK_PX = 1.5;
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
/** The easing of each glyph's baked size, in p (its least taken over 3σ). */
const BAKE_SIZE_EASE_P = 0.002;
/** Below this a glyph is a speck, whatever was baked (CSS px). */
const SPECK_PX = 4.5;
/** The most a glyph's foot may move in half a bake step and count as motion (CSS px). */
const SWEEP_MAX_PX = 60;
/**
 * A glyph whose foot lies farther off the screen than this (CSS px) is not
 * laid out: no box it can have (with its wake and the sweeps) reaches back
 * onto the screen or near a glyph that does, so leaving it out changes
 * nothing drawn. The lab's fleets stood thousands of pixels off screen as
 * its flight climbed north, and their wakes' fits against the land, traced
 * in a stretched corner of the projection, had cost 6 ms a frame.
 */
const OFF_SCREEN_PX = 400;
/**
 * A gate holds only as far as the view looks down on its group: the eye's
 * height over its distance (as HeadLabels fades its labels, which can't be
 * read on a chart seen this low).
 */
const GATE_TILT: readonly [number, number] = [0.1, 0.25];
/** How far a meeting line's label anchors stand off its ships' box (lineAnchorOf), CSS px. */
const LINE_LABEL_CLEAR_PX = 12;

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
  /** While baking the sizes, which way and how far each moves between steps (sweepFor, signed). */
  private readonly osx: Float64Array;
  private readonly osy: Float64Array;
  private obstacles = 0;
  /** Per member of the group being laid out. */
  private readonly fx: Float64Array;
  private readonly fy: Float64Array;
  private readonly bl: Float64Array;
  private readonly br: Float64Array;
  private readonly bt: Float64Array;
  private readonly h0: Float64Array;
  private readonly wt: Float64Array;
  /** Each member's weight toward her group's common scale (commonOf): wt, but nothing for a ship apart from the gate. */
  private readonly wc: Float64Array;
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
  /**
   * While baking the sizes: each glyph's foot on the chart at the step
   * before, so her land is fitted over the whole way she moves against it
   * between steps (sweepFor), not only where she stands at each.
   */
  private sweeping = false;
  private sweepX: Float64Array[] = [];
  private sweepY: Float64Array[] = [];
  private sweepOk: Uint8Array[] = [];
  /**
   * While baking the sizes: each glyph's foot on screen at the step before
   * (as drawn there), and at this step as laid out so far. Against other
   * glyphs what counts is how she moves on screen, the camera's own motion
   * included: two ships at different distances part or close as the camera
   * moves (a frigate passing the corner of the allied lead's box as the
   * camera rose off the sea, squeezed for one frame between two steps).
   */
  private screenX: Float64Array[] = [];
  private screenY: Float64Array[] = [];
  private screenPrevX: Float64Array[] = [];
  private screenPrevY: Float64Array[] = [];
  /**
   * The sweep of the glyph being laid out: half-extents, px, against the
   * land; and signed, on screen, against other glyphs'.
   */
  private swX = 0;
  private swY = 0;
  private swDX = 0;
  private swDY = 0;
  /** Development: the obstacle that last limited obstacleFit (-1 for none). */
  private hit = -1;
  /** Each gate's opening this frame (setGates; FreeGroup.gate). */
  private readonly gateValue: Float64Array;
  /** The tables whose glyph sizes limit this frame's (none while baking). */
  private ratios: Bake | null = null;
  /** Each layer's index among the layers. */
  private readonly layerIndex = new Map<Glyphs, number>();
  /** Development: whether this frame reads the baked tables. */
  private usingTables = false;
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
    let gates = 0;
    for (const g of this.frees)
      if (g.gate !== undefined) gates = Math.max(gates, g.gate + 1);
    this.gateValue = new Float64Array(Math.max(1, gates));
    for (let i = 0; i < this.layers.length; i++)
      this.layerIndex.set(this.layers[i], i);
    this.sweepX = this.layers.map((l) => new Float64Array(l.markCount));
    this.sweepY = this.layers.map((l) => new Float64Array(l.markCount));
    this.sweepOk = this.layers.map((l) => new Uint8Array(l.markCount));
    this.screenX = this.layers.map((l) => new Float64Array(l.markCount));
    this.screenY = this.layers.map((l) => new Float64Array(l.markCount));
    this.screenPrevX = this.layers.map((l) => new Float64Array(l.markCount));
    this.screenPrevY = this.layers.map((l) => new Float64Array(l.markCount));
    let total = 0;
    for (const l of this.layers) total += l.markCount;
    const f64 = (n: number) => new Float64Array(Math.max(1, n));
    this.ox0 = f64(total);
    this.oy0 = f64(total);
    this.ox1 = f64(total);
    this.oy1 = f64(total);
    this.osx = f64(total);
    this.osy = f64(total);
    this.fx = f64(largest);
    this.fy = f64(largest);
    this.bl = f64(largest);
    this.br = f64(largest);
    this.bt = f64(largest);
    this.h0 = f64(largest);
    this.wt = f64(largest);
    this.wc = f64(largest);
    this.near = f64(largest);
    this.order = new Int32Array(Math.max(1, largest));
    this.sx = f64(2 * largest);
    this.sy = f64(2 * largest);
    this.sr = f64(2 * largest);
  }

  /** Development: a glyph's baked sizes from step k0 to k1, as laid out and eased. */
  bakedSizes(layer: number, i: number, k0: number, k1: number): number[][] {
    const b = this.baked;
    if (!b) return [];
    const out: number[][] = [];
    for (let k = k0; k <= k1; k++)
      out.push([
        b.from + k * b.step,
        b.raw[layer]?.[i * b.steps + k] ?? Number.NaN,
        b.ratio[layer][i * b.steps + k],
      ]);
    return out;
  }

  /** The scene's progress for this frame (the baked tables are read at it). */
  setProgress(p: number): void {
    this.p = p;
  }

  update(frame: FrameInfo): void {
    this.begin(frame);
    // Nothing is drawn unless a group places it.
    for (const l of this.layers) {
      l.drawn.alpha.fill(0);
      l.drawn.nominal.fill(0);
    }
    const baked = this.tablesFor(frame);
    this.usingTables = baked !== null;
    this.ratios = baked;
    this.setGates(baked);
    // The fleets at their true places first; the squadrons' symbols fit
    // round them.
    for (let i = 0; i < this.frees.length; i++) {
      const g = this.frees[i];
      if (shownOf(g) > SHOWN_MIN)
        this.layoutFree(g, baked ? baked.at(i, this.p) : null);
    }
    this.layoutSquadrons(baked);
  }

  /**
   * How far each gate is open this frame: the least, over its groups that
   * show, of how far their ships each read one by one (as baked: how much
   * its least visible ship shows at the sizes the frames draw; without
   * tables, this frame's estimate), but only as far as the view looks down
   * on the group. Low over the sea, ships hide each other by the
   * perspective, not the zoom, and no label lying on the chart can be read
   * there to stand for them (HeadLabels fades its labels over the same
   * tilt): the gate stays open, and the group shows as it did. The gates
   * change only how much of a fleet shows, never a size or a place (its
   * ships' room is their ungated opacity, layoutFree), so the bake's size
   * pass lays out with them open.
   */
  private setGates(bake: Bake | null): void {
    this.gateValue.fill(1);
    for (let i = 0; i < this.frees.length; i++) {
      const g = this.frees[i];
      if (g.gate === undefined || g.gateFollows || shownOf(g) <= SHOWN_MIN)
        continue;
      // Baked with the view's tilt and eased; or from this frame.
      let r: number;
      if (bake) r = bake.readAt(i, this.p);
      else {
        const down = this.downOn(g);
        if (down <= 0) continue;
        const total = this.measureFree(g);
        r = this.readEstimate(g, this.commonOf(g, total));
        r = 1 - down * (1 - Math.min(1, Math.max(0, r)));
      }
      this.gateValue[g.gate] = Math.min(
        this.gateValue[g.gate],
        Math.min(1, Math.max(0, r)),
      );
    }
  }

  /** How steeply the view meets a group this frame, at its lead, as far as its gate holds (GATE_TILT). */
  private downOn(g: FreeGroup): number {
    const v = this.view;
    const lead = g.members[0];
    const it = g.layer.intent;
    const dist = Math.hypot(it.x[lead] - v.ex, it.y[lead] - v.ey, v.ez);
    return smoothstep(GATE_TILT[0], GATE_TILT[1], v.ez / dist);
  }

  /** Development and checks: how far a gate is open this frame (setGates). */
  gateOpen(gate: number): number {
    return gate < this.gateValue.length ? this.gateValue[gate] : 1;
  }

  /**
   * How much a gate's ships show as drawn this frame (0..1): the mean, over
   * its groups' ships laid out on screen and with their fleet, of how much
   * of each the frame draws (her group shown, the gate open, her size).
   * Where they show, the label standing for them gives way, exactly as
   * they come in (HeadLabels.setHandover): read from the gate alone, the
   * label had gone before ships still too small to show had come in.
   */
  gateShown(gate: number): number {
    let sum = 0;
    let count = 0;
    for (const g of this.frees) {
      if (g.gate !== gate || g.gateFollows || shownOf(g) <= SHOWN_MIN) continue;
      const it = g.layer.intent;
      const d = g.layer.drawn;
      for (const i of g.members) {
        if (it.opacity[i] <= 0.05 || !(d.nominal[i] > 0)) continue;
        // A ship apart from the gate (GlyphIntent.apart) is not the
        // fleet the label stands for.
        const w = 1 - it.apart[i];
        sum += w * Math.min(1, d.alpha[i] / it.opacity[i]);
        count += w;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * How far a group's ships each read one by one, estimated from the last
   * measureFree and commonOf (this.near, h0, wt): the least of its ships'
   * (readsAt), each at the scale she would be drawn at (the lead at hers,
   * the rest at the common scale or the room their nearest companion
   * leaves them). Ships hardly there (by date, or in the haze) don't count.
   */
  private readEstimate(g: FreeGroup, common: number): number {
    let r = 1;
    for (let k = 0; k < g.members.length; k++) {
      if (this.wt[k] <= 0.05 || this.offScreen(this.fx[k], this.fy[k]))
        continue;
      const s = k === 0 ? 1 : Math.min(common, this.near[k]);
      // A ship apart from the gate holds it as far as she is not.
      const reads = this.readsAt(s * this.h0[k]);
      const apart = g.layer.intent.apart[g.members[k]];
      r = Math.min(r, reads + (1 - reads) * apart);
    }
    return r;
  }

  /** Whether a ship drawn h device px tall reads one by one (0..1), as her glyph shows (shows). */
  private readsAt(h: number): number {
    return smoothstep(READABLE_PX * this.dpr, FULL_PX * this.dpr, h);
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
    this.ratios = null;
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
      this.layers.map((l) => l.markCount),
    );
    return Array.from({ length: steps }, (_, k) => from + k * step);
  }

  /** How many passes a bake makes over its steps (bakeStep, bakeEnd). */
  readonly bakePasses = 2;

  /**
   * Bakes step k, for the scene as set at its p. Pass 0 records the
   * decisions (each fleet group's common scale, each squadron's fit, place
   * and side, their shared scale); pass 1, laying the frame out with those
   * decisions eased, records what each glyph draws: its height against
   * its nominal.
   */
  bakeStep(frame: FrameInfo, k: number, pass: number): void {
    const bake = this.bake;
    if (!bake) return;
    if (pass === 1) {
      this.bakeSize(bake, frame, k);
      return;
    }
    if (k === 0) bake.key = viewKey(frame);
    this.begin(frame);
    for (let i = 0; i < this.frees.length; i++) {
      const g = this.frees[i];
      if (shownOf(g) <= SHOWN_MIN) {
        bake.common[i][k] = Number.NaN;
        bake.down[i][k] = Number.NaN;
        continue;
      }
      const common = this.commonOf(g, null);
      bake.common[i][k] = common;
      // How steeply the view meets it, for its gate (bakeEnd).
      bake.down[i][k] = g.gate === undefined ? 0 : this.downOn(g);
    }
    for (let i = 0; i < this.formations.length; i++) {
      const g = this.formations[i];
      const plan = this.prepare(g, null);
      const f = bake.squad[i];
      if (!plan.ok) {
        f.fit[k] = Number.NaN;
        f.offX[k] = Number.NaN;
        f.offY[k] = Number.NaN;
        f.side[k] = Number.NaN;
        continue;
      }
      f.fit[k] = plan.fit;
      f.offX[k] = plan.ax - plan.refX;
      f.offY[k] = plan.ay - plan.refY;
      f.side[k] = plan.side;
    }
    bake.shared[k] = this.sharedScale();
  }

  /**
   * What each glyph draws at step k, laid out as a frame reading the eased
   * decisions would lay it out: her height against her nominal. Eased in
   * turn (bakeEnd), the frames shrink a ship ahead of a pass that would
   * pinch her, at the pace of the scroll, instead of where it pinches.
   */
  private bakeSize(bake: Bake, frame: FrameInfo, k: number): void {
    this.begin(frame);
    for (const l of this.layers) {
      l.drawn.alpha.fill(0);
      l.drawn.nominal.fill(0);
    }
    if (k === 0) for (const ok of this.sweepOk) ok.fill(0);
    this.sweeping = true;
    this.gateValue.fill(1);
    for (let i = 0; i < this.frees.length; i++) {
      const g = this.frees[i];
      if (shownOf(g) > SHOWN_MIN) this.layoutFree(g, bake.at(i, this.p));
    }
    this.layoutSquadrons(bake);
    this.sweeping = false;
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      const d = layer.drawn;
      const t = bake.ratio[li];
      // Every glyph a group laid out, even one squeezed out of sight (her
      // squeeze is what the frames must see coming); one laid out by none
      // has no nominal and limits nothing.
      for (let i = 0; i < layer.markCount; i++) {
        const laid = d.nominal[i] > 0;
        t[i * bake.steps + k] = laid
          ? Math.min(1, d.height[i] / d.nominal[i])
          : 1;
        // And her nominal, to judge how much of her shows once eased.
        bake.nom[li][i * bake.steps + k] = laid ? d.nominal[i] : 0;
        // How far she stands apart from her gate here (bakeEnd).
        bake.apart[li][i * bake.steps + k] = layer.intent.apart[i];
        // Her foot on the chart and on screen, for the next step's sweeps.
        this.sweepOk[li][i] = laid ? 1 : 0;
        this.sweepX[li][i] = d.x[i];
        this.sweepY[li][i] = d.y[i];
        this.screenPrevX[li][i] = this.screenX[li][i];
        this.screenPrevY[li][i] = this.screenY[li][i];
      }
    }
  }

  /**
   * Development: the sizes' pass of the last bake replayed at step k, from
   * step k - 1 (so its sweeps are the bake's), the scene set at each step
   * by `set`; returns each squadron's debug rows at step k (drawSquadron's
   * `why`: each ship's limit, her scale after the glyphs before her and
   * after land, her baked size, her sweeps, the obstacle that limited her
   * and its sweep). The tables are not touched.
   */
  traceBakeStep(
    k: number,
    set: (p: number) => FrameInfo,
  ): Record<string, unknown>[] {
    const bake = this.baked;
    // Not while a bake runs: the replay overwrites the sweeps its size pass
    // carries from one step to the next.
    if (!bake || this.bake || k < 1 || k >= bake.steps) return [];
    for (const ok of this.sweepOk) ok.fill(0);
    let rows: Record<string, unknown>[] = [];
    for (const j of [k - 1, k]) {
      const frame = set(bake.from + j * bake.step);
      this.begin(frame);
      for (const l of this.layers) {
        l.drawn.alpha.fill(0);
        l.drawn.nominal.fill(0);
      }
      this.sweeping = true;
      this.debug = j === k ? [] : null;
      this.setGates(bake);
      for (let i = 0; i < this.frees.length; i++) {
        const g = this.frees[i];
        if (shownOf(g) > SHOWN_MIN) this.layoutFree(g, bake.at(i, this.p));
      }
      this.layoutSquadrons(bake);
      this.sweeping = false;
      if (this.debug) rows = this.debug;
      this.debug = null;
      for (let li = 0; li < this.layers.length; li++) {
        const d = this.layers[li].drawn;
        for (let i = 0; i < this.layers[li].markCount; i++) {
          this.sweepOk[li][i] = d.nominal[i] > 0 ? 1 : 0;
          this.sweepX[li][i] = d.x[i];
          this.sweepY[li][i] = d.y[i];
          this.screenPrevX[li][i] = this.screenX[li][i];
          this.screenPrevY[li][i] = this.screenY[li][i];
        }
      }
    }
    return rows;
  }

  /**
   * While baking the sizes, how far a glyph's foot moves against the land
   * over half a step either way, px, into swX, swY: from where her foot
   * stood on the chart at the step before, seen from this step's eye, to
   * where it stands now, the same again ahead. Her land is fitted over
   * that whole way, so an islet that passes under her between two steps
   * still shrinks her ahead of it. A jump (the story moving on between
   * beats) is no motion.
   */
  private sweepFor(layer: Glyphs, i: number, fx: number, fy: number): void {
    this.swX = 0;
    this.swY = 0;
    this.swDX = 0;
    this.swDY = 0;
    if (!this.sweeping) return;
    const li = this.layerIndex.get(layer) ?? 0;
    // Where she stands on screen this step, for the next one's.
    this.screenX[li][i] = fx;
    this.screenY[li][i] = fy;
    if (!this.sweepOk[li][i]) return;
    const max = SWEEP_MAX_PX * this.dpr;
    // Against other glyphs: half her motion on screen since the step
    // before, the camera's included.
    const sx = (fx - this.screenPrevX[li][i]) / 2;
    const sy = (fy - this.screenPrevY[li][i]) / 2;
    if (Math.hypot(sx, sy) <= max) {
      this.swDX = sx;
      this.swDY = sy;
    }
    // Against the land: her motion on the chart, seen from this step's eye.
    const v = this.view;
    if (!v.project(this.sweepX[li][i], this.sweepY[li][i], 0)) return;
    const dx = (fx - v.px) / 2;
    const dy = (fy - v.py) / 2;
    if (Math.hypot(dx, dy) > max) return;
    this.swX = Math.abs(dx);
    this.swY = Math.abs(dy);
  }

  /**
   * Ends a pass: eases the tables it filled, a squadron or a glyph a step,
   * for the caller to run in idle slices (in one go, the sizes' pass was a
   * task of up to 160 ms). After the last pass's last step, the frames read
   * them.
   */
  *bakeEnd(pass: number): Generator<void, void, void> {
    const bake = this.bake;
    if (!bake) return;
    if (pass === 0) {
      yield* bake.finishDecisions();
      return;
    }
    yield* bake.finishSizes(
      this.layers.map((l) => l.markCount),
      (h) => this.shows(h),
    );
    // Each gated group's readability for the frames: at each step, how much
    // its least visible ship laid out there shows, as eased (Bake.vis), so
    // its ships come in together, as the last of them comes to read; as far
    // as the view looks down on it there (setGates), eased over the scroll
    // as the decisions are (the camera rising off the sea at dawn crosses
    // the tilt's band within a few steps, as the ships go by the eye's
    // distance: eased as the sizes, the two together faded the frigates
    // with the combined fleet steeply).
    // How far each gated group's ships read one by one: the least
    // visibility among its ships laid out at a step (Bake.vis, each eased
    // already), as far as the view looks down on it there (the tilt eased
    // over the scroll: rising off the sea at dawn the camera crosses the
    // tilt's band within a few steps). Where none of its ships is laid out
    // (the group not shown, or all of them far off the screen) a step holds
    // nothing and takes its neighbours' value: read as wholly readable
    // there, the easing had opened the gate a little at each end of every
    // stay, the leads showing faintly beside the label. Eased again whole,
    // or taken the least within reach, the table had kept the harbour's
    // fleet at a third, then four fifths, of its ink through the hold.
    const sigma = BAKE_EASE_P / bake.step;
    const tilt = new Float32Array(bake.steps);
    for (let i = 0; i < this.frees.length; i++) {
      const g = this.frees[i];
      const r = bake.readable[i];
      r.fill(1);
      if (g.gate === undefined || g.gateFollows) continue;
      tilt.set(bake.down[i]);
      fillGaps(tilt, 0);
      ease(tilt, sigma, tilt);
      const li = this.layerIndex.get(g.layer) ?? 0;
      const vis = bake.vis[li];
      const nom = bake.nom[li];
      const apart = bake.apart[li];
      for (let k = 0; k < bake.steps; k++) {
        let low = Number.NaN;
        for (const m of g.members) {
          const o = m * bake.steps + k;
          // A ship apart from the gate holds it as far as she is not.
          const v = vis[o] + (1 - vis[o]) * apart[o];
          if (nom[o] > 0 && !(v >= low)) low = v;
        }
        r[k] = Number.isNaN(low) ? Number.NaN : 1 - tilt[k] * (1 - low);
      }
      fillGaps(r, 1);
      yield;
    }
    // A new bake begun meanwhile replaces this one.
    if (this.bake !== bake) return;
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
   * its foot by that weight, so a fading glyph frees its water smoothly),
   * and while baking the sizes the way it moves (its sweep, sweepFor).
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
    this.osx[o] = this.swDX;
    this.osy[o] = this.swDY;
  }

  /**
   * How far a box may grow about a point before it meets a placed glyph,
   * up to `limit`: at scale s it spans [ax + s·x0, ax + s·x1] ×
   * [ay + s·y0, ay + s·y1]. While baking the sizes the gap also takes in
   * how far the two move against each other either way between steps (the
   * difference of this glyph's sweep, set by sweepFor before the call, and
   * the obstacle's; ships sailing together don't): two glyphs passing close
   * met between two steps, and a frame there shrank one of them for itself
   * alone (Calder's line parting from Villeneuve's off Finisterre).
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
    this.hit = -1;
    for (let k = 0; k < this.obstacles && best > 0; k++) {
      const gx = g + Math.abs(this.swDX - this.osx[k]);
      const gy = g + Math.abs(this.swDY - this.osy[k]);
      const s = contact(
        ax,
        ay,
        x0,
        x1,
        y0,
        y1,
        this.ox0[k] - gx,
        this.oy0[k] - gy,
        this.ox1[k] + gx,
        this.oy1[k] + gy,
      );
      if (s < best) {
        best = s;
        this.hit = k;
      }
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
    sweepX = 0,
    sweepY = 0,
  ): number {
    if (!this.coast || limit <= 0) return Math.max(0, limit);
    // The margin all round, and the way the box moves (baking only).
    const mx = this.landMargin + sweepX;
    const my = this.landMargin + sweepY;
    // The open sea's case: everything the box sweeps on its way to the
    // limit (the hull of the point and the box) in one piece.
    {
      const lx = Math.min(0, limit * x0);
      const hx = Math.max(0, limit * x1);
      const ly = Math.min(0, limit * y0);
      const hy = Math.max(0, limit * y1);
      const cx = ax + (lx + hx) / 2;
      const cy = ay + (ly + hy) / 2;
      if (this.slack(cx, cy, (hx - lx) / 2 + mx, (hy - ly) / 2 + my) >= 0)
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
            (s * pw) / 2 + mx,
            (s * ph) / 2 + my,
          );
          if (sl <= 0.02) break;
          s += (0.7 * sl) / Math.max(rate, 1e-6);
        }
        if (s < best) best = s;
      }
    }
    return Math.max(0, Math.min(best, limit));
  }

  /** The baked limit on a glyph's scale this frame (1 without tables). */
  private bakedRatio(layer: Glyphs, index: number): number {
    const b = this.ratios;
    if (!b) return 1;
    return b.ratioAt(this.layerIndex.get(layer) ?? 0, index, this.p);
  }

  /** Writes a glyph's drawing for the frame: its foot (screen px), height and opacity. */
  private draw(
    layer: Glyphs,
    index: number,
    fx: number,
    fy: number,
    heading: number,
    h: number,
    nominal: number,
    alpha: number,
    wakeShare: number,
    narrow = NARROW_SHIP,
  ): void {
    const v = this.view;
    const d = layer.drawn;
    d.narrow[index] = narrow;
    d.nominal[index] = nominal;
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
    // A wake fitted only where it can show (the shader draws nothing under
    // these).
    d.wakeShare[index] =
      wakeShare > 0 && layer.intent.wake[index] > 0 && h > 0.01 && alpha > 0.003
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

  /**
   * How much of a glyph shows this frame, drawn h tall: as baked, eased
   * after the size's steep threshold (so a ship squeezed too small to read
   * fades over the scroll instead of within a step of it); and never a
   * speck, should she come out smaller than baked. Without tables, as her
   * size says.
   */
  private shownAt(layer: Glyphs, index: number, h: number): number {
    const b = this.ratios;
    if (!b) return this.shows(h);
    const li = this.layerIndex.get(layer) ?? 0;
    return Math.min(
      b.visAt(li, index, this.p),
      smoothstep(SPECK_PX * this.dpr, READABLE_PX * this.dpr, h),
    );
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
    // A ship standing apart from the gate (GlyphIntent.apart) is not her
    // group's companion: she neither sets its common scale nor is held to
    // it (layoutFree). The chain's ships, 25 to 60 km from the British
    // body, had been drawn at the body's crowded scale, specks.
    const apart = g.layer.intent.apart;
    for (let a = 0; a < n; a++)
      this.wc[a] = this.wt[a] * (1 - apart[g.members[a]]);
    for (let a = 0; a < n; a++) {
      this.near[a] = 1;
      if (this.wc[a] <= 0) continue;
      let best = 1;
      for (let c = 0; c < n; c++) {
        if (c === a || this.wc[c] <= 0) continue;
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
        const relaxed = Math.max(s, 1 - Math.min(1, this.wc[c]));
        if (relaxed < best) best = relaxed;
      }
      this.near[a] = best;
    }
    return Math.min(1, weightedMedian(this.near, this.wc, this.order, n));
  }

  private layoutFree(g: FreeGroup, baked: number | null): void {
    const layer = g.layer;
    const it = layer.intent;
    const total = this.measureFree(g);
    if (total <= 0) return;
    // Every ship counts toward the common scale, on screen or not, so her
    // companions' sizes never depend on where the frame cuts the group.
    const common = baked ?? this.commonOf(g, total);
    const shown = shownOf(g);
    // In priority order: each ship as large as the common scale (her
    // group's lead as large as she can be), her own water and the glyphs
    // placed before her allow.
    for (let k = 0; k < g.members.length; k++) {
      if (this.h0[k] <= 0) continue;
      const i = g.members[k];
      const fx = this.fx[k];
      const fy = this.fy[k];
      if (this.offScreen(fx, fy)) continue;
      const l = this.bl[k];
      const r = this.br[k];
      const t = this.bt[k];
      // Held to the group's common scale but as far as she stands apart
      // from its gate (commonOf).
      const own = k === 0 ? 1 : common + (1 - common) * it.apart[i];
      const limit = Math.min(own, this.bakedRatio(layer, i));
      this.sweepFor(layer, i, fx, fy);
      let s = this.obstacleFit(fx, fy, -l, r, 0, t, limit);
      s = this.landFit(fx, fy, -l, r, 0, t, s, this.swX, this.swY);
      const h = s * this.h0[k];
      // A gated group's ships all at their gate's opening (the least of
      // theirs, so the same for each), never more than her own. Her room
      // for the glyphs placed after her is as much as she shows without the
      // gate: the gate decides how much of a fleet shows, never anyone's
      // size or place, so the bake (which lays the frames out under an
      // estimate of it) and the frames agree.
      const shows = this.shownAt(layer, i, h);
      const ungated = it.opacity[i] * shown * shows;
      let alpha = ungated;
      if (g.gate !== undefined) {
        // A ship standing apart from her gate (GlyphIntent.apart) shows as
        // an ungated group's do, as far as she stands apart.
        const gated =
          it.opacity[i] * shown * Math.min(shows, this.gateValue[g.gate]);
        alpha = gated + (ungated - gated) * it.apart[i];
      }
      this.draw(layer, i, fx, fy, it.heading[i], h, this.h0[k], alpha, 1);
      this.addObstacle(
        fx,
        fy,
        s,
        k,
        ungated * this.view.haze(this.distOf(layer, i)),
      );
      // Development: each ship's foot, box and sizes (layoutDebug).
      this.debug?.push({
        free: i,
        fx,
        fy,
        box: [l, r, t],
        h0: this.h0[k],
        common,
        limit,
        s,
        alpha,
      });
    }
  }

  /** A foot (device px) too far off the screen for its glyph to reach it (OFF_SCREEN_PX). */
  private offScreen(fx: number, fy: number): boolean {
    const m = OFF_SCREEN_PX * this.dpr;
    const v = this.view;
    return fx < -m || fx > v.w + m || fy < -m || fy > v.h + m;
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
    for (let i = 0; i < this.formations.length; i++)
      this.prepare(this.formations[i], baked ? baked.squadAt(i, this.p) : null);
    // The shared scale moves as squadrons come on screen and go: baked and
    // eased too.
    const shared = baked ? baked.sharedAt(this.p) : this.sharedScale();
    for (const g of this.formations) {
      const plan = this.plans.get(g);
      if (plan?.ok) this.drawSquadron(g, plan, shared);
    }
  }

  /**
   * The scale shared by the squadrons prepared this frame: the least of
   * their fits (never under the floor), each counting as much as it shows:
   * coming into the story, shown, and on screen (its shape's centre within
   * its radius of the frame).
   */
  private sharedScale(): number {
    let shared = 1;
    const v = this.view;
    for (const g of this.formations) {
      const plan = this.plans.get(g);
      if (!plan?.ok || plan.frame !== this.frameNo) continue;
      const cx = plan.ax + plan.cx;
      const cy = plan.ay + plan.cy;
      const out = Math.max(-cx, cx - v.w, -cy, cy - v.h);
      const onScreen = 1 - smoothstep(0, plan.radius + 1, out);
      const weight = plan.presence * plan.shown * onScreen;
      shared = Math.min(
        shared,
        1 + (Math.max(plan.fit, plan.floor) - 1) * weight,
      );
    }
    return shared;
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
    const shown = shownOf(g);
    if (shown <= SHOWN_MIN) return plan;
    const v = this.view;
    const n = g.places.length;
    if (!v.project(g.x, g.y, 0)) return plan;
    const headX = v.px;
    const headY = v.py;
    let ax = headX;
    let ay = headY;
    // The meeting's course: both squadrons turn into it. The meeting's
    // share comes eased (the director's); eased again, and again in the
    // zip, the rows spread into the line within a few steps of scroll.
    const other = g.meets;
    const e = other && g.meeting > 0 ? g.meeting : 0;
    const heading =
      e > 0 && g.course !== undefined
        ? g.heading + (g.course - g.heading) * e
        : g.heading;
    if (!this.boxDims(g)) return plan;
    const { half, tall, h, presence } = this.dims;
    const facing = v.facing(heading);
    const step = 2 * half + this.glyphGap + SLACK_PX;
    // Which way astern lies: -1 to the left (bows right) .. 1. From the
    // facing while the ships show their sides; sailing nearly end-on, the
    // side with the more open water, both by weights that come and go
    // smoothly.
    const byFacing = 1 - 2 * smoothstep(-0.3, 0.3, facing);
    const sideways = smoothstep(0.15, 0.4, Math.abs(facing));
    const side = baked
      ? baked.side
      : sideways >= 1
        ? byFacing
        : byFacing * sideways +
          this.openSide(headX, headY + tall, n * step * 0.4) * (1 - sideways);
    const rowSep = tall + this.glyphGap + SLACK_PX;
    // Meeting another squadron: both zip into lines on one spacing, at
    // one place.
    const pair = other && e > 0 ? this.pairOf(g, other) : null;
    const zip = e;
    const lineStep = pair ? step + (pair.step - step) * e : step;
    this.shapeOffsets(plan, g, n, side, zip, lineStep, rowSep);
    // Off the screen by more than the whole shape and its push can reach:
    // nothing of it can show, nor stand near a glyph that does.
    const reach = 3.5 * plan.radius + OFF_SCREEN_PX * this.dpr;
    const ocx = headX + plan.cx;
    const ocy = headY + plan.cy;
    if (ocx < -reach || ocx > v.w + reach || ocy < -reach || ocy > v.h + reach)
      return plan;
    // The point its baked offset is taken from: its own head, or, meeting
    // another squadron, the middle of the two heads as far into the meeting
    // as it is, so both lines are set from one point and keep their lane
    // however differently their heads move on screen. Each taken from its
    // own head, the two lines' offsets, eased over the scroll, lagged their
    // heads' motion by different amounts where the camera's pace changed
    // (the hold over Finisterre ending): the lines closed on each other for
    // a few steps, and Calder's ships were squeezed between them.
    // The other head projected here, not taken from the pair's plan: that
    // is dropped while the other squadron has no ship there (pairOf), and
    // the point would jump back to this head.
    let refX = headX;
    let refY = headY;
    if (other && e > 0 && v.project(other.x, other.y, 0)) {
      refX += ((headX + v.px) / 2 - headX) * e;
      refY += ((headY + v.py) / 2 - headY) * e;
    }
    let cap = 1;
    if (baked) {
      ax = refX + baked.offX;
      ay = refY + baked.offY;
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
      // Clear of the squadrons laid out before it.
      this.avoidEarlier(g, plan, ax, ay);
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
    plan.refX = refX;
    plan.refY = refY;
    plan.ax = ax;
    plan.ay = ay;
    plan.heading = heading;
    plan.h = h;
    plan.half = half;
    plan.tall = tall;
    plan.presence = presence;
    plan.shown = shown;
    plan.floor = (FLOOR_PX * this.dpr) / h;
    plan.cap = cap;
    plan.fit = baked
      ? Math.min(cap, baked.fit)
      : Math.min(cap, this.shapeFit(g, plan));
    plan.frame = this.frameNo;
    plan.side = side;
    plan.facing = facing;
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
  private boxDims(g: Formation): boolean {
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
    // At full width whatever the facing, so the shape keeps its spacing as
    // the heading turns (the ships' own boxes narrow within it).
    const d = this.dims;
    d.half = reach * h + 1;
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
    if (!this.boxDims(g)) return null;
    const halfA = this.dims.half;
    const tallA = this.dims.tall;
    if (!this.boxDims(other)) return null;
    const half = Math.max(halfA, this.dims.half);
    const tall = Math.max(tallA, this.dims.tall);
    if (!v.project(g.x, g.y, 0)) return null;
    const hx = v.px;
    const hy = v.py;
    if (!v.project(other.x, other.y, 0)) return null;
    const mx = (hx + v.px) / 2;
    const my = (hy + v.py) / 2;
    const step = 2 * half + this.glyphGap + SLACK_PX;
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
    // Its half-extents about its centre, each ship counting as she is
    // there (the ships' boxes included).
    let hx = 0;
    let hy = 0;
    for (let k = 0; k < n; k++) {
      hx = Math.max(hx, share[k] * Math.abs(plan.ox[k] - cx));
      hy = Math.max(hy, share[k] * Math.abs(plan.oy[k] - cy));
    }
    plan.hx = hx + step / 2;
    plan.hy = hy + rowSep / 2;
  }

  /**
   * How far to move a squadron clear of those laid out before it this
   * frame, screen px, into pushX, pushY: along the line between their
   * centres, by as much as their shapes (at the scale each fits) would
   * still overlap along it, each counting as much as it is there; nothing
   * where their centres coincide, so no direction is forced.
   */
  private avoidEarlier(
    g: Formation,
    plan: SquadronPlan,
    ax: number,
    ay: number,
  ): void {
    let tx = 0;
    let ty = 0;
    // Its own shape at full size (its fit is not yet known): a little more
    // room than it may need.
    const s = 1;
    const cx = ax + plan.cx;
    const cy = ay + plan.cy + plan.tall / 2;
    for (const other of this.formations) {
      if (other === g) break;
      if (other === g.meets) continue;
      const q = this.plans.get(other);
      if (!q?.ok || q.frame !== this.frameNo) continue;
      const so = Math.min(1, q.fit);
      const ox = q.ax + q.cx;
      const oy = q.ay + q.cy + q.tall / 2;
      let dx = cx - ox;
      let dy = cy - oy;
      const d = Math.hypot(dx, dy);
      if (d < 1e-3) continue;
      dx /= d;
      dy /= d;
      const need =
        (s * plan.hx + so * q.hx + this.glyphGap) * Math.abs(dx) +
        (s * plan.hy + so * q.hy + this.glyphGap) * Math.abs(dy);
      const lack = (need - d) * q.presence * q.shown * smoothstep(0, 6, d);
      if (lack <= 0) continue;
      tx += dx * lack;
      ty += dy * lack;
    }
    const tl = Math.hypot(tx, ty);
    const cap = 2 * plan.radius;
    if (tl > cap) {
      tx *= cap / tl;
      ty *= cap / tl;
    }
    this.pushX = tx;
    this.pushY = ty;
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
   * against land and the glyphs before her, as much of it as it is shown.
   */
  private drawSquadron(g: Formation, plan: SquadronPlan, shared: number): void {
    const layer = g.layer;
    const it = layer.intent;
    const n = g.places.length;
    const fit = plan.fit;
    const scale = Math.min(shared, fit);
    const ox = plan.ax + plan.cx;
    const oy = plan.ay + plan.cy;
    const dist = Math.hypot(
      g.x - this.view.ex,
      g.y - this.view.ey,
      this.view.ez,
    );
    const haze = this.view.haze(dist);
    const why = this.debug ? ([] as number[][]) : null;
    plan.bAlpha = 0;
    plan.bx0 = Number.POSITIVE_INFINITY;
    plan.by0 = Number.POSITIVE_INFINITY;
    plan.bx1 = Number.NEGATIVE_INFINITY;
    plan.by1 = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < n; k++) {
      const i = g.places[k];
      if (it.opacity[i] <= 0) continue;
      const fx = ox + scale * (plan.ox[k] - plan.cx);
      const fy = oy + scale * (plan.oy[k] - plan.cy);
      if (this.offScreen(fx, fy)) continue;
      this.boxOf(layer, i, plan.heading, plan.h, NARROW_SYMBOL);
      this.bl[k] = this.boxL;
      this.br[k] = this.boxR;
      this.bt[k] = this.boxT;
      const limit = Math.min(scale, this.bakedRatio(layer, i));
      this.sweepFor(layer, i, fx, fy);
      let s = this.obstacleFit(
        fx,
        fy,
        -this.boxL,
        this.boxR,
        0,
        this.boxT,
        limit,
      );
      const byObstacle = s;
      s = this.landFit(
        fx,
        fy,
        -this.boxL,
        this.boxR,
        0,
        this.boxT,
        s,
        this.swX,
        this.swY,
      );
      why?.push([
        k,
        limit,
        byObstacle,
        s,
        this.bakedRatio(layer, i),
        this.swDX,
        this.swDY,
        this.swX,
        this.swY,
        this.hit,
        this.hit >= 0 ? this.osx[this.hit] : 0,
        this.hit >= 0 ? this.osy[this.hit] : 0,
      ]);
      const hd = s * plan.h;
      const alpha = it.opacity[i] * this.shownAt(layer, i, hd) * plan.shown;
      this.draw(
        layer,
        i,
        fx,
        fy,
        plan.heading,
        hd,
        plan.h,
        alpha,
        k === 0 ? 1 : 0,
        NARROW_SYMBOL,
      );
      this.addObstacle(fx, fy, s, k, alpha * haze);
      if (alpha * haze > 0.03) {
        plan.bx0 = Math.min(plan.bx0, fx - s * this.boxL);
        plan.bx1 = Math.max(plan.bx1, fx + s * this.boxR);
        plan.by0 = Math.min(plan.by0, fy);
        plan.by1 = Math.max(plan.by1, fy + s * this.boxT);
        plan.bAlpha = Math.max(plan.bAlpha, alpha * haze);
      }
    }
    if (this.debug)
      this.debug.push({
        places: g.places[0],
        p: this.p,
        tables: this.usingTables,
        baked: this.baked ? this.baked.key : "none",
        anchor: [plan.ax, plan.ay],
        side: plan.side,
        facing: plan.facing,
        count: plan.count,
        radius: plan.radius,
        fit,
        shared,
        scale,
        shown: plan.shown,
        meeting: g.meeting,
        cx: plan.cx,
        cy: plan.cy,
        h: plan.h,
        // Each ship's limit, her scale after the glyphs before her and
        // after land, and her baked size.
        why,
      });
  }

  /**
   * A squadron's ships on screen this frame, with the line it meets: their
   * box (CSS px from the canvas's top left, four corners into `out`) and
   * how much the most shown of them shows (0 for none). For lettering that
   * keeps clear of them (the label at its head).
   */
  blockOf(g: Formation, out: Float64Array): number {
    const a = this.drawnPlan(g);
    const b = g.meeting > 0 && g.meets ? this.drawnPlan(g.meets) : null;
    if (!a && !b) return 0;
    const x0 = Math.min(a?.bx0 ?? Infinity, b?.bx0 ?? Infinity);
    const y0 = Math.min(a?.by0 ?? Infinity, b?.by0 ?? Infinity);
    const x1 = Math.max(a?.bx1 ?? -Infinity, b?.bx1 ?? -Infinity);
    const y1 = Math.max(a?.by1 ?? -Infinity, b?.by1 ?? -Infinity);
    const d = this.dpr;
    const h = this.view.h;
    out[0] = x0 / d;
    out[1] = (h - y1) / d;
    out[2] = x1 / d;
    out[3] = out[1];
    out[4] = out[2];
    out[5] = (h - y0) / d;
    out[6] = out[0];
    out[7] = out[5];
    return Math.max(a?.bAlpha ?? 0, b?.bAlpha ?? 0);
  }

  /**
   * Where a squadron's own ships stand this frame while it meets another:
   * the middles of their box's top, bottom, right and left edges on screen,
   * each taken down to the chart (world km, x and y pairs into out[0..7]);
   * returns how far it stands as a line of the meeting's plan and shows (its
   * share of the meeting times how much of it is shown; 0 for none).
   * For its label, which stands by its own line: the plan draws both lines
   * between the two heads, so a label by its head can lie beyond the other
   * line.
   */
  lineAnchorOf(g: Formation, out: Float64Array): number {
    if (!g.meets || !(g.meeting > 0)) return 0;
    const plan = this.drawnPlan(g);
    if (!plan) return 0;
    const v = this.view;
    // Clear of the ships by the room the lettering keeps from what it gives
    // way to (Lettering's YIELD_PX, 10 CSS px) and a little more, so the
    // nearest place on each side has all the room it needs.
    const m = LINE_LABEL_CLEAR_PX * this.dpr;
    const mx = (plan.bx0 + plan.bx1) / 2;
    const my = (plan.by0 + plan.by1) / 2;
    if (!v.unproject(mx, plan.by1 + m)) return 0;
    out[0] = v.qx;
    out[1] = v.qy;
    if (!v.unproject(mx, plan.by0 - m)) return 0;
    out[2] = v.qx;
    out[3] = v.qy;
    if (!v.unproject(plan.bx1 + m, my)) return 0;
    out[4] = v.qx;
    out[5] = v.qy;
    if (!v.unproject(plan.bx0 - m, my)) return 0;
    out[6] = v.qx;
    out[7] = v.qy;
    // As far as it is a line of the plan and shown (not dimmed by the haze:
    // the label has its own), and gone smoothly as its ships' ink goes (the
    // plan counts as drawn while any of its ships shows more than 0.03).
    return (
      Math.min(1, g.meeting) *
      Math.min(1, plan.shown) *
      smoothstep(0.03, 0.1, plan.bAlpha)
    );
  }

  /** A squadron's plan, if its ships were drawn this frame. */
  private drawnPlan(g: Formation): SquadronPlan | null {
    const plan = this.plans.get(g);
    return plan?.ok && plan.frame === this.frameNo && plan.bAlpha > 0
      ? plan
      : null;
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
}

/** A squadron's layout this frame, at scale 1 (GlyphLayout.prepare). */
interface SquadronPlan {
  ok: boolean;
  /** Its head, and its lead's foot, device px. */
  headX: number;
  headY: number;
  /** The point its baked offset is taken from (prepare), device px. */
  refX: number;
  refY: number;
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
  /** The shape's half-extents about its centre at scale 1. */
  hx: number;
  hy: number;
  /** The frame it was laid out in. */
  frame: number;
  /** Development: its side and facing. */
  side: number;
  facing: number;
  /** The shape's centre (from the lead) and radius. */
  cx: number;
  cy: number;
  radius: number;
  /** How far it fits; the least scale at which its ships still read; its cap. */
  fit: number;
  floor: number;
  cap: number;
  presence: number;
  /** How much of it is shown (Formation.shown). */
  shown: number;
  /** Its ships as drawn this frame: their box (device px from the bottom left) and how much the most shown of them shows. */
  bx0: number;
  by0: number;
  bx1: number;
  by1: number;
  bAlpha: number;
}

function newPlan(n: number): SquadronPlan {
  return {
    ok: false,
    headX: 0,
    headY: 0,
    refX: 0,
    refY: 0,
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
    hx: 0,
    hy: 0,
    frame: 0,
    side: 0,
    facing: 0,
    cx: 0,
    cy: 0,
    radius: 0,
    fit: 0,
    floor: 0,
    cap: 1,
    presence: 0,
    shown: 0,
    bx0: 0,
    by0: 0,
    bx1: 0,
    by1: 0,
    bAlpha: 0,
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
  /** Which way astern lies (-1 left .. 1 right). */
  side: number;
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
    side: Float32Array;
  }[];
  readonly common: Float32Array[];
  /**
   * Each gated free group's readability by step (how far its ships each
   * read one by one, as far as the view looks down on it; GlyphLayout
   * .setGates), from the size pass's eased sizes (bakeEnd).
   */
  readonly readable: Float32Array[];
  /** Each free group's view tilt by step (GlyphLayout.downOn; NaN where not shown). */
  readonly down: Float32Array[];
  /** The squadrons' shared scale. */
  readonly shared: Float32Array;
  /** Per layer, per glyph (steps apart), its height against its nominal. */
  readonly ratio: Float32Array[];
  /** Per layer, per glyph (steps apart), how much of it shows for its size. */
  readonly vis: Float32Array[];
  /** Per layer, per glyph (steps apart), its nominal height (0: not laid out). */
  readonly nom: Float32Array[];
  /** Per layer, per glyph (steps apart), how far she stands apart from her gate (GlyphIntent.apart). */
  readonly apart: Float32Array[];
  private readonly out: BakedSquad = {
    fit: 1,
    offX: 0,
    offY: 0,
    side: -1,
  };

  constructor(
    readonly from: number,
    readonly step: number,
    readonly steps: number,
    squads: number,
    frees: number,
    marks: readonly number[],
  ) {
    this.to = from + (steps - 1) * step;
    this.squad = Array.from({ length: squads }, () => ({
      fit: new Float32Array(steps),
      offX: new Float32Array(steps),
      offY: new Float32Array(steps),
      side: new Float32Array(steps),
    }));
    this.common = Array.from({ length: frees }, () => new Float32Array(steps));
    this.readable = Array.from(
      { length: frees },
      () => new Float32Array(steps),
    );
    this.down = Array.from({ length: frees }, () =>
      new Float32Array(steps).fill(Number.NaN),
    );
    this.shared = new Float32Array(steps);
    this.ratio = marks.map((n) => new Float32Array(n * steps).fill(1));
    this.vis = marks.map((n) => new Float32Array(n * steps).fill(1));
    this.nom = marks.map((n) => new Float32Array(n * steps));
    this.apart = marks.map((n) => new Float32Array(n * steps));
  }

  /** The decisions' tables eased, a step a squadron or a group (see bakeEnd). */
  *finishDecisions(): Generator<void, void, void> {
    const reach = Math.round(BAKE_LEAST_P / this.step);
    const sigma = BAKE_EASE_P / this.step;
    for (const s of this.squad) {
      fillGaps(s.fit, 1);
      fillGaps(s.offX, 0);
      fillGaps(s.offY, 0);
      fillGaps(s.side, -1);
      ease(least(s.fit, reach), sigma, s.fit);
      ease(s.offX, sigma, s.offX);
      ease(s.offY, sigma, s.offY);
      // A side change slides whole rows across the lead: slower still.
      ease(s.side, 2 * sigma, s.side);
      yield;
    }
    for (const c of this.common) {
      // Steps where the group wasn't shown hold none: from its neighbours.
      fillGaps(c, 1);
      ease(least(c, reach), sigma, c);
      yield;
    }
    ease(least(this.shared, reach), sigma, this.shared);
  }

  /** Development: the sizes as laid out, before easing. */
  raw: Float32Array[] = [];

  /**
   * Each glyph's sizes: the least within the easing's whole reach, then
   * eased, so at every step the eased size is no more than the size laid
   * out there. A step a glyph (see bakeEnd).
   */
  *finishSizes(
    marks: readonly number[],
    shows: (h: number) => number,
  ): Generator<void, void, void> {
    this.raw = this.ratio.map((t) => t.slice());
    const sigma = BAKE_SIZE_EASE_P / this.step;
    const reach = Math.ceil(3 * sigma);
    for (const [li, n] of marks.entries()) {
      for (let i = 0; i < n; i++) {
        const from = i * this.steps;
        const to = from + this.steps;
        const t = this.ratio[li].subarray(from, to);
        ease(least(t, reach), sigma, t);
        // How much of her shows at the eased size, eased in turn: after the
        // size's steep threshold, so she fades over the scroll; and judged
        // at the size the frames will draw, so the two agree.
        const v = this.vis[li].subarray(from, to);
        const nom = this.nom[li].subarray(from, to);
        for (let k = 0; k < this.steps; k++)
          v[k] = nom[k] > 0 ? shows(nom[k] * t[k]) : 1;
        ease(least(v, reach), sigma, v);
        yield;
      }
    }
  }

  squadAt(i: number, p: number): BakedSquad {
    const s = this.squad[i];
    this.out.fit = this.read(s.fit, p);
    this.out.offX = this.read(s.offX, p);
    this.out.offY = this.read(s.offY, p);
    this.out.side = this.read(s.side, p);
    return this.out;
  }

  at(i: number, p: number): number {
    return this.read(this.common[i], p);
  }

  /** A gated free group's readability at p (readable). */
  readAt(i: number, p: number): number {
    return this.read(this.readable[i], p);
  }

  sharedAt(p: number): number {
    return this.read(this.shared, p);
  }

  /** A glyph's baked height against its nominal at p. */
  ratioAt(layer: number, i: number, p: number): number {
    return this.readGlyph(this.ratio[layer], i, p);
  }

  /** How much of a glyph shows for her size at p, as baked. */
  visAt(layer: number, i: number, p: number): number {
    return this.readGlyph(this.vis[layer], i, p);
  }

  private readGlyph(t: Float32Array, i: number, p: number): number {
    return this.read(t, p, i * this.steps);
  }

  /**
   * A table at p, the steps (from `o` on) joined by a Catmull-Rom curve:
   * read straight, each sample would be a kink, a jolt of motion every
   * step of the bake.
   */
  private read(t: Float32Array, p: number, o = 0): number {
    const last = this.steps - 1;
    const x = Math.min(last, Math.max(0, (p - this.from) / this.step));
    const k = Math.min(last - 1, Math.floor(x));
    const u = x - k;
    const y0 = t[o + Math.max(0, k - 1)];
    const y1 = t[o + k];
    const y2 = t[o + k + 1];
    const y3 = t[o + Math.min(last, k + 2)];
    return (
      y1 +
      0.5 *
        u *
        (y2 -
          y0 +
          u * (2 * y0 - 5 * y1 + 4 * y2 - y3 + u * (3 * (y1 - y2) + y3 - y0)))
    );
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
