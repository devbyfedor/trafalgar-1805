import { type Object3D, Vector3 } from "three";
import type { BatchedText, Text } from "troika-three-text";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { GlyphDrawn } from "../glyphs/Glyphs";
import type { CoastField } from "../terrain/coast";
import type { TerrainField } from "../terrain/field";
import { FONT_FILES, fontUrl } from "./fonts";
import {
  ChartGround,
  contrast,
  luminance,
  type Rgb,
  waterlineInk,
} from "./ground";
import { quadsApart, type ScreenText, YIELD_PX } from "./Lettering";
import {
  chartText,
  chartTextBatch,
  chartTextMaterial,
  configureFonts,
  type DrapeUniforms,
} from "./material";

/**
 * A fleet's label at the head of its track: its commander and its strength,
 * "Villeneuve, 20 sail", in the italic of the period's track notes, lying on
 * the chart as the names do and tilting with it. On the far views it is
 * what tells whose track a line is and how strong the squadron was that
 * day.
 *
 * It joins the chart's lettering: it keeps clear of the names, of the
 * caption's card (Lettering.screen), of the labels before it, of its own
 * line, and of whatever else the host gives it to keep clear of (a
 * squadron's ships, where they show). It tries places about its fleet in
 * order, above and below it (centred, or reaching east or west from it) and
 * beside it, close by and then farther out, and takes the first with room:
 * a soft first-fit, every weight a smooth function of the frame, so a
 * label passes from one place to another by crossfading where it stands,
 * never by sliding over something. A place has room only on clean ground:
 * on the sea clear of the stronger waterlines that ring every coast, or
 * wholly on the land's paper, where the ink turns dark (material.ts); a
 * label never straddles a coast.
 *
 * Its texts are typeset ahead, every strength it is ever lettered with, so
 * a change of strength is a crossfade of the figures alone (the name
 * stays), and nothing is typeset while the scene plays. A label is drawn
 * twice over: once at the place with the most of it, once at the next, so a
 * crossfade between two places needs no more texts than that. Every label
 * is one BatchedText, one draw call.
 */

/** Where a place stands against its fleet, on the chart. */
export type HeadSlot = "above" | "below" | "right" | "left";

export interface HeadSpec {
  id: string;
  /** The commander, with the comma that follows ("Villeneuve,"). */
  name: string;
  /** Every strength it is ever lettered with after the name ("20 sail"). */
  counts: readonly string[];
  /** The sides it tries about its fleet, in order. */
  slots: readonly HeadSlot[];
}

/** A label's state in the last frame, for development and the contrast check. */
export interface HeadLabelState {
  id: string;
  text: string;
  opacity: number;
  /** The em on screen, CSS px. */
  emPx: number;
  /** Its outline on screen, CSS px from the canvas's top left (four corners). */
  quad: number[];
  /** Its inks, 0..255: on the sea, and on the land. */
  inkPale: [number, number, number];
  inkDark: [number, number, number];
}

/** The most points of its line a head is given (HeadLabels.set). */
export const TRAIL_POINTS = 24;
/** The em on screen (CSS px): a share of the viewport's height, within bounds. */
const EM_VH = 0.018;
const EM_MIN_PX = 12;
const EM_MAX_PX = 19;
/** From the fleet to a place's nearest edge, ems: close by, and farther out. */
const GAPS_EM = [0.7, 2.2, 3.7];
/**
 * Farther out, tried last and only about a fleet's head (a meeting line's
 * label keeps to the places by its own ships), measured on screen: the
 * gaps above are the chart's, and where the view meets the chart at a slant
 * they shrink on screen toward the horizon while the waterlines' band about
 * a coast keeps its width on screen, so by a harbour every nearer place can
 * lie on the waterlines or across the coast, and the fleet at anchor would
 * show neither its label nor its ships (the owner's rule of 12 November
 * 2026: a fleet in the frame shows one or the other). These keep their gap
 * on screen, out past the band.
 */
const SCREEN_GAPS_EM = [3.7, 5.2, 6.7];
/*
 * At each of those gaps a place toward the eye is tried first: straight
 * down the screen from the fleet, centred under it. Seen at a slant, a
 * coast lies beyond its fleet and the open sea, darkest, toward the eye,
 * which the chart's own sides need not point to when the view is turned.
 */
/**
 * The places measured on screen stand only by a fleet in the frame: they
 * reach far from it, and for a fleet off the frame they would bring its
 * label in over whatever lies between (CSS px outside the frame over which
 * they go).
 */
const SCREEN_GAPS_OUT_PX = 24;
/** The places toward the eye: centred under the fleet, or reaching right or left of it. */
const TOWARD_REACHES: readonly (-1 | 0 | 1)[] = [0, 1, -1];
/** The least a gap on the chart shrinks to on screen that a screen gap makes up for. */
const FORESHORTEN_MIN = 0.1;
/** Between the name and its strength, ems (a word space of the italic). */
const SPACE_EM = 0.27;
/** Half the width of the line a label keeps clear of, CSS px. */
const LINE_HALF_PX = 3.5;
/**
 * The waterlines reach this far out from a coast on screen (CSS px: the
 * terrain's 26 lines 2.2 px apart, strength (1 - u)^1.5 out to it); a label
 * on the sea stands clear of the stronger inner ones, beyond this share of
 * their reach, where the faint outer ones leave its ink 4.5:1 or more
 * against the sea; in over the next few pixels, as a name gives way.
 */
const WATERLINE_REACH_PX = 57;
const SEA_CLEAR_SHARE = 0.55;
/**
 * The places measured on screen, the last tried, may stand nearer, over the
 * outer waterlines, as long as the ink reads on them at their strongest
 * there (ground.ts takes them in): in a narrow bay seen at a slant no place
 * near the fleet lies beyond the band.
 */
const SEA_CLEAR_SHARE_LAST = 0.3;
const CLEAR_RISE_PX = 6;
/** Points along a label where the coast's distance is read. */
const GROUND_SAMPLES = 6;
/** A label on the land stands this far inland, CSS px (in as it rises). */
const LAND_CLEAR_PX: readonly [number, number] = [4, 10];
/**
 * A ship's glyph as a label keeps clear of it: as wide as this share of its
 * height either side of its foot, and a little below the foot (its wake's
 * start); only where it shows at SHIP_MIN or more.
 */
const SHIP_HALF_WIDTH = 0.6;
const SHIP_BELOW = 0.15;
const SHIP_MIN = 0.05;
/** The edge of the frame a label keeps clear of, CSS px. */
const EDGE_PX = 10;
/**
 * A place's ink must read against its ground (ground.ts: the chart's colour
 * there, as the frame draws it) at this contrast or more: the owner's 4.5:1
 * for a readable label (opacity 0.5 or more; decisions.md, sessions 29 and
 * 32), with a margin for what the ground model leaves out. A place's room
 * comes in across the band, so it is half there at its middle. Toward the
 * horizon the haze lightens the ground toward the colour of the air, and at
 * dawn the sun's road and the glow brighten the sea under it: each place is
 * judged by its own ground, not by its fleet's distance, so by day a place
 * nearer the eye can stand where a farther one can't, at dusk and night the
 * hazed sea stays dark and the pale ink reads far into the haze, and at
 * night the dark ink on the dark paper never reads, so no label stands on
 * the land then.
 */
const READ_CONTRAST: readonly [number, number] = [4.6, 5.0];
/** Where the ground is read about a place: its corners and its middle. */
const READ_POINTS = 5;
/** The step of the coast's gradient, km (inside a texel: the field is bilinear). */
const GRADIENT_KM = 0.05;
/**
 * The ink on the sea: the chart's pale ink lightened toward the page's, so
 * the label reads over the whole sea, the brighter haze toward the horizon
 * included, at 4.5:1 or more.
 */
const LIFT_PALE = 1.12;

/** A place about a fleet: its side, how it lines up there, its gap. */
interface Slot {
  /**
   * About the fleet's own ships rather than its head (Head.ax, ay): where
   * the host draws them away from the head (a squadron's line in the plan
   * of a meeting), as far as the host says (Head.aw).
   */
  own: boolean;
  side: HeadSlot | "toward";
  /** Toward the eye: which of its places (Head.toward: 3 per SCREEN_GAPS_EM, by TOWARD_REACHES). */
  towardIndex: number;
  /** Above or below: centred on the fleet (0), reaching east of it (1) or west (-1). */
  reach: -1 | 0 | 1;
  /** From the fleet to its nearest edge, ems: on the chart, or on screen (onScreen). */
  gap: number;
  onScreen: boolean;
  /** Its outline on screen this frame, CSS px; NaN where it can't be seen. */
  quad: Float64Array;
  /** How much of the label stands here this frame (soft first-fit). */
  weight: number;
  /**
   * Development: this frame's room and what made it (the frame's edge, the
   * ground, the names and card, the labels before it, its line, its ships,
   * and how well its ink reads on the ground, which the ground includes).
   */
  why: Float64Array;
  /** Development: how near the coast it came on screen this frame, CSS px (at sea, and inland). */
  near: number;
  inland: number;
  /** Development: the coast's distance there (km) and its change per CSS px. */
  nearKm: number;
  nearPerPx: number;
  /** Development: the ground's luminance it was read against (ground.ts; NaN where not read): the brightest sea, the darkest land. */
  seaL: number;
  landL: number;
}

/** One drawing of a label: its name and each strength. */
interface Copy {
  name: Text;
  counts: Text[];
  /** The place it stands at this frame (-1 none), and how much shows. */
  slot: number;
  opacity: number;
  /** Its outline this frame, for the lettering after it (screen). */
  quad: Float64Array;
  /** The strength it shows most of this frame (an index into its counts). */
  count: number;
}

interface Head {
  spec: HeadSpec;
  slots: Slot[];
  copies: [Copy, Copy];
  /**
   * This frame: where the label stands by (world km), its line from the
   * head back (world x, y pairs; trailCount points), how much shows.
   */
  x: number;
  y: number;
  /**
   * This frame: where its own ships stand, the middles of their box's top,
   * bottom, right and left edges on the chart (world km, x and y pairs),
   * and how far the label stands by them instead of by its head (0..1;
   * HeadLabels.setAnchors).
   */
  own: Float64Array;
  aw: number;
  /**
   * This frame: how much an em on the chart east (x) and north (y) of the
   * head shows on screen, of an em facing the eye (a screen gap's scale).
   */
  fx: number;
  fy: number;
  /** This frame: how far its head stands in the frame (1 in, 0 SCREEN_GAPS_OUT_PX or more out). */
  inFrame: number;
  /** This frame: the middles of its places toward the eye (world km, x and y pairs; NaN where the view finds no sea). */
  toward: Float64Array;
  trail: Float64Array;
  trailCount: number;
  /** Its line on screen this frame, a quad a segment (lineQuads), and how many. */
  lines: Float64Array[];
  lineCount: number;
  presence: number;
  /** How much each strength shows (its share of the label). */
  counts: Float64Array;
  /** The typeset name's ink to its right edge, and each strength's, ems. */
  nameRight: number;
  countRight: Float64Array;
  /** The label's ink above and below its middle line, ems. */
  top: number;
  bottom: number;
  emPx: number;
}

export class HeadLabels implements ChartLayer {
  readonly batch: BatchedText;
  /** Resolves once every text has been typeset. */
  readonly ready: Promise<void>;
  /** The labels as they stood in the last frame: what other lettering keeps clear of. */
  readonly screen: ScreenText;
  private readonly heads: Head[];
  private readonly byId = new Map<string, Head>();
  private readonly uniforms: DrapeUniforms = {
    uExag: { value: 1 },
    uLodK: { value: 100 },
    uPull: { value: 0.004 },
  };
  private readonly inkPale = new Vector3();
  private readonly inkDark = new Vector3();
  private readonly one = new Vector3(1, 1, 1);
  private keepClear: readonly ScreenText[] = [];
  private coast: CoastField | null = null;
  private groundModel: ChartGround | null = null;
  /** The inks' luminance this frame (pale on the sea, dark on the land). */
  private inkPaleL = 1;
  private inkDarkL = 0;
  private readonly rgb: Rgb = [0, 0, 0];
  /** A place's corners and middle on the chart (world km, x and y pairs), reused. */
  private readonly readAt = new Float64Array(2 * READ_POINTS);
  private blocks: ((id: string, out: Float64Array) => number) | null = null;
  /** The glyph layers whose ships every label keeps clear of (setGlyphs). */
  private glyphs: readonly GlyphDrawn[] = [];
  /** This frame's ships on screen: a quad and how firmly it holds each (ships), and their boxes (x0, y0, x1, y1). */
  private ships: Float64Array[] = [];
  private shipWeight = new Float64Array(0);
  private shipBox = new Float64Array(0);
  private shipCount = 0;
  private anchors: ((id: string, out: Float64Array) => number) | null = null;
  private handover: ((id: string) => number) | null = null;
  private readonly anchor = new Float64Array(8);
  /** A place's origin (origin), reused. */
  private readonly at = new Float64Array(2);
  private hidden = false;
  private sized = false;
  private readonly trailPx = new Float64Array(2 * TRAIL_POINTS);
  private readonly block = new Float64Array(8);
  /** Three points on screen (foreshortening), reused. */
  private readonly probe = new Float64Array(6);
  private readonly v = new Vector3();

  constructor(field: TerrainField, specs: readonly HeadSpec[]) {
    configureFonts();
    this.batch = chartTextBatch(
      "route-heads",
      chartTextMaterial(field, this.uniforms, this.inkPale, this.inkDark),
      31,
    );
    const font = fontUrl(FONT_FILES.note);
    const syncs: Promise<void>[] = [];
    const typeset = (content: string): Text => {
      // One em is one unit; the label is scaled to its em on the chart.
      const text = chartText(content, font, 1, 128);
      text.anchorX = "left";
      text.anchorY = "middle";
      text.scale.setScalar(0);
      text.fillOpacity = 0;
      this.batch.add(text);
      syncs.push(new Promise((resolve) => text.sync(() => resolve())));
      return text;
    };
    const copy = (spec: HeadSpec): Copy => ({
      name: typeset(spec.name),
      counts: spec.counts.map(typeset),
      slot: -1,
      opacity: 0,
      quad: new Float64Array(8).fill(Number.NaN),
      count: 0,
    });
    this.heads = specs.map((spec) => {
      // The places about its own ships first (tried only while the host
      // gives them), each side out to its farthest gap before the next, so
      // a line's label keeps to its side of the line; then those about its
      // head, nearest first.
      const slots: Slot[] = [];
      const add = (
        own: boolean,
        side: HeadSlot | "toward",
        gap: number,
        onScreen = false,
      ) => {
        const reaches: readonly (-1 | 0 | 1)[] =
          side === "above" || side === "below" || side === "toward"
            ? [0, 1, -1]
            : [0];
        for (const reach of reaches)
          slots.push({
            own,
            side,
            reach,
            gap,
            onScreen,
            towardIndex:
              side === "toward"
                ? 3 * SCREEN_GAPS_EM.indexOf(gap) +
                  TOWARD_REACHES.indexOf(reach)
                : -1,
            quad: new Float64Array(8).fill(Number.NaN),
            weight: 0,
            why: new Float64Array(8),
            near: 0,
            inland: 0,
            nearKm: 0,
            nearPerPx: 0,
            seaL: Number.NaN,
            landL: Number.NaN,
          });
      };
      for (const side of spec.slots)
        for (const gap of GAPS_EM) add(true, side, gap);
      for (const gap of GAPS_EM)
        for (const side of spec.slots) add(false, side, gap);
      for (const gap of SCREEN_GAPS_EM) {
        add(false, "toward", gap, true);
        for (const side of spec.slots) add(false, side, gap, true);
      }
      const head: Head = {
        spec,
        slots,
        copies: [copy(spec), copy(spec)],
        x: 0,
        y: 0,
        own: new Float64Array(8),
        aw: 0,
        fx: 1,
        fy: 1,
        inFrame: 0,
        toward: new Float64Array(6 * SCREEN_GAPS_EM.length).fill(Number.NaN),
        trail: new Float64Array(2 * TRAIL_POINTS),
        trailCount: 0,
        lines: Array.from({ length: TRAIL_POINTS }, () => new Float64Array(8)),
        lineCount: 0,
        presence: 0,
        counts: new Float64Array(spec.counts.length),
        nameRight: 0,
        countRight: new Float64Array(spec.counts.length),
        top: 0.5,
        bottom: -0.5,
        emPx: 0,
      };
      this.byId.set(spec.id, head);
      return head;
    });
    const quads: Float64Array[] = [];
    for (const h of this.heads) for (const c of h.copies) quads.push(c.quad);
    this.screen = {
      quads,
      weights: new Float64Array(quads.length),
      count: 0,
    };
    this.ready = Promise.all(syncs).then(() => this.measure());
  }

  /** The objects to add to the scene. */
  get objects(): Object3D[] {
    return [this.batch];
  }

  /**
   * Lettering the labels keep clear of on screen, updated before them each
   * frame (the chart's layers update in the order they were added).
   */
  setKeepClear(screens: readonly ScreenText[]): void {
    this.keepClear = screens;
  }

  /** The chart's coast on the CPU: where the sea is clean and the land is. */
  setCoast(coast: CoastField | null): void {
    this.coast = coast;
    this.groundModel = coast ? new ChartGround(coast) : null;
  }

  /**
   * Something more a head's label keeps clear of, read as it updates: for a
   * head's id, its outline on screen (CSS px, four corners, into `out`)
   * and how firmly it holds (0 for none): a squadron's ships where they
   * show.
   */
  setBlocks(blocks: ((id: string, out: Float64Array) => number) | null): void {
    this.blocks = blocks;
  }

  /**
   * The ships every label keeps clear of, whosever they are: the glyph
   * layers' ships as drawn this frame (Glyphs.drawn; their layout runs
   * before the labels update).
   */
  setGlyphs(layers: readonly GlyphDrawn[]): void {
    this.glyphs = layers;
    let n = 0;
    for (const d of layers) n += d.alpha.length;
    this.ships = Array.from({ length: n }, () => new Float64Array(8));
    this.shipWeight = new Float64Array(n);
    this.shipBox = new Float64Array(4 * n);
  }

  /**
   * Where a head's own ships stand, read as it updates: for a head's id,
   * the middles of their box's top, bottom, right and left edges on the
   * chart (world km, x and y pairs into out[0..7]) and how far its label is
   * to stand by them instead of by its head (0 for not at all): two squadrons meeting are drawn as a plan, their lines between
   * the two heads, so each label stands by its own line, not by a head
   * that may lie beyond the other line. The label crossfades from the one
   * place to the other as the weight comes and goes.
   */
  setAnchors(
    anchors: ((id: string, out: Float64Array) => number) | null,
  ): void {
    this.anchors = anchors;
  }

  /**
   * How far a head's label has given way to its fleet's ships, read as it
   * updates (0..1; 0 for none): a fleet lettered while its ships are too
   * far off or too crowded to read one by one hands its label over to them
   * as they come in (glyphs/layout.ts, GlyphLayout.gateShown).
   */
  setHandover(handover: ((id: string) => number) | null): void {
    this.handover = handover;
  }

  /**
   * A head for this frame: where its label stands by (world km: the fleet,
   * which in port lies in the roads off its line's head), its line from the
   * head back past there (world x, y pairs, up to TRAIL_POINTS; none for no
   * line), how much of its label shows, and each of its strengths' share
   * (in the order of its spec's counts).
   */
  set(
    id: string,
    x: number,
    y: number,
    trail: ArrayLike<number>,
    trailCount: number,
    presence: number,
    counts: ArrayLike<number>,
  ): void {
    const h = this.byId.get(id);
    if (!h) return;
    h.x = x;
    h.y = y;
    const n = Math.min(TRAIL_POINTS, trailCount);
    for (let i = 0; i < 2 * n; i++) h.trail[i] = trail[i];
    h.trailCount = n;
    h.presence = Math.min(1, Math.max(0, presence));
    for (let i = 0; i < h.counts.length; i++) h.counts[i] = counts[i] ?? 0;
  }

  /**
   * Development and the contrast check: the labels leave the frame (true)
   * or come back. They are still placed, and other lettering still keeps
   * clear of them, so the frame under them is the frame they were drawn on.
   */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.batch.visible = !hidden;
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uLodK.value = frame.lodK;
    this.inkPale
      .copy(frame.light.inkPale)
      .multiplyScalar(LIFT_PALE)
      .min(this.one);
    this.inkDark.copy(frame.light.ink);
    this.inkPaleL = luminance([this.inkPale.x, this.inkPale.y, this.inkPale.z]);
    this.inkDarkL = luminance([this.inkDark.x, this.inkDark.y, this.inkDark.z]);
    const eye = frame.eye;
    const cssPerRadian = frame.pxPerRadian / frame.dpr;
    const cssH = frame.height / frame.dpr;
    const emPx = Math.min(EM_MAX_PX, Math.max(EM_MIN_PX, EM_VH * cssH));
    let anything = false;
    let n = 0;
    // Every head's line first: each label keeps clear of them all.
    for (const h of this.heads) {
      h.lineCount = 0;
      if (this.sized && h.presence > 0.001) this.lineQuads(h, frame);
    }
    this.shipQuads(frame);
    for (const h of this.heads) {
      const dist = Math.hypot(h.x - eye.x, h.y - eye.y, eye.z);
      // Lying on the chart, it fades as the chart does toward the horizon,
      // and with the haze, as the names do; each place by its own ground
      // (room). As it gives way to its ships it fades by that or by the
      // tilt, whichever is the less, not by both at once: where the view
      // rises off the ships or comes down to them, the label and the ships
      // together never dip to half.
      const tilt = smooth(0.1, 0.25, eye.z / dist);
      const hx = dist / frame.hazeVisibility;
      const seen =
        h.presence *
        Math.min(tilt, this.handover ? 1 - this.handover(h.spec.id) : 1) *
        Math.exp(-hx * hx);
      h.emPx = emPx;
      for (const s of h.slots) s.weight = 0;
      if (!this.sized || seen <= 0.001) {
        for (const c of h.copies) {
          this.hide(c);
          this.screen.weights[n++] = 0;
        }
        continue;
      }
      const em = (emPx * dist) / cssPerRadian;
      this.foreshortening(h, frame, em, emPx);
      const blockWeight = this.blocks ? this.blocks(h.spec.id, this.block) : 0;
      h.aw = this.anchors ? this.anchors(h.spec.id, this.anchor) : 0;
      if (h.aw > 0.001) h.own.set(this.anchor);
      // A soft first-fit over its places in order: once one has the whole
      // label, those after it are not tried. The places by its own ships
      // have room only as far as the host gives them.
      let left = 1;
      let best = -1;
      let next = -1;
      // The places by its own ships come first and share the host's weight
      // among them, first-fit; those by its head share what is left.
      const aw = Math.min(1, h.aw);
      let ownLeft = aw > 0.001 ? 1 : 0;
      let headStarted = false;
      for (let i = 0; i < h.slots.length; i++) {
        const s = h.slots[i];
        if (s.own) {
          if (ownLeft <= 0.001) {
            s.quad[0] = Number.NaN;
            continue;
          }
          const room = this.room(s, h, em, frame, blockWeight);
          s.weight = room * ownLeft * aw;
          ownLeft *= 1 - room;
        } else {
          if (!headStarted) {
            headStarted = true;
            left = 1 - aw * (1 - ownLeft);
          }
          if (left <= 0.001) break;
          const room = this.room(s, h, em, frame, blockWeight);
          s.weight = room * left;
          left *= 1 - room;
        }
        if (s.weight <= 0.001) continue;
        if (best < 0 || s.weight > h.slots[best].weight) {
          next = best;
          best = i;
        } else if (next < 0 || s.weight > h.slots[next].weight) next = i;
      }
      // The place with the most of the label, and the next: the two
      // drawings, each where it was the frame before if that is still one
      // of the two, so a crossfade keeps each drawing in its place.
      const [a, b] = h.copies;
      if (b.slot === best || a.slot === next) {
        this.draw(b, h, best, seen, em);
        this.draw(a, h, next, seen, em);
      } else {
        this.draw(a, h, best, seen, em);
        this.draw(b, h, next, seen, em);
      }
      for (const c of h.copies) {
        if (c.opacity > 0.001) anything = true;
        this.screen.weights[n++] = c.opacity > 0.001 ? c.opacity : 0;
      }
    }
    this.screen.count = n;
    this.batch.visible = anything && !this.hidden;
  }

  /** Development: each head's places tried this frame, their room and what made it (Slot.why). */
  explain(): {
    id: string;
    own: boolean;
    side: string;
    reach: number;
    gap: number;
    onScreen: boolean;
    weight: number;
    why: number[];
    near: number;
    inland: number;
    nearKm: number;
    nearPerPx: number;
    seaL: number;
    landL: number;
    quad: number[];
  }[] {
    const out: ReturnType<HeadLabels["explain"]> = [];
    for (const h of this.heads) {
      if (h.presence <= 0.001) continue;
      for (const s of h.slots) {
        if (s.own && h.aw <= 0.001) continue;
        out.push({
          id: h.spec.id,
          own: s.own,
          side: s.side,
          reach: s.reach,
          gap: s.gap,
          onScreen: s.onScreen,
          weight: Math.round(s.weight * 1000) / 1000,
          why: Array.from(s.why, (v) => Math.round(v * 1000) / 1000),
          near: Math.round(s.near * 10) / 10,
          nearKm: Math.round(s.nearKm * 1000) / 1000,
          nearPerPx: Math.round(s.nearPerPx * 1e5) / 1e5,
          inland: Math.round(s.inland * 10) / 10,
          seaL: Math.round(s.seaL * 1e4) / 1e4,
          landL: Math.round(s.landL * 1e4) / 1e4,
          quad: Array.from(s.quad, (v) => Math.round(v * 10) / 10),
        });
      }
    }
    return out;
  }

  /** Every label drawn in the last frame (development and the contrast check). */
  snapshot(): HeadLabelState[] {
    const out: HeadLabelState[] = [];
    const rgb = (v: Vector3): [number, number, number] => [
      Math.round(v.x * 255),
      Math.round(v.y * 255),
      Math.round(v.z * 255),
    ];
    for (const h of this.heads) {
      for (const c of h.copies) {
        if (c.opacity <= 0.01 || Number.isNaN(c.quad[0])) continue;
        out.push({
          id: h.spec.id,
          text: `${h.spec.name} ${h.spec.counts[c.count] ?? ""}`.trim(),
          opacity: Math.round(c.opacity * 1000) / 1000,
          emPx: Math.round(h.emPx * 10) / 10,
          quad: Array.from(c.quad, (v) => Math.round(v * 10) / 10),
          inkPale: rgb(this.inkPale),
          inkDark: rgb(this.inkDark),
        });
      }
    }
    return out;
  }

  dispose(): void {
    for (const h of this.heads)
      for (const c of h.copies) {
        c.name.dispose();
        for (const t of c.counts) t.dispose();
      }
    this.batch.dispose();
  }

  /** Each head's typeset widths and ink, once every text is typeset. */
  private measure(): void {
    const bounds = (t: Text) => {
      const info = t.textRenderInfo as {
        visibleBounds?: [number, number, number, number];
        blockBounds: [number, number, number, number];
      } | null;
      return info?.visibleBounds ?? info?.blockBounds ?? null;
    };
    for (const h of this.heads) {
      const c = h.copies[0];
      const nb = bounds(c.name);
      if (!nb) continue;
      h.nameRight = nb[2];
      let top = nb[3];
      let bottom = nb[1];
      c.counts.forEach((t, k) => {
        const b = bounds(t);
        if (!b) return;
        h.countRight[k] = b[2];
        top = Math.max(top, b[3]);
        bottom = Math.min(bottom, b[1]);
      });
      h.top = top;
      h.bottom = bottom;
    }
    this.sized = true;
  }

  /**
   * How much an em on the chart east and north of a head shows on screen
   * this frame, of an em facing the eye (Head.fx, fy): 1 looking straight
   * down, less as the view meets the chart at a slant.
   */
  private foreshortening(
    h: Head,
    frame: FrameInfo,
    em: number,
    emPx: number,
  ): void {
    const q = this.probe;
    h.fx = 1;
    h.fy = 1;
    h.inFrame = 0;
    h.toward.fill(Number.NaN);
    if (
      !this.corner(q, 0, frame, h.x, h.y) ||
      !this.corner(q, 1, frame, h.x + em, h.y) ||
      !this.corner(q, 2, frame, h.x, h.y + em)
    )
      return;
    h.fx = Math.hypot(q[2] - q[0], q[3] - q[1]) / emPx;
    h.fy = Math.hypot(q[4] - q[0], q[5] - q[1]) / emPx;
    const W = frame.width / frame.dpr;
    const H = frame.height / frame.dpr;
    const out = Math.max(-q[0], q[0] - W, -q[1], q[1] - H);
    h.inFrame = 1 - smooth(0, SCREEN_GAPS_OUT_PX, out);
    // The places toward the eye: down the screen from the head by each
    // gap and half the label's height, centred under it or reaching right
    // or left of it as above and below do, back onto the sea's plane.
    const half = 0.5 * (h.top - h.bottom) * emPx;
    const shift = 0.5 * this.width(h) * emPx * h.fx + 0.6 * emPx;
    for (let i = 0; i < SCREEN_GAPS_EM.length; i++)
      for (let r = 0; r < 3; r++)
        this.onSea(
          frame,
          q[0] + TOWARD_REACHES[r] * shift,
          q[1] + SCREEN_GAPS_EM[i] * emPx + half,
          h.toward,
          3 * i + r,
        );
  }

  /** The point on the sea's plane under a point on screen (CSS px), into out[2i..]: NaN where the view finds none. */
  private onSea(
    frame: FrameInfo,
    sx: number,
    sy: number,
    out: Float64Array,
    i: number,
  ): void {
    const W = frame.width / frame.dpr;
    const H = frame.height / frame.dpr;
    const v = this.v
      .set((sx / W) * 2 - 1, 1 - (sy / H) * 2, 0.5)
      .unproject(frame.camera);
    const e = frame.eye;
    const dz = v.z - e.z;
    if (!(dz < -1e-9)) {
      out[2 * i] = Number.NaN;
      out[2 * i + 1] = Number.NaN;
      return;
    }
    const t = -e.z / dz;
    out[2 * i] = e.x + t * (v.x - e.x);
    out[2 * i + 1] = e.y + t * (v.y - e.y);
  }

  /** The label's width, ems: its name, a space, its widest strength. */
  private width(h: Head): number {
    let widest = 0;
    for (let c = 0; c < h.countRight.length; c++)
      widest = Math.max(widest, h.countRight[c]);
    return h.nameRight + SPACE_EM + widest;
  }

  /** Where a place puts the label's left middle on the chart (world km), into `this.at` (no allocation a frame). */
  private origin(s: Slot, h: Head, em: number): Float64Array {
    const o = this.at;
    const w = this.width(h) * em;
    // A gap on screen: as long on the chart as its side shrinks it.
    const gap = s.onScreen
      ? (s.gap * em) /
        Math.max(
          FORESHORTEN_MIN,
          s.side === "above" || s.side === "below" ? h.fy : h.fx,
        )
      : s.gap * em;
    // About its own ships (the middle of their box's edge on its side), or
    // its head.
    const k =
      s.side === "above"
        ? 0
        : s.side === "below"
          ? 2
          : s.side === "right"
            ? 4
            : 6;
    const hx = s.own ? h.own[k] : h.x;
    const hy = s.own ? h.own[k + 1] : h.y;
    switch (s.side) {
      case "toward": {
        const i = s.towardIndex;
        o[0] = h.toward[2 * i] - 0.5 * w;
        o[1] = h.toward[2 * i + 1];
        return o;
      }
      case "right":
        o[0] = hx + gap;
        o[1] = hy;
        return o;
      case "left":
        o[0] = hx - gap - w;
        o[1] = hy;
        return o;
      default: {
        o[0] =
          s.reach === 0
            ? hx - 0.5 * w
            : s.reach > 0
              ? hx - 0.6 * em
              : hx + 0.6 * em - w;
        o[1] =
          s.side === "above" ? hy + gap - h.bottom * em : hy - gap - h.top * em;
        return o;
      }
    }
  }

  /**
   * How much room a place has (0..1): on the frame, on clean ground, clear
   * of the lettering before it, of its line and of its ships; its outline
   * on screen into its quad.
   */
  private room(
    s: Slot,
    h: Head,
    em: number,
    frame: FrameInfo,
    blockWeight: number,
  ): number {
    const at = this.origin(s, h, em);
    const ox = at[0];
    const oy = at[1];
    if (!Number.isFinite(ox) || !Number.isFinite(oy)) {
      s.quad[0] = Number.NaN;
      s.why.fill(0);
      return 0;
    }
    const w = this.width(h) * em;
    const y0 = oy + h.bottom * em;
    const y1 = oy + h.top * em;
    const q = s.quad;
    const why = s.why;
    why.fill(0);
    if (
      !this.corner(q, 0, frame, ox, y0) ||
      !this.corner(q, 1, frame, ox + w, y0) ||
      !this.corner(q, 2, frame, ox + w, y1) ||
      !this.corner(q, 3, frame, ox, y1)
    ) {
      q[0] = Number.NaN;
      return 0;
    }
    why.fill(1);
    // On the frame.
    const W = frame.width / frame.dpr;
    const H = frame.height / frame.dpr;
    let out = 0;
    for (let i = 0; i < 4; i++) {
      const x = q[i * 2];
      const y = q[i * 2 + 1];
      out = Math.max(
        out,
        EDGE_PX - x,
        x - (W - EDGE_PX),
        EDGE_PX - y,
        y - (H - EDGE_PX),
      );
    }
    why[1] = (1 - smooth(0, 6, out)) * (s.onScreen ? h.inFrame : 1);
    why[2] = this.ground(s, ox, w, y0, y1, frame);
    // Clear of the lettering before it: the names and the caption's card.
    for (const screen of this.keepClear)
      for (let j = 0; j < screen.count; j++) {
        const weight = screen.weights[j];
        if (weight > 0.001) why[3] *= clearOf(q, screen.quads[j], weight);
      }
    // The labels before it this frame.
    for (const other of this.heads) {
      if (other === h) break;
      for (const c of other.copies)
        if (c.opacity > 0.001) why[4] *= clearOf(q, c.quad, c.opacity);
    }
    for (const other of this.heads)
      for (let i = 0; i < other.lineCount; i++)
        why[5] *= clearOf(q, other.lines[i], other === h ? 1 : other.presence);
    if (blockWeight > 0) why[6] = clearOf(q, this.block, blockWeight);
    // Every ship drawn, the near ones only (clearOf is 1 beyond YIELD_PX).
    if (this.shipCount > 0) {
      let qx0 = q[0];
      let qx1 = q[0];
      let qy0 = q[1];
      let qy1 = q[1];
      for (let i = 1; i < 4; i++) {
        qx0 = Math.min(qx0, q[i * 2]);
        qx1 = Math.max(qx1, q[i * 2]);
        qy0 = Math.min(qy0, q[i * 2 + 1]);
        qy1 = Math.max(qy1, q[i * 2 + 1]);
      }
      const m = YIELD_PX[1];
      const b = this.shipBox;
      for (let j = 0; j < this.shipCount; j++) {
        if (
          b[4 * j] > qx1 + m ||
          b[4 * j + 2] < qx0 - m ||
          b[4 * j + 1] > qy1 + m ||
          b[4 * j + 3] < qy0 - m
        )
          continue;
        why[6] *= clearOf(q, this.ships[j], this.shipWeight[j]);
      }
    }
    let room = 1;
    // why[7] (how well its ink reads there) is inside why[2].
    for (let i = 1; i < 7; i++) room *= why[i];
    why[0] = room;
    // Decisively: a place has room or hasn't, but for a narrow band where it
    // passes from the one to the other, so a label stands in one place, not
    // in faint copies wherever there is some room.
    return smooth(0.3, 0.7, room);
  }

  /**
   * How clean the ground under a label is, and how well its ink reads on it
   * (0..1): the sea beyond the inner waterlines, or the land well inland,
   * where the ink holds READ_CONTRAST against the chart's colour there. The
   * coast's distance (world km) is read at points along the label's middle
   * line, each standing for its share of the box (less its reach, the half
   * diagonal of that share; the distance is 1-Lipschitz), so a long label
   * lying along a coast is judged by how near it comes, not by its whole
   * length; and it is measured on screen as the shader's waterlines are,
   * by the distance's change per pixel on screen (its gradient on the
   * chart, through the chart's map to the screen at each point), so where the view
   * meets the chart at a slant the waterlines' band, foreshortened, reaches
   * farther out on the chart than it would face on. Its ink is read against
   * the brightest of the sea (or the darkest of the land) at the label's
   * corners and middle. Slot.why[7] holds the read share of the ground that
   * wins.
   */
  private ground(
    s: Slot,
    x0: number,
    w: number,
    y0: number,
    y1: number,
    frame: FrameInfo,
  ): number {
    const coast = this.coast;
    const model = this.groundModel;
    s.why[7] = 1;
    if (!coast || !model) return 1;
    const h = y1 - y0;
    const y = 0.5 * (y0 + y1);
    const q = this.probe;
    const e = 0.25 * h;
    const step = w / GROUND_SAMPLES;
    const reach = 0.5 * Math.hypot(step, h);
    let near = Number.POSITIVE_INFINITY;
    let inland = Number.POSITIVE_INFINITY;
    let nearPerPx = 0;
    for (let i = 0; i < GROUND_SAMPLES; i++) {
      const x = x0 + (i + 0.5) * step;
      // The chart's map to the screen here: CSS px per km east (a) and
      // north (b).
      if (
        !this.corner(q, 0, frame, x, y) ||
        !this.corner(q, 1, frame, x + e, y) ||
        !this.corner(q, 2, frame, x, y + e)
      )
        return 0;
      const ax = (q[2] - q[0]) / e;
      const ay = (q[3] - q[1]) / e;
      const bx = (q[4] - q[0]) / e;
      const by = (q[5] - q[1]) / e;
      const det = ax * by - ay * bx;
      if (!(Math.abs(det) > 1e-12)) return 0;
      const d = coast.distance(x, y);
      const gx = (coast.distance(x + GRADIENT_KM, y) - d) / GRADIENT_KM;
      const gy = (coast.distance(x, y + GRADIENT_KM) - d) / GRADIENT_KM;
      // The distance's change per CSS px on screen, as the shader's pxKm
      // (the inverse transpose of the outline's map applied to its gradient
      // on the chart, as it is: where a tile's distance is capped the field
      // is flat and, as on the GPU, no waterline is drawn there).
      const perPx =
        Math.hypot(by * gx - ay * gy, ax * gy - bx * gx) / Math.abs(det);
      if (!(perPx > 1e-9)) {
        if (d < 0) near = Number.NEGATIVE_INFINITY;
        else inland = Number.NEGATIVE_INFINITY;
        continue;
      }
      const spread = reach * Math.hypot(gx, gy);
      const n = (d - spread) / perPx;
      if (n < near) {
        near = n;
        nearPerPx = perPx;
        s.nearKm = d;
      }
      inland = Math.min(inland, (-d - spread) / perPx);
    }
    s.near = near;
    s.nearPerPx = nearPerPx;
    s.inland = inland;
    s.seaL = Number.NaN;
    s.landL = Number.NaN;
    const clear =
      (s.onScreen ? SEA_CLEAR_SHARE_LAST : SEA_CLEAR_SHARE) *
      WATERLINE_REACH_PX;
    const seaClean = smooth(clear, clear + CLEAR_RISE_PX, near);
    const landClean = smooth(LAND_CLEAR_PX[0], LAND_CLEAR_PX[1], inland);
    if (seaClean <= 0.001 && landClean <= 0.001) return 0;
    const at = this.readAt;
    at[0] = x0;
    at[1] = y0;
    at[2] = x0 + w;
    at[3] = y0;
    at[4] = x0 + w;
    at[5] = y1;
    at[6] = x0;
    at[7] = y1;
    at[8] = x0 + 0.5 * w;
    at[9] = y;
    const c = this.rgb;
    let seaRead = 0;
    if (seaClean > 0.001) {
      let bright = 0;
      const water = waterlineInk(
        near / WATERLINE_REACH_PX,
        nearPerPx,
        frame.dpr,
      );
      for (let i = 0; i < READ_POINTS; i++) {
        model.sea(at[2 * i], at[2 * i + 1], frame, water, c);
        bright = Math.max(bright, luminance(c));
      }
      s.seaL = bright;
      seaRead = smooth(
        READ_CONTRAST[0],
        READ_CONTRAST[1],
        contrast(this.inkPaleL, bright),
      );
    }
    let landRead = 0;
    if (landClean > 0.001) {
      let dark = 1;
      for (let i = 0; i < READ_POINTS; i++) {
        model.land(at[2 * i], at[2 * i + 1], frame, c);
        dark = Math.min(dark, luminance(c));
      }
      s.landL = dark;
      landRead = smooth(
        READ_CONTRAST[0],
        READ_CONTRAST[1],
        contrast(this.inkDarkL, dark),
      );
    }
    const sea = seaClean * seaRead;
    const land = landClean * landRead;
    s.why[7] = sea >= land ? seaRead : landRead;
    return Math.max(sea, land);
  }

  /** This frame's ships on screen (setGlyphs), the ones that show. */
  private shipQuads(frame: FrameInfo): void {
    let n = 0;
    const dpr = frame.dpr;
    const pt = this.probe;
    for (const d of this.glyphs) {
      for (let i = 0; i < d.alpha.length; i++) {
        const a = d.alpha[i];
        if (!(a >= SHIP_MIN) || !(d.height[i] > 0)) continue;
        if (!this.corner(pt, 0, frame, d.x[i], d.y[i])) continue;
        const h = d.height[i] / dpr;
        const x0 = pt[0] - SHIP_HALF_WIDTH * h;
        const x1 = pt[0] + SHIP_HALF_WIDTH * h;
        const y0 = pt[1] - h;
        const y1 = pt[1] + SHIP_BELOW * h;
        const q = this.ships[n];
        q[0] = x0;
        q[1] = y1;
        q[2] = x1;
        q[3] = y1;
        q[4] = x1;
        q[5] = y0;
        q[6] = x0;
        q[7] = y0;
        const b = this.shipBox;
        b[4 * n] = x0;
        b[4 * n + 1] = y0;
        b[4 * n + 2] = x1;
        b[4 * n + 3] = y1;
        this.shipWeight[n] = Math.min(1, a);
        n++;
      }
    }
    this.shipCount = n;
  }

  /**
   * A head's line on screen, a quad a segment of its trail into its
   * `lines` (CSS px, LINE_HALF_PX either side of it, the first reaching a
   * little past the head for the arrowhead's tip); lineCount of them.
   */
  private lineQuads(h: Head, frame: FrameInfo): void {
    h.lineCount = 0;
    const px = this.trailPx;
    let seen = 0;
    for (let i = 0; i < h.trailCount; i++) {
      if (!this.corner(px, i, frame, h.trail[i * 2], h.trail[i * 2 + 1])) break;
      seen++;
    }
    for (let i = 0; i + 1 < seen; i++) {
      const ax = px[i * 2];
      const ay = px[i * 2 + 1];
      const bx = px[i * 2 + 2];
      const by = px[i * 2 + 3];
      const l = Math.hypot(bx - ax, by - ay);
      if (l < 1e-3) continue;
      const nx = (-(by - ay) / l) * LINE_HALF_PX;
      const ny = ((bx - ax) / l) * LINE_HALF_PX;
      const fx = i === 0 ? ((ax - bx) / l) * LINE_HALF_PX : 0;
      const fy = i === 0 ? ((ay - by) / l) * LINE_HALF_PX : 0;
      const t = h.lines[h.lineCount++];
      t[0] = ax + fx + nx;
      t[1] = ay + fy + ny;
      t[2] = bx + nx;
      t[3] = by + ny;
      t[4] = bx - nx;
      t[5] = by - ny;
      t[6] = ax + fx - nx;
      t[7] = ay + fy - ny;
    }
  }

  /** Draws one copy of a label at a place (-1: none) for the frame. */
  private draw(c: Copy, h: Head, slot: number, seen: number, em: number): void {
    const s = slot >= 0 ? h.slots[slot] : null;
    if (!s || s.weight <= 0.001) {
      this.hide(c);
      return;
    }
    c.slot = slot;
    c.opacity = seen * s.weight;
    c.quad.set(s.quad);
    const at = this.origin(s, h, em);
    const ox = at[0];
    const oy = at[1];
    c.name.position.set(ox, oy, 0);
    c.name.scale.setScalar(em);
    c.name.fillOpacity = c.opacity;
    const cx = ox + (h.nameRight + SPACE_EM) * em;
    c.count = 0;
    for (let k = 1; k < h.counts.length; k++)
      if (h.counts[k] > h.counts[c.count]) c.count = k;
    c.counts.forEach((t, k) => {
      const a = c.opacity * h.counts[k];
      if (a <= 0.001) {
        t.scale.setScalar(0);
        t.fillOpacity = 0;
        return;
      }
      t.position.set(cx, oy, 0);
      t.scale.setScalar(em);
      t.fillOpacity = a;
    });
  }

  private hide(c: Copy): void {
    c.slot = -1;
    c.opacity = 0;
    c.quad[0] = Number.NaN;
    c.name.scale.setScalar(0);
    c.name.fillOpacity = 0;
    for (const t of c.counts) {
      t.scale.setScalar(0);
      t.fillOpacity = 0;
    }
  }

  /** Projects a point on the sea to CSS px into quad corner i; false behind the eye. */
  private corner(
    quad: Float64Array,
    i: number,
    frame: FrameInfo,
    x: number,
    y: number,
  ): boolean {
    const cam = frame.camera;
    const v = this.v.set(x, y, 0).applyMatrix4(cam.matrixWorldInverse);
    if (v.z > -cam.near) return false;
    v.applyMatrix4(cam.projectionMatrix);
    quad[i * 2] = (v.x * 0.5 + 0.5) * (frame.width / frame.dpr);
    quad[i * 2 + 1] = (0.5 - v.y * 0.5) * (frame.height / frame.dpr);
    return true;
  }
}

/** How much room a quad leaves another that holds as firmly as `weight` (0..1). */
function clearOf(q: Float64Array, other: Float64Array, weight: number): number {
  if (Number.isNaN(other[0])) return 1;
  const apart = quadsApart(q, other);
  return 1 - weight * (1 - smooth(YIELD_PX[0], YIELD_PX[1], apart));
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
