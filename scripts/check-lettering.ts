import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  SOUNDING_CHARS,
  SOUNDING_FONT_FILE,
} from "../src/components/chart/lettering/digits.ts";
import {
  DEFAULT_FONT_FILE,
  FONT_FILES,
} from "../src/components/chart/lettering/fonts.ts";
import { GAZETTEER } from "../src/scenes/02-road/gazetteer.ts";

/**
 * Checks that every character of every name on the chart is in its font,
 * and that the soundings' face has every figure (a 2D canvas draws them,
 * and would quietly take a missing one from a system face).
 * troika fetches a fallback font from a CDN for any character neither the
 * label's font nor its default font covers, and nothing in troika 0.52.5
 * can turn that off, so a missing glyph would break the same-origin rule.
 * Uses troika's own font parser on the WOFF files the site serves.
 * Part of `npm run check`; run alone with `npm run check:lettering`.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const FONT_DIR = path.join(ROOT, "public", "fonts", "3d");

// Typr, inside troika's parser, refers to `self`.
(globalThis as { self?: unknown }).self = globalThis;
const { default: fontParser } = await import(
  "troika-three-text/src/FontParser.js"
);
const parse = await fontParser.onMainThread._getInitResult();
type ParsedFont = ReturnType<typeof parse>;

const fonts = new Map<string, ParsedFont>();
async function font(file: string): Promise<ParsedFont> {
  let parsed = fonts.get(file);
  if (!parsed) {
    const bytes = await readFile(path.join(FONT_DIR, file));
    parsed = parse(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    fonts.set(file, parsed);
  }
  return parsed;
}

const problems: string[] = [];
const fallbacks: string[] = [];
const fallback = await font(DEFAULT_FONT_FILE);
for (const label of GAZETTEER) {
  const own = await font(FONT_FILES[label.role]);
  for (const char of label.text) {
    const cp = char.codePointAt(0) ?? 0;
    if (own.supportsCodePoint(cp)) continue;
    const name = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    if (fallback.supportsCodePoint(cp)) {
      fallbacks.push(
        `"${label.text}": ${name} comes from ${DEFAULT_FONT_FILE}`,
      );
    } else {
      problems.push(`"${label.text}": ${name} is in neither font`);
    }
  }
}

const figures = await font(SOUNDING_FONT_FILE);
for (const char of SOUNDING_CHARS) {
  const cp = char.codePointAt(0) ?? 0;
  if (!figures.supportsCodePoint(cp))
    problems.push(
      `soundings: U+${cp.toString(16).toUpperCase().padStart(4, "0")} is not in ${SOUNDING_FONT_FILE}`,
    );
}

for (const line of fallbacks) console.warn(`lettering: ${line}`);
if (problems.length) {
  for (const line of problems) console.error(`lettering: ${line}`);
  process.exit(1);
}
console.log(
  `lettering: ${GAZETTEER.length} names and the soundings' ${SOUNDING_CHARS.length} figures, every character in its font`,
);
