import {
  AddEquation,
  BufferAttribute,
  CustomBlending,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  Mesh,
  OneFactor,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { GLSL_LINES } from "../shaders/common";
import {
  FOOT,
  type GlyphAtlas,
  type GlyphExtent,
  type GlyphType,
  inkExtent,
  LEVEL_PX,
} from "./atlas";
import { GLYPH_PX } from "./height";

export type { GlyphType };

/**
 * Ships on the chart: small upright side views of scene 1's ships, standing
 * on the sea, bows toward their heading, in the colours of their side, with
 * ink wakes behind those under way (docs/scene-02-brief.md, "concept").
 * Every ship is an instance of one quad, so all of them are one draw call,
 * and their wakes another.
 *
 * A glyph is a billboard standing on the sea at its foot: it stays upright
 * on screen at any pitch, so a fleet still reads from high above. It faces
 * the side its heading points to on screen and narrows as the heading turns
 * toward or away from the camera, the way a ship seen from ahead shows less
 * of her side; where it turns through end-on, the two facings crossfade.
 * Its drawing is the atlas's level nearest its size on screen, blended with
 * the next (atlas.ts), so the detail comes and goes smoothly. Glyphs are
 * sorted back to front each frame.
 *
 * Where each glyph stands, how tall and how much of it shows is decided on
 * the CPU each frame by the glyph layout (layout.ts), for every layer at
 * once: what a scene sets here is each ship's intent (her place, heading,
 * type and presence in the story), and the layout turns it into the drawn
 * glyph, so that no glyph ever touches land or another glyph.
 */

export type Side = "british" | "combined";

export interface ShipMark {
  /** Atlas type (GlyphType.id). */
  type: string;
  side: Side;
  lon: number;
  lat: number;
  /** Degrees from north, clockwise. */
  heading: number;
  /** Under way (with a wake) or at anchor. */
  underWay: boolean;
  /** Size against the type's own (default 1). */
  size?: number;
  /** Starting opacity (default 1). */
  opacity?: number;
}

export { GLYPH_PX };

const SIDES: Record<Side, number> = { british: 0, combined: 1 };

/** The glyph's facing on screen: its heading against the view's right (shared by the shaders). */
const GLSL_FACING = /* glsl */ `
float glyphFacing(float heading) {
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  return dot(vec2(sin(heading), cos(heading)), normalize(right.xy + 1e-6));
}
`;

const SHIP_VERTEX = /* glsl */ `
precision highp float;
// Foot (world km, on the sea), heading (rad), height (device px).
in vec4 iPos;
// Atlas cell, side, opacity, wake (0..1).
in vec4 iStyle;
// The cell it turns into and how far (0..1), its wake's length share, the
// least it narrows to end-on (0.3 for a ship; more for a squadron's symbol).
in vec4 iForm;
uniform float uPull;
uniform vec2 uViewport;
uniform float uAspect;
out vec2 vLocal;
out vec3 vCells;
out float vLevel;
out float vRight;
out float vSide;
out float vAlpha;
out float vDist;
#ifdef CLASH_ID
uniform int uClashBase;
flat out int vId;
#endif
${GLSL_FACING}
void main() {
#ifdef CLASH_ID
  vId = uClashBase + gl_InstanceID;
#endif
  vec3 foot = vec3(iPos.xy, 0.0);
  float h = iPos.w;
  // Pulled a little toward the eye along its own ray: the same place on
  // screen, a hair nearer in depth than the sea it stands on.
  vec3 w = foot + (cameraPosition - foot) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  // Bow toward the heading's side of the screen, narrower end-on.
  float facing = glyphFacing(iPos.z);
  float sx = mix(iForm.w, 1.0, abs(facing));
  vec2 offset = vec2(position.x * uAspect * sx, position.y) * h;
  clip.xy += offset / (0.5 * uViewport) * clip.w;
  gl_Position = clip;
  vLocal = vec2(position.x + 0.5, 1.0 - position.y);
  vCells = vec3(iStyle.x, iForm.x, iForm.y);
  // The ladder's levels are a factor of sqrt(2) apart from LEVEL_PX[0].
  vLevel = 2.0 * log2(max(h, 1.0) / ${LEVEL_PX[0].toFixed(1)});
  vRight = smoothstep(-0.14, 0.14, facing);
  vSide = iStyle.y;
  vAlpha = h > 0.01 ? iStyle.z : 0.0;
  vDist = length(foot - cameraPosition);
}
`;

/**
 * Development and tests (glyphs/clash.ts): instead of its colour, wherever
 * a glyph's ink shows (its drawn alpha at least uClashInk) it counts 1 in
 * R, and 1 in G where the land mask shows land or coastline there
 * (CLASH_COUNT, blended by adding); or it carries its id, the largest in R
 * and the smallest in G (CLASH_ID, blended by MAX). A wake's ink on land
 * counts in B.
 */
const GLSL_CLASH_DECLARE = /* glsl */ `
#if defined(CLASH_COUNT) || defined(CLASH_ID)
uniform float uClashInk;
#endif
#ifdef CLASH_COUNT
uniform sampler2D uClashLand;
#endif
#ifdef CLASH_ID
flat in int vId;
#endif
`;

const GLSL_CLASH_FRAGMENT = /* glsl */ `
#if defined(CLASH_COUNT) || defined(CLASH_ID)
  if (min(cover, 1.0) < uClashInk) discard;
#endif
#ifdef CLASH_COUNT
  float onLand = texelFetch(uClashLand, ivec2(gl_FragCoord.xy), 0).r >= uClashInk ? 1.0 : 0.0;
  fragColor = vec4(1.0, onLand, 0.0, 0.0) / 255.0;
#endif
#ifdef CLASH_ID
  fragColor = vec4(float(vId + 1), float(254 - vId), 0.0, 0.0) / 255.0;
#endif
`;

const SHIP_FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_CLASH_DECLARE}
uniform sampler2D uAtlas;
uniform vec2 uAtlasSize;
// Per level: (x, y, cell width, cell height) and (stride x, stride y, columns, -).
uniform vec4 uLevelA[${LEVEL_PX.length}];
uniform vec4 uLevelB[${LEVEL_PX.length}];
uniform vec3 uCanvas[2];
uniform vec3 uShade[2];
uniform vec3 uHull[2];
uniform vec3 uBand[2];
uniform float uHazeVisibility;
in vec2 vLocal;
in vec3 vCells;
in float vLevel;
in float vRight;
in float vSide;
in float vAlpha;
in float vDist;
out vec4 fragColor;

vec4 cellAt(int level, float cell, vec2 local, vec2 dx, vec2 dy) {
  vec4 a = uLevelA[level];
  vec4 b = uLevelB[level];
  vec2 rc = vec2(mod(cell, b.z), floor(cell / b.z));
  vec2 texel = a.xy + rc * b.xy + local * a.zw;
  vec2 k = a.zw / uAtlasSize;
  return textureGrad(uAtlas, texel / uAtlasSize, dx * k, dy * k);
}

// A type's coverage at the glyph's size, its two facings blended where it
// turns through end-on.
vec4 coverage(int la, int lb, float t, float cell, vec2 dx, vec2 dy) {
  vec2 mirrored = vec2(1.0 - vLocal.x, vLocal.y);
  vec4 c = mix(cellAt(la, cell, vLocal, dx, dy), cellAt(lb, cell, vLocal, dx, dy), t);
  if (vRight < 0.999) {
    vec4 m = mix(cellAt(la, cell, mirrored, dx, dy), cellAt(lb, cell, mirrored, dx, dy), t);
    c = mix(m, c, vRight);
  }
  return c;
}

void main() {
  // Derivatives outside any branch, for every sample.
  vec2 dx = dFdx(vLocal);
  vec2 dy = dFdy(vLocal);
  float s = clamp(vLevel, 0.0, ${(LEVEL_PX.length - 1).toFixed(1)});
  int la = int(floor(s));
  int lb = min(la + 1, ${LEVEL_PX.length - 1});
  float t = s - float(la);
  vec4 c = coverage(la, lb, t, vCells.x, dx, dy);
  // A ship changing type (weighing, a squadron changing) crossfades.
  if (vCells.z > 0.001) c = mix(c, coverage(la, lb, t, vCells.y, dx, dy), vCells.z);
  int side = vSide < 0.5 ? 0 : 1;
  float x = vDist / uHazeVisibility;
  float a = vAlpha * exp(-x * x);
  float sail = c.r;
  float lit = c.a / max(c.r, 1.0 / 255.0);
  vec3 canvas = mix(uShade[side], uCanvas[side], clamp(lit, 0.0, 1.0));
  float cover = (c.r + c.g + c.b) * a;
  if (cover < 0.003) discard;
  // Premultiplied: each part's colour by what shows of it.
  fragColor = vec4((canvas * sail + uHull[side] * c.g + uBand[side] * c.b) * a, min(cover, 1.0));
${GLSL_CLASH_FRAGMENT}
}
`;

const WAKE_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iForm;
uniform float uWakeLength;
uniform float uPull;
uniform float uPxPerRadian;
out vec2 vLocal;
out float vLen;
out float vAlpha;
out float vDist;
void main() {
  vec3 foot = vec3(iPos.xy, 0.0);
  float h = iPos.w;
  float dist = length(foot - cameraPosition);
  // The glyph's height in km at its distance; the wake is a few of those.
  // Ships astern of a squadron's lead sail in her wake: theirs are short
  // and faint (iForm.z), or they would run across the ships behind them.
  float share = iForm.z;
  float len = uWakeLength * h / uPxPerRadian * dist * share;
  vec2 ahead = vec2(sin(iPos.z), cos(iPos.z));
  vec2 abeam = vec2(ahead.y, -ahead.x);
  // position.x runs 0 (under the stern) to 1 (the wake's end), y across.
  vec2 p = foot.xy - ahead * len * (0.12 + position.x) + abeam * position.y * len * 0.8;
  vec3 w = vec3(p, 0.0);
  w += (cameraPosition - w) * uPull;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vLocal = vec2(position.x, position.y * 0.8) * len;
  vLen = len;
  vAlpha = h > 0.01 ? iStyle.z * iStyle.w * mix(0.6, 1.0, share) : 0.0;
  vDist = dist;
}
`;

const WAKE_FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_CLASH_DECLARE}
${GLSL_LINES}
uniform vec3 uInk;
uniform float uDpr;
uniform float uHazeVisibility;
in vec2 vLocal;
in float vLen;
in float vAlpha;
in float vDist;
out vec4 fragColor;

void main() {
  // 0 under the stern, 1 at the wake's end.
  float u = clamp(vLocal.x / max(vLen, 1e-9), 0.0, 1.0);
  // Km per pixel on the sea here.
  float km = max(length(fwidth(vLocal)) * 0.7071, 1e-9);
  // Two arms, 19.5 degrees either side of the track (Kelvin's angle),
  // fine ink lines thinning and fading astern.
  float d = min(abs(vLocal.y - vLocal.x * 0.354), abs(vLocal.y + vLocal.x * 0.354)) * 0.943 / km;
  float cov = lineCov(d, mix(1.25, 0.5, u) * uDpr);
  float fade = (1.0 - u) * smoothstep(0.0, 0.1, u);
  float x = vDist / uHazeVisibility;
  float a = cov * fade * vAlpha * exp(-x * x) * 0.5;
  if (a < 0.003) discard;
  fragColor = vec4(uInk, a);
#ifdef CLASH_COUNT
  if (a < uClashInk) discard;
  float onLand = texelFetch(uClashLand, ivec2(gl_FragCoord.xy), 0).r >= uClashInk ? 1.0 : 0.0;
  fragColor = vec4(0.0, 0.0, onLand, 0.0) / 255.0;
#endif
}
`;

/** One quad per glyph: x across (-0.5..0.5), y up from the cell's foot (0..1). */
function glyphQuad(): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]),
      3,
    ),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** Atlas levels as the ship shader reads them. */
function levelUniforms(atlas: GlyphAtlas) {
  return {
    a: atlas.levels.map((l) => new Vector4(l.x, l.y, l.cellW, l.cellH)),
    b: atlas.levels.map((l) => new Vector4(l.strideX, l.strideY, l.cols, l.px)),
  };
}

const ATTRIBUTES = ["iPos", "iStyle", "iForm"] as const;
type AttributeName = (typeof ATTRIBUTES)[number];

/**
 * A ship's intent, as a scene sets it: where she is and how she lies in
 * the story. Per mark, in mark order.
 */
export interface GlyphIntent {
  /** World position, km. */
  x: Float32Array;
  y: Float32Array;
  /** Heading, radians from north, clockwise. */
  heading: Float32Array;
  /** Size against the type's own. */
  size: Float32Array;
  /** Presence in the story, 0..1. */
  opacity: Float32Array;
  /** How far under way (her wake), 0..1. */
  wake: Float32Array;
  /** Atlas cells: her type, the type she is turning into, and how far. */
  cell: Float32Array;
  cell2: Float32Array;
  turn: Float32Array;
}

/** What the layout decided for each mark this frame (layout.ts). */
export interface GlyphDrawn {
  /** The foot on the sea, world km. */
  x: Float32Array;
  y: Float32Array;
  /** Heading drawn, radians (a squadron's ships along a track turn with it). */
  heading: Float32Array;
  /** Height on screen, device px, and the height it would have unhindered. */
  height: Float32Array;
  nominal: Float32Array;
  /** Opacity drawn, 0..1. */
  alpha: Float32Array;
  /** Wake length share (1 for a ship on her own or leading, less astern). */
  wakeShare: Float32Array;
  /** The least the glyph narrows to end-on (0.3 for a ship; more for a symbol). */
  narrow: Float32Array;
}

export class Glyphs implements ChartLayer {
  readonly ships: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly wakes: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly atlas: GlyphAtlas;
  readonly intent: GlyphIntent;
  readonly drawn: GlyphDrawn;
  /** Per mark, the side's index (0 british, 1 combined). */
  readonly side: Uint8Array;
  private readonly attrs: Record<AttributeName, InstancedBufferAttribute>;
  private readonly order: Int32Array;
  private readonly depth: Float32Array;
  private readonly count: number;
  private readonly canvas = [new Vector3(), new Vector3()];
  private readonly shade = [new Vector3(), new Vector3()];
  private readonly hull = [new Vector3(), new Vector3()];
  private readonly band = [new Vector3(), new Vector3()];
  private readonly view = {
    uViewport: { value: new Vector2(1, 1) },
    uAspect: { value: 1 },
    uPxPerRadian: { value: 1000 },
    uDpr: { value: 1 },
    uHazeVisibility: { value: 100 },
  };
  private clash: ClashMaterials | null = null;

  /** `atlas` from buildGlyphAtlas; several layers may share one. */
  constructor(atlas: GlyphAtlas, marks: readonly ShipMark[]) {
    this.atlas = atlas;
    const n = marks.length;
    this.count = n;
    const f32 = () => new Float32Array(n);
    this.intent = {
      x: f32(),
      y: f32(),
      heading: f32(),
      size: f32(),
      opacity: f32(),
      wake: f32(),
      cell: f32(),
      cell2: f32(),
      turn: f32(),
    };
    this.drawn = {
      x: f32(),
      y: f32(),
      heading: f32(),
      height: f32(),
      nominal: f32(),
      alpha: f32(),
      wakeShare: f32(),
      narrow: f32().fill(0.3),
    };
    this.side = new Uint8Array(n);
    this.order = new Int32Array(n);
    this.depth = new Float32Array(n);
    marks.forEach((m, i) => {
      const cell = this.cellOf(m.type);
      const it = this.intent;
      it.x[i] = worldX(m.lon);
      it.y[i] = worldY(m.lat);
      it.heading[i] = (m.heading * Math.PI) / 180;
      it.size[i] = m.size ?? 1;
      it.opacity[i] = m.opacity ?? 1;
      it.wake[i] = m.underWay ? 1 : 0;
      it.cell[i] = cell;
      it.cell2[i] = cell;
      it.turn[i] = 0;
      this.side[i] = SIDES[m.side];
      this.order[i] = i;
    });

    const ships = glyphQuad();
    this.attrs = {} as Record<AttributeName, InstancedBufferAttribute>;
    for (const name of ATTRIBUTES) {
      const a = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
      a.setUsage(DynamicDrawUsage);
      this.attrs[name] = a;
      ships.setAttribute(name, a);
    }
    ships.instanceCount = n;
    this.view.uAspect.value = atlas.aspect;
    const common = { ...this.view, uPull: { value: 0.003 } };
    const levels = levelUniforms(atlas);
    this.ships = new Mesh(
      ships,
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: SHIP_VERTEX,
        fragmentShader: SHIP_FRAGMENT,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        // Facing either way, the quad is the same; both windings show.
        side: DoubleSide,
        uniforms: {
          ...common,
          uAtlas: { value: atlas.texture },
          uAtlasSize: { value: new Vector2(atlas.width, atlas.height) },
          uLevelA: { value: levels.a },
          uLevelB: { value: levels.b },
          uCanvas: { value: this.canvas },
          uShade: { value: this.shade },
          uHull: { value: this.hull },
          uBand: { value: this.band },
        },
      }),
    );
    this.ships.name = "glyphs";
    this.ships.frustumCulled = false;
    this.ships.renderOrder = 25;

    const wakes = new InstancedBufferGeometry();
    wakes.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0]),
        3,
      ),
    );
    wakes.setIndex([0, 1, 2, 0, 2, 3]);
    for (const name of ATTRIBUTES) wakes.setAttribute(name, this.attrs[name]);
    wakes.instanceCount = n;
    this.wakes = new Mesh(
      wakes,
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: WAKE_VERTEX,
        fragmentShader: WAKE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          ...common,
          uWakeLength: { value: 1.5 },
          uInk: { value: new Vector3() },
        },
      }),
    );
    this.wakes.name = "wakes";
    this.wakes.frustumCulled = false;
    this.wakes.renderOrder = 22;
  }

  /** How many marks the layer holds. */
  get markCount(): number {
    return this.count;
  }

  /** Which mark each drawn instance is, back to front (this frame's sort). */
  get drawOrder(): Int32Array {
    return this.order;
  }

  /**
   * A mark's ink about its anchor at a height on screen (device px), in
   * cell heights (atlas.ts, inkExtent): the larger of its two types' while
   * it turns from one into the other.
   */
  extentOf(index: number, h: number, out: GlyphExtent): GlyphExtent {
    inkExtent(this.atlas, this.intent.cell[index], h, out);
    if (this.intent.cell2[index] !== this.intent.cell[index]) {
      const l = out.left;
      const r = out.right;
      const t = out.top;
      inkExtent(this.atlas, this.intent.cell2[index], h, out);
      out.left = Math.max(l, out.left);
      out.right = Math.max(r, out.right);
      out.top = Math.max(t, out.top);
    }
    return out;
  }

  /** A type's ink about its anchor at a height on screen, in cell heights. */
  typeExtent(type: string, h: number, out: GlyphExtent): GlyphExtent {
    return inkExtent(this.atlas, this.cellOf(type), h, out);
  }

  /** The waterline's height above the cell's foot, in cell heights. */
  get foot(): number {
    return FOOT;
  }

  /** Cell width over height. */
  get aspect(): number {
    return this.atlas.aspect;
  }

  /**
   * Development and tests (glyphs/clash.ts): the layer's ships and wakes
   * drawn as ink counts and ids instead of colour, on the same instances
   * and uniforms, so what is counted is exactly what is drawn. Compiled on
   * first use.
   */
  clashMaterials(): ClashMaterials {
    if (this.clash) return this.clash;
    const shared = {
      uClashLand: { value: null as Texture | null },
      uClashInk: { value: 0.1 },
      uClashBase: { value: 0 },
    };
    const make = (
      vertexShader: string,
      fragmentShader: string,
      uniforms: Record<string, { value: unknown }>,
      define: string,
      max: boolean,
    ) =>
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader,
        fragmentShader,
        defines: { [define]: "" },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        blending: CustomBlending,
        blendEquation: max ? MaxEquation : AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        blendEquationAlpha: max ? MaxEquation : AddEquation,
        blendSrcAlpha: OneFactor,
        blendDstAlpha: OneFactor,
        uniforms: { ...uniforms, ...shared },
      });
    const ship = this.ships.material.uniforms;
    const wake = this.wakes.material.uniforms;
    this.clash = {
      uniforms: shared,
      count: make(SHIP_VERTEX, SHIP_FRAGMENT, ship, "CLASH_COUNT", false),
      id: make(SHIP_VERTEX, SHIP_FRAGMENT, ship, "CLASH_ID", true),
      wakes: make(WAKE_VERTEX, WAKE_FRAGMENT, wake, "CLASH_COUNT", false),
    };
    return this.clash;
  }

  private cellOf(type: string): number {
    const cell = this.atlas.index.get(type);
    if (cell === undefined) throw new Error(`glyphs: no type "${type}"`);
    return cell;
  }

  /** Moves a mark (world km; heading in radians from north, clockwise). */
  place(index: number, x: number, y: number, heading: number): void {
    this.intent.x[index] = x;
    this.intent.y[index] = y;
    this.intent.heading[index] = heading;
  }

  /** A mark's presence in the story, 0..1. */
  setOpacity(index: number, opacity: number): void {
    this.intent.opacity[index] = opacity;
  }

  /**
   * A mark's ship type (GlyphType.id); with `next` and `t`, the glyph
   * crossfading from `type` into `next` (0..1), as when a ship weighs and
   * makes sail, or a squadron's ship is replaced.
   */
  setType(index: number, type: string, next?: string, t = 0): void {
    const cell = this.cellOf(type);
    this.intent.cell[index] = cell;
    this.intent.cell2[index] = next === undefined ? cell : this.cellOf(next);
    this.intent.turn[index] = next === undefined ? 0 : t;
  }

  /** How much of her wake shows (0 at anchor, 1 under way). */
  setUnderWay(index: number, underWay: boolean | number): void {
    this.intent.wake[index] = Number(underWay);
  }

  update(frame: FrameInfo): void {
    const eye = frame.eye;
    const v = this.view;
    v.uViewport.value.set(frame.width, frame.height);
    v.uPxPerRadian.value = frame.pxPerRadian;
    v.uDpr.value = frame.dpr;
    v.uHazeVisibility.value = frame.hazeVisibility;
    this.colours(frame);
    this.wakes.material.uniforms.uInk.value.copy(frame.light.inkPale);

    // Back to front: an insertion sort over last frame's order, which is
    // nearly sorted already.
    const n = this.count;
    const d = this.drawn;
    for (let i = 0; i < n; i++) {
      const dx = d.x[i] - eye.x;
      const dy = d.y[i] - eye.y;
      this.depth[i] = dx * dx + dy * dy;
    }
    const order = this.order;
    for (let i = 1; i < n; i++) {
      const k = order[i];
      const dk = this.depth[k];
      let j = i - 1;
      while (j >= 0 && this.depth[order[j]] < dk) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = k;
    }
    const it = this.intent;
    const pos = this.attrs.iPos.array as Float32Array;
    const style = this.attrs.iStyle.array as Float32Array;
    const form = this.attrs.iForm.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const k = order[i];
      const o = i * 4;
      pos[o] = d.x[k];
      pos[o + 1] = d.y[k];
      pos[o + 2] = d.heading[k];
      pos[o + 3] = d.height[k];
      style[o] = it.cell[k];
      style[o + 1] = this.side[k];
      style[o + 2] = d.alpha[k];
      style[o + 3] = it.wake[k];
      form[o] = it.cell2[k];
      form[o + 1] = it.turn[k];
      form[o + 2] = d.wakeShare[k];
      form[o + 3] = d.narrow[k];
    }
    for (const name of ATTRIBUTES) this.attrs[name].needsUpdate = true;
  }

  /** The sides' colours under the current light. */
  private colours(frame: FrameInfo): void {
    const light = frame.light;
    const night = light.night;
    // British: scene 1's pale canvas (its lit and shaded cloths), dark hulls
    // and Victory's ochre bands. The combined fleet: the slate-violet of
    // scene 1's enemy line, a shade lighter in canvas, its bands a lighter
    // slate.
    setHex(this.canvas[0], 0xebe2ce);
    setHex(this.shade[0], 0xd1c5a9);
    setHex(this.hull[0], 0x26231f);
    setHex(this.band[0], 0xc29a77);
    setHex(this.canvas[1], 0xa9a6b4);
    setHex(this.shade[1], 0x918e9e);
    setHex(this.hull[1], 0x34343f);
    setHex(this.band[1], 0x6d6b7b);
    const lit = 1 - 0.5 * night;
    // Two plain loops: spreading the arrays would allocate every frame.
    for (const c of this.canvas)
      c.lerp(light.sunColor, 0.18 * (1 - night)).multiplyScalar(lit);
    for (const c of this.shade)
      c.lerp(light.sunColor, 0.18 * (1 - night)).multiplyScalar(lit);
    for (const c of this.band) c.multiplyScalar(1 - 0.6 * night);
  }

  dispose(): void {
    this.ships.geometry.dispose();
    this.ships.material.dispose();
    this.wakes.geometry.dispose();
    this.wakes.material.dispose();
    if (this.clash) {
      this.clash.count.dispose();
      this.clash.id.dispose();
      this.clash.wakes.dispose();
    }
  }
}

/** A glyph layer's materials for the clash probe (Glyphs.clashMaterials). */
export interface ClashMaterials {
  uniforms: {
    /** The land mask to test ink against. */
    uClashLand: { value: Texture | null };
    /** The least drawn alpha that counts as ink. */
    uClashInk: { value: number };
    /** The id of the layer's first drawn instance. */
    uClashBase: { value: number };
  };
  /** Ships: ink counted in R, ink on land in G (added). */
  count: ShaderMaterial;
  /** Ships: the largest id in R, 254 less the smallest in G (MAX). */
  id: ShaderMaterial;
  /** Wakes: ink on land counted in B (added). */
  wakes: ShaderMaterial;
}

function setHex(out: Vector3, hex: number): void {
  out.set(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}
