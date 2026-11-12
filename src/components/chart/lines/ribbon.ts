import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  FloatType,
  GLSL3,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { FrameInfo } from "../engine/Chart";
import {
  GLSL_FIELD,
  GLSL_GEO,
  GLSL_LINES,
  GLSL_SURFACE,
} from "../shaders/common";
import type { TerrainField } from "../terrain/field";

/**
 * Ink lines on the chart: rivers, routes, the army's march. Each polyline
 * is a triangle strip widened in screen space in the vertex shader (miter
 * joins, a pixel of room for the anti-aliased edge), so a line keeps its
 * pen width at every zoom. Lines on land read the terrain field where the
 * surface does and sit on the exaggerated relief; every line is pulled a
 * little toward the camera along its view ray, which leaves it in place on
 * screen and in front of the surface it lies on. A line can draw itself up
 * to a head (km along it), and fades with the chart's haze.
 *
 * Two materials draw them: `RibbonMaterial`, a plain ink line (rivers, the
 * Stage A route), and `PatternMaterial`, the period track charts' lines
 * (dotted, dash-dot, dashed, under a thin hand wash), several lines of
 * different styles in one draw call.
 */

export interface Polyline {
  /** Interleaved world x, y, km. */
  points: ArrayLike<number>;
  /** Pen width, CSS pixels. */
  width: number;
  /** A pen width per point instead, CSS pixels (a tapering line). */
  widths?: ArrayLike<number>;
  /**
   * A value per line the material can thin out by (rivers: their rank); a
   * PatternMaterial's line index.
   */
  tag?: number;
  /**
   * A piece of a longer line: the points just beyond its ends (world x, y),
   * so the joins there are mitred as if the line ran on, and its distance
   * along the whole line at its first point (km).
   */
  before?: readonly [number, number];
  after?: readonly [number, number];
  along?: number;
  /** Four values the whole piece carries to a PatternMaterial (its day circles). */
  piece?: readonly [number, number, number, number];
}

/** A piece with no day circles at its ends. */
const NO_PIECE = [-1e9, 1e9, -1, -1] as const;

/** Builds one geometry holding every polyline's strip. */
export function ribbonGeometry(lines: readonly Polyline[]): BufferGeometry {
  let points = 0;
  let segments = 0;
  let pieces = false;
  for (const line of lines) {
    const n = line.points.length / 2;
    if (n < 2) continue;
    points += n;
    segments += n - 1;
    pieces ||= line.piece !== undefined;
  }
  const position = new Float32Array(points * 2 * 3);
  const prev = new Float32Array(points * 2 * 2);
  const next = new Float32Array(points * 2 * 2);
  const along = new Float32Array(points * 2);
  const width = new Float32Array(points * 2);
  const tag = new Float32Array(points * 2);
  const piece = pieces ? new Float32Array(points * 2 * 4) : null;
  const wide = points * 2 > 65535;
  const index = wide
    ? new Uint32Array(segments * 6)
    : new Uint16Array(segments * 6);
  // Element by element, with no array made per vertex: with them, the
  // rivers' 400 lines took a 55 to 74 ms task as the chart loaded.
  let v = 0;
  let k = 0;
  for (const line of lines) {
    const xy = line.points;
    const n = xy.length / 2;
    if (n < 2) continue;
    const t = line.tag ?? 0;
    const pc = line.piece ?? NO_PIECE;
    let distance = line.along ?? 0;
    for (let i = 0; i < n; i++) {
      const x = xy[i * 2];
      const y = xy[i * 2 + 1];
      if (i > 0) distance += Math.hypot(x - xy[i * 2 - 2], y - xy[i * 2 - 1]);
      const p = Math.max(0, i - 1);
      const q = Math.min(n - 1, i + 1);
      const w = line.widths ? line.widths[i] : line.width;
      // A piece of a longer line mitres its ends against the points beyond.
      const before = i === 0 ? line.before : undefined;
      const after = i === n - 1 ? line.after : undefined;
      const px = before ? before[0] : xy[p * 2];
      const py = before ? before[1] : xy[p * 2 + 1];
      const qx = after ? after[0] : xy[q * 2];
      const qy = after ? after[1] : xy[q * 2 + 1];
      for (let side = -1; side <= 1; side += 2) {
        position[v * 3] = x;
        position[v * 3 + 1] = y;
        position[v * 3 + 2] = side;
        prev[v * 2] = px;
        prev[v * 2 + 1] = py;
        next[v * 2] = qx;
        next[v * 2 + 1] = qy;
        along[v] = distance;
        width[v] = w;
        tag[v] = t;
        if (piece) {
          piece[v * 4] = pc[0];
          piece[v * 4 + 1] = pc[1];
          piece[v * 4 + 2] = pc[2];
          piece[v * 4 + 3] = pc[3];
        }
        v++;
      }
      if (i < n - 1) {
        const a = v - 2;
        index[k] = a;
        index[k + 1] = a + 2;
        index[k + 2] = a + 1;
        index[k + 3] = a + 1;
        index[k + 4] = a + 2;
        index[k + 5] = a + 3;
        k += 6;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("prev", new Float32BufferAttribute(prev, 2));
  geometry.setAttribute("next", new Float32BufferAttribute(next, 2));
  geometry.setAttribute("along", new Float32BufferAttribute(along, 1));
  geometry.setAttribute("width", new Float32BufferAttribute(width, 1));
  geometry.setAttribute("tag", new Float32BufferAttribute(tag, 1));
  if (piece)
    geometry.setAttribute("piece", new Float32BufferAttribute(piece, 4));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

const VERTEX = /* glsl */ `
precision highp float;
${GLSL_GEO}
${GLSL_FIELD}
in vec2 prev;
in vec2 next;
in float along;
in float width;
in float tag;
uniform float uExag;
uniform vec3 uTexelKm;
uniform vec2 uViewport;
uniform float uLodK;
uniform float uPull;
uniform float uLift;
uniform float uDpr;
uniform float uTagLimit;
out float vAcross;
out float vAlong;
out float vWidth;
out float vDist;
out float vFade;
${GLSL_SURFACE}
#ifdef PATTERNED
in vec4 piece;
// Per line, by its tag: the pattern (kind, pen width, period, dash; CSS
// px), the ink and the wash (colour, opacity), and its state (the head,
// km; its opacity; the wash's narrowest and widest, CSS px).
uniform vec4 uLineStyle[LINES];
uniform vec4 uLineInk[LINES];
uniform vec4 uLineWash[LINES];
uniform vec4 uLineState[LINES];
// Its arrowhead at the drawing head: opacity, length and half width (CSS
// px), and how deep its back is hollowed (a share of its length).
uniform vec4 uLineHead[LINES];
flat out vec4 vPiece;
flat out vec4 vStyle;
flat out vec4 vInk;
flat out vec4 vWash;
flat out vec4 vState;
flat out vec4 vHead;
#endif

// A point on the relief, read where the terrain mesh reads it (its cells
// are about cellKm wide here), or on the sea surface.
vec3 lift(vec2 p, float cellKm) {
  if (uLift < 0.5) return vec3(p, 0.0);
  vec4 f = sampleFieldLod(p, max(vec3(0.0), log2(cellKm / uTexelKm)));
  return vec3(p, surfaceZ(p, cellKm, f));
}

vec2 screen(vec4 clip) {
  return clip.xy / clip.w * 0.5 * uViewport;
}

void main() {
  vec2 p = position.xy;
  float side = position.z;
  float cellKm = max(length(vec3(p - cameraPosition.xy, cameraPosition.z)) / uLodK, 1e-3);
  vec3 w = lift(p, cellKm);
  w += (cameraPosition - w) * uPull;
  mat4 viewProj = projectionMatrix * viewMatrix;
  vec4 c = viewProj * vec4(w, 1.0);
  vec4 cp = viewProj * vec4(lift(prev, cellKm), 1.0);
  vec4 cn = viewProj * vec4(lift(next, cellKm), 1.0);

  // Directions of the segments on either side, on screen; a neighbour
  // behind the camera gives none.
  vec2 s = screen(c);
  vec2 d1 = cp.w > 0.0 ? s - screen(cp) : vec2(0.0);
  vec2 d2 = cn.w > 0.0 ? screen(cn) - s : vec2(0.0);
  float l1 = length(d1);
  float l2 = length(d2);
  d1 = l1 > 1e-4 ? d1 / l1 : d2 / max(l2, 1e-4);
  d2 = l2 > 1e-4 ? d2 / l2 : d1;
  vec2 tangent = d1 + d2;
  tangent = length(tangent) > 1e-4 ? normalize(tangent) : d1;
  vec2 normal = vec2(-tangent.y, tangent.x);
  // A miter keeps the width through a bend, limited at sharp turns.
  float miter = 1.0 / max(abs(dot(normal, vec2(-d1.y, d1.x))), 0.5);

  float px = width * uDpr;
  float halfWidth = 0.5 * max(px, 1.0) + 1.0;
  c.xy += normal * side * halfWidth * miter / (0.5 * uViewport) * c.w;
  gl_Position = c;
  vAcross = side * halfWidth;
  vAlong = along;
  vWidth = px;
  vDist = length(w - cameraPosition);
  vFade = 1.0 - smoothstep(uTagLimit - 0.5, uTagLimit + 0.5, tag);
#ifdef PATTERNED
  int line = int(tag + 0.5);
  vPiece = piece;
  vStyle = uLineStyle[line] * vec4(1.0, uDpr, uDpr, uDpr);
  vInk = uLineInk[line];
  vWash = uLineWash[line];
  vState = uLineState[line] * vec4(1.0, 1.0, uDpr, uDpr);
  vHead = uLineHead[line] * vec4(1.0, uDpr, uDpr, 1.0);
#endif
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
in float vAcross;
in float vAlong;
in float vWidth;
in float vDist;
in float vFade;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHead;
uniform float uHazeVisibility;
out vec4 fragColor;

void main() {
  if (vAlong > uHead) discard;
  // Lines thinner than a pixel keep a pixel's footprint and lose ink.
  float w = max(vWidth, 1.0);
  float cover = min(vWidth, 1.0) * clamp(0.5 * w + 0.5 - abs(vAcross), 0.0, 1.0);
  float x = vDist / uHazeVisibility;
  float alpha = cover * uOpacity * vFade * exp(-x * x);
  if (alpha < 0.002) discard;
  fragColor = vec4(uColor, alpha);
}
`;

/**
 * The period track chart's lines (docs/research/scene-02/a-t4.md, directive
 * 10): an ink line, plain, dotted, dash-dot or dashed, under a thin wash of
 * colour laid along it by hand.
 *
 * Dots and dashes keep their place on the chart and their size on screen,
 * as the waterlines do: their period is a world distance along the line,
 * the octave of a metre nearest below the period on screen at the line's
 * scale, nested with its double. As the camera pulls back the finer set
 * gives way, its dots fading and its dashes between the coarser ones
 * shrinking into the coarser set's dots, so nothing swims or pops; the
 * full-strength pattern stays between one and two periods on screen.
 *
 * The wash is a colourist's line: a little wider and narrower along its
 * length, a little stronger and weaker, and never quite on the engraved
 * line. Its unevenness is fixed to the chart and drawn from nested octaves
 * like the dots, so it keeps its character on screen at every zoom. The ink
 * lies under it, as the engraver's line lay under the colourist's.
 *
 * At a day circle the line stops under the ring, as the period's open
 * circles stood on the track; each circle's radius on the chart and its
 * opacity come from a data texture the layer writes each frame.
 */
const PATTERN_FRAGMENT = /* glsl */ `
precision highp float;
${GLSL_LINES}
in float vAcross;
in float vAlong;
in float vWidth;
in float vDist;
in float vFade;
flat in vec4 vPiece;
flat in vec4 vStyle;
flat in vec4 vInk;
flat in vec4 vWash;
flat in vec4 vState;
flat in vec4 vHead;
uniform float uDpr;
uniform float uHazeVisibility;
uniform sampler2D uCircles;
out vec4 fragColor;

// A value for a place on the line, 0..1, hashed from its distance along it
// in metres, so a place keeps its value in every octave it appears in.
float hand(float km) {
  uint n = uint(km * 1000.0 + 0.5);
  n = (n ^ 61u) ^ (n >> 16u);
  n *= 9u;
  n ^= n >> 4u;
  n *= 0x27d4eb2du;
  n ^= n >> 15u;
  return float(n & 0xffffu) / 65535.0;
}

// Smooth value noise along the line, its lattice every c km.
float noise1(float km, float c) {
  float t = km / c;
  float i = floor(t);
  float f = t - i;
  return mix(hand(i * c), hand((i + 1.0) * c), f * f * (3.0 - 2.0 * f));
}

// The octave of a metre nearest below a length on screen (device px) at
// this scale: its lattice spacing (km) and how far it is toward its double.
vec2 octave(float px, float kmPx) {
  float z = max(log2(px * kmPx / 0.001), 0.0);
  float zf = floor(z);
  return vec2(0.001 * exp2(zf), z - zf);
}

// Noise fixed to the chart whose wavelength on screen stays near px: two
// nested octaves, the finer fading out as the camera pulls back.
float washNoise(float km, float kmPx, float px) {
  vec2 o = octave(px, kmPx);
  return mix(noise1(km, o.x), noise1(km, 2.0 * o.x), o.y);
}

// A dash from -halfLength to halfLength along the line, its ends round, with
// radius r (device px), at a point a along and x across (device px).
float dash(float a, float x, float halfLength, float r) {
  float d = length(vec2(max(abs(a) - halfLength, 0.0), x));
  return clamp(r - d + 0.5, 0.0, 1.0);
}

// From here to the nearest mark of a set (one every s km, shifted by a
// share of s), device px along the line.
float toMark(float s, float shift, float kmPx) {
  float mark = (floor(vAlong / s - shift + 0.5) + shift) * s;
  return (vAlong - mark) / kmPx;
}

// The ink's cover: the pattern of the line's kind, nested in two octaves.
float ink(float x, float kmPx) {
  int kind = int(vStyle.x + 0.5);
  float r = 0.5 * vStyle.y;
  if (kind == 0) return lineCov(abs(x), vStyle.y);
  vec2 o = octave(vStyle.z, kmPx);
  float s = o.x;
  float fade = 1.0 - o.y;
  float halfLength = 0.5 * vStyle.w;
  if (kind == 1) {
    // Dotted: the finer set's dots between the coarser ones fade.
    return max(
      dash(toMark(2.0 * s, 0.0, kmPx), x, 0.0, r),
      dash(toMark(s, 0.0, kmPx), x, 0.0, r) * fade
    );
  }
  if (kind == 3) {
    // Dashed: the finer set's dashes between the coarser ones shrink away.
    return max(
      dash(toMark(2.0 * s, 0.0, kmPx), x, halfLength, r),
      dash(toMark(s, 0.0, kmPx), x, halfLength * fade, r) * fade
    );
  }
  // Dash-dot: a dash, and a dot half a period on. The finer set's dashes
  // between the coarser ones shrink into the coarser set's dots, and its
  // own dots fade.
  float coarse = max(
    dash(toMark(2.0 * s, 0.0, kmPx), x, halfLength, r),
    dash(toMark(2.0 * s, 0.5, kmPx), x, 0.0, r)
  );
  float fine = max(
    dash(toMark(s, 0.0, kmPx), x, halfLength * fade, r),
    dash(toMark(s, 0.5, kmPx), x, 0.0, r) * fade
  );
  return max(coarse, fine);
}

// 0 inside a day circle's ring, where the line stops; d is the distance
// from the circle along the line, km.
float circleGap(float d, float index, float kmPx) {
  if (index < 0.0) return 1.0;
  vec4 c = texelFetch(uCircles, ivec2(int(index + 0.5), 0), 0);
  float outside = clamp((d - c.r) / kmPx + 0.5, 0.0, 1.0);
  return mix(1.0, outside, c.g);
}

// A moving head's arrowhead (vHead): a slim point whose tip is the head,
// its back hollowed a little, as a draughtsman pointed a track; behind is
// the distance back from the tip and x across the line, device px.
float arrowhead(float behind, float x) {
  float l = vHead.y;
  float w = vHead.z;
  float ax = abs(x);
  // Inside both flanks, from the tip to the barbs at (l, ±w).
  float flank = (w * behind - l * ax) / sqrt(l * l + w * w);
  // In front of the back, hollowed from the barbs in to l·(1 − depth).
  float back = l * (1.0 - vHead.w * (1.0 - min(ax / w, 1.0))) - behind;
  return clamp(min(flank, back) + 0.5, 0.0, 1.0) * clamp(behind + 0.5, 0.0, 1.0);
}

void main() {
  // Km per device pixel along the line here.
  float kmPx = max(length(vec2(dFdx(vAlong), dFdy(vAlong))), 1e-9);
  float head = vState.x;
  if (vAlong > head + kmPx) discard;
  float x = vAcross;
  float arrow = 0.0;
  if (vHead.x > 0.0) {
    float behind = (head - vAlong) / kmPx;
    if (behind < vHead.y + 1.0) arrow = arrowhead(behind, x) * vHead.x;
  }
  float inked = ink(x, kmPx) * vInk.a;

  // The wash, 60 to 200 px between its swells on screen.
  float n1 = washNoise(vAlong, kmPx, 140.0 * uDpr);
  float n2 = washNoise(vAlong + 1234.5, kmPx, 200.0 * uDpr);
  float n3 = washNoise(vAlong + 2345.6, kmPx, 60.0 * uDpr);
  float washWidth = mix(vState.z, vState.w, n1);
  float off = (n2 - 0.5) * 0.6 * uDpr;
  float washed = clamp(0.5 * washWidth - abs(x - off) + 0.5, 0.0, 1.0);
  washed *= vWash.a * (0.8 + 0.4 * n3);

  // The line's opacity and the haze; the arrow is not cut by the circles.
  float h = vDist / uHazeVisibility;
  float seen = vState.y * vFade * exp(-h * h);
  float k = clamp((head - vAlong) / kmPx + 0.5, 0.0, 1.0);
  k *= circleGap(vAlong - vPiece.x, vPiece.z, kmPx);
  k *= circleGap(vPiece.y - vAlong, vPiece.w, kmPx);
  k *= seen;
  arrow *= seen;
  // Premultiplied: the ink under the wash, the arrowhead over both.
  vec3 color = vInk.rgb * inked * (1.0 - washed) + vWash.rgb * washed;
  float alpha = 1.0 - (1.0 - inked) * (1.0 - washed);
  color = vInk.rgb * arrow + color * k * (1.0 - arrow);
  alpha = arrow + alpha * k * (1.0 - arrow);
  if (alpha < 0.002) discard;
  fragColor = vec4(color, alpha);
}
`;

export interface RibbonOptions {
  /** Lines lie on the relief (true) or on the sea surface. */
  lift: boolean;
  opacity: number;
  /** Fraction of the distance a line is pulled toward the camera. */
  pull?: number;
}

/** A material for ribbons; `update` feeds it the frame. */
export class RibbonMaterial extends ShaderMaterial {
  constructor(field: TerrainField, options: RibbonOptions) {
    super({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        uExag: { value: 1 },
        uViewport: { value: new Vector2(1, 1) },
        uLodK: { value: 100 },
        uPull: { value: options.pull ?? 0.004 },
        uLift: { value: options.lift ? 1 : 0 },
        uDpr: { value: 1 },
        uTagLimit: { value: 1e6 },
        uColor: { value: new Vector3() },
        uOpacity: { value: options.opacity },
        uHead: { value: 1e9 },
        uHazeVisibility: { value: 100 },
      },
    });
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uViewport.value.set(frame.width, frame.height);
    u.uLodK.value = frame.lodK;
    u.uDpr.value = frame.dpr;
    u.uHazeVisibility.value = frame.hazeVisibility;
  }

  /** Draws the lines only up to this distance along each, km. */
  set head(km: number) {
    this.uniforms.uHead.value = km;
  }

  /** Lines whose tag is above this fade out. */
  set tagLimit(value: number) {
    this.uniforms.uTagLimit.value = value;
  }

  get color(): Vector3 {
    return this.uniforms.uColor.value;
  }
}

/** The ink's pattern along a line. */
export type LinePattern = "solid" | "dotted" | "dashdot" | "dashed";

const PATTERN_KIND: Record<LinePattern, number> = {
  solid: 0,
  dotted: 1,
  dashdot: 2,
  dashed: 3,
};

/** How a patterned line is drawn; sizes in CSS px. */
export interface LineStyle {
  pattern: LinePattern;
  /** The ink's pen width: a dot's diameter, a dash's width. */
  width: number;
  /** The pattern's period on screen (between one and two of these). */
  period: number;
  /** A dash's length, end to end (0 for dots). */
  dash: number;
  /** The wash's width, narrowest and widest; [0, 0] for none. */
  wash: readonly [number, number];
}

/**
 * Patterned ribbons: up to `lines` lines of their own styles, heads and
 * colours in one draw call, each polyline's tag its line's index; and
 * `circles` day circles, a polyline's piece holding the distances along
 * the line of the circles at its ends and their indices (-1 for none).
 */
export class PatternMaterial extends ShaderMaterial {
  private readonly style: Float32Array;
  private readonly ink: Float32Array;
  private readonly wash: Float32Array;
  private readonly state: Float32Array;
  private readonly head: Float32Array;
  private readonly circles: DataTexture;

  constructor(
    field: TerrainField,
    lines: number,
    circles: number,
    options: Omit<RibbonOptions, "opacity">,
  ) {
    const n = Math.max(1, lines);
    const circleData = new Float32Array(Math.max(1, circles) * 4);
    const texture = new DataTexture(
      circleData,
      Math.max(1, circles),
      1,
      RGBAFormat,
      FloatType,
    );
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    const style = new Float32Array(n * 4);
    const ink = new Float32Array(n * 4);
    const wash = new Float32Array(n * 4);
    const state = new Float32Array(n * 4);
    const head = new Float32Array(n * 4);
    super({
      glslVersion: GLSL3,
      vertexShader: VERTEX,
      fragmentShader: PATTERN_FRAGMENT,
      defines: { PATTERNED: 1, LINES: n },
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        uExag: { value: 1 },
        uViewport: { value: new Vector2(1, 1) },
        uLodK: { value: 100 },
        uPull: { value: options.pull ?? 0.004 },
        uLift: { value: options.lift ? 1 : 0 },
        uDpr: { value: 1 },
        uTagLimit: { value: 1e6 },
        uHazeVisibility: { value: 100 },
        uLineStyle: { value: style },
        uLineInk: { value: ink },
        uLineWash: { value: wash },
        uLineState: { value: state },
        uLineHead: { value: head },
        uCircles: { value: texture },
      },
    });
    this.style = style;
    this.ink = ink;
    this.wash = wash;
    this.state = state;
    this.head = head;
    this.circles = texture;
  }

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uViewport.value.set(frame.width, frame.height);
    u.uLodK.value = frame.lodK;
    u.uDpr.value = frame.dpr;
    u.uHazeVisibility.value = frame.hazeVisibility;
  }

  setStyle(line: number, style: LineStyle): void {
    this.style.set(
      [PATTERN_KIND[style.pattern], style.width, style.period, style.dash],
      line * 4,
    );
    this.state[line * 4 + 2] = style.wash[0];
    this.state[line * 4 + 3] = style.wash[1];
  }

  /** The line's head (km along it; nothing beyond) and its opacity. */
  setState(line: number, headKm: number, opacity: number): void {
    this.state[line * 4] = headKm;
    this.state[line * 4 + 1] = opacity;
  }

  /**
   * The arrowhead at the line's head: its opacity (0 for none), length and
   * half width (CSS px), and how deep its back is hollowed (a share of its
   * length). The line's ribbon must be wide enough to hold it.
   */
  setArrow(
    line: number,
    opacity: number,
    length: number,
    halfWidth: number,
    hollow: number,
  ): void {
    const h = this.head;
    h[line * 4] = opacity;
    h[line * 4 + 1] = length;
    h[line * 4 + 2] = halfWidth;
    h[line * 4 + 3] = hollow;
  }

  /** The ink's colour (sRGB 0..1) and opacity. */
  setInk(line: number, color: Vector3, opacity: number): void {
    setRgba(this.ink, line, color, opacity);
  }

  /** The wash's colour (sRGB 0..1) and opacity. */
  setWash(line: number, color: Vector3, opacity: number): void {
    setRgba(this.wash, line, color, opacity);
  }

  /** A day circle's ring: its radius on the chart (km) and its opacity. */
  setCircle(index: number, radiusKm: number, opacity: number): void {
    const data = this.circles.image.data as Float32Array;
    data[index * 4] = radiusKm;
    data[index * 4 + 1] = opacity;
  }

  /** Uploads this frame's circles. */
  commit(): void {
    this.circles.needsUpdate = true;
  }

  dispose(): void {
    this.circles.dispose();
    super.dispose();
  }
}

function setRgba(out: Float32Array, i: number, rgb: Vector3, a: number): void {
  out[i * 4] = rgb.x;
  out[i * 4 + 1] = rgb.y;
  out[i * 4 + 2] = rgb.z;
  out[i * 4 + 3] = a;
}
