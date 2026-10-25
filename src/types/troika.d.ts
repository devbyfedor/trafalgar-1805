/**
 * Types for the parts of troika-three-text and troika-three-utils 0.52.5
 * that the chart uses. Both packages ship generated declarations in
 * dist/types but name none in package.json, and the generated Text class
 * doesn't extend Mesh and BatchedText is missing, so they can't be used as
 * they are. These follow the installed source (src/Text.js,
 * src/BatchedText.js, src/TextBuilder.js, troika-three-utils
 * src/DerivedMaterial.js).
 */

declare module "troika-three-text" {
  import type { BufferGeometry, Material, Mesh } from "three";

  export interface TextBuilderConfig {
    defaultFontURL?: string | null;
    unicodeFontsURL?: string | null;
    sdfGlyphSize?: number;
    sdfMargin?: number;
    sdfExponent?: number;
    textureWidth?: number;
    useWorker?: boolean;
  }

  /** Must be called before the first text is typeset. */
  export function configureTextBuilder(config: TextBuilderConfig): void;

  export function preloadFont(
    options: {
      font?: string | null;
      characters?: string | string[];
      sdfGlyphSize?: number;
    },
    callback: () => void,
  ): void;

  export class Text extends Mesh<BufferGeometry, Material> {
    text: string;
    /** URL of a .ttf, .otf or .woff file. */
    font: string | null;
    /** Em height, local units. */
    fontSize: number;
    /**
     * Extra space between letters, in ems: the 0.52.5 typesetter multiplies
     * it by fontSize, though the README says local units.
     */
    letterSpacing: number;
    /** The typeset layout, once sync() has completed. */
    readonly textRenderInfo: {
      blockBounds: [number, number, number, number];
    } | null;
    lineHeight: number | "normal";
    maxWidth: number;
    textAlign: "left" | "right" | "center" | "justify";
    anchorX: number | "left" | "center" | "right" | `${number}%`;
    anchorY:
      | number
      | "top"
      | "top-baseline"
      | "top-cap"
      | "top-ex"
      | "middle"
      | "bottom-baseline"
      | "bottom"
      | `${number}%`;
    whiteSpace: "normal" | "nowrap";
    curveRadius: number;
    /** A colour as a number or CSS string; null takes the material's. */
    color: number | string | null;
    fillOpacity: number;
    /** Power of two; null for the builder's default. */
    sdfGlyphSize: number | null;
    unicodeFontsURL: string | null;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  /** Renders every Text added to it in one draw call (experimental). */
  export class BatchedText extends Text {
    addText(text: Text): void;
    removeText(text: Text): void;
  }
}

declare module "troika-three-utils" {
  import type { Material } from "three";

  export interface DerivedMaterialOptions {
    defines?: Record<string, string | number | boolean>;
    uniforms?: Record<string, { value: unknown }>;
    vertexDefs?: string;
    vertexMainIntro?: string;
    vertexMainOutro?: string;
    /** GLSL that may change `position`, `normal` and `uv` in place. */
    vertexTransform?: string;
    fragmentDefs?: string;
    fragmentMainIntro?: string;
    fragmentMainOutro?: string;
    fragmentColorTransform?: string;
    chained?: boolean;
  }

  export function createDerivedMaterial<T extends Material>(
    baseMaterial: T,
    options: DerivedMaterialOptions,
  ): T;
}

/** troika's font parser, used by scripts/check-lettering.ts in Node. */
declare module "troika-three-text/src/FontParser.js" {
  interface ParsedFont {
    supportsCodePoint(codePoint: number): boolean;
  }
  const fontParser: {
    onMainThread: {
      _getInitResult(): Promise<(buffer: ArrayBuffer) => ParsedFont>;
    };
  };
  export default fontParser;
}
