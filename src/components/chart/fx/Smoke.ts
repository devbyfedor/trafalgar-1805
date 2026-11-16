import {
  GLSL3,
  type InstancedBufferGeometry,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { Glyphs } from "../glyphs/Glyphs";
import { type ScreenText, YIELD_PX } from "../lettering/Lettering";
import { GLSL_LINES } from "../shaders/common";
import type { ShipAnatomy } from "./anatomy";
import { effectQuad, GLSL_FX, InstanceData, windToward } from "./common";

/**
 * Smoke on the chart, as the engravers of the period drew it: small
 * billowing puffs of round lobes in the paper's white, each contour and its
 * shade cut in ink, heavier on the side turned from the light. Off Cape
 * Finisterre on 22 July 1805 the scene sets battle smoke at and between the
 * two lines (scenes/02-road/smoke.ts); the engine knows nothing of battles,
 * only of puffs at ships.
 *
 * A puff stands at a ship: at a point of her drawing (fx/anatomy.ts), moved
 * on screen by a shift and by how far it has drifted downwind, all in her
 * glyph's heights, so it keeps with her at every zoom and shrinks with her
 * for want of room. Her place, height, facing and opacity are read from
 * where the glyph layout drew her this frame (`Glyphs.drawn`), after the
 * layout has run: the layer is added to the chart after the layout. Its
 * whole life is a pure function of the age the scene gives it (it swells,
 * leans downwind, settles lower and wider and thins), and nothing in it
 * follows the clock of the wall, so a frame at a scroll position is always
 * the same frame and scrolling back plays the smoke backwards.
 *
 * Ported from the signals branch (`worktree-wf_016f0c7a-068-2`, fx/Smoke.ts,
 * the fragment shader nearly as it was); docs/decisions.md, "Scene 2,
 * Stage B: the smoke at Finisterre".
 *
 * Every puff is an instance of one quad: one draw call. The mesh is named
 * "smoke" (Chart.showNamed) and drawn under the ships, over their wakes and
 * the routes (render order 24): smoke lies on the water, and the ships'
 * silhouettes stand clear over it, so they read one by one as before. It is
 * drawn without a depth test: the scene sets smoke only on open sea, where
 * nothing of the chart stands between it and the eye.
 *
 * Each frame the scene calls `clear`, then adds this frame's puffs; their
 * ships are read in `update`.
 */

/** Where a puff of the scene's stands and how it lives (reused, not kept). */
export interface PuffSpec {
  /**
   * Its foot at a point of her drawing, glyph heights: along her hull
   * toward the bow from its middle (narrowed and turned with her glyph),
   * and up from the glyph's foot (fx/anatomy.ts).
   */
  along: number;
  up: number;
  /** Then moved on screen, glyph heights: right and up. */
  dx: number;
  dy: number;
  /** And downwind on screen (the wind's way across the sea), glyph heights. */
  drift: number;
  /** Its size, glyph heights: about its height in bloom. */
  size: number;
  /** How far through its life, 0..1 (none outside). */
  age: number;
  /** Shapes it, a whole number kept for its life. */
  seed: number;
  opacity: number;
  /** How flat it lies: 0 a fresh puff, 1 smoke lying on the water. */
  lie: number;
}

/** A fresh spec for a scene to fill and pass, again and again. */
export function puffSpec(): PuffSpec {
  return {
    along: 0,
    up: 0,
    dx: 0,
    dy: 0,
    drift: 0,
    size: 0.3,
    age: 0,
    seed: 0,
    opacity: 1,
    lie: 0,
  };
}

const ATTRIBUTES = ["iAt", "iPuff", "iWind"] as const;

/** A puff's values as set: along, up, dx, dy, drift, size, age, seed, opacity, lie. */
const VALUES = 10;

/**
 * Her glyph's drawn opacity under which the smoke at her goes with her
 * (smoothly, to none as she is gone); above it the smoke is whole.
 */
const SHIP_GONE = 0.35;

const VERTEX = /* glsl */ `
precision highp float;
// Its foot on screen, device px from the viewport's centre (x right, y
// up), its depth, and the device px of one of its units (about the puff's
// height in bloom).
in vec4 iAt;
// Age (0..1), seed, opacity, how flat it lies.
in vec4 iPuff;
// The wind's way across the screen there, times its strength.
in vec4 iWind;
uniform vec2 uViewport;
uniform float uDpr;
out vec2 vLocal;
out float vUnit;
out float vAge;
out float vSeed;
out float vAlpha;
flat out vec2 vWind;
flat out vec2 vWide;
${GLSL_FX}

void main() {
  float age = iPuff.x;
  float unit = iAt.w;
  if (age <= 0.0 || age >= 1.0 || iPuff.z < 0.002 || unit < 0.05) {
    gl_Position = FX_NOWHERE;
    return;
  }
  vec2 wind = iWind.xy;
  // Smoke lying on the water lies wider and lower than a gun's fresh puff;
  // a puff's seed may mirror it.
  float lie = iPuff.w;
  vec2 wide = vec2(1.0 + 0.6 * lie, 1.0 - 0.3 * lie);
  if (fxRand(iPuff.y, 99) < 0.5) wide.x = -wide.x;

  // The puff's extent at this age, in units (the bounds of the lobes the
  // fragment shader draws), with a pixel or two of room for its contour.
  float grow = 1.0 + 0.5 * age;
  float spread = 1.0 + 0.4 * age;
  float settle = smoothstep(0.45, 1.0, age);
  float rMax = 0.37 * grow;
  float sx = (1.0 + 0.55 * settle) * abs(wide.x);
  vec2 shear = abs(wind) * spread * 0.4 * age;
  float m = 0.03 + 2.0 * uDpr / max(unit, 1e-3);
  float halfW = 0.84 * spread * abs(wide.x) + rMax * sx + shear.x + m;
  vec2 lean = wind * 0.55 * age + vec2(0.0, 0.1 * age);
  vec2 lo = vec2(-halfW, -rMax - shear.y - m) + lean;
  vec2 hi = vec2(halfW, (0.92 * spread + rMax) * wide.y + shear.y + m) + lean;
  vec2 corner = mix(lo, hi, position.xy);

  gl_Position = vec4((iAt.xy + corner * unit) / (0.5 * uViewport), iAt.z, 1.0);
  vLocal = corner - lean;
  vUnit = unit;
  vAge = age;
  vSeed = iPuff.y;
  vAlpha = iPuff.z;
  vWind = wind;
  vWide = wide;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_LINES}
${GLSL_FX}
// Sunlit paper, paper in shade, and the engraver's ink.
uniform vec3 uBody;
uniform vec3 uShade;
uniform vec3 uLine;
// The light on screen: x, y the way it comes from (unit), z how much it
// falls from one side (0 at night, or with the sun behind the camera).
uniform vec3 uLight;
uniform float uNight;
uniform float uDpr;
in vec2 vLocal;
in float vUnit;
in float vAge;
in float vSeed;
in float vAlpha;
flat in vec2 vWind;
flat in vec2 vWide;
out vec4 fragColor;

// The lobes of a puff in bloom, nearest first: centre (x, y up from the
// puff's foot) and radius, in units. A low row, two above it, one on top,
// as the period drew a puff of smoke; each puff varies them by its seed.
const int LOBES = 7;
const vec3 LOBE[LOBES] = vec3[LOBES](
  vec3(0.00, 0.30, 0.30),
  vec3(-0.40, 0.26, 0.25),
  vec3(0.42, 0.24, 0.24),
  vec3(-0.66, 0.19, 0.17),
  vec3(-0.19, 0.58, 0.27),
  vec3(0.25, 0.60, 0.25),
  vec3(0.04, 0.86, 0.19)
);

void main() {
  float age = vAge;
  // Each lobe swells out in turn over the first fifth of the life; the puff
  // keeps growing and spreading as the smoke thins, and over its second
  // half settles, lower, wider and flatter.
  float grow = 1.0 + 0.5 * age;
  float spread = 1.0 + 0.4 * age;
  float settle = smoothstep(0.45, 1.0, age);
  // Smoke lying on the water spreads its billows wide but keeps them
  // round, a little flatter: a low bank, not a row of flat ellipses.
  float stretch = 1.0 + 0.4 * (abs(vWide.x) - 1.0);
  vec2 squash = vec2((1.0 + 0.55 * settle) * stretch, (1.0 - 0.3 * settle) * vWide.y);
  // Contours a little under a CSS pixel, never so fine that they fade.
  float lineW = clamp(0.06 * vUnit, 0.6 * uDpr, 0.9 * uDpr);
  // Where the puff is big enough to hold them, the shade is ruled, as the
  // engravers ruled shadow: level lines a couple of CSS px apart whose
  // weight follows the shade; a flat tint below that.
  float ruled = smoothstep(16.0, 28.0, vUnit / uDpr);
  float rule = 2.2 * uDpr;
  float toRule = abs(fract(vLocal.y * vUnit / rule) - 0.5) * rule;
  vec2 light = uLight.xy;
  float day = 1.0 - uNight;

  // Painted back to front: each lobe covers what lies behind it and cuts
  // its contour where it stands in front of other lobes, as a billow was
  // drawn; the silhouette's contour goes on last. paint: the body's colour
  // premultiplied by its cover; ink: the contours' cover; edge: the distance
  // to the silhouette (device px), and how far the lobe it belongs to is
  // turned from the light.
  vec3 paint = vec3(0.0);
  float cover = 0.0;
  float ink = 0.0;
  float edge = 1e4;
  float edgeShade = 0.5;
  for (int k = LOBES - 1; k >= 0; k--) {
    float t = clamp((age - 0.028 * float(k)) / 0.2, 0.0, 1.0);
    if (t <= 0.0) continue;
    float swell = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);
    vec3 L = LOBE[k];
    vec2 c = L.xy + (vec2(fxRand(vSeed, 3 * k), fxRand(vSeed, 3 * k + 1)) - 0.5) * vec2(0.16, 0.12);
    c.x *= vWide.x;
    float r = L.z * (0.85 + 0.3 * fxRand(vSeed, 3 * k + 2)) * mix(0.15, 1.0, swell) * grow;
    c = mix(vec2(0.0, 0.22), c * vec2(spread, 0.5 + 0.5 * spread), 0.35 + 0.65 * swell);
    c.y *= (1.0 - 0.45 * settle) * vWide.y;
    // Higher smoke is carried farther downwind.
    c += vWind * c.y * 0.4 * age;
    // The billows churn as the smoke ages (by its age, not the wall's
    // clock: the frame at a scroll position is always the same).
    float p1 = 6.2832 * fxRand(vSeed, 40 + k);
    float p2 = 6.2832 * fxRand(vSeed, 50 + k);
    c += 0.03 * vec2(sin(5.0 * age + p1), cos(3.7 * age + p2));
    r *= 1.0 + 0.04 * sin(2.9 * age + p2);

    // Distance to the lobe's ellipse, device px (first order, so the
    // contour keeps its width round a flattened lobe).
    vec2 e = r * squash;
    vec2 q = (vLocal - c) / e;
    float lq = length(q);
    float d = (lq - 1.0) / max(length(q / max(lq, 1e-4) / e), 1e-4) * vUnit;
    float a = clamp(0.5 - d, 0.0, 1.0);
    // Shade: the side turned from the light (by day), the lobe's belly,
    // and the puff's foot, where the smoke is densest.
    vec2 n = q / max(lq, 1.0);
    float side = (1.0 - smoothstep(-0.75, 0.25, dot(n, light))) * uLight.z;
    float belly = 1.0 - smoothstep(-0.85, -0.1, n.y);
    float foot = 1.0 - smoothstep(0.02, 0.4, vLocal.y);
    float shade = clamp(side * 0.8 + belly * 0.45 + foot * 0.35, 0.0, 1.0);
    // Thinning smoke shows less shade.
    shade *= mix(0.6, 1.0, day) * (1.0 - 0.45 * smoothstep(0.4, 0.95, age));
    // Paper, toned by the shade where the puff is small; white, with the
    // shade ruled over it in ink, where it is big: only where the shade is
    // deep (the side turned from the sun, the belly), so the lit side stays
    // the paper's white and a billow never reads as striped.
    vec3 body = mix(uBody, uShade, shade * (1.0 - 0.6 * ruled));
    float hatch = lineCov(toRule, shade * rule * 0.5) * ruled * smoothstep(0.38, 0.62, shade) * (1.0 - smoothstep(0.35, 0.7, age));
    body = mix(body, uLine, hatch * 0.7);
    // This lobe's contour over the lobes behind it: its upper edge, where a
    // nearer billow stands against a farther one. Cut while the puff is
    // fresh and lost as it spreads, so old smoke reads as soft masses with
    // only their outline, and a bank of it as one body, not a heap of
    // bubbles.
    float arc = lineCov(abs(d), lineW * mix(0.7, 1.2, shade)) * smoothstep(-0.2, 0.45, q.y / max(lq, 1e-4)) * cover * (1.0 - smoothstep(0.12, 0.45, age));
    paint = body * a + paint * (1.0 - a);
    cover = a + cover * (1.0 - a);
    ink = arc + ink * (1.0 - a) * (1.0 - arc);
    if (d < edge) {
      edge = d;
      edgeShade = shade;
    }
  }
  // The silhouette's contour: heavier where the puff turns from the light,
  // broken where the sun strikes it full (a lost edge, as engravers left).
  float lost = (1.0 - smoothstep(0.0, 0.25, edgeShade)) * 0.6 * day;
  float outline = lineCov(abs(edge), lineW * mix(0.75, 1.3, edgeShade)) * (1.0 - lost);
  ink = outline + ink * (1.0 - outline);
  vec3 body = paint / max(cover, 1e-4);

  // Dense as it swells out, thinning as it spreads and settles; the ink goes
  // before the body. By night the smoke is all but lost in the dark.
  float a = vAlpha * smoothstep(0.0, 0.02, age);
  float bodyA = cover * mix(0.96, 0.86, smoothstep(0.35, 0.8, age)) * (1.0 - smoothstep(0.6, 1.0, age)) * a;
  float inkA = ink * 0.85 * (1.0 - smoothstep(0.3, 0.75, age)) * a;
  bodyA *= 1.0 - 0.7 * uNight;
  inkA *= 1.0 - 0.9 * uNight;

  vec3 rgb = uLine * inkA + body * bodyA * (1.0 - inkA);
  float alpha = inkA + bodyA * (1.0 - inkA);
  if (alpha < 0.003) discard;
  fragColor = vec4(rgb, alpha);
}
`;

export class Smoke implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly capacity: number;
  /** Where things are on each type of glyph. */
  readonly anatomy: ShipAnatomy;
  /** Puffs set this frame. */
  private n = 0;
  /** Puffs drawn last frame. */
  private drawnCount = 0;
  private readonly layers: (Glyphs | null)[];
  private readonly marks: Int32Array;
  private readonly values: Float32Array;
  /** This frame's rows, before sorting, and each one's depth. */
  private readonly rows: Float32Array;
  private readonly depth: Float32Array;
  private readonly order: Int32Array;
  private sorted = 0;
  private readonly data: InstanceData;
  private readonly stride: number;
  private readonly toward = { x: 1, y: 0 };
  private strength = 0.5;
  private readonly viewProjection = new Matrix4();
  private readonly body = new Vector3();
  private readonly shade = new Vector3();
  private readonly line = new Vector3();
  private readonly light = new Vector3();
  /** Out of a projection: device px from the centre, and whether in front. */
  private readonly at = { x: 0, y: 0, front: false };
  /** Whether the mesh is shown (set only as the count crosses zero). */
  private shown = false;
  /** A puff's lobes' outline, units from its foot (puffExtent). */
  private readonly extent = new Float64Array(4);
  /** The band on screen the puffs keep within (setBand), device px. */
  private readonly band = new Float64Array(2);
  /** The lettering the puffs give way to (setKeepClear). */
  private keepClear: readonly ScreenText[] = [];

  /**
   * `anatomy` from the glyphs' atlas and types; `capacity` puffs at most a
   * frame (more are dropped).
   */
  constructor(anatomy: ShipAnatomy, capacity: number) {
    this.capacity = capacity;
    this.anatomy = anatomy;
    this.layers = new Array<Glyphs | null>(capacity).fill(null);
    this.marks = new Int32Array(capacity);
    this.values = new Float32Array(capacity * VALUES);
    this.stride = ATTRIBUTES.length * 4;
    this.rows = new Float32Array(capacity * this.stride);
    this.depth = new Float32Array(capacity);
    this.order = new Int32Array(capacity);
    const geometry = effectQuad();
    this.data = new InstanceData(geometry, capacity, ATTRIBUTES);
    // One instance always, culled while there is no puff (its age is 0): a
    // draw of none issues no draw call, and the warm-up (Chart.warm) must
    // draw it once to finish its programs before the scene comes to it.
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
          uNight: { value: 0 },
          uBody: { value: this.body },
          uShade: { value: this.shade },
          uLine: { value: this.line },
          uLight: { value: this.light },
        },
      }),
    );
    this.mesh.name = "smoke";
    // Puffs are placed in the shader; the mesh's bounds don't know where.
    this.mesh.frustumCulled = false;
    // Under the ships (25), over their wakes (22), the camps and the
    // tracks' rings (23).
    this.mesh.renderOrder = 24;
    this.mesh.visible = false;
  }

  /**
   * The wind the smoke drifts with: where it blows from, degrees true, as
   * the logs give it (WNW is 292.5), and its strength, 0 (calm: the puffs
   * rise straight) to 1 (a fresh breeze: they lean hard downwind).
   */
  setWind(fromDeg: number, strength: number): void {
    windToward(fromDeg, this.toward);
    this.strength = Math.min(1, Math.max(0, strength));
  }

  /**
   * This frame's band on screen (device px from the viewport's centre, y
   * up) that every puff keeps within, its lobes' outline and all: a puff
   * taller than the band is shrunk to it, one reaching past an edge is
   * moved back in. `lo >= hi`: no band.
   */
  setBand(lo: number, hi: number): void {
    this.band[0] = lo;
    this.band[1] = hi;
  }

  /**
   * The lettering on screen the smoke gives way to (names, labels; CSS
   * px, as Lettering.screen and HeadLabels.screen give it): a puff goes as
   * its outline comes within YIELD_PX of one, as a minor name gives way
   * to a higher one.
   */
  setKeepClear(texts: readonly ScreenText[]): void {
    this.keepClear = texts;
  }

  /** Starts this frame's puffs: the scene adds them after it. */
  clear(): void {
    for (let i = 0; i < this.n; i++) this.layers[i] = null;
    this.n = 0;
  }

  /** How many puffs are set this frame. */
  get count(): number {
    return this.n;
  }

  /**
   * A puff at mark `mark` of `glyphs`, as `spec` says. It shows whole while
   * her glyph shows, goes as she goes out (SHIP_GONE), and is dimmed by the
   * haze as she is.
   */
  puffAtShip(glyphs: Glyphs, mark: number, spec: PuffSpec): void {
    if (!(spec.age > 0 && spec.age < 1) || !(spec.opacity > 0.002)) return;
    if (this.n >= this.capacity) return;
    const i = this.n++;
    this.layers[i] = glyphs;
    this.marks[i] = mark;
    const v = this.values;
    const k = i * VALUES;
    v[k] = spec.along;
    v[k + 1] = spec.up;
    v[k + 2] = spec.dx;
    v[k + 3] = spec.dy;
    v[k + 4] = spec.drift;
    v[k + 5] = spec.size;
    v[k + 6] = spec.age;
    v[k + 7] = spec.seed;
    v[k + 8] = spec.opacity;
    v[k + 9] = spec.lie;
  }

  update(frame: FrameInfo): void {
    const n = this.n;
    const material = this.mesh.material;
    const u = material.uniforms;
    u.uViewport.value.set(frame.width, frame.height);
    u.uDpr.value = frame.dpr;
    u.uNight.value = frame.light.night;
    this.colours(frame);

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
    const at = this.at;
    const stride = this.stride;
    const rows = this.rows;
    const v = this.values;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const glyphs = this.layers[i];
      if (!glyphs) continue;
      const m = this.marks[i];
      const d = glyphs.drawn;
      // Not laid out this frame: her values are last frame's or none.
      if (!(d.alpha[m] > 0.003) || !(d.nominal[m] > 0)) continue;
      const h = d.height[m];
      if (!(h > 0.5)) continue;
      const x = d.x[m];
      const y = d.y[m];
      this.project(vp, x, y, halfW, halfH);
      if (!at.front) continue;
      const footX = at.x;
      const footY = at.y;
      const ex = x - eye.x;
      const ey = y - eye.y;
      const dist = Math.sqrt(ex * ex + ey * ey + eye.z * eye.z);
      // The wind's way across the screen at her (fx: fxWindOnScreen):
      // foreshortened as the sea is, never so short that smoke blowing
      // toward the eye stands still.
      const probe = 0.01 * dist;
      this.project(
        vp,
        x + this.toward.x * probe,
        y + this.toward.y * probe,
        halfW,
        halfH,
      );
      let wx = 0;
      let wy = 0;
      if (at.front) {
        const runX = at.x - footX;
        const runY = at.y - footY;
        const px = Math.sqrt(runX * runX + runY * runY);
        if (px > 1e-4) {
          const scale = Math.min(
            1,
            Math.max(0.35, px / ((probe * frame.pxPerRadian) / dist)),
          );
          wx = (runX / px) * scale;
          wy = (runY / px) * scale;
        }
      }
      // Her facing, as her glyph's (Glyphs.ts, glyphFacing): bows right
      // above 0.14, left below -0.14, a crossfade between; her side
      // narrowing as she turns end-on.
      const heading = d.heading[m];
      const facing = Math.sin(heading) * rx + Math.cos(heading) * ry;
      const t = Math.min(1, Math.max(0, (facing + 0.14) / 0.28));
      const dir = 2 * t * t * (3 - 2 * t) - 1;
      const narrow = d.narrow[m] + (1 - d.narrow[m]) * Math.abs(facing);
      const q = i * VALUES;
      const drift = v[q + 4];
      const px = footX + (v[q] * narrow * dir + v[q + 2] + wx * drift) * h;
      let py = footY + (v[q + 1] + v[q + 3] + wy * drift) * h;
      let unit = v[q + 5] * h;
      const age = v[q + 6];
      const seed = v[q + 7];
      const lie = v[q + 9];
      const swx = wx * this.strength;
      const swy = wy * this.strength;
      // Its lobes' outline as drawn (puffExtent), units from its foot.
      const e = this.extent;
      puffExtent(age, seed, lie, swx, swy, e);
      const pad = (1.5 * frame.dpr) / Math.max(unit, 1e-3);
      // Kept within the scene's band on screen (setBand): shrunk to it if
      // taller, then moved up or down into it.
      const bandLo = this.band[0];
      const bandHi = this.band[1];
      if (bandHi > bandLo) {
        const tall = (e[3] - e[2] + 2 * pad) * unit;
        if (tall > bandHi - bandLo) unit *= (bandHi - bandLo) / tall;
        const bottom = py + (e[2] - pad) * unit;
        const top = py + (e[3] + pad) * unit;
        if (bottom < bandLo) py += bandLo - bottom;
        else if (top > bandHi) py -= top - bandHi;
      }
      const hz = dist / visibility;
      // Smoke hangs in the air, not on her: whole while her glyph still
      // shows, going only as she goes out (SHIP_GONE). Faded with her
      // drawing, a puff at a ship striking or leaving the story read as a
      // grey ghost of itself, its body and lines dimmed alike.
      const ship = Math.min(1, d.alpha[m] / SHIP_GONE);
      let alpha = ship * ship * (3 - 2 * ship) * v[q + 8] * Math.exp(-hz * hz);
      // It gives way to the lettering as a name gives way to a higher one
      // (YIELD_PX): gone within 4 CSS px of a name's or label's outline,
      // whole from 10.
      if (alpha > 0.002 && this.keepClear.length) {
        const dpr = frame.dpr;
        const x0 = (px + (e[0] - pad) * unit + halfW) / dpr;
        const x1 = (px + (e[1] + pad) * unit + halfW) / dpr;
        const y0 = (halfH - (py + (e[3] + pad) * unit)) / dpr;
        const y1 = (halfH - (py + (e[2] - pad) * unit)) / dpr;
        alpha *= clearOfText(this.keepClear, x0, y0, x1, y1);
      }
      if (!(alpha > 0.002)) continue;
      const r = k * stride;
      rows[r] = px;
      rows[r + 1] = py;
      rows[r + 2] = 0;
      rows[r + 3] = unit;
      rows[r + 4] = age;
      rows[r + 5] = seed;
      rows[r + 6] = alpha;
      rows[r + 7] = lie;
      rows[r + 8] = swx;
      rows[r + 9] = swy;
      rows[r + 10] = 0;
      rows[r + 11] = 0;
      // Higher on screen is farther: drawn first. By where the scene set it
      // at her (her foot and its shift), not where it has drifted or been
      // moved into the band: puffs keep their order as they drift, so two
      // that overlap never trade places within a frame (a nearer billow's
      // contour would jump to the other).
      this.depth[k] = footY + (v[q + 1] + v[q + 3]) * h;
      k++;
    }

    // Shown only while there are puffs; set as the count crosses zero, so a
    // timing that hides it by name on alternate frames (Chart.showNamed,
    // road-bench.mjs AB=smoke) can.
    const on = k > 0;
    if (on !== this.shown) {
      this.shown = on;
      this.mesh.visible = on;
    }
    const geometry = this.mesh.geometry;
    if (!on) {
      if (this.drawnCount !== 0) {
        // The one culled instance the warm-up draws (constructor).
        this.data.array[4] = 0;
        this.data.upload(1);
        geometry.instanceCount = 1;
        this.drawnCount = 0;
      }
      return;
    }

    // Back to front: an insertion sort over last frame's order, which is
    // nearly sorted already when the scene sets its puffs in the same order
    // each frame.
    const order = this.order;
    if (k !== this.sorted) {
      for (let i = 0; i < k; i++) order[i] = i;
      this.sorted = k;
    }
    for (let i = 1; i < k; i++) {
      const j0 = order[i];
      const dj = this.depth[j0];
      let j = i - 1;
      while (j >= 0 && this.depth[order[j]] < dj) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = j0;
    }
    const out = this.data.array;
    for (let i = 0; i < k; i++) {
      const from = order[i] * stride;
      const to = i * stride;
      for (let c = 0; c < stride; c++) out[to + c] = rows[from + c];
    }
    this.data.upload(k);
    geometry.instanceCount = k;
    this.drawnCount = k;
  }

  /**
   * Development and checks: each puff drawn in the last frame, the box of
   * its lobes as drawn (puffExtent) with its contour, CSS px from the
   * canvas's top left, and its opacity: x0, y0, x1, y1, opacity, five
   * numbers a puff.
   */
  bounds(dpr: number, width: number, height: number): number[] {
    const out: number[] = [];
    const rows = this.data.array;
    const e = this.extent;
    for (let i = 0; i < this.drawnCount; i++) {
      const r = i * this.stride;
      const unit = rows[r + 3];
      const age = rows[r + 4];
      if (!(age > 0 && age < 1) || !(unit >= 0.05)) continue;
      puffExtent(age, rows[r + 5], rows[r + 7], rows[r + 8], rows[r + 9], e);
      // The contour's half width and its antialiasing round the lobes.
      const pad = (1.5 * dpr) / unit;
      const x = rows[r];
      const y = rows[r + 1];
      out.push(
        (x + (e[0] - pad) * unit + 0.5 * width) / dpr,
        (0.5 * height - (y + (e[3] + pad) * unit)) / dpr,
        (x + (e[1] + pad) * unit + 0.5 * width) / dpr,
        (0.5 * height - (y + (e[2] - pad) * unit)) / dpr,
        rows[r + 6],
      );
    }
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

  /**
   * Paper and ink under the current light: the body the sunlit paper of the
   * chart's land, its shade toward the light's blue-grey, the lines the
   * land's contour ink, a little into the sea's colour; and the sun's way
   * across the screen, for the side each billow turns from it.
   */
  private colours(frame: FrameInfo): void {
    const light = frame.light;
    const day = 1 - light.night;
    this.body
      .copy(light.paperLow)
      .lerp(light.sunColor, 0.35 * day)
      .lerp(light.seaDeep, 0.08 + 0.5 * light.night);
    this.shade
      .copy(light.paperLow)
      .lerp(light.shadeColor, 0.55 * day)
      .lerp(light.seaDeep, 0.32 + 0.3 * light.night);
    this.line.copy(light.contourInk).lerp(light.seaDeep, 0.2);
    // The sun's direction in the camera's frame: x right, y up the screen,
    // z toward the eye. From behind the camera it lights a puff full face.
    const l = this.light
      .copy(light.sunDir)
      .transformDirection(frame.camera.matrixWorldInverse);
    const across = Math.sqrt(l.x * l.x + l.y * l.y);
    const side = across > 1e-4 ? day * Math.min(1, across * 1.6) : 0;
    if (across > 1e-4) l.set(l.x / across, l.y / across, side);
    else l.set(0, 1, 0);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** FRAGMENT's LOBE table: each lobe's centre x, y and radius, units. */
const LOBES = [
  0.0, 0.3, 0.3, -0.4, 0.26, 0.25, 0.42, 0.24, 0.24, -0.66, 0.19, 0.17, -0.19,
  0.58, 0.27, 0.25, 0.6, 0.25, 0.04, 0.86, 0.19,
];

const hashFloat = new Float32Array(1);
const hashBits = new Uint32Array(hashFloat.buffer);

/** GLSL_FX's fxRand on the CPU, bit for bit (a seed as the float32 it is drawn with). */
function fxRand(seed: number, k: number): number {
  hashFloat[0] = seed;
  let n =
    (Math.imul(hashBits[0], 747796405) + Math.imul(k, 2891336453 | 0)) >>> 0;
  n = (n ^ 61 ^ (n >>> 16)) >>> 0;
  n = Math.imul(n, 9) >>> 0;
  n = (n ^ (n >>> 4)) >>> 0;
  n = Math.imul(n, 0x27d4eb2d) >>> 0;
  n = (n ^ (n >>> 15)) >>> 0;
  return (n & 0xffff) / 65536;
}

/**
 * A puff's lobes as FRAGMENT places them at `age` (with VERTEX's lean):
 * their outline's box in units from the puff's foot, x right and y up,
 * `out` = [x0, x1, y0, y1]. `windX`, `windY`: the wind on screen times its
 * strength (iWind). Lets the layer keep a puff where the scene means it to
 * be, and the checks measure it as drawn; the shader's own quad leaves
 * room round it.
 */
export function puffExtent(
  age: number,
  seed: number,
  lie: number,
  windX: number,
  windY: number,
  out: Float64Array,
): void {
  let wideX = 1 + 0.6 * lie;
  const wideY = 1 - 0.3 * lie;
  if (fxRand(seed, 99) < 0.5) wideX = -wideX;
  const grow = 1 + 0.5 * age;
  const spread = 1 + 0.4 * age;
  const settle = smoothstep(0.45, 1, age);
  const stretch = 1 + 0.4 * (Math.abs(wideX) - 1);
  const squashX = (1 + 0.55 * settle) * stretch;
  const squashY = (1 - 0.3 * settle) * wideY;
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (let k = 0; k < 7; k++) {
    const t = Math.min(1, Math.max(0, (age - 0.028 * k) / 0.2));
    if (t <= 0) continue;
    const swell = 1 - (1 - t) * (1 - t) * (1 - t);
    let cx = (LOBES[3 * k] + (fxRand(seed, 3 * k) - 0.5) * 0.16) * wideX;
    let cy = LOBES[3 * k + 1] + (fxRand(seed, 3 * k + 1) - 0.5) * 0.12;
    let r =
      LOBES[3 * k + 2] *
      (0.85 + 0.3 * fxRand(seed, 3 * k + 2)) *
      (0.15 + 0.85 * swell) *
      grow;
    const f = 0.35 + 0.65 * swell;
    cx = cx * spread * f;
    cy = 0.22 * (1 - f) + cy * (0.5 + 0.5 * spread) * f;
    cy *= (1 - 0.45 * settle) * wideY;
    const lean = cy * 0.4 * age;
    cx += windX * lean;
    cy += windY * lean;
    const p1 = 6.2832 * fxRand(seed, 40 + k);
    const p2 = 6.2832 * fxRand(seed, 50 + k);
    cx += 0.03 * Math.sin(5 * age + p1);
    cy += 0.03 * Math.cos(3.7 * age + p2);
    r *= 1 + 0.04 * Math.sin(2.9 * age + p2);
    const ex = r * squashX;
    const ey = r * squashY;
    if (cx - ex < x0) x0 = cx - ex;
    if (cx + ex > x1) x1 = cx + ex;
    if (cy - ey < y0) y0 = cy - ey;
    if (cy + ey > y1) y1 = cy + ey;
  }
  if (!(x1 > x0)) {
    x0 = 0;
    x1 = 0;
    y0 = 0;
    y1 = 0;
  }
  // VERTEX's lean: the whole puff downwind and a little up as it ages.
  const leanX = windX * 0.55 * age;
  const leanY = windY * 0.55 * age + 0.1 * age;
  out[0] = x0 + leanX;
  out[1] = x1 + leanX;
  out[2] = y0 + leanY;
  out[3] = y1 + leanY;
}

/**
 * How far a box (CSS px) keeps clear of the lettering: the product, over
 * every outline, of 1 - weight × (1 - smooth(YIELD_PX, gap)), the gap the
 * distance between the box and the outline's own box (0 where they meet).
 */
function clearOfText(
  texts: readonly ScreenText[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
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
      // An outline lost behind the eye (a label's copy still fading out
      // where its last place had a corner there) keeps clear of nothing,
      // as the lanterns' (Lights.ts, lightClear): a NaN would drop the bank.
      if (!Number.isFinite(qx0 + qx1 + qy0 + qy1)) continue;
      const gx = Math.max(qx0 - x1, x0 - qx1, 0);
      const gy = Math.max(qy0 - y1, y0 - qy1, 0);
      const gap = Math.sqrt(gx * gx + gy * gy);
      if (gap >= YIELD_PX[1]) continue;
      clear *= 1 - w * (1 - smoothstep(YIELD_PX[0], YIELD_PX[1], gap));
      if (clear <= 0) return 0;
    }
  }
  return clear;
}
