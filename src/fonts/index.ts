import localFont from "next/font/local";

/**
 * The two type roles (docs/fonts.md). next/font hashes these files into
 * /_next/static/media/, preloads them from the root layout and sets the two
 * variables on <html>; globals.css maps them to --font-display and
 * --font-text. Each face's OFL licence sits next to it in this folder.
 *
 * Only the upright faces are wired: nothing in scene 1 is italic, and every
 * file in a call is preloaded. The italics are here for later scenes.
 *
 * next/font needs module-scope consts with literal options, so the fallback
 * stack is written out twice. `adjustFontFallback: false` keeps that serif
 * stack instead of a metric-adjusted Arial.
 */

/** Bodoni Moda (wght 400–900, opsz 6–96): the title. */
export const displayFace = localFont({
  src: "./BodoniModa-Variable.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-display-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: [
    "'Iowan Old Style'",
    "'Palatino Linotype'",
    "'Book Antiqua'",
    "Palatino",
    "Georgia",
    "serif",
  ],
});

/** Baskervville (wght 400–700): everything else. */
export const textFace = localFont({
  src: "./Baskervville-Variable.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-text-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: [
    "'Iowan Old Style'",
    "'Palatino Linotype'",
    "'Book Antiqua'",
    "Palatino",
    "Georgia",
    "serif",
  ],
});
