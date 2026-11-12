import {
  type BufferGeometry,
  Mesh,
  type Object3D,
  type PerspectiveCamera,
  Vector3,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { quadsApart, type ScreenText, YIELD_PX } from "../lettering/Lettering";
import {
  RING_STOP_EM,
  type TrackLabel,
  type TrackLabelState,
  TrackLabels,
} from "../lettering/TrackLabels";
import type { TerrainField } from "../terrain/field";
import { dateOf, dayAndMonth, dayNumeral } from "./dates";
import { type RoutePoint, smoothPath } from "./Route";
import {
  type LinePattern,
  type LineStyle,
  PatternMaterial,
  type Polyline,
  ribbonGeometry,
} from "./ribbon";

/**
 * The fleets' tracks and the army's march, drawn as the period's track
 * charts drew them (docs/research/scene-02/a-t4.md, directive 10, after
 * Faden's chart of Nelson's pursuit, 1807):
 *
 * - British (Nelson's, Calder's): a dotted ink hairline under a thin,
 *   translucent carmine wash, slightly uneven like a hand wash, with small
 *   open day circles at the noon positions and the day of the month beside
 *   each, off the line: outside each bend, on one side along straight runs.
 *   The month only at its start or at key points; a short italic legend
 *   along the line.
 * - Combined (the French and Spanish fleets): told apart by the pattern
 *   first, a dash-dot ink line, with a faint wash of its slate violet.
 * - Army (the march to Ulm): a dashed line in the land's dark ink, lying
 *   on the relief.
 *
 * On the dark slate sea the ink is the pale ink of the isobaths and
 * waterlines; nothing glows. A track draws itself to a head set by date
 * (`Track.setHead`), and its circles and dates come with the head and go
 * again when it goes back. Waypoints are dated in days from 1 January 1805
 * (dates.ts); an undated waypoint takes its time from its distance along
 * the curve between the dated ones, and a stay (`until`) holds the head.
 *
 * Every track of a `Tracks` layer is one draw call for the lines (a
 * PatternMaterial), one for the circles and one for the lettering.
 */

/** The ways a track is drawn. */
export type TrackStyle = "british" | "combined" | "army";

/** Which side of a line its dates go: north, south, west or east of it. */
export type LabelSide = "above" | "below" | "left" | "right";

export interface TrackPoint {
  lon: number;
  lat: number;
  /** When the track passed here, days from 1 January 1805 (dates.ts). */
  day?: number;
  /** A stay: when the track left again (the head waits here till then). */
  until?: number;
  /** A noon position: a day circle with the day of the month beside it. */
  noon?: boolean;
  /**
   * Written beside the point: a key date ("11 May", "25–30 September").
   * A noon position's own is its day, or its day and month on the 1st and
   * at the track's first date.
   */
  label?: string;
  /** The side for this point's date, instead of the track's rule. */
  side?: LabelSide;
}

/** A short italic legend along a stretch of the line. */
export interface TrackLegend {
  text: string;
  /** The stretch, from one day to another: it runs along its chord. */
  from: number;
  to: number;
  /** Default: the side the stretch bows toward, so its ends stand clear. */
  side?: LabelSide;
}

export interface TrackSpec {
  id: string;
  style: TrackStyle;
  points: readonly TrackPoint[];
  legend?: TrackLegend;
  /** Where dates go along straight runs (default "below"); at a bend, outside it. */
  side?: LabelSide;
}

/** How strongly a line is drawn: its pen, its wash and their opacities. */
interface Weight {
  /** The ink's pen width, CSS px: a dot's diameter, a dash's width. */
  pen: number;
  /** The wash's width, narrowest and widest, CSS px. */
  wash: readonly [number, number];
  ink: number;
  washOpacity: number;
}

interface StyleSpec {
  pattern: LinePattern;
  /** The pattern's period on screen and a dash's length, CSS px. */
  period: number;
  dash: number;
  /** Pale ink for the sea, the land's dark ink for a march over it. */
  ink: "pale" | "dark";
  /** The wash, an sRGB colour. */
  wash: number;
  /**
   * The line being sailed (Track.emphasis 1), and one already sailed (0):
   * the one strong, the others thinned to a light ink line without their
   * wash, so the chart shows where the story is and never turns into a web
   * of equal lines.
   */
  active: Weight;
  passed: Weight;
}

/**
 * The styles. Carmine, on the dark slate sea, is a rose carmine laid thin:
 * it reads by its hue, lighter than the sea, and stays a crimson (blue in
 * its red) rather than turning toward terracotta. The combined fleet's
 * wash is the slate violet of its glyphs.
 */
const STYLES: Record<TrackStyle, StyleSpec> = {
  british: {
    pattern: "dotted",
    period: 3.6,
    dash: 0,
    ink: "pale",
    wash: 0xc0425f,
    active: { pen: 1.6, wash: [2.3, 3.4], ink: 1, washOpacity: 0.8 },
    passed: { pen: 1.1, wash: [1.4, 2.2], ink: 0.4, washOpacity: 0 },
  },
  combined: {
    pattern: "dashdot",
    period: 11,
    dash: 5,
    ink: "pale",
    wash: 0x9c97b8,
    active: { pen: 1.45, wash: [2.3, 3.4], ink: 1, washOpacity: 0.6 },
    passed: { pen: 1.05, wash: [1.4, 2.2], ink: 0.4, washOpacity: 0 },
  },
  army: {
    pattern: "dashed",
    period: 8,
    dash: 4.5,
    ink: "dark",
    wash: 0,
    active: { pen: 1.6, wash: [0, 0], ink: 0.9, washOpacity: 0 },
    passed: { pen: 1.2, wash: [0, 0], ink: 0.45, washOpacity: 0 },
  },
};

/**
 * A moving head's arrowhead, CSS px: a slim point, its back hollowed by a
 * share of its length, in the line's ink, its tip on the head.
 */
const ARROW_LENGTH_PX = 10;
const ARROW_HALF_PX = 3.4;
const ARROW_HOLLOW = 0.28;

/**
 * The tracks' lettering, em on screen (CSS px): the day numerals are the
 * smallest lettering of Faden's chart, a little under the ports' names
 * (docs/research/scene-02/t4-chart-style.md, section 7).
 */
const EM_PX = 11;
/** From a circle's centre to its numeral's nearest edge, ems. */
const CIRCLE_CLEAR_EM = 0.42;
/** From the line to a key date's or a legend's nearest edge, ems. */
const LINE_CLEAR_EM = 0.38;
/** Circles closer on screen than this (CSS px) give way by rank. */
const CIRCLE_ROOM_PX = 10;
/** The gap labels keep along the line, ems. */
const LABEL_GAP_EM = 0.5;
/** A mark comes in over this share of the last leg before the head reaches it. */
const REVEAL_SHARE = 0.18;
/** A bend sharper than this (sine of the turn) takes the dates outside it. */
const BEND = Math.sin((12 * Math.PI) / 180);

const SIDE_DIR: Record<LabelSide, readonly [number, number]> = {
  above: [0, 1],
  below: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

/**
 * A day of the month's rank for thinning, as an axis numbers its ticks:
 * the tens over the fives over the even days over the odd.
 */
function dayRank(date: number): number {
  if (date % 10 === 0) return 3;
  if (date % 5 === 0) return 2;
  return date % 2 === 0 ? 1 : 0;
}

/** Ranks above any day's: a month, and a key date. */
const MONTH_RANK = 10;
const KEY_RANK = 20;

export class Track {
  readonly id: string;
  readonly style: TrackStyle;
  /** Length of the drawn curve, world km. */
  readonly length: number;
  /** The first and the last dated day. */
  readonly start: number;
  readonly end: number;
  /** The curve's points, interleaved world x, y, and the distance along it at each. */
  readonly points: Float32Array;
  readonly along: Float32Array;
  /** Each waypoint's distance along the curve, km. */
  readonly waypointKm: readonly number[];
  /** Each waypoint's index among the curve's points. */
  readonly waypointIndex: readonly number[];
  /** The whole track's opacity (0 hides it). */
  opacity = 1;
  /**
   * How strongly it is drawn: 1 the line being sailed (its wash, its pen
   * and its day marks), 0 a line already sailed (a light ink line alone).
   */
  emphasis = 1;
  /** Its head's arrowhead (0..1): where a fleet sails at its head. */
  arrow = 0;
  /** The drawing head, km along the curve; negative before the track starts. */
  headKm: number;
  private readonly days: number[] = [];
  private readonly kms: number[] = [];

  constructor(
    readonly spec: TrackSpec,
    /** The track's index in its layer. */
    readonly line: number,
  ) {
    this.id = spec.id;
    this.style = spec.style;
    const xy = spec.points.flatMap((p) => [worldX(p.lon), worldY(p.lat)]);
    const indices: number[] = [];
    this.points = smoothPath(xy, indices);
    const n = this.points.length / 2;
    this.along = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      this.along[i] =
        this.along[i - 1] +
        Math.hypot(
          this.points[i * 2] - this.points[i * 2 - 2],
          this.points[i * 2 + 1] - this.points[i * 2 - 1],
        );
    }
    this.length = this.along[n - 1];
    this.waypointIndex = indices;
    this.waypointKm = indices.map((i) => this.along[i]);
    spec.points.forEach((p, i) => {
      if (p.day === undefined) return;
      const km = this.waypointKm[i];
      this.addKnot(p.day, km);
      if (p.until !== undefined) this.addKnot(p.until, km);
    });
    if (!this.days.length) throw new Error(`track ${spec.id}: no dates`);
    this.start = this.days[0];
    this.end = this.days[this.days.length - 1];
    this.headKm = this.length;
  }

  private addKnot(day: number, km: number): void {
    const last = this.days.length - 1;
    if (last >= 0 && day < this.days[last]) {
      throw new Error(`track ${this.id}: dates out of order at day ${day}`);
    }
    this.days.push(day);
    this.kms.push(km);
  }

  /** Draws the track up to where it was on a day. */
  setHead(day: number): void {
    this.headKm = this.kmAtDay(day);
  }

  /**
   * How far along the curve the track was on a day, km: -1 before it
   * began, its whole length after its last date.
   */
  kmAtDay(day: number): number {
    const days = this.days;
    const last = days.length - 1;
    if (day < days[0]) return -1;
    if (day >= days[last]) return this.length;
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (days[mid] <= day) lo = mid;
      else hi = mid;
    }
    const span = days[hi] - days[lo];
    const t = span > 0 ? (day - days[lo]) / span : 1;
    return this.kms[lo] + (this.kms[hi] - this.kms[lo]) * t;
  }

  /**
   * The point a distance along the curve (world km, on the sea surface)
   * and the heading there (radians from north, clockwise).
   */
  pointAt(km: number, out: RoutePoint): RoutePoint {
    const target = Math.min(this.length, Math.max(0, km));
    const along = this.along;
    let lo = 0;
    let hi = along.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (along[mid] < target) lo = mid;
      else hi = mid;
    }
    const span = along[hi] - along[lo] || 1;
    const t = (target - along[lo]) / span;
    const x0 = this.points[lo * 2];
    const y0 = this.points[lo * 2 + 1];
    const x1 = this.points[hi * 2];
    const y1 = this.points[hi * 2 + 1];
    out.x = x0 + (x1 - x0) * t;
    out.y = y0 + (y1 - y0) * t;
    out.heading = Math.atan2(x1 - x0, y1 - y0);
    return out;
  }

  /** Where the track was on a day, for a squadron sailing at its head. */
  pointAtDay(day: number, out: RoutePoint): RoutePoint {
    return this.pointAt(Math.max(0, this.kmAtDay(day)), out);
  }
}

/** A circle or a label of a track: where it stands and when it shows. */
interface Mark {
  track: Track;
  /** The site, world km. */
  x: number;
  y: number;
  /** The head brings it in between these distances along the track, km. */
  revealFrom: number;
  revealAt: number;
  /** Its rank for thinning, and its index among the track's marks of its kind, by distance. */
  rank: number;
  /** The nearest marks of its kind and track on either side that outrank it. */
  above: [number, number];
  /** The track's direction at the site (a unit vector on the chart). */
  tx: number;
  ty: number;
  /** A circle's index, or a label's in the lettering. */
  index: number;
  /** A circle's point among the curve's; -1 for a label. */
  at: number;
  /** A day's label: its circle's mark; -1 for none. */
  circle: number;
  /** A legend: the ends of its stretch, world km. */
  ends: readonly [number, number, number, number] | null;
}

/** A point on the chart, seen this frame. */
interface Seen {
  /** CSS px on screen. */
  sx: number;
  sy: number;
  /** In front of the camera (1) or not (0). */
  front: number;
  /** Distance from the eye, km. */
  dist: number;
}

export class Tracks implements ChartLayer {
  readonly mesh: Mesh<BufferGeometry, PatternMaterial>;
  readonly labels: TrackLabels;
  /** Resolves once every label has been typeset. */
  readonly ready: Promise<void>;
  private readonly tracks: Track[];
  private readonly circles: Mark[] = [];
  private readonly marks: Mark[] = [];
  private readonly circleSeen: Seen[];
  private readonly markSeen: Seen[];
  private readonly endsSeen: Seen[];
  private readonly circleAlpha: Float32Array;
  /** Each label's extent along its line, ems (known once typeset). */
  private readonly extent: Float32Array;
  private readonly wash: Vector3[];
  private readonly color = new Vector3();
  /** This frame's style of the line being set (Tracks.update). */
  private readonly lineStyle: LineStyle & { wash: [number, number] } = {
    pattern: "solid",
    width: 1,
    period: 1,
    dash: 0,
    wash: [0, 0],
  };
  /** The lettering the tracks' own keeps clear of on screen (setKeepClear). */
  private keepClear: ScreenText | null = null;
  private readonly quad = new Float64Array(8);
  private readonly v = new Vector3();
  private sized = false;

  constructor(field: TerrainField, specs: readonly TrackSpec[]) {
    this.tracks = specs.map((spec, i) => new Track(spec, i));
    const labels: TrackLabel[] = [];
    for (const track of this.tracks) this.collect(track, labels);
    this.circleSeen = this.circles.map(() => seen());
    this.markSeen = this.marks.map(() => seen());
    this.endsSeen = this.marks.map(() => seen());
    this.circleAlpha = new Float32Array(this.circles.length);
    this.extent = new Float32Array(this.marks.length);
    rankNeighbours(this.circles);
    rankNeighbours(this.marks);

    const lines: Polyline[] = [];
    for (const track of this.tracks) this.pieces(track, lines);
    const material = new PatternMaterial(
      field,
      this.tracks.length,
      this.circles.length,
      { lift: true },
    );
    this.wash = this.tracks.map((track) => hexColor(STYLES[track.style].wash));
    this.mesh = new Mesh(ribbonGeometry(lines), material);
    this.mesh.name = "tracks";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 21;

    this.labels = new TrackLabels(field, labels, this.circles.length);
    this.ready = this.labels.ready.then(() => {
      this.measure();
    });
  }

  /** The objects to add to the scene: the lines, the circles and the lettering. */
  get objects(): Object3D[] {
    return [this.mesh, ...this.labels.objects];
  }

  /** A track by its id. */
  track(id: string): Track {
    const track = this.tracks.find((t) => t.id === id);
    if (!track) throw new Error(`tracks: no track "${id}"`);
    return track;
  }

  /** Draws every track up to where it was on a day: the story's date. */
  setDay(day: number): void {
    for (const track of this.tracks) track.setHead(day);
  }

  update(frame: FrameInfo): void {
    const material = this.mesh.material;
    material.update(frame);
    const light = frame.light;
    for (const track of this.tracks) {
      const style = STYLES[track.style];
      const { active: a, passed: b } = style;
      const e = Math.min(1, Math.max(0, track.emphasis));
      const ls = this.lineStyle;
      ls.pattern = style.pattern;
      ls.width = mix(b.pen, a.pen, e);
      ls.period = style.period;
      ls.dash = style.dash;
      ls.wash[0] = mix(b.wash[0], a.wash[0], e);
      ls.wash[1] = mix(b.wash[1], a.wash[1], e);
      material.setStyle(track.line, ls);
      material.setState(track.line, track.headKm, track.opacity);
      material.setArrow(
        track.line,
        Math.min(1, Math.max(0, track.arrow)),
        ARROW_LENGTH_PX,
        ARROW_HALF_PX,
        ARROW_HOLLOW,
      );
      material.setInk(
        track.line,
        style.ink === "pale" ? light.inkPale : light.ink,
        mix(b.ink, a.ink, e),
      );
      // Pigment on the chart darkens with the night.
      this.color
        .copy(this.wash[track.line])
        .multiplyScalar(1 - 0.5 * light.night);
      material.setWash(
        track.line,
        this.color,
        mix(b.washOpacity, a.washOpacity, e),
      );
    }

    const camera = frame.camera;
    const cssPerRadian = frame.pxPerRadian / frame.dpr;
    const halfW = (0.5 * frame.width) / frame.dpr;
    const halfH = (0.5 * frame.height) / frame.dpr;
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      this.see(camera, c.x, c.y, halfW, halfH, this.circleSeen[i]);
    }
    for (let i = 0; i < this.marks.length; i++) {
      const m = this.marks[i];
      this.see(camera, m.x, m.y, halfW, halfH, this.markSeen[i]);
    }

    // Circles: in with the head, out where they crowd, faded by
    // foreshortening and the haze.
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      const s = this.circleSeen[i];
      const room = this.room(this.circleSeen, c.above, s);
      const alpha =
        s.front *
        reveal(c) *
        smooth(0.7 * CIRCLE_ROOM_PX, CIRCLE_ROOM_PX, room) *
        this.legible(frame, s.dist) *
        c.track.opacity *
        c.track.emphasis;
      this.circleAlpha[i] = alpha;
      const em = (EM_PX * s.dist) / cssPerRadian;
      this.labels.setRing(c.index, c.x, c.y, em, alpha);
      material.setCircle(c.index, RING_STOP_EM * em, alpha);
    }
    material.commit();

    for (let i = 0; i < this.marks.length; i++) {
      const m = this.marks[i];
      const s = this.markSeen[i];
      const em = (EM_PX * s.dist) / cssPerRadian;
      // Day marks only on the line being sailed.
      let alpha =
        s.front *
        reveal(m) *
        this.legible(frame, s.dist) *
        m.track.opacity *
        m.track.emphasis;
      if (m.ends) {
        // A legend shows where its stretch is long enough on screen.
        const e = this.endsSeen[i];
        this.see(camera, m.ends[0], m.ends[1], halfW, halfH, e);
        const ax = e.sx;
        const ay = e.sy;
        this.see(camera, m.ends[2], m.ends[3], halfW, halfH, e);
        const chord = Math.hypot(e.sx - ax, e.sy - ay);
        const need = this.labels.width(m.index) * EM_PX * 1.1;
        alpha *= smooth(0.85 * need, need, chord);
      } else {
        const need = (this.extent[i] + LABEL_GAP_EM) * EM_PX;
        alpha *= smooth(0.8 * need, need, this.room(this.markSeen, m.above, s));
        if (m.circle >= 0) alpha = Math.min(alpha, this.circleAlpha[m.circle]);
      }
      if (!this.sized) alpha = 0;
      this.labels.set(m.index, em, alpha);
      // Clear of the chart's names and the caption's card.
      if (alpha > 0.001 && this.keepClear) {
        alpha *= this.clearOf(this.keepClear, m.index, frame);
        this.labels.set(m.index, em, alpha);
      }
    }
    this.labels.update(frame);
  }

  /**
   * Lettering on screen the tracks' dates keep clear of: the chart's names
   * and the caption's card (Lettering.screen). A date fades as it comes
   * near them, as a minor name gives way to the names that rank before it.
   * Updated before the tracks each frame (the chart's layers update in the
   * order they were added).
   */
  setKeepClear(screen: ScreenText | null): void {
    this.keepClear = screen;
  }

  /** How much of label i may show for the lettering it must keep clear of. */
  private clearOf(screen: ScreenText, i: number, frame: FrameInfo): number {
    if (!this.labels.outline(i, frame, this.quad)) return 1;
    let keep = 1;
    for (let j = 0; j < screen.count; j++) {
      const w = screen.weights[j];
      if (w <= 0.001) continue;
      const apart = quadsApart(this.quad, screen.quads[j]);
      keep *= 1 - w * (1 - smooth(YIELD_PX[0], YIELD_PX[1], apart));
      if (keep <= 0.001) return 0;
    }
    return keep;
  }

  /** Every label's state in the last frame (development and tests). */
  snapshot(): TrackLabelState[] {
    return this.labels.snapshot();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.labels.dispose();
  }

  /** A track's circles and labels: their sites, ranks and directions. */
  private collect(track: Track, labels: TrackLabel[]): void {
    const spec = track.spec;
    const points = spec.points;
    // Where marks stand along the track, for the reach of each bend.
    const stops: number[] = [];
    points.forEach((p, i) => {
      if (p.noon || p.label) stops.push(track.waypointKm[i]);
    });
    const prevKm = (km: number) => {
      let best = -Infinity;
      for (const s of stops) if (s < km - 1e-6) best = s;
      return best;
    };
    let first = true;
    const circleOf = new Map<number, number>();
    points.forEach((p, i) => {
      if (!p.noon && !p.label) return;
      const km = track.waypointKm[i];
      const before = prevKm(km);
      const lead = Number.isFinite(before) ? km - before : 0;
      const revealFrom = km - Math.max(1, REVEAL_SHARE * lead);
      if (p.noon) {
        const day = p.day ?? 0;
        circleOf.set(i, this.circles.length);
        this.circles.push({
          ...this.site(track, km),
          track,
          revealFrom,
          revealAt: km,
          rank: dayRank(dateOf(day).date),
          above: [-1, -1],
          index: this.circles.length,
          at: track.waypointIndex[i],
          circle: -1,
          ends: null,
        });
      }
      const day = p.day ?? 0;
      const monthly = first || dateOf(day).date === 1;
      const text = p.label ?? (monthly ? dayAndMonth(day) : dayNumeral(day));
      first = false;
      const reach = this.reach(track, km, stops);
      const [nx, ny] = this.side(track, km, reach, p.side ?? null, spec.side);
      const site = this.site(track, km);
      labels.push({
        text,
        x: site.x,
        y: site.y,
        angle: 0,
        dirX: nx,
        dirY: ny,
        clear: p.noon ? CIRCLE_CLEAR_EM : LINE_CLEAR_EM,
      });
      this.marks.push({
        ...site,
        track,
        revealFrom,
        revealAt: km,
        rank:
          p.label && !p.noon
            ? KEY_RANK
            : monthly
              ? MONTH_RANK
              : dayRank(dateOf(day).date),
        above: [-1, -1],
        index: labels.length - 1,
        at: -1,
        circle: circleOf.get(i) ?? -1,
        ends: null,
      });
    });
    const legend = spec.legend;
    if (legend) {
      const k0 = Math.max(0, track.kmAtDay(legend.from));
      const k1 = Math.max(k0, track.kmAtDay(legend.to));
      const a = track.pointAt(k0, { x: 0, y: 0, heading: 0 });
      const b = track.pointAt(k1, { x: 0, y: 0, heading: 0 });
      const mid = track.pointAt(0.5 * (k0 + k1), { x: 0, y: 0, heading: 0 });
      const cx = b.x - a.x;
      const cy = b.y - a.y;
      const chord = Math.hypot(cx, cy) || 1;
      let angle = Math.atan2(cy, cx);
      // Never upside down.
      if (angle > Math.PI / 2) angle -= Math.PI;
      else if (angle <= -Math.PI / 2) angle += Math.PI;
      let nx = -cy / chord;
      let ny = cx / chord;
      const [wx, wy] = legend.side
        ? SIDE_DIR[legend.side]
        : [mid.x - 0.5 * (a.x + b.x), mid.y - 0.5 * (a.y + b.y)];
      if (nx * wx + ny * wy < 0) {
        nx = -nx;
        ny = -ny;
      }
      labels.push({
        text: legend.text,
        x: mid.x,
        y: mid.y,
        angle,
        dirX: nx,
        dirY: ny,
        clear: LINE_CLEAR_EM,
      });
      this.marks.push({
        x: mid.x,
        y: mid.y,
        tx: cx / chord,
        ty: cy / chord,
        track,
        revealFrom: k1 - Math.max(1, REVEAL_SHARE * (k1 - k0)),
        revealAt: k1,
        rank: KEY_RANK,
        above: [-1, -1],
        index: labels.length - 1,
        at: -1,
        circle: -1,
        ends: [a.x, a.y, b.x, b.y],
      });
    }
  }

  /** The point and the line's direction at a distance along a track. */
  private site(track: Track, km: number) {
    const p = track.pointAt(km, { x: 0, y: 0, heading: 0 });
    return { x: p.x, y: p.y, tx: Math.sin(p.heading), ty: Math.cos(p.heading) };
  }

  /** How far either way a mark's bend is judged: about half its legs. */
  private reach(track: Track, km: number, stops: number[]): number {
    let lead = Infinity;
    for (const s of stops) {
      if (Math.abs(s - km) > 1e-6) lead = Math.min(lead, Math.abs(s - km));
    }
    if (!Number.isFinite(lead)) lead = 0.1 * track.length;
    return Math.min(400, Math.max(20, 0.5 * lead));
  }

  /**
   * The side a mark's date goes, as a unit vector on the chart: outside a
   * bend, or the asked side along a straight run.
   */
  private side(
    track: Track,
    km: number,
    reach: number,
    asked: LabelSide | null,
    rule: LabelSide | undefined,
  ): [number, number] {
    const at = { x: 0, y: 0, heading: 0 };
    const p = track.pointAt(km, { ...at });
    const a = track.pointAt(km - reach, { ...at });
    const b = track.pointAt(km + reach, { ...at });
    let ix = p.x - a.x;
    let iy = p.y - a.y;
    let ox = b.x - p.x;
    let oy = b.y - p.y;
    const li = Math.hypot(ix, iy);
    const lo = Math.hypot(ox, oy);
    if (li < 1e-6) {
      ix = ox;
      iy = oy;
    }
    if (lo < 1e-6) {
      ox = ix;
      oy = iy;
    }
    const ni = Math.hypot(ix, iy) || 1;
    const no = Math.hypot(ox, oy) || 1;
    ix /= ni;
    iy /= ni;
    ox /= no;
    oy /= no;
    let tx = ix + ox;
    let ty = iy + oy;
    const lt = Math.hypot(tx, ty) || 1;
    tx /= lt;
    ty /= lt;
    // Left of the direction of travel.
    const lx = -ty;
    const ly = tx;
    const turn = ix * oy - iy * ox;
    if (!asked && Math.abs(turn) > BEND) {
      return turn > 0 ? [-lx, -ly] : [lx, ly];
    }
    const [wx, wy] = SIDE_DIR[asked ?? rule ?? "below"];
    return lx * wx + ly * wy >= 0 ? [lx, ly] : [-lx, -ly];
  }

  /** A track's line, cut into pieces at its circles. */
  private pieces(track: Track, lines: Polyline[]): void {
    // Wide enough for the strongest line, its wash and its arrowhead.
    const a = STYLES[track.style].active;
    const width = Math.max(a.pen, a.wash[1] + 0.6, 2 * ARROW_HALF_PX + 1);
    const n = track.points.length / 2;
    const circleAt = new Map<number, number>();
    for (const c of this.circles) {
      if (c.track === track) circleAt.set(c.at, c.index);
    }
    const cuts = [0, ...[...circleAt.keys()].sort((a, b) => a - b), n - 1];
    const pts = track.points;
    for (let k = 0; k < cuts.length - 1; k++) {
      const a = cuts[k];
      const b = cuts[k + 1];
      if (b <= a) continue;
      const ca = circleAt.get(a);
      const cb = circleAt.get(b);
      lines.push({
        points: pts.subarray(a * 2, (b + 1) * 2),
        width,
        tag: track.line,
        before: a > 0 ? [pts[a * 2 - 2], pts[a * 2 - 1]] : undefined,
        after: b < n - 1 ? [pts[b * 2 + 2], pts[b * 2 + 3]] : undefined,
        along: track.along[a],
        piece: [
          ca !== undefined ? track.along[a] : -1e9,
          cb !== undefined ? track.along[b] : 1e9,
          ca ?? -1,
          cb ?? -1,
        ],
      });
    }
  }

  /** Each label's extent along its line, once typeset. */
  private measure(): void {
    for (let i = 0; i < this.marks.length; i++) {
      const m = this.marks[i];
      this.extent[i] =
        Math.abs(m.tx) * this.labels.width(m.index) +
        Math.abs(m.ty) * this.labels.height(m.index);
    }
    this.sized = true;
  }

  /** A point on the chart seen from the camera: on screen (CSS px), in front, how far. */
  private see(
    camera: PerspectiveCamera,
    x: number,
    y: number,
    halfW: number,
    halfH: number,
    out: Seen,
  ): void {
    const v = this.v.set(x, y, 0);
    out.dist = v.distanceTo(camera.position);
    v.applyMatrix4(camera.matrixWorldInverse);
    out.front = v.z < 0 ? 1 : 0;
    v.applyMatrix4(camera.projectionMatrix);
    out.sx = v.x * halfW;
    out.sy = -v.y * halfH;
  }

  /** Room on screen (CSS px) between a mark and the nearest marks that outrank it. */
  private room(seen: Seen[], above: [number, number], s: Seen): number {
    let room = Infinity;
    for (let k = 0; k < 2; k++) {
      const j = above[k];
      if (j < 0 || !seen[j].front) continue;
      room = Math.min(room, Math.hypot(seen[j].sx - s.sx, seen[j].sy - s.sy));
    }
    return room;
  }

  /** Lettering lying on the chart: lost to foreshortening and the haze. */
  private legible(frame: FrameInfo, dist: number): number {
    const tilt = smooth(0.1, 0.25, frame.eye.z / dist);
    const x = dist / frame.hazeVisibility;
    return tilt * Math.exp(-x * x);
  }
}

function seen(): Seen {
  return { sx: 0, sy: 0, front: 0, dist: 1 };
}

/** The head's reveal of a mark (0..1): in as the head comes up to it. */
function reveal(m: Mark): number {
  return smooth(m.revealFrom, m.revealAt, m.track.headKm);
}

/**
 * For each mark, the nearest marks of its track on either side (by
 * distance along it) that outrank it: a higher rank, or the same rank
 * and earlier. A mark gives way when one of those is too near on screen,
 * so no two marks left showing are nearer than that: thinning nests, as
 * the ticks of an axis do. Legends take no part.
 */
function rankNeighbours(marks: Mark[]): void {
  const order = marks
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !m.ends)
    .sort((a, b) => a.m.revealAt - b.m.revealAt);
  const outranks = (a: Mark, b: Mark, ia: number, ib: number) =>
    a.rank > b.rank || (a.rank === b.rank && ia < ib);
  for (let k = 0; k < order.length; k++) {
    const { m } = order[k];
    for (let j = k - 1; j >= 0; j--) {
      const o = order[j];
      if (o.m.track === m.track && outranks(o.m, m, j, k)) {
        m.above[0] = o.i;
        break;
      }
    }
    for (let j = k + 1; j < order.length; j++) {
      const o = order[j];
      if (o.m.track === m.track && outranks(o.m, m, j, k)) {
        m.above[1] = o.i;
        break;
      }
    }
  }
}

function hexColor(hex: number): Vector3 {
  return new Vector3(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
