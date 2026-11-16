import {
  DoubleSide,
  GLSL3,
  type InstancedBufferGeometry,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { MastId } from "@/components/ship/types";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { Glyphs } from "../glyphs/Glyphs";
import type { ScreenText } from "../lettering/Lettering";
import { GLSL_LINES } from "../shaders/common";
import type { ShipAnatomy, ShipPoint } from "./anatomy";
import { effectQuad, GLSL_FX, InstanceData, smoothstep } from "./common";

/**
 * Flag signals at the mastheads of ship glyphs, by day, as the plates of
 * the period tint them (docs/history-notes.md, "Signals in 1805" and "How
 * the chart shows the signals", by day): a hoist of two or three small
 * flags in muted red, white, blue and yellow, each a dab of watercolour
 * edged in ink, flying from a mast's truck down its halyard and streaming
 * a little to her stern side in the light airs; Popham's telegraph flag
 * (red and white, divided diagonally); or the distant signal's dark shapes
 * (a flag, a ball and a pendant, one at each masthead). Off Cádiz on 19
 * October 1805 the scene hoists No. 370 down the chain of ships to the
 * Victory (scenes/02-road/signals.ts); the engine knows nothing of
 * signals' meanings, only of hoists at ships.
 *
 * Ported from the signals branch (`worktree-wf_016f0c7a-068-2`,
 * fx/Hoists.ts: its flags, nearly as it drew them) onto the CPU glyph
 * layout, as the smoke and the lanterns were (fx/Smoke.ts, fx/Lights.ts):
 * a hoist stands at her truck (fx/anatomy.ts), placed on the CPU each
 * frame from where the layout drew her (`Glyphs.drawn`), at her height,
 * her facing and her opacity, so it keeps to her drawing at every size and
 * through every turn of her glyph. A flag is on a ship: it shows only as
 * her glyph does (unlike a lantern, a light seen where the hull is not).
 *
 * Steady: nothing follows the clock of the wall (branch 2's flags stirred
 * with it), so a frame at a scroll position is always the same frame.
 *
 * Hoists give way to the lettering (names, labels) and to the regions
 * fixed on screen (the caption's card) as the lanterns do, by their own
 * clock, so a label sliding over a hoist on a scroll never blinks it out
 * and in. Every flag is an instance of one quad: one draw call, the mesh
 * named "hoists" (Chart.showNamed), drawn over the ships and the smoke and
 * under the lanterns (render order 26), without a depth test (they stand
 * at ships on open sea).
 *
 * Each frame the scene calls `clear`, then adds this frame's hoists.
 */

/** What a flag of a hoist is. */
export type FlagKind =
  | "red"
  | "white"
  | "blue"
  | "yellow"
  | "telegraph"
  | "dark-flag"
  | "dark-ball"
  | "dark-pendant";

const KINDS: Record<FlagKind, number> = {
  red: 0,
  white: 1,
  blue: 2,
  yellow: 3,
  telegraph: 4,
  "dark-flag": 5,
  "dark-ball": 6,
  "dark-pendant": 7,
};

const MASTS: readonly MastId[] = ["fore", "main", "mizzen"];

/** The most flags a hoist flies (No. 370 took three numeral flags). */
export const HOIST_MAX = 4;

/**
 * A flag's hoist (its height on the halyard) and its fly, glyph heights,
 * and the gap between two flags of a hoist, times the hoist: the flags a
 * little apart, so they read as flags and not as one ensign. At the chain's
 * 30 to 35 CSS px a flag is about 3 by 5 px: a dab of colour, as on the
 * plates.
 */
const FLAG_HOIST = 0.085;
const FLAG_FLY = 0.16;
const FLAG_GAP = 0.35;

/**
 * A hoist shows only as her glyph is tall enough to carry it, CSS px:
 * gone below the first, whole from the second (a hoist on a speck of a
 * ship reads as a mote on the chart).
 */
export const HOIST_SHOW_PX: readonly [number, number] = [9, 13];

/**
 * A flag's least hoist and fly on screen, CSS px: on a glyph of 15 to 20
 * px (the frigates off the port, crowded) a flag in proportion is a pixel
 * tall and its tint is lost; at this it stays a dab of colour, as the
 * plates exaggerate a signal to make it read.
 */
const FLAG_MIN_PX: readonly [number, number] = [1.7, 3.1];

/**
 * A hoist gives way to the lettering's outlines within these, CSS px (gone
 * within the first, whole beyond the second), as the lanterns do
 * (fx/Lights.ts, LIGHT_YIELD_PX)…
 */
export const HOIST_YIELD_PX: readonly [number, number] = [2, 5];
/** …and to the regions fixed on screen (the caption's card) within these. */
export const HOIST_REGION_PX: readonly [number, number] = [3, 14];
/**
 * An outline's weight from which a hoist gives way to it at all, and
 * wholly: from the readable half on (the lanterns' TEXT_SHOWN).
 */
const TEXT_SHOWN: readonly [number, number] = [0.02, 0.5];

/**
 * A hoist gives way to the lettering and comes back over this long, by its
 * own clock (seconds; setClock), as a label crossfades from one place to
 * another by its own (the lanterns' GIVE_WAY_S); the longest step a
 * frame's time gives it.
 */
const GIVE_WAY_S = 0.25;
const STEP_MAX_S = 0.1;

/**
 * Hand-tinted, muted as watercolour on the plate, sRGB: red, white, blue,
 * yellow, and the distant signal's black (main's first hoists and branch
 * 2's alike).
 */
const TINTS = [0xb24a3c, 0xeee5d0, 0x3f5d8c, 0xd5ad4e, 0x1f1d1b];

/** Values a drawn flag gives the checks (bounds): see `bounds`. */
export const HOIST_BOUNDS = 9;

const ATTRIBUTES = ["iAt", "iFlag"] as const;

const VERTEX = /* glsl */ `
precision highp float;
// The flag's top at the halyard, device px from the viewport's centre (x
// right, y up); its hoist (device px) and its fly (device px, negative
// streaming left).
in vec4 iAt;
// Kind, opacity, the halyard's gap above it (device px), and the dpr.
in vec4 iFlag;
uniform vec2 uViewport;
out vec2 vLocal;
flat out vec2 vSize;
flat out float vKind;
flat out float vAlpha;
flat out float vGap;
flat out float vDpr;
${GLSL_FX}

void main() {
  float alpha = iFlag.y;
  float hoist = iAt.z;
  if (alpha < 0.004 || hoist <= 0.0) {
    gl_Position = FX_NOWHERE;
    return;
  }
  float fly = abs(iAt.w);
  float sx = iAt.w < 0.0 ? -1.0 : 1.0;
  int kind = int(iFlag.x + 0.5);
  float dpr = iFlag.w;
  float gap = iFlag.z;
  // A flag's hoist and fly; a ball as round as a flag is tall, a pendant
  // long and narrow.
  vec2 size = vec2(fly, hoist);
  if (kind == 6) size = vec2(hoist, hoist);
  if (kind == 7) size = vec2(1.6 * fly, 0.75 * hoist);
  // Local: x along the fly from the halyard, y down from the flag's top
  // (device px); the quad takes in the halyard's gap above and the fly's
  // sag below, a pixel to spare.
  vec2 lo = vec2(-dpr, -gap - dpr);
  vec2 hi = vec2(size.x + dpr, 1.25 * size.y + dpr);
  vec2 local = mix(lo, hi, position.xy);
  // A ball hangs centred on the halyard.
  float x = kind == 6 ? local.x - 0.5 * size.x : local.x * sx;
  gl_Position = vec4((iAt.xy + vec2(x, -local.y)) / (0.5 * uViewport), 0.0, 1.0);
  vLocal = local;
  vSize = size;
  vKind = float(kind);
  vAlpha = alpha;
  vGap = gap;
  vDpr = dpr;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_LINES}
uniform vec3 uTints[5];
uniform vec3 uInk;
in vec2 vLocal;
flat in vec2 vSize;
flat in float vKind;
flat in float vAlpha;
flat in float vGap;
flat in float vDpr;
out vec4 fragColor;

void main() {
  int k = int(vKind + 0.5);
  vec2 p = vLocal;
  vec2 s = vSize;
  // In the light airs of the relay the fly sags a little (still: no clock
  // stirs it).
  float u = clamp(p.x / s.x, 0.0, 1.0);
  if (k != 6) p.y -= s.y * 0.2 * u * u;
  // The halyard: a hair of ink up the hoist's edge, through the gap above.
  float halyard = k == 6 ? 0.0
    : lineCov(abs(vLocal.x), 0.45 * vDpr) * step(-vGap, vLocal.y) * step(vLocal.y, 0.0);
  float edge;
  vec3 tint;
  if (k == 6) {
    // A ball.
    vec2 d = p - 0.5 * s;
    edge = 0.5 * s.y - length(d);
    tint = uTints[4];
  } else if (k == 7) {
    // A pendant: a long taper from the hoist.
    float halfH = 0.5 * s.y * (1.0 - u);
    edge = min(halfH - abs(p.y - 0.5 * s.y), min(p.x, s.x - p.x));
    tint = uTints[4];
  } else {
    edge = min(min(p.x, s.x - p.x), min(p.y, s.y - p.y));
    tint = k == 5 ? uTints[4]
      : k == 4 ? (p.x / s.x > p.y / s.y ? uTints[0] : uTints[1])
      : uTints[k];
  }
  float cover = clamp(edge + 0.5, 0.0, 1.0);
  // Edged in ink, a hair at the least (a white flag over a pale sail still
  // reads), a line where the flag is big enough to take one.
  float inked = 0.45 + 0.55 * smoothstep(3.5, 6.0, s.y);
  float rim = (1.0 - smoothstep(0.0, 0.6 * vDpr, edge)) * cover * inked;
  vec3 c = mix(tint, uInk, rim * 0.85);
  float h = halyard * 0.75;
  float a = max(cover, h);
  c = mix(uInk, c, cover / max(a, 1e-4));
  a *= vAlpha;
  if (a < 0.004) discard;
  fragColor = vec4(c * a, a);
}
`;

export class Hoists implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  /** Hoists a frame at most (more are dropped). */
  readonly capacity: number;
  /** Where things are on each type of glyph. */
  readonly anatomy: ShipAnatomy;
  /** Hoists set this frame. */
  private n = 0;
  /** Flags drawn last frame. */
  private drawnCount = 0;
  private readonly layers: (Glyphs | null)[];
  private readonly marks: Int32Array;
  /** Per hoist: its mast (MASTS), its flags' kinds (HOIST_MAX), how many, how far up, its id. */
  private readonly masts: Uint8Array;
  private readonly kinds: Uint8Array;
  private readonly flagCount: Uint8Array;
  private readonly up: Float32Array;
  private readonly ids: Int32Array;
  /** Per hoist id: how far it shows by the lettering now, by its clock, and whether it was placed last frame. */
  private readonly clearNow: Float64Array;
  private readonly wasPlaced: Uint8Array;
  private readonly placedNow: Uint8Array;
  /** The clock: the frame's time it last read, and a step a check holds it to (setClock). */
  private lastTime = Number.NaN;
  private fixedStep: number | null = null;
  /** Per drawn flag, for the checks (bounds). */
  private readonly drawnRows: Float64Array;
  private readonly layerIds = new Map<Glyphs, number>();
  private readonly data: InstanceData;
  private readonly stride: number;
  private readonly viewProjection = new Matrix4();
  /** Out of a projection: device px from the centre, and whether in front. */
  private readonly at = { x: 0, y: 0, front: false };
  private shown = false;
  /** The lettering and the regions the hoists give way to (setKeepClear). */
  private keepClear: readonly ScreenText[] = [];
  private keepOff: readonly ScreenText[] = [];
  private readonly tints = TINTS.map(() => new Vector3());
  private readonly ink = new Vector3();
  private readonly point = { along: 0, up: 0 };

  /**
   * `anatomy` from the glyphs' atlas and types; `capacity` hoists at most
   * a frame; `ids` the number of the scene's hoist ids (each hoist it sets
   * keeps one, 0..ids-1, for its clock).
   */
  constructor(anatomy: ShipAnatomy, capacity: number, ids: number) {
    this.capacity = capacity;
    this.anatomy = anatomy;
    this.layers = new Array<Glyphs | null>(capacity).fill(null);
    this.marks = new Int32Array(capacity);
    this.masts = new Uint8Array(capacity);
    this.kinds = new Uint8Array(capacity * HOIST_MAX);
    this.flagCount = new Uint8Array(capacity);
    this.up = new Float32Array(capacity);
    this.ids = new Int32Array(capacity);
    this.clearNow = new Float64Array(ids);
    this.wasPlaced = new Uint8Array(ids);
    this.placedNow = new Uint8Array(ids);
    this.drawnRows = new Float64Array(capacity * HOIST_MAX * HOIST_BOUNDS);
    this.stride = ATTRIBUTES.length * 4;
    const geometry = effectQuad();
    this.data = new InstanceData(geometry, capacity * HOIST_MAX, ATTRIBUTES);
    // One instance always, culled while there is no flag (its opacity is
    // 0): the warm-up (Chart.warm) must draw it once to finish its program
    // before the relay comes (fx/Lights.ts likewise).
    geometry.instanceCount = 1;
    this.mesh = new Mesh(
      geometry,
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        depthTest: false,
        // A flag streaming to the left is its quad mirrored.
        side: DoubleSide,
        uniforms: {
          uViewport: { value: new Vector2(1, 1) },
          uTints: { value: this.tints },
          uInk: { value: this.ink },
        },
      }),
    );
    this.mesh.name = "hoists";
    // Flags are placed in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    // Over the ships (25) and the smoke (24), under the lanterns (27), the
    // marks (29) and the lettering (30).
    this.mesh.renderOrder = 26;
    this.mesh.visible = false;
  }

  /**
   * The lettering on screen the hoists give way to (names, labels; CSS
   * px, as Lettering.screen and HeadLabels.screen give it), within
   * HOIST_YIELD_PX; and the `regions` fixed on screen (the caption's
   * card), within HOIST_REGION_PX.
   */
  setKeepClear(
    texts: readonly ScreenText[],
    regions: readonly ScreenText[] = [],
  ): void {
    this.keepClear = texts;
    this.keepOff = regions;
  }

  /**
   * Development and the checks: the hoists' clock (how they give way to
   * the lettering) steps `step` seconds a frame, whatever the frame's
   * time, or makes every change at once (Infinity); null for the frame's
   * own time (held with the labels': HeadLabels.setClock).
   */
  setClock(step: number | null): void {
    this.fixedStep = step;
  }

  /** Starts this frame's hoists: the scene adds them after it. */
  clear(): void {
    for (let i = 0; i < this.n; i++) this.layers[i] = null;
    this.n = 0;
  }

  /** How many hoists are set this frame. */
  get count(): number {
    return this.n;
  }

  /**
   * A hoist at mark `mark` of `glyphs`: `flags` from the truck of `mast`
   * down (at most HOIST_MAX), `up` 0..1 how far it is up (the scene fades
   * it in as it goes up and out as it comes down). `id`, the scene's own
   * for this hoist (0..ids-1), kept while it flies: its clock of giving
   * way to the lettering. The distant signal flew one shape at each
   * masthead: three hoists, one a mast. Returns false when the layer is
   * full.
   */
  hoist(
    glyphs: Glyphs,
    mark: number,
    flags: readonly FlagKind[],
    up: number,
    id: number,
    mast: MastId = "main",
  ): boolean {
    if (!(up > 0.001) || flags.length === 0) return true;
    if (this.n >= this.capacity) return false;
    if (!(id >= 0 && id < this.clearNow.length))
      throw new Error(`hoists: id ${id} out of range`);
    const i = this.n++;
    this.layers[i] = glyphs;
    this.marks[i] = mark;
    this.masts[i] = MASTS.indexOf(mast);
    const count = Math.min(HOIST_MAX, flags.length);
    for (let s = 0; s < count; s++)
      this.kinds[i * HOIST_MAX + s] = KINDS[flags[s]];
    this.flagCount[i] = count;
    this.up[i] = Math.min(1, up);
    this.ids[i] = id;
    if (!this.layerIds.has(glyphs))
      this.layerIds.set(glyphs, this.layerIds.size);
    return true;
  }

  update(frame: FrameInfo): void {
    const u = this.mesh.material.uniforms;
    u.uViewport.value.set(frame.width, frame.height);
    this.colours(frame);
    const n = this.n;
    const dpr = frame.dpr;
    const camera = frame.camera;
    const vp = this.viewProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    // The camera's right across the chart, for the way each ship faces.
    const w = camera.matrixWorld.elements;
    const across = Math.sqrt(w[0] * w[0] + w[1] * w[1]) || 1;
    const rx = w[0] / across;
    const ry = w[1] / across;
    const eye = frame.eye;
    const halfW = 0.5 * frame.width;
    const halfH = 0.5 * frame.height;
    const visibility = frame.hazeVisibility;
    // The hoists' clock: how far each one's giving way may move this frame.
    let step = this.fixedStep;
    if (step === null)
      step = Number.isFinite(this.lastTime)
        ? Math.min(STEP_MAX_S, Math.max(0, frame.time - this.lastTime))
        : Number.POSITIVE_INFINITY;
    this.lastTime = frame.time;
    const reach = step / GIVE_WAY_S;
    // Flags were not shown at night.
    const day = 1 - smoothstep(0.5, 0.95, frame.light.night);
    const at = this.at;
    const out = this.data.array;
    const stride = this.stride;
    const rows = this.drawnRows;
    this.placedNow.fill(0);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const glyphs = this.layers[i];
      if (!glyphs || !(day > 0)) continue;
      const m = this.marks[i];
      const d = glyphs.drawn;
      // A flag is on her drawing: none where the layout does not draw her.
      if (!(d.alpha[m] > 0.003) || !(d.nominal[m] > 0)) continue;
      const h = d.height[m];
      const show = smoothstep(
        HOIST_SHOW_PX[0] * dpr,
        HOIST_SHOW_PX[1] * dpr,
        h,
      );
      if (!(show > 0)) continue;
      const x = d.x[m];
      const y = d.y[m];
      this.project(vp, x, y, halfW, halfH);
      if (!at.front) continue;
      const footX = at.x;
      const footY = at.y;
      // Her truck (fx/anatomy.ts), between her two types as she turns into
      // the other, as her glyph crossfades.
      const it = glyphs.intent;
      const mast = MASTS[this.masts[i]];
      const turn = it.turn[m];
      const a = this.anatomy.cell(it.cell[m]).mastheads[mast];
      const b =
        turn > 0.001 ? this.anatomy.cell(it.cell2[m]).mastheads[mast] : a;
      const truck = blend(a, b, turn, this.point);
      // Her facing, as her glyph draws it (Glyphs.ts, glyphFacing; the
      // lanterns' and the smoke's alike): bows right above 0.14, left
      // below -0.14, a mirrored crossfade between, never narrower than
      // `narrow`; the flags stream to her stern side.
      const heading = d.heading[m];
      const facing = Math.sin(heading) * rx + Math.cos(heading) * ry;
      const t = Math.min(1, Math.max(0, (facing + 0.14) / 0.28));
      const dir = 2 * t * t * (3 - 2 * t) - 1;
      const narrow = d.narrow[m];
      const drawing = (narrow + (1 - narrow) * Math.abs(facing)) * dir;
      const tx = footX + truck.along * drawing * h;
      const ty = footY + truck.up * h;
      const hoist = Math.max(FLAG_HOIST * h, FLAG_MIN_PX[0] * dpr);
      const gap = FLAG_GAP * hoist;
      // Foreshortened with her as she turns end-on, never to nothing.
      const fly =
        -Math.max(FLAG_FLY * h, FLAG_MIN_PX[1] * dpr) *
        (Math.abs(drawing) < 0.25 ? Math.sign(drawing || 1) * 0.25 : drawing);
      const count = this.flagCount[i];
      // The hoist's box on screen, CSS px from the top left: the halyard's
      // top to the last flag's sagging foot, the halyard to the fly's end.
      const reachX = Math.max(Math.abs(fly) * 1.6, hoist);
      const bx0 = (tx - (fly < 0 ? reachX : hoist) + halfW) / dpr;
      const bx1 = (tx + (fly < 0 ? hoist : reachX) + halfW) / dpr;
      const by0 = (halfH - ty) / dpr;
      const by1 = (halfH - (ty - count * (hoist + gap) - 0.25 * hoist)) / dpr;
      // It gives way to the names and labels, and to the card, by its clock.
      let target = 1;
      if (this.keepClear.length || this.keepOff.length) {
        const unit = frame.height / 720 / dpr;
        target =
          clearOfBox(this.keepClear, bx0, by0, bx1, by1, HOIST_YIELD_PX, 1) *
          clearOfBox(this.keepOff, bx0, by0, bx1, by1, HOIST_REGION_PX, unit);
      }
      const id = this.ids[i];
      const was = this.clearNow[id];
      const given =
        reach >= 1 || !this.wasPlaced[id]
          ? target
          : was + Math.max(-reach, Math.min(reach, target - was));
      this.clearNow[id] = given;
      this.placedNow[id] = 1;
      const ex = x - eye.x;
      const ey = y - eye.y;
      const dist = Math.sqrt(ex * ex + ey * ey + eye.z * eye.z);
      const hz = dist / visibility;
      // Her drawn opacity and the haze as her glyph has them (Glyphs.ts).
      const alpha =
        this.up[i] *
        Math.min(1, d.alpha[m]) *
        Math.exp(-hz * hz) *
        show *
        given *
        day;
      if (!(alpha > 0.004)) continue;
      const layer = this.layerIds.get(glyphs) ?? -1;
      for (let s = 0; s < count; s++) {
        const kind = this.kinds[i * HOIST_MAX + s];
        const r = k * stride;
        const top = ty - s * (hoist + gap);
        out[r] = tx;
        out[r + 1] = top;
        out[r + 2] = hoist;
        out[r + 3] = fly;
        out[r + 4] = kind;
        out[r + 5] = alpha;
        out[r + 6] = s === 0 ? 1.5 * gap : gap;
        out[r + 7] = dpr;
        // For the checks: the flag's box (CSS px), opacity, ship, kind, id.
        const b0 = k * HOIST_BOUNDS;
        const fx0 = fly < 0 ? tx + fly * 1.6 : tx;
        const fx1 = fly < 0 ? tx : tx + Math.abs(fly) * 1.6;
        rows[b0] = (Math.min(fx0, tx - hoist) + halfW) / dpr;
        rows[b0 + 1] = (halfH - top) / dpr;
        rows[b0 + 2] = (Math.max(fx1, tx + hoist) + halfW) / dpr;
        rows[b0 + 3] = (halfH - (top - 1.25 * hoist)) / dpr;
        rows[b0 + 4] = alpha;
        rows[b0 + 5] = m;
        rows[b0 + 6] = layer;
        rows[b0 + 7] = kind;
        rows[b0 + 8] = id;
        k++;
      }
    }
    // Which hoists were placed, for the next frame's (one placed again
    // after frames unplaced starts from where it stands).
    this.wasPlaced.set(this.placedNow);

    // Shown only while there are flags; set as the count crosses zero, so a
    // timing that hides it by name on alternate frames (Chart.showNamed,
    // road-bench.mjs AB=hoists) can.
    const on = k > 0;
    if (on !== this.shown) {
      this.shown = on;
      this.mesh.visible = on;
    }
    const geometry = this.mesh.geometry;
    if (!on) {
      if (this.drawnCount !== 0) {
        // The one culled instance the warm-up draws (constructor).
        out[5] = 0;
        this.data.upload(1);
        geometry.instanceCount = 1;
        this.drawnCount = 0;
      }
      return;
    }
    this.data.upload(k);
    geometry.instanceCount = k;
    this.drawnCount = k;
  }

  /**
   * Development and checks: each flag drawn in the last frame: its box
   * (CSS px from the canvas's top left), its opacity, its ship (her mark,
   * and her layer in the order the hoists' layers were first seen), its
   * kind and its hoist's id: HOIST_BOUNDS numbers a flag, x0, y0, x1, y1,
   * opacity, mark, layer, kind, id.
   */
  bounds(): number[] {
    return Array.from(
      this.drawnRows.subarray(0, this.drawnCount * HOIST_BOUNDS),
    );
  }

  /** The tints in the day's light, the ink the chart's. */
  private colours(frame: FrameInfo): void {
    const light = frame.light;
    // A little of the low sun's warmth on them, as on the sails.
    const sun = light.sunColor;
    for (let i = 0; i < TINTS.length; i++) {
      const hex = TINTS[i];
      const t = this.tints[i];
      t.set(
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (hex & 255) / 255,
      );
      t.x *= 0.85 + 0.15 * Math.min(1, sun.x);
      t.y *= 0.85 + 0.15 * Math.min(1, sun.y);
      t.z *= 0.85 + 0.15 * Math.min(1, sun.z);
    }
    this.ink.copy(light.ink);
  }

  private project(
    vp: Matrix4,
    x: number,
    y: number,
    halfW: number,
    halfH: number,
  ): void {
    const e = vp.elements;
    const cw = e[3] * x + e[7] * y + e[15];
    const at = this.at;
    if (!(cw > 1e-6)) {
      at.front = false;
      return;
    }
    at.x = ((e[0] * x + e[4] * y + e[12]) / cw) * halfW;
    at.y = ((e[1] * x + e[5] * y + e[13]) / cw) * halfH;
    at.front = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/** A point between two of a ship's types' points, written into `out`. */
function blend(
  a: ShipPoint,
  b: ShipPoint,
  t: number,
  out: { along: number; up: number },
): { along: number; up: number } {
  out.along = a.along + (b.along - a.along) * t;
  out.up = a.up + (b.up - a.up) * t;
  return out;
}

/**
 * How far a box (CSS px) keeps clear of a set of outlines: the product,
 * over every outline shown, of 1 - shown × (1 - smooth(range, gap)), the
 * gap the distance between the box and the outline's own box (0 where they
 * meet); `scale` the range's CSS px a px of it.
 */
function clearOfBox(
  texts: readonly ScreenText[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  range: readonly [number, number],
  scale: number,
): number {
  const r0 = range[0] * scale;
  const r1 = range[1] * scale;
  let clear = 1;
  for (const t of texts) {
    for (let i = 0; i < t.count; i++) {
      const w = t.weights[i];
      if (!(w > 0.01)) continue;
      const q = t.quads[i];
      const qx0 = Math.min(q[0], q[2], q[4], q[6]);
      const qx1 = Math.max(q[0], q[2], q[4], q[6]);
      const qy0 = Math.min(q[1], q[3], q[5], q[7]);
      const qy1 = Math.max(q[1], q[3], q[5], q[7]);
      // An outline lost behind the eye keeps clear of nothing (the
      // lanterns' lightClear).
      if (!Number.isFinite(qx0 + qx1 + qy0 + qy1)) continue;
      const gx = Math.max(qx0 - x1, x0 - qx1, 0);
      const gy = Math.max(qy0 - y1, y0 - qy1, 0);
      const gap = Math.sqrt(gx * gx + gy * gy);
      if (gap >= r1) continue;
      clear *=
        1 -
        smoothstep(TEXT_SHOWN[0], TEXT_SHOWN[1], w) *
          (1 - smoothstep(r0, r1, gap));
      if (clear <= 0) return 0;
    }
  }
  return clear;
}
