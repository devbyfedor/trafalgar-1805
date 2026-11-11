import { InstancedBufferAttribute, MeshBasicMaterial, Vector3 } from "three";
import { BatchedText, configureTextBuilder, Text } from "troika-three-text";
import { createDerivedMaterial } from "troika-three-utils";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import type { TerrainField } from "../terrain/field";
import { DRAPE, GROUND } from "./drape";
import {
  DEFAULT_FONT_FILE,
  FONT_FILES,
  fontUrl,
  type LabelRole,
} from "./fonts";
import { MARK_HALF_EM, MARK_RING_EM, type MarkKind, Marks } from "./marks";

/**
 * Lettering lying on the chart and tilting with it, as on a real chart
 * (docs/scene-02-brief.md, "concept"): oceans in Bodoni Moda, places in
 * Baskervville roman, waters (seas, bays, straits, capes) in Baskervville
 * italic. Every name is a troika Text in one BatchedText, so all of them
 * are one draw call. The batch's base material drapes each glyph on the
 * exaggerated relief and pulls it a little toward the camera, as the ink
 * lines are. A name shows once its letters are a readable size on screen.
 * Close up, a place's or a cape's name stops growing at a size of its own
 * and stays, as a chart of a smaller area letters its towns again; the
 * names of oceans, seas and countries fade out instead. Names fade as the
 * chart is foreshortened toward the horizon, and with the haze.
 *
 * A town can have a mark on its site (marks.ts), with its name set beside
 * it; mark and name scale and fade together.
 *
 * A minor name (rank above 0) gives way to the names that rank before it:
 * it fades as its letters come near theirs on screen (YIELD_PX), so the
 * chart shows it while it has room and never sets two names over each
 * other. The fade follows the names' places on screen, which the camera
 * moves smoothly, so it comes and goes with the scroll.
 *
 * Fonts come only from this site (fonts.ts). troika fetches a fallback
 * font from a CDN for any character neither a label's font nor the default
 * font covers, and pointing its fallback at this site doesn't stop that (it
 * retries on the CDN). So every label sets its font, the default font is
 * one of ours, and scripts/check-lettering.ts fails the check if any name
 * holds a character its font lacks.
 */

export type { LabelRole, MarkKind };

export interface Label {
  text: string;
  role: LabelRole;
  /**
   * Degrees: the site (a town, a cape) when the label has a mark or a
   * side, otherwise the label's centre.
   */
  lon: number;
  lat: number;
  /** Em size on the chart, world km. */
  size: number;
  /** Rotation on the chart, degrees anticlockwise from east. */
  angle?: number;
  /** Extra space between letters, in ems (ocean and sea names only). */
  tracking?: number;
  /** The on-screen em size band (CSS px) in which the label shows. */
  showPx?: readonly [number, number];
  /** A mark on the site, with the name beside it. */
  mark?: MarkKind;
  /**
   * Where the name sits against its site (and mark), in the label's own
   * frame; "right" when it has a mark and no side.
   */
  side?: "right" | "left" | "above" | "below";
  /**
   * Close up, the name stops growing at this em size on screen (CSS px)
   * and stays; 0 fades it out instead. Defaults by role, and for capitals.
   */
  capPx?: number;
  /**
   * A minor name's rank: it gives way to every name of a lower rank that
   * shows, fading as its letters come near theirs (0, the default, never
   * gives way).
   */
  rank?: number;
}

/**
 * One glyph size for every name: troika keeps an atlas per SDF size, and a
 * BatchedText binds only one, so mixed sizes draw the wrong glyphs. 128
 * keeps Bodoni Moda's hairlines and serifs sharp on large names.
 */
const SDF_GLYPH_SIZE = 128;

/** Default readable band, CSS px of em size on screen. */
const SHOW_PX: readonly [number, number] = [9, 46];

/**
 * Where names stop growing close up (CSS px of em); 0: they fade out
 * instead, as the names of large areas do. A capital's cap is
 * CAPITAL_CAP_PX: the period hierarchy is about 1.4 for capitals to 1.2
 * for ports and 1 for minor names (docs/research/scene-02/t4-chart-style.md,
 * section 7).
 */
const CAP_PX: Record<LabelRole, number> = {
  ocean: 0,
  sea: 0,
  water: 0,
  land: 0,
  cape: 18,
  island: 18,
  place: 19,
};
const CAPITAL_CAP_PX = 22;

/**
 * The ink follows the ground under the letters: pale on the sea, dark on
 * the land's paper, so a name reads at every scale even where the ground
 * under it changes (Cádiz's name lies on the sea from afar, on its isthmus
 * close up). It switches at the coast within a pixel, as the coastline is
 * drawn, so a letter that crosses a coast keeps its contrast on both
 * sides; names are placed so that they don't, in the views that matter.
 */
const INK_FRAGMENT = /* glsl */ `
${GROUND}
uniform vec3 uInkPale;
uniform vec3 uInkDark;
`;

/** The gap between a mark's ring and its name, in ems. */
const MARK_GAP_EM = 0.2;

/**
 * A minor name is gone while its box stands within YIELD_PX[0] of a
 * higher-ranked name's on screen and fully there from YIELD_PX[1] (CSS
 * px), easing between: it shows where it has room or not at all, never as
 * a ghost crowding its neighbour.
 */
const YIELD_PX: readonly [number, number] = [4, 10];

let configured = false;

/** troika's global settings, before the first text is made. */
function configureFonts(): void {
  if (configured) return;
  configured = true;
  configureTextBuilder({ defaultFontURL: fontUrl(DEFAULT_FONT_FILE) });
}

interface Placed {
  label: Label;
  text: Text;
  /** World position of the site or the label's centre (z on the sea). */
  at: Vector3;
  band: readonly [number, number];
  cap: number;
  /** The name's offset from its site, ems, in the chart's frame (east, north). */
  offset: readonly [number, number];
  /** Index of its mark, or -1. */
  mark: number;
  /** Half the typeset block's diagonal, world km (known after sync). */
  radius: number;
  opacity: number;
  /** This frame's em size on screen (CSS px) and scale on the chart. */
  emPx: number;
  scale: number;
  /** The typeset block in the text's own frame (world km at scale 1), once known. */
  bounds: [number, number, number, number] | null;
  /**
   * Its outline on screen this frame, CSS px: the typeset block widened to
   * its mark, four corners (x, y) in order; NaN when it doesn't show.
   */
  quad: Float64Array;
}

/** A name's state in the last frame, for development and tests. */
export interface LabelState {
  text: string;
  emPx: number;
  opacity: number;
  scale: number;
}

export class Lettering implements ChartLayer {
  readonly batch: BatchedText;
  readonly marks: Marks;
  /** Resolves once every name has been typeset. */
  readonly ready: Promise<void>;
  private readonly placed: Placed[] = [];
  private readonly uniforms = {
    uExag: { value: 1 },
    uLodK: { value: 100 },
    uPull: { value: 0.004 },
  };
  private readonly inkDark = new Vector3();
  private readonly inkPale = new Vector3();

  constructor(field: TerrainField, labels: readonly Label[]) {
    configureFonts();
    const base = createDerivedMaterial(
      new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      {
        uniforms: {
          ...field.uniforms,
          uTexelKm: { value: field.texelKm },
          ...this.uniforms,
          uInkPale: { value: this.inkPale },
          uInkDark: { value: this.inkDark },
        },
        vertexDefs: `${DRAPE}\nvarying vec2 vChartXY;`,
        vertexTransform:
          "vChartXY = position.xy; position = chartDrape(position);",
        fragmentDefs: INK_FRAGMENT,
        fragmentColorTransform:
          "gl_FragColor.rgb = mix(uInkPale, uInkDark, chartGround());",
      },
    );
    this.batch = new BatchedText();
    this.batch.name = "lettering";
    this.batch.material = base;
    // Glyphs move in the shader; the batch's bounds don't know where.
    this.batch.frustumCulled = false;
    this.batch.renderOrder = 30;
    // The batch's member index as floats from the start: troika keeps the
    // type it finds (it seeds a Uint16Array), and ANGLE on Direct3D
    // recompiled the text's vertex program at the first real draw to read
    // 16-bit integers into its float attribute, a 50 ms stall of every frame
    // (docs/research/perf-start-of-scroll.md).
    this.batch.geometry.setAttribute(
      "aTroikaTextBatchMemberIndex",
      new InstancedBufferAttribute(new Float32Array(0), 1),
    );

    const kinds: MarkKind[] = [];
    const syncs: Promise<void>[] = [];
    for (const label of labels) {
      const text = new Text();
      text.text = label.text;
      text.font = fontUrl(FONT_FILES[label.role]);
      text.fontSize = label.size;
      // In ems: troika 0.52.5 multiplies it by fontSize (its README says
      // local units).
      text.letterSpacing = label.tracking ?? 0;
      text.whiteSpace = "nowrap";
      text.sdfGlyphSize = SDF_GLYPH_SIZE;
      // The glyphs' distance fields drawn in troika's workers, not on a
      // second WebGL canvas on the main thread while scene 1 plays.
      text.gpuAccelerateSDF = false;
      const angle = ((label.angle ?? 0) * Math.PI) / 180;
      text.rotation.z = angle;
      let offset: readonly [number, number] = [0, 0];
      let mark = -1;
      if (label.mark) {
        mark = kinds.length;
        kinds.push(label.mark);
      }
      if (label.mark || label.side) {
        const side = label.side ?? "right";
        const away = (label.mark ? MARK_RING_EM : 0) + MARK_GAP_EM;
        const [ex, ey] =
          side === "right"
            ? [away, 0]
            : side === "left"
              ? [-away, 0]
              : side === "above"
                ? [0, away]
                : [0, -away];
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        offset = [ex * c - ey * s, ex * s + ey * c];
        text.anchorX =
          side === "right" ? "left" : side === "left" ? "right" : "center";
        text.anchorY =
          side === "above" ? "bottom" : side === "below" ? "top" : "middle";
      } else {
        text.anchorX = "center";
        text.anchorY = "middle";
      }
      const at = new Vector3(worldX(label.lon), worldY(label.lat), 0);
      text.position.set(
        at.x + offset[0] * label.size,
        at.y + offset[1] * label.size,
        0,
      );
      text.fillOpacity = 0;
      this.batch.add(text);
      this.placed.push({
        label,
        text,
        at,
        band: label.showPx ?? SHOW_PX,
        cap:
          label.capPx ??
          (label.mark === "capital" ? CAPITAL_CAP_PX : CAP_PX[label.role]),
        offset,
        mark,
        radius: 0,
        opacity: 0,
        emPx: 0,
        scale: 1,
        bounds: null,
        quad: new Float64Array(8),
      });
      const placed = this.placed[this.placed.length - 1];
      syncs.push(
        new Promise((resolve) =>
          text.sync(() => {
            const b = text.textRenderInfo?.blockBounds;
            if (b) {
              placed.radius = 0.5 * Math.hypot(b[2] - b[0], b[3] - b[1]);
              placed.bounds = [b[0], b[1], b[2], b[3]];
            }
            resolve();
          }),
        ),
      );
    }
    this.marks = new Marks(field, kinds, this.uniforms, this.inkDark);
    this.ready = Promise.all(syncs).then(() => undefined);
    // Minor names give way in order of rank, after the names before them.
    this.ranked = this.placed
      .filter((p) => (p.label.rank ?? 0) > 0)
      .sort((a, b) => (a.label.rank ?? 0) - (b.label.rank ?? 0));
  }

  /** The minor names, by rank. */
  private readonly ranked: Placed[];
  private readonly at = new Vector3();

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uLodK.value = frame.lodK;
    const eye = frame.eye;
    const cssPerRadian = frame.pxPerRadian / frame.dpr;
    this.inkDark.copy(frame.light.ink);
    this.inkPale.copy(frame.light.inkPale);
    for (const p of this.placed) {
      const dx = p.at.x - eye.x;
      const dy = p.at.y - eye.y;
      const dist = Math.sqrt(dx * dx + dy * dy + eye.z * eye.z);
      // Too small where the centre is; too big where its nearest letters
      // are (a long name seen from close to one end).
      const near = Math.max(dist - p.radius, eye.z, 1e-3);
      const size = p.label.size;
      const emPx = (size * cssPerRadian) / dist;
      const emPxNear = (size * cssPerRadian) / near;
      const [lo, hi] = p.band;
      // Close up, a capped name shrinks on the chart to stay at its cap.
      const scale = p.cap > 0 ? Math.min(1, p.cap / emPxNear) : 1;
      const inBand =
        smooth(lo * 0.8, lo * 1.1, emPx) *
        (p.cap > 0 ? 1 : 1 - smooth(hi * 0.85, hi * 1.2, emPxNear));
      // Toward the horizon the chart is foreshortened past reading.
      const tilt = smooth(0.1, 0.25, eye.z / dist);
      const x = dist / frame.hazeVisibility;
      const clear = Math.exp(-x * x);
      p.opacity = inBand * tilt * clear;
      p.emPx = emPx * scale;
      p.scale = scale;
      const text = p.text;
      text.scale.setScalar(scale);
      const em = size * scale;
      text.position.set(
        p.at.x + p.offset[0] * em,
        p.at.y + p.offset[1] * em,
        0,
      );
    }
    if (this.ranked.length > 0) this.giveWay(frame);
    for (const p of this.placed) {
      p.text.fillOpacity = p.opacity;
      if (p.mark >= 0) {
        const em = p.label.size * p.scale;
        this.marks.set(p.mark, p.at.x, p.at.y, MARK_HALF_EM * em, p.opacity);
      }
    }
    this.marks.commit();
  }

  /**
   * Each minor name fades by how near its outline on screen comes to the
   * outlines of the names that rank before it, as those show.
   */
  private giveWay(frame: FrameInfo): void {
    for (const p of this.placed) this.outline(p, frame);
    for (const p of this.ranked) {
      if (p.opacity <= 0.001 || Number.isNaN(p.quad[0])) continue;
      const rank = p.label.rank ?? 0;
      let keep = 1;
      for (const q of this.placed) {
        if (q === p || (q.label.rank ?? 0) >= rank || q.opacity <= 0.001)
          continue;
        if (Number.isNaN(q.quad[0])) continue;
        const apart = quadsApart(p.quad, q.quad);
        // A name that shows at all counts in full (one in the haze still sets
        // its letters there); one still coming in counts as it comes.
        const there = smooth(0.03, 0.2, q.opacity);
        keep *= 1 - there * (1 - smooth(YIELD_PX[0], YIELD_PX[1], apart));
      }
      p.opacity *= keep;
    }
  }

  /**
   * A name's outline on screen (CSS px): its typeset block in its own frame,
   * widened to take in its mark's ring, its corners projected from the sea.
   */
  private outline(p: Placed, frame: FrameInfo): void {
    const quad = p.quad;
    quad[0] = Number.NaN;
    const b = p.bounds;
    if (!b || p.opacity <= 0.001) return;
    const t = p.text;
    const angle = t.rotation.z;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const k = p.scale;
    let x0 = b[0];
    let y0 = b[1];
    let x1 = b[2];
    let y1 = b[3];
    if (p.mark >= 0) {
      // The site in the text's own frame (at scale 1), and its ring.
      const dx = (p.at.x - t.position.x) / k;
      const dy = (p.at.y - t.position.y) / k;
      const mx = dx * cos + dy * sin;
      const my = -dx * sin + dy * cos;
      const r = MARK_RING_EM * p.label.size;
      x0 = Math.min(x0, mx - r);
      y0 = Math.min(y0, my - r);
      x1 = Math.max(x1, mx + r);
      y1 = Math.max(y1, my + r);
    }
    const c = cos * k;
    const s = sin * k;
    const x = t.position.x;
    const y = t.position.y;
    if (
      !this.corner(quad, 0, frame, x + x0 * c - y0 * s, y + x0 * s + y0 * c) ||
      !this.corner(quad, 1, frame, x + x1 * c - y0 * s, y + x1 * s + y0 * c) ||
      !this.corner(quad, 2, frame, x + x1 * c - y1 * s, y + x1 * s + y1 * c) ||
      !this.corner(quad, 3, frame, x + x0 * c - y1 * s, y + x0 * s + y1 * c)
    )
      quad[0] = Number.NaN;
  }

  /** Projects a point on the sea to CSS px into quad corner i; false behind the eye. */
  private corner(
    quad: Float64Array,
    i: number,
    frame: FrameInfo,
    x: number,
    y: number,
  ): boolean {
    const cam = frame.camera;
    const v = this.at.set(x, y, 0).applyMatrix4(cam.matrixWorldInverse);
    if (v.z > -cam.near) return false;
    v.applyMatrix4(cam.projectionMatrix);
    quad[i * 2] = (v.x * 0.5 + 0.5) * (frame.width / frame.dpr);
    quad[i * 2 + 1] = (0.5 - v.y * 0.5) * (frame.height / frame.dpr);
    return true;
  }

  /** Every name's state in the last frame (development and tests). */
  snapshot(): LabelState[] {
    return this.placed.map((p) => ({
      text: p.label.text,
      emPx: Math.round(p.emPx * 10) / 10,
      opacity: Math.round(p.opacity * 100) / 100,
      scale: Math.round(p.scale * 100) / 100,
    }));
  }

  dispose(): void {
    for (const p of this.placed) p.text.dispose();
    this.batch.dispose();
    this.marks.dispose();
  }
}

/**
 * How far apart two convex quadrilaterals are (corners x, y in order), by
 * the separating axes of their edges: the widest gap between their
 * shadows on any edge's normal, negative where they overlap (then the
 * least overlap). No allocation.
 */
function quadsApart(a: Float64Array, b: Float64Array): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let side = 0; side < 2; side++) {
    const q = side === 0 ? a : b;
    for (let e = 0; e < 4; e++) {
      const ex = q[((e + 1) % 4) * 2] - q[e * 2];
      const ey = q[((e + 1) % 4) * 2 + 1] - q[e * 2 + 1];
      const len = Math.hypot(ex, ey);
      if (len < 1e-9) continue;
      const nx = -ey / len;
      const ny = ex / len;
      let amin = Number.POSITIVE_INFINITY;
      let amax = Number.NEGATIVE_INFINITY;
      let bmin = Number.POSITIVE_INFINITY;
      let bmax = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < 4; i++) {
        const pa = a[i * 2] * nx + a[i * 2 + 1] * ny;
        const pb = b[i * 2] * nx + b[i * 2 + 1] * ny;
        if (pa < amin) amin = pa;
        if (pa > amax) amax = pa;
        if (pb < bmin) bmin = pb;
        if (pb > bmax) bmax = pb;
      }
      const gap = Math.max(bmin - amax, amin - bmax);
      if (gap > best) best = gap;
    }
  }
  return best;
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
