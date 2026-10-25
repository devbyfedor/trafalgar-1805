/**
 * The chart's lettering faces: static WOFF instances of the site's fonts in
 * public/fonts/3d (troika reads WOFF, not WOFF2). Plain data with no
 * imports, so scripts/check-lettering.ts can check the names against the
 * same table.
 */

export type LabelRole = "ocean" | "sea" | "water" | "place" | "land";

export const FONT_DIR = "/fonts/3d/";

/** Oceans in Bodoni Moda; waters in Baskervville italic; places in roman. */
export const FONT_FILES: Record<LabelRole, string> = {
  ocean: "BodoniModa-28pt-Regular.woff",
  sea: "Baskervville-Italic.woff",
  water: "Baskervville-Italic.woff",
  place: "Baskervville-Regular.woff",
  land: "Baskervville-Regular.woff",
};

/**
 * troika's default font, for any character a label's own font lacks:
 * Bodoni Moda has the wider coverage. Without it troika would fetch a
 * fallback font from a CDN.
 */
export const DEFAULT_FONT_FILE = "BodoniModa-28pt-Regular.woff";

export function fontUrl(file: string): string {
  return `${FONT_DIR}${file}`;
}
