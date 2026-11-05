import {
  BufferAttribute,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { GLSL_LINES } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import { type GlyphAtlas, type GlyphType, LEVEL_PX } from "./atlas";
import {
  GLSL_GLYPH_HEIGHT,
  GLYPH_PX,
  glyphSizeUniforms,
  updateGlyphSize,
} from "./height";

export type { GlyphType };

/**
 * Ships on the chart: small upright side views of scene 1's ships, standing
 * on the sea at their positions, bows toward their heading, in the colours
 * of their side, with ink wakes behind those under way (docs/scene-02-
 * brief.md, "concept"). Every ship is an instance of one quad, so all of
 * them are one draw call, and their wakes another.
 *
 * A glyph is a billboard standing on the sea at its foot: it stays upright
 * on screen at any pitch, so a fleet still reads from high above, and its
 * depth is the sea's at its foot, so it never sinks into the water (the
 * terrain writes the sea's own depth wherever it draws water, and a ship
 * placed on screen in a squadron's formation stands on the sea under her
 * own place, not at her lead's depth). It faces the side its heading
 * points to on screen and narrows as the heading turns toward or away from
 * the camera, the way a ship seen from ahead shows less of her side; where
 * it turns through end-on, the two facings crossfade. Its size is a chart
 * convention, not true scale (`GLYPH_PX`); never so large that it stands on
 * the land beyond it (`ShipMark.room`). Seen from far off, a group gives
 * way to its lead (`ShipMark.spacing`). Its drawing is the atlas's level
 * nearest its size on screen, blended with the next (atlas.ts), so the
 * detail comes and goes smoothly. Glyphs are sorted back to front each
 * frame, so a crowded anchorage overlaps correctly.
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
  /**
   * The open water beyond the ship, map km: how much of the chart behind
   * her the glyph may cover on screen, toward the land the camera looks
   * at from beyond her. Seen from farther off or from lower down, that
   * water shrinks on screen, foreshortened, and the glyph with it, so it
   * never stands on the shore: a bay a few pixels deep can't hold a glyph
   * of the open sea's size. From low over the sea a ship stands against
   * the sky instead, and keeps her size. "coast" for a ship that moves:
   * her distance from the nearest coast, read from the chart where she is,
   * so in a strait seen from far off she draws small; `{ coast: km }` the
   * same, but never less than that many km (a squadron's block, a symbol
   * that must stay legible by an island).
   */
  room?: Room;
  /**
   * A ship of a group: her distance from the group's lead, map km. Once
   * that is narrower on screen than a glyph, she fades and the lead (a
   * mark with no spacing) stands for the group.
   */
  spacing?: number;
}

export { GLYPH_PX };

/** A glyph's room: map km, the coast distance, or it with a floor. */
export type Room = number | "coast" | { coast: number };

/** The room as the shaders read it: fixed km, how far the coast has taken over, the floor. */
function roomOf(room: Room | undefined): [number, number, number] {
  if (room === undefined) return [0, 0, 0];
  if (room === "coast") return [0, 1, 0];
  if (typeof room === "object") return [0, 1, room.coast];
  return [room, 0, 0];
}

const SIDES: Record<Side, number> = { british: 0, combined: 1 };

const SHIP_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iFit;
in vec4 iForm;
uniform float uPull;
out vec2 vLocal;
out vec3 vCells;
out float vLevel;
out float vRight;
out float vSide;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float lead = length(base - cameraPosition);
  float h = glyphHeight(iPos.xy, lead, iPos.w, iFit.xyz);
  vec3 foot = glyphFoot(base, iPos.z, lead, iForm.xy, h);
  float dist = length(foot - cameraPosition);
  vec3 w = foot + (cameraPosition - foot) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  // Bow toward the heading's side of the screen, narrower end-on.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  float facing = dot(vec2(sin(iPos.z), cos(iPos.z)), normalize(right.xy + 1e-6));
  float sx = mix(0.3, 1.0, abs(facing));
  vec2 offset = vec2(position.x * uAspect * sx, position.y) * h;
  clip.xy += offset / (0.5 * uViewport) * clip.w;
  gl_Position = clip;
  vLocal = vec2(position.x + 0.5, 1.0 - position.y);
  vCells = vec3(iStyle.x, iForm.z, iForm.w);
  // The ladder's levels are a factor of sqrt(2) apart from LEVEL_PX[0].
  vLevel = 2.0 * log2(max(h, 1.0) / ${LEVEL_PX[0].toFixed(1)});
  vRight = smoothstep(-0.14, 0.14, facing);
  vSide = iStyle.y;
  vAlpha = iStyle.z * glyphShow(lead, h, iFit.w, iFit.y);
  vDist = dist;
}
`;

const SHIP_FRAGMENT = /* glsl */ `
precision highp float;
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
}
`;

const WAKE_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iFit;
in vec4 iForm;
uniform float uWakeLength;
uniform float uPull;
out vec2 vLocal;
out float vLen;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float lead = length(base - cameraPosition);
  float h = glyphHeight(iPos.xy, lead, iPos.w, iFit.xyz);
  // On the sea under the ship's own foot, in a formation too.
  vec3 foot = glyphFoot(base, iPos.z, lead, iForm.xy, h);
  float dist = length(foot - cameraPosition);
  // The glyph's height in km at its distance; the wake is a few of those.
  // In a formation, the ships astern of her lead sail in her wake: theirs
  // are short and faint, or they would run across the ships behind them.
  float member = iForm.x != 0.0 || iForm.y != 0.0 ? 0.45 : 1.0;
  float len = uWakeLength * h / uPxPerRadian * dist * member;
  vec2 ahead = vec2(sin(iPos.z), cos(iPos.z));
  vec2 abeam = vec2(ahead.y, -ahead.x);
  // position.x runs 0 (under the stern) to 1 (the wake's end), y across.
  vec2 p = foot.xy - ahead * len * (0.12 + position.x) + abeam * position.y * len * 0.8;
  vec3 w = vec3(p, 0.0);
  w += (cameraPosition - w) * uPull;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  vLocal = vec2(position.x, position.y * 0.8) * len;
  vLen = len;
  vAlpha = iStyle.z * iStyle.w * glyphShow(lead, h, iFit.w, iFit.y) * mix(0.6, 1.0, member);
  vDist = dist;
}
`;

const WAKE_FRAGMENT = /* glsl */ `
precision highp float;
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
  float u = clamp(vLocal.x / vLen, 0.0, 1.0);
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

const ATTRIBUTES = ["iPos", "iStyle", "iFit", "iForm"] as const;
type AttributeName = (typeof ATTRIBUTES)[number];

export class Glyphs implements ChartLayer {
  readonly ships: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly wakes: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly atlas: GlyphAtlas;
  /**
   * Per mark, four floats for each attribute:
   * - iPos: world x, y, heading (rad), size;
   * - iStyle: atlas cell, side, opacity, wake (0..1, under way);
   * - iFit: room (fixed km), how far the coast's distance has taken over
   *   (0..1), the least room by a coast (km), spacing (km);
   * - iForm: place in a formation (steps along, rows up, in glyph heights),
   *   a second cell and how far the glyph has turned into it (0..1).
   */
  private readonly data: Record<AttributeName, Float32Array>;
  private readonly attrs: Record<AttributeName, InstancedBufferAttribute>;
  private readonly order: Int32Array;
  private readonly depth: Float32Array;
  private readonly count: number;
  private readonly canvas = [new Vector3(), new Vector3()];
  private readonly shade = [new Vector3(), new Vector3()];
  private readonly hull = [new Vector3(), new Vector3()];
  private readonly band = [new Vector3(), new Vector3()];
  private readonly size: ReturnType<typeof glyphSizeUniforms>;

  /** `atlas` from buildGlyphAtlas; several layers may share one. */
  constructor(
    field: TerrainField,
    atlas: GlyphAtlas,
    marks: readonly ShipMark[],
  ) {
    this.atlas = atlas;
    const n = marks.length;
    this.count = n;
    this.data = {
      iPos: new Float32Array(n * 4),
      iStyle: new Float32Array(n * 4),
      iFit: new Float32Array(n * 4),
      iForm: new Float32Array(n * 4),
    };
    this.order = new Int32Array(n);
    this.depth = new Float32Array(n);
    marks.forEach((m, i) => {
      const cell = this.cellOf(m.type);
      this.data.iPos.set(
        [
          worldX(m.lon),
          worldY(m.lat),
          (m.heading * Math.PI) / 180,
          m.size ?? 1,
        ],
        i * 4,
      );
      this.data.iStyle.set(
        [cell, SIDES[m.side], m.opacity ?? 1, m.underWay ? 1 : 0],
        i * 4,
      );
      this.data.iFit.set([...roomOf(m.room), m.spacing ?? 0], i * 4);
      this.data.iForm.set([0, 0, cell, 0], i * 4);
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
    // One set of size uniforms, shared by both materials.
    this.size = glyphSizeUniforms(field, atlas.aspect);
    const common = {
      ...field.uniforms,
      ...this.size,
      uPull: { value: 0.003 },
    };
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

  private cellOf(type: string): number {
    const cell = this.atlas.index.get(type);
    if (cell === undefined) throw new Error(`glyphs: no type "${type}"`);
    return cell;
  }

  /** Moves a mark (world km; heading in radians from north, clockwise). */
  place(index: number, x: number, y: number, heading: number): void {
    const p = this.data.iPos;
    const i = index * 4;
    p[i] = x;
    p[i + 1] = y;
    p[i + 2] = heading;
  }

  setOpacity(index: number, opacity: number): void {
    this.data.iStyle[index * 4 + 2] = opacity;
  }

  /**
   * A mark's ship type (GlyphType.id); with `next` and `t`, the glyph
   * crossfading from `type` into `next` (0..1), as when a ship weighs and
   * makes sail, or a squadron's ship is replaced.
   */
  setType(index: number, type: string, next?: string, t = 0): void {
    const cell = this.cellOf(type);
    this.data.iStyle[index * 4] = cell;
    this.data.iForm[index * 4 + 2] =
      next === undefined ? cell : this.cellOf(next);
    this.data.iForm[index * 4 + 3] = next === undefined ? 0 : t;
  }

  /** How much of her wake shows (0 at anchor, 1 under way). */
  setUnderWay(index: number, underWay: boolean | number): void {
    this.data.iStyle[index * 4 + 3] = Number(underWay);
  }

  /** A mark's room and spacing (ShipMark.room, ShipMark.spacing). */
  setFit(index: number, room: Room, spacing: number): void {
    this.data.iFit.set([...roomOf(room), spacing], index * 4);
  }

  /** A mark's spacing from the next ship toward her group's lead (ShipMark.spacing). */
  setSpacing(index: number, spacing: number): void {
    this.data.iFit[index * 4 + 3] = spacing;
  }

  /**
   * A room passing from a fixed one (map km) to the coast's distance (with
   * a floor): `t` how far it has gone, 0..1. A ship weighing from a bay
   * keeps her size as she moves out, instead of jumping.
   */
  setRoomBlend(index: number, fixedKm: number, t: number, floorKm = 0): void {
    const f = this.data.iFit;
    f[index * 4] = fixedKm;
    f[index * 4 + 1] = t;
    f[index * 4 + 2] = floorKm;
  }

  /**
   * A mark's place in a squadron's formation, on screen: `along` steps
   * along its heading as it runs on screen (negative astern) and `up` rows
   * up the screen, both in glyph heights, from the mark's own position,
   * which is the lead's. (0, 0) for a ship on her own.
   */
  setFormation(index: number, along: number, up: number): void {
    this.data.iForm[index * 4] = along;
    this.data.iForm[index * 4 + 1] = up;
  }

  update(frame: FrameInfo): void {
    const eye = frame.eye;
    updateGlyphSize(this.size, frame);
    this.colours(frame);
    this.wakes.material.uniforms.uInk.value.copy(frame.light.inkPale);

    // Back to front: an insertion sort over last frame's order, which is
    // nearly sorted already.
    const n = this.count;
    const pos = this.data.iPos;
    const form = this.data.iForm;
    for (let i = 0; i < n; i++) {
      const dx = pos[i * 4] - eye.x;
      const dy = pos[i * 4 + 1] - eye.y;
      // In a formation, rows higher on screen read as farther and draw first.
      this.depth[i] = (dx * dx + dy * dy) * (1 + 0.001 * form[i * 4 + 1]);
    }
    const order = this.order;
    for (let i = 1; i < n; i++) {
      const k = order[i];
      const d = this.depth[k];
      let j = i - 1;
      while (j >= 0 && this.depth[order[j]] < d) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = k;
    }
    for (const name of ATTRIBUTES) {
      const src = this.data[name];
      const out = this.attrs[name].array as Float32Array;
      for (let i = 0; i < n; i++) {
        const k = order[i] * 4;
        out[i * 4] = src[k];
        out[i * 4 + 1] = src[k + 1];
        out[i * 4 + 2] = src[k + 2];
        out[i * 4 + 3] = src[k + 3];
      }
      this.attrs[name].needsUpdate = true;
    }
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
    for (const c of [...this.canvas, ...this.shade]) {
      c.lerp(light.sunColor, 0.18 * (1 - night)).multiplyScalar(lit);
    }
    for (const c of this.band) c.multiplyScalar(1 - 0.6 * night);
  }

  dispose(): void {
    this.ships.geometry.dispose();
    this.ships.material.dispose();
    this.wakes.geometry.dispose();
    this.wakes.material.dispose();
  }
}

function setHex(out: Vector3, hex: number): void {
  out.set(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}
