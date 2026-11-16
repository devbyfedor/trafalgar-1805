import {
  GLSL3,
  type InstancedBufferGeometry,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector2,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { FOOT } from "../glyphs/atlas";
import type { Glyphs } from "../glyphs/Glyphs";
import { glyphPxAt } from "../glyphs/height";
import type { ScreenText } from "../lettering/Lettering";
import type { Anatomy, ShipAnatomy } from "./anatomy";
import { effectQuad, GLSL_FX, InstanceData, rand, smoothstep } from "./common";

/**
 * Lanterns at sea by night, as the night pieces of the period paint them: a
 * small steady warm point at a ship's taffrail or in her top, a tight halo
 * that ends a few times its size (no long falloff, no bloom), and a broken
 * column of its reflection on the sea under it. Off Cape Trafalgar on the
 * night of 20 to 21 October 1805 the scene lights the combined fleet's
 * stern and top lanterns and the British admirals' (scenes/02-road/
 * lanterns.ts); the engine knows nothing of fleets, only of lanterns at
 * ships.
 *
 * Ported from the signals branch (`worktree-wf_016f0c7a-068-2`,
 * fx/Lights.ts: its lantern, nearly as it painted it) onto the CPU glyph
 * layout, as the smoke was (fx/Smoke.ts): a lantern stands at a point of
 * her drawing (fx/anatomy.ts), placed on the CPU each frame from where the
 * layout drew her (`Glyphs.drawn`), or, while her fleet is not laid out at
 * all, from her place in the story (`Glyphs.intent`: the layout draws a
 * fleet's ships at their true places, so the two agree). Branch 2's blue
 * lights, rockets and gun flashes are the night signals', built with the
 * relay (docs/decisions.md, session 33 part two).
 *
 * A lantern is a light, not a ship: it shows wherever her ship is in the
 * story, whether her glyph is drawn or her fleet shows as its label (by
 * night the hulls were unseen; the lights were what a fleet showed). So it
 * follows her presence in the story (`intent.opacity`), not her drawn
 * opacity, and carries farther through the haze than the chart's ink.
 *
 * Steady: nothing follows the clock of the wall (branch 2's lantern
 * breathed with it), so a frame at a scroll position is always the same.
 *
 * A line of them never runs together: the scene adds its lanterns in their
 * order of precedence, and each gives way to those before it once it comes
 * within SPACE_PX of one on screen (the ruler order along a line, so the
 * line thins out evenly as it recedes), and to the names and labels as the
 * smoke does (YIELD_PX). Lights add to what is under them, so nothing is
 * sorted. Every lantern is an instance of one quad: one draw call, the mesh
 * named "lights" (Chart.showNamed), drawn over the ships and the smoke and
 * under the lettering (render order 27), without a depth test (they stand
 * at ships on open sea).
 *
 * Each frame the scene calls `clear`, then adds this frame's lanterns.
 */

/** Where a lantern hangs (fx/anatomy.ts). */
export type LanternPlace = "stern" | "top" | "mizzen";

const PLACE: Record<LanternPlace, number> = { stern: 0, top: 1, mizzen: 2 };

/**
 * The lanterns' colours, sRGB: a candle behind horn or glass, a warm
 * yellow; scene 1's approved lights of the same fleet at the same dawn
 * (src/scenes/01-dawn/layers/Fleets.tsx: a core of #ffe2aa in a halo of
 * #ffc882) set the family. No red or green: plain lanterns had no
 * coloured glass (docs/history-notes.md, "Night lights").
 */
const PALETTE = {
  core: "#ffe2aa",
  rim: "#ffbd68",
  halo: "#e8964a",
};

/**
 * On screen, CSS px: a lantern gives way to the ones it is told to (its
 * line's next of a higher rank, or her own stern light) within the first
 * distance, whole beyond the second (their halos never touch).
 */
export const SPACE_PX: readonly [number, number] = [4, 8];

/**
 * A ship's lanterns stand apart on her (her stern's, her top's) only as
 * her glyph grows from the first height to the second (CSS px): far off
 * they stand together at her foot, where her drawing is smaller than a
 * light.
 */
const APART_PX: readonly [number, number] = [5, 16];

/**
 * The height a lantern stands on her by (her glyph's as the layout has
 * her, drawn or not) follows it by the lanterns' clock over about this
 * long (seconds; setClock): the layout lays a fleet out all at once as it
 * comes near enough, its leads at their whole height, and sizes a ship it
 * does not draw by the room the ships about her leave, which changes as
 * they come and go; followed at once, her lights had jumped by up to
 * fifteen pixels, and her top light had parted from her stern light and
 * merged with it again by turns.
 */
const HEIGHT_S = 0.25;

/**
 * A lantern's halo and reflection give way to the lettering's outlines
 * within these, CSS px (gone within the first, whole beyond the second):
 * closer than the smoke's (YIELD_PX, 4 and 10), for a point of light half
 * given way read as a speck of dust beside a label.
 */
export const LIGHT_YIELD_PX: readonly [number, number] = [2, 5];

/**
 * The same for the regions fixed on screen the chart moves under (the
 * caption's card): a lantern fades as it nears one over these, CSS px,
 * as under its scrim; at the narrow range it went out within a frame or
 * two of a reader's scroll as the sea slid under the card.
 */
export const LIGHT_REGION_PX: readonly [number, number] = [6, 40];

/**
 * An outline's weight from which a lantern gives way to it at all, and
 * wholly (lightClear): from the readable half on, the light out under a
 * label as it comes in (as quick as the label's own crossfade).
 */
export const TEXT_SHOWN: readonly [number, number] = [0.02, 0.5];

/**
 * A lantern gives way to the lettering and comes back over this long, by
 * its own clock (seconds; setClock), as a label crossfades from one place
 * to another by its own (HeadLabels, 0.35 s): on a scroll the labels and
 * the card slide over the lights as the camera turns, four to ten pixels a
 * frame, and a light given way within a few pixels went out or came on
 * within a frame or two. The longest step a frame's time gives it.
 */
const GIVE_WAY_S = 0.25;
const STEP_MAX_S = 0.1;

/** As a lantern's first parent (Lights.lantern): it gives way to every lantern set before it. */
export const GIVE_WAY_ALL = -2;

/** A lantern's halo, times its core's radius. */
const HALO = 3;
/** Its reflection's reach under the waterline, times its height above it. */
const REFLECT = 1.6;

const ATTRIBUTES = ["iAt", "iLight"] as const;

/** A lantern's values as set: place, intensity, seed. */
const VALUES = 3;

/** Values a drawn lantern gives the checks (bounds): see `bounds`. */
export const LIGHT_BOUNDS = 10;

function glslColor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    (v / 255).toFixed(4),
  );
  return `vec3(${c.join(", ")})`;
}

const VERTEX = /* glsl */ `
precision highp float;
// The light on screen, device px from the viewport's centre (x right, y
// up); its core's radius and its height above the waterline, device px.
in vec4 iAt;
// Intensity (0..1, all it is made of), seed.
in vec4 iLight;
uniform vec2 uViewport;
uniform float uDpr;
out vec2 vLocal;
flat out float vCore;
flat out float vDrop;
flat out float vI;
flat out float vSeed;
${GLSL_FX}

void main() {
  float I = iLight.x;
  float rc = iAt.z;
  if (I < 0.002 || rc <= 0.0) {
    gl_Position = FX_NOWHERE;
    return;
  }
  float R = ${HALO.toFixed(1)} * rc + uDpr;
  float sea = iAt.w * (1.0 + ${REFLECT.toFixed(2)});
  vec2 corner = mix(vec2(-R, -sea - R), vec2(R, R), position.xy);
  gl_Position = vec4((iAt.xy + corner) / (0.5 * uViewport), 0.0, 1.0);
  vLocal = corner;
  vCore = rc;
  vDrop = iAt.w;
  vI = I;
  vSeed = iLight.y;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_FX}
uniform float uDpr;
in vec2 vLocal;
flat in float vCore;
flat in float vDrop;
flat in float vI;
flat in float vSeed;
out vec4 fragColor;

const vec3 CORE = ${glslColor(PALETTE.core)};
const vec3 RIM = ${glslColor(PALETTE.rim)};
const vec3 HALO_C = ${glslColor(PALETTE.halo)};

// Value noise along a line, 0..1, the same for a seed every frame.
float fxNoise(float x, float seed) {
  float i = floor(x);
  float f = x - i;
  uint s = floatBitsToUint(seed) * 747796405u;
  uint n = uint(max(i, 0.0));
  float a = fxHash(s + n * 2654435761u);
  float b = fxHash(s + (n + 1u) * 2654435761u);
  return mix(a, b, f * f * (3.0 - 2.0 * f));
}

// A painted point: a disc of radius r (device px), its edge soft over
// about a pixel.
float disc(vec2 p, float r) {
  return 1.0 - smoothstep(r - 0.6 * uDpr, r + 0.6 * uDpr, length(p));
}

// A tight halo: full at the light, ending at R, with no long tail.
float halo(vec2 p, float R) {
  float t = max(0.0, 1.0 - dot(p, p) / (R * R));
  return t * t * t;
}

// The light's reflection on the sea under it: a broken column from the
// waterline down, swaying a little, fading with depth; width device px.
// The swell's pattern is the lantern's own, still: no clock moves it.
float reflection(vec2 p, float width) {
  if (vDrop <= 0.5 * uDpr) return 0.0;
  float below = -p.y - vDrop;
  float reach = ${REFLECT.toFixed(2)} * vDrop;
  if (below < 0.0 || below > reach) return 0.0;
  float t = below / reach;
  float sway = (fxNoise(below / (2.5 * uDpr), vSeed + 3.0) - 0.5) * 1.2 * uDpr * t;
  float across = 1.0 - smoothstep(0.5 * width, 0.5 * width + uDpr, abs(p.x - sway));
  float dash = smoothstep(0.35, 0.65, fxNoise(below / (1.4 * uDpr), vSeed + 11.0));
  return across * dash * (1.0 - t) * (1.0 - t) * smoothstep(0.0, 1.5 * uDpr, below);
}

void main() {
  float rc = vCore;
  float core = disc(vLocal, rc);
  float inner = disc(vLocal, 0.55 * rc);
  vec3 c = mix(RIM, CORE, inner) * core * 1.1;
  c += HALO_C * halo(vLocal, ${HALO.toFixed(1)} * rc) * 0.28;
  c += RIM * reflection(vLocal, 1.2 * rc) * 0.38;
  c *= vI;
  if (max(c.r, max(c.g, c.b)) < 0.002) discard;
  // Light adds to what is under it (alpha 0 under premultiplied blending).
  fragColor = vec4(c, 0.0);
}
`;

export class Lights implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly capacity: number;
  /** Where things are on each type of glyph. */
  readonly anatomy: ShipAnatomy;
  /** Lanterns set this frame. */
  private n = 0;
  /** Lanterns drawn last frame. */
  private drawnCount = 0;
  private readonly layers: (Glyphs | null)[];
  private readonly marks: Int32Array;
  private readonly values: Float32Array;
  /** The lanterns each gives way to by spacing (lantern indices this frame; -1 none). */
  private readonly parentA: Int32Array;
  private readonly parentB: Int32Array;
  /**
   * Each lantern this frame: placed (1) or not, its place on screen (device
   * px from the centre; CSS px from the top left), its core, its height
   * over the water, and how much it shows.
   */
  private readonly placed: Uint8Array;
  private readonly px: Float64Array;
  private readonly py: Float64Array;
  private readonly sx: Float64Array;
  private readonly sy: Float64Array;
  private readonly core: Float64Array;
  private readonly drop: Float64Array;
  private readonly seen: Float64Array;
  /** Development: each lantern's spacing and lettering factors this frame (explain). */
  private readonly whySpace: Float64Array;
  private readonly whyText: Float64Array;
  private readonly whyHeight: Float64Array;
  /** How far each lantern shows by the lettering now, by its clock (it moves toward this frame's). */
  private readonly clearNow: Float64Array;
  /** The height each lantern stands on her by now, device px, by its clock (HEIGHT_S). */
  private readonly heightNow: Float64Array;
  /** Which lanterns were placed last frame. */
  private readonly wasPlaced: Uint8Array;
  /** The lanterns set last frame (a change starts them afresh at where they stand). */
  private lastN = 0;
  /** The clock: the frame's time it last read, and a step a check holds it to (setClock). */
  private lastTime = Number.NaN;
  private fixedStep: number | null = null;
  /** Per drawn lantern, for the checks: its mark and its layer's index (bounds). */
  private readonly drawnMark: Int32Array;
  private readonly drawnLayer: Int32Array;
  private readonly drawnPlace: Int32Array;
  private readonly layerIds = new Map<Glyphs, number>();
  private readonly data: InstanceData;
  private readonly stride: number;
  private readonly viewProjection = new Matrix4();
  /** Out of a projection: device px from the centre, and whether in front. */
  private readonly at = { x: 0, y: 0, front: false };
  /** Whether the mesh is shown (set only as the count crosses zero). */
  private shown = false;
  /** The lettering and the regions the lanterns give way to (setKeepClear). */
  private keepClear: readonly ScreenText[] = [];
  private keepOff: readonly ScreenText[] = [];

  /**
   * `anatomy` from the glyphs' atlas and types; `capacity` lanterns at
   * most a frame (more are dropped).
   */
  constructor(anatomy: ShipAnatomy, capacity: number) {
    this.capacity = capacity;
    this.anatomy = anatomy;
    this.layers = new Array<Glyphs | null>(capacity).fill(null);
    this.marks = new Int32Array(capacity);
    this.values = new Float32Array(capacity * VALUES);
    this.parentA = new Int32Array(capacity);
    this.parentB = new Int32Array(capacity);
    this.placed = new Uint8Array(capacity);
    this.px = new Float64Array(capacity);
    this.py = new Float64Array(capacity);
    this.sx = new Float64Array(capacity);
    this.sy = new Float64Array(capacity);
    this.core = new Float64Array(capacity);
    this.drop = new Float64Array(capacity);
    this.seen = new Float64Array(capacity);
    this.whySpace = new Float64Array(capacity);
    this.whyText = new Float64Array(capacity);
    this.whyHeight = new Float64Array(capacity);
    this.clearNow = new Float64Array(capacity);
    this.heightNow = new Float64Array(capacity);
    this.wasPlaced = new Uint8Array(capacity);
    this.drawnMark = new Int32Array(capacity);
    this.drawnLayer = new Int32Array(capacity);
    this.drawnPlace = new Int32Array(capacity);
    this.stride = ATTRIBUTES.length * 4;
    const geometry = effectQuad();
    this.data = new InstanceData(geometry, capacity, ATTRIBUTES);
    // One instance always, culled while there is no lantern (its intensity
    // is 0): a draw of none issues no draw call, and the warm-up
    // (Chart.warm) must draw it once to finish its programs before the
    // scene comes to the night.
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
        uniforms: {
          uViewport: { value: new Vector2(1, 1) },
          uDpr: { value: 1 },
        },
      }),
    );
    this.mesh.name = "lights";
    // Lanterns are placed in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    // Over the ships (25), the hoists' place (26) and the smoke (24), under
    // the marks (29) and the lettering (30).
    this.mesh.renderOrder = 27;
    this.mesh.visible = false;
  }

  /**
   * The lettering on screen the lanterns give way to (names, labels; CSS
   * px, as Lettering.screen and HeadLabels.screen give it), within
   * LIGHT_YIELD_PX; and the `regions` fixed on screen (the caption's
   * card), within LIGHT_REGION_PX.
   */
  setKeepClear(
    texts: readonly ScreenText[],
    regions: readonly ScreenText[] = [],
  ): void {
    this.keepClear = texts;
    this.keepOff = regions;
  }

  /**
   * Development and the checks: the lanterns' clock (how they give way to
   * the lettering) steps `step` seconds a frame, whatever the frame's time,
   * or makes every change at once (Infinity); null for the frame's own
   * time. Held with the labels' (HeadLabels.setClock), so a check sees the
   * lights give way as a reader would.
   */
  setClock(step: number | null): void {
    this.fixedStep = step;
  }

  /** Starts this frame's lanterns: the scene adds them after it. */
  clear(): void {
    for (let i = 0; i < this.n; i++) this.layers[i] = null;
    this.n = 0;
  }

  /** How many lanterns are set this frame. */
  get count(): number {
    return this.n;
  }

  /**
   * A lantern at mark `mark` of `glyphs`, at `place` on her drawing,
   * `intensity` 0..1 (a lantern burns steadily from when it is lit to when
   * it is put out: the scene fades it only then). `seed`, a whole number
   * kept for its life, varies its strength and its reflection a little, so
   * a line of them never reads as a row of street lamps. `parentA` and
   * `parentB`: lanterns set before it this frame (by their order of
   * setting, from 0) it gives way to as it comes within SPACE_PX of the
   * nearer on screen (-1: none; GIVE_WAY_ALL as the first: every lantern
   * set before it), so a line thins out evenly as it recedes
   * (its next lights of a higher rank in the ruler order along it; a top
   * light, her own stern light) without one light's showing hanging on
   * another's. Returns this lantern's index, or -1 when the layer is full.
   */
  lantern(
    glyphs: Glyphs,
    mark: number,
    place: LanternPlace,
    intensity: number,
    seed: number,
    parentA = -1,
    parentB = -1,
  ): number {
    if (this.n >= this.capacity) return -1;
    const i = this.n++;
    this.layers[i] = glyphs;
    this.marks[i] = mark;
    this.parentA[i] = parentA < i || parentA === GIVE_WAY_ALL ? parentA : -1;
    this.parentB[i] = parentB < i ? parentB : -1;
    const v = this.values;
    const k = i * VALUES;
    v[k] = PLACE[place];
    v[k + 1] = intensity;
    v[k + 2] = seed;
    if (!this.layerIds.has(glyphs))
      this.layerIds.set(glyphs, this.layerIds.size);
    return i;
  }

  update(frame: FrameInfo): void {
    const n = this.n;
    const u = this.mesh.material.uniforms;
    u.uViewport.value.set(frame.width, frame.height);
    u.uDpr.value = frame.dpr;
    // Lights only in the dark (the scene times them; this keeps any off a
    // chart in daylight).
    const dark = smoothstep(0.02, 0.2, frame.light.night);

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
    const dpr = frame.dpr;
    const halfW = 0.5 * frame.width;
    const halfH = 0.5 * frame.height;
    const visibility = frame.hazeVisibility;
    // A lantern's size follows the glyphs' size on screen a little: its
    // ship's unhindered height where the layout drew her, else the
    // altitude's (glyphs/height.ts).
    const altitudePx = glyphPxAt(Math.max(eye.z, 0.01)) * dpr;
    const at = this.at;
    const stride = this.stride;
    const out = this.data.array;
    const v = this.values;
    // The lanterns' clock: how far each one's height and giving way may
    // move this frame.
    let step = this.fixedStep;
    if (step === null)
      step = Number.isFinite(this.lastTime)
        ? Math.min(STEP_MAX_S, Math.max(0, frame.time - this.lastTime))
        : Number.POSITIVE_INFINITY;
    this.lastTime = frame.time;
    // A new set of lanterns (lit again, or another number): from where they
    // stand, not from last time's.
    const fresh = n !== this.lastN;
    this.lastN = n;
    const reach = fresh ? 1 : step / GIVE_WAY_S;
    const follow = fresh ? 1 : 1 - Math.exp(-step / HEIGHT_S);
    // Placed, each where its ship stands this frame. A lantern placed for
    // the first time (or again after frames unplaced) starts where it
    // stands, not from its clocks' last values.
    for (let i = 0; i < n; i++) {
      this.placed[i] = 0;
      this.seen[i] = 0;
      this.whySpace[i] = Number.NaN;
      this.whyText[i] = Number.NaN;
      this.whyHeight[i] = Number.NaN;
      const first = fresh || !this.wasPlaced[i];
      const glyphs = this.layers[i];
      if (!glyphs || !(dark > 0)) continue;
      const m = this.marks[i];
      const it = glyphs.intent;
      const presence = it.opacity[m];
      const q = i * VALUES;
      if (!(presence > 0.002) || !(v[q + 1] > 0.002)) continue;
      const d = glyphs.drawn;
      // Where the layout drew her this frame; while her fleet is not laid
      // out, her place in the story and no height (far off: a point at her
      // foot). Her height as the layout has her, drawn or not, followed by
      // the lanterns' clock (HEIGHT_S).
      const laid = d.nominal[m] > 0;
      const x = laid ? d.x[m] : it.x[m];
      const y = laid ? d.y[m] : it.y[m];
      const drawnShare = laid ? Math.min(1, d.alpha[m]) : 0;
      const target = laid ? d.height[m] : 0;
      const hs = first
        ? target
        : this.heightNow[i] + (target - this.heightNow[i]) * follow;
      this.heightNow[i] = hs;
      const heading = laid ? d.heading[m] : it.heading[m];
      this.project(vp, x, y, halfW, halfH);
      if (!at.front) continue;
      // Her point (fx/anatomy.ts), between her two types as she turns into
      // the other (a ship weighing), as her glyph crossfades; apart from
      // her waterline only as her glyph is tall enough to hold it.
      const place = v[q];
      const turn = it.turn[m];
      const a = pointOf(this.anatomy.cell(it.cell[m]), place);
      const b =
        turn > 0.001 ? pointOf(this.anatomy.cell(it.cell2[m]), place) : a;
      const along = a.along + (b.along - a.along) * turn;
      const up = a.up + (b.up - a.up) * turn;
      this.whyHeight[i] = hs / dpr;
      const ha = hs * smoothstep(APART_PX[0] * dpr, APART_PX[1] * dpr, hs);
      // Her facing: as her glyph draws it where it shows (Glyphs.ts,
      // glyphFacing; fx/Smoke.ts: bows right above 0.14, left below -0.14,
      // a mirrored crossfade between, never narrower than `narrow`), so
      // the light keeps to her drawing; as she lies where she is not drawn,
      // her length foreshortened as she turns end-on. The drawing's
      // convention, kept for a hull unseen, swung a stern light from one
      // quarter to the other within a few frames as the camera turned
      // over the night's fleets.
      const facing = Math.sin(heading) * rx + Math.cos(heading) * ry;
      const t = Math.min(1, Math.max(0, (facing + 0.14) / 0.28));
      const dir = 2 * t * t * (3 - 2 * t) - 1;
      const narrow = laid ? d.narrow[m] : 0.3;
      const drawing = (narrow + (1 - narrow) * Math.abs(facing)) * dir;
      const across = facing + (drawing - facing) * drawnShare;
      const px = at.x + along * across * ha;
      const py = at.y + FOOT * hs + (up - FOOT) * ha;
      // Its size: a little larger as glyphs grow (1 at a 28 CSS px glyph).
      const seed = v[q + 2];
      const hn = laid ? d.nominal[m] : altitudePx;
      const scale = Math.min(1.6, Math.max(0.75, hn / (28 * dpr)));
      const rc = 0.8 * dpr * scale * (0.92 + 0.16 * rand(seed, 1));
      const drop = Math.max(0, (up - FOOT) * ha);
      // Off the frame, its halo and reflection and all, by more than a
      // margin for its neighbours: nothing to draw or give way to.
      const R = HALO * rc + dpr;
      const margin = 40 * dpr;
      if (
        px + R < -halfW - margin ||
        px - R > halfW + margin ||
        py + R < -halfH - margin ||
        py - drop * (1 + REFLECT) - R > halfH + margin
      )
        continue;
      const ex = x - eye.x;
      const ey = y - eye.y;
      const dist = Math.sqrt(ex * ex + ey * ey + eye.z * eye.z);
      // Lights carry farther through the haze than the chart's ink.
      const hz = dist / visibility;
      this.placed[i] = 1;
      this.px[i] = px;
      this.py[i] = py;
      this.sx[i] = (px + halfW) / dpr;
      this.sy[i] = (halfH - py) / dpr;
      this.core[i] = rc;
      this.drop[i] = drop;
      this.seen[i] = presence * dark * Math.exp(-0.5 * hz * hz);
    }
    // How much each shows: given way to its lanterns of a higher rank where
    // they stand too near (by where they stand, not by how much they show,
    // so no light's showing hangs on another's), and to the lettering.
    const space0 = SPACE_PX[0];
    const space1 = SPACE_PX[1];
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (!this.placed[i]) continue;
      let seen = this.seen[i];
      let gap = Number.POSITIVE_INFINITY;
      const pa = this.parentA[i];
      const pb = this.parentB[i];
      if (pa >= 0 && this.placed[pa])
        gap = Math.min(gap, apart(this.sx, this.sy, i, pa));
      if (pb >= 0 && this.placed[pb])
        gap = Math.min(gap, apart(this.sx, this.sy, i, pb));
      // Or to every lantern set before it (a lantern set after every other,
      // which none gives way to: a top or a masthead light, high over its
      // ship, that stood among the stern lights of the ships beyond her).
      if (pa === GIVE_WAY_ALL)
        for (let j = 0; j < i; j++)
          if (this.placed[j])
            gap = Math.min(gap, apart(this.sx, this.sy, i, j));
      const spaced = gap < space1 ? smoothstep(space0, space1, gap) : 1;
      this.whySpace[i] = spaced;
      const rc = this.core[i];
      const drop = this.drop[i];
      const cx = this.sx[i];
      const cy = this.sy[i];
      // And to the names and labels, its halo and reflection and all,
      // measured to each outline as it lies (a label at a slant: its box
      // square to the screen took in lights well clear of its letters).
      let clearOf = 1;
      if (this.keepClear.length || this.keepOff.length) {
        const R = (HALO * rc + dpr) / dpr;
        const sea = (drop * (1 + REFLECT)) / dpr;
        clearOf =
          lightClear(this.keepClear, cx, cy, cy + sea, R, LIGHT_YIELD_PX) *
          lightClear(this.keepOff, cx, cy, cy + sea, R, LIGHT_REGION_PX);
      }
      this.whyText[i] = clearOf;
      // Both by the lanterns' clock, toward this frame's at GIVE_WAY_S: on
      // a fast scroll through the steep descent a line's spacing closes or
      // opens by half within a few frames as well.
      const target = spaced * clearOf;
      const was = this.clearNow[i];
      const given =
        reach >= 1 || !this.wasPlaced[i]
          ? target
          : was + Math.max(-reach, Math.min(reach, target - was));
      this.clearNow[i] = given;
      seen *= given;
      const q = i * VALUES;
      const seed = v[q + 2];
      const I = seen * v[q + 1] * (0.85 + 0.15 * rand(seed, 2));
      if (!(I > 0.002)) continue;
      const r = k * stride;
      out[r] = this.px[i];
      out[r + 1] = this.py[i];
      out[r + 2] = rc;
      out[r + 3] = drop;
      out[r + 4] = I;
      out[r + 5] = seed;
      out[r + 6] = 0;
      out[r + 7] = 0;
      const glyphs = this.layers[i];
      this.drawnMark[k] = this.marks[i];
      this.drawnLayer[k] = glyphs ? (this.layerIds.get(glyphs) ?? -1) : -1;
      this.drawnPlace[k] = v[q];
      k++;
    }

    // Which were placed, for the next frame's (a lantern placed again after
    // frames unplaced starts afresh).
    this.wasPlaced.set(this.placed);

    // Shown only while there are lanterns; set as the count crosses zero,
    // so a timing that hides it by name on alternate frames (Chart.showNamed,
    // road-bench.mjs AB=lights) can.
    const on = k > 0;
    if (on !== this.shown) {
      this.shown = on;
      this.mesh.visible = on;
    }
    const geometry = this.mesh.geometry;
    if (!on) {
      if (this.drawnCount !== 0) {
        // The one culled instance the warm-up draws (constructor).
        out[4] = 0;
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
   * Development and checks: each lantern drawn in the last frame: the box
   * of its halo and its reflection (CSS px from the canvas's top left),
   * its intensity, its centre (CSS px), and its ship (her mark, and her
   * layer in the order the lanterns' layers were first seen): LIGHT_BOUNDS
   * numbers a lantern, x0, y0, x1, y1, intensity, cx, cy, mark, layer,
   * place (0 stern, 1 top, 2 mizzen).
   */
  bounds(dpr: number, width: number, height: number): number[] {
    const out: number[] = [];
    const rows = this.data.array;
    for (let i = 0; i < this.drawnCount; i++) {
      const r = i * this.stride;
      const rc = rows[r + 2];
      const drop = rows[r + 3];
      const I = rows[r + 4];
      if (!(I > 0.002) || !(rc > 0)) continue;
      const R = HALO * rc + dpr;
      const x = rows[r];
      const y = rows[r + 1];
      out.push(
        (x - R + 0.5 * width) / dpr,
        (0.5 * height - (y + R)) / dpr,
        (x + R + 0.5 * width) / dpr,
        (0.5 * height - (y - drop * (1 + REFLECT) - R)) / dpr,
        I,
        (x + 0.5 * width) / dpr,
        (0.5 * height - y) / dpr,
        this.drawnMark[i],
        this.drawnLayer[i],
        this.drawnPlace[i],
      );
    }
    return out;
  }

  /**
   * Development: every lantern set in the last frame, in its order of
   * setting: its ship's mark and its place, whether it was placed, how much
   * its ship's presence, the dark and the haze let it show, and what its
   * spacing and the lettering left of that.
   */
  explain(): {
    mark: number;
    place: number;
    placed: boolean;
    base: number;
    space: number;
    text: number;
    x: number;
    y: number;
    height: number;
  }[] {
    const out = [];
    for (let i = 0; i < this.n; i++)
      out.push({
        mark: this.marks[i],
        place: this.values[i * VALUES],
        placed: this.placed[i] === 1,
        base: this.seen[i],
        space: this.whySpace[i],
        text: this.whyText[i],
        x: this.sx[i],
        y: this.sy[i],
        height: this.whyHeight[i],
      });
    return out;
  }

  /**
   * Projects a point on the sea (world km, z 0) through the frame's camera:
   * `at` gets device px from the viewport's centre, y up, and whether it
   * lies in front of the eye.
   */
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

/**
 * How far a lantern keeps clear of the lettering (CSS px): the product,
 * over every outline shown, of 1 - shown × (1 - smooth(range, gap)), the gap the least distance from the outline (a convex quad, as
 * drawn) to the light's column, its centre (cx, y0) down to its
 * reflection's foot (cx, y1), less its halo's radius `r`; `shown` all of
 * it once the outline shows at TEXT_SHOWN[1] (a label moving from one
 * place to another crossfades: a light kept half lit over the drawing
 * going out stood on its letters), the light coming back only as the
 * text is all but gone.
 */
export function lightClear(
  texts: readonly ScreenText[],
  cx: number,
  y0: number,
  y1: number,
  r: number,
  range: readonly [number, number],
): number {
  let clear = 1;
  const far = range[1] + r;
  for (const t of texts) {
    for (let i = 0; i < t.count; i++) {
      const w = t.weights[i];
      if (!(w > 0.01)) continue;
      const q = t.quads[i];
      // Its box first, to pass over the far ones at once.
      const qx0 = Math.min(q[0], q[2], q[4], q[6]);
      const qx1 = Math.max(q[0], q[2], q[4], q[6]);
      const qy0 = Math.min(q[1], q[3], q[5], q[7]);
      const qy1 = Math.max(q[1], q[3], q[5], q[7]);
      // An outline a label lost (a corner behind the eye: HeadLabels sets
      // it NaN) keeps clear of nothing.
      if (!Number.isFinite(qx0 + qx1 + qy0 + qy1)) continue;
      if (qx0 - cx > far || cx - qx1 > far || qy0 - y1 > far || y0 - qy1 > far)
        continue;
      const gap = quadToColumn(q, cx, y0, y1) - r;
      if (gap >= range[1]) continue;
      clear *=
        1 -
        smoothstep(TEXT_SHOWN[0], TEXT_SHOWN[1], w) *
          (1 - smoothstep(range[0], range[1], gap));
      if (clear <= 0) return 0;
    }
  }
  return clear;
}

/**
 * The least distance between a convex quad (four corners, x y each, in
 * order) and the vertical segment x = cx, y0..y1 (y0 <= y1); 0 where they
 * meet.
 */
function quadToColumn(
  q: ArrayLike<number>,
  cx: number,
  y0: number,
  y1: number,
): number {
  // The segment's ends and the quad's corners against each other's edges.
  let best = Number.POSITIVE_INFINITY;
  let inside0 = true;
  let inside1 = true;
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = q[2 * k];
    const ay = q[2 * k + 1];
    const bx = q[(2 * k + 2) % 8];
    const by = q[(2 * k + 3) % 8];
    // Which side of edge a-b each end lies (the quad's winding either way).
    const ex = bx - ax;
    const ey = by - ay;
    const s0 = ex * (y0 - ay) - ey * (cx - ax);
    const s1 = ex * (y1 - ay) - ey * (cx - ax);
    if (sign === 0) sign = Math.sign(s0) || Math.sign(s1);
    if (s0 * sign < 0) inside0 = false;
    if (s1 * sign < 0) inside1 = false;
    best = Math.min(
      best,
      pointToSegment(cx, y0, ax, ay, bx, by),
      pointToSegment(cx, y1, ax, ay, bx, by),
      // The corner to the column.
      dist2(ax - cx, ay - Math.min(y1, Math.max(y0, ay))),
    );
    // The column crossing this edge.
    if ((ax - cx) * (bx - cx) <= 0 && ax !== bx) {
      const y = ay + ((cx - ax) / (bx - ax)) * (by - ay);
      if (y >= y0 && y <= y1) return 0;
    }
  }
  // A quad with no area (all its corners at one point) holds nothing.
  if (sign === 0) return best;
  return inside0 || inside1 ? 0 : best;
}

function dist2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function pointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const ex = bx - ax;
  const ey = by - ay;
  const l = ex * ex + ey * ey;
  const t =
    l > 0 ? Math.min(1, Math.max(0, ((px - ax) * ex + (py - ay) * ey) / l)) : 0;
  const dx = ax + ex * t - px;
  const dy = ay + ey * t - py;
  return Math.sqrt(dx * dx + dy * dy);
}

/** A place of a ship's drawing by its number (PLACE). */
function pointOf(a: Anatomy, place: number): { along: number; up: number } {
  return place === 0 ? a.stern : place === 1 ? a.top : a.mastheads.mizzen;
}

/** How far apart two lanterns stand on screen (CSS px). */
function apart(
  sx: Float64Array,
  sy: Float64Array,
  i: number,
  j: number,
): number {
  const gx = sx[j] - sx[i];
  const gy = sy[j] - sy[i];
  return Math.sqrt(gx * gx + gy * gy);
}
