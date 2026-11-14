import {
  BufferAttribute,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import type { TerrainField } from "../terrain/field";
import {
  GLSL_GLYPH_HEIGHT,
  type GlyphSizeUniforms,
  glyphSizeUniforms,
  updateGlyphSize,
} from "./height";

/**
 * Flag signals at the mastheads of ship glyphs (docs/history-notes.md,
 * "Scene 2: the road to Trafalgar", "How the chart shows the signals", by day): a hoist of two or
 * three small flags, hand-tinted as the plates were (red, white, blue,
 * yellow, muted), Popham's telegraph flag (red and white, diagonally), or
 * the distant signal's dark shapes (a flag, a ball, a pendant). Each flag
 * is an instance of one quad standing at its ship's masthead, sized with
 * her glyph (glyphs/height.ts), so it stays with her at every zoom: one
 * draw call for every hoist on the chart.
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

const VERTEX = /* glsl */ `
precision highp float;
in vec4 iPos;
in vec4 iFlag;
in float iRoom;
uniform float uPull;
out vec2 vLocal;
out float vKind;
out float vAlpha;
out float vDist;
${GLSL_GLYPH_HEIGHT}
void main() {
  vec3 base = vec3(iPos.xy, 0.0);
  float dist = length(base - cameraPosition);
  vec3 w = base + (cameraPosition - base) * uPull;
  vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
  // iRoom: a fixed room (km), or the coast's distance with a floor (-1 - floor).
  vec3 room = iRoom < 0.0 ? vec3(0.0, 1.0, -iRoom - 1.0) : vec3(iRoom, 0.0, 0.0);
  float h = glyphHeight(iPos.xy, dist, iPos.w, room);
  // Which way the ship faces on screen, as her glyph does.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  float facing = dot(vec2(sin(iPos.z), cos(iPos.z)), normalize(right.xy + 1e-6));
  float sx = facing < 0.0 ? -1.0 : 1.0;
  // iFlag: kind, place in the hoist (0 at the truck), masthead height in
  // glyph heights, and the mast's place fore and aft (cell widths).
  float slot = iFlag.y;
  vec2 size = vec2(0.17, 0.085) * h;
  // The hoist flies from the truck down the halyard, to leeward (the
  // glyph's stern side: the wind is abaft the beam).
  vec2 at = vec2(iFlag.w * uAspect * h * sx, iFlag.z * h - (slot + 0.5) * size.y * 1.15);
  vec2 corner = vec2(position.x * sx, position.y - 0.5) * size;
  clip.xy += (at + corner - vec2(size.x * 0.5 * sx, 0.0)) / (0.5 * uViewport) * clip.w;
  gl_Position = clip;
  vLocal = position.xy;
  vKind = iFlag.x;
  vAlpha = iPos.w > 0.0 ? glyphShow(dist, h, 0.0, 0.0) : 0.0;
  vDist = dist;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColors[6];
uniform float uHazeVisibility;
uniform float uOpacity;
in vec2 vLocal;
in float vKind;
in float vAlpha;
in float vDist;
out vec4 fragColor;
void main() {
  int k = int(vKind + 0.5);
  vec2 q = vLocal;
  vec3 c;
  float a = 1.0;
  if (k == 4) {
    // Popham's telegraph flag: red and white, divided diagonally.
    c = q.x > q.y ? uColors[0] : uColors[1];
  } else if (k == 5) {
    c = uColors[5];
  } else if (k == 6) {
    // A ball, as round as the flag is tall.
    vec2 d = (q - vec2(0.5)) * vec2(2.0, 1.0);
    a = smoothstep(0.52, 0.42, length(d));
    c = uColors[5];
  } else if (k == 7) {
    // A pendant: a long taper from the hoist.
    a = step(abs(q.y - 0.5), 0.5 * (1.0 - q.x));
    c = uColors[5];
  } else {
    c = uColors[k];
  }
  float x = vDist / uHazeVisibility;
  float alpha = a * vAlpha * uOpacity * exp(-x * x);
  if (alpha < 0.01) discard;
  fragColor = vec4(c * alpha, alpha);
}
`;

export interface Hoist {
  /** World km. */
  x: number;
  y: number;
  /** Radians from north, clockwise (the ship's). */
  heading: number;
  /** The ship's glyph size and room, as her glyph has them. */
  size: number;
  room: number;
  /** Masthead above the waterline and the mast's place, in glyph units. */
  masthead: number;
  mast: number;
  flags: readonly FlagKind[];
  opacity: number;
}

export class Hoists implements ChartLayer {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly iPos: InstancedBufferAttribute;
  private readonly iFlag: InstancedBufferAttribute;
  private readonly iRoom: InstancedBufferAttribute;
  private readonly size: GlyphSizeUniforms;
  private readonly colors = Array.from({ length: 6 }, () => new Vector3());
  private count = 0;

  /** `capacity` flags in all; `aspect` the glyph cell's width over height. */
  constructor(
    field: TerrainField,
    private readonly capacity: number,
    aspect: number,
  ) {
    const g = new InstancedBufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
        3,
      ),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.iPos = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iFlag = new InstancedBufferAttribute(
      new Float32Array(capacity * 4),
      4,
    );
    this.iRoom = new InstancedBufferAttribute(new Float32Array(capacity), 1);
    for (const a of [this.iPos, this.iFlag, this.iRoom])
      a.setUsage(DynamicDrawUsage);
    g.setAttribute("iPos", this.iPos);
    g.setAttribute("iFlag", this.iFlag);
    g.setAttribute("iRoom", this.iRoom);
    g.instanceCount = 0;
    this.size = glyphSizeUniforms(field, aspect);
    this.mesh = new Mesh(
      g,
      new ShaderMaterial({
        glslVersion: GLSL3,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          ...field.uniforms,
          ...this.size,
          uPull: { value: 0.0031 },
          uColors: { value: this.colors },
          uOpacity: { value: 1 },
        },
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 26;
  }

  /** Writes this frame's hoists; flags beyond the capacity are dropped. */
  set(hoists: readonly Hoist[]): void {
    const pos = this.iPos.array as Float32Array;
    const flag = this.iFlag.array as Float32Array;
    const room = this.iRoom.array as Float32Array;
    let n = 0;
    for (const h of hoists) {
      if (h.opacity <= 0.001) continue;
      for (let s = 0; s < h.flags.length && n < this.capacity; s++, n++) {
        pos.set([h.x, h.y, h.heading, h.size * Math.min(1, h.opacity)], n * 4);
        flag.set([KINDS[h.flags[s]], s, h.masthead, h.mast], n * 4);
        room[n] = h.room;
      }
    }
    this.count = n;
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iFlag.needsUpdate = true;
    this.iRoom.needsUpdate = true;
  }

  update(frame: FrameInfo): void {
    updateGlyphSize(this.size, frame);
    // Hand-tinted colours, muted as watercolour on the plate; dimmer at night.
    const dim = 1 - 0.6 * frame.light.night;
    const hex = [0xb24a3c, 0xeee5d0, 0x3f5d8c, 0xd5ad4e, 0, 0x1f1d1b];
    hex.forEach((v, i) => {
      this.colors[i].set(
        (((v >> 16) & 255) / 255) * dim,
        (((v >> 8) & 255) / 255) * dim,
        ((v & 255) / 255) * dim,
      );
    });
    this.mesh.visible = this.count > 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
