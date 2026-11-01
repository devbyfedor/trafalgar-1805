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
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { GLSL_LINES } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import { buildGlyphAtlas, type GlyphAtlas, type GlyphType } from "./atlas";
import {
  GLSL_GLYPH_HEIGHT,
  GLYPH_PX,
  glyphSizeUniforms,
  updateGlyphSize,
} from "./height";

export type { GlyphType };

/**
 * Ships on the chart: small upright side views of scene 1's silhouettes,
 * standing on the sea at their positions, bows toward their heading, in
 * the colours of their side, with ink wakes behind those under way
 * (docs/scene-02-brief.md, "concept"). Every ship is an instance of one
 * quad, so all of them are one draw call, and their wakes another.
 *
 * A glyph is a billboard anchored at its waterline: it stays upright on
 * screen at any pitch, so a fleet still reads from high above. It faces
 * the side its heading points to on screen, and narrows as the heading
 * turns toward or away from the camera, the way a ship seen from ahead
 * shows less of her side. Its size is a chart convention, not true scale:
 * scene 1's size low over the sea, larger over the Gulf of Cádiz, smaller
 * again over the whole ocean (`GLYPH_PX`); never so large that it stands
 * on the land beyond it (`ShipMark.room`). Seen from far off, a group of
 * ships gives way to its lead, as a chart of a larger area shows a fleet
 * by one ship (`ShipMark.spacing`). Glyphs are sorted back to front each
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

/** The room as the shaders read it: negative for the coast, -1 - floor. */
function encodeRoom(room: Room | undefined): number {
  if (room === undefined) return 0;
  if (room === "coast") return -1;
  if (typeof room === "object") return -1 - room.coast;
  return room;
}

const SIDES: Record<Side, number> = { british: 0, combined: 1 };

/**
 * A ship's place in a squadron's formation, device px from her lead: `form`
 * is (steps along the heading as it runs on screen, rows up the screen) in
 * glyph heights, so a squadron keeps its shape and count at any zoom.
 */
const GLSL_FORMATION = /* glsl */ `
uniform vec2 uViewport;
vec2 formationPx(vec3 w, vec4 clip, float heading, float dist, vec2 form, float h) {
  if (form.x == 0.0 && form.y == 0.0) return vec2(0.0);
  vec2 ahead = vec2(sin(heading), cos(heading)) * dist * 0.01;
  vec4 c2 = projectionMatrix * viewMatrix * vec4(w + vec3(ahead, 0.0), 1.0);
  vec2 d = (c2.xy / c2.w - clip.xy / clip.w) * uViewport;
  vec2 dir = length(d) > 1e-4 ? normalize(d) : vec2(1.0, 0.0);
  return (dir * form.x * uAspect + vec2(0.0, form.y)) * h;
}
`;

const SHIP_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iFit;
uniform vec2 uGrid;
uniform float uPull;
out vec2 vUv;
out float vSide;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
${GLSL_FORMATION}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float dist = length(base - cameraPosition);
  vec3 w = base + (cameraPosition - base) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  float h = glyphHeight(iPos.xy, dist, iPos.w, iFit.x);
  // Bow toward the heading's side of the screen, narrower end-on.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  float facing = dot(vec2(sin(iPos.z), cos(iPos.z)), normalize(right.xy + 1e-6));
  float sx = (facing < 0.0 ? -1.0 : 1.0) * mix(0.4, 1.0, abs(facing));
  vec2 offset = vec2(position.x * uAspect * sx, position.y) * h;
  offset += formationPx(w, clip, iPos.z, dist, iFit.zw, h);
  clip.xy += offset / (0.5 * uViewport) * clip.w;
  gl_Position = clip;
  float cell = iStyle.x;
  vec2 origin = vec2(mod(cell, uGrid.x), floor(cell / uGrid.x));
  vUv = (origin + vec2(position.x + 0.5, 1.0 - position.y)) / uGrid;
  vSide = iStyle.y;
  vAlpha = iStyle.z * glyphShow(dist, h, iFit.y);
  vDist = dist;
}
`;

const SHIP_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uCanvas[2];
uniform vec3 uHull[2];
uniform float uHazeVisibility;
in vec2 vUv;
in float vSide;
in float vAlpha;
in float vDist;
out vec4 fragColor;

void main() {
  vec2 t = texture(uAtlas, vUv).rg;
  float sail = t.r * (1.0 - t.g);
  float dark = t.g;
  int s = vSide < 0.5 ? 0 : 1;
  float x = vDist / uHazeVisibility;
  float a = vAlpha * exp(-x * x);
  float cover = (sail + dark) * a;
  if (cover < 0.003) discard;
  // Premultiplied: canvas where only canvas shows, the dark parts over it.
  fragColor = vec4((uCanvas[s] * sail + uHull[s] * dark) * a, cover);
}
`;

const WAKE_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec4 iFit;
uniform float uWakeLength;
uniform float uPull;
out vec2 vLocal;
out float vLen;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
${GLSL_FORMATION}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float dist = length(base - cameraPosition);
  float h = glyphHeight(iPos.xy, dist, iPos.w, iFit.x);
  // The glyph's height in km at its distance; the wake is a few of those.
  float len = uWakeLength * h / uPxPerRadian * dist;
  vec2 ahead = vec2(sin(iPos.z), cos(iPos.z));
  vec2 abeam = vec2(ahead.y, -ahead.x);
  // position.x runs 0 (under the stern) to 1 (the wake's end), y across.
  vec2 p = iPos.xy - ahead * len * (0.12 + position.x) + abeam * position.y * len * 0.8;
  vec3 w = vec3(p, 0.0);
  w += (cameraPosition - w) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  // A squadron's wakes keep their ships' places in the formation.
  vec3 wb = base + (cameraPosition - base) * uPull;
  vec4 cb = projectionMatrix * viewMatrix * vec4(wb, 1.0);
  clip.xy += formationPx(wb, cb, iPos.z, dist, iFit.zw, h) / (0.5 * uViewport) * clip.w;
  gl_Position = clip;
  vLocal = vec2(position.x, position.y * 0.8) * len;
  vLen = len;
  vAlpha = iStyle.z * iStyle.w * glyphShow(dist, h, iFit.y);
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

/** One quad per glyph: x across (-0.5..0.5), y up from the waterline (0..1). */
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

export class Glyphs implements ChartLayer {
  readonly ships: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly wakes: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  readonly atlas: GlyphAtlas;
  /** Per mark: world x, y, heading (rad), size. */
  private readonly pos: Float32Array;
  /** Per mark: atlas cell, side, opacity, under way (0/1). */
  private readonly style: Float32Array;
  /**
   * Per mark: its room and its spacing, map km (0 for none), and its place
   * in a formation (steps along, rows up, in glyph heights).
   */
  private readonly fit: Float32Array;
  private readonly iPos: InstancedBufferAttribute;
  private readonly iStyle: InstancedBufferAttribute;
  private readonly iFit: InstancedBufferAttribute;
  private readonly order: Int32Array;
  private readonly depth: Float32Array;
  private readonly count: number;
  private readonly canvas = [new Vector3(), new Vector3()];
  private readonly hull = [new Vector3(), new Vector3()];
  private readonly size: ReturnType<typeof glyphSizeUniforms>;

  constructor(
    field: TerrainField,
    types: readonly GlyphType[],
    marks: readonly ShipMark[],
  ) {
    this.atlas = buildGlyphAtlas(types);
    const n = marks.length;
    this.count = n;
    this.pos = new Float32Array(n * 4);
    this.style = new Float32Array(n * 4);
    this.fit = new Float32Array(n * 4);
    this.order = new Int32Array(n);
    this.depth = new Float32Array(n);
    marks.forEach((m, i) => {
      const cell = this.atlas.index.get(m.type);
      if (cell === undefined) throw new Error(`glyphs: no type "${m.type}"`);
      this.pos.set(
        [
          worldX(m.lon),
          worldY(m.lat),
          (m.heading * Math.PI) / 180,
          m.size ?? 1,
        ],
        i * 4,
      );
      this.style.set(
        [cell, SIDES[m.side], m.opacity ?? 1, m.underWay ? 1 : 0],
        i * 4,
      );
      this.fit.set([encodeRoom(m.room), m.spacing ?? 0, 0, 0], i * 4);
      this.order[i] = i;
    });

    const ships = glyphQuad();
    this.iPos = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.iStyle = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.iFit = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.iPos.setUsage(DynamicDrawUsage);
    this.iStyle.setUsage(DynamicDrawUsage);
    this.iFit.setUsage(DynamicDrawUsage);
    ships.setAttribute("iPos", this.iPos);
    ships.setAttribute("iStyle", this.iStyle);
    ships.setAttribute("iFit", this.iFit);
    ships.instanceCount = n;
    // One set of size uniforms, shared by both materials.
    this.size = glyphSizeUniforms(field, this.atlas.aspect);
    const common = {
      ...field.uniforms,
      ...this.size,
      uPull: { value: 0.003 },
    };
    this.ships = new Mesh(
      ships,
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: SHIP_VERTEX,
        fragmentShader: SHIP_FRAGMENT,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        // A glyph facing left is the quad mirrored: both windings show.
        side: DoubleSide,
        uniforms: {
          ...common,
          uAtlas: { value: this.atlas.texture },
          uGrid: { value: new Vector2(this.atlas.cols, this.atlas.rows) },
          uCanvas: { value: this.canvas },
          uHull: { value: this.hull },
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
    wakes.setAttribute("iPos", this.iPos);
    wakes.setAttribute("iStyle", this.iStyle);
    wakes.setAttribute("iFit", this.iFit);
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

  /** Moves a mark (world km; heading in radians from north, clockwise). */
  place(index: number, x: number, y: number, heading: number): void {
    const i = index * 4;
    this.pos[i] = x;
    this.pos[i + 1] = y;
    this.pos[i + 2] = heading;
  }

  setOpacity(index: number, opacity: number): void {
    this.style[index * 4 + 2] = opacity;
  }

  /** Changes a mark's ship type (GlyphType.id), as when a ship weighs. */
  setType(index: number, type: string): void {
    const cell = this.atlas.index.get(type);
    if (cell === undefined) throw new Error(`glyphs: no type "${type}"`);
    this.style[index * 4] = cell;
  }

  /** Under way (with a wake) or at anchor. */
  setUnderWay(index: number, underWay: boolean): void {
    this.style[index * 4 + 3] = underWay ? 1 : 0;
  }

  /** A mark's room and spacing (ShipMark.room, ShipMark.spacing). */
  setFit(index: number, room: Room, spacing: number): void {
    this.fit[index * 4] = encodeRoom(room);
    this.fit[index * 4 + 1] = spacing;
  }

  /**
   * A mark's place in a squadron's formation, on screen: `along` steps
   * along its heading as it runs on screen (negative astern) and `up` rows
   * up the screen, both in glyph heights, from the mark's own position,
   * which is the lead's. (0, 0) for a ship on her own.
   */
  setFormation(index: number, along: number, up: number): void {
    this.fit[index * 4 + 2] = along;
    this.fit[index * 4 + 3] = up;
  }

  update(frame: FrameInfo): void {
    const eye = frame.eye;
    updateGlyphSize(this.size, frame);
    this.colours(frame);
    this.wakes.material.uniforms.uInk.value.copy(frame.light.inkPale);

    // Back to front: an insertion sort over last frame's order, which is
    // nearly sorted already.
    const n = this.count;
    const pos = this.pos;
    const fit = this.fit;
    for (let i = 0; i < n; i++) {
      const dx = pos[i * 4] - eye.x;
      const dy = pos[i * 4 + 1] - eye.y;
      // In a formation, rows higher on screen read as farther and draw first.
      this.depth[i] = (dx * dx + dy * dy) * (1 + 0.001 * fit[i * 4 + 3]);
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
    const outPos = this.iPos.array as Float32Array;
    const outStyle = this.iStyle.array as Float32Array;
    const outFit = this.iFit.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const k = order[i] * 4;
      for (let c = 0; c < 4; c++) {
        outPos[i * 4 + c] = pos[k + c];
        outStyle[i * 4 + c] = this.style[k + c];
      }
      for (let c = 0; c < 4; c++) outFit[i * 4 + c] = fit[order[i] * 4 + c];
    }
    this.iPos.needsUpdate = true;
    this.iStyle.needsUpdate = true;
    this.iFit.needsUpdate = true;
  }

  /** The sides' colours under the current light. */
  private colours(frame: FrameInfo): void {
    const light = frame.light;
    const night = light.night;
    // British: scene 1's pale canvas and dark hulls. The combined fleet:
    // the slate-violet of scene 1's enemy line, a shade lighter in canvas.
    setHex(this.canvas[0], 0xebe2ce);
    setHex(this.hull[0], 0x26231f);
    setHex(this.canvas[1], 0xa9a6b4);
    setHex(this.hull[1], 0x34343f);
    for (const c of this.canvas) {
      c.lerp(light.sunColor, 0.18 * (1 - night)).multiplyScalar(
        1 - 0.5 * night,
      );
    }
  }

  dispose(): void {
    this.ships.geometry.dispose();
    this.ships.material.dispose();
    this.wakes.geometry.dispose();
    this.wakes.material.dispose();
    this.atlas.texture.dispose();
  }
}

function setHex(out: Vector3, hex: number): void {
  out.set(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}
