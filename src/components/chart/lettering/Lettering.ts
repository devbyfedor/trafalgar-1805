import { MeshBasicMaterial, Vector3 } from "three";
import { BatchedText, configureTextBuilder, Text } from "troika-three-text";
import { createDerivedMaterial } from "troika-three-utils";
import type { ChartLayer, FrameInfo } from "../engine/Chart";
import { worldX, worldY } from "../geo/mercator";
import { GLSL_FIELD, GLSL_GEO } from "../shaders/common";
import type { TerrainField } from "../terrain/field";
import {
  DEFAULT_FONT_FILE,
  FONT_FILES,
  fontUrl,
  type LabelRole,
} from "./fonts";

/**
 * Lettering lying on the chart and tilting with it, as on a real chart
 * (docs/scene-02-brief.md, "concept"): oceans in Bodoni Moda, places in
 * Baskervville roman, waters (seas, bays, straits, capes) in Baskervville
 * italic. Every name is a troika Text in one BatchedText, so all of them
 * are one draw call. The batch's base material drapes each glyph on the
 * exaggerated relief and pulls it a little toward the camera, as the ink
 * lines are. A name shows while its letters are a readable size on screen,
 * fading in and out at either end of that band, as the chart is foreshortened
 * toward the horizon, and with the haze.
 *
 * Fonts come only from this site (fonts.ts). troika fetches a fallback
 * font from a CDN for any character neither a label's font nor the default
 * font covers, and pointing its fallback at this site doesn't stop that (it
 * retries on the CDN). So every label sets its font, the default font is
 * one of ours, and scripts/check-lettering.ts fails the check if any name
 * holds a character its font lacks.
 */

export type { LabelRole };

export interface Label {
  text: string;
  role: LabelRole;
  /** Where the label's centre lies, degrees. */
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
}

/**
 * One glyph size for every name: troika keeps an atlas per SDF size, and a
 * BatchedText binds only one, so mixed sizes draw the wrong glyphs. 128
 * keeps Bodoni Moda's hairlines and serifs sharp on large names.
 */
const SDF_GLYPH_SIZE = 128;

/** Default readable band, CSS px of em size on screen. */
const SHOW_PX: readonly [number, number] = [9, 46];

let configured = false;

/** troika's global settings, before the first text is made. */
function configureFonts(): void {
  if (configured) return;
  configured = true;
  configureTextBuilder({ defaultFontURL: fontUrl(DEFAULT_FONT_FILE) });
}

const DRAPE = /* glsl */ `
${GLSL_GEO}
${GLSL_FIELD}
uniform float uExag;
uniform vec3 uTexelKm;
uniform float uLodK;
uniform float uPull;

// A glyph corner (world km: the batch sits at the origin) laid on the
// relief, read where the terrain mesh reads it, and pulled toward the camera.
vec3 chartDrape(vec3 p) {
  float cellKm = max(length(vec3(p.xy - cameraPosition.xy, cameraPosition.z)) / uLodK, 1e-3);
  vec4 f = sampleFieldLod(p.xy, max(vec3(0.0), log2(cellKm / uTexelKm)));
  float taper = smoothstep(0.0, cellKm, -f.y);
  vec3 w = vec3(p.xy, max(f.x, 0.0) * 0.001 * secLat(p.y) * uExag * taper);
  return w + (cameraPosition - w) * uPull;
}
`;

interface Placed {
  label: Label;
  text: Text;
  /** World position of the label's centre (z on the sea). */
  at: Vector3;
  band: readonly [number, number];
  /** Half the typeset block's diagonal, world km (known after sync). */
  radius: number;
  opacity: number;
}

export class Lettering implements ChartLayer {
  readonly batch: BatchedText;
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
        },
        vertexDefs: DRAPE,
        vertexTransform: "position = chartDrape(position);",
      },
    );
    this.batch = new BatchedText();
    this.batch.material = base;
    // Glyphs move in the shader; the batch's bounds don't know where.
    this.batch.frustumCulled = false;
    this.batch.renderOrder = 30;

    const syncs: Promise<void>[] = [];
    for (const label of labels) {
      const text = new Text();
      text.text = label.text;
      text.font = fontUrl(FONT_FILES[label.role]);
      text.fontSize = label.size;
      // In ems: troika 0.52.5 multiplies it by fontSize (its README says
      // local units).
      text.letterSpacing = label.tracking ?? 0;
      text.anchorX = "center";
      text.anchorY = "middle";
      text.whiteSpace = "nowrap";
      text.sdfGlyphSize = SDF_GLYPH_SIZE;
      const at = new Vector3(worldX(label.lon), worldY(label.lat), 0);
      text.position.copy(at);
      text.rotation.z = ((label.angle ?? 0) * Math.PI) / 180;
      text.fillOpacity = 0;
      this.batch.add(text);
      this.placed.push({
        label,
        text,
        at,
        band: label.showPx ?? SHOW_PX,
        radius: 0,
        opacity: 0,
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
      const emPx = (p.label.size * cssPerRadian) / dist;
      const emPxNear = (p.label.size * cssPerRadian) / near;
      const [lo, hi] = p.band;
      const inBand =
        smooth(lo * 0.8, lo * 1.1, emPx) *
        (1 - smooth(hi * 0.85, hi * 1.2, emPxNear));
      // Toward the horizon the chart is foreshortened past reading.
      const tilt = smooth(0.1, 0.25, eye.z / dist);
      const x = dist / frame.hazeVisibility;
      const clear = Math.exp(-x * x);
      p.opacity = inBand * tilt * clear;
      p.text.fillOpacity = p.opacity;
      // Names on the sea in pale ink, on the land in dark ink.
      const ink =
        p.label.role === "place" || p.label.role === "land"
          ? this.inkDark
          : this.inkPale;
      p.text.color = colorHex(ink);
    }
  }

  dispose(): void {
    for (const p of this.placed) p.text.dispose();
    this.batch.dispose();
  }
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** An sRGB colour (components 0..1) as a hex number, as troika takes it. */
function colorHex(c: Vector3): number {
  const r = Math.round(c.x * 255);
  const g = Math.round(c.y * 255);
  const b = Math.round(c.z * 255);
  return (r << 16) | (g << 8) | b;
}
