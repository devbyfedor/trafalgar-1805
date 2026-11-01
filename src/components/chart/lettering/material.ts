import { MeshBasicMaterial, type Vector3 } from "three";
import { configureTextBuilder } from "troika-three-text";
import { createDerivedMaterial } from "troika-three-utils";
import type { TerrainField } from "../terrain/field";
import { DRAPE, GROUND } from "./drape";
import { DEFAULT_FONT_FILE, fontUrl } from "./fonts";

/**
 * The material every batch of chart lettering derives from (the gazetteer's
 * names, the tracks' dates and legends), and troika's global settings.
 */

/** The drape's uniforms, shared by a batch and its marks. */
export type DrapeUniforms = {
  uExag: { value: number };
  uLodK: { value: number };
  uPull: { value: number };
};

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

let configured = false;

/** troika's global settings, before the first text is made. */
export function configureFonts(): void {
  if (configured) return;
  configured = true;
  configureTextBuilder({ defaultFontURL: fontUrl(DEFAULT_FONT_FILE) });
}

/**
 * A batch's base material: troika's SDF text shading, each glyph draped on
 * the exaggerated relief and pulled a little toward the camera, as the ink
 * lines are, in the ink of the ground under it. `inkPale` and `inkDark`
 * are shared by reference.
 */
export function chartTextMaterial(
  field: TerrainField,
  drape: DrapeUniforms,
  inkPale: Vector3,
  inkDark: Vector3,
): MeshBasicMaterial {
  return createDerivedMaterial(
    new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
    {
      uniforms: {
        ...field.uniforms,
        uTexelKm: { value: field.texelKm },
        ...drape,
        uInkPale: { value: inkPale },
        uInkDark: { value: inkDark },
      },
      vertexDefs: `${DRAPE}\nvarying vec2 vChartXY;`,
      vertexTransform:
        "vChartXY = position.xy; position = chartDrape(position);",
      fragmentDefs: INK_FRAGMENT,
      fragmentColorTransform:
        "gl_FragColor.rgb = mix(uInkPale, uInkDark, chartGround());",
    },
  );
}
