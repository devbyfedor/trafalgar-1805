import { MeshBasicMaterial, Vector3 } from "three";
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
      });
      const placed = this.placed[this.placed.length - 1];
      syncs.push(
        new Promise((resolve) =>
          text.sync(() => {
            const b = text.textRenderInfo?.blockBounds;
            if (b) placed.radius = 0.5 * Math.hypot(b[2] - b[0], b[3] - b[1]);
            resolve();
          }),
        ),
      );
    }
    this.marks = new Marks(field, kinds, this.uniforms, this.inkDark);
    this.ready = Promise.all(syncs).then(() => undefined);
  }

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
      text.fillOpacity = p.opacity;
      text.scale.setScalar(scale);
      const em = size * scale;
      text.position.set(
        p.at.x + p.offset[0] * em,
        p.at.y + p.offset[1] * em,
        0,
      );
      if (p.mark >= 0) {
        this.marks.set(p.mark, p.at.x, p.at.y, MARK_HALF_EM * em, p.opacity);
      }
    }
    this.marks.commit();
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

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
