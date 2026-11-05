import { Vector3 } from "three";
import type { Chart } from "@/components/chart";
import type { CameraRig } from "@/components/chart/camera/rig";
import { worldX, worldY } from "@/components/chart/geo/mercator";
import { FOOT } from "@/components/chart/glyphs/atlas";
import type { Glyphs, ShipMark } from "@/components/chart/glyphs/Glyphs";
import { glyphPxAt } from "@/components/chart/glyphs/height";
import type { LightId } from "@/components/chart/light/states";
import type { Route } from "@/components/chart/lines/Route";
import type { RibbonMaterial } from "@/components/chart/lines/ribbon";
import { METRE_VH, VICTORY_X } from "@/scenes/01-dawn/composition";
import { VICTORY_BOX } from "@/scenes/01-dawn/layers/Victory";
import { BEATS, type BeatId, dayAt } from "./beats";
import {
  BRITISH,
  COMBINED,
  DAWN,
  dawnSpacing,
  type Ship,
  VICTORY_AT_DAWN,
} from "./fleets";
import { type ShipState, shipAt } from "./movements";
import type { DatedWaypoint, Leg } from "./routes";
import { formationSlot, SQUADRONS, type SquadronSpec } from "./squadrons";

/**
 * Scene 2's director: everything the chart shows is a pure function of the
 * scene's progress p (its camera, light, ships, routes), so the scene plays
 * the same forward and back. The scene's GSAP timeline drives p and the
 * HTML; each frame the director turns p into the chart's state, before the
 * chart draws.
 *
 * It also finishes the handoff from scene 1: scene 1's own Victory is moved
 * and scaled onto her glyph as the camera rises, then crossfades into it
 * (docs/decisions.md, "Scene 2, Stage B", "The transition from scene 1").
 */

/**
 * The light through the scene: in each range of p, a blend between two of
 * the chart's states running from one mix to another (smoothly). Dawn at
 * the start; the campaign's low summer light for the chase; the low
 * eastern sun of the morning of 19 October for the relay; night; and dawn
 * again as the camera comes down to Cape Trafalgar.
 */
const LIGHT: readonly (readonly [
  number,
  number,
  LightId,
  LightId,
  number,
  number,
])[] = [
  [0, 0.095, "dawn", "dawn", 0, 0],
  [0.095, 0.15, "dawn", "campaign", 0, 1],
  [0.15, 0.66, "dawn", "campaign", 1, 1],
  [0.66, 0.7, "dawn", "campaign", 1, 0],
  [0.7, 0.79, "dawn", "dawn", 0, 0],
  [0.79, 0.83, "dawn", "night", 0, 1],
  [0.83, 0.93, "dawn", "night", 1, 1],
  [0.93, 0.995, "dawn", "night", 1, 0],
  [0.995, 2, "dawn", "dawn", 0, 0],
];

/** Where the painted Victory takes over from and gives way to her glyph. */
const RISE: readonly [number, number] = [0.024, 0.07];
const SWAP: readonly [number, number] = [0.068, 0.08];

/** The least room a squadron's block keeps near a coast, map km. */
const SQUADRON_ROOM_KM = 45;

/** How far off a port a squadron's block stands while it lies there, map km. */
const ROADS_KM = 22;

/** A ship at anchor in Cádiz bay: the open water beyond her, map km. */
const ANCHOR_ROOM_KM = 4.2;

/**
 * How much scroll (of p) a squadron takes to change: a ship joining or
 * leaving it fades, one replaced crossfades, and the block slides from the
 * roads off one leg's end to those off the next leg's start. Measured in
 * scroll, not story days, which run at very different paces through the
 * beats: about 130 px of scroll on the owner's screen.
 */
const CHANGE_P = 0.006;

/** The progress p at which the story's clock reaches day d (dayAt is monotone within these beats). */
function pOfDay(d: number, beats: readonly BeatId[]): number {
  let lo: number = BEATS[beats[0]][0];
  let hi: number = BEATS[beats[beats.length - 1]][1];
  if (d <= dayAt(lo)) return lo;
  if (d >= dayAt(hi - 1e-9)) return hi;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (dayAt(mid) < d) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The beats the squadrons sail in. */
const SQUADRON_BEATS: readonly BeatId[] = ["chase", "finisterre"];

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Fades a layer in and out over a range of p. */
function fade(
  p: number,
  [a, b, c, d]: readonly [number, number, number, number],
) {
  return smooth(a, b, p) * (1 - smooth(c, d, p));
}

/** Days along a leg: its dated points' days and the distance between them. */
interface LegClock {
  leg: Leg;
  route: Route;
  /** Each waypoint's distance along the leg (straight legs, km) and its day. */
  along: Float64Array;
  days: Float64Array;
  first: number;
  last: number;
}

function legClock(leg: Leg, route: Route): LegClock {
  const w = leg.waypoints;
  const along = new Float64Array(w.length);
  for (let i = 1; i < w.length; i++) {
    along[i] =
      along[i - 1] +
      Math.hypot(
        worldX(w[i].lon) - worldX(w[i - 1].lon),
        worldY(w[i].lat) - worldY(w[i - 1].lat),
      );
  }
  // Undated points take a day by distance between the dated ones around them.
  const days = new Float64Array(w.length).fill(Number.NaN);
  w.forEach((p: DatedWaypoint, i) => {
    if (p.day !== undefined) days[i] = p.day;
  });
  let prev = -1;
  for (let i = 0; i < w.length; i++) {
    if (Number.isNaN(days[i])) continue;
    if (prev >= 0 && i - prev > 1) {
      for (let k = prev + 1; k < i; k++) {
        const t = (along[k] - along[prev]) / (along[i] - along[prev] || 1);
        days[k] = days[prev] + (days[i] - days[prev]) * t;
      }
    }
    prev = i;
  }
  return { leg, route, along, days, first: days[0], last: days[w.length - 1] };
}

/** How much of a leg is drawn at a day, 0..1 of its length. */
function legProgress(c: LegClock, d: number): number {
  if (d <= c.first) return 0;
  if (d >= c.last) return 1;
  let i = 0;
  while (i < c.days.length - 1 && c.days[i + 1] <= d) i++;
  const span = c.days[i + 1] - c.days[i];
  const t = span > 0 ? (d - c.days[i]) / span : 1;
  const km = c.along[i] + (c.along[i + 1] - c.along[i]) * t;
  return km / c.along[c.along.length - 1];
}

/** The legs each squadron sails, in order. */
const SQUADRON_LEGS: Record<string, readonly string[]> = {
  villeneuve: [
    "villeneuve-toulon-cadiz",
    "villeneuve-crossing",
    "villeneuve-west-indies",
    "villeneuve-return",
    "villeneuve-vigo-coruna",
    "combined-ferrol-cadiz",
  ],
  nelson: [
    "nelson-mediterranean",
    "nelson-outward",
    "nelson-west-indies",
    "nelson-homeward",
    "nelson-ushant-spithead",
  ],
};

/** Squadrons without a drawn route keep a station: lon, lat, heading. */
const STATIONS: Record<string, readonly [number, number, number]> = {
  // Orde off Cádiz, drawing off toward Lagos.
  orde: [-6.55, 36.45, 280],
  // Calder off Finisterre, to the north-north-east of the allies.
  calder: [-11.55, 43.83, 245],
  // Collingwood off Cádiz, chased toward the Strait.
  collingwood: [-6.45, 36.3, 150],
};

/** A squadron as the director plays it. */
interface Squad {
  spec: SquadronSpec;
  /** Its first glyph in the squadrons' layer, and how many it holds. */
  first: number;
  n: number;
  /** The p at which each of its stages begins. */
  stageP: number[];
  /** The legs it sails, in order, and the p at which each begins. */
  legs: LegClock[];
  legP: number[];
}

/**
 * A squadron's block on a leg at a share of it: the leg's own point, but
 * never nearer its ends than the roads (ROADS_KM), so in port the block
 * stands off the port on the route it came in or goes out by.
 */
function blockAt(
  c: LegClock,
  progress: number,
  out: { x: number; y: number; heading: number },
): void {
  const len = c.along[c.along.length - 1] || 1;
  const r0 = Math.min(0.5, ROADS_KM / len);
  const r1 = Math.max(0.5, 1 - ROADS_KM / len);
  c.route.pointAt(Math.min(r1, Math.max(r0, progress)), out);
}

/** A heading turned toward another by a share t, the short way round (radians). */
function turnToward(from: number, to: number, t: number): number {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + d * t;
}

/** The scene's layers, as the scene builds them. */
export interface RoadLayers {
  chart: Chart;
  rig: CameraRig;
  /** Both fleets, ship by ship (BRITISH then COMBINED), for beats 0, 4, 5. */
  fleets: Glyphs;
  /** The squadrons of beats 2 and 3, each a block of glyphs. */
  squadrons: Glyphs;
  /** A route per leg, in the order of `legs`. */
  routes: readonly Route[];
  legs: readonly Leg[];
}

/** The ship marks of both fleets, in the order the director expects. */
export function fleetMarks(): ShipMark[] {
  return [...BRITISH, ...COMBINED].map((ship) => {
    const b = DAWN.get(ship);
    return {
      type: ship.rig.sail,
      side: ship.side,
      lon: b?.lon ?? 0,
      lat: b?.lat ?? 0,
      heading: b?.heading ?? 0,
      underWay: true,
      size: ship.rig.size,
      opacity: 0,
      room: "coast",
      spacing: dawnSpacing(ship) || undefined,
    } satisfies ShipMark;
  });
}

/** The squadrons' marks: each squadron's largest make-up, in order. */
export function squadronMarks(): ShipMark[] {
  const marks: ShipMark[] = [];
  for (const s of SQUADRONS) {
    const n = Math.max(...s.stages.map((x) => x.types.length));
    for (let i = 0; i < n; i++) {
      marks.push({
        type: s.stages[0].types[0],
        side: s.side,
        lon: 0,
        lat: 0,
        heading: 0,
        underWay: true,
        opacity: 0,
        // A symbol: small in a strait seen from far off, but legible by an
        // island or in the roads off a port.
        room: { coast: SQUADRON_ROOM_KM },
      });
    }
  }
  return marks;
}

export class RoadDirector {
  private readonly ships: readonly Ship[] = [...BRITISH, ...COMBINED];
  private readonly state: ShipState = {
    x: 0,
    y: 0,
    heading: 0,
    anchored: false,
    anchorage: 0,
  };
  private readonly clocks: LegClock[];
  private readonly squads: Squad[];
  private readonly head = { x: 0, y: 0, heading: 0 };
  private readonly next = { x: 0, y: 0, heading: 0 };
  private readonly victory = new Vector3(
    worldX(VICTORY_AT_DAWN.lon),
    worldY(VICTORY_AT_DAWN.lat),
    0,
  );
  private readonly ndc = new Vector3();
  private victoryIndex: number;
  /** Scene 1's Victory box, while the handoff runs. */
  private painted: HTMLElement | null = null;
  private paintedState: "natural" | "moving" | "hidden" = "natural";

  constructor(private readonly layers: RoadLayers) {
    this.clocks = layers.legs.map((leg, i) => legClock(leg, layers.routes[i]));
    let first = 0;
    this.squads = SQUADRONS.map((spec) => {
      const n = Math.max(...spec.stages.map((x) => x.types.length));
      const ids = SQUADRON_LEGS[spec.id] ?? [];
      const legs = this.clocks.filter((c) => ids.includes(c.leg.id));
      const s: Squad = {
        spec,
        first,
        n,
        stageP: spec.stages.map((x) => pOfDay(x.from, SQUADRON_BEATS)),
        legs,
        legP: legs.map((c) => pOfDay(c.first, SQUADRON_BEATS)),
      };
      first += n;
      return s;
    });
    this.victoryIndex = this.ships.findIndex((s) => s.name === "Victory");
  }

  /** Scene 1's Victory box to hand over from (null: no scene 1 on the page). */
  setPainted(el: HTMLElement | null): void {
    if (this.painted && this.painted !== el) this.restorePainted();
    this.painted = el;
  }

  /** Sets the chart's state for progress p; call before chart.frame. */
  apply(p: number): void {
    const { chart, rig } = this.layers;
    chart.fly(rig, p);
    this.applyLight(p);
    const d = dayAt(p);
    this.applyFleets(p, d);
    this.applySquadrons(p, d);
    this.applyRoutes(p, d);
    this.applyPainted(p);
  }

  dispose(): void {
    this.restorePainted();
  }

  private applyLight(p: number): void {
    const range =
      LIGHT.find(([from, to]) => p >= from && p < to) ??
      LIGHT[LIGHT.length - 1];
    const [from, to, a, b, m0, m1] = range;
    const t = m0 + (m1 - m0) * smooth(from, to, p);
    this.layers.chart.setLight(a, b, t);
  }

  private applyFleets(p: number, d: number): void {
    const glyphs = this.layers.fleets;
    // Seen at dawn (beat 0), off Cádiz (beat 4) and in the night and at
    // dawn again (beat 5, after the cut-away to Ulm).
    const shown =
      fade(p, [-1, 0, BEATS.transition[1] + 0.03, BEATS.transition[1] + 0.06]) +
      fade(p, [0.655, 0.675, 0.835, 0.85]) +
      fade(p, [0.905, 0.925, 2, 3]);
    this.ships.forEach((ship, i) => {
      const s = this.state;
      const inBeat0 = p < BEATS.boulogne[0] + 0.06;
      if (inBeat0) {
        const b = DAWN.get(ship);
        if (b) {
          s.x = worldX(b.lon);
          s.y = worldY(b.lat);
          s.heading = (b.heading * Math.PI) / 180;
          s.anchored = false;
          s.anchorage = 0;
        }
      } else if (!shipAt(ship, d, s)) {
        glyphs.setOpacity(i, 0);
        return;
      }
      glyphs.place(i, s.x, s.y, s.heading);
      // As she weighs and makes sail, her furled glyph crossfades into her
      // sailing one, her wake comes up, and her room passes from the bay
      // beyond her (decisions.md, "No glyph stands on the shore") to her
      // distance from the coast; coming to anchor, the reverse.
      const anchor = ship.rig.anchor;
      const k = anchor === undefined ? 0 : s.anchorage;
      if (anchor !== undefined && k > 0)
        glyphs.setType(i, ship.rig.sail, anchor, k);
      else glyphs.setType(i, ship.rig.sail);
      glyphs.setUnderWay(i, 1 - k);
      glyphs.setRoomBlend(i, ANCHOR_ROOM_KM, 1 - k);
      glyphs.setSpacing(i, dawnSpacing(ship));
      let opacity = Math.min(1, shown);
      // Her glyph takes over from scene 1's painted Victory.
      if (i === this.victoryIndex && p < 0.2)
        opacity *= smooth(SWAP[0], SWAP[1], p);
      glyphs.setOpacity(i, opacity);
    });
  }

  private applySquadrons(p: number, d: number): void {
    const glyphs = this.layers.squadrons;
    const beat = fade(p, [
      BEATS.chase[0] - 0.005,
      BEATS.chase[0] + 0.01,
      BEATS.finisterre[1] - 0.012,
      BEATS.finisterre[1],
    ]);
    for (const squad of this.squads) {
      const { spec, first, n, stageP } = squad;
      const [from, to] = spec.shown;
      const visible =
        beat * smooth(from - 0.4, from, d) * (1 - smooth(to, to + 0.6, d));
      // The stage in force and the one before it: a ship that joins fades
      // in, one that leaves (or is taken) fades out, one replaced by
      // another type crossfades.
      let j = 0;
      for (let k = 0; k < spec.stages.length; k++)
        if (spec.stages[k].from <= d) j = k;
      const cur = spec.stages[j].types;
      const prev = j > 0 ? spec.stages[j - 1].types : null;
      const t = prev ? smooth(stageP[j], stageP[j] + CHANGE_P, p) : 1;
      const where = this.squadronHead(squad, d, p);
      for (let k = 0; k < n; k++) {
        const i = first + k;
        const now = cur[k];
        const before = prev?.[k];
        if (!where || (!now && !before) || visible <= 0.001) {
          glyphs.setOpacity(i, 0);
          continue;
        }
        glyphs.place(i, where.x, where.y, where.heading);
        let opacity = visible;
        if (now && before && now !== before) glyphs.setType(i, before, now, t);
        else if (now) {
          glyphs.setType(i, now);
          if (!before) opacity *= t;
        } else if (before) {
          glyphs.setType(i, before);
          opacity *= 1 - t;
        }
        const [along, up] = formationSlot(k);
        glyphs.setFormation(i, along, up);
        glyphs.setOpacity(i, opacity);
      }
    }
  }

  /**
   * Where a squadron's lead is at a day: the head of its route, or its
   * station. In port the block stands in the roads off it, on its route
   * (ROADS_KM out along the way in or out): a symbol drawn in the open
   * water by the port, as the period's charts set a fleet, not on the town.
   * Between two legs it slides from the roads off the one to the roads off
   * the other just before the second begins, so it never jumps.
   */
  private squadronHead(squad: Squad, d: number, p: number) {
    const { legs, legP } = squad;
    if (legs.length > 0) {
      // The leg in progress, or the last one begun (at anchor after it).
      let k = 0;
      for (let n = 0; n < legs.length; n++) if (legs[n].first <= d) k = n;
      blockAt(legs[k], legProgress(legs[k], d), this.head);
      if (k + 1 < legs.length) {
        const t = smooth(legP[k + 1] - CHANGE_P, legP[k + 1], p);
        if (t > 0) {
          blockAt(legs[k + 1], 0, this.next);
          this.head.x += (this.next.x - this.head.x) * t;
          this.head.y += (this.next.y - this.head.y) * t;
          this.head.heading = turnToward(
            this.head.heading,
            this.next.heading,
            t,
          );
        }
      }
      return this.head;
    }
    // Squadrons without a drawn route keep a station.
    const st = STATIONS[squad.spec.id];
    if (!st) return null;
    this.head.x = worldX(st[0]);
    this.head.y = worldY(st[1]);
    this.head.heading = (st[2] * Math.PI) / 180;
    return this.head;
  }

  private applyRoutes(p: number, d: number): void {
    // Drawn day by day in beats 2 and 3, then put away before the camera
    // comes down to the harbour.
    const shown = fade(p, [
      BEATS.chase[0] - 0.01,
      BEATS.chase[0] + 0.005,
      BEATS.finisterre[1] - 0.012,
      BEATS.finisterre[1] + 0.004,
    ]);
    for (const c of this.clocks) {
      const before = p < BEATS.chase[0];
      c.route.setProgress(before ? 0 : legProgress(c, d));
      c.route.mesh.visible = shown > 0.002;
      (c.route.mesh.material as RibbonMaterial).uniforms.uOpacity.value =
        0.9 * shown;
    }
  }

  /**
   * Scene 1's Victory, moved and scaled onto the chart's Victory as the
   * camera rises: her waterline follows the glyph's on screen, her size
   * shrinks toward the glyph's, then she crossfades into it.
   */
  private applyPainted(p: number): void {
    const el = this.painted;
    if (!el) return;
    if (p <= 0) {
      this.restorePainted();
      return;
    }
    if (p >= SWAP[1]) {
      if (this.paintedState !== "hidden") {
        el.style.opacity = "0";
        this.paintedState = "hidden";
      }
      return;
    }
    this.paintedState = "moving";
    const { chart } = this.layers;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Her box's natural waterline anchor at scene 1's end (VICTORY_X.end).
    const box = VICTORY_BOX;
    const left = VICTORY_X.end * W - (box.centreOffset * H) / 100;
    const top = (box.top * H) / 100;
    const ax = left + ((box.pivot.x / 100) * (box.width * H)) / 100;
    const ay = top + ((box.pivot.y / 100) * (box.height * H)) / 100;
    // Where the chart draws her glyph, and how tall.
    this.ndc.copy(this.victory).project(chart.camera);
    const gx = (this.ndc.x * 0.5 + 0.5) * W;
    const footY = (0.5 - this.ndc.y * 0.5) * H;
    const eye = chart.eye;
    const dist = this.victory.distanceTo(eye);
    const sizeRef = Math.hypot(
      chart.target.x - eye.x,
      chart.target.y - eye.y,
      eye.z,
    );
    const gh =
      glyphPxAt(eye.z) * Math.min(1.8, Math.max(0.55, sizeRef / dist)) ** 0.35;
    const gy = footY - FOOT * gh;
    // Her scale at the swap: a metre of the glyph against a metre of hers.
    const cellMetres = this.layers.fleets.atlas.cellMetres;
    const target = gh / cellMetres / ((METRE_VH * H) / 100);
    const t = smooth(RISE[0], RISE[1], p);
    const k = Math.exp(Math.log(target) * t);
    const x = ax + (gx - ax) * t;
    const y = ay + (gy - ay) * t;
    el.style.transformOrigin = `${box.pivot.x}% ${box.pivot.y}%`;
    el.style.transform = `translate(${(x - ax).toFixed(2)}px, ${(y - ay).toFixed(2)}px) scale(${k.toFixed(5)})`;
    // Cut at her waterline: on the chart, ships stand on the sea.
    el.style.clipPath = `inset(0 0 ${(100 - box.pivot.y).toFixed(3)}% 0)`;
    el.style.opacity = String(1 - smooth(SWAP[0], SWAP[1], p));
  }

  private restorePainted(): void {
    const el = this.painted;
    if (!el || this.paintedState === "natural") return;
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.style.clipPath = "";
    el.style.opacity = "";
    this.paintedState = "natural";
  }
}
