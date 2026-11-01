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
import { monotoneCurve } from "@/lib/curve";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { GLSL_FIELD, GLSL_GEO, GLSL_LINES } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import { buildGlyphAtlas, type GlyphAtlas, type GlyphType } from "./atlas";

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
   * so in a strait seen from far off she draws small.
   */
  room?: number | "coast";
  /**
   * A ship of a group: her distance from the group's lead, map km. Once
   * that is narrower on screen than a glyph, she fades and the lead (a
   * mark with no spacing) stands for the group.
   */
  spacing?: number;
}

/**
 * A glyph cell's height on screen (CSS px) for the camera's altitude (km):
 * scene 1's ships on the horizon at the start, chart symbols above.
 */
export const GLYPH_PX: readonly (readonly [number, number])[] = [
  [0.05, 22],
  [9, 28],
  [120, 34],
  [1400, 21],
  [6000, 14],
];

const glyphPx = monotoneCurve(
  GLYPH_PX.map(([a, px]) => [Math.log(a), px] as const),
);

const SIDES: Record<Side, number> = { british: 0, combined: 1 };

/**
 * A glyph's height on screen, device px: nearer glyphs a little larger,
 * within the view's own range, and no taller than the water beyond it
 * (ShipMark.room) seen from here: the angle between the glyph's foot and
 * the chart that much farther on. How much of it shows: a glyph shrunk to
 * its room fades out before it is too small to read, and a ship of a group
 * gives way to the group's lead once her spacing (ShipMark.spacing) is
 * narrower on screen than the glyph.
 */
const GLSL_GLYPH_HEIGHT = /* glsl */ `
${GLSL_GEO}
${GLSL_FIELD}
uniform vec3 uTexelKm;
// A moving ship's room (a negative room): her distance from the nearest
// coast, where the chart's field is smooth over a couple of kilometres.
float coastRoom(vec2 p) {
  return max(sampleFieldLod(p, max(vec3(0.0), log2(2.0 / uTexelKm))).y, 0.0);
}
float glyphHeight(vec2 at, float dist, float size, float room) {
  float h = uSizePx * pow(clamp(uSizeRef / dist, 0.55, 1.8), 0.35) * size;
  if (room == 0.0) return h;
  if (room < 0.0) room = coastRoom(at);
  float z = max(cameraPosition.z, 1e-3);
  float d = length(at - cameraPosition.xy);
  float fit = (atan(z, d) - atan(z, d + room)) * uPxPerRadian;
  // From low over the sea the glyph stands against the sky, not the chart.
  return mix(h, min(h, fit), smoothstep(0.03, 0.08, z / dist));
}
float glyphShow(float dist, float h, float spacing) {
  float show = smoothstep(3.5, 6.5, h / uDpr);
  if (spacing > 0.0)
    show *= smoothstep(0.3, 0.5, spacing * uPxPerRadian / dist / (h * uAspect));
  return show;
}
`;

const SHIP_VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iStyle;
in vec2 iFit;
uniform vec2 uViewport;
uniform float uSizePx;
uniform float uSizeRef;
uniform float uPxPerRadian;
uniform float uDpr;
uniform float uAspect;
uniform vec2 uGrid;
uniform float uPull;
out vec2 vUv;
out float vSide;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
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
in vec2 iFit;
uniform float uSizePx;
uniform float uSizeRef;
uniform float uPxPerRadian;
uniform float uDpr;
uniform float uAspect;
uniform float uWakeLength;
uniform float uPull;
out vec2 vLocal;
out float vLen;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
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
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
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
  /** Per mark: its room and its spacing, map km (0 for none). */
  private readonly fit: Float32Array;
  private readonly iPos: InstancedBufferAttribute;
  private readonly iStyle: InstancedBufferAttribute;
  private readonly iFit: InstancedBufferAttribute;
  private readonly order: Int32Array;
  private readonly depth: Float32Array;
  private readonly count: number;
  private readonly canvas = [new Vector3(), new Vector3()];
  private readonly hull = [new Vector3(), new Vector3()];

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
    this.fit = new Float32Array(n * 2);
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
      const room = m.room === "coast" ? -1 : (m.room ?? 0);
      this.fit.set([room, m.spacing ?? 0], i * 2);
      this.order[i] = i;
    });

    const ships = glyphQuad();
    this.iPos = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.iStyle = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.iFit = new InstancedBufferAttribute(new Float32Array(n * 2), 2);
    this.iPos.setUsage(DynamicDrawUsage);
    this.iStyle.setUsage(DynamicDrawUsage);
    this.iFit.setUsage(DynamicDrawUsage);
    ships.setAttribute("iPos", this.iPos);
    ships.setAttribute("iStyle", this.iStyle);
    ships.setAttribute("iFit", this.iFit);
    ships.instanceCount = n;
    const common = {
      ...field.uniforms,
      uTexelKm: { value: field.texelKm },
      uViewport: { value: new Vector2(1, 1) },
      uSizePx: { value: 30 },
      uSizeRef: { value: 100 },
      uPxPerRadian: { value: 1000 },
      uPull: { value: 0.003 },
      uDpr: { value: 1 },
      uAspect: { value: this.atlas.aspect },
      uHazeVisibility: { value: 100 },
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

  update(frame: FrameInfo): void {
    const eye = frame.eye;
    const sizePx = glyphPx(Math.log(Math.max(eye.z, 0.01))) * frame.dpr;
    // The distance at which glyphs take their nominal size: about where
    // the camera's view of the chart is centred.
    const sizeRef = Math.hypot(
      frame.target.x - eye.x,
      frame.target.y - eye.y,
      eye.z,
    );
    for (const m of [this.ships.material, this.wakes.material]) {
      const u = m.uniforms;
      u.uViewport.value.set(frame.width, frame.height);
      u.uSizePx.value = sizePx;
      u.uSizeRef.value = sizeRef;
      u.uPxPerRadian.value = frame.pxPerRadian;
      u.uDpr.value = frame.dpr;
      u.uHazeVisibility.value = frame.hazeVisibility;
    }
    this.colours(frame);
    this.wakes.material.uniforms.uInk.value.copy(frame.light.inkPale);

    // Back to front: an insertion sort over last frame's order, which is
    // nearly sorted already.
    const n = this.count;
    const pos = this.pos;
    for (let i = 0; i < n; i++) {
      const dx = pos[i * 4] - eye.x;
      const dy = pos[i * 4 + 1] - eye.y;
      this.depth[i] = dx * dx + dy * dy;
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
      outFit[i * 2] = this.fit[order[i] * 2];
      outFit[i * 2 + 1] = this.fit[order[i] * 2 + 1];
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
