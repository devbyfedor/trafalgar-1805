import { Matrix4 } from "three";
import type { ChartLayer, Formation, FrameInfo } from "@/components/chart";
import { rand } from "@/components/chart/fx/common";
import {
  type PuffSpec,
  puffSpec,
  type Smoke,
} from "@/components/chart/fx/Smoke";
import { BEATS, dayAt } from "./beats";
import { day } from "./dates";

/**
 * The smoke of Calder's action off Cape Finisterre, 22 July 1805, by the
 * battle's own hours on the story's clock (the owner's answer of 15
 * November 2026; docs/decisions.md, "Scene 2, Stage B: the smoke at
 * Finisterre"; docs/history-notes.md, "Cape Finisterre, 22 and 23 July"):
 *
 * - the lines close without smoke;
 * - at about 5.15 p.m. the vans open fire (the Hero tacked and the
 *   Argonauta fired), and the fire runs down the lines to the rear in half
 *   an hour (FIRE_SPREAD_H, a licence: no source times it ship by ship);
 * - the smoke grows while the firing goes on, puffs at the engaged ships'
 *   sides toward the enemy and smoke lying on the water between the lines,
 *   each puff carried downwind on the light WNW breeze of that day;
 * - the firing slackens from 8 p.m., when the two Spanish ships were
 *   striking, and stops by 9.30 (James; 7.30 by Desbrière, 9 by Calder at
 *   his trial): no puff is born after it;
 * - the last smoke does not go at once: it thins and drifts off as the
 *   camera rises from the action (each puff's life is LIFE_P of scroll).
 *
 * Every puff is a pure function of p: born at a p, it lives LIFE_P of
 * scroll from there (about 260 px on the owner's screen). Its life is not
 * story time: the clock runs 0.6 to 1.7 story minutes a pixel through the
 * camera's pause, so a puff's true half hour would pass in a few dozen
 * pixels, popping in and out; the smoke as a whole keeps the true hours.
 *
 * Laid out after the ships each frame (the layer is added after the glyph
 * layout), and drawn by the engine's smoke (fx/Smoke.ts).
 */

/** The wind off Finisterre that day: a light WNW breeze ("Fog", Corbett 1910, p. 196). */
export const FINISTERRE_WIND = { fromDeg: 292.5, strength: 0.5 } as const;

/** The p at which the story's clock shows a day (in the Finisterre beat). */
function pOfDay(d: number): number {
  let lo: number = BEATS.finisterre[0];
  let hi: number = BEATS.finisterre[1];
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (dayAt(mid) < d) lo = mid;
    else hi = mid;
  }
  return hi;
}

const hour = (h: number) => pOfDay(day(7, 22, h));

/** The vans' first guns, about 5.15 p.m. */
export const FIRST_GUN_P = hour(17.25);
/** How long the fire takes to run from the vans to the rears, hours. */
const FIRE_SPREAD_H = 0.5;
const GENERAL_P = hour(17.25 + FIRE_SPREAD_H);
/** The firing slackens as the two prizes strike (8 p.m.)… */
const SLACKEN_P = hour(20);
/** …and stops by 9.30 p.m.: no puff is born after it. */
export const CEASE_P = hour(21.5);

/** A puff's life, of p (scroll), give or take LIFE_SPREAD. */
const LIFE_P = 0.012;
const LIFE_SPREAD = 0.3;
/** One puff may be born at a ship in each such stretch of p while she fires. */
const SLOT_P = 0.002;
/** How many slots a ship has, from her first gun to the cease. */
const SLOTS = Math.ceil((CEASE_P - FIRST_GUN_P) / SLOT_P) + 1;
/** The last puff is gone by here. */
export const SMOKE_END_P = CEASE_P + LIFE_P * (1 + LIFE_SPREAD / 2);

/** Of the puffs born, the share that lie on the water between the lines. */
const LYING = 0.4;
/** How far under her ports a puff's foot stands, in its own heights. */
const PORT_FOOT = 0.25;
/** How far a puff drifts downwind over its life, glyph heights. */
const DRIFT = 4.5;
/** The lines' feet apart on screen, glyph heights, if not measured. */
const GAP = 1.6;
/** A ship's mastheads above her glyph's foot, glyph heights (atlas: 1 - FOOT). */
const MASTHEAD = 0.92;

export class BattleSmoke implements ChartLayer {
  private p = 0;
  private readonly spec: PuffSpec = puffSpec();
  /** Each line's ships' place from van (0) to rear (1), this frame. */
  private readonly along: Float32Array;
  /** The upper and lower lines' mean foot height on screen and their glyphs' mean height, this frame. */
  private readonly level = new Float64Array(3);
  private readonly viewProjection = new Matrix4();

  /**
   * `smoke` draws; `upper` and `lower` are the two lines as the layout
   * draws them (Villeneuve's above, Calder's below).
   */
  constructor(
    private readonly smoke: Smoke,
    private readonly upper: Formation,
    private readonly lower: Formation,
  ) {
    this.smoke.setWind(FINISTERRE_WIND.fromDeg, FINISTERRE_WIND.strength);
    this.along = new Float32Array(
      Math.max(upper.places.length, lower.places.length),
    );
  }

  /** The scene's progress this frame (set from the director's state). */
  setProgress(p: number): void {
    this.p = p;
  }

  update(frame: FrameInfo): void {
    const smoke = this.smoke;
    smoke.clear();
    const p = this.p;
    if (!(p > FIRST_GUN_P && p < SMOKE_END_P)) return;
    this.measure(frame);
    const both = this.level[0] > this.level[1] && this.level[2] > 0.5;
    const gap = both ? this.gapOf() : GAP;
    // The smoke keeps to the lines' own band on screen, from the lower
    // line's feet to the upper line's mastheads: the lines' labels stand
    // above and below it, and the smoke never comes over them (spreading
    // and drifting toward the eye, the old smoke had come down over the
    // lower line's label as the camera rose).
    if (both)
      this.smoke.setBand(
        this.level[1],
        this.level[0] + MASTHEAD * this.level[2],
      );
    else this.smoke.setBand(0, 0);
    this.line(this.upper, 0, -gap);
    this.line(this.lower, 1, gap);
  }

  /** Each line's mean foot on screen (device px, y up) and mean glyph height. */
  private measure(frame: FrameInfo): void {
    const camera = frame.camera;
    const e = this.viewProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ).elements;
    const lv = this.level;
    let sumH = 0;
    let n = 0;
    for (let l = 0; l < 2; l++) {
      const f = l === 0 ? this.upper : this.lower;
      const d = f.layer.drawn;
      let y = 0;
      let weight = 0;
      for (const m of f.places) {
        const a = d.alpha[m];
        if (!(a > 0.003) || !(d.nominal[m] > 0)) continue;
        // Her foot on the sea (z 0) through the camera: its height on screen.
        const cy = e[1] * d.x[m] + e[5] * d.y[m] + e[13];
        const cw = e[3] * d.x[m] + e[7] * d.y[m] + e[15];
        if (!(cw > 1e-6)) continue;
        y += (cy / cw) * 0.5 * frame.height * a;
        weight += a;
        sumH += d.height[m] * a;
        n += a;
      }
      lv[l] = weight > 0 ? y / weight : 0;
    }
    lv[2] = n > 0 ? sumH / n : 0;
  }

  /** The lines' feet apart on screen, glyph heights. */
  private gapOf(): number {
    const h = this.level[2];
    if (!(h > 0.5)) return GAP;
    return Math.min(3, Math.max(0.8, (this.level[0] - this.level[1]) / h));
  }

  /**
   * A line's smoke: `toward` is the way to the other line's feet on screen
   * from hers, glyph heights (down from the upper line, up from the lower).
   */
  private line(f: Formation, index: number, toward: number): void {
    const d = f.layer.drawn;
    const places = f.places;
    // Each ship's place from van to rear, along the action's course: the
    // fire runs down the line from its van.
    const course = f.course ?? f.heading;
    const sx = Math.sin(course);
    const sy = Math.cos(course);
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let j = 0; j < places.length; j++) {
      const m = places[j];
      if (!(d.alpha[m] > 0.003) || !(d.nominal[m] > 0)) {
        this.along[j] = Number.NaN;
        continue;
      }
      const a = d.x[m] * sx + d.y[m] * sy;
      this.along[j] = a;
      if (a < lo) lo = a;
      if (a > hi) hi = a;
    }
    const span = hi - lo;
    const p = this.p;
    const spec = this.spec;
    const anatomy = this.smoke.anatomy;
    const it = f.layer.intent;
    for (let j = 0; j < places.length; j++) {
      const a = this.along[j];
      if (Number.isNaN(a)) continue;
      const m = places[j];
      // 0 at the van (farthest ahead on the course), 1 at the rear.
      const rank = span > 1e-6 ? (hi - a) / span : 0;
      const first = FIRST_GUN_P + rank * (GENERAL_P - FIRST_GUN_P);
      if (!(p > first)) continue;
      const ship = anatomy.cell(it.turn[m] > 0.5 ? it.cell2[m] : it.cell[m]);
      const seed = (index * 64 + j) * 32;
      for (let k = 0; k < SLOTS; k++) {
        const s = seed + k;
        const born = first + (k + 0.15 + 0.7 * rand(s, 1)) * SLOT_P;
        if (!(born < CEASE_P) || !(p > born)) break;
        // Fewer puffs as the firing slackens, none after it stops.
        if (rand(s, 2) > 1 - smooth(SLACKEN_P, CEASE_P, born)) continue;
        const life = LIFE_P * (1 + LIFE_SPREAD * (rand(s, 3) - 0.5));
        const age = (p - born) / life;
        if (!(age < 1)) continue;
        const lying = rand(s, 4) < LYING;
        const r = rand(s, 5);
        // The smoke thickens as the fight goes on.
        const thick = 0.85 + 0.3 * smooth(FIRST_GUN_P, SLACKEN_P, born);
        // And each puff swells as it drifts, as smoke does.
        const size =
          (lying ? 1.0 + 0.4 * r : 0.6 + 0.25 * r) * thick * (1 + 0.5 * age);
        // Toward the enemy: at her side (under the upper line's hulls; over
        // the lower line's, rising behind her sails), or out on the water
        // between the lines.
        const share = lying
          ? 0.25 + 0.5 * rand(s, 6)
          : index === 0
            ? 0.04 + 0.1 * rand(s, 6)
            : 0.15 + 0.2 * rand(s, 6);
        spec.along = ship.gunsAft + (ship.gunsFore - ship.gunsAft) * rand(s, 7);
        spec.up = ship.gunsUp - PORT_FOOT * size;
        spec.dx = 0;
        spec.dy = share * toward;
        spec.drift = DRIFT * (0.8 + 0.4 * rand(s, 8)) * age;
        spec.size = size;
        spec.age = age;
        spec.seed = s;
        spec.opacity = 1;
        spec.lie = lying ? 1 : 0.35 * r;
        this.smoke.puffAtShip(f.layer, m, spec);
      }
    }
  }

  dispose(): void {}
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** How many puffs the smoke may need at once (both lines, every slot). */
export function smokeCapacity(upper: Formation, lower: Formation): number {
  return (upper.places.length + lower.places.length) * SLOTS;
}
