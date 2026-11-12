import type { Object3D } from "three";
import { Vector3 } from "three";
import type { BatchedText, Text } from "troika-three-text";
import type { FrameInfo } from "../engine/Chart";
import type { TerrainField } from "../terrain/field";
import { FONT_FILES, fontUrl } from "./fonts";
import { MARK_HALF_EM, MARK_RING_EM, Marks } from "./marks";
import {
  chartText,
  chartTextBatch,
  chartTextMaterial,
  configureFonts,
  type DrapeUniforms,
} from "./material";

/**
 * The tracks' lettering and day circles (lines/Track.ts drives them): day
 * numerals, months, key dates and legends in small italic, as the period's
 * track charts wrote them (docs/research/scene-02/a-t4.md, directive 10),
 * and the open circles at the noon positions. They lie on the chart like
 * the gazetteer's names, on the same drape and in the same ink, pale on
 * the sea and dark on the land (material.ts), but keep a size on screen
 * and come and go as the tracks' layer says: revealed by the drawing head,
 * thinned where they crowd, faded by foreshortening and the haze. All the
 * text is one BatchedText, one draw call, and the circles another.
 *
 * A label stands off its site (a circle, a key point, the middle of a
 * legend's stretch) in a direction on the chart, its nearest visible edge
 * a given number of ems away, so it keeps clear of the line at every size.
 */

/** A label's place against its site. */
export interface TrackLabel {
  text: string;
  /** The site, world km. */
  x: number;
  y: number;
  /** Rotation on the chart, radians anticlockwise from east. */
  angle: number;
  /** From the site toward the label: a unit vector on the chart. */
  dirX: number;
  dirY: number;
  /** How far the label's nearest visible edge stands from the site, ems. */
  clear: number;
}

/** The radius at which a track stops at its day circle, ems: the ring's stroke. */
export const RING_STOP_EM = MARK_RING_EM - 0.035;

interface Placed {
  label: TrackLabel;
  text: Text;
  /** The visible text's offset from the site, ems, on the chart. */
  ox: number;
  oy: number;
  /** The visible text's width and height, ems. */
  width: number;
  height: number;
  /** From the site to the visible text's centre, ems, along the label's direction. */
  reach: number;
  opacity: number;
  em: number;
}

/** A label's state in the last frame, for development and tests. */
export interface TrackLabelState {
  text: string;
  opacity: number;
  /** Its centre on the chart, world km, and its em there, km. */
  x: number;
  y: number;
  emKm: number;
}

export class TrackLabels {
  readonly batch: BatchedText;
  readonly rings: Marks;
  /** Resolves once every label has been typeset. */
  readonly ready: Promise<void>;
  private readonly placed: Placed[] = [];
  private readonly uniforms: DrapeUniforms = {
    uExag: { value: 1 },
    uLodK: { value: 100 },
    uPull: { value: 0.004 },
  };
  private readonly inkDark = new Vector3();
  private readonly inkPale = new Vector3();

  constructor(
    field: TerrainField,
    labels: readonly TrackLabel[],
    circles: number,
  ) {
    configureFonts();
    this.batch = chartTextBatch(
      "track-lettering",
      chartTextMaterial(field, this.uniforms, this.inkPale, this.inkDark),
      31,
    );

    const syncs: Promise<void>[] = [];
    for (const label of labels) {
      // One em is one unit; the text is scaled to its em on the chart. The
      // gazetteer's glyph size: one atlas for all the chart's lettering.
      const text = chartText(label.text, fontUrl(FONT_FILES.note), 1, 128);
      text.anchorX = "center";
      text.anchorY = "middle";
      text.rotation.z = label.angle;
      text.position.set(label.x, label.y, 0);
      text.scale.setScalar(0);
      text.fillOpacity = 0;
      this.batch.add(text);
      const placed: Placed = {
        label,
        text,
        ox: 0,
        oy: 0,
        width: 0,
        height: 0,
        reach: 0,
        opacity: 0,
        em: 0,
      };
      this.placed.push(placed);
      syncs.push(
        new Promise((resolve) =>
          text.sync(() => {
            this.fit(placed);
            resolve();
          }),
        ),
      );
    }
    // Pale ink: the circles stand on the tracks, on the sea.
    this.rings = new Marks(
      field,
      Array.from({ length: circles }, () => "town" as const),
      this.uniforms,
      this.inkPale,
    );
    this.rings.mesh.renderOrder = 23;
    this.rings.mesh.name = "track-rings";
    this.ready = Promise.all(syncs).then(() => undefined);
  }

  /** The objects to add to the scene. */
  get objects(): Object3D[] {
    return [this.batch, this.rings.mesh];
  }

  /** The visible text's width, ems (known once typeset). */
  width(index: number): number {
    return this.placed[index].width;
  }

  /** The visible text's height, ems (known once typeset). */
  height(index: number): number {
    return this.placed[index].height;
  }

  /**
   * Sets label `index` for this frame: its em on the chart (km) and its
   * opacity.
   */
  set(index: number, emKm: number, opacity: number): void {
    const p = this.placed[index];
    p.em = emKm;
    p.opacity = opacity;
    const text = p.text;
    text.fillOpacity = opacity;
    text.scale.setScalar(opacity > 0 ? emKm : 0);
    text.position.set(p.label.x + p.ox * emKm, p.label.y + p.oy * emKm, 0);
  }

  /** Sets circle `index`: its site (world km), the em it is sized by (km), its opacity. */
  setRing(
    index: number,
    x: number,
    y: number,
    emKm: number,
    opacity: number,
  ): void {
    const half = opacity > 0 ? MARK_HALF_EM * emKm : 0;
    this.rings.set(index, x, y, half, opacity);
  }

  /**
   * Label `index`'s visible text on screen this frame (CSS px, four corners
   * in order), as set; false when it doesn't show or lies behind the eye.
   */
  outline(index: number, frame: FrameInfo, out: Float64Array): boolean {
    const p = this.placed[index];
    if (p.opacity <= 0.001 || p.width <= 0) return false;
    const { x, y, angle, dirX, dirY } = p.label;
    const cx = x + dirX * p.reach * p.em;
    const cy = y + dirY * p.reach * p.em;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const hw = 0.5 * p.width * p.em;
    const hh = 0.5 * p.height * p.em;
    for (let i = 0; i < 4; i++) {
      const u = i === 0 || i === 3 ? -hw : hw;
      const v = i < 2 ? -hh : hh;
      const wx = cx + u * c - v * s;
      const wy = cy + u * s + v * c;
      const at = this.at.set(wx, wy, 0);
      at.applyMatrix4(frame.camera.matrixWorldInverse);
      if (at.z > -frame.camera.near) return false;
      at.applyMatrix4(frame.camera.projectionMatrix);
      out[i * 2] = (at.x * 0.5 + 0.5) * (frame.width / frame.dpr);
      out[i * 2 + 1] = (0.5 - at.y * 0.5) * (frame.height / frame.dpr);
    }
    return true;
  }

  private readonly at = new Vector3();

  update(frame: FrameInfo): void {
    const u = this.uniforms;
    u.uExag.value = frame.exaggeration;
    u.uLodK.value = frame.lodK;
    this.inkDark.copy(frame.light.ink);
    this.inkPale.copy(frame.light.inkPale);
    this.rings.commit();
  }

  /** Every label's state in the last frame (development and tests). */
  snapshot(): TrackLabelState[] {
    return this.placed.map((p) => ({
      text: p.label.text,
      opacity: Math.round(p.opacity * 100) / 100,
      x: p.label.x + p.ox * p.em,
      y: p.label.y + p.oy * p.em,
      emKm: p.em,
    }));
  }

  dispose(): void {
    for (const p of this.placed) p.text.dispose();
    this.batch.dispose();
    this.rings.dispose();
  }

  /**
   * The label's offset from its site, once typeset: the visible text's
   * centre goes along the label's direction until the text's nearest edge
   * is `clear` ems from the site.
   */
  private fit(p: Placed): void {
    const info = p.text.textRenderInfo as {
      visibleBounds?: [number, number, number, number];
      blockBounds: [number, number, number, number];
    } | null;
    const b = info?.visibleBounds ?? info?.blockBounds;
    if (!b) return;
    const { angle, dirX, dirY, clear } = p.label;
    p.width = b[2] - b[0];
    p.height = b[3] - b[1];
    // The direction and the visible centre in the text's own frame.
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const tx = dirX * c + dirY * s;
    const ty = -dirX * s + dirY * c;
    const reach =
      clear + 0.5 * (Math.abs(tx) * p.width + Math.abs(ty) * p.height);
    p.reach = reach;
    const cx = 0.5 * (b[0] + b[2]);
    const cy = 0.5 * (b[1] + b[3]);
    p.ox = dirX * reach - (cx * c - cy * s);
    p.oy = dirY * reach - (cx * s + cy * c);
  }
}
